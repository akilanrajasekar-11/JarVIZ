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

RAG_CONTEXT_PROMPT_TEMPLATE = """You are an emergency incident classifier for a campus safety system called JarVIZ.

You have access to historical incident records from this campus. Use them to improve your classification accuracy.

## Historical Similar Incidents (retrieved from campus incident database):
{rag_context}

## New Report to Classify:
\"\"\"
{description}
\"\"\"

Location context: {location}

Use the historical incidents above as context clues for:
- Choosing the correct incident_type (patterns repeat at the same locations)
- Estimating people_exposed more accurately
- Adjusting spread_potential based on how similar incidents escalated
- Setting an appropriate confidence level

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


def _format_rag_context(rag_results: list) -> str:
    """Format RAG search results into a readable context block for the LLM."""
    if not rag_results:
        return "No historical incidents found."
    lines = []
    for i, r in enumerate(rag_results, 1):
        lines.append(
            f"{i}. [{r['incident_id']}] Type: {r['incident_type']}, "
            f"Location: {r['location']}, Priority: {r['priority']}, "
            f"Risk Score: {r['risk_score']:.1f}, "
            f"People Exposed: {r['people_exposed']}, "
            f"Spread: {r['spread_potential']}, "
            f"Capabilities Needed: {', '.join(r['required_capabilities'])}. "
            f"Summary: {r['ai_summary']}"
        )
    return "\n".join(lines)


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


def call_groq_with_context(description: str, location: str, rag_results: list) -> dict:
    """
    RAG-enhanced Groq call.
    Injects historical incident context into the system prompt before classification.
    Falls back to standard call_groq() if no context or API key unavailable.
    """
    if not rag_results:
        return call_groq(description, location)

    api_key = getattr(settings, 'GROQ_API_KEY', '')
    model = getattr(settings, 'GROQ_MODEL', 'llama3-8b-8192')

    rag_context_str = _format_rag_context(rag_results)
    prompt = RAG_CONTEXT_PROMPT_TEMPLATE.format(
        rag_context=rag_context_str,
        description=description,
        location=location,
    )

    if not api_key:
        # Even without Groq, we can still use RAG context to improve mock extraction
        return _mock_extract_with_context(description, rag_results)

    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        completion = client.chat.completions.create(
            model=model,
            messages=[
                {
                    'role': 'system',
                    'content': (
                        'You are a campus emergency incident classifier with access to historical incident data. '
                        'Use the provided historical context to improve your classification. '
                        'Respond only with valid JSON.'
                    ),
                },
                {'role': 'user', 'content': prompt},
            ],
            temperature=0.1,
            max_tokens=600,
        )
        raw = completion.choices[0].message.content.strip()
        json_match = re.search(r'\{.*\}', raw, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        return json.loads(raw)
    except Exception as exc:
        print(f'[AI Engine] RAG-enhanced Groq call failed: {exc} — falling back to mock with context')
        return _mock_extract_with_context(description, rag_results)


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


def _mock_extract_with_context(description: str, rag_results: list) -> dict:
    """
    Enhanced keyword extraction that boosts confidence and adjusts fields
    when similar historical incidents are available (no Groq API).
    """
    base = _mock_extract(description)

    if not rag_results:
        return base

    # Vote on incident_type from RAG results
    type_votes = {}
    for r in rag_results:
        t = r.get('incident_type', 'UNKNOWN')
        type_votes[t] = type_votes.get(t, 0) + 1

    if type_votes:
        rag_winner = max(type_votes, key=type_votes.get)
        # If RAG type matches keyword type, boost confidence
        if rag_winner == base['incident_type']:
            base['confidence'] = min(base['confidence'] + 0.10, 0.95)
            base['severity_factors'].append(f'Confirmed by {len(rag_results)} similar historical incidents')
        # If keyword said UNKNOWN but RAG has a clear winner, trust RAG
        elif base['incident_type'] == 'UNKNOWN' and type_votes[rag_winner] >= 2:
            base['incident_type'] = rag_winner
            base['confidence'] = 0.65
            base['severity_factors'].append(f'Type inferred from {type_votes[rag_winner]} similar historical incidents (RAG)')

    # Merge required_capabilities from RAG
    all_caps = set(base['required_capabilities'])
    for r in rag_results:
        all_caps.update(r.get('required_capabilities', []))
    base['required_capabilities'] = list(all_caps)

    # Improve people_exposed estimate using RAG average if current estimate is 0
    if base['people_exposed'] == 0:
        exposures = [r.get('people_exposed', 0) for r in rag_results if r.get('people_exposed', 0) > 0]
        if exposures:
            base['people_exposed'] = int(sum(exposures) / len(exposures))

    base['ai_summary'] = (
        f"Incident classified as {base['incident_type']} based on report content and "
        f"{len(rag_results)} similar historical campus incident(s). Manual review recommended."
    )

    return base
