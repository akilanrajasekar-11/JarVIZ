"""
Risk Engine — deterministic weighted risk scoring and priority assignment.

Formula (from README):
  Risk Score =
    0.30 × Hazard Severity
  + 0.20 × People Exposure
  + 0.15 × Escalation Potential
  + 0.15 × Vulnerability
  + 0.10 × Response Difficulty
  + 0.10 × Uncertainty

All factors are on a 0–100 scale.
Priority:
  90–100 → P0 (Critical)
  75–89  → P1 (Serious)
  50–74  → P2 (Significant)
  0–49   → P3 (Lower urgency)
"""

# Base hazard severity per incident type (0-100)
_HAZARD_SEVERITY = {
    'FIRE_SMOKE':       85,
    'CHEMICAL':         90,
    'MEDICAL':          70,
    'SECURITY_THREAT':  65,
    'ELECTRICAL':       60,
    'VIOLENCE_CROWD':   55,
    'UNKNOWN':          50,
}

# Occupancy/vulnerability bonus per campus location (0-100)
_LOCATION_OCCUPANCY = {
    'BLOCK_1': 70,        # Library
    'BLOCK_2': 80,        # Chemistry Labs — high vulnerability
    'BLOCK_3': 65,        # Mechanical Workshop
    'BLOCK_4': 70,        # CS department
    'BLOCK_5': 50,        # Administration
    'HOSTEL_A': 75,       # Residential — people sleeping
    'HOSTEL_B': 75,
    'MAIN_GATE': 60,
    'CAFETERIA': 85,      # High occupancy
    'AUDITORIUM': 90,     # Large gathering
    'SPORTS_GROUND': 40,  # Open area
    'HEALTH_CENTRE': 70,
    'SECURITY_ROOM': 30,
    'SUBSTATION': 75,     # Infrastructure risk
    'OTHER': 50,
}

# Spread potential multiplier
_SPREAD_MULTIPLIER = {
    'LOW':      0.5,
    'MEDIUM':   0.75,
    'HIGH':     1.0,
    'CRITICAL': 1.2,
}

# Response difficulty per capability
_RESPONSE_DIFFICULTY = {
    'hazmat': 90,
    'fire':   75,
    'medical': 50,
    'security': 40,
    'facilities': 45,
    'isolation': 55,
}


def calculate_risk(incident_type: str, location: str, people_exposed: int,
                   spread_potential: str, required_capabilities: list,
                   confidence: float) -> dict:
    """
    Calculate risk score, priority, and breakdown for an incident.
    Returns a dict: {risk_score, priority, breakdown}
    """
    # ── Factor 1: Hazard Severity (0-100)
    hazard_severity = _HAZARD_SEVERITY.get(incident_type, 50)

    # ── Factor 2: People Exposure (0-100)
    # Clamp at 20+ people → 100
    people_score = min(people_exposed * 5, 100)

    # ── Factor 3: Escalation Potential (0-100)
    mult = _SPREAD_MULTIPLIER.get(spread_potential, 0.75)
    escalation = min(hazard_severity * mult, 100)

    # ── Factor 4: Vulnerability (location occupancy risk)
    vulnerability = _LOCATION_OCCUPANCY.get(location, 50)

    # ── Factor 5: Response Difficulty
    if required_capabilities:
        response_difficulty = max(
            _RESPONSE_DIFFICULTY.get(cap, 40) for cap in required_capabilities
        )
    else:
        response_difficulty = 40

    # ── Factor 6: Uncertainty (inverse of confidence, 0-100)
    uncertainty = round((1.0 - confidence) * 100)

    # ── Weighted Formula
    risk_score = (
        0.30 * hazard_severity
        + 0.20 * people_score
        + 0.15 * escalation
        + 0.15 * vulnerability
        + 0.10 * response_difficulty
        + 0.10 * uncertainty
    )
    risk_score = round(min(risk_score, 100), 2)

    # ── Priority Assignment
    if risk_score >= 90:
        priority = 'P0'
    elif risk_score >= 75:
        priority = 'P1'
    elif risk_score >= 50:
        priority = 'P2'
    else:
        priority = 'P3'

    breakdown = {
        'hazard_severity': {'value': hazard_severity, 'weight': 0.30, 'weighted': round(0.30 * hazard_severity, 2)},
        'people_exposure': {'value': people_score, 'weight': 0.20, 'weighted': round(0.20 * people_score, 2)},
        'escalation_potential': {'value': round(escalation, 2), 'weight': 0.15, 'weighted': round(0.15 * escalation, 2)},
        'vulnerability': {'value': vulnerability, 'weight': 0.15, 'weighted': round(0.15 * vulnerability, 2)},
        'response_difficulty': {'value': response_difficulty, 'weight': 0.10, 'weighted': round(0.10 * response_difficulty, 2)},
        'uncertainty': {'value': uncertainty, 'weight': 0.10, 'weighted': round(0.10 * uncertainty, 2)},
    }

    return {
        'risk_score': risk_score,
        'priority': priority,
        'breakdown': breakdown,
    }


def assign_required_capabilities(incident_type: str, existing: list) -> list:
    """
    Ensure sensible required capabilities are set based on incident type.
    Merges with any capabilities already identified by the AI engine.
    """
    defaults = {
        'FIRE_SMOKE': ['fire', 'medical', 'security'],
        'CHEMICAL': ['hazmat', 'medical', 'security', 'isolation'],
        'MEDICAL': ['medical'],
        'SECURITY_THREAT': ['security', 'isolation'],
        'ELECTRICAL': ['facilities', 'security'],
        'VIOLENCE_CROWD': ['security', 'medical'],
        'UNKNOWN': ['security'],
    }
    base = defaults.get(incident_type, ['security'])
    merged = list(set(base) | set(existing))
    return merged
