"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import {
  CheckCircle2,
  Download,
  Edit3,
  Eye,
  FileText,
  Plus,
  Printer,
  RotateCcw,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { JobPosting } from "@/lib/types";

function getAiHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const key = localStorage.getItem("vlink_gemini_api_key");
    if (key?.trim()) headers["x-gemini-api-key"] = key.trim();
  } catch {
    // ignore storage errors
  }
  return headers;
}

interface AtsAuditResult {
  ats_score: number;
  grade: string;
  summary_verdict: string;
  ats_checklist: Array<{ label: string; passed: boolean }>;
  matched_keywords: string[];
  missing_keywords: string[];
  ai_recommendations: string[];
  provider: string;
}

interface WritingSuggestionPopup {
  fieldKey: string;
  fieldType: "summary" | "project-desc" | "bullet";
  projectId?: string;
  bulletIdx?: number;
  headlinePrompt: string;
  suggestions: string[];
  provider: string;
}

interface AssistResult {
  ats_score: number;
  professional_summary: string;
  enhanced_project_bullets: Array<{ title: string; bullets: string[] }>;
  ats_checklist: Array<{ label: string; passed: boolean }>;
}

interface CompatibilityResult {
  compatibility_score: number;
  ats_keyword_coverage: number;
  matched_keywords: string[];
  missing_keywords: string[];
  strengths: string[];
  improvement_suggestions: string[];
}

interface ProjectItem {
  id: string;
  title: string;
  techStack: string;
  description: string;
  bullets: string[];
}

interface ResumeFormState {
  fullName: string;
  targetRole: string;
  email: string;
  phone: string;
  location: string;
  portfolio: string;
  summary: string;
  education: string;
  skills: string;
  certifications: string;
  projects: ProjectItem[];
}

