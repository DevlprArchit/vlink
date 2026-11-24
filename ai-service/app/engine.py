from __future__ import annotations

import math
import re
import uuid
from typing import Dict, List, Set

from .models import (
    ConnectionRecommendation,
    ConnectionRecommendRequest,
    ConnectionRecommendResponse,
    InterviewQuestion,
    JobMatchRequest,
    JobMatchResponse,
    JobMatchResult,
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
    RoadmapMilestone,
    RoadmapRequest,
    RoadmapResponse,
    SkillBreakdown,
    VerificationQuestion,
    VerifySkillQuestionsResponse,
    VerifySkillSubmitRequest,
    VerifySkillSubmitResponse,
)

ROLE_CORE_SKILLS: Dict[str, List[str]] = {
    "Full-Stack Software Engineer": [
        "TypeScript",
        "React",
        "Next.js",
        "Node.js",
        "Python",
        "SQL",
        "REST APIs",
        "Git",
        "Docker",
        "Testing",
    ],
    "AI/ML Engineer": [
        "Python",
        "Machine Learning",
        "PyTorch",
        "FastAPI",
        "SQL",
        "Data Structures",
        "NLP",
        "Docker",
        "Git",
        "Statistics",
    ],
    "Cloud & DevOps Engineer": [
        "AWS",
        "Docker",
        "Kubernetes",
        "Linux",
        "CI/CD",
        "Terraform",
        "Python",
        "Networking",
        "Git",
        "Monitoring",
    ],
    "Backend Engineer": [
        "Python",
        "Node.js",
        "SQL",
        "PostgreSQL",
        "REST APIs",
        "GraphQL",
        "Redis",
        "Docker",
        "System Design",
        "Testing",
    ],
    "Frontend Engineer": [
        "TypeScript",
        "React",
        "Next.js",
        "HTML",
        "CSS",
        "Tailwind CSS",
        "Accessibility",
        "Testing",
        "Git",
        "Performance",
    ],
    "Data Engineer": [
        "Python",
        "SQL",
        "Spark",
        "Airflow",
        "ETL",
        "AWS",
        "Data Modeling",
        "Docker",
        "Git",
        "Statistics",
    ],
}

