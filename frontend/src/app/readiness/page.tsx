"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Award,
  BarChart2,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronRight,
  Circle,
  ExternalLink,
  FileCheck2,
  Mic,
  MicOff,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Upload,
  Zap,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  CertificationItem,
  PublicProfile,
  SkillAssessmentRecord,
  UserCertificationProgress,
  UserRoadmap,
} from "@/lib/types";

// ─── Diagnostic Questions ───────────────────────────────────────────────────
const DIAGNOSTIC_QUESTIONS = [
  {
    id: "dq-1",
    skill: "TypeScript",
    prompt:
      "Which TypeScript feature narrows a union type safely based on a literal field like `status: 'ok' | 'err'`?",
    options: [
      "Implicit any casting",
      "Discriminated union narrowing",
      "Global namespace merging",
      "Runtime eval",
    ],
    correct: 1,
  },
  {
    id: "dq-2",
    skill: "React",
    prompt: "Why does React require stable unique `key` props in dynamic lists?",
    options: [
      "To encrypt JSX props",
      "To reconcile DOM updates accurately without losing component state",
      "To compile CSS modules",
      "To skip virtual DOM diffing",
    ],
    correct: 1,
  },
  {
    id: "dq-3",
    skill: "Python",
    prompt:
      "In FastAPI, what handles automatic request payload validation and OpenAPI schema generation?",
    options: [
      "Uvicorn workers",
      "Pydantic BaseModel",
      "OS environment variables",
      "SQLite cursors",
    ],
    correct: 1,
  },
  {
    id: "dq-4",
    skill: "AWS",
    prompt:
      "In V-Link's layered architecture, which AWS service delivers managed GraphQL APIs with real-time subscriptions?",
    options: ["Amazon S3", "AWS AppSync", "Amazon CloudFront", "AWS IAM"],
    correct: 1,
  },
  {
    id: "dq-5",
    skill: "SQL",
    prompt: "Which SQL clause filters aggregated groups after a `GROUP BY` operation?",
    options: ["WHERE", "ORDER BY", "HAVING", "DISTINCT"],
    correct: 2,
  },
];

const OPTION_LABELS = ["A", "B", "C", "D"];

// Cert categories
const CERT_CATEGORIES = ["All", "Frontend", "Cloud", "AI/ML", "APIs"] as const;
type CertCategory = (typeof CERT_CATEGORIES)[number];

interface InterviewQuestion {
  id: string;
  category: string;
  question: string;
  expected_concepts: string[];
}

interface VerificationQuestion {
  id: string;
  prompt: string;
  code_snippet?: string | null;
  options: string[];
  correct_index: number;
  explanation: string;
}

// ─── Radar / Spider Chart ───────────────────────────────────────────────────
function RadarChart({ dims }: { dims: Record<string, number> }) {
  const labels = Object.keys(dims);
  const values = Object.values(dims);
  const n = labels.length;
  if (n < 3) return null;

  const cx = 120;
  const cy = 120;
  const r = 90;
  const levels = 4;

  function pointOnAxis(i: number, radius: number) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  }

  // Grid rings
  const gridRings = Array.from({ length: levels }, (_, lvl) => {
    const rr = (r * (lvl + 1)) / levels;
    const pts = Array.from({ length: n }, (_, i) => {
      const p = pointOnAxis(i, rr);
      return `${p.x},${p.y}`;
    }).join(" ");
    return pts;
  });

  // User data polygon
  const dataPoints = values.map((v, i) => {
    const p = pointOnAxis(i, (r * Math.min(v, 100)) / 100);
    return `${p.x},${p.y}`;
  });

  // Label positions (slightly outside the circle)
  const labelRadius = r + 22;

  return (
    <svg viewBox="0 0 240 240" className="w-full max-w-[240px] mx-auto">
      {/* Grid rings */}
      {gridRings.map((pts, lvl) => (
        <polygon
          key={lvl}
          points={pts}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="1"
        />
      ))}
      {/* Axis lines */}
      {labels.map((_, i) => {
        const p = pointOnAxis(i, r);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        );
      })}
      {/* Data polygon */}
      <polygon
        points={dataPoints.join(" ")}
        fill="rgba(99,102,241,0.18)"
        stroke="#6366f1"
        strokeWidth="2"
      />
      {/* Data dots */}
      {values.map((v, i) => {
        const p = pointOnAxis(i, (r * Math.min(v, 100)) / 100);
        return (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="#6366f1" />
        );
      })}
      {/* Labels */}
      {labels.map((lbl, i) => {
        const p = pointOnAxis(i, labelRadius);
        const anchor =
          p.x < cx - 2 ? "end" : p.x > cx + 2 ? "start" : "middle";
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize="8"
            fill="#475569"
            fontWeight="600"
          >
            {lbl}
          </text>
        );
      })}
    </svg>
  );
}

