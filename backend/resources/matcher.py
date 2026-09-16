"""
Capability-aware resource matcher — implements the algorithm from the README.

  eligible_resources =
      resources where
        required_capabilities ⊆ resource.capabilities
        AND resource.status == AVAILABLE

  Eligible resources scored on:
    Capability Match + Availability + Current Workload
"""
from .models import Resource, ResourceStatus


def _capability_match_score(resource_caps: list, required_caps: list) -> float:
    """Percentage of required capabilities covered by the resource (0.0–1.0)."""
    if not required_caps:
        return 1.0
    matched = sum(1 for cap in required_caps if cap in resource_caps)
    return matched / len(required_caps)


def _workload_score(resource: Resource) -> float:
    """Lower workload (fewer active assignments) = higher score."""
    active = resource.assignments.filter(
        status__in=['ASSIGNED', 'DISPATCHED', 'RESPONDING', 'ON_SCENE']
    ).count()
    return max(0.0, 1.0 - (active * 0.2))


def match_resources(incident) -> dict:
    """
    Find and rank resources for an incident.
    Returns:
      {
        'recommendation': <Resource or None>,
        'alternatives': [<Resource>, ...],
        'all_eligible': [<Resource>, ...],
        'required_capabilities': [...],
      }
    """
    required = incident.required_capabilities or []

    # Step 1: Filter by capability and availability
    available = Resource.objects.filter(status=ResourceStatus.AVAILABLE)
    eligible = []
    for r in available:
        caps = r.capabilities or []
        if all(req in caps for req in required):
            eligible.append(r)

    # If no exact match, loosen — find resources with at least one capability
    if not eligible and required:
        for r in available:
            caps = r.capabilities or []
            if any(req in caps for req in required):
                eligible.append(r)

    # Step 2: Score and rank eligible resources
    scored = []
    for r in eligible:
        cap_score = _capability_match_score(r.capabilities or [], required)
        workload = _workload_score(r)
        total = round((cap_score * 0.6) + (workload * 0.4), 3)
        scored.append((total, r))

    scored.sort(key=lambda x: x[0], reverse=True)

    ranked = [r for _, r in scored]
    recommendation = ranked[0] if ranked else None
    alternatives = ranked[1:4]  # Up to 3 alternatives

    return {
        'recommendation': recommendation,
        'alternatives': alternatives,
        'all_eligible': ranked,
        'required_capabilities': required,
    }
