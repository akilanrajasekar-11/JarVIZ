"""
Analytics views — aggregated campus incident intelligence.
All data is computed via Django ORM from existing Incident/Report models.
No new DB models are required.
"""
from datetime import timedelta, date
from collections import defaultdict

from django.db.models import Avg, Count, Q, FloatField, Sum
from django.db.models.functions import TruncDate, ExtractHour, ExtractWeekDay
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from incidents.models import Incident, Report, IncidentStatus, CampusLocation
from resources.models import Resource, ResourceAssignment, ResourceType, ResourceStatus


# ── Location display map (mirrors model choices)
_LOCATION_DISPLAY = {c[0]: c[1] for c in CampusLocation.choices}

TEAM_ROLE_MAP = {
    'TEAM_MEDICAL': 'MEDICAL',
    'TEAM_FIRE': 'FIRE',
    'TEAM_HAZMAT': 'HAZMAT',
    'TEAM_SECURITY': 'SECURITY',
    'TEAM_FACILITIES': 'FACILITIES',
}

TEAM_DOMAIN_MAP = {
    'MEDICAL': {
        'name': 'Medical Response Team',
        'types': ['MEDICAL'],
        'description': 'Trauma care, emergency triage, field stabilization & patient transport',
    },
    'FIRE': {
        'name': 'Campus Fire Response & Rescue',
        'types': ['FIRE_SMOKE'],
        'description': 'Thermal suppression, smoke extraction, evacuation corridors & structural search',
    },
    'HAZMAT': {
        'name': 'Environmental Health & Safety (HAZMAT)',
        'types': ['CHEMICAL'],
        'description': 'Chemical spill containment, gas leak mitigation, toxicity isolation & decontamination',
    },
    'SECURITY': {
        'name': 'Tactical Security Response Unit',
        'types': ['SECURITY_THREAT', 'VIOLENCE_CROWD'],
        'description': 'Perimeter containment, access control, crowd intervention & physical security',
    },
    'FACILITIES': {
        'name': 'Physical Plant & Facilities Maintenance',
        'types': ['ELECTRICAL'],
        'description': 'Substation monitoring, utility isolations, power restoration & facility safety',
    },
}

