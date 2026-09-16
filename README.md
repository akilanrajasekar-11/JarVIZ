# JarVIZ

**AI-Powered Campus Emergency Intelligence & Response Platform**

> From fragmented emergency reports to coordinated, explainable response.

![Status](https://img.shields.io/badge/status-prototype-orange)
![Frontend](https://img.shields.io/badge/frontend-React-61DAFB)
![Backend](https://img.shields.io/badge/backend-Django-092E20)
![Database](https://img.shields.io/badge/database-PostgreSQL%20%7C%20Neon-336791)
![LLM](https://img.shields.io/badge/LLM-Groq%20Cloud-F55036)

---

## Table of Contents

- [What JarVIZ Is](#what-jarviz-is)
- [The Problem](#the-problem)
- [How It Works](#how-it-works)
- [Key Features](#key-features)
- [System Users](#system-users)
- [Supported Emergency Scenarios](#supported-emergency-scenarios)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Data Models](#data-models)
- [API Surface](#api-surface)
- [How the Intelligence Works](#how-the-intelligence-works)
- [Worked Example](#worked-example)
- [Design Principles](#design-principles)
- [Campus Simulation Data](#campus-simulation-data)
- [Roadmap](#roadmap)
- [Disclaimer](#disclaimer)

---

## What JarVIZ Is

JarVIZ is an AI-powered campus emergency management platform that helps authorities **understand, prioritize, coordinate, and track campus emergencies in real time**.

It is not a simple emergency reporting app. JarVIZ combines multi-source incident reporting, LLM-based incident understanding, contextual risk assessment, CCTV-linked evidence, capability-aware resource matching, and human-approved dispatch into one coordinated system.

**In one sentence:** JarVIZ turns unstructured emergency reports into structured, ranked, evidence-backed intelligence — and leaves the final call to a human operator.

---

## The Problem

| Gap in current campus emergency handling | What JarVIZ does about it |
|---|---|
| Reports arrive via phone, WhatsApp, and word of mouth | One centralized intake for students, faculty, security, and CCTV |
| Free-text reports need manual interpretation | An LLM extracts type, location, exposure, and severity factors |
| Severity is assigned by incident type alone | Risk is scored from context: occupancy, exposure, escalation, vulnerability |
| Multiple simultaneous incidents compete for attention | A live priority queue that re-ranks as new information arrives |
| The nearest team gets dispatched, not the right one | Capability-first resource matching |
| No auditable record of who decided what, and when | A full incident timeline from report to closure |

---

## How It Works

The system follows the complete emergency lifecycle:

```text
Report
  ↓
AI Incident Understanding
  ↓
Evidence & Context
  ↓
Risk Assessment
  ↓
Priority
  ↓
Resource Recommendation
  ↓
Human Approval
  ↓
Dispatch
  ↓
Live Tracking
  ↓
Resolution
```

Each stage is independently inspectable — an operator can see what the AI extracted, which factors drove the risk score, which cameras cover the location, and why a particular team was recommended.

---

## Key Features

### 1. Centralized Emergency Reporting

Students, faculty, and security personnel report emergencies with:

- Incident description
- Location
- Emergency type
- Optional image/video
- Additional contextual information

Reports from all sources are consolidated into a single incident-management view.

### 2. AI-Powered Incident Understanding

JarVIZ uses **Groq Cloud LLM models** to convert unstructured descriptions into structured data.

**Input:**

> "Heavy smoke is coming from the second floor of Block 2 and several students are still inside."

**Extracted:**

```text
Type              → Fire / Smoke
Location          → Block 2, 2nd Floor
People Exposed    → Several students
Spread Potential  → High
Severity Factors  → Occupied building + smoke
Confidence        → High
```

The LLM handles **information extraction and contextual understanding only**. Risk calculation and resource matching stay in deterministic application logic, so scores are reproducible and auditable.

### 3. Context-Aware Risk Assessment

Incidents are evaluated on multiple factors rather than a fixed severity per incident type:

- Hazard severity
- Number of people affected
- Location and occupancy
- Escalation potential
- Vulnerability of those exposed
- Response difficulty
- Information uncertainty

Same hazard, different context, different outcome:

```text
Smoke in empty classroom          →  HIGH
Heavy smoke in occupied laboratory →  CRITICAL
```

### 4. Dynamic Priority Queue

Multiple emergencies can occur at once. JarVIZ maintains a continuously updated queue:

```text
P0  Chemical Exposure       96
P0  Building Fire           94
P1  Hostel Violence         81
P2  Medical Incident        58
P3  Electrical Hazard       42
```

When new information arrives — a second report, a security observation, a CCTV event — the incident is reassessed and its position updated.

### 5. CCTV-Linked Evidence

CCTV is an **additional evidence source**, never an autonomous decision-maker.

```text
Emergency reported
       ↓
Block 1 → Library
       ↓
Find cameras covering location
       ↓
CAM-01 → Library Entrance
CAM-02 → Block 1 Corridor
       ↓
Operator reviews relevant footage
```

Simulated AI CCTV events supported by the prototype:

- Possible smoke/fire
- Crowd formation
- Restricted-area entry
- Fall/collapse detection
- Unusual crowd movement

### 6. Capability-Aware Resource Matching

JarVIZ does **not** simply select the nearest team.

```text
Incident Requirements
        ↓
Required Capabilities
        ↓
Resource Availability
        ↓
Equipment
        ↓
Current Workload
        ↓
ETA / Distance
        ↓
Recommendation
```

A chemical emergency may require **Hazmat + Medical + Security Isolation**. A nearby security guard is not automatically the primary response resource.

### 7. Human-in-the-Loop Response

The AI provides classification, risk factors, confidence, evidence, and recommendations. The **authorized Emergency Operator makes the final operational decision.**

```text
AI Recommendation → Operator Review → Approve / Reject → Resource Assignment
```

### 8. End-to-End Incident Tracking

```text
REPORTED → CLASSIFIED → PRIORITIZED → AWAITING APPROVAL → ASSIGNED
   → DISPATCHED → RESPONDING → ON SCENE → RESOLVED → CLOSED
```

The complete timeline is retained for post-incident analysis.

---

## System Users

```text
                 JarVIZ
                   │
       ┌───────────┼───────────┐
       ↓           ↓           ↓
   REPORTERS    OPERATORS   RESPONSE TEAMS
       │           │           │
   Student      Emergency    Medical
   Faculty      Operator     Fire
   Security                  Hazmat
                             Security
                             Facilities

                    ↑
                    │
                   CCTV
              Visual Evidence
```

| Role | Capabilities |
|---|---|
| **Student / Faculty** — Reporters | Report emergencies, provide location and description, upload media, track their submitted incidents |
| **Security Staff** — Field reporters & verifiers | Report incidents, verify reports, add field observations, update incident information |
| **Emergency Operator** — Command & decision user | Monitor incidents, review AI analysis, view CCTV evidence, approve recommendations, assign resources, monitor response |
| **Response Teams** — Action users | Receive assignments and update operational status (Medical, Fire, Hazmat/EHS, Security, Electrical/Facilities) |
| **CCTV** — Automated evidence source | Supplies location-linked footage and simulated detection events (not a human user) |

---

## Supported Emergency Scenarios

| Category | Examples |
|---|---|
| **Fire / Smoke** | Building fire, heavy smoke, explosion, fire in occupied buildings |
| **Medical** | Collapse, unconscious person, serious injury, severe bleeding, campus accident |
| **Chemical / Laboratory** | Chemical spill, toxic fumes, gas leakage, chemical exposure, unknown hazardous substance |
| **Security Threat / Intrusion** | Unauthorized entry, restricted-area intrusion, suspicious package, threatening behavior |
| **Electrical / Infrastructure** | Electrical sparks, exposed wiring, panel failure, gas leak, water leakage near electrical infrastructure |
| **Violence / Crowd** | Physical altercation, threatening behavior, crowd gathering, crowd panic, security disturbance |

---

## Architecture

```text
                    USERS
                      │
                      ↓
              ┌───────────────┐
              │ React.js      │
              │ Frontend      │
              └───────┬───────┘
                      │
                  REST / WS
                      │
                      ↓
              ┌───────────────┐
              │ Django        │
              │ Backend       │
              └───────┬───────┘
                      │
        ┌─────────────┼─────────────┐
        ↓             ↓             ↓
   Incident API   AI Service    Resource Engine
        │             │             │
        │             ↓             │
        │       Groq Cloud          │
        │                           │
        └─────────────┬─────────────┘
                      ↓
              ┌───────────────┐
              │ PostgreSQL    │
              │ Neon          │
              └───────────────┘

              CCTV / Camera Events
                       │
                       ↓
                Django Backend
                       │
                       ↓
              Incident Intelligence
```

**Responsibility split:**

| Component | Responsibility |
|---|---|
| `incidents` | Report intake, incident lifecycle, status transitions, timeline |
| `ai_engine` | Groq prompt construction, structured extraction, confidence handling |
| `risk_engine` | Deterministic weighted risk scoring and priority assignment |
| `resources` | Capability matching, availability, workload, ETA ranking |
| `cameras` | Location-to-camera mapping, simulated CCTV events |
| `users` | Roles, permissions, operator authorization |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React.js |
| Backend | Django |
| Database | PostgreSQL |
| Database Hosting | Neon |
| LLM | Groq Cloud Models |
| API Communication | REST APIs |
| Real-Time Updates | WebSockets / Django Channels |
| Map | Leaflet / OpenStreetMap |
| Styling | CSS / Tailwind CSS |

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- A PostgreSQL database (Neon free tier works)
- A Groq Cloud API key

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/jarviz.git
cd jarviz
```

### 2. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp ../.env.example .env           # then fill in your values
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Backend runs at `http://localhost:8000`.

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

### 4. Seed demo data (optional)

```bash
python manage.py loaddata fixtures/campus.json      # blocks, cameras
python manage.py loaddata fixtures/resources.json   # response teams
```

---

## Environment Variables

Create a `.env` file in the backend/project root.

```env
# Django
DJANGO_SECRET_KEY=your_django_secret_key
DEBUG=True

# PostgreSQL / Neon
DATABASE_URL=postgresql://username:password@your-neon-host/dbname?sslmode=require

# Groq Cloud
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=your_groq_model_name

# Frontend
FRONTEND_URL=http://localhost:5173

# Optional
CCTV_API_URL=your_cctv_api_url
```

Commit `.env.example` (with blank values), never the real `.env`. Add `.env` to `.gitignore`.

> **Never push API keys, database passwords, or other secrets to GitHub.**

---

## Project Structure

```text
jarviz/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── utils/
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── jarviz/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── asgi.py
│   │
│   ├── incidents/
│   ├── resources/
│   ├── users/
│   ├── cameras/
│   ├── ai_engine/
│   ├── risk_engine/
│   └── manage.py
│
├── .env.example
├── .gitignore
└── README.md
```

---

## Data Models

```text
User
 ├── role
 └── profile

Incident
 ├── type
 ├── location
 ├── severity
 ├── risk_score
 ├── priority
 ├── status
 └── confidence

Report
 ├── incident
 ├── source
 ├── description
 ├── timestamp
 └── evidence

Camera
 ├── location
 ├── coverage_area
 └── status

Resource
 ├── type
 ├── capabilities
 ├── location
 ├── availability
 └── current_assignment

IncidentTimeline
 ├── incident
 ├── event
 ├── timestamp
 └── actor
```

### Example Incident Record

```json
{
  "incident_id": "INC-104",
  "type": "CHEMICAL_HAZARD",
  "location": "Block 2 - Lab 4",
  "people_exposed": 5,
  "symptoms": ["breathing difficulty"],
  "hazard": "unknown chemical",
  "risk_score": 96,
  "priority": "P0",
  "confidence": 0.87,
  "required_capabilities": ["hazmat", "medical", "security_isolation"],
  "status": "AWAITING_APPROVAL"
}
```

---

## API Surface

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/reports/` | Submit a new emergency report |
| `GET` | `/api/incidents/` | List incidents, ordered by priority |
| `GET` | `/api/incidents/{id}/` | Full incident detail with AI analysis and risk breakdown |
| `GET` | `/api/incidents/{id}/timeline/` | Auditable event timeline |
| `GET` | `/api/incidents/{id}/cameras/` | Cameras covering the incident location |
| `GET` | `/api/incidents/{id}/recommendation/` | Recommended resources plus alternatives |
| `POST` | `/api/incidents/{id}/approve/` | Operator approves and assigns resources |
| `PATCH` | `/api/assignments/{id}/status/` | Response team updates operational status |
| `POST` | `/api/cameras/events/` | Ingest a (simulated) CCTV detection event |
| `WS` | `/ws/incidents/` | Live incident and priority-queue updates |

Endpoint names are indicative of the prototype's intended surface; adjust to match your implementation.

---

## How the Intelligence Works

### Risk Assessment

An explainable weighted model, so every score can be broken down for the operator:

```text
Risk Score =

0.30 × Hazard Severity
+
0.20 × People Exposure
+
0.15 × Escalation Potential
+
0.15 × Vulnerability
+
0.10 × Response Difficulty
+
0.10 × Uncertainty
```

All factors are normalized to a 0–100 scale.

| Score | Priority | Meaning |
|---|---|---|
| 90–100 | P0 | Life-threatening, immediate multi-team response |
| 75–89 | P1 | Serious, urgent response required |
| 50–74 | P2 | Significant, prompt response |
| 0–49 | P3 | Lower urgency, scheduled response |

> The risk engine is a **prototype contextual risk model built for a hackathon**, not a clinically or operationally validated emergency-risk standard.

### Resource Matching

Capability-first filtering, then ranking:

```text
required_capabilities =
    incident.required_capabilities

eligible_resources =
    resources where
      required_capabilities ⊆ resource.capabilities
      AND resource.status == AVAILABLE
```

Eligible resources are then scored on:

```text
Capability Match + Availability + ETA / Distance + Current Workload + Equipment Match
```

The system presents one recommendation plus alternatives — the operator chooses.

---

## Worked Example

```text
Student submits:
"Chemical smell and students coughing
inside Lab 4, Block 2."
                │
                ↓
        Django receives report
                │
                ↓
          Groq LLM analyzes
                │
                ↓
       Structured incident data
                │
                ↓
       Context + Risk Engine
                │
                ↓
        Risk = 94 / Critical
                │
                ↓
       Find associated cameras
                │
                ↓
       Operator reviews evidence
                │
                ↓
     Required capabilities detected
                │
                ↓
       Hazmat + Medical + Security
                │
                ↓
       Available resources matched
                │
                ↓
         Operator approves
                │
                ↓
             Dispatch
                │
                ↓
      Responding → On Scene
                │
                ↓
             Resolved
                │
                ↓
       Incident timeline generated
```

---

## Design Principles

| Principle | What it means in JarVIZ |
|---|---|
| **AI as decision support** | The system never autonomously replaces emergency authorities |
| **Explainability** | Every recommendation exposes its factors and supporting evidence |
| **Human-in-the-loop** | Authorized personnel review and approve all operational actions |
| **Context over category** | The same incident type carries different risk depending on location, exposure, and occupancy |
| **Capability over proximity** | The closest resource is not necessarily the correct resource |
| **Evidence-based updates** | New reports, field observations, and CCTV events revise understanding and risk |
| **Full lifecycle tracking** | Every incident keeps an auditable timeline from report to resolution |

---

## Campus Simulation Data

The prototype models a realistic campus environment.

```text
Block 1       → Library / Academic
Block 2       → Chemistry Labs
Block 3       → Mechanical Workshop
Block 4       → Computer Science
Block 5       → Administration
Hostel A      → Residential
Hostel B      → Residential
Main Gate     → Campus Entrance
Cafeteria     → High Occupancy
Auditorium    → Large Gathering
Sports Ground → Open Area
Health Centre → Medical Response
Security Room → Command Centre
Electrical Substation → Infrastructure
```

### CCTV Camera Mapping

```text
Block 1
 ├── CAM-01 → Library Entrance
 ├── CAM-02 → Library Corridor
 └── CAM-03 → Block 1 Entrance

Block 2
 ├── CAM-04 → Lab Corridor
 ├── CAM-05 → Laboratory Entrance
 └── CAM-06 → Block 2 Entrance

Hostel A
 ├── CAM-07 → Main Entrance
 └── CAM-08 → Common Area

Main Gate
 ├── CAM-09 → Entry Gate
 └── CAM-10 → Parking Area
```

CCTV feeds and events are simulated or represented with prerecorded footage rather than connected to real campus surveillance infrastructure.

---

## Roadmap

- [ ] Multi-report deduplication — merge several reports of the same incident
- [ ] Real CCTV integration via RTSP with on-edge detection
- [ ] Mobile reporter app with GPS auto-location
- [ ] SMS/push alerting for response teams
- [ ] Post-incident analytics dashboard (response times, hotspots, recurring hazards)
- [ ] Offline-capable reporting for low-connectivity areas

---

## Project Objective

JarVIZ aims to provide a **unified, explainable, and resource-aware emergency coordination platform** for campus environments.

It reduces information fragmentation and decision delays by transforming reports and location-linked evidence into structured intelligence, dynamic priorities, and actionable resource recommendations — while keeping final operational decisions with authorized responders.

> **JarVIZ — Understand the incident. Prioritize the risk. Coordinate the response. Track the outcome.**

---

## Disclaimer

JarVIZ is a **hackathon prototype** intended to demonstrate AI-assisted campus emergency coordination. It is not a replacement for official emergency services, campus emergency procedures, trained personnel, or established safety protocols.
