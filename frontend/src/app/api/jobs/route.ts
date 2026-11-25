import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { callAiService } from "@/lib/ai-client";
import { createNotification, readDb, writeDb } from "@/lib/store";
import { ApplicationStatus, JobPosting } from "@/lib/types";

export async function GET(req: NextRequest) {
  const db = readDb();
  const userId = await getSessionUserId();
  const q = (req.nextUrl.searchParams.get("q") || "").trim().toLowerCase();
  const location = (req.nextUrl.searchParams.get("location") || "").trim().toLowerCase();
  const skill = (req.nextUrl.searchParams.get("skill") || "").trim().toLowerCase();
  const roleType = (req.nextUrl.searchParams.get("roleType") || "").trim().toLowerCase();

  const filteredJobs = db.jobs.filter((j) => {
    if (q && !`${j.title} ${j.companyName} ${j.description}`.toLowerCase().includes(q)) return false;
    if (location && !j.location.toLowerCase().includes(location)) return false;
    if (skill && !j.requiredSkills.some((s) => s.toLowerCase().includes(skill))) return false;
    if (roleType && j.roleType.toLowerCase() !== roleType) return false;
    return true;
  });

  const user = userId ? db.users.find((u) => u.id === userId) : undefined;
  let matchMap: Record<
    string,
    { match_score: number; matched_skills: string[]; missing_skills: string[]; readiness_fit: string; rationale: string }
  > = {};

  if (user && filteredJobs.length > 0) {
    const aiRes = await callAiService(
      "/api/ai/match-jobs",
      {
        target_role: user.targetRole,
        student_skills: user.skills.map((s) => ({
          name: s.name,
          level: s.level,
          verified: s.verified,
          endorsements: s.endorsements,
        })),
        readiness_score: user.readinessScore,
        projects: user.projects.map((p) => ({
          title: p.title,
          description: p.description,
          tech_stack: p.techStack,
        })),
        jobs: filteredJobs.map((j) => ({
          id: j.id,
          title: j.title,
          company: j.companyName,
          location: j.location,
          role_type: j.roleType,
          required_skills: j.requiredSkills,
          description: j.description,
        })),
      },
      () => ({
        matches: filteredJobs.map((j) => {
          const studentSet = new Set(user.skills.map((s) => s.name.toLowerCase()));
          const matched = j.requiredSkills.filter((rs) => studentSet.has(rs.toLowerCase()));
          const missing = j.requiredSkills.filter((rs) => !studentSet.has(rs.toLowerCase()));
          const score = Math.min(
            96,
            Math.round((matched.length / Math.max(1, j.requiredSkills.length)) * 70 + user.readinessScore * 0.25)
          );
          return {
            job_id: j.id,
            match_score: score,
            matched_skills: matched,
            missing_skills: missing,
            readiness_fit: score >= 75 ? "High Readiness Fit" : "Strong Partial Fit",
            rationale: `Matches ${matched.length}/${j.requiredSkills.length} required skills.`,
          };
        }),
      })
    );

    for (const m of aiRes.data.matches) {
      matchMap[m.job_id] = m;
    }
  }

  const jobs = filteredJobs.map((j) => ({
    ...j,
    match: matchMap[j.id] || null,
  }));

  const applications = userId
    ? db.applications
        .filter((a) => a.userId === userId)
        .map((a) => ({
          ...a,
          job: db.jobs.find((j) => j.id === a.jobId) || null,
        }))
    : [];

  return NextResponse.json({
    jobs,
    companies: db.companies,
    applications,
  });
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = readDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = (await req.json()) as any;

  if (body.action === "create_job") {
    const title = String(body.title || "").trim();
    const companyName = String(body.companyName || "").trim();
    const roleType = String(body.roleType || "Full-Time").trim();
    const location = String(body.location || "Remote, India").trim();
    const salary = String(body.salary || "Competitive").trim();
    const description = String(body.description || "").trim();
    const skills = Array.isArray(body.requiredSkills)
      ? body.requiredSkills
      : String(body.requiredSkills || "")
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean);

    if (!title || !companyName) {
      return NextResponse.json({ error: "Title and Company Name are required." }, { status: 400 });
    }

    const companyId = `comp-${companyName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
    if (!db.companies.find((comp) => comp.id === companyId)) {
      db.companies.push({
        id: companyId,
        name: companyName,
        industry: "Technology",
        location,
        size: "50-200",
        website: `https://${companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
        description: `${companyName} campus recruitment and hiring partner.`,
        verified: true,
        followerIds: [],
      });
    }

    const newJob: JobPosting = {
      id: `job-${Date.now()}`,
      externalJobId: String(body.externalJobId || `REQ-VLINK-${Math.floor(100000 + Math.random() * 899999)}`).trim(),
      applyUrl: String(body.applyUrl || `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(title + " " + companyName)}`).trim(),
      title,
      companyId,
      companyName,
      location,
      roleType: (roleType as "Internship" | "Full-Time" | "Part-Time") || "Full-Time",
      remote: location.toLowerCase().includes("remote"),
      stipendOrSalary: salary || "Competitive",
      description,
      requiredSkills: skills.length > 0 ? skills : ["Problem Solving", "Communication", "Technical Stack"],
      postedAt: new Date().toISOString(),
    };

    db.jobs.unshift(newJob);

    for (const u of db.users) {
      createNotification(db, {
        userId: u.id,
        category: "application",
        title: `New Opportunity: ${title} at ${companyName}`,
        body: `A new ${roleType} role has been published matching campus skills. View and apply on V-Link Job Radar.`,
        link: "/jobs",
      });
    }

    writeDb(db);
    return NextResponse.json({ success: true, job: newJob }, { status: 201 });
  }

  const job = db.jobs.find((j) => j.id === body.jobId);
  if (!job) {
    return NextResponse.json({ error: "Job posting not found" }, { status: 404 });
  }

  const existing = db.applications.find(
    (a) => a.userId === user.id && a.jobId === job.id
  );
  if (existing) {
    return NextResponse.json({ application: existing, alreadyApplied: true });
  }

  const studentSet = new Set(user.skills.map((s) => s.name.toLowerCase()));
  const matched = job.requiredSkills.filter((s) => studentSet.has(s.toLowerCase()));
  const fallbackMatch = Math.min(
    96,
    Math.round((matched.length / Math.max(1, job.requiredSkills.length)) * 70 + user.readinessScore * 0.25)
  );

  const now = new Date().toISOString();
  const app = {
    id: `app-${Date.now()}`,
    userId: user.id,
    jobId: job.id,
    status: "applied" as ApplicationStatus,
    matchScore: body.matchScore ?? fallbackMatch,
    coverNote: body.coverNote?.trim() || undefined,
    phone: body.phone?.trim() || undefined,
    portfolioUrl: body.portfolioUrl?.trim() || undefined,
    appliedVia: (body.appliedVia === "external-portal" ? "external-portal" : "vlink-form") as "vlink-form" | "external-portal",
    appliedAt: now,
    updatedAt: now,
  };

  db.applications.unshift(app);
  createNotification(db, {
    userId: user.id,
    category: "application",
    title: `Applied to ${job.title}`,
    body: `Your application to ${job.companyName} is recorded with status 'applied'.`,
    link: "/jobs",
  });
  writeDb(db);

  return NextResponse.json({ application: { ...app, job } }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = readDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = (await req.json()) as {
    action: "update_status" | "toggle_follow_company";
    applicationId?: string;
    status?: ApplicationStatus;
    companyId?: string;
  };

  if (body.action === "update_status" && body.applicationId && body.status) {
    const app = db.applications.find(
      (a) => a.id === body.applicationId && a.userId === user.id
    );
    if (!app) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }
    app.status = body.status;
    app.updatedAt = new Date().toISOString();
    writeDb(db);
    return NextResponse.json({ application: app });
  }

  if (body.action === "toggle_follow_company" && body.companyId) {
    const company = db.companies.find((c) => c.id === body.companyId);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    if (company.followerIds.includes(user.id)) {
      company.followerIds = company.followerIds.filter((id) => id !== user.id);
      user.followedCompanies = user.followedCompanies.filter((id) => id !== company.id);
    } else {
      company.followerIds.push(user.id);
      if (!user.followedCompanies.includes(company.id)) {
        user.followedCompanies.push(company.id);
      }
    }
    writeDb(db);
    return NextResponse.json({ company });
  }

  return NextResponse.json({ error: "Invalid jobs PATCH action" }, { status: 400 });
}
