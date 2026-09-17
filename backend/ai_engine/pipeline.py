"""
AI Engine pipeline — orchestrates Groq extraction + RAG context + risk scoring + incident update.
Called asynchronously after a Report is submitted.
"""
import logging
from incidents.models import Incident, IncidentStatus, IncidentTimeline, Report
from ai_engine.groq_client import call_groq_with_context
from risk_engine.calculator import calculate_risk, assign_required_capabilities

logger = logging.getLogger(__name__)


def analyze_report(report: Report):
    """
    Full pipeline:
      1. Create or find the associated Incident
      2. Query FAISS RAG store for similar historical incidents
      3. Call Groq (or mock) with RAG context for structured extraction
      4. Run risk engine for risk_score, priority, breakdown
      5. Update Incident with all AI + risk data
      6. Append timeline events
      7. Push live WebSocket update
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

    # ── Step 2: RAG lookup — find similar historical incidents
    rag_results = []
    try:
        from ai_engine.rag_store import search
        rag_results = search(description)
        if rag_results:
            rag_ids = ', '.join(r['incident_id'] for r in rag_results)
            logger.info(f'[RAG] Retrieved {len(rag_results)} similar incidents: {rag_ids}')
            IncidentTimeline.objects.create(
                incident=incident,
                event=(
                    f'RAG context retrieved: {len(rag_results)} similar historical incident(s) found '
                    f'({rag_ids}) — used to enhance AI classification.'
                ),
                actor_label='RAG Engine',
            )
        else:
            logger.info('[RAG] No similar incidents found — proceeding with standard extraction.')
    except Exception as exc:
        logger.warning(f'[RAG] Lookup failed: {exc} — continuing without RAG context.')

    # ── Step 3: Groq LLM extraction (RAG-enhanced)
    extracted = call_groq_with_context(description, location, rag_results)

    incident_type = extracted.get('incident_type', 'UNKNOWN')
    people_exposed = extracted.get('people_exposed', 0)
    spread_potential = extracted.get('spread_potential', 'MEDIUM')
    severity_factors = extracted.get('severity_factors', [])
    ai_caps = extracted.get('required_capabilities', [])
    ai_summary = extracted.get('ai_summary', '')
    confidence = extracted.get('confidence', 0.5)

    # ── Step 4: Capability assignment (merge AI + rule-based)
    required_capabilities = assign_required_capabilities(incident_type, ai_caps)

    # ── Step 5: Risk scoring
    risk_result = calculate_risk(
        incident_type=incident_type,
        location=location,
        people_exposed=people_exposed,
        spread_potential=spread_potential,
        required_capabilities=required_capabilities,
        confidence=confidence,
    )

    # ── Step 6: Update incident record
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

    rag_note = f' (RAG: {len(rag_results)} similar past incidents used)' if rag_results else ''
    IncidentTimeline.objects.create(
        incident=incident,
        event=(
            f'AI extraction complete{rag_note}. Type: {incident_type}, '
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

    # ── Step 7: Push live WebSocket update
    _broadcast(incident)


def index_incident_in_rag(incident):
    """
    Add a resolved/closed incident to the FAISS RAG index.
    Call this after an incident is marked RESOLVED or CLOSED.
    Safe to call multiple times — FAISS will accumulate duplicate entries
    only if called multiple times; prefer calling once per lifecycle transition.
    """
    try:
        from ai_engine.rag_store import add_incident
        success = add_incident(incident)
        if success:
            logger.info(f'[RAG] Indexed incident {incident.incident_id} into FAISS store.')
        return success
    except Exception as exc:
        logger.warning(f'[RAG] Failed to index incident {incident.incident_id}: {exc}')
        return False


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