# ── Precautionary recommendation templates keyed by dominant incident type
_PRECAUTION_TEMPLATES = {
    'FIRE_SMOKE': (
        'Pre-position Fire & Medical teams. Verify fire suppression equipment '
        'is serviced. Ensure evacuation routes are unobstructed.'
    ),
    'CHEMICAL': (
        'Pre-position HAZMAT and Medical teams during lab hours. '
        'Inspect chemical storage compliance and ventilation systems.'
    ),
    'MEDICAL': (
        'Increase Health Centre staff availability. Ensure AED devices '
        'are accessible and first-aid kits are stocked.'
    ),
    'SECURITY_THREAT': (
        'Increase security patrol frequency. Review access control logs '
        'and verify CCTV coverage at entry points.'
    ),
    'ELECTRICAL': (
        'Schedule preventive electrical inspection. Verify substation '
        'failover systems and emergency lighting.'
    ),
    'VIOLENCE_CROWD': (
        'Deploy additional security personnel during peak hours. '
        'Activate crowd management protocols for large gatherings.'
    ),
    'UNKNOWN': (
        'Review recent incident patterns. Conduct general safety audit '
        'and brief security personnel on elevated alertness.'
    ),
}


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def analytics_summary(request):
    """
    GET /api/analytics/summary/
    Returns comprehensive analytics payload for the dashboard.
    If the user has a TEAM_* role, or if ?team= is specified by an OPERATOR,
    the analytics are strictly scoped to that team's incidents, resources, and missions.
    Emergency operators without a team filter receive the full campus-wide dashboard.
    """
    user = request.user
    user_role = getattr(user, 'role', '')

    team_key = None
    if user_role in TEAM_ROLE_MAP:
        # Resource team members are strictly scoped to their team's data only
        team_key = TEAM_ROLE_MAP[user_role]
    elif user_role == 'OPERATOR':
        # Operators get full campus by default, or can inspect a specific team via query param
        req_team = request.query_params.get('team', '').upper()
        if req_team in TEAM_ROLE_MAP.values():
            team_key = req_team

    now = timezone.now()
    thirty_days_ago = now - timedelta(days=30)
    seven_days_ago = now - timedelta(days=7)

    if team_key:
        domain_info = TEAM_DOMAIN_MAP.get(team_key, {})
        domain_types = domain_info.get('types', [])
        assigned_inc_ids = ResourceAssignment.objects.filter(
            resource__resource_type=team_key
        ).values_list('incident_id', flat=True)

        all_incidents = Incident.objects.filter(
            Q(id__in=assigned_inc_ids) | Q(incident_type__in=domain_types)
        ).distinct()

        team_resources = Resource.objects.filter(resource_type=team_key)
        team_assignments = ResourceAssignment.objects.filter(resource__resource_type=team_key)
        active_assignments = team_assignments.exclude(
            status__in=[
                ResourceAssignment.AssignmentStatus.COMPLETED,
                ResourceAssignment.AssignmentStatus.REVOKED
            ]
        )
        completed_assignments = team_assignments.filter(
            status=ResourceAssignment.AssignmentStatus.COMPLETED
        )

        team_info = {
            'is_team_scoped': True,
            'team_key': team_key,
            'team_name': domain_info.get('name', f'{team_key} Team'),
            'team_description': domain_info.get('description', ''),
            'total_units': team_resources.count(),
            'available_units': team_resources.filter(status=ResourceStatus.AVAILABLE).count(),
            'busy_units': team_resources.filter(status=ResourceStatus.BUSY).count(),
            'offline_units': team_resources.filter(status=ResourceStatus.OFFLINE).count(),
            'total_missions': team_assignments.count(),
            'active_missions': active_assignments.count(),
            'completed_missions': completed_assignments.count(),
            'casualties_treated': team_assignments.aggregate(c=Sum('casualties_treated'))['c'] or 0,
            'hazards_cleared': team_assignments.filter(hazard_cleared=True).count(),
            'resources': [
                {
                    'id': r.id,
                    'name': r.name,
                    'location': _LOCATION_DISPLAY.get(r.location, r.location),
                    'status': r.status,
                    'contact': r.contact,
                }
                for r in team_resources
            ],
        }
        total_reports = Report.objects.filter(incident__in=all_incidents).count()
    else:
        all_incidents = Incident.objects.all()
        team_info = {
            'is_team_scoped': False,
            'team_key': None,
            'team_name': 'Campus-Wide Command',
            'team_description': 'Full campus emergency intelligence & cross-agency resource telemetry',
            'total_units': Resource.objects.count(),
            'available_units': Resource.objects.filter(status=ResourceStatus.AVAILABLE).count(),
            'busy_units': Resource.objects.filter(status=ResourceStatus.BUSY).count(),
            'offline_units': Resource.objects.filter(status=ResourceStatus.OFFLINE).count(),
            'total_missions': ResourceAssignment.objects.count(),
            'active_missions': ResourceAssignment.objects.exclude(
                status__in=[
                    ResourceAssignment.AssignmentStatus.COMPLETED,
                    ResourceAssignment.AssignmentStatus.REVOKED
                ]
            ).count(),
            'completed_missions': ResourceAssignment.objects.filter(
                status=ResourceAssignment.AssignmentStatus.COMPLETED
            ).count(),
            'casualties_treated': ResourceAssignment.objects.aggregate(c=Sum('casualties_treated'))['c'] or 0,
            'hazards_cleared': ResourceAssignment.objects.filter(hazard_cleared=True).count(),
            'resources': [],
        }
        total_reports = Report.objects.count()

    resolved_qs = all_incidents.filter(
        status__in=[IncidentStatus.RESOLVED, IncidentStatus.CLOSED]
    )
    active_qs = all_incidents.exclude(
        status__in=[IncidentStatus.RESOLVED, IncidentStatus.CLOSED]
    )

    # ── 1. Overview KPIs
    total = all_incidents.count()
    resolved_count = resolved_qs.count()
    active_count = active_qs.count()
    avg_risk = all_incidents.aggregate(a=Avg('risk_score'))['a'] or 0.0

    # ── 2. By Location
    by_location_qs = (
        all_incidents
        .values('location')
        .annotate(count=Count('id'), avg_risk=Avg('risk_score'))
        .order_by('-count')
    )
    by_location = []
    for row in by_location_qs:
        loc = row['location']
        # Find most common type at this location
        top_type_row = (
            all_incidents.filter(location=loc)
            .values('incident_type')
            .annotate(n=Count('id'))
            .order_by('-n')
            .first()
        )
        by_location.append({
            'location': loc,
            'location_display': _LOCATION_DISPLAY.get(loc, loc),
            'count': row['count'],
            'avg_risk': round(row['avg_risk'] or 0, 1),
            'top_type': top_type_row['incident_type'] if top_type_row else 'UNKNOWN',
        })

    # ── 3. By Incident Type
    by_type_qs = (
        all_incidents
        .values('incident_type')
        .annotate(count=Count('id'), avg_risk=Avg('risk_score'))
        .order_by('-count')
    )
    type_display = dict(Incident._meta.get_field('incident_type').choices)
    by_type = [
        {
            'incident_type': row['incident_type'],
            'display': type_display.get(row['incident_type'], row['incident_type']),
            'count': row['count'],
            'avg_risk': round(row['avg_risk'] or 0, 1),
        }
        for row in by_type_qs
    ]

    # ── 4. By Priority
    priority_qs = all_incidents.values('priority').annotate(count=Count('id'))
    by_priority = {row['priority']: row['count'] for row in priority_qs}
    for p in ['P0', 'P1', 'P2', 'P3']:
        by_priority.setdefault(p, 0)

    # ── 5. By Status
    status_qs = all_incidents.values('status').annotate(count=Count('id'))
    by_status = {row['status']: row['count'] for row in status_qs}

    # ── 6. Response Times (avg minutes from created_at to resolved_at for resolved incidents)
    response_times = []
    for loc_row in (
        resolved_qs.exclude(resolved_at__isnull=True)
        .values('location')
        .annotate(count=Count('id'))
        .order_by('-count')[:8]
    ):
        loc = loc_row['location']
        incidents_here = resolved_qs.filter(
            location=loc, resolved_at__isnull=False
        )
        durations = [
            (inc.resolved_at - inc.created_at).total_seconds() / 60
            for inc in incidents_here
        ]
        avg_min = round(sum(durations) / len(durations), 1) if durations else None
        if avg_min is not None:
            response_times.append({
                'location': loc,
                'location_display': _LOCATION_DISPLAY.get(loc, loc),
                'avg_minutes': avg_min,
                'count': loc_row['count'],
            })

    # ── 7. Capability Demand (tally from required_capabilities JSONField)
    cap_counts = defaultdict(int)
    for inc in all_incidents.only('required_capabilities'):
        for cap in (inc.required_capabilities or []):
            cap_counts[cap] += 1
    capability_demand = dict(sorted(cap_counts.items(), key=lambda x: -x[1]))

    # ── 8. Peak Hours (created_at hour-of-day)
    hour_qs = (
        all_incidents
        .annotate(hour=ExtractHour('created_at'))
        .values('hour')
        .annotate(count=Count('id'))
        .order_by('hour')
    )
    peak_hours_map = {row['hour']: row['count'] for row in hour_qs}
    peak_hours = [{'hour': h, 'count': peak_hours_map.get(h, 0)} for h in range(24)]

    # ── 9. Peak Weekdays (Mon=1 … Sun=7 in Django ExtractWeekDay)
    day_names = {1: 'Sun', 2: 'Mon', 3: 'Tue', 4: 'Wed', 5: 'Thu', 6: 'Fri', 7: 'Sat'}
    weekday_qs = (
        all_incidents
        .annotate(wday=ExtractWeekDay('created_at'))
        .values('wday')
        .annotate(count=Count('id'))
        .order_by('wday')
    )
    peak_weekdays = [
        {'day': day_names.get(row['wday'], str(row['wday'])), 'count': row['count']}
        for row in weekday_qs
    ]

    # ── 10. Risk Trend (last 30 days, daily avg_risk + count)
    trend_qs = (
        all_incidents
        .filter(created_at__gte=thirty_days_ago)
        .annotate(date=TruncDate('created_at'))
        .values('date')
        .annotate(avg_risk=Avg('risk_score'), count=Count('id'))
        .order_by('date')
    )
    risk_trend = [
        {
            'date': str(row['date']),
            'avg_risk': round(row['avg_risk'] or 0, 1),
            'count': row['count'],
        }
        for row in trend_qs
    ]

    # ── 11. Location Precaution Score (recent 30 days)
    recent_incidents = all_incidents.filter(created_at__gte=thirty_days_ago)
    loc_recent = defaultdict(list)
    for inc in recent_incidents.only('location', 'incident_type', 'risk_score'):
        loc_recent[inc.location].append(inc)

    precaution_scores = []
    for loc, incs in loc_recent.items():
        if not incs:
            continue
        avg_r = sum(i.risk_score for i in incs) / len(incs)
        # Score = weighted combination of frequency and avg risk
        score = round((len(incs) * 0.4 + avg_r * 0.6), 1)
        # Dominant incident type at this location (recent)
        type_cnt = defaultdict(int)
        for i in incs:
            type_cnt[i.incident_type] += 1
        dominant_type = max(type_cnt, key=type_cnt.get)
        recommendation = _PRECAUTION_TEMPLATES.get(dominant_type, _PRECAUTION_TEMPLATES['UNKNOWN'])
        precaution_scores.append({
            'location': loc,
            'location_display': _LOCATION_DISPLAY.get(loc, loc),
            'score': score,
            'recent_incidents': len(incs),
            'avg_risk': round(avg_r, 1),
            'dominant_type': dominant_type,
            'recommendation': recommendation,
        })
    precaution_scores.sort(key=lambda x: -x['score'])
    top_precautions = precaution_scores[:5]

    # ── 12. Recent high-risk incidents (last 7 days, P0/P1)
    recent_high_risk = list(
        all_incidents
        .filter(created_at__gte=seven_days_ago, priority__in=['P0', 'P1'])
        .order_by('-risk_score')
        .values('incident_id', 'incident_type', 'location', 'priority', 'risk_score', 'status', 'created_at')[:5]
    )
    for r in recent_high_risk:
        r['location_display'] = _LOCATION_DISPLAY.get(r['location'], r['location'])
        r['created_at'] = str(r['created_at'])

    # ── 13. RAG index size
    rag_index_size = 0
    try:
        from ai_engine.rag_store import get_index_size
        rag_index_size = get_index_size()
    except Exception:
        pass

    return Response({
        'team_info': team_info,
        'overview': {
            'total_incidents': total,
            'resolved': resolved_count,
            'active': active_count,
            'avg_risk_score': round(avg_risk, 1),
            'total_reports': total_reports,
        },
        'by_location': by_location,
        'by_type': by_type,
        'by_priority': by_priority,
        'by_status': by_status,
        'response_times': response_times,
        'capability_demand': capability_demand,
        'peak_hours': peak_hours,
        'peak_weekdays': peak_weekdays,
        'risk_trend': risk_trend,
        'location_precaution_scores': top_precautions,
        'recent_high_risk': recent_high_risk,
        'rag_index_size': rag_index_size,
        'generated_at': str(now),
    })
