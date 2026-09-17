"""
Management command to populate JarVIZ with realistic demo users and operational data.
Usage: python manage.py seed_demo_data
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

from users.models import UserRole
from cameras.models import Camera, CameraStatus, CCTVEvent, CCTVEventType
from resources.models import Resource, ResourceType, ResourceStatus, ResourceAssignment
from incidents.models import (
    Incident,
    IncidentType,
    CampusLocation,
    IncidentStatus,
    PriorityLevel,
    Report,
    IncidentTimeline,
)

User = get_user_model()


class Command(BaseCommand):
    help = "Seeds demo credentials for all roles and populates operational data in JarVIZ."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Initializing JarVIZ demo data seeding..."))
        demo_password = "JarVIZ@123"

        # -------------------------------------------------------------
        # 1. USERS & CREDENTIALS
        # -------------------------------------------------------------
        user_definitions = [
            {
                "username": "operator",
                "role": UserRole.OPERATOR,
                "first_name": "Sarah",
                "last_name": "Jenkins",
                "email": "operator@jarviz.campus",
                "department": "Campus Emergency Operations Center",
                "phone": "+1-555-0100",
                "is_staff": True,
                "is_superuser": False,
            },
            {
                "username": "admin",
                "role": UserRole.OPERATOR,
                "first_name": "System",
                "last_name": "Administrator",
                "email": "admin@jarviz.campus",
                "department": "Campus Safety Command",
                "phone": "+1-555-0101",
                "is_staff": True,
                "is_superuser": True,
            },
            {
                "username": "student",
                "role": UserRole.STUDENT,
                "first_name": "Alex",
                "last_name": "Rivera",
                "email": "alex.rivera@student.campus",
                "department": "Computer Science & Engineering",
                "phone": "+1-555-0110",
                "is_staff": False,
                "is_superuser": False,
            },
            {
                "username": "faculty",
                "role": UserRole.FACULTY,
                "first_name": "Robert",
                "last_name": "Langdon",
                "email": "r.langdon@faculty.campus",
                "department": "Department of Chemistry",
                "phone": "+1-555-0120",
                "is_staff": False,
                "is_superuser": False,
            },
            {
                "username": "security_staff",
                "role": UserRole.SECURITY,
                "first_name": "Marcus",
                "last_name": "Vance",
                "email": "m.vance@security.campus",
                "department": "Campus Security - Main Division",
                "phone": "+1-555-0130",
                "is_staff": False,
                "is_superuser": False,
            },
            {
                "username": "team_medical",
                "role": UserRole.TEAM_MEDICAL,
                "first_name": "Emily",
                "last_name": "Watson",
                "email": "medic.alpha@health.campus",
                "department": "Campus Health & Trauma Response Unit",
                "phone": "+1-555-0140",
                "is_staff": False,
                "is_superuser": False,
            },
            {
                "username": "team_fire",
                "role": UserRole.TEAM_FIRE,
                "first_name": "David",
                "last_name": "Miller",
                "email": "fire.chief@fire.campus",
                "department": "Campus Fire Response & Rescue",
                "phone": "+1-555-0150",
                "is_staff": False,
                "is_superuser": False,
            },
            {
                "username": "team_hazmat",
                "role": UserRole.TEAM_HAZMAT,
                "first_name": "Aris",
                "last_name": "Thorne",
                "email": "hazmat.lead@ehs.campus",
                "department": "Environmental Health & Safety (EHS)",
                "phone": "+1-555-0160",
                "is_staff": False,
                "is_superuser": False,
            },
            {
                "username": "team_security",
                "role": UserRole.TEAM_SECURITY,
                "first_name": "Elena",
                "last_name": "Rostova",
                "email": "sec.tactical@security.campus",
                "department": "Rapid Security Intervention Unit",
                "phone": "+1-555-0170",
                "is_staff": False,
                "is_superuser": False,
            },
            {
                "username": "team_facilities",
                "role": UserRole.TEAM_FACILITIES,
                "first_name": "Liam",
                "last_name": "O'Connor",
                "email": "facilities.lead@plant.campus",
                "department": "Physical Plant & Electrical Engineering",
                "phone": "+1-555-0180",
                "is_staff": False,
                "is_superuser": False,
            },
        ]

        created_users = {}
        for udata in user_definitions:
            user, created = User.objects.get_or_create(
                username=udata["username"],
                defaults={
                    "role": udata["role"],
                    "first_name": udata["first_name"],
                    "last_name": udata["last_name"],
                    "email": udata["email"],
                    "department": udata["department"],
                    "phone": udata["phone"],
                    "is_staff": udata["is_staff"],
                    "is_superuser": udata["is_superuser"],
                }
            )
            user.role = udata["role"]
            user.first_name = udata["first_name"]
            user.last_name = udata["last_name"]
            user.email = udata["email"]
            user.department = udata["department"]
            user.phone = udata["phone"]
            user.is_staff = udata["is_staff"]
            user.is_superuser = udata["is_superuser"]
            user.set_password(demo_password)
            user.save()
            created_users[udata["username"]] = user

        # Also ensure existing users 'blitz' and 'asus' have known password
        for username, default_role in [("blitz", UserRole.STUDENT), ("asus", UserRole.OPERATOR)]:
            try:
                eu = User.objects.filter(username=username).first()
                if eu:
                    eu.set_password(demo_password)
                    eu.save()
            except Exception:
                pass

        self.stdout.write(self.style.SUCCESS(f"Created/Updated {len(created_users)} demo users."))

        # -------------------------------------------------------------
        # 2. CAMERAS
        # -------------------------------------------------------------
        camera_definitions = [
            ("CAM-01", CampusLocation.BLOCK_1, "Block 1 — Library Entrance & Turnstiles"),
            ("CAM-02", CampusLocation.BLOCK_1, "Block 1 — 2nd Floor Study Corridor"),
            ("CAM-03", CampusLocation.BLOCK_1, "Block 1 — East Academic Plaza Entrance"),
            ("CAM-04", CampusLocation.BLOCK_2, "Block 2 — 3rd Floor Chemistry Lab Corridor"),
            ("CAM-05", CampusLocation.BLOCK_2, "Block 2 — Laboratory Main Entrance"),
            ("CAM-06", CampusLocation.BLOCK_2, "Block 2 — Hazardous Waste & Loading Dock"),
            ("CAM-07", CampusLocation.HOSTEL_A, "Hostel A — Main Quadrangle Entrance"),
            ("CAM-08", CampusLocation.HOSTEL_A, "Hostel A — Ground Floor Common Hall"),
            ("CAM-09", CampusLocation.MAIN_GATE, "Main Gate — Vehicle Inspection Barrier"),
            ("CAM-10", CampusLocation.MAIN_GATE, "Main Gate — West Visitor Parking Area"),
        ]

        cameras = {}
        for cam_name, loc, desc in camera_definitions:
            cam, _ = Camera.objects.get_or_create(
                name=cam_name,
                defaults={
                    "location_block": loc,
                    "coverage_description": desc,
                    "status": CameraStatus.ONLINE,
                }
            )
            cameras[cam_name] = cam

        self.stdout.write(self.style.SUCCESS(f"Ensured {len(cameras)} campus CCTV cameras."))

        # -------------------------------------------------------------
        # 3. EMERGENCY RESOURCES
        # -------------------------------------------------------------
        resource_definitions = [
            {
                "pk": 1,
                "name": "Medical Response Unit Alpha",
                "resource_type": ResourceType.MEDICAL,
                "capabilities": ["medical"],
                "location": CampusLocation.HEALTH_CENTRE,
                "status": ResourceStatus.BUSY,
                "contact": "ext-201",
                "notes": "Equipped with advanced life support, trauma kit, and oxygen supplies.",
            },
            {
                "pk": 2,
                "name": "Medical Response Unit Beta",
                "resource_type": ResourceType.MEDICAL,
                "capabilities": ["medical"],
                "location": CampusLocation.HEALTH_CENTRE,
                "status": ResourceStatus.BUSY,
                "contact": "ext-202",
                "notes": "Emergency triage vehicle, defibrillator, and rapid field medical kits.",
            },
            {
                "pk": 3,
                "name": "Fire Response Team",
                "resource_type": ResourceType.FIRE,
                "capabilities": ["fire", "medical", "security"],
                "location": CampusLocation.SECURITY_ROOM,
                "status": ResourceStatus.BUSY,
                "contact": "ext-101",
                "notes": "Rapid intervention vehicle, thermal imaging cameras, pressurized hoses.",
            },
            {
                "pk": 4,
                "name": "Hazmat / EHS Team",
                "resource_type": ResourceType.HAZMAT,
                "capabilities": ["hazmat", "medical", "isolation", "security"],
                "location": CampusLocation.BLOCK_2,
                "status": ResourceStatus.AVAILABLE,
                "contact": "ext-301",
                "notes": "Level A/B protective suits, neutralizer tanks, gas detectors, containment booms.",
            },
            {
                "pk": 5,
                "name": "Campus Security Patrol Alpha",
                "resource_type": ResourceType.SECURITY,
                "capabilities": ["security", "isolation"],
                "location": CampusLocation.MAIN_GATE,
                "status": ResourceStatus.AVAILABLE,
                "contact": "ext-401",
                "notes": "Mobile patrol cruiser 1 with crowd dispersal barricades and PA system.",
            },
            {
                "pk": 6,
                "name": "Campus Security Patrol Beta",
                "resource_type": ResourceType.SECURITY,
                "capabilities": ["security", "isolation"],
                "location": CampusLocation.SECURITY_ROOM,
                "status": ResourceStatus.BUSY,
                "contact": "ext-402",
                "notes": "Tactical perimeter control, evacuation coordination, and lockdown response.",
            },
            {
                "pk": 7,
                "name": "Facilities Maintenance Team",
                "resource_type": ResourceType.FACILITIES,
                "capabilities": ["facilities", "security"],
                "location": CampusLocation.SUBSTATION,
                "status": ResourceStatus.BUSY,
                "contact": "ext-501",
                "notes": "High-voltage electrical technicians, isolation switchgear, structural rigging.",
            },
        ]

        resources = {}
        for rdata in resource_definitions:
            res, _ = Resource.objects.update_or_create(
                id=rdata["pk"],
                defaults={
                    "name": rdata["name"],
                    "resource_type": rdata["resource_type"],
                    "capabilities": rdata["capabilities"],
                    "location": rdata["location"],
                    "status": rdata["status"],
                    "contact": rdata["contact"],
                    "notes": rdata["notes"],
                }
            )
            resources[rdata["name"]] = res

        self.stdout.write(self.style.SUCCESS(f"Ensured {len(resources)} emergency response resources."))

        # -------------------------------------------------------------
        # 4. OPERATIONAL INCIDENTS & REPORTS
        # -------------------------------------------------------------
        now = timezone.now()

        # Wipe old mock demo incidents to start clean and structured
        # (Clean existing reports, assignments, timelines first)
        IncidentTimeline.objects.all().delete()
        ResourceAssignment.objects.all().delete()
        CCTVEvent.objects.all().delete()
        Report.objects.all().delete()
        Incident.objects.all().delete()

        incidents_data = [
            # INC-001: P0 Critical Fire in Chemistry Lab
            {
                "id_num": 1,
                "incident_id": "INC-001",
                "incident_type": IncidentType.FIRE_SMOKE,
                "location": CampusLocation.BLOCK_2,
                "location_detail": "3rd Floor Organic Synthesis Lab Room 304",
                "status": IncidentStatus.DISPATCHED,
                "people_exposed": 18,
                "spread_potential": "HIGH",
                "severity_factors": [
                    "Occupied laboratory during chemical synthesis",
                    "Dense acrid black smoke venting into corridor",
                    "Flammable solvent storage cabinets in adjacent room 305",
                    "Building fire suppression alarms actively sounding",
                ],
                "required_capabilities": ["fire", "hazmat", "medical", "isolation"],
                "ai_summary": (
                    "Active structural laboratory fire on the 3rd floor of Block 2. "
                    "Dense smoke venting through HVAC ducts with flammable solvent cabinets "
                    "in immediate proximity. Several students reported inhaling fumes during evacuation."
                ),
                "confidence": 0.96,
                "risk_score": 94.5,
                "priority": PriorityLevel.P0,
                "risk_breakdown": {
                    "hazard_base": 30.0,
                    "occupancy_exposure": 25.0,
                    "escalation_potential": 20.0,
                    "vulnerability": 12.5,
                    "uncertainty_penalty": 7.0,
                },
                "reports": [
                    {
                        "reporter": created_users["student"],
                        "source": Report.ReportSource.STUDENT,
                        "description": (
                            "Black smoke billowing out of Room 304! We heard glass cracking and "
                            "popping sounds from the fume hood. Several students coughing in hallway!"
                        ),
                        "location": CampusLocation.BLOCK_2,
                        "location_detail": "3rd Floor corridor near synthesis lab 304",
                        "additional_info": "Fire alarm strobes activated. Chemical solvent smell.",
                    },
                    {
                        "reporter": created_users["security_staff"],
                        "source": Report.ReportSource.SECURITY,
                        "description": (
                            "Zone 3 smoke sensors triggered in Block 2. Automated fire door held open. "
                            "Directing building occupants toward East stairwell."
                        ),
                        "location": CampusLocation.BLOCK_2,
                        "location_detail": "Block 2 Central Wing 3rd floor",
                        "additional_info": "Sprinkler system engaged in room 304.",
                    },
                ],
                "timeline": [
                    ("08:14", "Emergency report submitted by Student Alex Rivera: 'Black smoke billowing out of Room 304'", created_users["student"]),
                    ("08:14", "Secondary report received from Security Officer Marcus Vance confirming Zone 3 alarm", created_users["security_staff"]),
                    ("08:15", "AI Engine: Extracted Fire/Smoke hazard, calculated 18 people exposed, spread potential HIGH.", None),
                    ("08:15", "Risk Engine: Critical hazard calculation score 94.5/100 (Priority P0). Multi-capability requirement identified.", None),
                    ("08:16", "Operator Sarah Jenkins reviewed intelligence and approved immediate full-scale response.", created_users["operator"]),
                    ("08:17", "Dispatched Fire Response Team and Medical Response Unit Alpha to Block 2.", created_users["operator"]),
                    ("08:18", "Fire Response Team en route, ETA 2 minutes.", None),
                ],
                "assignments": [
                    (resources["Fire Response Team"], ResourceAssignment.AssignmentStatus.DISPATCHED),
                    (resources["Medical Response Unit Alpha"], ResourceAssignment.AssignmentStatus.DISPATCHED),
                ],
                "cctv": [
                    (cameras["CAM-04"], CCTVEventType.SMOKE_FIRE, "Heavy smoke plumes detected in 3rd floor lab corridor", 0.94),
                    (cameras["CAM-05"], CCTVEventType.UNUSUAL_MOVEMENT, "Rapid occupant evacuation toward emergency exit", 0.89),
                ],
            },

            # INC-002: P1 Serious Chemical Hazard (Awaiting Operator Approval — Great for demoing approval flow!)
            {
                "id_num": 2,
                "incident_id": "INC-002",
                "incident_type": IncidentType.CHEMICAL,
                "location": CampusLocation.BLOCK_2,
                "location_detail": "Chemical Storage Bunker & Waste Transfer Dock",
                "status": IncidentStatus.AWAITING_APPROVAL,
                "people_exposed": 6,
                "spread_potential": "MEDIUM",
                "severity_factors": [
                    "55-gallon solvent drum puncture during pallet transfer",
                    "Pungent corrosive vapor cloud forming in covered loading bay",
                    "Enclosed transfer space with restricted ventilation",
                ],
                "required_capabilities": ["hazmat", "isolation"],
                "ai_summary": (
                    "Hazardous chemical spill involving concentrated organic solvent and acid drums "
                    "at the rear delivery bay of Block 2. Two loading technicians exposed to vapor. "
                    "Immediate EHS containment and perimeter cordon recommended."
                ),
                "confidence": 0.92,
                "risk_score": 81.5,
                "priority": PriorityLevel.P1,
                "risk_breakdown": {
                    "hazard_base": 26.0,
                    "occupancy_exposure": 18.0,
                    "escalation_potential": 18.0,
                    "vulnerability": 11.0,
                    "uncertainty_penalty": 8.5,
                },
                "reports": [
                    {
                        "reporter": created_users["faculty"],
                        "source": Report.ReportSource.FACULTY,
                        "description": (
                            "Pallet fell off forklift during solvent unloading. Strong acrid vapor smelling "
                            "like glacial acetic acid and toluene leaking onto pavement. Two staff coughing."
                        ),
                        "location": CampusLocation.BLOCK_2,
                        "location_detail": "Rear delivery dock, Chemical Bunker Bay B",
                        "additional_info": "Spill kit on wall insufficient for volume (approx 40L spilled).",
                    },
                ],
                "timeline": [
                    ("08:22", "Faculty member Prof. Robert Langdon logged urgent chemical spill report.", created_users["faculty"]),
                    ("08:22", "AI Engine: Classified as CHEMICAL hazard with capabilities ['hazmat', 'isolation'].", None),
                    ("08:23", "Risk Engine: Evaluated priority P1 (Score 81.5/100). Status moved to AWAITING_APPROVAL.", None),
                    ("08:23", "System: Recommended Hazmat / EHS Team (Score 1.000 match). Awaiting operator action.", None),
                ],
                "assignments": [],
                "cctv": [
                    (cameras["CAM-06"], CCTVEventType.RESTRICTED_ENTRY, "Corrosive vapor dispersion visible across loading ramp", 0.86),
                ],
            },

            # INC-003: P2 Infrastructure / Electrical Sparking (Status: RESPONDING)
            {
                "id_num": 3,
                "incident_id": "INC-003",
                "incident_type": IncidentType.ELECTRICAL,
                "location": CampusLocation.SUBSTATION,
                "location_detail": "High-Voltage Distribution Substation TX-2 Yard",
                "status": IncidentStatus.RESPONDING,
                "people_exposed": 4,
                "spread_potential": "LOW",
                "severity_factors": [
                    "Continuous electric arcing and loud buzzing at 11kV busbar",
                    "Threat of campus-wide secondary power grid failure",
                    "Proximity to Block 4 Computer Science Server Facility",
                ],
                "required_capabilities": ["facilities", "security"],
                "ai_summary": (
                    "High-voltage electrical fault and continuous arcing at substation TX-2. "
                    "Transformer temperature telemetry elevated. Critical infrastructure risk to campus servers."
                ),
                "confidence": 0.91,
                "risk_score": 66.0,
                "priority": PriorityLevel.P2,
                "risk_breakdown": {
                    "hazard_base": 20.0,
                    "occupancy_exposure": 12.0,
                    "escalation_potential": 18.0,
                    "vulnerability": 8.0,
                    "uncertainty_penalty": 8.0,
                },
                "reports": [
                    {
                        "reporter": created_users["security_staff"],
                        "source": Report.ReportSource.SECURITY,
                        "description": (
                            "Patrol heard loud buzzing and witnessed bright electric flash discharges "
                            "at main transformer yard 2. Ozone smell prominent."
                        ),
                        "location": CampusLocation.SUBSTATION,
                        "location_detail": "Transformer Substation 2 Perimeter Fence",
                        "additional_info": "Flickering lights observed in Administration block.",
                    },
                ],
                "timeline": [
                    ("08:05", "Report filed by Security Officer Marcus Vance.", created_users["security_staff"]),
                    ("08:06", "AI Engine: Extracted Electrical Infrastructure hazard requiring ['facilities', 'security'].", None),
                    ("08:07", "Operator Sarah Jenkins dispatched Facilities Maintenance Team and Security Patrol Beta.", created_users["operator"]),
                    ("08:12", "Facilities Maintenance Team arrived at substation switchgear, initiating isolator cutoff.", None),
                ],
                "assignments": [
                    (resources["Facilities Maintenance Team"], ResourceAssignment.AssignmentStatus.RESPONDING),
                    (resources["Campus Security Patrol Beta"], ResourceAssignment.AssignmentStatus.ON_SCENE),
                ],
                "cctv": [],
            },

            # INC-004: P2 Medical Emergency in Cafeteria (Status: ON_SCENE)
            {
                "id_num": 4,
                "incident_id": "INC-004",
                "incident_type": IncidentType.MEDICAL,
                "location": CampusLocation.CAFETERIA,
                "location_detail": "Central Dining Hall near Counter 3",
                "status": IncidentStatus.ON_SCENE,
                "people_exposed": 1,
                "spread_potential": "NONE",
                "severity_factors": [
                    "Acute anaphylactic shock symptoms with respiratory distress",
                    "High crowd density creating visual panic",
                    "Time-critical medical intervention required",
                ],
                "required_capabilities": ["medical"],
                "ai_summary": (
                    "Student collapsed in central dining hall due to acute food allergen reaction. "
                    "Labored breathing and swelling reported. Paramedic rapid response deployed."
                ),
                "confidence": 0.95,
                "risk_score": 58.0,
                "priority": PriorityLevel.P2,
                "risk_breakdown": {
                    "hazard_base": 19.0,
                    "occupancy_exposure": 14.0,
                    "escalation_potential": 6.0,
                    "vulnerability": 15.0,
                    "uncertainty_penalty": 4.0,
                },
                "reports": [
                    {
                        "reporter": created_users["student"],
                        "source": Report.ReportSource.STUDENT,
                        "description": (
                            "A student suddenly collapsed onto the table clutching their throat after eating. "
                            "Friends say they have a severe peanut allergy. They can barely breathe!"
                        ),
                        "location": CampusLocation.CAFETERIA,
                        "location_detail": "Ground floor main seating area table 14",
                        "additional_info": "EpiPen not available with companions.",
                    },
                ],
                "timeline": [
                    ("08:18", "Urgent student distress report received via mobile portal.", created_users["student"]),
                    ("08:18", "AI Engine flagged high-vulnerability medical emergency requiring ['medical'].", None),
                    ("08:19", "Operator dispatched Medical Response Unit Beta from Health Centre.", created_users["operator"]),
                    ("08:23", "Medical Response Unit Beta on scene; administering intramuscular epinephrine and oxygen.", None),
                ],
                "assignments": [
                    (resources["Medical Response Unit Beta"], ResourceAssignment.AssignmentStatus.ON_SCENE),
                ],
                "cctv": [],
            },

            # INC-005: P3 Security Intrusion / Gate Breach (Status: REPORTED)
            {
                "id_num": 5,
                "incident_id": "INC-005",
                "incident_type": IncidentType.SECURITY_THREAT,
                "location": CampusLocation.MAIN_GATE,
                "location_detail": "West Vehicle Entrance & Visitor Parking Area",
                "status": IncidentStatus.REPORTED,
                "people_exposed": 5,
                "spread_potential": "LOW",
                "severity_factors": [
                    "Unregistered black SUV bypassed security boom barrier",
                    "Driver refused vehicle inspection and entered student parking lot",
                ],
                "required_capabilities": ["security"],
                "ai_summary": (
                    "Perimeter barrier bypass at Main Gate. Unregistered vehicle entered western lot "
                    "without credentials. Gate guard requests secondary security intercept."
                ),
                "confidence": 0.88,
                "risk_score": 38.0,
                "priority": PriorityLevel.P3,
                "risk_breakdown": {
                    "hazard_base": 14.0,
                    "occupancy_exposure": 8.0,
                    "escalation_potential": 7.0,
                    "vulnerability": 4.0,
                    "uncertainty_penalty": 5.0,
                },
                "reports": [
                    {
                        "reporter": created_users["security_staff"],
                        "source": Report.ReportSource.SECURITY,
                        "description": (
                            "Black sedan plate #XYZ-908 sped past barrier while arm was raised for bus. "
                            "Refused security guard whistle and parked in zone C."
                        ),
                        "location": CampusLocation.MAIN_GATE,
                        "location_detail": "Main Gate barrier lane 2",
                        "additional_info": "Plate recorded on entrance CCTV.",
                    },
                ],
                "timeline": [
                    ("08:25", "Incident logged by Security Staff Marcus Vance.", created_users["security_staff"]),
                    ("08:25", "AI Engine prioritized as P3 security disturbance.", None),
                ],
                "assignments": [],
                "cctv": [
                    (cameras["CAM-10"], CCTVEventType.RESTRICTED_ENTRY, "Vehicle entered parking zone without barrier clearance", 0.82),
                ],
            },

            # INC-006: P3 Crowd Disturbance (Status: RESOLVED)
            {
                "id_num": 6,
                "incident_id": "INC-006",
                "incident_type": IncidentType.VIOLENCE_CROWD,
                "location": CampusLocation.AUDITORIUM,
                "location_detail": "Main Foyer Ticket Counter",
                "status": IncidentStatus.RESOLVED,
                "people_exposed": 30,
                "spread_potential": "LOW",
                "severity_factors": [
                    "Overcrowding and pushing near auditorium doors ahead of guest lecture",
                ],
                "required_capabilities": ["security"],
                "ai_summary": (
                    "Mild crowd surge and queuing dispute in front of auditorium ticketing foyer. "
                    "Security patrol deployed and restored orderly queue."
                ),
                "confidence": 0.90,
                "risk_score": 24.0,
                "priority": PriorityLevel.P3,
                "risk_breakdown": {
                    "hazard_base": 10.0,
                    "occupancy_exposure": 6.0,
                    "escalation_potential": 3.0,
                    "vulnerability": 2.0,
                    "uncertainty_penalty": 3.0,
                },
                "reports": [
                    {
                        "reporter": created_users["faculty"],
                        "source": Report.ReportSource.FACULTY,
                        "description": "Large gathering outside auditorium pushing past registration desk.",
                        "location": CampusLocation.AUDITORIUM,
                        "location_detail": "Auditorium main entrance steps",
                        "additional_info": "Resolved peacefully with additional stanchions.",
                    },
                ],
                "timeline": [
                    ("07:30", "Faculty report filed regarding crowd bottleneck.", created_users["faculty"]),
                    ("07:35", "Security Patrol Alpha dispatched to manage queues.", created_users["operator"]),
                    ("07:50", "Patrol Alpha installed stanchions; crowd orderly; incident marked Resolved.", None),
                ],
                "assignments": [
                    (resources["Campus Security Patrol Alpha"], ResourceAssignment.AssignmentStatus.COMPLETED),
                ],
                "cctv": [],
            },
        ]

        for item in incidents_data:
            inc = Incident.objects.create(
                id=item["id_num"],
                incident_id=item["incident_id"],
                incident_type=item["incident_type"],
                location=item["location"],
                location_detail=item["location_detail"],
                status=item["status"],
                people_exposed=item["people_exposed"],
                spread_potential=item["spread_potential"],
                severity_factors=item["severity_factors"],
                required_capabilities=item["required_capabilities"],
                ai_summary=item["ai_summary"],
                confidence=item["confidence"],
                risk_score=item["risk_score"],
                priority=item["priority"],
                risk_breakdown=item["risk_breakdown"],
            )

            if item["status"] == IncidentStatus.RESOLVED:
                inc.resolved_at = now - timedelta(minutes=45)
                inc.save(update_fields=["resolved_at"])

            # Reports
            for rdata in item["reports"]:
                Report.objects.create(
                    incident=inc,
                    reporter=rdata["reporter"],
                    source=rdata["source"],
                    description=rdata["description"],
                    location=rdata["location"],
                    location_detail=rdata["location_detail"],
                    additional_info=rdata.get("additional_info", ""),
                )

            # Timelines
            for time_str, event_text, actor_user in item["timeline"]:
                IncidentTimeline.objects.create(
                    incident=inc,
                    event=f"[{time_str}] {event_text}",
                    actor=actor_user,
                    actor_label=actor_user.get_full_name() if actor_user else "JarVIZ AI Engine",
                )

            # Resource Assignments
            for res_obj, assign_status in item["assignments"]:
                ResourceAssignment.objects.create(
                    incident=inc,
                    resource=res_obj,
                    assigned_by=created_users["operator"],
                    status=assign_status,
                )

            # CCTV Events
            for cam_obj, ev_type, ev_desc, conf in item["cctv"]:
                CCTVEvent.objects.create(
                    camera=cam_obj,
                    event_type=ev_type,
                    description=ev_desc,
                    confidence_score=conf,
                    linked_incident=inc,
                    reviewed=True,
                )

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {len(incidents_data)} operational incidents with reports, timelines, and assignments!"))