SKILL_VERIFICATION_BANK: Dict[str, List[dict]] = {
    "TypeScript": [
        {
            "id": "ts-1",
            "prompt": "What is the primary advantage of TypeScript discriminated unions in API response modeling?",
            "code_snippet": "type ApiRes = { ok: true; data: string } | { ok: false; error: string };",
            "options": [
                "They allow runtime memory compression in V8",
                "They enable exhaustive compile-time narrowing via a literal tag property",
                "They automatically serialize JSON over HTTP",
                "They bypass strictNullChecks during compilation",
            ],
            "correct_index": 1,
            "explanation": "Checking `res.ok` narrows the union type safely at compile time.",
        },
        {
            "id": "ts-2",
            "prompt": "Which utility type constructs a type with all properties of T set to optional?",
            "code_snippet": None,
            "options": ["Required<T>", "Readonly<T>", "Partial<T>", "Pick<T, K>"],
            "correct_index": 2,
            "explanation": "`Partial<T>` marks every property in `T` as optional.",
        },
        {
            "id": "ts-3",
            "prompt": "Why is `unknown` preferred over `any` for untrusted external payloads?",
            "code_snippet": None,
            "options": [
                "`unknown` forces type narrowing or validation before property access",
                "`unknown` skips type checking altogether",
                "`unknown` converts strings to numbers automatically",
                "`unknown` is only valid in `.js` files",
            ],
            "correct_index": 0,
            "explanation": "`unknown` preserves type safety by requiring runtime checks before use.",
        },
    ],
    "Python": [
        {
            "id": "py-1",
            "prompt": "What is the output of `[x * x for x in range(4) if x % 2 == 1]`?",
            "code_snippet": "result = [x * x for x in range(4) if x % 2 == 1]",
            "options": ["[0, 4]", "[1, 9]", "[1, 4, 9]", "[0, 1, 4, 9]"],
            "correct_index": 1,
            "explanation": "Odd integers in `range(4)` are `1` and `3`, whose squares are `1` and `9`.",
        },
        {
            "id": "py-2",
            "prompt": "In FastAPI, what role does Pydantic `BaseModel` play in endpoint definitions?",
            "code_snippet": None,
            "options": [
                "It compiles Python into WebAssembly",
                "It validates, parses, and documents request/response schemas automatically",
                "It replaces uvicorn as the ASGI server",
                "It manages DynamoDB connection pooling",
            ],
            "correct_index": 1,
            "explanation": "FastAPI uses Pydantic models for runtime validation, serialization, and OpenAPI schema generation.",
        },
        {
            "id": "py-3",
            "prompt": "What is the average time complexity of membership lookup `k in my_dict` in Python?",
            "code_snippet": None,
            "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
            "correct_index": 0,
            "explanation": "Python dictionaries are hash tables with O(1) average lookup.",
        },
    ],
    "React": [
        {
            "id": "re-1",
            "prompt": "Why should list items in React JSX use stable unique `key` props instead of array indices when items can reorder?",
            "code_snippet": "{items.map(item => <Row key={item.id} item={item} />)}",
            "options": [
                "Array indices cause syntax errors in Next.js",
                "Stable keys preserve component state and prevent incorrect DOM reconciliation on reorder",
                "Keys encrypt props between parent and child",
                "Keys automatically memoize all CSS styles",
            ],
            "correct_index": 1,
            "explanation": "React matches elements across renders using `key` during reconciliation.",
        },
        {
            "id": "re-2",
            "prompt": "When does a `useEffect` hook with an empty dependency array `[]` execute?",
            "code_snippet": None,
            "options": [
                "Before every single render",
                "Only once after the initial mount (and cleanup on unmount)",
                "Whenever any parent state changes",
                "Only on server-side rendering",
            ],
            "correct_index": 1,
            "explanation": "An empty dependency array tells React the effect has no reactive dependencies.",
        },
        {
            "id": "re-3",
            "prompt": "Which Next.js App Router directive marks a module as a Client Component?",
            "code_snippet": None,
            "options": ["'use server'", "'use client'", "'use browser'", "'client only'"],
            "correct_index": 1,
            "explanation": "`'use client'` at the top of a file marks the client boundary.",
        },
    ],
    "AWS": [
        {
            "id": "aws-1",
            "prompt": "Which AWS service provides managed GraphQL APIs with real-time WebSocket subscriptions?",
            "code_snippet": None,
            "options": ["Amazon S3", "AWS AppSync", "Amazon CloudFront", "AWS IAM"],
            "correct_index": 1,
            "explanation": "AWS AppSync is a managed GraphQL service supporting real-time subscriptions.",
        },
        {
            "id": "aws-2",
            "prompt": "In V-Link's serverless architecture, which service handles user sign-up, JWT authentication, and campus verification?",
            "code_snippet": None,
            "options": ["Amazon Cognito", "Amazon DynamoDB", "Amazon S3", "Amazon SageMaker"],
            "correct_index": 0,
            "explanation": "Amazon Cognito provides managed authentication, user pools, and JWT tokens.",
        },
        {
            "id": "aws-3",
            "prompt": "Why does CloudFront sit in front of S3 media assets?",
            "code_snippet": None,
            "options": [
                "To train PyTorch models",
                "To cache static assets at edge locations for low-latency global delivery",
                "To replace DynamoDB primary keys",
                "To compile TypeScript into JavaScript",
            ],
            "correct_index": 1,
            "explanation": "Amazon CloudFront is a CDN that caches S3 objects close to users.",
        },
    ],
}


def _norm(text: str) -> str:
    return re.sub(r"[^a-z0-9+#.]", "", text.lower().strip())


