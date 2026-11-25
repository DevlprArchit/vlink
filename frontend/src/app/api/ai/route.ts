import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { callAiService } from "@/lib/ai-client";
import {
  analyzeResumeAts,
  callCloudLLM,
  CopilotContext,
  CopilotTurn,
  generateCopilotReply,
  generateResumeContinuation,
} from "@/lib/llm";
import { createNotification, readDb, toPublicProfile, writeDb } from "@/lib/store";

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  const db = readDb();
  const user = userId ? db.users.find((u) => u.id === userId) : undefined;
  const geminiApiKey = req.headers.get("x-gemini-api-key") || undefined;

  let body: {
    task?:
      | "resume-assist"
      | "resume-compatibility"
      | "resume-polish"
      | "resume-suggest-continuation"
      | "resume-ats-analyze"
      | "copilot-chat"
      | "mock-interview-start"
      | "mock-interview-evaluate"
      | "verify-skill-questions"
      | "verify-skill-submit";
    payload?: Record<string, unknown>;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid or empty JSON body" }, { status: 400 });
  }

  // ── 1. Copilot Real AI Conversational Engine ──
  if (body.task === "copilot-chat") {
    const p = body.payload || {};
    const message = String(p.message || "");
    if (!message.trim()) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }
    const history = Array.isArray(p.history) ? (p.history as CopilotTurn[]) : [];
    const reqContext = (p.context as CopilotContext) || {};
    const context: CopilotContext = {
      userName: reqContext.userName || user?.name,
      targetRole: reqContext.targetRole || user?.targetRole,
      readinessScore:
        typeof reqContext.readinessScore === "number" ? reqContext.readinessScore : user?.readinessScore,
      skills: user?.skills.map((s) => s.name) || reqContext.skills || [],
      campus: user?.campus || reqContext.campus,
    };

    const { reply, provider } = await generateCopilotReply({
      message,
      history,
      context,
      geminiApiKey,
    });

    return NextResponse.json({
      success: true,
      data: {
        reply,
        provider,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // ── 1b. Resume Auto-Suggest Continuation ("Want to write more?") ──
  if (body.task === "resume-suggest-continuation") {
    const p = body.payload || {};
    const result = await generateResumeContinuation({
      fieldType: (p.fieldType as "summary" | "project-desc" | "bullet") || "summary",
      currentText: String(p.currentText || ""),
      targetRole: String(p.targetRole || user?.targetRole || "Software Engineer"),
      skills: String(p.skills || user?.skills.map((s) => s.name).join(", ") || ""),
      projectTitle: String(p.projectTitle || ""),
      geminiApiKey,
    });
    return NextResponse.json({ success: true, data: result });
  }

  // ── 1c. Live AI ATS Resume Audit & Scorer ──
  if (body.task === "resume-ats-analyze") {
    const p = body.payload || {};
    const audit = await analyzeResumeAts({
      fullName: String(p.fullName || user?.name || ""),
      targetRole: String(p.targetRole || user?.targetRole || "Software Engineer"),
      summary: String(p.summary || ""),
      skills: String(p.skills || ""),
      projects: Array.isArray(p.projects)
        ? (p.projects as Array<{ title: string; techStack: string; description: string; bullets: string[] }>)
        : [],
      education: String(p.education || ""),
      certifications: String(p.certifications || ""),
      jobDescription: String(p.jobDescription || ""),
      geminiApiKey,
    });
    return NextResponse.json({ success: true, data: audit });
  }

  // ── 2. AI Resume Polish & Optimization ──
  if (body.task === "resume-polish") {
    const p = body.payload || {};
    const summary = String(p.summary || "");
    const skills = String(p.skills || "");
    const targetRole = String(p.targetRole || user?.targetRole || "Software Engineer");
    const projects = Array.isArray(p.projects)
      ? (p.projects as Array<{ title: string; techStack?: string; bullets?: string[] }>)
      : [];

    const cloud = await callCloudLLM({
      geminiApiKey,
      expectJson: true,
      systemPrompt: `You are an expert ATS Resume Writer. Return strict JSON with keys: "polishedSummary" (string, 2-3 punchy ATS-ready sentences) and "polishedBullets" (array of 3 strong Google XYZ bullet strings tailored to their skills/projects).`,
      userPrompt: JSON.stringify({ targetRole, summary, skills, projects }),
    });

    if (cloud) {
      try {
        const parsed = JSON.parse(cloud.text) as { polishedSummary?: string; polishedBullets?: string[] };
        if (parsed.polishedSummary && Array.isArray(parsed.polishedBullets)) {
          return NextResponse.json({
            success: true,
            data: {
              polishedSummary: parsed.polishedSummary,
              polishedBullets: parsed.polishedBullets,
              provider: cloud.provider,
            },
          });
        }
      } catch {
        // fallback cleanly
      }
    }

    const firstProj = projects[0]?.title || "full-stack campus platform";
    const polishedSummary = summary
      ? `Results-driven ${targetRole} with proven expertise in ${skills || "modern full-stack architecture"}. Experienced in architecting resilient web applications, automating deployment pipelines, and delivering measurable engineering outcomes.`
      : `High-performing ${targetRole} candidate specializing in ${skills || "distributed systems and full-stack development"}. Demonstrated track record building scalable, end-to-end software solutions.`;

    return NextResponse.json({
      success: true,
      data: {
        polishedSummary,
        polishedBullets: [
          `Architected ${firstProj} using ${skills ? skills.split(",").slice(0, 3).join(", ") : "TypeScript & Cloud APIs"}, reducing API latency by 35% via query optimization.`,
          "Implemented automated unit/integration test suites and CI/CD pipelines ensuring zero-regression production deployments.",
          "Collaborated across cross-functional engineering workflows to ship responsive, accessible interfaces ahead of sprint milestones.",
        ],
        provider: "vlink-writing-ai",
      },
    });
  }

  // ── 3. Resume Assist ──
  if (body.task === "resume-assist") {
    const targetUser = user || db.users[0];
    const res = await callAiService(
      "/api/ai/resume-assist",
      {
        name: targetUser.name,
        target_role: targetUser.targetRole,
        headline: targetUser.headline,
        skills: targetUser.skills.map((s) => s.name),
        projects: targetUser.projects.map((p) => ({
          title: p.title,
          description: p.description,
          tech_stack: p.techStack,
          repo_url: p.repoUrl,
        })),
        education: targetUser.education,
      },
      () => ({
        ats_score: Math.min(94, 52 + targetUser.skills.length * 4 + targetUser.projects.length * 8),
        professional_summary: `Computer Science student targeting ${targetUser.targetRole} roles with verified proficiency in ${targetUser.skills
          .slice(0, 5)
          .map((s) => s.name)
          .join(", ")}.`,
        enhanced_project_bullets: targetUser.projects.map((p) => ({
          title: p.title,
          bullets: [
            `Engineered ${p.title} using ${p.techStack.join(", ")}, delivering end-to-end verified workflows.`,
            `Optimized modular architecture and integrated responsive client interfaces with automated tests.`,
          ],
        })),
        ats_checklist: [
          { label: "Single-column ATS-safe layout", passed: true },
          { label: "Skills & projects synced from profile", passed: targetUser.skills.length >= 2 },
          { label: "Action-verb bullet phrasing verified", passed: targetUser.projects.length >= 1 },
        ],
      })
    );
    return NextResponse.json(res);
  }

  // ── 4. Resume Compatibility ──
  if (body.task === "resume-compatibility") {
    const p = body.payload || {};
    const targetUser = user || db.users[0];
    const reqSkills = (p.requiredSkills as string[]) || [];
    const jobDesc = String(p.jobDescription || "");
    const resumeText = String(p.resumeText || "");

    const res = await callAiService(
      "/api/ai/resume-compatibility",
      {
        resume_text: resumeText,
        skills: targetUser.skills.map((s) => s.name),
        projects: targetUser.projects.map((pr) => ({
          title: pr.title,
          description: pr.description,
          tech_stack: pr.techStack,
        })),
        job_title: String(p.jobTitle || targetUser.targetRole),
        job_description: jobDesc,
        required_skills: reqSkills,
      },
      () => {
        const lower = resumeText.toLowerCase();
        const jdLower = jobDesc.toLowerCase();
        const extractedFromJd = Array.from(
          new Set(
            [
              ...reqSkills,
              ...["typescript", "react", "next.js", "python", "aws", "docker", "sql", "node.js", "fastapi", "git", "linux", "ci/cd", "kubernetes", "java"].filter(
                (kw) => jdLower.includes(kw)
              ),
            ]
          )
        );
        const targetKeywords = extractedFromJd.length > 0 ? extractedFromJd : reqSkills;
        const matched = targetKeywords.filter((s) => lower.includes(s.toLowerCase()));
        const missing = targetKeywords.filter((s) => !lower.includes(s.toLowerCase()));
        const score = Math.min(
          97,
          Math.max(32, Math.round((matched.length / Math.max(1, targetKeywords.length)) * 82 + 16))
        );
        return {
          compatibility_score: score,
          ats_keyword_coverage: score,
          matched_keywords: matched,
          missing_keywords: missing,
          strengths: [
            matched.length > 0
              ? `Direct resume alignment on ${matched.join(", ")}.`
              : "Clean single-column ATS parsing structure.",
          ],
          improvement_suggestions: missing.length
            ? [`Add measurable experience highlighting ${missing.slice(0, 4).join(", ")}.`]
            : ["Excellent keyword coverage against this target role description."],
        };
      }
    );
    return NextResponse.json(res);
  }

  // ── 5. Mock Interview Start ──
  if (body.task === "mock-interview-start") {
    const p = body.payload || {};
    const targetRole = String(p.targetRole || user?.targetRole || "Full-Stack Software Engineer");
    const focusSkills = (p.focusSkills as string[]) || user?.skills.slice(0, 4).map((s) => s.name) || [];

    const cloud = await callCloudLLM({
      geminiApiKey,
      expectJson: true,
      systemPrompt: `You are a Senior Technical Interviewer. Return strict JSON with keys: "session_id" (string), "target_role" (string), and "questions" (array of 3 objects with "id", "category", "question", "expected_concepts" (array of 4 short keywords)).`,
      userPrompt: `Generate 3 tailored interview questions for role "${targetRole}" focusing on skills: ${focusSkills.join(", ") || "software architecture, data structures, testing"}.`,
    });

    if (cloud) {
      try {
        const parsed = JSON.parse(cloud.text) as { questions?: unknown[] };
        if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          return NextResponse.json({ data: parsed, source: cloud.provider });
        }
      } catch {
        // fallback cleanly
      }
    }

    const res = await callAiService(
      "/api/ai/mock-interview/start",
      { target_role: targetRole, difficulty: "Intermediate", focus_skills: focusSkills },
      () => ({
        session_id: `mock-${Date.now()}`,
        target_role: targetRole,
        questions: [
          {
            id: "iq-1",
            category: "System Design",
            question: `For a ${targetRole} role, how would you separate the frontend UI from direct database access while keeping feed updates responsive?`,
            expected_concepts: ["API gateway", "authentication", "caching", "pagination"],
          },
          {
            id: "iq-2",
            category: "Project Deep-Dive",
            question: `Walk through a challenging bug or performance bottleneck you solved using ${focusSkills.slice(0, 2).join(" and ") || "your primary stack"}.`,
            expected_concepts: ["profiling", "trade-offs", "testing", "latency"],
          },
          {
            id: "iq-3",
            category: "Production Reliability",
            question: `How do you validate external inputs, handle API failures gracefully, and monitor service health for ${targetRole} systems?`,
            expected_concepts: ["validation", "error handling", "timeouts", "logging"],
          },
        ],
      })
    );
    return NextResponse.json(res);
  }

  // ── 6. Mock Interview Evaluate ──
  if (body.task === "mock-interview-evaluate") {
    const p = body.payload || {};
    const answer = String(p.answer || "");
    const expected = (p.expectedConcepts as string[]) || [];
    const targetRole = String(p.targetRole || "Software Engineer");
    const question = String(p.question || "");

    const cloud = await callCloudLLM({
      geminiApiKey,
      expectJson: true,
      systemPrompt: `You are a Senior Technical Interviewer. Evaluate the candidate's answer strictly and constructively. Return JSON ONLY with keys: "score" (0-100), "clarity_score" (0-100), "technical_accuracy" (0-100), "concepts_covered" (string[]), "concepts_missed" (string[]), "feedback" (2 crisp sentences), "sample_strong_answer" (2-3 crisp sentences).`,
      userPrompt: `Role: ${targetRole}\nQuestion: ${question}\nExpected Concepts: ${expected.join(", ")}\nCandidate Answer: ${answer}`,
    });

    if (cloud) {
      try {
        const parsed = JSON.parse(cloud.text) as { score?: number };
        if (typeof parsed.score === "number") {
          return NextResponse.json({ data: parsed, source: cloud.provider });
        }
      } catch {
        // fallback cleanly
      }
    }

    const res = await callAiService(
      "/api/ai/mock-interview/evaluate",
      {
        target_role: targetRole,
        question,
        expected_concepts: expected,
        answer,
      },
      () => {
        const covered = expected.filter((c) => answer.toLowerCase().includes(c.toLowerCase()));
        const missed = expected.filter((c) => !covered.includes(c));
        const wordBoost = Math.min(25, Math.floor(answer.trim().split(/\s+/).length / 2));
        const score = Math.min(95, Math.max(30, Math.round((covered.length / Math.max(1, expected.length)) * 55 + 20 + wordBoost)));
        return {
          score,
          clarity_score: Math.min(95, score + 3),
          technical_accuracy: score,
          concepts_covered: covered,
          concepts_missed: missed,
          feedback:
            covered.length > 0
              ? `Strong coverage of ${covered.join(", ")}. Deepen your answer by discussing trade-offs around ${missed.join(", ") || "observability and edge cases"}.`
              : `Expand with concrete mechanisms such as ${expected.slice(0, 3).join(", ")} and real latency/scale trade-offs.`,
          sample_strong_answer:
            "Route requests through an authenticated API layer, validate payloads, cache hot reads, apply timeouts with graceful fallback, and capture structured telemetry.",
        };
      }
    );
    return NextResponse.json(res);
  }

  // ── 7. Verify Skill Questions ──
  if (body.task === "verify-skill-questions") {
    const skill = String(body.payload?.skill || "Python");
    const res = await callAiService(
      "/api/ai/verify-skill/questions",
      { skill },
      () => ({
        skill,
        questions: [
          {
            id: "v-1",
            prompt: `Which engineering practice ensures reliable ${skill} code in production?`,
            code_snippet: null,
            options: [
              "Skipping tests",
              "Automated unit tests, input validation, and clear error handling",
              "Hardcoding secrets",
              "Bypassing API layers",
            ],
            correct_index: 1,
            explanation: "Automated tests and validation ensure production reliability.",
          },
          {
            id: "v-2",
            prompt: `How should ${skill} modules communicate with external services?`,
            code_snippet: null,
            options: [
              "Typed API contracts with timeouts and graceful fallback",
              "Direct unauthenticated database exposure",
              "Ignoring HTTP status codes",
              "Blocking the UI indefinitely",
            ],
            correct_index: 0,
            explanation: "Typed contracts and timeouts ensure resilience.",
          },
        ],
      })
    );
    return NextResponse.json(res);
  }

  // ── 8. Verify Skill Submit ──
  if (body.task === "verify-skill-submit") {
    const p = body.payload || {};
    const skill = String(p.skill || "");
    const answers = (p.answers as number[]) || [];
    const correctIndices = (p.correctIndices as number[]) || [];

    const res = await callAiService(
      "/api/ai/verify-skill/submit",
      { skill, answers, correct_indices: correctIndices },
      () => {
        const correct = answers.filter((a, i) => a === correctIndices[i]).length;
        const pct = Math.round((correct / Math.max(1, correctIndices.length)) * 100);
        const passed = pct >= 66;
        return {
          skill,
          passed,
          score_percent: pct,
          verified_badge: passed,
          message: passed
            ? `Verified! You scored ${pct}% on ${skill}.`
            : `Scored ${pct}%. Score at least 67% to unlock the verified badge.`,
        };
      }
    );

    if (res.data.passed && user) {
      const existing = user.skills.find(
        (s) => s.name.toLowerCase() === skill.toLowerCase()
      );
      if (existing) {
        existing.verified = true;
        existing.level = Math.max(existing.level, 82);
      } else {
        user.skills.push({
          name: skill,
          level: 82,
          verified: true,
          endorsements: 0,
        });
      }
      user.readinessScore = Math.min(99, user.readinessScore + 3);
      createNotification(db, {
        userId: user.id,
        category: "endorsement",
        title: `Verified Skill Badge: ${skill}`,
        body: `You passed the ${skill} assessment (${res.data.score_percent}%) and unlocked a verified badge on your profile.`,
        link: "/profile",
      });
      writeDb(db);
    }

    return NextResponse.json({
      ...res,
      user: user ? toPublicProfile(user) : null,
    });
  }

  return NextResponse.json({ error: "Unsupported AI task" }, { status: 400 });
}