export default function ResumeBuilderPage() {
  const { user, setAuthModalOpen } = useAuth();
  const [assist, setAssist] = useState<AssistResult | null>(null);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [customJd, setCustomJd] = useState("");
  const [compat, setCompat] = useState<CompatibilityResult | null>(null);
  const [pdfMessage, setPdfMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"preview" | "editor">("editor");
  const [polishing, setPolishing] = useState(false);
  const [atsAudit, setAtsAudit] = useState<AtsAuditResult | null>(null);
  const [auditingAts, setAuditingAts] = useState(false);
  const [writingPopup, setWritingPopup] = useState<WritingSuggestionPopup | null>(null);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [resumeForm, setResumeForm] = useState<ResumeFormState>({
    fullName: "",
    targetRole: "",
    email: "",
    phone: "",
    location: "",
    portfolio: "",
    summary: "",
    education: "",
    skills: "",
    certifications: "",
    projects: [],
  });

  useEffect(() => {
    if (user) {
      setResumeForm((prev) => ({
        ...prev,
        fullName: prev.fullName || user.name || "",
        targetRole: prev.targetRole || user.targetRole || "",
        email: prev.email || user.email || "",
        location: prev.location || user.campus || "",
        summary: prev.summary || assist?.professional_summary || user.bio || "",
        education: prev.education || user.education || "",
        skills: prev.skills || user.skills.map((s) => s.name).join(", ") || "",
        projects:
          prev.projects.length > 0
            ? prev.projects
            : user.projects.map((p, idx) => ({
                id: p.id || `proj-${idx}`,
                title: p.title,
                techStack: p.techStack.join(", "),
                description: p.description,
                bullets: [
                  `Engineered ${p.title} using ${p.techStack.join(", ")}, delivering end-to-end user workflows.`,
                  `Optimized application latency by 35% with streamlined client-server state and automated tests.`,
                ],
              })),
      }));
    }
  }, [user, assist]);

  useEffect(() => {
    async function load() {
      const [assistRes, jobsRes] = await Promise.all([
        fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task: "resume-assist" }),
        }),
        fetch("/api/jobs", { cache: "no-store" }),
      ]);
      if (assistRes.ok) {
        const d = (await assistRes.json()) as { data: AssistResult };
        setAssist(d.data);
      }
      if (jobsRes.ok) {
        const j = (await jobsRes.json()) as { jobs: JobPosting[] };
        setJobs(j.jobs);
        if (j.jobs[0]) {
          setSelectedJobId(j.jobs[0].id);
          setCustomJd(j.jobs[0].description);
        }
      }
    }
    void load();
  }, [user?.id]);
  const resumePlainText = useMemo(() => {
    return [
      resumeForm.fullName,
      resumeForm.email,
      resumeForm.targetRole,
      resumeForm.education,
      resumeForm.summary,
      `Skills: ${resumeForm.skills}`,
      ...resumeForm.projects.map(
        (p) => `${p.title} (${p.techStack}): ${p.description}. ${p.bullets.join(" ")}`
      ),
    ].join("\n");
  }, [resumeForm]);

  async function checkJdCompatibility() {
    const job = jobs.find((j) => j.id === selectedJobId);
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: "resume-compatibility",
        payload: {
          resumeText: resumePlainText,
          jobTitle: job?.title || resumeForm.targetRole || "Software Engineer",
          jobDescription: customJd || job?.description || "",
          requiredSkills: job?.requiredSkills || [],
        },
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { data: CompatibilityResult };
      setCompat(data.data);
    }
  }

  async function handleAiPolish() {
    setPolishing(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: getAiHeaders(),
        body: JSON.stringify({
          task: "resume-polish",
          payload: {
            summary: resumeForm.summary,
            skills: resumeForm.skills,
            targetRole: resumeForm.targetRole,
            projects: resumeForm.projects,
          },
        }),
      });
      if (res.ok) {
        const d = await res.json();
        if (d?.data?.polishedSummary) {
          setResumeForm((prev) => ({
            ...prev,
            summary: d.data.polishedSummary,
            projects: prev.projects.map((pr, i) => ({
              ...pr,
              bullets: d.data.polishedBullets[i]
                ? [d.data.polishedBullets[i], ...pr.bullets.slice(1)]
                : pr.bullets,
            })),
          }));
          setPdfMessage("✦ AI Polish successfully applied to Summary & Project bullets!");
        }
      }
    } finally {
      setPolishing(false);
    }
  }

  const runAiAtsAudit = useCallback(async () => {
    if (!resumeForm.fullName && !resumeForm.summary && !resumeForm.skills) return;
    setAuditingAts(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: getAiHeaders(),
        body: JSON.stringify({
          task: "resume-ats-analyze",
          payload: {
            fullName: resumeForm.fullName,
            targetRole: resumeForm.targetRole,
            summary: resumeForm.summary,
            skills: resumeForm.skills,
            projects: resumeForm.projects,
            education: resumeForm.education,
            certifications: resumeForm.certifications,
            jobDescription: customJd,
          },
        }),
      });
      if (res.ok) {
        const d = (await res.json()) as { data?: AtsAuditResult };
        if (d.data) setAtsAudit(d.data);
      }
    } finally {
      setAuditingAts(false);
    }
  }, [resumeForm, customJd]);

  useEffect(() => {
    const t = setTimeout(() => {
      void runAiAtsAudit();
    }, 900);
    return () => clearTimeout(t);
  }, [runAiAtsAudit]);

  const requestWritingSuggestions = useCallback(
    async (params: {
      fieldKey: string;
      fieldType: "summary" | "project-desc" | "bullet";
      currentText: string;
      projectId?: string;
      projectTitle?: string;
      bulletIdx?: number;
    }) => {
      setLoadingSuggest(true);
      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: getAiHeaders(),
          body: JSON.stringify({
            task: "resume-suggest-continuation",
            payload: {
              fieldType: params.fieldType,
              currentText: params.currentText,
              targetRole: resumeForm.targetRole,
              skills: resumeForm.skills,
              projectTitle: params.projectTitle,
            },
          }),
        });
        if (res.ok) {
          const d = (await res.json()) as {
            data?: { headlinePrompt: string; suggestions: string[]; provider: string };
          };
          if (d.data?.suggestions?.length) {
            setWritingPopup({
              fieldKey: params.fieldKey,
              fieldType: params.fieldType,
              projectId: params.projectId,
              bulletIdx: params.bulletIdx,
              headlinePrompt: d.data.headlinePrompt,
              suggestions: d.data.suggestions,
              provider: d.data.provider,
            });
          }
        }
      } finally {
        setLoadingSuggest(false);
      }
    },
    [resumeForm.targetRole, resumeForm.skills]
  );

  function scheduleWritingSuggest(params: {
    fieldKey: string;
    fieldType: "summary" | "project-desc" | "bullet";
    currentText: string;
    projectId?: string;
    projectTitle?: string;
    bulletIdx?: number;
  }) {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (params.currentText.trim().length < 10) return;
    typingTimerRef.current = setTimeout(() => {
      void requestWritingSuggestions(params);
    }, 1000);
  }

  function applyWritingSuggestion(text: string) {
    if (!writingPopup) return;
    if (writingPopup.fieldType === "summary") {
      setResumeForm((prev) => ({ ...prev, summary: text }));
    } else if (writingPopup.fieldType === "project-desc" && writingPopup.projectId) {
      setResumeForm((prev) => ({
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === writingPopup.projectId ? { ...p, description: text } : p
        ),
      }));
    } else if (
      writingPopup.fieldType === "bullet" &&
      writingPopup.projectId &&
      typeof writingPopup.bulletIdx === "number"
    ) {
      setResumeForm((prev) => ({
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === writingPopup.projectId
            ? {
                ...p,
                bullets: p.bullets.map((b, idx) =>
                  idx === writingPopup.bulletIdx ? text : b
                ),
              }
            : p
        ),
      }));
    }
    setWritingPopup(null);
    setPdfMessage("✦ AI suggestion inserted cleanly into your resume!");
  }

  function handleAddProject() {
    const newP: ProjectItem = {
      id: `proj-${Date.now()}`,
      title: "New Scalable Project",
      techStack: "Next.js, TypeScript, PostgreSQL",
      description: "Architected high-throughput microservices platform with automated CI/CD.",
      bullets: [
        "Designed performant REST and WebSocket APIs serving real-time user requests.",
        "Implemented unit and end-to-end integration tests yielding 92% code coverage.",
      ],
    };
    setResumeForm((prev) => ({
      ...prev,
      projects: [...prev.projects, newP],
    }));
  }

  function handleRemoveProject(id: string) {
    setResumeForm((prev) => ({
      ...prev,
      projects: prev.projects.filter((p) => p.id !== id),
    }));
  }

  function handleUpdateProject(id: string, field: keyof ProjectItem, value: any) {
    setResumeForm((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    }));
  }

  function handleAddBullet(projectId: string) {
    setResumeForm((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              bullets: [...p.bullets, "Implemented automated test coverage and streamlined deployment pipelines."],
            }
          : p
      ),
    }));
  }

  function handleUpdateBullet(projectId: string, bulletIdx: number, val: string) {
    setResumeForm((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              bullets: p.bullets.map((b, i) => (i === bulletIdx ? val : b)),
            }
          : p
      ),
    }));
  }

  function handleRemoveBullet(projectId: string, bulletIdx: number) {
    setResumeForm((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              bullets: p.bullets.filter((_, i) => i !== bulletIdx),
            }
          : p
      ),
    }));
  }

  function handleResetProfile() {
    if (!user) return;
    setResumeForm({
      fullName: user.name,
      targetRole: user.targetRole,
      email: user.email,
      phone: "+91 98765 43210",
      location: user.campus || "India",
      portfolio: "github.com/vlink-dev",
      summary:
        assist?.professional_summary ||
        user.bio ||
        `Results-driven ${user.targetRole} specializing in modern full-stack systems.`,
      education: user.education || "B.Tech in Computer Science & Engineering",
      skills: user.skills.map((s) => s.name).join(", "),
      certifications: "AWS Certified Developer, Meta React Specialization",
      projects: user.projects.map((p, idx) => ({
        id: p.id || `proj-${idx}`,
        title: p.title,
        techStack: p.techStack.join(", "),
        description: p.description,
        bullets: [
          `Engineered ${p.title} using ${p.techStack.join(", ")}, delivering end-to-end verified workflows.`,
        ],
      })),
    });
    setPdfMessage("Reset to profile baseline.");
  }

  function downloadAtsPdf() {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    let y = 48;
    const left = 46;
    const maxWidth = 502;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42);
    doc.text(resumeForm.fullName || "Candidate Name", left, y);
    y += 18;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    const contactLine = `${resumeForm.targetRole}  |  ${resumeForm.email}  |  ${resumeForm.phone}  |  ${resumeForm.location}`;
    doc.text(contactLine, left, y);
    y += 14;

    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(1.2);
    doc.line(left, y, left + maxWidth, y);
    y += 18;

    const addSectionHeading = (title: string) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(title.toUpperCase(), left, y);
      y += 5;
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.7);
      doc.line(left, y, left + maxWidth, y);
      y += 13;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
    };

    addSectionHeading("Professional Summary");
    const summaryLines = doc.splitTextToSize(resumeForm.summary, maxWidth) as string[];
    doc.text(summaryLines, left, y);
    y += summaryLines.length * 12.5 + 10;

    addSectionHeading("Technical Skills");
    const skillLines = doc.splitTextToSize(resumeForm.skills, maxWidth) as string[];
    doc.text(skillLines, left, y);
    y += skillLines.length * 12.5 + 10;

    addSectionHeading("Projects & Technical Experience");
    for (const proj of resumeForm.projects) {
      if (y > 750) {
        doc.addPage();
        y = 50;
      }
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(proj.title, left, y);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(`[${proj.techStack}]`, left + 140, y);
      y += 12;

      doc.setTextColor(51, 65, 85);
      const descLines = doc.splitTextToSize(proj.description, maxWidth) as string[];
      doc.text(descLines, left, y);
      y += descLines.length * 12 + 4;

      for (const bullet of proj.bullets) {
        if (!bullet.trim()) continue;
        const bulletLines = doc.splitTextToSize(`• ${bullet}`, maxWidth - 10) as string[];
        doc.text(bulletLines, left + 8, y);
        y += bulletLines.length * 12 + 2;
      }
      y += 6;
    }

    if (y > 750) {
      doc.addPage();
      y = 50;
    }
    addSectionHeading("Education");
    const eduLines = doc.splitTextToSize(resumeForm.education, maxWidth) as string[];
    doc.text(eduLines, left, y);
    y += eduLines.length * 12 + 10;

    if (resumeForm.certifications.trim()) {
      addSectionHeading("Certifications & Accreditations");
      const certLines = doc.splitTextToSize(resumeForm.certifications, maxWidth) as string[];
      doc.text(certLines, left, y);
    }

    const safeName = (resumeForm.fullName || "Candidate").replace(/\s+/g, "_");
    doc.save(`VLink_ATS_Resume_${safeName}.pdf`);
    setPdfMessage(`Exported ATS Resume: VLink_ATS_Resume_${safeName}.pdf`);
  }
  return (
    <div className="space-y-6">
      {/* ─── Top Command Bar ─────────────────────────────────────────── */}
      <div className="no-print flex flex-col justify-between gap-4 rounded-3xl border border-white/90 bg-white/80 p-6 shadow-sm md:flex-row md:items-center backdrop-blur-2xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge-coral py-0.5 px-2 text-[10px] font-mono tracking-wider uppercase">
              ATS Studio Pro
            </span>
            <span className="badge-mint py-0.5 px-2 text-[10px] font-mono tracking-wider uppercase">
              Single-Column Parseable
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
            ATS Resume Studio &amp; Real-time Editor
          </h1>
          <p className="text-xs text-slate-600 font-medium">
            Fully editable ATS-safe resume with 1-click AI bullet optimization, instant live preview, and vector PDF download.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex rounded-full bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("editor")}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition ${
                activeTab === "editor"
                  ? "bg-white text-[#4F46E5] font-bold shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Edit3 className="h-3.5 w-3.5" /> Edit Fields
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition ${
                activeTab === "preview"
                  ? "bg-white text-[#4F46E5] font-bold shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Eye className="h-3.5 w-3.5" /> Live ATS Sheet
            </button>
          </div>

          <button
            type="button"
            onClick={downloadAtsPdf}
            className="btn-dibs-primary flex items-center gap-1.5 text-xs h-9 px-4"
          >
            <Download className="h-3.5 w-3.5" /> Download ATS PDF
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="btn-dibs-secondary flex items-center gap-1.5 text-xs h-9 px-3.5"
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
        </div>
      </div>

      {pdfMessage && (
        <div className="no-print rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800 flex items-center justify-between shadow-xs animate-in fade-in">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> {pdfMessage}
          </span>
          <button
            type="button"
            onClick={() => setPdfMessage("")}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {!user ? (
        <div className="rounded-3xl border border-white/90 bg-white/80 p-10 text-center backdrop-blur-2xl shadow-sm">
          <FileText className="mx-auto h-10 w-10 text-[#4F46E5]" />
          <h2 className="mt-3 text-lg font-bold text-slate-900">Sign in to customize your ATS resume</h2>
          <p className="mt-1 text-xs text-slate-600 max-w-sm mx-auto">
            Auto-generate and edit your career resume directly from verified profile credentials.
          </p>
          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="mt-4 btn-dibs-primary text-xs"
          >
            Sign In with Campus Account
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Main Area: Editor or Live Sheet */}
          <div className="lg:col-span-8 space-y-4">
            {activeTab === "editor" ? (
              /* ─── RESUME EDIT FORM ───────────────────────────────────────── */
              <div className="card-dibs p-6 bg-white/90 border border-white/90 rounded-3xl shadow-sm space-y-5 backdrop-blur-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Edit3 className="h-4 w-4 text-[#4F46E5]" />
                    <h3 className="text-sm font-bold text-slate-900">Resume Content Editor</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={polishing}
                      onClick={handleAiPolish}
                      className="btn-dibs-mint text-xs py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Wand2 className="h-3.5 w-3.5" />
                      {polishing ? "Polishing..." : "✦ AI Polish Resume"}
                    </button>
                    <button
                      type="button"
                      onClick={handleResetProfile}
                      className="text-slate-500 hover:text-slate-800 text-xs flex items-center gap-1 font-semibold px-2.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 transition"
                    >
                      <RotateCcw className="h-3 w-3" /> Reset
                    </button>
                  </div>
                </div>

                {/* Personal Information */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                    1. Contact &amp; Header Info
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={resumeForm.fullName}
                        onChange={(e) => setResumeForm({ ...resumeForm, fullName: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 font-semibold outline-none focus:border-[#4F46E5]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Target Role / Headline</label>
                      <input
                        type="text"
                        value={resumeForm.targetRole}
                        onChange={(e) => setResumeForm({ ...resumeForm, targetRole: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 font-semibold outline-none focus:border-[#4F46E5]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        value={resumeForm.email}
                        onChange={(e) => setResumeForm({ ...resumeForm, email: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#4F46E5]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={resumeForm.phone}
                        onChange={(e) => setResumeForm({ ...resumeForm, phone: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#4F46E5]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Location / Campus</label>
                      <input
                        type="text"
                        value={resumeForm.location}
                        onChange={(e) => setResumeForm({ ...resumeForm, location: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#4F46E5]"
                      />
                    </div>
                  </div>
                </div>

                {/* Professional Summary */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                      2. Professional Summary
                    </h4>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          void requestWritingSuggestions({
                            fieldKey: "summary",
                            fieldType: "summary",
                            currentText: resumeForm.summary,
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 transition"
                      >
                        <Sparkles className="h-3 w-3" /> Want to write more? (AI)
                      </button>
                      <span className="text-[10px] text-slate-400 font-mono">{resumeForm.summary.length} chars</span>
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    value={resumeForm.summary}
                    onChange={(e) => {
                      const val = e.target.value;
                      setResumeForm({ ...resumeForm, summary: val });
                      scheduleWritingSuggest({
                        fieldKey: "summary",
                        fieldType: "summary",
                        currentText: val,
                      });
                    }}
                    placeholder="Start writing a sentence about your skills or focus — AI will automatically offer ideas to write more..."
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-900 outline-none focus:border-[#4F46E5]"
                  />

                  {writingPopup?.fieldKey === "summary" && (
                    <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/90 to-white p-3.5 shadow-md space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                          <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                          {writingPopup.headlinePrompt}
                        </span>
                        <button
                          type="button"
                          onClick={() => setWritingPopup(null)}
                          className="text-slate-400 hover:text-slate-700 p-0.5"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {writingPopup.suggestions.map((sug, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => applyWritingSuggestion(sug)}
                            className="w-full text-left rounded-xl border border-indigo-100 bg-white p-2.5 text-[11px] text-slate-700 hover:border-indigo-400 hover:bg-indigo-50/40 transition shadow-2xs"
                          >
                            <span className="font-bold text-indigo-700">Option {idx + 1}: </span>
                            {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Technical Skills */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                    3. Technical Skills (Comma Separated)
                  </h4>
                  <textarea
                    rows={2}
                    value={resumeForm.skills}
                    onChange={(e) => setResumeForm({ ...resumeForm, skills: e.target.value })}
                    placeholder="TypeScript, React, Python, PostgreSQL, Docker..."
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 outline-none focus:border-[#4F46E5]"
                  />
                </div>
                {/* Projects Manager */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                      4. Projects &amp; Experience ({resumeForm.projects.length})
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddProject}
                      className="btn-dibs-primary text-[11px] py-1 px-3 flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> Add Project
                    </button>
                  </div>

                  <div className="space-y-4">
                    {resumeForm.projects.map((proj, pIdx) => (
                      <div
                        key={proj.id}
                        className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-slate-800 font-mono">Project #{pIdx + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveProject(proj.id)}
                            className="text-rose-500 hover:text-rose-700 text-xs flex items-center gap-1 font-semibold"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Remove
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={proj.title}
                            placeholder="Project Title"
                            onChange={(e) => handleUpdateProject(proj.id, "title", e.target.value)}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-[#4F46E5]"
                          />
                          <input
                            type="text"
                            value={proj.techStack}
                            placeholder="Tech Stack (e.g. Next.js, Python, PostgreSQL)"
                            onChange={(e) => handleUpdateProject(proj.id, "techStack", e.target.value)}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-[#4F46E5]"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Project Description
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                void requestWritingSuggestions({
                                  fieldKey: `desc-${proj.id}`,
                                  fieldType: "project-desc",
                                  currentText: proj.description,
                                  projectId: proj.id,
                                  projectTitle: proj.title,
                                })
                              }
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:underline"
                            >
                              <Sparkles className="h-3 w-3" /> Want to write more? (AI)
                            </button>
                          </div>
                          <textarea
                            rows={2}
                            value={proj.description}
                            placeholder="Write a brief line about what you built — AI will offer technical expansions..."
                            onChange={(e) => {
                              const val = e.target.value;
                              handleUpdateProject(proj.id, "description", val);
                              scheduleWritingSuggest({
                                fieldKey: `desc-${proj.id}`,
                                fieldType: "project-desc",
                                currentText: val,
                                projectId: proj.id,
                                projectTitle: proj.title,
                              });
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 outline-none focus:border-[#4F46E5]"
                          />
                          {writingPopup?.fieldKey === `desc-${proj.id}` && (
                            <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 p-3 space-y-1.5 shadow-sm">
                              <div className="flex items-center justify-between text-[11px] font-bold text-indigo-900">
                                <span className="flex items-center gap-1">
                                  <Sparkles className="h-3 w-3 text-indigo-600" />
                                  {writingPopup.headlinePrompt}
                                </span>
                                <button type="button" onClick={() => setWritingPopup(null)}>
                                  <X className="h-3.5 w-3.5 text-slate-500" />
                                </button>
                              </div>
                              {writingPopup.suggestions.map((sug, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => applyWritingSuggestion(sug)}
                                  className="w-full text-left rounded-lg border border-indigo-100 bg-white p-2 text-[11px] text-slate-700 hover:border-indigo-400"
                                >
                                  {sug}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Bullets */}
                        <div className="space-y-1.5 pl-2 border-l-2 border-slate-200">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Action-Oriented Bullets
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAddBullet(proj.id)}
                              className="text-[10px] text-[#4F46E5] hover:underline font-bold flex items-center gap-1"
                            >
                              <Plus className="h-3 w-3" /> Add Bullet
                            </button>
                          </div>
                          {proj.bullets.map((b, bIdx) => (
                            <div key={bIdx} className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={b}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    handleUpdateBullet(proj.id, bIdx, val);
                                    scheduleWritingSuggest({
                                      fieldKey: `bullet-${proj.id}-${bIdx}`,
                                      fieldType: "bullet",
                                      currentText: val,
                                      projectId: proj.id,
                                      projectTitle: proj.title,
                                      bulletIdx: bIdx,
                                    });
                                  }}
                                  className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 outline-none focus:border-[#4F46E5]"
                                />
                                <button
                                  type="button"
                                  title="Ask AI to write/expand this bullet"
                                  onClick={() =>
                                    void requestWritingSuggestions({
                                      fieldKey: `bullet-${proj.id}-${bIdx}`,
                                      fieldType: "bullet",
                                      currentText: b,
                                      projectId: proj.id,
                                      projectTitle: proj.title,
                                      bulletIdx: bIdx,
                                    })
                                  }
                                  className="inline-flex items-center gap-0.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 shrink-0"
                                >
                                  <Sparkles className="h-3 w-3" /> AI
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBullet(proj.id, bIdx)}
                                  className="text-slate-400 hover:text-rose-600 text-xs px-1.5"
                                >
                                  ✕
                                </button>
                              </div>
                              {writingPopup?.fieldKey === `bullet-${proj.id}-${bIdx}` && (
                                <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 p-2.5 space-y-1.5 shadow-sm">
                                  <div className="flex items-center justify-between text-[10px] font-bold text-indigo-900">
                                    <span>✦ {writingPopup.headlinePrompt}</span>
                                    <button type="button" onClick={() => setWritingPopup(null)}>
                                      <X className="h-3 w-3 text-slate-500" />
                                    </button>
                                  </div>
                                  {writingPopup.suggestions.map((sug, sIdx) => (
                                    <button
                                      key={sIdx}
                                      type="button"
                                      onClick={() => applyWritingSuggestion(sug)}
                                      className="w-full text-left rounded-lg border border-indigo-100 bg-white p-2 text-[11px] text-slate-700 hover:border-indigo-400"
                                    >
                                      {sug}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Education */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                    5. Education
                  </h4>
                  <input
                    type="text"
                    value={resumeForm.education}
                    onChange={(e) => setResumeForm({ ...resumeForm, education: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 font-semibold outline-none focus:border-[#4F46E5]"
                  />
                </div>

                {/* Certifications */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                    6. Certifications &amp; Accreditations
                  </h4>
                  <input
                    type="text"
                    value={resumeForm.certifications}
                    onChange={(e) => setResumeForm({ ...resumeForm, certifications: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#4F46E5]"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("preview")}
                    className="btn-dibs-primary text-xs"
                  >
                    <Eye className="h-3.5 w-3.5" /> View Live ATS Sheet
                  </button>
                </div>
              </div>
            ) : (
              /* ─── LIVE ATS RESUME PREVIEW SHEET (High-Contrast Text) ─── */
              <div className="print-only-resume rounded-3xl border border-slate-300 bg-white text-slate-900 p-4 sm:p-12 shadow-md overflow-x-auto">
                {/* Header Section */}
                <div className="border-b-2 border-slate-900 pb-4">
                  <h2 className="text-3xl font-black tracking-tight text-slate-900 font-sans">
                    {resumeForm.fullName || "Your Name"}
                  </h2>
                  <p className="mt-1.5 text-xs font-semibold text-slate-700 leading-normal">
                    <span className="font-bold text-[#4F46E5]">{resumeForm.targetRole}</span>
                    {" · "}
                    <span>{resumeForm.email}</span>
                    {" · "}
                    <span>{resumeForm.phone}</span>
                    {" · "}
                    <span>{resumeForm.location}</span>
                  </p>
                </div>

                {/* Sections Feed */}
                <div className="mt-6 space-y-6 text-xs leading-relaxed text-slate-900">
                  {/* Summary */}
                  {resumeForm.summary && (
                    <section>
                      <h3 className="border-b border-slate-200 pb-1 text-xs font-black uppercase tracking-wider text-slate-900">
                        Professional Summary
                      </h3>
                      <p className="mt-2.5 text-slate-800 leading-relaxed font-normal">
                        {resumeForm.summary}
                      </p>
                    </section>
                  )}

                  {/* Skills */}
                  {resumeForm.skills && (
                    <section>
                      <h3 className="border-b border-slate-200 pb-1 text-xs font-black uppercase tracking-wider text-slate-900">
                        Technical Skills
                      </h3>
                      <p className="mt-2.5 text-slate-800 font-medium leading-relaxed">
                        {resumeForm.skills}
                      </p>
                    </section>
                  )}

                  {/* Projects & Experience */}
                  {resumeForm.projects.length > 0 && (
                    <section>
                      <h3 className="border-b border-slate-200 pb-1 text-xs font-black uppercase tracking-wider text-slate-900">
                        Projects &amp; Technical Experience
                      </h3>
                      <div className="mt-3 space-y-4">
                        {resumeForm.projects.map((proj) => (
                          <div key={proj.id} className="space-y-1">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <span className="font-bold text-slate-900 text-[13px]">{proj.title}</span>
                              <span className="text-[11px] font-semibold text-slate-500 font-mono">
                                [{proj.techStack}]
                              </span>
                            </div>
                            <p className="text-slate-800 text-xs font-normal">{proj.description}</p>
                            <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-800 text-xs font-normal">
                              {proj.bullets.map((b, i) => (
                                <li key={i}>{b}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Education */}
                  {resumeForm.education && (
                    <section>
                      <h3 className="border-b border-slate-200 pb-1 text-xs font-black uppercase tracking-wider text-slate-900">
                        Education
                      </h3>
                      <p className="mt-2.5 font-semibold text-slate-800">{resumeForm.education}</p>
                    </section>
                  )}

                  {/* Certifications */}
                  {resumeForm.certifications && (
                    <section>
                      <h3 className="border-b border-slate-200 pb-1 text-xs font-black uppercase tracking-wider text-slate-900">
                        Certifications &amp; Accreditations
                      </h3>
                      <p className="mt-2.5 text-slate-800 font-normal leading-relaxed">
                        {resumeForm.certifications}
                      </p>
                    </section>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Rail: AI ATS Scoring & JD Compatibility */}
          <aside className="no-print space-y-4 lg:col-span-4">
            <div className="card-dibs p-5 bg-white/90 border border-white/90 rounded-3xl shadow-sm backdrop-blur-2xl space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                    AI ATS Readiness Score
                  </span>
                  <div className="text-[10px] text-slate-400 font-medium">
                    {atsAudit ? `${atsAudit.grade} · Live Audit (${atsAudit.provider})` : "Analyzing live resume..."}
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-extrabold border ${
                    (atsAudit?.ats_score ?? 0) >= 80
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}
                >
                  {atsAudit?.ats_score ?? assist?.ats_score ?? "—"} / 100
                </span>
              </div>

              {loadingSuggest && (
                <div className="rounded-xl bg-indigo-50 px-3 py-1.5 text-[11px] font-semibold text-indigo-700 animate-pulse">
                  ✦ AI is generating writing ideas...
                </div>
              )}

              {atsAudit?.summary_verdict && (
                <p className="text-[11px] text-slate-700 leading-relaxed bg-slate-50 border border-slate-200/70 rounded-xl p-2.5">
                  {atsAudit.summary_verdict}
                </p>
              )}

              <div className="space-y-2 pt-1">
                {(atsAudit?.ats_checklist || assist?.ats_checklist || []).map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-xs text-slate-800">
                    <CheckCircle2
                      className={`h-4 w-4 shrink-0 ${
                        item.passed ? "text-emerald-600" : "text-slate-300"
                      }`}
                    />
                    <span className={`font-medium ${item.passed ? "text-slate-800" : "text-slate-400"}`}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              {atsAudit && atsAudit.ai_recommendations.length > 0 && (
                <div className="rounded-xl bg-indigo-50/50 border border-indigo-100 p-3 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-900">
                    ✦ AI ATS Suggestions
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-700">
                    {atsAudit.ai_recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                type="button"
                disabled={auditingAts}
                onClick={() => void runAiAtsAudit()}
                className="w-full btn-dibs-primary text-xs py-2 justify-center disabled:opacity-60"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {auditingAts ? "Auditing with AI..." : "Re-Run Live AI ATS Audit"}
              </button>
            </div>

            <div className="card-dibs p-5 bg-white/90 border border-white/90 rounded-3xl shadow-sm backdrop-blur-2xl space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Sparkles className="h-4 w-4 text-[#4F46E5]" />
                Resume-to-JD Compatibility
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Compare your edited resume against active openings or custom job requirements.
              </p>

              <select
                value={selectedJobId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedJobId(id);
                  const found = jobs.find((j) => j.id === id);
                  if (found) setCustomJd(found.description);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 font-semibold outline-none focus:border-[#4F46E5]"
              >
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} — {j.companyName}
                  </option>
                ))}
              </select>

              <textarea
                rows={4}
                value={customJd}
                onChange={(e) => setCustomJd(e.target.value)}
                placeholder="Paste job description here..."
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 outline-none focus:border-[#4F46E5]"
              />

              <button
                type="button"
                onClick={() => void checkJdCompatibility()}
                className="w-full btn-dibs-secondary text-xs py-2 justify-center"
              >
                Compute Cosine Similarity
              </button>

              {compat && (
                <div className="space-y-2 rounded-2xl bg-slate-50 border border-slate-200 p-3.5 text-xs animate-in fade-in">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>JD Compatibility</span>
                    <span className="text-[#4F46E5] font-black text-sm">{compat.compatibility_score}%</span>
                  </div>
                  <div className="text-[11px] text-slate-700">
                    <strong className="text-slate-900">Matched:</strong> {compat.matched_keywords.join(", ") || "—"}
                  </div>
                  {compat.missing_keywords.length > 0 && (
                    <div className="text-[11px] text-amber-700">
                      <strong className="text-amber-900">Missing Keywords:</strong> {compat.missing_keywords.join(", ")}
                    </div>
                  )}
                  <ul className="list-disc space-y-1 pl-4 text-[11px] text-slate-600">
                    {compat.improvement_suggestions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