def _resolve_role_skills(target_role: str) -> List[str]:
    if target_role in ROLE_CORE_SKILLS:
        return ROLE_CORE_SKILLS[target_role]
    lowered = target_role.lower()
    for role, skills in ROLE_CORE_SKILLS.items():
        if any(word in lowered for word in role.lower().split() if len(word) > 3):
            return skills
    return ROLE_CORE_SKILLS["Full-Stack Software Engineer"]


def compute_readiness(req: ReadinessRequest) -> ReadinessResponse:
    core_skills = _resolve_role_skills(req.target_role)
    core_norm = {_norm(s): s for s in core_skills}

    student_map = {_norm(s.name): s for s in req.skills}
    breakdown: List[SkillBreakdown] = []

    matched_core = 0
    verified_bonus_total = 0.0
    skill_score_sum = 0.0

    for core_key, core_label in core_norm.items():
        if core_key in student_map:
            sk = student_map[core_key]
            matched_core += 1
            verified_boost = 12 if sk.verified else 0
            endorsement_boost = min(8, sk.endorsements * 2)
            effective = min(100, sk.level + verified_boost + endorsement_boost)
            skill_score_sum += effective
            if sk.verified:
                verified_bonus_total += 1
            status = "Verified" if sk.verified else ("Strong" if effective >= 75 else "Developing")
            breakdown.append(
                SkillBreakdown(skill=core_label, score=int(effective), verified=sk.verified, status=status)
            )
        else:
            breakdown.append(SkillBreakdown(skill=core_label, score=0, verified=False, status="Missing"))

    # Diagnostic accuracy score (0-100)
    if req.diagnostic_answers:
        correct = sum(1 for a in req.diagnostic_answers if a.selected_option == a.correct_option)
        diag_score = round((correct / len(req.diagnostic_answers)) * 100)
    else:
        diag_score = round((skill_score_sum / max(1, len(core_skills))) * 0.85)

    core_coverage_score = round((matched_core / max(1, len(core_skills))) * 100)
    proficiency_score = round(skill_score_sum / max(1, len(core_skills)))

    # Project portfolio score: reward projects that use role skills & live/repo links
    project_points = 0
    for proj in req.projects[:5]:
        proj_base = 16
        stack_overlap = sum(1 for t in proj.tech_stack if _norm(t) in core_norm)
        proj_base += min(10, stack_overlap * 3)
        if proj.repo_url:
            proj_base += 4
        if proj.live_url:
            proj_base += 4
        project_points += proj_base
    portfolio_score = min(100, project_points)

    # Certifications score
    completed_certs = sum(1 for c in req.certifications if c.completed or c.progress >= 100)
    in_progress_certs = sum(1 for c in req.certifications if not c.completed and c.progress > 0)
    cert_score = min(100, completed_certs * 30 + in_progress_certs * 12)

    # Verification score
    total_student_skills = max(1, len(req.skills))
    verified_count = sum(1 for s in req.skills if s.verified)
    verification_score = min(100, round((verified_count / max(3, min(6, total_student_skills))) * 100))

    overall = round(
        0.30 * proficiency_score
        + 0.22 * diag_score
        + 0.22 * portfolio_score
        + 0.14 * cert_score
        + 0.12 * verification_score
    )
    overall = max(12, min(99, overall))

    if overall >= 85:
        tier = "Interview Ready"
    elif overall >= 70:
        tier = "Strong Contender"
    elif overall >= 50:
        tier = "Building Momentum"
    else:
        tier = "Foundation Stage"

    missing = [b.skill for b in breakdown if b.score == 0]
    unverified = [b.skill for b in breakdown if b.score > 0 and not b.verified]

    recommendations: List[str] = []
    if missing:
        recommendations.append(
            f"Close core skill gaps for {req.target_role}: prioritize {', '.join(missing[:3])}."
        )
    if unverified:
        recommendations.append(
            f"Verify claimed skills with a V-Link quiz badge: {', '.join(unverified[:2])}."
        )
    if len(req.projects) < 2:
        recommendations.append(
            "Publish at least 2 end-to-end projects with GitHub repository links in your portfolio."
        )
    if completed_certs == 0:
        recommendations.append(
            "Complete at least 1 free verified certification from the Certifications Hub."
        )
    if not recommendations:
        recommendations.append(
            "Your profile shows balanced readiness; start practicing role-specific AI mock interviews."
        )

    return ReadinessResponse(
        overall_score=overall,
        tier=tier,
        target_role=req.target_role,
        dimension_scores={
            "Core Skills": proficiency_score,
            "Diagnostic": diag_score,
            "Projects": portfolio_score,
            "Certifications": cert_score,
            "Verification": verification_score,
            "Coverage": core_coverage_score,
        },
        skill_breakdown=breakdown,
        missing_core_skills=missing,
        recommendations=recommendations,
    )


