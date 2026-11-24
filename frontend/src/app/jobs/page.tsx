"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Bookmark,
  Briefcase,
  Building2,
  CheckCircle2,
  ExternalLink,
  Globe,
  MapPin,
  Monitor,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Wifi,
  Zap,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApplicationStatus, Company, JobApplication, JobPosting } from "@/lib/types";

interface HydratedJob extends JobPosting {
  match: {
    match_score: number;
    matched_skills: string[];
    missing_skills: string[];
    readiness_fit: string;
    rationale: string;
  } | null;
}

interface HydratedApp extends JobApplication {
  job: JobPosting | null;
}

const STAGES: ApplicationStatus[] = ["applied", "shortlisted", "interview", "offer", "rejected"];

const STAGE_CONFIG: Record<ApplicationStatus, { label: string; color: string; bg: string; border: string }> = {
  applied:     { label: "Applied",     color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200" },
  shortlisted: { label: "Shortlisted", color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200" },
  interview:   { label: "Interview",   color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200" },
  offer:       { label: "Offer",       color: "text-emerald-700",bg: "bg-emerald-50",border: "border-emerald-200" },
  rejected:    { label: "Rejected",    color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200" },
};

const SALARY_RANGES = [
  { label: "Any Salary", value: "" },
  { label: "Internship Stipend", value: "stipend" },
  { label: "₹0–10 LPA", value: "0-10" },
  { label: "₹10–20 LPA", value: "10-20" },
  { label: "20+ LPA", value: "20+" },
];

const SORT_OPTIONS = [
  { label: "Best Match", value: "match" },
  { label: "Newest", value: "newest" },
];

const COMPANY_COLORS = [
  "#6366f1","#0ea5e9","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6",
];

function companyInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function companyColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  return COMPANY_COLORS[hash % COMPANY_COLORS.length];
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function fakeApplicantCount(jobId: string): number {
  let n = 0;
  for (let i = 0; i < jobId.length; i++) n += jobId.charCodeAt(i);
  return 20 + (n % 80);
}

const INDUSTRY_COLORS: Record<string, string> = {
  "Technology":    "bg-blue-100 text-blue-700",
  "E-Commerce":    "bg-orange-100 text-orange-700",
  "Food Tech":     "bg-red-100 text-red-700",
  "Finance":       "bg-emerald-100 text-emerald-700",
  "IT Services":   "bg-indigo-100 text-indigo-700",
  "Consulting":    "bg-violet-100 text-violet-700",
  "Healthcare":    "bg-teal-100 text-teal-700",
};

function industryChipClass(industry: string): string {
  return INDUSTRY_COLORS[industry] ?? "bg-slate-100 border border-slate-200/60 text-slate-600";
}

function JobsPageContent() {
  const { user, setAuthModalOpen } = useAuth();
  const [tab, setTab] = useState<"jobs" | "tracker" | "companies" | "post-job">("jobs");
  const searchParams = useSearchParams();

  // ─── Job Maker Portal State ──────────────────────────────────────────────
  const [newTitle, setNewTitle] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newRoleType, setNewRoleType] = useState("Full-Time");
  const [newLocation, setNewLocation] = useState("Remote, India");
  const [newSalary, setNewSalary] = useState("₹16.0 – 22.0 LPA");
  const [newSkills, setNewSkills] = useState("React, Next.js, TypeScript, PostgreSQL");
  const [newDesc, setNewDesc] = useState("");
  const [publishingJob, setPublishingJob] = useState(false);
  const [aiDrafting, setAiDrafting] = useState(false);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "post-job" || t === "tracker" || t === "companies" || t === "jobs") {
      setTab(t as any);
    }
  }, [searchParams]);

  async function handleAiDraftSpec() {
    setAiDrafting(true);
    try {
      const role = newTitle.trim() || "Full-Stack Software Engineer";
      const comp = newCompany.trim() || "Innovative Tech Labs";
      setNewDesc(`We are looking for a high-performing ${role} at ${comp} to architect scalable cloud systems, build delightful user experiences, and drive production feature releases.

Key Responsibilities:
• Design and maintain robust, high-availability web applications and microservices.
• Collaborate with cross-functional teams to translate user requirements into technical designs.
• Optimize application performance, reliability, and automated test coverage.

Required Qualifications:
• Proficiency with ${newSkills || "modern software engineering stacks"}.
• Strong understanding of system design, database indexing, and REST/GraphQL APIs.
• Excellent problem-solving skills and demonstrably verified V-Link career readiness.`);
      setFeedback("✦ AI Job Description drafted! Customize any field and click Publish.");
    } finally {
      setAiDrafting(false);
    }
  }

  async function handlePublishJob(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { setAuthModalOpen(true); return; }
    if (!newTitle.trim() || !newCompany.trim()) return;

    setPublishingJob(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_job",
          title: newTitle.trim(),
          companyName: newCompany.trim(),
          roleType: newRoleType,
          location: newLocation.trim(),
          salary: newSalary.trim(),
          requiredSkills: newSkills.split(",").map((s) => s.trim()).filter(Boolean),
          description: newDesc.trim() || `Exciting ${newTitle} opportunity at ${newCompany}.`,
        }),
      });

      if (res.ok) {
        setFeedback(`Successfully published "${newTitle}" at ${newCompany}! Matching students have been notified.`);
        setNewTitle("");
        setNewCompany("");
        setNewDesc("");
        await loadJobs();
        setTab("jobs");
      } else {
        const err = await res.json();
        setFeedback(`Error: ${err.error || "Failed to publish opening."}`);
      }
    } finally {
      setPublishingJob(false);
    }
  }
  const [jobs, setJobs] = useState<HydratedJob[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [applications, setApplications] = useState<HydratedApp[]>([]);

  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");
  const [skill, setSkill] = useState("");
  const [roleType, setRoleType] = useState("");
  const [salaryRange, setSalaryRange] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"match" | "newest">("match");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [applying, setApplying] = useState<string | null>(null);
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (location) params.set("location", location);
      if (skill) params.set("skill", skill);
      if (roleType) params.set("roleType", roleType);
      const res = await fetch(`/api/jobs?${params.toString()}`, { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as {
          jobs: HydratedJob[];
          companies: Company[];
          applications: HydratedApp[];
        };
        setJobs(data.jobs);
        setCompanies(data.companies);
        setApplications(data.applications);
      }
    } finally {
      setLoading(false);
    }
  }, [q, location, skill, roleType]);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  async function handleApply(job: HydratedJob) {
    if (!user) { setAuthModalOpen(true); return; }
    setApplying(job.id);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, matchScore: job.match?.match_score }),
      });
      if (res.ok) {
        setFeedback(`Application recorded for "${job.title}" with status 'applied'.`);
        await loadJobs();
      }
    } finally {
      setApplying(null);
    }
  }

  async function handleStatusChange(applicationId: string, status: ApplicationStatus) {
    await fetch("/api/jobs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_status", applicationId, status }),
    });
    await loadJobs();
  }

  async function handleFollowCompany(companyId: string) {
    if (!user) { setAuthModalOpen(true); return; }
    await fetch("/api/jobs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_follow_company", companyId }),
    });
    await loadJobs();
  }

  function toggleSave(jobId: string) {
    setSavedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId); else next.add(jobId);
      return next;
    });
  }

  const appliedJobIds = new Set(applications.map((a) => a.jobId));

  // Client-side filter & sort
  const filteredJobs = jobs
    .filter((job) => {
      if (remoteOnly && !job.location.toLowerCase().includes("remote")) return false;
      if (salaryRange === "stipend" && job.roleType !== "Internship") return false;
      if (salaryRange === "0-10" && job.roleType === "Internship") return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.postedAt ?? 0).getTime() - new Date(a.postedAt ?? 0).getTime();
      }
      return (b.match?.match_score ?? 0) - (a.match?.match_score ?? 0);
    });

  const stageGroups = STAGES.reduce<Record<ApplicationStatus, HydratedApp[]>>(
    (acc, s) => { acc[s] = applications.filter((a) => a.status === s); return acc; },
    {} as Record<ApplicationStatus, HydratedApp[]>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 glass-panel p-6 shadow-sm md:flex-row md:items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-bold">Jobs, Companies & Application Tracker</h1>
          <p className="mt-1 text-xs text-slate-600">
            Skill-aware job matching powered by your verified V-Link readiness score, plus stage-by-stage application tracking.
          </p>
        </div>
        <div className="flex rounded-full bg-slate-100 border border-slate-200/80 p-1 text-xs font-semibold">
          {(["jobs", "tracker", "companies", "post-job"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-full px-3.5 py-2 capitalize transition flex items-center gap-1.5 ${
                tab === t ? "bg-white text-[#4F46E5] font-bold shadow-xs" : "text-slate-600 hover:text-slate-900 font-semibold"
              }`}
            >
              {t === "jobs"
                ? `Job Board (${jobs.length})`
                : t === "tracker"
                ? `Tracker (${applications.length})`
                : t === "companies"
                ? `Companies (${companies.length})`
                : `✦ Job Maker Studio`}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800">
          <span>{feedback}</span>
          <button onClick={() => setFeedback("")} className="underline">Dismiss</button>
        </div>
      )}

      {/* ── JOB BOARD ── */}
      {tab === "jobs" && (
        <>
          {/* Filters */}
          <div className="rounded-2xl border border-slate-200/80 glass-panel p-4 shadow-sm space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Role or company..."
                  className="w-full rounded-xl border border-slate-200/80 bg-white/80 py-2 pl-9 pr-3 text-xs outline-none focus:border-brand-500 focus:glass-panel"
                />
              </div>
              <input
                type="text"
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
                placeholder="Filter by skill (e.g. Next.js, Python)"
                className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-xs outline-none focus:border-brand-500 focus:glass-panel"
              />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Filter by location (e.g. Remote)"
                className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-xs outline-none focus:border-brand-500 focus:glass-panel"
              />
              <select
                value={roleType}
                onChange={(e) => setRoleType(e.target.value)}
                className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-xs outline-none focus:border-brand-500"
              >
                <option value="">All Role Types</option>
                <option value="Internship">Internship</option>
                <option value="Full-Time">Full-Time</option>
              </select>
            </div>

            {/* Second row: salary, remote, sort */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500 font-mono">Salary:</span>
                <div className="flex gap-1">
                  {SALARY_RANGES.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setSalaryRange(r.value === salaryRange ? "" : r.value)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                        salaryRange === r.value
                          ? "btn-1of1-primary text-white"
                          : "bg-slate-100 border border-slate-200/60 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                <div
                  onClick={() => setRemoteOnly((p) => !p)}
                  className={`relative h-4 w-7 rounded-full transition ${remoteOnly ? "btn-1of1-primary" : "bg-slate-300"}`}
                >
                  <div className={`absolute top-0.5 h-3 w-3 rounded-full glass-panel shadow transition-transform ${remoteOnly ? "translate-x-3.5" : "translate-x-0.5"}`} />
                </div>
                <Wifi className="h-3 w-3" /> Remote Only
              </label>

              <div className="ml-auto flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500 font-mono">Sort:</span>
                {SORT_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSortBy(s.value as "match" | "newest")}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                      sortBy === s.value
                        ? "bg-slate-100 text-slate-900"
                        : "bg-slate-100 border border-slate-200/60 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border border-slate-200/80 glass-panel p-5 shadow-sm animate-pulse">
                  <div className="flex gap-4">
                    <div className="h-12 w-12 rounded-xl bg-slate-200 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-48 rounded bg-slate-200" />
                      <div className="h-3 w-32 rounded bg-slate-200" />
                      <div className="h-3 w-64 rounded bg-slate-200" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredJobs.length === 0 && (
                <div className="rounded-2xl border border-slate-200/80 glass-panel p-10 text-center text-xs text-slate-500 font-mono">
                  No jobs match your filters. Try adjusting them.
                </div>
              )}
              {filteredJobs.map((job) => {
                const isApplied = appliedJobIds.has(job.id);
                const isSaved = savedJobs.has(job.id);
                const isApplying = applying === job.id;
                const applicants = fakeApplicantCount(job.id);
                const isRemote = job.location.toLowerCase().includes("remote");
                const color = companyColor(job.companyName);
                const initials = companyInitials(job.companyName);

                return (
                  <div
                    key={job.id}
                    className="rounded-2xl border border-slate-200/80 glass-panel p-5 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      {/* Left: logo + details */}
                      <div className="flex gap-4">
                        {/* Company logo placeholder */}
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-slate-900 shadow-sm"
                          style={{ backgroundColor: color }}
                        >
                          {initials}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-base font-bold text-slate-900 font-bold">{job.title}</h2>
                            <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                              {job.roleType}
                            </span>
                            {/* Remote/On-site badge */}
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              isRemote ? "bg-sky-50 text-sky-700" : "bg-slate-100 border border-slate-200/60 text-slate-600"
                            }`}>
                              {isRemote ? <Wifi className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                              {isRemote ? "Remote" : "On-site"}
                            </span>
                            {job.match && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                                <Sparkles className="h-3 w-3" /> {job.match.match_score}% Match
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 font-mono">
                            <span className="flex items-center gap-1 font-semibold text-slate-800">
                              <Building2 className="h-3.5 w-3.5" /> {job.companyName}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" /> {job.location}
                            </span>
                            {/* Salary in green */}
                            <span className="font-bold text-emerald-700">{job.stipendOrSalary}</span>
                            {/* Applicant count */}
                            <span className="flex items-center gap-1 text-slate-500">
                              <Users className="h-3 w-3" /> {applicants} applicants
                            </span>
                            {/* Posted date */}
                            {job.postedAt && (
                              <span className="text-slate-500">{relativeTime(job.postedAt)}</span>
                            )}
                          </div>

                          <p className="mt-2.5 text-xs leading-relaxed text-slate-600 line-clamp-2">{job.description}</p>
                        </div>
                      </div>

                      {/* Right: actions */}
                      <div className="flex shrink-0 items-center gap-2">
                        {/* Bookmark */}
                        <button
                          type="button"
                          onClick={() => toggleSave(job.id)}
                          title={isSaved ? "Unsave job" : "Save job"}
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition shadow-2xs ${
                            isSaved
                              ? "border-amber-200 bg-amber-50 text-amber-600"
                              : "border-slate-200/80 glass-panel text-slate-500 hover:border-amber-200 hover:text-amber-500"
                          }`}
                        >
                          <Bookmark className={`h-4 w-4 ${isSaved ? "fill-amber-500" : ""}`} />
                        </button>

                        {/* Quick Apply button */}
                        <button
                          type="button"
                          disabled={isApplied || isApplying}
                          onClick={() => void handleApply(job)}
                          className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-xl px-4 text-xs font-semibold shadow-sm transition ${
                            isApplied
                              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                              : isApplying
                              ? "bg-brand-400 text-slate-900 cursor-wait"
                              : "btn-1of1-primary text-white hover:bg-brand-700 active:scale-95"
                          }`}
                        >
                          {isApplied ? (
                            <><CheckCircle2 className="h-4 w-4" /> Applied</>
                          ) : isApplying ? (
                            <><Zap className="h-4 w-4 animate-pulse" /> Applying…</>
                          ) : (
                            <><Zap className="h-4 w-4" /> Quick Apply</>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Skills */}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {job.requiredSkills.map((sk) => {
                        const matched = job.match?.matched_skills.some(
                          (m) => m.toLowerCase() === sk.toLowerCase()
                        );
                        return (
                          <span
                            key={sk}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-medium ${
                              matched
                                ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                                : "bg-slate-100 border border-slate-200/60 text-slate-800"
                            }`}
                          >
                            {sk}
                          </span>
                        );
                      })}
                    </div>

                    {job.match && (
                      <p className="mt-2.5 text-[11px] text-slate-500 font-mono">
                        <strong className="text-slate-800">{job.match.readiness_fit}:</strong>{" "}
                        {job.match.rationale}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── APPLICATION TRACKER (Kanban) ── */}
      {tab === "tracker" && (
        <div className="rounded-2xl border border-slate-200/80 glass-panel p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-slate-900 font-bold">Application Pipeline</h2>
          {!user ? (
            <div className="py-8 text-center text-xs text-slate-600">
              Sign in to view and manage your job applications.
            </div>
          ) : applications.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-600">
              You haven&apos;t applied to any roles yet. Browse the Job Board to apply!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="flex gap-4 pb-2" style={{ minWidth: "900px" }}>
                {STAGES.map((stage) => {
                  const cfg = STAGE_CONFIG[stage];
                  const cards = stageGroups[stage] ?? [];
                  return (
                    <div key={stage} className="flex-1 min-w-[160px]">
                      {/* Column header */}
                      <div className={`mb-3 flex items-center justify-between rounded-xl px-3 py-2 ${cfg.bg} ${cfg.border} border`}>
                        <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                          {cards.length}
                        </span>
                      </div>

                      {/* Cards */}
                      <div className="space-y-2">
                        {cards.map((app) => (
                          <div
                            key={app.id}
                            className={`rounded-xl border p-3 ${cfg.border} glass-panel shadow-sm`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Briefcase className={`h-3.5 w-3.5 ${cfg.color}`} />
                              <span className="text-xs font-bold text-slate-900 font-bold truncate">
                                {app.job?.title || app.jobId}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-mono truncate">{app.job?.companyName}</p>
                            <p className="text-[11px] text-slate-500 mt-1">
                              {new Date(app.appliedAt).toLocaleDateString()}
                            </p>
                            {app.matchScore != null && (
                              <span className="mt-2 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                {app.matchScore}% Match
                              </span>
                            )}
                            {/* Stage change */}
                            <select
                              value={app.status}
                              onChange={(e) =>
                                void handleStatusChange(app.id, e.target.value as ApplicationStatus)
                              }
                              className="mt-2 w-full rounded-lg border border-slate-200/80 bg-white/80 px-2 py-1 text-[11px] font-semibold capitalize text-slate-800 outline-none"
                            >
                              {STAGES.map((st) => (
                                <option key={st} value={st}>{STAGE_CONFIG[st].label}</option>
                              ))}
                            </select>
                          </div>
                        ))}

                        {cards.length === 0 && (
                          <div className={`rounded-xl border-2 border-dashed ${cfg.border} px-3 py-5 text-center text-[11px] text-slate-500`}>
                            No applications
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── COMPANIES ── */}
      {tab === "companies" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {companies.map((comp) => {
            const following = user ? comp.followerIds.includes(user.id) : false;
            const openRoles = jobs.filter((j) => j.companyId === comp.id).length;
            const color = companyColor(comp.name);
            const initials = companyInitials(comp.name);

            return (
              <div
                key={comp.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/80 glass-panel p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Company initials logo */}
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-slate-900 shadow-sm"
                        style={{ backgroundColor: color }}
                      >
                        {initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h2 className="text-base font-bold text-slate-900 font-bold">{comp.name}</h2>
                          {comp.verified && <ShieldCheck className="h-4 w-4 text-brand-600" />}
                          {/* Hiring now badge */}
                          {openRoles > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                              <Zap className="h-2.5 w-2.5" /> Hiring now
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          {/* Industry color chip */}
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${industryChipClass(comp.industry)}`}>
                            {comp.industry}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">{comp.location} · {comp.size}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleFollowCompany(comp.id)}
                      className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                        following
                          ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-900 hover:bg-slate-800"
                      }`}
                    >
                      {following ? "Following" : "Follow"}
                    </button>
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-slate-600 line-clamp-2">{comp.description}</p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-200/60 pt-3 text-[11px] text-slate-500 font-mono">
                  <span>{comp.followerIds.length} student followers</span>
                  <div className="flex items-center gap-3">
                    <span className={openRoles > 0 ? "font-semibold text-emerald-600" : ""}>
                      {openRoles} open role{openRoles !== 1 ? "s" : ""}
                    </span>
                    {comp.website && (
                      <a
                        href={comp.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-brand-600 hover:underline"
                      >
                        <Globe className="h-3 w-3" /> Website <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
          {/* ── JOB MAKER / MAKEUP PORTAL ── */}
      {tab === "post-job" && (
        <div className="card-dibs p-6 sm:p-8 bg-white/95 border border-white/90 rounded-3xl shadow-sm space-y-6 backdrop-blur-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="badge-coral py-0.5 px-2 text-[10px] uppercase font-mono">Recruiter &amp; Creator Portal</span>
                <span className="badge-mint py-0.5 px-2 text-[10px] uppercase font-mono">Live V-Link Radar</span>
              </div>
              <h2 className="mt-1 text-xl font-black text-slate-900 tracking-tight">Job Maker &amp; Opportunity Studio</h2>
              <p className="text-xs text-slate-600 font-medium">
                Create and publish real corporate hiring roles, internships, or campus project openings directly to students.
              </p>
            </div>
            <button
              type="button"
              disabled={aiDrafting}
              onClick={handleAiDraftSpec}
              className="btn-dibs-mint text-xs py-2 px-4 flex items-center gap-2 self-start md:self-auto shrink-0"
            >
              <Sparkles className="h-4 w-4" />
              <span>{aiDrafting ? "Drafting..." : "✦ AI Generate Job Spec"}</span>
            </button>
          </div>

          <form onSubmit={handlePublishJob} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Opportunity / Role Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Senior Full-Stack Engineer, AI Cloud Intern"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 font-semibold outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Organization *</label>
                <input
                  type="text"
                  required
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  placeholder="e.g. AWS India, Google Cloud, Razorpay"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 font-semibold outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role Type</label>
                <select
                  value={newRoleType}
                  onChange={(e) => setNewRoleType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 font-semibold outline-none focus:border-[#4F46E5]"
                >
                  <option value="Full-Time">Full-Time (FTE)</option>
                  <option value="Internship">Internship (Stipend)</option>
                  <option value="Campus Drive">Exclusive Campus Drive</option>
                  <option value="Contract">Contract / Project</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="e.g. Remote / Bengaluru / Hyderabad / Delhi NCR"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Compensation / CTC</label>
                <input
                  type="text"
                  value={newSalary}
                  onChange={(e) => setNewSalary(e.target.value)}
                  placeholder="e.g. ₹18.0 – 24.0 LPA, ₹50,000/mo"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Required Skills (Comma Separated)</label>
                <input
                  type="text"
                  value={newSkills}
                  onChange={(e) => setNewSkills(e.target.value)}
                  placeholder="e.g. React, TypeScript, Next.js, PostgreSQL"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-[#4F46E5]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Detailed Job Description &amp; Responsibilities</label>
                <span className="text-[10px] text-slate-400 font-mono">{newDesc.length} characters</span>
              </div>
              <textarea
                rows={6}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Click '✦ AI Generate Job Spec' or type requirements, responsibilities, and eligibility..."
                className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-xs leading-relaxed text-slate-900 outline-none focus:border-[#4F46E5]"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setTab("jobs")}
                className="btn-dibs-secondary text-xs py-2 px-4"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={publishingJob || !newTitle.trim() || !newCompany.trim()}
                className="btn-dibs-primary text-xs py-2 px-6 flex items-center gap-2 disabled:opacity-50"
              >
                <Briefcase className="h-4 w-4" />
                <span>{publishingJob ? "Publishing to Talent Network..." : "Publish Live Opportunity"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

</div>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500 font-mono">Loading Jobs Radar...</div>}>
      <JobsPageContent />
    </Suspense>
  );
}
