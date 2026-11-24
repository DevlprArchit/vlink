from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field


class SkillInput(BaseModel):
    name: str
    level: int = Field(default=50, ge=0, le=100)
    verified: bool = False
    endorsements: int = 0


class ProjectInput(BaseModel):
    title: str
    description: str = ""
    tech_stack: List[str] = Field(default_factory=list)
    repo_url: Optional[str] = None
    live_url: Optional[str] = None


class CertificationInput(BaseModel):
    title: str
    provider: str
    completed: bool = False
    progress: int = Field(default=0, ge=0, le=100)


class DiagnosticAnswer(BaseModel):
    question_id: str
    skill: str
    selected_option: int
    correct_option: int
    confidence: int = Field(default=3, ge=1, le=5)


class ReadinessRequest(BaseModel):
    target_role: str = "Full-Stack Software Engineer"
    skills: List[SkillInput] = Field(default_factory=list)
    projects: List[ProjectInput] = Field(default_factory=list)
    certifications: List[CertificationInput] = Field(default_factory=list)
    diagnostic_answers: List[DiagnosticAnswer] = Field(default_factory=list)
    gpa: Optional[float] = None


class SkillBreakdown(BaseModel):
    skill: str
    score: int
    verified: bool
    status: str


class ReadinessResponse(BaseModel):
    overall_score: int
    tier: str
    target_role: str
    dimension_scores: dict[str, int]
    skill_breakdown: List[SkillBreakdown]
    missing_core_skills: List[str]
    recommendations: List[str]


class RoadmapRequest(BaseModel):
    target_role: str
    current_skills: List[str] = Field(default_factory=list)
    readiness_score: int = 50
    weekly_hours: int = 10


class RoadmapMilestone(BaseModel):
    id: str
    phase: str
    title: str
    description: str
    skills_covered: List[str]
    estimated_hours: int
    resources: List[dict[str, str]]
    deliverable: str
    completed: bool = False


class RoadmapResponse(BaseModel):
    target_role: str
    estimated_weeks: int
    milestones: List[RoadmapMilestone]


class JobPostingInput(BaseModel):
    id: str
    title: str
    company: str
    location: str
    role_type: str = "Full-Time"
    required_skills: List[str] = Field(default_factory=list)
    description: str = ""


class JobMatchRequest(BaseModel):
    target_role: str
    student_skills: List[SkillInput] = Field(default_factory=list)
    readiness_score: int = 60
    projects: List[ProjectInput] = Field(default_factory=list)
    jobs: List[JobPostingInput] = Field(default_factory=list)


class JobMatchResult(BaseModel):
    job_id: str
    match_score: int
    matched_skills: List[str]
    missing_skills: List[str]
    readiness_fit: str
    rationale: str


class JobMatchResponse(BaseModel):
    matches: List[JobMatchResult]


class ResumeCompatibilityRequest(BaseModel):
    resume_text: str
    skills: List[str] = Field(default_factory=list)
    projects: List[ProjectInput] = Field(default_factory=list)
    job_title: str
    job_description: str
    required_skills: List[str] = Field(default_factory=list)


class ResumeCompatibilityResponse(BaseModel):
    compatibility_score: int
    ats_keyword_coverage: int
    matched_keywords: List[str]
    missing_keywords: List[str]
    strengths: List[str]
    improvement_suggestions: List[str]


class ResumeAssistRequest(BaseModel):
    name: str
    target_role: str
    headline: str = ""
    skills: List[str] = Field(default_factory=list)
    projects: List[ProjectInput] = Field(default_factory=list)
    education: str = ""


class ResumeAssistResponse(BaseModel):
    ats_score: int
    professional_summary: str
    enhanced_project_bullets: List[dict[str, object]]
    ats_checklist: List[dict[str, object]]


class MockInterviewStartRequest(BaseModel):
    target_role: str
    difficulty: str = "Intermediate"
    focus_skills: List[str] = Field(default_factory=list)


class InterviewQuestion(BaseModel):
    id: str
    question: str
    category: str
    expected_concepts: List[str]


class MockInterviewStartResponse(BaseModel):
    session_id: str
    target_role: str
    questions: List[InterviewQuestion]


class MockInterviewEvaluateRequest(BaseModel):
    target_role: str
    question: str
    expected_concepts: List[str] = Field(default_factory=list)
    answer: str


class MockInterviewEvaluateResponse(BaseModel):
    score: int
    clarity_score: int
    technical_accuracy: int
    concepts_covered: List[str]
    concepts_missed: List[str]
    feedback: str
    sample_strong_answer: str


class VerifySkillQuestionsRequest(BaseModel):
    skill: str


class VerificationQuestion(BaseModel):
    id: str
    prompt: str
    code_snippet: Optional[str] = None
    options: List[str]
    correct_index: int
    explanation: str


class VerifySkillQuestionsResponse(BaseModel):
    skill: str
    questions: List[VerificationQuestion]


class VerifySkillSubmitRequest(BaseModel):
    skill: str
    answers: List[int]
    correct_indices: List[int]


class VerifySkillSubmitResponse(BaseModel):
    skill: str
    passed: bool
    score_percent: int
    verified_badge: bool
    message: str


class PeerCandidate(BaseModel):
    id: str
    name: str
    skills: List[str] = Field(default_factory=list)
    interests: List[str] = Field(default_factory=list)
    campus: str = ""


class ConnectionRecommendRequest(BaseModel):
    user_skills: List[str] = Field(default_factory=list)
    user_interests: List[str] = Field(default_factory=list)
    user_campus: str = ""
    candidates: List[PeerCandidate] = Field(default_factory=list)


class ConnectionRecommendation(BaseModel):
    user_id: str
    similarity_score: int
    shared_skills: List[str]
    shared_interests: List[str]
    reason: str


class ConnectionRecommendResponse(BaseModel):
    recommendations: List[ConnectionRecommendation]