def generate_roadmap(req: RoadmapRequest) -> RoadmapResponse:
    core_skills = _resolve_role_skills(req.target_role)
    have_norm = {_norm(s) for s in req.current_skills}
    missing = [s for s in core_skills if _norm(s) not in have_norm]
    reinforce = [s for s in core_skills if _norm(s) in have_norm]

    focus_1 = missing[:3] if len(missing) >= 2 else core_skills[:3]
    focus_2 = missing[3:6] if len(missing) > 3 else (reinforce[:3] or core_skills[3:6])
    focus_3 = core_skills[6:9]

    milestones = [
        RoadmapMilestone(
            id="ms-1",
            phase="Phase 1 · Foundations & Core Syntax",
            title=f"Master {', '.join(focus_1[:2])} Core Patterns",
            description=f"Build fluency in {', '.join(focus_1)} and validate core concepts via V-Link skill quizzes.",
            skills_covered=focus_1,
            estimated_hours=18,
            resources=[
                {"title": "freeCodeCamp Responsive & JS/Python Track", "url": "https://www.freecodecamp.org/"},
                {"title": "Official Documentation Deep-Dive", "url": "https://nextjs.org/docs"},
            ],
            deliverable="Complete 2 verified skill assessments and push 1 starter repo.",
            completed=req.readiness_score >= 78,
        ),
        RoadmapMilestone(
            id="ms-2",
            phase="Phase 2 · Full-Stack & Architecture",
            title=f"Build Production APIs & Integration ({', '.join(focus_2[:2])})",
            description=f"Design modular services using {', '.join(focus_2)} with persistent storage and automated tests.",
            skills_covered=focus_2,
            estimated_hours=24,
            resources=[
                {"title": "AWS Skill Builder Serverless Path", "url": "https://explore.skillbuilder.aws/"},
                {"title": "FastAPI & Modern Backend Guide", "url": "https://fastapi.tiangolo.com/"},
            ],
            deliverable="Deploy a working full-stack project with unit tests to your V-Link showcase.",
            completed=False,
        ),
        RoadmapMilestone(
            id="ms-3",
            phase="Phase 3 · Cloud, Testing & Verification",
            title=f"Production Readiness ({', '.join(focus_3[:2] or ['Docker', 'Testing'])})",
            description="Containerize services, configure CI checks, and earn at least one free recognized certificate.",
            skills_covered=focus_3 or ["Docker", "Git", "Testing"],
            estimated_hours=16,
            resources=[
                {"title": "AWS Cloud Quest / Cloud Practitioner Essentials", "url": "https://aws.amazon.com/training/"},
            ],
            deliverable="Attach verified certification and pass 80%+ on V-Link diagnostic.",
            completed=False,
        ),
        RoadmapMilestone(
            id="ms-4",
            phase="Phase 4 · ATS Resume & Interview Sprint",
            title=f"{req.target_role} Interview & Application Sprint",
            description="Generate an ATS-ready resume from your V-Link profile, benchmark against 3 target JDs, and complete 2 AI mock interviews.",
            skills_covered=["System Design", "ATS Resume", "Behavioral & Technical Interviewing"],
            estimated_hours=12,
            resources=[
                {"title": "V-Link AI Mock Interview Studio", "url": "/readiness?tab=interview"},
                {"title": "V-Link ATS Resume Builder", "url": "/resume"},
            ],
            deliverable="Apply to top matched roles with >=75% JD compatibility.",
            completed=False,
        ),
    ]

    total_hours = sum(m.estimated_hours for m in milestones)
    weeks = max(3, math.ceil(total_hours / max(4, req.weekly_hours)))
    return RoadmapResponse(target_role=req.target_role, estimated_weeks=weeks, milestones=milestones)


