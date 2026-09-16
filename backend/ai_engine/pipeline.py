"""
AI Engine pipeline — orchestrates Groq extraction + risk scoring + incident update.
Called asynchronously after a Report is submitted.
"""
from incidents.models import Incident, IncidentStatus, IncidentTimeline, Report
from ai_engine.groq_client import call_groq
from risk_engine.calculator import calculate_risk, assign_required_capabilities


def analyze_report(report: Report):
    """
    Full pipeline:
      1. Create or find the associated Incident
      2. Call Groq (or mock) for structured extraction
      3. Run risk engine for risk_score, priority, breakdown
      4. Update Incident with all AI + risk data
      5. Append timeline events
    """
    description = report.description
    location = report.location

    # ── Step 1: Create Incident if this is the first report
    if report.incident is None:
        incident = Incident.objects.create(
            location=location,
            location_detail=report.location_detail,
        )
        report.incident = incident
        report.save(update_fields=['incident'])
    else:
        incident = report.incident

    IncidentTimeline.objects.create(
        incident=incident,
        event='AI analysis started — extracting incident structure from report description.',
        actor_label='AI Engine',
    )

    # ── Step 2: Groq LLM extraction
    extracted = call_groq(description, location)

    incident_type = extracted.get('incident_type', 'UNKNOWN')
    people_exposed = extracted.get('people_exposed', 0)
    spread_potential = extracted.get('spread_potential', 'MEDIUM')
    severity_factors = extracted.get('severity_factors', [])
    ai_caps = extracted.get('required_capabilities', [])
    ai_summary = extracted.get('ai_summary', '')
    confidence = extracted.get('confidence', 0.5)

    # ── Step 3: Capability assignment (merge AI + rule-based)
    required_capabilities = assign_required_capabilities(incident_type, ai_caps)

    # ── Step 4: Risk scoring
    risk_result = calculate_risk(
        incident_type=incident_type,
        location=location,
        people_exposed=people_exposed,
        spread_potential=spread_potential,
        required_capabilities=required_capabilities,
        confidence=confidence,
    )

    # ── Step 5: Update incident record
    incident.incident_type = incident_type
    incident.people_exposed = people_exposed
    incident.spread_potential = spread_potential
    incident.severity_factors = severity_factors
    incident.required_capabilities = required_capabilities
    incident.ai_summary = ai_summary
    incident.confidence = confidence
    incident.risk_score = risk_result['risk_score']
    incident.priority = risk_result['priority']
    incident.risk_breakdown = risk_result['breakdown']
    incident.status = IncidentStatus.AWAITING_APPROVAL
    incident.save()

    IncidentTimeline.objects.create(
        incident=incident,
        event=(
            f'AI extraction complete. Type: {incident_type}, '
            f'Risk: {risk_result["risk_score"]}, Priority: {risk_result["priority"]}, '
            f'Confidence: {confidence:.0%}.'
        ),
        actor_label='AI Engine',
    )

    IncidentTimeline.objects.create(
        incident=incident,
        event=f'Incident awaiting operator approval. Required capabilities: {", ".join(required_capabilities)}.',
        actor_label='Risk Engine',
    )

    # ── Step 6: Push live WebSocket update
    _broadcast(incident)


def _broadcast(incident):
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        from incidents.serializers import IncidentSerializer
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            'incidents',
            {
                'type': 'incident_update',
                'incident': IncidentSerializer(incident).data,
            }
        )
    except Exception:
        pass
