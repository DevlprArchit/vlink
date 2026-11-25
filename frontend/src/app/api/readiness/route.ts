import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId, PROFILE_COOKIE_NAME, signJsonToken } from "@/lib/auth";
import { callAiService } from "@/lib/ai-client";
import { generateAiReadinessAssessment } from "@/lib/llm";
import { createNotification, readDbAsync, toPublicProfile, writeDbAsync } from "@/lib/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const userId = await getSessionUserId();
  const db = await readDbAsync();

  if (!userId) {
    return NextResponse.json(
      {
        certifications: db.certifications,
        certProgress: [],
        roadmap: null,
        latestAssessment: null,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const roadmap = db.roadmaps.find((r) => r.userId === userId) || null;
  const certProgress = db.certProgress.filter((cp) => cp.userId === userId);
  const assessments = db.assessments.filter((a) => a.userId === userId);
  const latestAssessment = assessments[0] || null;

  return NextResponse.json(
    {
      certifications: db.certifications,
      certProgress,
      roadmap,
      latestAssessment,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = await readDbAsync();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = (await req.json()) as {
    targetRole?: string;
    weeklyHours?: number;
    diagnosticAnswers: Array<{
      question_id: string;
      skill: string;
      selected_option: number;
      correct_option: number;
      confidence: number;
    }>;
  };

  const targetRole = body.targetRole || user.targetRole;
  user.targetRole = targetRole;

  const userCerts = db.certProgress
    .filter((cp) => cp.userId === user.id)
    .map((cp) => {
      const cert = db.certifications.find((c) => c.id === cp.certId);
      return {
        title: cert?.title || cp.certId,
        provider: cert?.provider || "V-Link",
        completed: cp.completed,
        progress: cp.progress,
      };
    });

  const geminiApiKey = req.headers.get("x-gemini-api-key") || undefined;

  const aiEval = await generateAiReadinessAssessment({
    userName: user.name,
    targetRole,
    skills: user.skills,
    projects: user.projects,
    certifications: userCerts,
    diagnosticAnswers: body.diagnosticAnswers || [],
    geminiApiKey,
  });

  // Also allow local Python FastAPI microservice to enrich scores when running locally
  const readinessRes = await callAiService(
    "/api/ai/readiness-score",
    {
      target_role: targetRole,
      skills: user.skills.map((s) => ({
        name: s.name,
        level: s.level,
        verified: s.verified,
        endorsements: s.endorsements,
      })),
      projects: user.projects.map((p) => ({
        title: p.title,
        description: p.description,
        tech_stack: p.techStack,
        repo_url: p.repoUrl,
        live_url: p.liveUrl,
      })),
      certifications: userCerts,
      diagnostic_answers: body.diagnosticAnswers || [],
    },
    () => ({
      overall_score: aiEval.overall_score,
      tier: aiEval.tier,
      target_role: targetRole,
      dimension_scores: aiEval.dimension_scores,
      skill_breakdown: user.skills.map((s) => ({
        skill: s.name,
        score: s.level,
        verified: s.verified,
        status: s.verified ? "Verified" : "Developing",
      })),
      missing_core_skills: aiEval.missing_core_skills,
      recommendations: aiEval.recommendations,
    })
  );

  const scoreData = readinessRes.data;
  user.readinessScore = scoreData.overall_score;
  user.readinessTier = scoreData.tier;
  user.readinessDimensions = scoreData.dimension_scores;

  const assessmentRecord = {
    id: `assess-${Date.now()}`,
    userId: user.id,
    targetRole,
    overallScore: scoreData.overall_score,
    tier: scoreData.tier,
    dimensions: scoreData.dimension_scores,
    missingCoreSkills: scoreData.missing_core_skills,
    recommendations: scoreData.recommendations,
    aiSource: aiEval.ai_source !== "vlink-ai-diagnostic-engine" ? aiEval.ai_source : readinessRes.source,
    aiReport: aiEval.ai_report,
    completedAt: new Date().toISOString(),
  };
  db.assessments.unshift(assessmentRecord);

  // Also regenerate personalized roadmap for target role
  const roadmapRes = await callAiService(
    "/api/ai/roadmap",
    {
      target_role: targetRole,
      current_skills: user.skills.map((s) => s.name),
      readiness_score: scoreData.overall_score,
      weekly_hours: body.weeklyHours || 10,
    },
    () => ({
      target_role: targetRole,
      estimated_weeks: 6,
      milestones: [
        {
          id: "ms-1",
          phase: "Phase 1 · Foundations",
          title: `Strengthen ${targetRole} Core Fundamentals`,
          description: "Master essential syntax, data modeling, and verified skill quizzes.",
          skills_covered: user.skills.slice(0, 3).map((s) => s.name),
          estimated_hours: 16,
          resources: [{ title: "freeCodeCamp", url: "https://www.freecodecamp.org/" }],
          deliverable: "Pass 2 skill verification quizzes.",
          completed: scoreData.overall_score >= 78,
        },
        {
          id: "ms-2",
          phase: "Phase 2 · Applied Projects",
          title: "Ship Production Portfolio Project",
          description: "Build an end-to-end application with tests and clean README.",
          skills_covered: scoreData.missing_core_skills.slice(0, 3),
          estimated_hours: 22,
          resources: [{ title: "AWS Skill Builder", url: "https://explore.skillbuilder.aws/" }],
          deliverable: "Publish project to V-Link showcase.",
          completed: false,
        },
      ],
    })
  );

  const existingRoadmapIdx = db.roadmaps.findIndex((r) => r.userId === user.id);
  const newRoadmap = {
    userId: user.id,
    targetRole,
    estimatedWeeks: roadmapRes.data.estimated_weeks,
    milestones: roadmapRes.data.milestones,
    updatedAt: new Date().toISOString(),
  };
  if (existingRoadmapIdx >= 0) {
    db.roadmaps[existingRoadmapIdx] = newRoadmap;
  } else {
    db.roadmaps.push(newRoadmap);
  }

  createNotification(db, {
    userId: user.id,
    category: "milestone",
    title: `Readiness Score Updated: ${scoreData.overall_score}/100`,
    body: `Your ${targetRole} diagnostic is complete (${scoreData.tier}).`,
    link: "/profile",
  });

  await writeDbAsync(db);

  const pubUser = toPublicProfile(user);
  const postRes = NextResponse.json({
    user: pubUser,
    assessment: assessmentRecord,
    roadmap: newRoadmap,
    aiSource: readinessRes.source,
  });
  postRes.cookies.set(PROFILE_COOKIE_NAME, signJsonToken(pubUser), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return postRes;
}

export async function PATCH(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = await readDbAsync();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = (await req.json()) as {
    action: "toggle_milestone" | "update_cert";
    milestoneId?: string;
    certId?: string;
    progress?: number;
  };

  if (body.action === "toggle_milestone" && body.milestoneId) {
    const roadmap = db.roadmaps.find((r) => r.userId === user.id);
    const ms = roadmap?.milestones.find((m) => m.id === body.milestoneId);
    if (ms) {
      ms.completed = !ms.completed;
      if (ms.completed && user.readinessScore > 0) {
        user.readinessScore = Math.min(99, user.readinessScore + 2);
      }
      await writeDbAsync(db);
      const pubUser = toPublicProfile(user);
      const res = NextResponse.json({ roadmap, user: pubUser });
      res.cookies.set(PROFILE_COOKIE_NAME, signJsonToken(pubUser), {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
      return res;
    }
  }

  if (body.action === "update_cert" && body.certId) {
    const progress = Math.min(100, Math.max(0, body.progress ?? 100));
    const completed = progress >= 100;
    const existing = db.certProgress.find(
      (cp) => cp.userId === user.id && cp.certId === body.certId
    );
    if (existing) {
      existing.progress = progress;
      existing.completed = completed;
      existing.updatedAt = new Date().toISOString();
    } else {
      db.certProgress.push({
        userId: user.id,
        certId: body.certId,
        progress,
        completed,
        updatedAt: new Date().toISOString(),
      });
    }
    if (completed && user.readinessScore > 0) {
      user.readinessScore = Math.min(99, user.readinessScore + 3);
    }
    await writeDbAsync(db);
    const pubUser = toPublicProfile(user);
    const res = NextResponse.json({
      certProgress: db.certProgress.filter((cp) => cp.userId === user.id),
      user: pubUser,
    });
    res.cookies.set(PROFILE_COOKIE_NAME, signJsonToken(pubUser), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  }

  return NextResponse.json({ error: "Invalid readiness PATCH action" }, { status: 400 });
}