def match_jobs(req: JobMatchRequest) -> JobMatchResponse:
    student_skill_map = {_norm(s.name): s for s in req.student_skills}
    project_tech: Set[str] = {_norm(t) for p in req.projects for t in p.tech_stack}

    results: List[JobMatchResult] = []
    for job in req.jobs:
        req_skills = job.required_skills or _resolve_role_skills(job.title)[:5]
        matched: List[str] = []
        missing: List[str] = []
        weighted_hits = 0.0

        for sk in req_skills:
            key = _norm(sk)
            if key in student_skill_map:
                matched.append(sk)
                st = student_skill_map[key]
                bonus = 1.15 if st.verified else 1.0
                weighted_hits += min(1.2, (st.level / 100.0) * bonus + (0.1 if key in project_tech else 0.0))
            elif key in project_tech:
                matched.append(sk)
                weighted_hits += 0.75
            else:
                missing.append(sk)

        skill_ratio = weighted_hits / max(1, len(req_skills))
        role_bonus = 0.12 if _norm(req.target_role) in _norm(job.title) or _norm(job.title) in _norm(req.target_role) else 0.0
        readiness_factor = (req.readiness_score / 100.0) * 0.25
        raw_score = round(min(98, max(22, (skill_ratio * 0.65 + readiness_factor + role_bonus) * 100)))

        if raw_score >= 80:
            fit = "High Readiness Fit"
        elif raw_score >= 60:
            fit = "Strong Partial Fit"
        else:
            fit = "Growth Opportunity"

        rationale = (
            f"Matches {len(matched)}/{len(req_skills)} required skills"
            + (f" ({', '.join(matched[:3])})" if matched else "")
            + (f"; upskill in {', '.join(missing[:2])} for higher readiness." if missing else "; ready to apply now.")
        )

        results.append(
            JobMatchResult(
                job_id=job.id,
                match_score=raw_score,
                matched_skills=matched,
                missing_skills=missing,
                readiness_fit=fit,
                rationale=rationale,
            )
        )

    results.sort(key=lambda r: r.match_score, reverse=True)
    return JobMatchResponse(matches=results)


