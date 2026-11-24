# V-Link : Vision LINK

A Unified Professional Networking & Career-Readiness Platform for Students (developed from the HIET Shahpur / HPTU B.Tech CSE Major Project Synopsis).

## Architecture Overview

1. **Frontend Layer (`frontend/`)** — Next.js 15 (React + TypeScript + Tailwind CSS)
   - Unified Student Profile with verified campus badge, endorsed/verified skills, project showcase, and readiness signal.
   - Community & Content Feed (posts, project shares, articles, image attachments, reactions, reposts, comments, and interest/campus groups).
   - Networking Graph with AI similarity recommendations, peer endorsements, and campus directory search.
   - Jobs, Followable Company Pages & Stage-by-Stage Application Tracker.
   - Career Readiness Suite (Skill Diagnostic, Personalised Milestone Roadmap, Free Certifications Hub, AI Mock Interviews, and Quiz Skill Verification).
   - ATS-Ready Resume Builder with automated profile sync, Resume-to-JD Compatibility Scoring, and downloadable ATS PDF export.
   - One-to-One & Group Messaging + Notifications + Global Search.

2. **AI/ML Microservice (`ai-service/`)** — Python FastAPI
   - `/api/ai/readiness-score` — Role-aligned readiness scoring & gap analysis.
   - `/api/ai/roadmap` — Personalised milestone learning plan generation.
   - `/api/ai/match-jobs` — Skill-aware job matching.
   - `/api/ai/resume-compatibility` & `/api/ai/resume-assist` — ATS keyword scoring & bullet enhancement.
   - `/api/ai/mock-interview/start` & `/evaluate` — Technical mock interview & rubric feedback.
   - `/api/ai/verify-skill/questions` & `/submit` — Quiz-based skill verification badges.
   - `/api/ai/recommend-connections` — Peer similarity recommendations.

3. **Cloud Infrastructure Blueprint (`infra/`)**
   - `infra/appsync-schema.graphql` — AWS AppSync GraphQL schema & real-time subscriptions.
   - `infra/template.yaml` — AWS SAM template for Cognito, DynamoDB, S3, and Lambda.

## Running Locally

### Option A: One-command Windows launcher
```powershell
.\start-vlink.ps1
```

### Option B: Run each service manually

1. **Start Python AI/ML Service (port 8001):**
```powershell
cd ai-service
..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

2. **Start Next.js Frontend + API Layer (port 3000):**
```powershell
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Running Automated Tests

- **Python AI/ML Service (`pytest`):**
```powershell
cd ai-service
..\.venv\Scripts\python.exe -m pytest -v
```

- **Next.js Frontend (`jest`):**
```powershell
cd frontend
npm test
```