// ─── Circular Progress Ring ─────────────────────────────────────────────────
function ProgressRing({
  pct,
  size = 36,
  stroke = 3,
}: {
  pct: number;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={pct >= 100 ? "#10b981" : "#6366f1"}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

// ─── Score Counter Animation ────────────────────────────────────────────────
function AnimatedScore({ target }: { target: number }) {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const duration = 900;
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      setDisplayed(Math.round(progress * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target]);

  return <>{displayed}</>;
}

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

function ReadinessSuiteContent() {
  const searchParams = useSearchParams();
  const { user, setUser, setAuthModalOpen, refreshNotifications } = useAuth();
  const [tab, setTab] = useState<"diagnostic" | "roadmap" | "certs" | "ai-studio">(
    "diagnostic"
  );
  const [targetRole, setTargetRole] = useState("Full-Stack Software Engineer");
  const [jobFocusSkills, setJobFocusSkills] = useState<string[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submittingDiag, setSubmittingDiag] = useState(false);
  const [diagBanner, setDiagBanner] = useState("");
  const [currentQ, setCurrentQ] = useState(0);

  const [roadmap, setRoadmap] = useState<UserRoadmap | null>(null);
  const [certifications, setCertifications] = useState<CertificationItem[]>([]);
  const [certProgress, setCertProgress] = useState<UserCertificationProgress[]>([]);
  const [latestAssessment, setLatestAssessment] = useState<SkillAssessmentRecord | null>(null);
  const [certCategory, setCertCategory] = useState<CertCategory>("All");
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false);

  // AI Mock Interview state
  const [interviewQs, setInterviewQs] = useState<InterviewQuestion[]>([]);
  const [activeQIdx, setActiveQIdx] = useState(0);
  const [interviewAnswer, setInterviewAnswer] = useState("");
  const [startingInterview, setStartingInterview] = useState(false);
  const [evaluatingInterview, setEvaluatingInterview] = useState(false);
  const [isListening, setIsListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const [interviewFeedback, setInterviewFeedback] = useState<{
    score: number;
    clarity_score: number;
    technical_accuracy: number;
    concepts_covered: string[];
    concepts_missed: string[];
    feedback: string;
    sample_strong_answer: string;
  } | null>(null);

  // Certificate upload & verification state
  const [uploadCertTarget, setUploadCertTarget] = useState<string>("custom");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadProvider, setUploadProvider] = useState("");
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadingCert, setUploadingCert] = useState(false);
  const [certBanner, setCertBanner] = useState("");

  // Skill Verification Quiz state
  const [verifySkillName, setVerifySkillName] = useState("Python");
  const [verifyQs, setVerifyQs] = useState<VerificationQuestion[]>([]);
  const [verifyAnswers, setVerifyAnswers] = useState<Record<number, number>>({});
  const [verifyResult, setVerifyResult] = useState<{
    passed: boolean;
    score_percent: number;
    message: string;
  } | null>(null);

  // Earned badges (skills verified)
  const [earnedBadges, setEarnedBadges] = useState<string[]>([]);

  const loadReadinessData = useCallback(async () => {
    const res = await fetch("/api/readiness", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as {
        certifications: CertificationItem[];
        certProgress: UserCertificationProgress[];
        roadmap: UserRoadmap | null;
        latestAssessment: SkillAssessmentRecord | null;
      };
      setCertifications(data.certifications);
      setCertProgress(data.certProgress);
      setRoadmap(data.roadmap);
      setLatestAssessment(data.latestAssessment);
    }
  }, []);

  useEffect(() => {
    void loadReadinessData();
  }, [loadReadinessData]);

  useEffect(() => {
    const t = searchParams.get("tab");
    const role = searchParams.get("role");
    const skills = searchParams.get("skills");
    if (t === "ai-studio" || t === "roadmap" || t === "certs" || t === "diagnostic") {
      setTab(t);
    }
    if (role) {
      setTargetRole(role);
    }
    if (skills) {
      setJobFocusSkills(skills.split(",").map((s) => s.trim()).filter(Boolean));
    }
  }, [searchParams]);

  useEffect(() => {
    if (user?.targetRole && !searchParams.get("role")) {
      setTargetRole(user.targetRole);
    }
  }, [user?.targetRole, searchParams]);

  async function handleRunDiagnostic(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    const unansweredIdx = DIAGNOSTIC_QUESTIONS.findIndex((q) => answers[q.id] === undefined);
    if (unansweredIdx !== -1) {
      setCurrentQ(unansweredIdx);
      setDiagBanner(
        `Please answer all ${DIAGNOSTIC_QUESTIONS.length} questions before generating your DRI score (Question ${unansweredIdx + 1} is unanswered).`
      );
      return;
    }
    setSubmittingDiag(true);
    setDiagBanner("");
    try {
      const diagnosticAnswers = DIAGNOSTIC_QUESTIONS.map((q) => ({
        question_id: q.id,
        skill: q.skill,
        selected_option: answers[q.id],
        correct_option: q.correct,
        confidence: 4,
      }));
      const res = await fetch("/api/readiness", {
        method: "POST",
        headers: getAiHeaders(),
        body: JSON.stringify({ targetRole, weeklyHours: 10, diagnosticAnswers }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          user: PublicProfile;
          assessment: SkillAssessmentRecord;
          roadmap: UserRoadmap;
          aiSource: string;
        };
        setUser(data.user);
        setLatestAssessment(data.assessment);
        setRoadmap(data.roadmap);
        setDiagBanner(
          `Diagnostic complete! Your ${targetRole} Readiness Score is now ${data.user.readinessScore}/100 (${data.user.readinessTier}) · Engine: ${data.aiSource}.`
        );
        await refreshNotifications();
      }
    } finally {
      setSubmittingDiag(false);
    }
  }

  async function handleGenerateRoadmap() {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    setGeneratingRoadmap(true);
    try {
      const res = await fetch("/api/readiness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole,
          weeklyHours: 10,
          diagnosticAnswers: DIAGNOSTIC_QUESTIONS.map((q) => ({
            question_id: q.id,
            skill: q.skill,
            selected_option: answers[q.id] ?? 0,
            correct_option: q.correct,
            confidence: 4,
          })),
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          user: PublicProfile;
          assessment: SkillAssessmentRecord;
          roadmap: UserRoadmap;
        };
        setUser(data.user);
        setLatestAssessment(data.assessment);
        setRoadmap(data.roadmap);
      }
    } finally {
      setGeneratingRoadmap(false);
    }
  }

  async function handleToggleMilestone(milestoneId: string) {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    const res = await fetch("/api/readiness", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_milestone", milestoneId }),
    });
    if (res.ok) {
      const data = (await res.json()) as { roadmap: UserRoadmap; user: PublicProfile };
      setRoadmap(data.roadmap);
      setUser(data.user);
    }
  }

  async function handleCertProgress(certId: string, progress: number) {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    const res = await fetch("/api/readiness", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_cert", certId, progress }),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        certProgress: UserCertificationProgress[];
        user: PublicProfile;
      };
      setCertProgress(data.certProgress);
      setUser(data.user);
    }
  }

  async function handleUploadCert(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    const matchedCatalog = certifications.find((c) => c.id === uploadCertTarget);
    const finalTitle = matchedCatalog ? matchedCatalog.title : uploadTitle.trim();
    const finalProvider = matchedCatalog ? matchedCatalog.provider : uploadProvider.trim();
    if (!finalTitle) {
      setCertBanner("Please enter a certificate name or select a course.");
      return;
    }
    if (!uploadFileName && !uploadUrl.trim()) {
      setCertBanner("Please upload a certificate file (PDF/Image) or provide a credential verification URL.");
      return;
    }
    setUploadingCert(true);
    setCertBanner("");
    try {
      const res = await fetch("/api/readiness", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upload_cert",
          certId: matchedCatalog ? matchedCatalog.id : `custom-${Date.now()}`,
          customTitle: finalTitle,
          customProvider: finalProvider || "External / Verified Issuer",
          credentialUrl: uploadUrl.trim() || undefined,
          certificateFileName: uploadFileName || undefined,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          certProgress: UserCertificationProgress[];
          user: PublicProfile;
        };
        setCertProgress(data.certProgress);
        setUser(data.user);
        setUploadTitle("");
        setUploadProvider("");
        setUploadUrl("");
        setUploadFileName("");
        setCertBanner(`✓ "${finalTitle}" uploaded & verified on your profile!`);
        await refreshNotifications();
      }
    } finally {
      setUploadingCert(false);
    }
  }

  function toggleMic() {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      setDiagBanner("Voice mic is not supported in this browser. Please use Chrome/Edge or type your answer.");
      return;
    }
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInterviewAnswer(transcript);
    };
    recognition.onerror = () => {
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }

  async function startMockInterview() {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    setStartingInterview(true);
    setInterviewFeedback(null);
    setInterviewAnswer("");
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    try {
      const focus = jobFocusSkills?.length
        ? jobFocusSkills
        : user.skills.slice(0, 4).map((s) => s.name);
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: getAiHeaders(),
        body: JSON.stringify({
          task: "mock-interview-start",
          payload: { targetRole, focusSkills: focus },
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { data: { questions: InterviewQuestion[] } };
        setInterviewQs(data.data.questions);
        setActiveQIdx(0);
      }
    } finally {
      setStartingInterview(false);
    }
  }

  async function evaluateInterviewAnswer() {
    const q = interviewQs[activeQIdx];
    if (!q || !interviewAnswer.trim()) return;
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    setEvaluatingInterview(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: getAiHeaders(),
        body: JSON.stringify({
          task: "mock-interview-evaluate",
          payload: {
            targetRole,
            question: q.question,
            expectedConcepts: q.expected_concepts,
            answer: interviewAnswer,
          },
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { data: typeof interviewFeedback };
        setInterviewFeedback(data.data);
      }
    } finally {
      setEvaluatingInterview(false);
    }
  }

  async function loadVerifyQuiz(skill: string) {
    setVerifySkillName(skill);
    setVerifyResult(null);
    setVerifyAnswers({});
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: "verify-skill-questions", payload: { skill } }),
    });
    if (res.ok) {
      const data = (await res.json()) as { data: { questions: VerificationQuestion[] } };
      setVerifyQs(data.data.questions);
    }
  }

  async function submitVerifyQuiz() {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    const ansArr = verifyQs.map((_, idx) => verifyAnswers[idx] ?? 0);
    const correctArr = verifyQs.map((q) => q.correct_index);
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: "verify-skill-submit",
        payload: { skill: verifySkillName, answers: ansArr, correctIndices: correctArr },
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        data: { passed: boolean; score_percent: number; message: string };
        user: PublicProfile | null;
      };
      setVerifyResult(data.data);
      if (data.user) setUser(data.user);
      if (data.data.passed && !earnedBadges.includes(verifySkillName)) {
        setEarnedBadges((prev) => [...prev, verifySkillName]);
      }
      await refreshNotifications();
    }
  }

  const dims = user?.readinessDimensions || latestAssessment?.dimensions || {};
  const score = user?.readinessScore ?? 0;

  // Roadmap completion stats
  const totalMs = roadmap?.milestones.length ?? 0;
  const doneMs = roadmap?.milestones.filter((m) => m.completed).length ?? 0;
  const completionPct = totalMs > 0 ? Math.round((doneMs / totalMs) * 100) : 0;

  // Filtered certs
  const filteredCerts =
    certCategory === "All"
      ? certifications
      : certifications.filter(
          (c) => c.category?.toLowerCase() === certCategory.toLowerCase()
        );

  // User skill names for verify
  const userSkillNames =
    user?.skills.map((s) => s.name).slice(0, 10) ?? ["Python", "TypeScript", "React", "AWS"];

  // Phase colors
  const phaseColors: Record<string, string> = {
    foundation: "bg-blue-50 border-blue-200 text-blue-800",
    intermediate: "bg-violet-50 border-violet-200 text-violet-800",
    advanced: "bg-orange-50 border-orange-200 text-orange-800",
    capstone: "bg-emerald-50 border-emerald-200 text-emerald-800",
  };
  function phaseColor(phase: string) {
    const key = phase.toLowerCase().split(" ")[0];
    return phaseColors[key] ?? "bg-slate-50/80 border border-slate-200 text-slate-800 font-medium";
  }

  return (
    <div className="space-y-6">
      {/* Header + Tab Bar */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 glass-panel p-6 shadow-sm lg:flex-row lg:items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-bold">
            Career Readiness Suite &amp; AI Intelligence Layer
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Assess readiness, follow your milestone roadmap, track free certifications, and verify
            skills with AI coaching.
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 border border-slate-200/60 p-1 text-xs font-semibold">
          {(
            [
              ["diagnostic", "Diagnostic & Dashboard"],
              ["roadmap", "Personalised Roadmap"],
              ["certs", "Certifications Hub"],
              ["ai-studio", "AI Interview & Verify"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-lg px-3 py-2 transition ${
                tab === id ? "glass-panel text-slate-900 font-bold shadow-sm" : "text-slate-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {diagBanner && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
          {diagBanner}
        </div>
      )}

      {/* ── Direct Redirect to Job Maker / Opportunity Portal ── */}
      <div className="card-dibs p-5 bg-gradient-to-r from-slate-50 via-white to-indigo-50/40 border border-slate-200/90 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm backdrop-blur-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="badge-coral text-[10px] uppercase font-mono tracking-wider font-bold">
              Live Industry Gateway
            </span>
            <span className="text-xs font-black text-slate-900 tracking-tight">
              Connect Demonstrable Readiness Directly to Hiring
            </span>
          </div>
          <p className="text-xs text-slate-600 font-medium">
            Match your verified DRI score directly with corporate openings or publish custom opportunities in the live Job Maker Studio.
          </p>
        </div>
        <Link
          href="/jobs?tab=post-job"
          className="btn-dibs-primary flex items-center gap-2 text-xs py-2.5 px-4.5 shrink-0 shadow-md transition hover:scale-102"
        >
          <Sparkles className="h-4 w-4" />
          <span>Go to Job Maker Portal</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* ══════════ DIAGNOSTIC TAB ══════════ */}
      {tab === "diagnostic" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Dashboard Summary */}
          <div className="space-y-4 lg:col-span-5">
            <div className="rounded-2xl border border-slate-200/80 glass-panel p-6 shadow-sm">
              {/* Score + tier */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    AI Readiness Signal
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-4xl font-black text-slate-900 font-bold">
                      {score > 0 ? <AnimatedScore target={score} /> : "—"}
                    </span>
                    <span className="text-sm font-semibold text-slate-500">/ 100</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      score > 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800 border border-amber-200"
                    }`}
                  >
                    {score > 0 ? (user?.readinessTier || "Evaluated") : "Diagnostic Pending"}
                  </span>
                  {score >= 65 && (
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                      🏆 Top Cohort Bracket ({targetRole.split(" ")[0]})
                    </span>
                  )}
                </div>
              </div>

              {score === 0 && !latestAssessment ? (
                <div className="mt-5 rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 p-5 text-center space-y-2">
                  <Sparkles className="h-7 w-7 text-amber-500 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-900">
                    AI DRI Score &amp; Report Not Generated Yet
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    New profiles start at <strong>Pending</strong> so your score reflects verified ability rather than an arbitrary guess. Complete the 5-question diagnostic to generate your personalized AI DRI Report!
                  </p>
                </div>
              ) : (
                <>
                  {/* Radar Chart */}
                  {Object.keys(dims).length >= 3 && (
                    <div className="mt-4">
                      <RadarChart dims={dims} />
                    </div>
                  )}

                  {/* Bar dims */}
                  <div className="mt-4 space-y-2.5">
                    {Object.entries(dims).map(([label, val]) => (
                      <div key={label}>
                        <div className="flex justify-between text-xs font-medium text-slate-800">
                          <span>{label}</span>
                          <span className="font-bold">{val}%</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/60">
                          <div
                            className="h-full rounded-full bg-indigo-500 transition-all"
                            style={{ width: `${val}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* AI-Generated DRI Diagnostic Report */}
              {latestAssessment && (
                <div className="mt-5 space-y-3 rounded-2xl border border-indigo-200/80 bg-indigo-50/40 p-4 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-extrabold text-slate-900">
                      <Sparkles className="h-4 w-4 text-indigo-600" />
                      <span>AI DRI Diagnostic Report</span>
                    </div>
                    {latestAssessment.aiSource && (
                      <span className="rounded-full bg-white border border-indigo-200 px-2 py-0.5 text-[10px] font-mono font-semibold text-indigo-700">
                        {latestAssessment.aiSource}
                      </span>
                    )}
                  </div>

                  {latestAssessment.aiReport?.executiveSummary && (
                    <p className="text-slate-700 leading-relaxed font-medium">
                      {latestAssessment.aiReport.executiveSummary}
                    </p>
                  )}

                  {latestAssessment.aiReport?.strengths && latestAssessment.aiReport.strengths.length > 0 && (
                    <div>
                      <div className="font-bold text-emerald-800 mb-1">✓ Verified Strengths</div>
                      <ul className="list-disc space-y-0.5 pl-4 text-slate-700">
                        {latestAssessment.aiReport.strengths.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {latestAssessment.aiReport?.criticalGaps && latestAssessment.aiReport.criticalGaps.length > 0 && (
                    <div>
                      <div className="font-bold text-amber-800 mb-1">⚠ Focus Areas &amp; Skill Gaps</div>
                      <ul className="list-disc space-y-0.5 pl-4 text-slate-700">
                        {latestAssessment.aiReport.criticalGaps.map((g, idx) => (
                          <li key={idx}>{g}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {latestAssessment.recommendations && latestAssessment.recommendations.length > 0 && (
                    <div>
                      <div className="font-bold text-indigo-900 mb-1">⚡ AI Action Plan</div>
                      <ul className="list-disc space-y-0.5 pl-4 text-slate-700">
                        {latestAssessment.recommendations.map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {latestAssessment.aiReport?.benchmarkComparison && (
                    <div className="rounded-lg bg-white/80 border border-indigo-100 p-2 text-[11px] font-semibold text-indigo-900">
                      📊 {latestAssessment.aiReport.benchmarkComparison}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <Link
                  href="/resume"
                  className="flex-1 rounded-xl border border-slate-200/80 py-2 text-center text-xs font-semibold text-slate-800 hover:bg-slate-50/80 border border-slate-200/60"
                >
                  Open ATS Resume
                </Link>
                <Link
                  href="/jobs"
                  className="flex-1 rounded-xl bg-slate-100 py-2 text-center text-xs font-semibold text-slate-900 hover:bg-slate-800"
                >
                  Browse Matched Jobs
                </Link>
              </div>
            </div>
          </div>

          {/* Interactive Skill Diagnostic */}
          <form
            onSubmit={handleRunDiagnostic}
            className="space-y-4 rounded-2xl border border-slate-200/80 glass-panel p-6 shadow-sm lg:col-span-7"
          >
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-base font-bold text-slate-900 font-bold">Role-Based Skill Diagnostic</h2>
                <p className="text-xs text-slate-500 font-mono">
                  Evaluates your target role alignment, skills, projects, and technical accuracy.
                </p>
              </div>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                aria-label="Target Role"
                className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-800 font-medium"
              >
                <option>Full-Stack Software Engineer</option>
                <option>AI/ML Engineer</option>
                <option>Cloud &amp; DevOps Engineer</option>
                <option>Backend Engineer</option>
                <option>Frontend Engineer</option>
                <option>Data Engineer</option>
              </select>
            </div>

            {/* Progress indicator */}
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {DIAGNOSTIC_QUESTIONS.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentQ(i)}
                    className={`h-2 rounded-full transition-all ${
                      i === currentQ
                        ? "w-6 bg-indigo-500"
                        : answers[DIAGNOSTIC_QUESTIONS[i].id] !== undefined
                        ? "w-2 bg-emerald-400"
                        : "w-2 bg-slate-200"
                    }`}
                  />
                ))}
              </div>
              <span className="text-[11px] font-semibold text-slate-500 font-mono">
                Question {currentQ + 1} of {DIAGNOSTIC_QUESTIONS.length}
              </span>
            </div>

            {/* Single question view */}
            {(() => {
              const q = DIAGNOSTIC_QUESTIONS[currentQ];
              return (
                <div key={q.id} className="rounded-xl border border-slate-200/80 p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900 font-bold">
                      Q{currentQ + 1}. {q.prompt}
                    </span>
                    <span className="ml-2 shrink-0 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                      {q.skill}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {q.options.map((opt, optIdx) => {
                      const checked = answers[q.id] === optIdx;
                      return (
                        <label
                          key={opt}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-xs transition ${
                            checked
                              ? "border-indigo-400 bg-indigo-50 font-semibold text-indigo-900"
                              : "border-slate-200/80 text-slate-800 hover:bg-slate-50/80 border border-slate-200/60"
                          }`}
                        >
                          <input
                            type="radio"
                            name={q.id}
                            checked={checked}
                            onChange={() =>
                              setAnswers((prev) => ({ ...prev, [q.id]: optIdx }))
                            }
                            className="sr-only"
                          />
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                              checked
                                ? "border-indigo-600 bg-indigo-600 text-white"
                                : "border-slate-300 text-slate-500 font-mono"
                            }`}
                          >
                            {OPTION_LABELS[optIdx]}
                          </span>
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Nav between questions */}
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={currentQ === 0}
                onClick={() => setCurrentQ((i) => i - 1)}
                className="rounded-xl border border-slate-200/80 px-4 py-2 text-xs font-semibold text-slate-800 disabled:opacity-40 hover:bg-slate-50/80 border border-slate-200/60"
              >
                ← Prev
              </button>
              <span className="text-[11px] font-mono text-slate-500">
                {Object.keys(answers).length}/{DIAGNOSTIC_QUESTIONS.length} answered
              </span>
              {currentQ < DIAGNOSTIC_QUESTIONS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentQ((i) => i + 1)}
                  className="flex items-center gap-1 rounded-xl border border-slate-200/80 px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50/80 border border-slate-200/60"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submittingDiag || Object.keys(answers).length < DIAGNOSTIC_QUESTIONS.length}
                  className="flex items-center gap-2 rounded-xl btn-dibs-primary px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50"
                >
                  <Target className="h-4 w-4" />
                  {submittingDiag ? "Scoring..." : "Submit & Get Score"}
                </button>
              )}
            </div>

            {/* Full submit at bottom only unlocked when all 5 answered */}
            <button
              type="submit"
              disabled={submittingDiag || Object.keys(answers).length < DIAGNOSTIC_QUESTIONS.length}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-xs font-bold text-white shadow-sm hover:bg-slate-800 disabled:opacity-40"
            >
              <BarChart2 className="h-4 w-4" />
              {submittingDiag
                ? "Scoring via AI Service..."
                : Object.keys(answers).length < DIAGNOSTIC_QUESTIONS.length
                ? `Answer all ${DIAGNOSTIC_QUESTIONS.length} questions to generate DRI Score (${Object.keys(answers).length}/${DIAGNOSTIC_QUESTIONS.length})`
                : "Complete Skill Diagnostic & Generate AI DRI Score"}
            </button>
          </form>
        </div>
      )}

      {/* ══════════ ROADMAP TAB ══════════ */}
      {tab === "roadmap" && (
        <div className="rounded-2xl border border-slate-200/80 glass-panel p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-bold">
                Personalised Roadmap · {roadmap?.targetRole || targetRole}
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                Estimated completion: {roadmap?.estimatedWeeks || 6} weeks · Check off milestones
                to boost readiness.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {roadmap && (
                <div className="flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-1.5">
                  <span className="text-xs font-bold text-indigo-700">
                    {doneMs}/{totalMs} milestones
                  </span>
                  <span className="text-xs font-black text-indigo-900">{completionPct}% complete</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => void handleGenerateRoadmap()}
                disabled={generatingRoadmap}
                className="flex items-center gap-1.5 rounded-xl btn-dibs-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${generatingRoadmap ? "animate-spin" : ""}`} />
                {generatingRoadmap ? "Generating..." : "Generate New Roadmap"}
              </button>
            </div>
          </div>

          {!roadmap ? (
            <div className="rounded-xl bg-slate-50/80 border border-slate-200/60 p-10 text-center">
              <BarChart2 className="mx-auto mb-3 h-10 w-10 text-slate-600" />
              <p className="text-sm font-semibold text-slate-600">No roadmap yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Complete the Skill Diagnostic or click Generate New Roadmap to get started.
              </p>
            </div>
          ) : (
            <div className="relative pl-6">
              {/* Timeline vertical line */}
              <div className="absolute left-2 top-0 h-full w-0.5 bg-slate-200" />
              <div className="space-y-5">
                {roadmap.milestones.map((ms, idx) => {
                  const isFirst =
                    idx === 0 ||
                    roadmap.milestones[idx - 1].phase !== ms.phase;
                  return (
                    <React.Fragment key={ms.id}>
                      {isFirst && (
                        <div
                          className={`-ml-6 mb-2 rounded-lg border px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest ${phaseColor(
                            ms.phase
                          )}`}
                        >
                          {ms.phase}
                        </div>
                      )}
                      <div className="relative flex gap-4">
                        {/* Milestone circle on timeline */}
                        <button
                          type="button"
                          onClick={() => void handleToggleMilestone(ms.id)}
                          aria-label={`Toggle ${ms.title}`}
                          className="absolute -left-6 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 glass-panel transition"
                          style={{
                            borderColor: ms.completed ? "#10b981" : "#cbd5e1",
                          }}
                        >
                          {ms.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Circle className="h-4 w-4 text-slate-600" />
                          )}
                        </button>

                        {/* Card */}
                        <div
                          className={`flex-1 rounded-2xl border p-4 transition ${
                            ms.completed
                              ? "border-emerald-200 bg-emerald-50/40"
                              : "border-slate-200/80 glass-panel"
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                                ~{ms.estimated_hours} hrs
                              </span>
                              <h3 className="text-sm font-bold text-slate-900 font-bold">{ms.title}</h3>
                              <p className="mt-1 text-xs text-slate-600">{ms.description}</p>
                              <p className="mt-2 text-[11px] font-semibold text-slate-800">
                                Deliverable: {ms.deliverable}
                              </p>
                            </div>
                            {ms.completed && (
                              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                ✓ Done
                              </span>
                            )}
                          </div>
                          {/* Skills */}
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {ms.skills_covered.map((s) => (
                              <span
                                key={s}
                                className="chip rounded-md bg-slate-100 border border-slate-200/60 px-2 py-0.5 text-[11px] font-medium text-slate-800"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                          {/* Resource chips */}
                          {ms.resources.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {ms.resources.map((r) => (
                                <a
                                  key={r.title}
                                  href={r.url}
                                  target={r.url.startsWith("http") ? "_blank" : undefined}
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  {r.title}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════ CERTIFICATIONS TAB ══════════ */}
      {tab === "certs" && (
        <div className="space-y-5">
          {/* Upload & Verify Certificate Section */}
          <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/40 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-indigo-600" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Upload &amp; Verify Certificate Proof</h2>
                  <p className="text-[11px] text-slate-600">
                    Upload your certificate file (PDF/PNG/JPG) or credential verification URL to verify your skill on V-Link.
                  </p>
                </div>
              </div>
            </div>

            {certBanner && (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800">
                {certBanner}
              </div>
            )}

            <form onSubmit={handleUploadCert} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                  Certificate Course
                </label>
                <select
                  value={uploadCertTarget}
                  onChange={(e) => setUploadCertTarget(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-400"
                >
                  <option value="custom">+ Custom / External Certificate</option>
                  {certifications.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.provider})
                    </option>
                  ))}
                </select>
              </div>

              {uploadCertTarget === "custom" ? (
                <>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                      Certificate Name *
                    </label>
                    <input
                      type="text"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      placeholder="e.g. AWS Certified Cloud Practitioner"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                      Issuing Organization
                    </label>
                    <input
                      type="text"
                      value={uploadProvider}
                      onChange={(e) => setUploadProvider(e.target.value)}
                      placeholder="e.g. AWS, Coursera, Google, NPTEL"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-400"
                    />
                  </div>
                </>
              ) : null}

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                  Credential Verification URL (Optional)
                </label>
                <input
                  type="url"
                  value={uploadUrl}
                  onChange={(e) => setUploadUrl(e.target.value)}
                  placeholder="https://coursera.org/verify/..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                  Certificate File (PDF, PNG, JPG)
                </label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setUploadFileName(e.target.files?.[0]?.name || "")}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-indigo-700"
                />
                {uploadFileName && (
                  <p className="mt-1 text-[11px] font-medium text-emerald-700">
                    Selected: {uploadFileName}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={uploadingCert}
                  className="flex items-center gap-2 rounded-xl btn-dibs-primary px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-60"
                >
                  <FileCheck2 className="h-4 w-4" />
                  {uploadingCert ? "Verifying..." : "Submit & Verify Certificate"}
                </button>
              </div>
            </form>

            {/* Uploaded / Verified Certificates List */}
            {certProgress.filter((cp) => cp.certificateFileName || cp.credentialUrl || cp.customTitle).length > 0 && (
              <div className="mt-4 border-t border-indigo-200/60 pt-3">
                <h3 className="text-xs font-bold text-slate-800 mb-2">Your Verified Certificate Proofs</h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {certProgress
                    .filter((cp) => cp.certificateFileName || cp.credentialUrl || cp.customTitle)
                    .map((cp) => {
                      const catCert = certifications.find((c) => c.id === cp.certId);
                      return (
                        <div
                          key={cp.certId}
                          className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">
                              {cp.customTitle || catCert?.title || cp.certId}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {cp.customProvider || catCert?.provider || "Verified Issuer"}
                              {cp.certificateFileName ? ` · 📄 ${cp.certificateFileName}` : ""}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {cp.credentialUrl && (
                              <a
                                href={cp.credentialUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-100"
                              >
                                Verify Link
                              </a>
                            )}
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              ✓ Verified
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap gap-1.5 rounded-xl glass-panel p-2 shadow-sm border border-slate-200/80">
            {CERT_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCertCategory(cat)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  certCategory === cat
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 border border-slate-200/60"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Skill gaps for "Recommended" logic */}
          {(() => {
            const skillGapNames = new Set(
              (latestAssessment?.missingCoreSkills || (latestAssessment as unknown as { skillGaps?: string[] })?.skillGaps || []).map((g: string) => g.toLowerCase())
            );
            return (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {filteredCerts.map((cert) => {
                  const prog = certProgress.find((p) => p.certId === cert.id);
                  const pct = prog?.progress ?? 0;
                  const isCompleted = pct >= 100;
                  const isRecommended = cert.skills.some((sk) =>
                    skillGapNames.has(sk.toLowerCase())
                  );

                  return (
                    <div
                      key={cert.id}
                      className={`flex flex-col justify-between rounded-2xl border p-5 shadow-sm transition ${
                        isCompleted
                          ? "border-amber-200 bg-amber-50/30"
                          : "border-slate-200/80 glass-panel"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                                Free · {cert.provider}
                              </span>
                              {isCompleted && (
                                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                  ✓ Completed
                                </span>
                              )}
                              {isRecommended && !isCompleted && (
                                <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                                  ⭐ Recommended for you
                                </span>
                              )}
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <ProgressRing pct={pct} />
                              <h3 className="text-sm font-bold text-slate-900 font-bold">{cert.title}</h3>
                            </div>
                            <p className="mt-0.5 text-[11px] text-slate-500 font-mono">
                              {cert.category} · {cert.duration}
                            </p>
                          </div>
                          {isCompleted ? (
                            <Trophy className="h-5 w-5 text-amber-500 shrink-0" />
                          ) : (
                            <BookOpen className="h-5 w-5 text-indigo-500 shrink-0" />
                          )}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {cert.skills.map((sk) => (
                            <span
                              key={sk}
                              className="rounded-md bg-slate-100 border border-slate-200/60 px-2 py-0.5 text-[11px] text-slate-800"
                            >
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 border-t border-slate-200/60 pt-3">
                        <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
                          <span>{pct}% complete</span>
                          <a
                            href={cert.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-indigo-600 hover:underline"
                          >
                            Open Course <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={pct}
                            onChange={(e) =>
                              void handleCertProgress(cert.id, Number(e.target.value))
                            }
                            className="flex-1 accent-indigo-600"
                          />
                          <button
                            type="button"
                            onClick={() => void handleCertProgress(cert.id, 100)}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                              isCompleted
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-900"
                            }`}
                          >
                            {isCompleted ? "✓ Done" : "Mark Done"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ══════════ AI STUDIO TAB ══════════ */}
      {tab === "ai-studio" && (
        <div className="space-y-6">
          {/* Earned Badges */}
          {earnedBadges.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold text-amber-800">
                <Trophy className="h-4 w-4" /> Earned Verified Badges
              </div>
              <div className="flex flex-wrap gap-2">
                {earnedBadges.map((b) => (
                  <span
                    key={b}
                    className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900"
                  >
                    🏅 {b}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* ── Mock Interview (left) ── */}
            <div className="rounded-2xl border border-slate-200/80 glass-panel p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-indigo-600" />
                  <h2 className="text-base font-bold text-slate-900 font-bold">AI Mock Interview</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                    PRO
                  </span>
                  <button
                    type="button"
                    onClick={() => void startMockInterview()}
                    disabled={startingInterview}
                    className="rounded-xl btn-dibs-primary px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {startingInterview ? "Starting..." : interviewQs.length > 0 ? "Restart Session" : "Start Session"}
                  </button>
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-500 font-mono">
                Practice role-specific technical questions for <strong className="text-slate-700">{targetRole}</strong>{jobFocusSkills?.length ? ` (${jobFocusSkills.join(", ")})` : ""} and get structured AI feedback.
              </p>

              {interviewQs.length > 0 && (
                <div className="mt-4 space-y-3">
                  {/* Stepper */}
                  <div className="flex items-center gap-2">
                    {interviewQs.map((_, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                            i < activeQIdx
                              ? "bg-emerald-500 text-slate-900"
                              : i === activeQIdx
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-100 border border-slate-200/60 text-slate-500 font-mono"
                          }`}
                        >
                          {i < activeQIdx ? "✓" : i + 1}
                        </div>
                        {i < interviewQs.length - 1 && (
                          <div
                            className={`h-0.5 w-6 ${i < activeQIdx ? "bg-emerald-400" : "bg-slate-200"}`}
                          />
                        )}
                      </div>
                    ))}
                    <span className="ml-1 text-[11px] font-semibold text-slate-500 font-mono">
                      Question {activeQIdx + 1}/{interviewQs.length}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 font-mono">
                    <span className="rounded-md bg-slate-100 border border-slate-200/60 px-2 py-0.5">
                      {interviewQs[activeQIdx].category}
                    </span>
                    <button
                      type="button"
                      onClick={toggleMic}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition ${
                        isListening
                          ? "bg-red-100 text-red-700 border border-red-300 animate-pulse"
                          : "bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
                      }`}
                    >
                      {isListening ? (
                        <>
                          <MicOff className="h-3.5 w-3.5" /> Stop Mic
                        </>
                      ) : (
                        <>
                          <Mic className="h-3.5 w-3.5" /> Answer with Mic
                        </>
                      )}
                    </button>
                  </div>
                  <div className="rounded-xl bg-slate-50/80 border border-slate-200/60 p-3.5 text-sm font-semibold text-slate-900 font-bold">
                    {interviewQs[activeQIdx].question}
                  </div>
                  <div className="relative">
                    <textarea
                      rows={4}
                      value={interviewAnswer}
                      onChange={(e) => setInterviewAnswer(e.target.value)}
                      placeholder={isListening ? "Listening... speak your answer clearly." : "Type or click the Mic button to speak your technical response..."}
                      className="w-full rounded-xl border border-slate-200/80 p-3 pr-12 text-xs outline-none focus:border-indigo-400"
                    />
                    <button
                      type="button"
                      onClick={toggleMic}
                      title={isListening ? "Stop voice recording" : "Speak answer using microphone"}
                      aria-label={isListening ? "Stop voice recording" : "Speak answer using microphone"}
                      className={`absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full shadow-sm transition ${
                        isListening
                          ? "bg-red-600 text-white animate-pulse"
                          : "bg-indigo-600 text-white hover:bg-indigo-700"
                      }`}
                    >
                      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void evaluateInterviewAnswer()}
                      disabled={evaluatingInterview || !interviewAnswer.trim()}
                      className="rounded-xl btn-dibs-primary px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {evaluatingInterview ? "Evaluating..." : "Evaluate Answer"}
                    </button>
                    {activeQIdx + 1 < interviewQs.length && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveQIdx((i) => i + 1);
                          setInterviewAnswer("");
                          setInterviewFeedback(null);
                        }}
                        className="flex items-center gap-1 rounded-xl border border-slate-200/80 px-4 py-2 text-xs font-semibold text-slate-800"
                      >
                        Next <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {interviewFeedback && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs space-y-3">
                      <div className="font-bold text-emerald-900 text-sm">
                        Score: {interviewFeedback.score}/100
                      </div>
                      {/* Color-coded score bars */}
                      {[
                        { label: "Clarity", val: interviewFeedback.clarity_score, color: "bg-blue-500" },
                        {
                          label: "Technical Accuracy",
                          val: interviewFeedback.technical_accuracy,
                          color: "bg-indigo-500",
                        },
                      ].map(({ label, val, color }) => (
                        <div key={label}>
                          <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                            <span>{label}</span>
                            <span>{val}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={`h-full rounded-full ${color} transition-all`}
                              style={{ width: `${val}%` }}
                            />
                          </div>
                        </div>
                      ))}
                      <p className="text-slate-800">{interviewFeedback.feedback}</p>
                      {interviewFeedback.concepts_missed.length > 0 && (
                        <div>
                          <span className="font-semibold text-amber-700">Missed concepts: </span>
                          {interviewFeedback.concepts_missed.join(", ")}
                        </div>
                      )}
                      <p className="rounded-lg glass-panel p-2.5 text-[11px] text-slate-600">
                        <strong>Strong Reference Answer:</strong>{" "}
                        {interviewFeedback.sample_strong_answer}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Voice & Speech Practice Assist */}
              <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3.5 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#4F46E5] text-white">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900">
                      ✦ Speech & Voice Dictation Assist
                    </span>
                    <p className="text-[11px] text-slate-600">
                      Practice speaking aloud. Use one-click speech simulator to insert a realistic technical response.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const sample = (interviewQs[activeQIdx]?.expected_concepts?.length)
                      ? ('In our microservices architecture, we handle this by ensuring high availability and low latency with ' + interviewQs[activeQIdx].expected_concepts.join(', ') + ', decoupling sync dependencies with background queues.')
                      : 'We handle this by establishing isolated service boundaries and applying exponential backoff.';
                    setInterviewAnswer(sample);
                  }}
                  className="rounded-xl border border-orange-300 bg-white px-3 py-1.5 text-xs font-bold text-[#4F46E5] hover:bg-orange-50 transition shadow-2xs shrink-0"
                >
                  Insert Sample Voice Dictation
                </button>
              </div>
            </div>

            {/* ── Skill Verification (right) ── */}
            <div className="rounded-2xl border border-slate-200/80 glass-panel p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-base font-bold text-slate-900 font-bold">Skill Verification</h2>
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-500 font-mono">
                Pass a quick concept quiz (≥67%) to earn a Verified Skill Badge on your profile.
              </p>

              {/* All user skills */}
              <div className="mt-3 flex flex-wrap gap-2">
                {userSkillNames.map((sk) => (
                  <button
                    key={sk}
                    type="button"
                    onClick={() => void loadVerifyQuiz(sk)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                      verifySkillName === sk && verifyQs.length > 0
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-slate-200/80 bg-slate-50/80 border border-slate-200/60 text-slate-800 hover:bg-slate-100 border border-slate-200/60"
                    }`}
                  >
                    {earnedBadges.includes(sk) ? "🏅 " : ""}Verify {sk}
                  </button>
                ))}
              </div>

              {verifyQs.length > 0 && (
                <div className="mt-4 space-y-3">
                  {verifyQs.map((vq, idx) => (
                    <div key={vq.id} className="rounded-xl border border-slate-200/80 p-3.5 text-xs">
                      <div className="font-bold text-slate-900 font-bold">
                        {idx + 1}. {vq.prompt}
                      </div>
                      {vq.code_snippet && (
                        <pre className="mt-1.5 overflow-x-auto rounded-lg bg-slate-100 p-2 text-[11px] text-emerald-300">
                          {vq.code_snippet}
                        </pre>
                      )}
                      <div className="mt-2 space-y-1.5">
                        {vq.options.map((opt, optIdx) => {
                          const checked = verifyAnswers[idx] === optIdx;
                          return (
                            <label
                              key={opt}
                              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition ${
                                checked
                                  ? "border-emerald-400 bg-emerald-50 font-semibold text-emerald-900"
                                  : "border-slate-200/80 text-slate-800 hover:bg-slate-50/80 border border-slate-200/60"
                              }`}
                            >
                              <input
                                type="radio"
                                name={`vq-${idx}`}
                                checked={checked}
                                onChange={() =>
                                  setVerifyAnswers((prev) => ({ ...prev, [idx]: optIdx }))
                                }
                                className="sr-only"
                              />
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                                  checked
                                    ? "border-emerald-600 bg-emerald-600 text-white"
                                    : "border-slate-300 text-slate-500 font-mono"
                                }`}
                              >
                                {OPTION_LABELS[optIdx]}
                              </span>
                              <span>{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => void submitVerifyQuiz()}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm"
                  >
                    <Award className="h-4 w-4" /> Submit &amp; Claim Verified Badge
                  </button>
                </div>
              )}

              {verifyResult && (
                <div
                  className={`mt-3 rounded-xl border p-3.5 text-xs font-semibold ${
                    verifyResult.passed
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-amber-200 bg-amber-50 text-amber-800"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {verifyResult.passed ? (
                      <Trophy className="h-4 w-4 text-amber-500" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                    <span>{verifyResult.message}</span>
                  </div>
                  {/* Score bar */}
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full glass-panel/60">
                    <div
                      className={`h-full rounded-full transition-all ${
                        verifyResult.passed ? "bg-emerald-500" : "bg-amber-400"
                      }`}
                      style={{ width: `${verifyResult.score_percent}%` }}
                    />
                  </div>
                  <div className="mt-1 text-right text-[11px] font-bold">
                    {verifyResult.score_percent}%
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReadinessSuitePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs font-mono text-slate-500">
          Loading AI Career Readiness Suite...
        </div>
      }
    >
      <ReadinessSuiteContent />
    </Suspense>
  );
}