def score_resume_compatibility(req: ResumeCompatibilityRequest) -> ResumeCompatibilityResponse:
    resume_lower = req.resume_text.lower()
    skill_set = {_norm(s) for s in req.skills}
    for p in req.projects:
        for t in p.tech_stack:
            skill_set.add(_norm(t))

    jd_tokens = set(re.findall(r"[a-zA-Z0-9+#.]{3,}", req.job_description.lower()))
    stop = {"and", "the", "with", "for", "that", "this", "from", "you", "will", "are", "have", "our", "work"}
    jd_keywords = [w for w in jd_tokens if w not in stop]

    candidate_terms = list(dict.fromkeys(req.required_skills + jd_keywords[:18]))
    matched: List[str] = []
    missing: List[str] = []

    for term in candidate_terms:
        t_norm = _norm(term)
        if not t_norm:
            continue
        if term.lower() in resume_lower or t_norm in skill_set:
            if term not in matched:
                matched.append(term)
        else:
            if term not in missing and len(term) > 2:
                missing.append(term)

    req_norm_count = max(1, len(req.required_skills))
    req_matched = sum(1 for r in req.required_skills if r.lower() in resume_lower or _norm(r) in skill_set)
    keyword_coverage = round((len(matched) / max(1, len(matched) + len(missing))) * 100)
    req_coverage = round((req_matched / req_norm_count) * 100)

    has_metrics = bool(re.search(r"\b\d+%|\b\d+x|\b\d+\s*(users|ms|requests|projects)", resume_lower))
    structure_bonus = 10 if len(req.projects) >= 2 else 4
    metrics_bonus = 8 if has_metrics else 0

    compatibility = min(98, max(25, round(0.55 * req_coverage + 0.30 * keyword_coverage + structure_bonus + metrics_bonus)))

    strengths: List[str] = []
    if req_matched > 0:
        strengths.append(f"Covers {req_matched}/{req_norm_count} core required skills for {req.job_title}.")
    if len(req.projects) >= 2:
        strengths.append("Demonstrates applied project evidence synced directly from V-Link portfolio.")
    if has_metrics:
        strengths.append("Includes quantifiable impact metrics valued by ATS screeners.")
    if not strengths:
        strengths.append("Baseline profile structure present; tailor technical keywords to the job description.")

    suggestions: List[str] = []
    if missing:
        suggestions.append(f"Incorporate relevant keywords naturally if applicable: {', '.join(missing[:4])}.")
    if not has_metrics:
        suggestions.append("Add measurable impact numbers (e.g. latency reduced by 35%, 500+ active users).")
    suggestions.append("Keep bullet points action-verb led (Engineered, Designed, Deployed, Automated).")

    return ResumeCompatibilityResponse(
        compatibility_score=compatibility,
        ats_keyword_coverage=keyword_coverage,
        matched_keywords=matched[:12],
        missing_keywords=missing[:8],
        strengths=strengths,
        improvement_suggestions=suggestions,
    )


def assist_resume(req: ResumeAssistRequest) -> ResumeAssistResponse:
    top_skills = ", ".join(req.skills[:6]) if req.skills else "full-stack engineering and cloud systems"
    summary = (
        f"Results-driven Computer Science student targeting {req.target_role} roles with hands-on "
        f"experience in {top_skills}. Proven builder of {len(req.projects)} documented software projects "
        f"combining clean architecture, automated testing, and measurable user impact."
    )

    enhanced_projects = []
    for proj in req.projects:
        stack_str = ", ".join(proj.tech_stack[:5]) if proj.tech_stack else "modern web technologies"
        bullets = [
            f"Architected and shipped {proj.title} using {stack_str}, translating requirements into a modular, maintainable application.",
            f"Implemented core workflows and responsive UI components with verified data validation and structured error handling.",
        ]
        if proj.repo_url:
            bullets.append(f"Maintained version-controlled codebase with clean documentation ({proj.repo_url}).")
        enhanced_projects.append({"title": proj.title, "bullets": bullets})

    checklist = [
        {"label": "Single-column ATS-safe layout (no tables/text-boxes)", "passed": True},
        {"label": "Target role headline & concise professional summary", "passed": bool(req.target_role)},
        {"label": "Core technical skills grouped cleanly", "passed": len(req.skills) >= 4},
        {"label": "At least 2 projects with tech stack & links", "passed": len(req.projects) >= 2},
        {"label": "Education & campus credentials populated", "passed": bool(req.education)},
    ]
    passed_count = sum(1 for item in checklist if item["passed"])
    ats_score = min(98, 48 + passed_count * 10)

    return ResumeAssistResponse(
        ats_score=ats_score,
        professional_summary=summary,
        enhanced_project_bullets=enhanced_projects,
        ats_checklist=checklist,
    )


