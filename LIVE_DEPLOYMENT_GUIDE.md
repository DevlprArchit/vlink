# 🚀 V-Link (Vision LINK) — Commercial Live Platform & AWS/n8n Architecture

**Commercial Platform & Engineering Specification — V-Link Technologies**  
**Lead Architecture & Founding Team:**  
- **Archit Sharma** (`archit.sharma@hiet.co.in`) — Lead Platform Architect & Full-Stack Engineer  
- **Tarun Kashyap** (`tarun.kashyap@hiet.co.in`) — Cloud Infrastructure & Distributed Backend Lead  
- **Deepika** (`deepika@hiet.co.in`) — UI/UX Design System Lead & Product Engineer  
- **Simran Rana** (`simran.rana@hiet.co.in`) — Data, ML Telemetry & QA Engineering Lead  

**Institutional Partner:** Hi-Tech Institute of Engineering & Technology (HIET), Shahpur · Affiliated to HPTU Hamirpur  
**Project Guide:** Mr. Anuj Sharma  

---

## 🌟 1. Commercial Platform Architecture

V-Link is a multi-tenant B2B/B2C SaaS platform that connects student career readiness with verified enterprise hiring and institutional accreditation compliance (NAAC Criterion 5.2 / NBA).

### Verified Founding Profiles (Password: `vlink123`)

| Name | Role | Email | Campus Standing | Readiness DRI |
|---|---|---|---|---|
| **Archit Sharma** | Full-Stack & System Lead | `archit.sharma@hiet.co.in` | Top 3% HIET CSE | **88% (Elite Tier)** |
| **Tarun Kashyap** | Cloud & Microservices Lead | `tarun.kashyap@hiet.co.in` | Top 5% HIET CSE | **86% (Elite Tier)** |
| **Deepika** | UI/UX & Design Systems Lead | `deepika@hiet.co.in` | Top 5% HIET CSE | **84% (Elite Tier)** |
| **Simran Rana** | Data Pipelines & QA Lead | `simran.rana@hiet.co.in` | Top 5% HIET CSE | **85% (Elite Tier)** |

---

## ☁️ 2. AWS Commercial Cloud Deployment Guide

To deploy V-Link as an independent commercial live website on AWS (`vlink.in`):

### Tier 1: Client & Edge Network
- **Amazon CloudFront:** Global Content Delivery Network with edge caching and TLS 1.3 termination.
- **Route 53:** Public DNS routing for `vlink.in` and `api.vlink.in` with ACM SSL certificates.
- **AWS Amplify Hosting / ECS Fargate:** Next.js frontend container deployment with zero-downtime rolling deploys.

### Tier 2: Serverless Intelligence & API Layer
- **AWS ECS Fargate / Lambda Containers:** Deploy the Python FastAPI microservice (`ai-service/app/main.py`) running Uvicorn with auto-scaling (1–10 tasks based on CPU/memory utilization).
- **Amazon API Gateway:** REST API endpoint manager routing `/api/ai/*` to ECS and `/api/*` to the frontend gateway.

### Tier 3: Scalable Data Layer
- **Amazon DynamoDB:** Single-table design for users, posts, jobs, roadmaps, and telemetry records with on-demand capacity.
- **Amazon S3:** Encrypted object storage (`vlink-resumes-prod`) for generated ATS PDF resumes and candidate artifacts.
- **Amazon Cognito:** User directory with institutional domain whitelisting (`hiet.co.in`, `*.edu`, `*.ac.in`).

```bash
# Deploy AWS SAM infrastructure
cd infra
sam build
sam deploy --guided --stack-name vlink-commercial-prod
```

---

## ⚡ 3. n8n Automation & Webhook Integration

V-Link utilizes **n8n** for event-driven campus and recruiter automations:

### Pipeline 1: Automated TPO Placement Drive Broadcast
- **Trigger:** Webhook POST to `https://n8n.vlink.in/webhook/tpo-drive` when an institutional placement officer broadcasts a campus hiring drive under `/tpo`.
- **Workflow:**
  1. Filter student roster by Minimum Required DRI (e.g., DRI ≥ 80%).
  2. Send instant push notification and automated email digest to eligible candidates.
  3. Post announcement to the HIET Placement Prep community feed.

### Pipeline 2: Candidate Credential Verification
- **Trigger:** Webhook on new certificate submission.
- **Workflow:**
  1. Call AWS Textract / verification API to validate certificate authenticity.
  2. Award golden "Verified Skill" badge to the candidate's profile.
  3. Recalculate candidate's Demonstrable Readiness Index (DRI).

### Pipeline 3: Weekly DRI Optimization Newsletter
- **Trigger:** Scheduled Cron (Mondays at 08:00 AM IST).
- **Workflow:**
  1. Compute 7-day skill delta across student cohorts.
  2. Generate customized 3-step learning recommendations via FastAPI microservice.
  3. Send personalized email report to each student.

---

## 💻 4. Local Development Execution

```powershell
# 1. Start Python AI Microservice (Port 8001)
cd ai-service
..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001

# 2. Start Next.js Frontend (Port 3000)
cd frontend
npm run dev
```
