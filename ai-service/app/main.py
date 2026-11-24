from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .engine import (
    assist_resume,
    compute_readiness,
    evaluate_mock_interview,
    generate_roadmap,
    get_skill_verification_questions,
    match_jobs,
    recommend_connections,
    score_resume_compatibility,
    start_mock_interview,
    submit_skill_verification,
)
from .models import (
    ConnectionRecommendRequest,
    ConnectionRecommendResponse,
    JobMatchRequest,
    JobMatchResponse,
    MockInterviewEvaluateRequest,
    MockInterviewEvaluateResponse,
    MockInterviewStartRequest,
    MockInterviewStartResponse,
    ReadinessRequest,
    ReadinessResponse,
    ResumeAssistRequest,
    ResumeAssistResponse,
    ResumeCompatibilityRequest,
    ResumeCompatibilityResponse,
    RoadmapRequest,
    RoadmapResponse,
    VerifySkillQuestionsRequest,
    VerifySkillQuestionsResponse,
    VerifySkillSubmitRequest,
    VerifySkillSubmitResponse,
)

app = FastAPI(
    title="V-Link AI/ML Intelligence Service",
    description="Python FastAPI service for skill scoring, roadmap generation, job matching, ATS compatibility, mock interviews, and skill verification.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "vlink-ai-ml"}


@app.post("/api/ai/readiness-score", response_model=ReadinessResponse)
def api_readiness_score(payload: ReadinessRequest) -> ReadinessResponse:
    return compute_readiness(payload)


@app.post("/api/ai/roadmap", response_model=RoadmapResponse)
def api_roadmap(payload: RoadmapRequest) -> RoadmapResponse:
    return generate_roadmap(payload)


@app.post("/api/ai/match-jobs", response_model=JobMatchResponse)
def api_match_jobs(payload: JobMatchRequest) -> JobMatchResponse:
    return match_jobs(payload)


@app.post("/api/ai/resume-compatibility", response_model=ResumeCompatibilityResponse)
def api_resume_compatibility(payload: ResumeCompatibilityRequest) -> ResumeCompatibilityResponse:
    return score_resume_compatibility(payload)


@app.post("/api/ai/resume-assist", response_model=ResumeAssistResponse)
def api_resume_assist(payload: ResumeAssistRequest) -> ResumeAssistResponse:
    return assist_resume(payload)


@app.post("/api/ai/mock-interview/start", response_model=MockInterviewStartResponse)
def api_mock_interview_start(payload: MockInterviewStartRequest) -> MockInterviewStartResponse:
    return start_mock_interview(payload)


@app.post("/api/ai/mock-interview/evaluate", response_model=MockInterviewEvaluateResponse)
def api_mock_interview_evaluate(payload: MockInterviewEvaluateRequest) -> MockInterviewEvaluateResponse:
    return evaluate_mock_interview(payload)


@app.post("/api/ai/verify-skill/questions", response_model=VerifySkillQuestionsResponse)
def api_verify_skill_questions(payload: VerifySkillQuestionsRequest) -> VerifySkillQuestionsResponse:
    return get_skill_verification_questions(payload.skill)


@app.post("/api/ai/verify-skill/submit", response_model=VerifySkillSubmitResponse)
def api_verify_skill_submit(payload: VerifySkillSubmitRequest) -> VerifySkillSubmitResponse:
    return submit_skill_verification(payload)


@app.post("/api/ai/recommend-connections", response_model=ConnectionRecommendResponse)
def api_recommend_connections(payload: ConnectionRecommendRequest) -> ConnectionRecommendResponse:
    return recommend_connections(payload)