def start_mock_interview(req: MockInterviewStartRequest) -> MockInterviewStartResponse:
    skills_str = ", ".join(req.focus_skills[:3]) if req.focus_skills else "your primary stack"
    questions = [
        InterviewQuestion(
            id="iq-1",
            category="Architecture & System Design",
            question=f"For a {req.target_role} role, how would you design a scalable feed and real-time messaging pipeline without letting the frontend talk directly to the database?",
            expected_concepts=["API gateway", "authentication", "caching", "pagination", "subscriptions", "rate limiting"],
        ),
        InterviewQuestion(
            id="iq-2",
            category="Technical Deep-Dive",
            question=f"Explain how you used {skills_str} in one of your projects, including one performance bottleneck or bug you resolved.",
            expected_concepts=["trade-offs", "profiling", "indexing", "state management", "testing", "latency"],
        ),
        InterviewQuestion(
            id="iq-3",
            category="Problem Solving & Reliability",
            question="How do you ensure data consistency, input validation, and graceful degradation when a downstream microservice or AI service is slow?",
            expected_concepts=["timeouts", "retries", "fallback", "validation", "idempotency", "circuit breaker"],
        ),
    ]
    return MockInterviewStartResponse(
        session_id=f"mock-{uuid.uuid4().hex[:8]}",
        target_role=req.target_role,
        questions=questions,
    )


def evaluate_mock_interview(req: MockInterviewEvaluateRequest) -> MockInterviewEvaluateResponse:
    ans_lower = req.answer.lower()
    words = req.answer.split()

    covered = [c for c in req.expected_concepts if any(tok in ans_lower for tok in c.lower().split())]
    missed = [c for c in req.expected_concepts if c not in covered]

    concept_ratio = len(covered) / max(1, len(req.expected_concepts))
    depth_score = min(1.0, len(words) / 55.0)
    structure_markers = sum(1 for m in ["first", "second", "because", "therefore", "for example", "trade-off", "latency", "cache"] if m in ans_lower)
    clarity = min(96, round(45 + depth_score * 35 + min(3, structure_markers) * 6))
    tech_acc = min(97, round(35 + concept_ratio * 55 + (8 if len(words) > 35 else 0)))
    overall = round(0.55 * tech_acc + 0.45 * clarity)

    feedback = (
        f"Strong explanation covering {len(covered)}/{max(1, len(req.expected_concepts))} key concepts. "
        if concept_ratio >= 0.5
        else "Good start, but the answer needs deeper architectural specifics and trade-off analysis. "
    ) + (
        f"Consider explicitly addressing: {', '.join(missed[:3])}."
        if missed
        else "Well-structured response with solid technical coverage."
    )

    sample = (
        "In a layered architecture, I route all client requests through an authenticated API layer (e.g. AppSync/Lambda or REST) "
        "with strict input validation and JWT verification, apply pagination and caching for feed reads, and isolate AI/ML calls "
        "behind timeouts and deterministic fallbacks so the core UX degrades gracefully."
    )

    return MockInterviewEvaluateResponse(
        score=overall,
        clarity_score=clarity,
        technical_accuracy=tech_acc,
        concepts_covered=covered,
        concepts_missed=missed,
        feedback=feedback,
        sample_strong_answer=sample,
    )


