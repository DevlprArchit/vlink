from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_readiness_score_diagnostic_tc04():
    payload = {
        "target_role": "Full-Stack Software Engineer",
        "skills": [
            {"name": "TypeScript", "level": 80, "verified": True, "endorsements": 2},
            {"name": "React", "level": 82, "verified": True, "endorsements": 1},
            {"name": "Next.js", "level": 78, "verified": False, "endorsements": 1},
            {"name": "Python", "level": 74, "verified": False, "endorsements": 0},
        ],
        "projects": [
            {
                "title": "V-Link Campus Network",
                "description": "Unified student platform",
                "tech_stack": ["Next.js", "TypeScript", "Python"],
                "repo_url": "https://github.com/example/vlink",
            }
        ],
        "certifications": [
            {"title": "freeCodeCamp Responsive Web Design", "provider": "freeCodeCamp", "completed": True, "progress": 100}
        ],
        "diagnostic_answers": [
            {"question_id": "q1", "skill": "TypeScript", "selected_option": 1, "correct_option": 1, "confidence": 4},
            {"question_id": "q2", "skill": "React", "selected_option": 2, "correct_option": 2, "confidence": 4},
            {"question_id": "q3", "skill": "SQL", "selected_option": 0, "correct_option": 1, "confidence": 2},
        ],
    }
    res = client.post("/api/ai/readiness-score", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert 12 <= data["overall_score"] <= 99
    assert "SQL" in data["missing_core_skills"]
    assert data["dimension_scores"]["Diagnostic"] == 67


def test_roadmap_generation():
    res = client.post(
        "/api/ai/roadmap",
        json={
            "target_role": "AI/ML Engineer",
            "current_skills": ["Python", "SQL"],
            "readiness_score": 52,
            "weekly_hours": 12,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["target_role"] == "AI/ML Engineer"
    assert len(data["milestones"]) == 4
    assert data["estimated_weeks"] >= 3


def test_job_matching_and_resume_compatibility():
    match_res = client.post(
        "/api/ai/match-jobs",
        json={
            "target_role": "Full-Stack Software Engineer",
            "student_skills": [
                {"name": "Next.js", "level": 85, "verified": True, "endorsements": 2},
                {"name": "TypeScript", "level": 82, "verified": True, "endorsements": 1},
            ],
            "readiness_score": 76,
            "projects": [{"title": "Campus Hub", "tech_stack": ["Next.js", "TypeScript", "AWS"]}],
            "jobs": [
                {
                    "id": "job-1",
                    "title": "Full-Stack Software Engineer Intern",
                    "company": "CloudScale",
                    "location": "Remote",
                    "required_skills": ["Next.js", "TypeScript", "AWS"],
                },
                {
                    "id": "job-2",
                    "title": "Embedded Firmware Intern",
                    "company": "SiliconCore",
                    "location": "Bengaluru",
                    "required_skills": ["C", "RTOS", "Embedded Linux"],
                },
            ],
        },
    )
    assert match_res.status_code == 200
    matches = match_res.json()["matches"]
    assert matches[0]["job_id"] == "job-1"
    assert matches[0]["match_score"] > matches[1]["match_score"]

    compat_res = client.post(
        "/api/ai/resume-compatibility",
        json={
            "resume_text": "Built Next.js TypeScript web app serving 500+ students with 40% faster load times.",
            "skills": ["Next.js", "TypeScript", "Python"],
            "projects": [{"title": "V-Link", "tech_stack": ["Next.js", "TypeScript"]}],
            "job_title": "Full-Stack Intern",
            "job_description": "Looking for Next.js, TypeScript, and REST APIs experience.",
            "required_skills": ["Next.js", "TypeScript", "REST APIs"],
        },
    )
    assert compat_res.status_code == 200
    assert compat_res.json()["compatibility_score"] >= 50


def test_mock_interview_and_skill_verification():
    start = client.post(
        "/api/ai/mock-interview/start",
        json={"target_role": "Backend Engineer", "focus_skills": ["Python", "SQL"]},
    )
    assert start.status_code == 200
    q = start.json()["questions"][0]

    eval_res = client.post(
        "/api/ai/mock-interview/evaluate",
        json={
            "target_role": "Backend Engineer",
            "question": q["question"],
            "expected_concepts": q["expected_concepts"],
            "answer": "First I put authentication and an API gateway in front of the service, then add caching and pagination for feed reads with rate limiting.",
        },
    )
    assert eval_res.status_code == 200
    assert eval_res.json()["score"] >= 60

    q_res = client.post("/api/ai/verify-skill/questions", json={"skill": "Python"})
    assert q_res.status_code == 200
    questions = q_res.json()["questions"]
    correct_indices = [item["correct_index"] for item in questions]

    sub_res = client.post(
        "/api/ai/verify-skill/submit",
        json={"skill": "Python", "answers": correct_indices, "correct_indices": correct_indices},
    )
    assert sub_res.status_code == 200
    assert sub_res.json()["passed"] is True
    assert sub_res.json()["verified_badge"] is True
