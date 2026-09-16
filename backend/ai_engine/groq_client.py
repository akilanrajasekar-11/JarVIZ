"""
AI Engine — Groq Cloud integration for incident understanding.
Falls back to structured mock extraction when GROQ_API_KEY is not set.
"""
import json
import re
from django.conf import settings

EXTRACTION_PROMPT_TEMPLATE = """You are an emergency incident classifier for a campus safety system called JarVIZ.

Analyze the following emergency report and extract structured information.

Report:
\"\"\"
{description}
\"\"\"

Location context: {location}

Return ONLY a valid JSON object with these fields (no extra text):
{{
  "incident_type": "<one of: FIRE_SMOKE | MEDICAL | CHEMICAL | SECURITY_THREAT | ELECTRICAL | VIOLENCE_CROWD | UNKNOWN>",
  "people_exposed": <integer, estimate 0 if unknown>,
  "spread_potential": "<LOW | MEDIUM | HIGH | CRITICAL>",
  "severity_factors": ["<factor1>", "<factor2>"],
  "required_capabilities": ["<from: medical | fire | hazmat | security | facilities | isolation>"],
  "ai_summary": "<1-2 sentence plain English summary>",
  "confidence": <float 0.0-1.0>
}}
"""


def call_groq(description: str, location: str) -> dict:
    """
    Call Groq Cloud LLM to extract structured incident data.
    Returns a dict with extracted fields.
    """
    api_key = getattr(settings, 'GROQ_API_KEY', '')
    model = getattr(settings, 'GROQ_MODEL', 'llama3-8b-8192')

    prompt = EXTRACTION_PROMPT_TEMPLATE.format(
        description=description,
        location=location,
    )

    if not api_key:
        return _mock_extract(description)

    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        completion = client.chat.completions.create(
            model=model,
            messages=[
                {
                    'role': 'system',
                    'content': 'You are a campus emergency incident classifier. Respond only with valid JSON.',
                },
                {'role': 'user', 'content': prompt},
            ],
            temperature=0.1,
            max_tokens=512,
        )
        raw = completion.choices[0].message.content.strip()
        # Extract JSON from response (strip any markdown fences)
        json_match = re.search(r'\{.*\}', raw, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        return json.loads(raw)
    except Exception as exc:
        print(f'[AI Engine] Groq call failed: {exc} — using mock extraction')
        return _mock_extract(description)


# ──────────────────────────────────────────────
# Keyword-based mock extraction (no API needed)
# ──────────────────────────────────────────────
_KEYWORD_RULES = [
    (['fire', 'smoke', 'flame', 'burning', 'explosion'], 'FIRE_SMOKE', ['fire'], 0.82),
    (['chemical', 'spill', 'fumes', 'gas leak', 'toxic', 'hazmat', 'coughing', 'chemical smell'], 'CHEMICAL', ['hazmat', 'medical'], 0.85),
    (['collapse', 'unconscious', 'injured', 'bleeding', 'heart', 'medical', 'ambulance'], 'MEDICAL', ['medical'], 0.80),
    (['intruder', 'unauthorized', 'suspicious', 'package', 'weapon', 'threat'], 'SECURITY_THREAT', ['security', 'isolation'], 0.78),
    (['electrical', 'spark', 'wiring', 'power', 'short circuit'], 'ELECTRICAL', ['facilities', 'security'], 0.75),
    (['fight', 'violence', 'crowd', 'panic', 'altercation', 'disturb'], 'VIOLENCE_CROWD', ['security', 'medical'], 0.72),
]


def _mock_extract(description: str) -> dict:
    """Rule-based extraction used when no Groq API key is configured."""
    desc_lower = description.lower()
    matched_type = 'UNKNOWN'
    matched_caps = ['security']
    confidence = 0.55

    for keywords, inc_type, caps, conf in _KEYWORD_RULES:
        if any(kw in desc_lower for kw in keywords):
            matched_type = inc_type
            matched_caps = caps
            confidence = conf
            break

    people_exposed = 0
    numbers = re.findall(r'\b(\d+)\s+(?:students?|people|persons?|staff)\b', desc_lower)
    if numbers:
        people_exposed = int(numbers[0])
    elif any(w in desc_lower for w in ['several', 'many', 'multiple', 'crowd']):
        people_exposed = 10

    spread = 'LOW'
    if any(w in desc_lower for w in ['spreading', 'growing', 'escalating', 'heavy', 'many']):
        spread = 'HIGH'
    elif any(w in desc_lower for w in ['contained', 'small', 'minor']):
        spread = 'LOW'
    else:
        spread = 'MEDIUM'

    return {
        'incident_type': matched_type,
        'people_exposed': people_exposed,
        'spread_potential': spread,
        'severity_factors': ['Description analysed by keyword matcher'],
        'required_capabilities': matched_caps,
        'ai_summary': f'Incident classified as {matched_type} based on report content. Manual review recommended.',
        'confidence': confidence,
    }