def get_skill_verification_questions(skill: str) -> VerifySkillQuestionsResponse:
    for known_skill, qs in SKILL_VERIFICATION_BANK.items():
        if _norm(known_skill) == _norm(skill):
            return VerifySkillQuestionsResponse(
                skill=known_skill,
                questions=[VerificationQuestion(**q) for q in qs],
            )

    # Generic engineering verification fallback for any custom skill
    generic_qs = [
        VerificationQuestion(
            id=f"{_norm(skill)}-1",
            prompt=f"Which practice best demonstrates production readiness when using {skill} in a student project?",
            code_snippet=None,
            options=[
                "Hardcoding credentials directly in source files",
                "Writing automated tests, handling edge cases, and documenting setup clearly",
                "Skipping version control until final submission",
                "Allowing unvalidated user input straight into storage",
            ],
            correct_index=1,
            explanation="Automated tests, validation, and reproducible documentation verify engineering rigor.",
        ),
        VerificationQuestion(
            id=f"{_norm(skill)}-2",
            prompt=f"When debugging an unexpected failure in a {skill} module, what is the most reliable first step?",
            code_snippet=None,
            options=[
                "Delete the database and restart",
                "Reproduce the failure minimally and inspect logs/stack traces",
                "Disable error handling in production",
                "Rename variables randomly",
            ],
            correct_index=1,
            explanation="Minimal reproduction paired with log/trace inspection isolates root causes rapidly.",
        ),
        VerificationQuestion(
            id=f"{_norm(skill)}-3",
            prompt=f"How should a {skill} component communicate with an external AI or data service?",
            code_snippet=None,
            options=[
                "Through explicit typed contracts, timeouts, and graceful fallback handling",
                "By exposing internal database credentials to the browser",
                "Without any error handling or status checks",
                "Using infinite blocking loops on the UI thread",
            ],
            correct_index=0,
            explanation="Typed contracts and resilient timeout/fallback handling keep systems reliable.",
        ),
    ]
    return VerifySkillQuestionsResponse(skill=skill, questions=generic_qs)


def submit_skill_verification(req: VerifySkillSubmitRequest) -> VerifySkillSubmitResponse:
    total = max(1, len(req.correct_indices))
    correct = sum(
        1 for a, c in zip(req.answers, req.correct_indices) if a == c
    )
    pct = round((correct / total) * 100)
    passed = pct >= 66
    return VerifySkillSubmitResponse(
        skill=req.skill,
        passed=passed,
        score_percent=pct,
        verified_badge=passed,
        message=(
            f"Verified! You scored {pct}% on the {req.skill} assessment and earned a verified skill badge."
            if passed
            else f"You scored {pct}% on {req.skill}. Score at least 67% to unlock the verified skill badge."
        ),
    )


def recommend_connections(req: ConnectionRecommendRequest) -> ConnectionRecommendResponse:
    u_skills = {_norm(s): s for s in req.user_skills}
    u_interests = {_norm(i): i for i in req.user_interests}

    recs: List[ConnectionRecommendation] = []
    for cand in req.candidates:
        c_skills = {_norm(s): s for s in cand.skills}
        c_interests = {_norm(i): i for i in cand.interests}

        shared_sk = [u_skills[k] for k in u_skills.keys() & c_skills.keys()]
        shared_int = [u_interests[k] for k in u_interests.keys() & c_interests.keys()]
        same_campus = bool(req.user_campus and cand.campus and req.user_campus.lower() == cand.campus.lower())

        union_sk = len(u_skills.keys() | c_skills.keys()) or 1
        union_int = len(u_interests.keys() | c_interests.keys()) or 1
        sim = round(
            min(
                99,
                (len(shared_sk) / union_sk) * 60
                + (len(shared_int) / union_int) * 28
                + (12 if same_campus else 0),
            )
        )

        reasons: List[str] = []
        if shared_sk:
            reasons.append(f"Shared skills: {', '.join(shared_sk[:3])}")
        if shared_int:
            reasons.append(f"Common interests: {', '.join(shared_int[:2])}")
        if same_campus:
            reasons.append(f"Same campus ({cand.campus})")
        if not reasons:
            reasons.append("Recommended peer builder on V-Link")

        recs.append(
            ConnectionRecommendation(
                user_id=cand.id,
                similarity_score=max(18, sim),
                shared_skills=shared_sk,
                shared_interests=shared_int,
                reason=" · ".join(reasons),
            )
        )

    recs.sort(key=lambda r: r.similarity_score, reverse=True)
    return ConnectionRecommendResponse(recommendations=recs)
