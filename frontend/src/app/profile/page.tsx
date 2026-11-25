"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Award,
  CheckCircle2,
  ExternalLink,
  FolderGit2,
  Github,
  GraduationCap,
  Link2,
  Pencil,
  Plus,
  Share2,
  ShieldCheck,
  ThumbsUp,
  TrendingUp,
  User,
  Zap,
  Sparkles,
  Briefcase,
  FileText,
  Building2,
  Code2,
  ChevronRight,
  Eye,
  MessageSquare,
  Compass,
  Star,
  Clock,
  ArrowUpRight,
  Layers,
  X,
  Check,
  Cpu
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PublicProfile, CertificationItem, UserCertificationProgress } from "@/lib/types";

const TECH_COLORS: Record<string, string> = {
  React: "bg-sky-50 text-sky-700 border-sky-200",
  "Next.js": "bg-slate-100 text-slate-800 border-slate-200",
  TypeScript: "bg-blue-50 text-blue-700 border-blue-200",
  JavaScript: "bg-amber-50 text-amber-800 border-amber-200",
  Python: "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Node.js": "bg-emerald-50 text-emerald-700 border-emerald-200",
  FastAPI: "bg-teal-50 text-teal-700 border-teal-200",
  Docker: "bg-cyan-50 text-cyan-800 border-cyan-200",
  PostgreSQL: "bg-blue-50 text-blue-800 border-blue-200",
  AWS: "bg-orange-50 text-orange-700 border-orange-200",
  "Tailwind CSS": "bg-cyan-50 text-cyan-700 border-cyan-200",
  GraphQL: "bg-pink-50 text-pink-700 border-pink-200",
  "Machine Learning": "bg-purple-50 text-purple-700 border-purple-200",
};

function techChipClass(tech: string) {
  return TECH_COLORS[tech] ?? "bg-slate-100 text-slate-700 border-slate-200";
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function calcCompletion(user: PublicProfile): number {
  let score = 0;
  if (user.name) score += 10;
  if (user.headline && user.headline.trim().length > 0) score += 15;
  if (user.bio && user.bio.trim().length > 25) score += 15;
  if (user.education && user.education.trim().length > 0) score += 15;
  if (user.skills.length >= 3) score += 15;
  if (user.projects.length >= 1) score += 15;
  if (user.targetRole && user.targetRole.trim().length > 0) score += 5;
  if (user.readinessScore > 0) score += 10;
  return Math.min(score, 100);
}

export default function ProfilePage() {
  const { user, setUser, setAuthModalOpen } = useAuth();

  const [activeTab, setActiveTab] = useState<"overview" | "skills" | "projects" | "academics" | "certifications">("overview");
  const [editing, setEditing] = useState(false);
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [education, setEducation] = useState("");

  const [openToWork, setOpenToWork] = useState(true);
  const [shareToast, setShareToast] = useState(false);

  const [newSkill, setNewSkill] = useState("");
  const [newSkillLevel, setNewSkillLevel] = useState(80);
  const [skillSearch, setSkillSearch] = useState("");

  const [showAddProject, setShowAddProject] = useState(false);
  const [projTitle, setProjTitle] = useState("");
  const [projDesc, setProjDesc] = useState("");
  const [projStack, setProjStack] = useState("");
  const [projRepo, setProjRepo] = useState("");
  const [projLive, setProjLive] = useState("");

  const [senseInsight, setSenseInsight] = useState<string | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [certCatalog, setCertCatalog] = useState<CertificationItem[]>([]);
  const [certProgress, setCertProgress] = useState<UserCertificationProgress[]>([]);

  useEffect(() => {
    if (user) {
      setHeadline(user.headline || "");
      setBio(user.bio || "");
      setTargetRole(user.targetRole || "");
      setEducation(user.education || "");
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/readiness", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setCertCatalog(data.certifications || []);
          setCertProgress(data.certProgress || []);
        }
      })
      .catch(() => {});
  }, [user]);

  if (!user) {
    return (
      <div className="sense-card p-12 text-center max-w-lg mx-auto my-12 border border-slate-200/80 bg-white/95 shadow-md">
        <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center mx-auto mb-4">
          <User className="h-8 w-8 text-[#4F46E5]" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Student Professional Profile</h1>
        <p className="mt-2 text-xs text-slate-500 font-mono leading-relaxed">
          Connect your verified campus account to unlock your Demonstrable Readiness Index, live ATS resume telemetry, and recruiter matching.
        </p>
        <button
          type="button"
          onClick={() => setAuthModalOpen(true)}
          className="mt-6 btn-dibs-primary"
        >
          <Sparkles className="h-4 w-4" /> Sign In with @hiet.co.in
        </button>
      </div>
    );
  }

  const completion = calcCompletion(user);
  const verifiedSkillsCount = user.skills.filter((s) => s.verified).length;
  async function saveProfileEdits(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_profile",
        headline: headline || user?.headline,
        bio: bio || user?.bio,
        targetRole: targetRole || user?.targetRole,
        education: education || user?.education,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { user: PublicProfile };
      setUser(data.user);
      setEditing(false);
    }
  }

  async function handleAddSkill(e: React.FormEvent) {
    e.preventDefault();
    if (!newSkill.trim()) return;
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_skill",
        skillName: newSkill.trim(),
        skillLevel: newSkillLevel,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { user: PublicProfile };
      setUser(data.user);
      setNewSkill("");
    }
  }

  async function handleAddProject(e: React.FormEvent) {
    e.preventDefault();
    if (!projTitle.trim() || !projDesc.trim()) return;
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_project",
        project: {
          title: projTitle.trim(),
          description: projDesc.trim(),
          techStack: projStack
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          repoUrl: projRepo.trim() || undefined,
          liveUrl: projLive.trim() || undefined,
        },
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { user: PublicProfile };
      setUser(data.user);
      setProjTitle("");
      setProjDesc("");
      setProjStack("");
      setProjRepo("");
      setProjLive("");
      setShowAddProject(false);
    }
  }

  async function handleEndorseSkill(skillName: string) {
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "endorse",
        targetUserId: user?.id,
        endorseSkill: skillName,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { user: PublicProfile };
      setUser(data.user);
    }
  }

  function handleShareProfile() {
    if (!user) return;
    void navigator.clipboard.writeText(`${window.location.origin}/profile?id=${user.id}`);
    setShareToast(true);
    setTimeout(() => setShareToast(false), 2800);
  }

  async function triggerSenseAudit() {
    if (!user) return;
    setIsAuditing(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const savedKey = typeof window !== "undefined" ? localStorage.getItem("vlink_gemini_key") || "" : "";
      if (savedKey.trim()) headers["x-gemini-api-key"] = savedKey.trim();

      const prompt = `Audit my V-Link student profile concisely in 2-3 sentences. Name: ${user.name}. Target role: ${user.targetRole || "Software Engineer"}. Headline: ${user.headline || "Not set"}. Bio: ${user.bio || "Not set"}. Skills: ${user.skills.map((s) => s.name).join(", ") || "None"}. Projects: ${user.projects.length}. DRI Score: ${user.readinessScore > 0 ? `${user.readinessScore}/100 (${user.readinessTier})` : "Diagnostic Pending (0)"}. Give concrete next steps.`;
      const res = await fetch("/api/ai", {
        method: "POST",
        headers,
        body: JSON.stringify({
          task: "copilot-chat",
          payload: {
            message: prompt,
            context: {
              currentPath: "/profile",
              userName: user.name,
              targetRole: user.targetRole,
              readinessScore: user.readinessScore,
              skills: user.skills.map((s) => s.name),
            },
          },
        }),
      });
      const json = await res.json();
      if (res.ok && json.reply) {
        setSenseInsight(`✦ Sense AI Audit (${json.provider === "gemini" ? "Gemini" : "V-Link AI"}): ${json.reply}`);
      } else {
        setSenseInsight("Unable to reach Sense AI right now. Try taking the DRI diagnostic on /readiness.");
      }
    } catch {
      setSenseInsight("Network error while contacting Sense AI.");
    } finally {
      setIsAuditing(false);
    }
  }

  const filteredSkills = user.skills.filter((s) =>
    s.name.toLowerCase().includes(skillSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-16">
      {/* ── Share Feedback Toast ── */}
      {shareToast && (
        <div className="fixed bottom-8 right-8 z-50 flex items-center gap-2.5 rounded-full border border-emerald-200 bg-white/95 backdrop-blur-xl px-5 py-3 text-xs font-bold text-[#00A878] shadow-xl animate-fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#00C48C]" />
          <span>Profile link copied to clipboard!</span>
        </div>
      )}

      {/* ── 1. Hero Panoramic Identity Card (Sense AI Light Meditation Style) ── */}
      <div className="sense-card overflow-hidden relative border border-slate-200/80 bg-white/90 shadow-sm">
        {/* Luminous Ethereal Mesh Cover Banner */}
        <div className="relative h-44 w-full bg-gradient-to-r from-orange-50 via-rose-50/60 to-indigo-50 border-b border-slate-200/60 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(79,70,229,0.12),rgba(255,255,255,0))]" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#00C48C]/8 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#4F46E5]/8 rounded-full blur-3xl pointer-events-none" />

          {/* Ambient Sense Pulse Waveform in Top Corner */}
          <div className="absolute top-4 right-5 flex items-center gap-3 bg-white/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-200/80 shadow-xs">
            <div className="sense-wave-container">
              <div className="sense-wave-bar" />
              <div className="sense-wave-bar" />
              <div className="sense-wave-bar" />
              <div className="sense-wave-bar" />
              <div className="sense-wave-bar" />
            </div>
            <span className="text-[11px] font-bold text-slate-700 font-mono tracking-wider">VERIFIED TALENT TELEMETRY</span>
          </div>
        </div>

        {/* Profile Details Container */}
        <div className="px-6 sm:px-8 pb-7 -mt-16 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            {/* Left: Squircle Avatar & Identity */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
              {/* Squircle Avatar with live beacon */}
              <div className="relative shrink-0">
                <div
                  className="flex h-28 w-28 items-center justify-center rounded-[30px] border-4 border-white text-3xl font-black text-white shadow-xl ring-1 ring-slate-200/80"
                  style={{
                    backgroundColor: user.avatarColor || "#4F46E5",
                    backgroundImage: "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 100%)",
                  }}
                >
                  {getInitials(user.name)}
                </div>
                {/* Active Status Beacon */}
                <div
                  className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-white flex items-center justify-center border-2 border-white shadow-sm"
                  title={openToWork ? "Open to Opportunities" : "Focus Mode"}
                >
                  <div
                    className={`h-4 w-4 rounded-full ${
                      openToWork ? "bg-[#00C48C] sense-pulse-dot" : "bg-slate-400"
                    }`}
                  />
                </div>
              </div>

              {/* Title & Badges */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {user.name}
                  </h1>
                  {user.verifiedCampusBadge && (
                    <span className="badge-mint inline-flex items-center gap-1.5 py-1 px-3 text-xs shadow-xs">
                      <ShieldCheck className="h-3.5 w-3.5" /> HIET Verified Student
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpenToWork((p) => !p)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all border ${
                      openToWork
                        ? "bg-emerald-50 border-emerald-200 text-[#00A878]"
                        : "bg-slate-100 border-slate-200 text-slate-500"
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${openToWork ? "bg-[#00C48C]" : "bg-slate-400"}`} />
                    {openToWork ? "Open to Opportunities" : "Not Looking"}
                  </button>
                </div>

                <p className="text-sm font-semibold text-slate-600">
                  {user.headline || "Software Engineer · Full-Stack Builder"}
                </p>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500 font-mono">
                  <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                    <Building2 className="h-3.5 w-3.5 text-[#4F46E5]" /> {user.campus || "HIET Campus"}
                  </span>
                  <span>•</span>
                  <span>{user.department || "Computer Science & Engineering"}</span>
                  <span>•</span>
                  <span>{user.email}</span>
                </div>
              </div>
            </div>

            {/* Right: Quick Action Controls */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleShareProfile}
                className="btn-dibs-secondary py-2 px-4 text-xs"
              >
                <Share2 className="h-3.5 w-3.5" /> Share
              </button>
              <Link
                href="/resume"
                className="btn-dibs-secondary py-2 px-4 text-xs inline-flex items-center gap-1.5"
              >
                <FileText className="h-3.5 w-3.5 text-[#00A878]" /> ATS Resume
              </Link>
              <button
                type="button"
                onClick={() => setEditing(!editing)}
                className="btn-dibs-primary py-2 px-4 text-xs"
              >
                <Pencil className="h-3.5 w-3.5" /> {editing ? "Cancel" : "Edit Profile"}
              </button>
            </div>
          </div>

          {/* Horizontal Stats Capsule Bar (Dribbble 25084587 Profile Metric Row) */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-3 pt-5 border-t border-slate-100">
            <div className="sense-card p-3.5 text-center bg-white border border-slate-200/60 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">Connections</div>
              <div className="mt-1 text-xl font-black text-slate-900">{user.connections.length}</div>
              <div className="text-[10px] text-slate-400 font-mono">HIET Network</div>
            </div>
            <div className="sense-card p-3.5 text-center bg-white border border-slate-200/60 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">Readiness DRI</div>
              {user.readinessScore > 0 ? (
                <>
                  <div className="mt-1 text-xl font-black text-[#00A878]">{user.readinessScore}%</div>
                  <div className="text-[10px] text-emerald-600 font-mono font-semibold truncate">{user.readinessTier}</div>
                </>
              ) : (
                <>
                  <div className="mt-1 text-base font-black text-amber-600">Pending</div>
                  <Link href="/readiness" className="text-[10px] text-indigo-600 underline font-mono font-semibold">
                    Take AI DRI Test
                  </Link>
                </>
              )}
            </div>
            <div className="sense-card p-3.5 text-center bg-white border border-slate-200/60 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">Shipped Projects</div>
              <div className="mt-1 text-xl font-black text-slate-900">{user.projects.length}</div>
              <div className="text-[10px] text-slate-400 font-mono">GitHub Verified</div>
            </div>
            <div className="sense-card p-3.5 text-center bg-white border border-slate-200/60 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">Verified Skills</div>
              <div className="mt-1 text-xl font-black text-[#4F46E5]">{verifiedSkillsCount}</div>
              <div className="text-[10px] text-slate-400 font-mono">Of {user.skills.length} Total</div>
            </div>
            <div className="sense-card p-3.5 text-center bg-white border border-slate-200/60 shadow-xs col-span-2 sm:col-span-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">Campus Standing</div>
              {user.readinessScore > 0 ? (
                <>
                  <div className="mt-1 text-base font-black text-amber-600 truncate">{user.readinessTier}</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">{user.department || user.campus}</div>
                </>
              ) : (
                <>
                  <div className="mt-1 text-base font-black text-slate-500">Unranked</div>
                  <div className="text-[10px] text-slate-400 font-mono">Take DRI Diagnostic</div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Inline Profile Editing Drawer */}
        {editing && (
          <form
            onSubmit={saveProfileEdits}
            className="px-6 sm:px-8 pb-7 pt-4 bg-slate-50/80 border-t border-slate-200/80 space-y-4 animate-fade-in"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="h-4 w-4 text-[#4F46E5]" /> Edit Profile Credentials
              </h3>
              <span className="text-xs text-slate-500 font-mono">Changes sync with recruiter telemetry</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 font-mono">Professional Headline</label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Lead Full-Stack Engineer · HIET CSE"
                  className="w-full rounded-xl bg-white border border-slate-200 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#4F46E5] shadow-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 font-mono">Target Role</label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Full-Stack Developer"
                  className="w-full rounded-xl bg-white border border-slate-200 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#00C48C] shadow-xs"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1 font-mono">Academic Education & Major</label>
                <input
                  type="text"
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  placeholder="e.g. B.Tech Computer Science & Engineering (HIET, 2022-2026)"
                  className="w-full rounded-xl bg-white border border-slate-200 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#4F46E5] shadow-xs"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1 font-mono">Executive Bio & Mission</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Describe your core technical passions, architectural projects, and what you aim to build..."
                  className="w-full rounded-xl bg-white border border-slate-200 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#4F46E5] shadow-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="btn-dibs-secondary py-1.5 px-4 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-dibs-primary py-1.5 px-5 text-xs"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}
      </div>
      {/* ── 2. Sense AI Atmosphere & Navigation Bar ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-2">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/90 rounded-full border border-slate-200/70">
          {[
            { id: "overview", label: "Overview", icon: Compass },
            { id: "skills", label: `Skills (${user.skills.length})`, icon: Zap },
            { id: "projects", label: `Projects (${user.projects.length})`, icon: FolderGit2 },
            { id: "academics", label: "Academics & HIET", icon: GraduationCap },
            { id: "certifications", label: "Credentials", icon: Award },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                  isActive
                    ? "bg-[#4F46E5] text-white shadow-[0_4px_14px_rgba(79,70,229,0.35)]"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* AI Readiness Diagnostic Trigger (Sense AI Style) */}
        <button
          type="button"
          onClick={triggerSenseAudit}
          disabled={isAuditing}
          className="btn-dibs-mint py-2 px-4 text-xs shrink-0"
        >
          <Sparkles className={`h-3.5 w-3.5 ${isAuditing ? "animate-spin" : ""}`} />
          {isAuditing ? "Running Sense AI Audit..." : "✦ Run Sense AI Audit"}
        </button>
      </div>

      {/* Sense AI Dynamic Audit Box (if triggered) */}
      {senseInsight && (
        <div className="sense-card-glow p-5 border border-[#00C48C]/40 bg-white/95 relative animate-fade-in shadow-sm">
          <button
            type="button"
            onClick={() => setSenseInsight(null)}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="h-5 w-5 text-[#00C48C]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">Sense AI Placement & Career Intelligence</h4>
                <span className="badge-mint text-[10px] py-0.5">Live Analysis</span>
              </div>
              <p className="mt-1 text-xs text-slate-700 leading-relaxed font-mono">
                {senseInsight}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Main Dual-Column Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Primary Content (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-fade-in">
              {/* Bio & Mission Statement */}
              <div className="sense-card p-6 border border-slate-200/80 bg-white/95 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
                  <Compass className="h-4 w-4 text-[#4F46E5]" /> About & Technical Mission
                </h3>
                {user.bio ? (
                  <p className="text-xs text-slate-600 leading-relaxed font-mono whitespace-pre-line">
                    {user.bio}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic font-mono">
                    No bio added yet. Click &ldquo;Edit Profile&rdquo; above to add your bio, headline, and career summary.
                  </p>
                )}
              </div>

              {/* Demonstrable Readiness Index (DRI) Deep-Dive Card */}
              <div className="sense-card p-6 border border-slate-200/80 bg-white/95 shadow-xs">
                <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <Award className="h-5 w-5 text-[#00A878]" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Demonstrable Readiness Index (DRI)</h3>
                      <p className="text-[11px] text-slate-500 font-mono">AI-Powered Placement Readiness Evaluation</p>
                    </div>
                  </div>
                  <Link
                    href="/readiness"
                    className="btn-dibs-secondary py-1.5 px-3 text-xs inline-flex items-center gap-1.5"
                  >
                    <span>{user.readinessScore > 0 ? "View DRI Report" : "Take DRI Test"}</span> <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>

                {user.readinessScore > 0 && Object.keys(user.readinessDimensions || {}).length > 0 ? (
                  <div className="space-y-3 pt-2">
                    {Object.entries(user.readinessDimensions).map(([key, score], idx) => {
                      const colors = ["bg-[#00C48C]", "bg-[#4F46E5]", "bg-indigo-500", "bg-amber-500", "bg-cyan-500"];
                      const label = key
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (ch) => ch.toUpperCase());
                      return (
                        <div key={key}>
                          <div className="flex justify-between text-xs mb-1 font-mono">
                            <span className="text-slate-700 font-medium">{label}</span>
                            <span className="font-bold text-slate-900">{score}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${colors[idx % colors.length]} transition-all duration-700`}
                              style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-amber-900">Diagnostic Pending — 0 / 100</p>
                      <p className="text-[11px] text-amber-800/90 mt-0.5 font-mono">
                        Complete the AI Readiness Diagnostic to generate your real DRI score and dimension breakdown.
                      </p>
                    </div>
                    <Link href="/readiness" className="btn-dibs-primary py-2 px-3.5 text-xs shrink-0 text-center">
                      Start AI DRI Test
                    </Link>
                  </div>
                )}
              </div>

              {/* Featured Projects Highlight */}
              <div className="sense-card p-6 border border-slate-200/80 bg-white/95 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FolderGit2 className="h-4 w-4 text-[#4F46E5]" />
                    <h3 className="text-sm font-bold text-slate-900">Featured Engineering Projects</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("projects")}
                    className="text-xs text-[#4F46E5] hover:underline font-mono inline-flex items-center gap-1 font-bold"
                  >
                    View All ({user.projects.length}) <ChevronRight className="h-3 w-3" />
                  </button>
                </div>

                <div className="space-y-4">
                  {user.projects.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
                      <p className="text-xs font-semibold text-slate-700">No projects added yet.</p>
                      <p className="text-[11px] text-slate-500 mt-1 font-mono">
                        Showcase your GitHub repositories and deployed demos to boost your DRI score.
                      </p>
                      <button
                        type="button"
                        onClick={() => { setActiveTab("projects"); setShowAddProject(true); }}
                        className="mt-3 btn-dibs-secondary py-1.5 px-3 text-xs inline-flex items-center gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add First Project
                      </button>
                    </div>
                  ) : (
                    user.projects.slice(0, 2).map((proj) => (
                    <div
                      key={proj.id}
                      className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60 hover:border-slate-300 transition-all shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{proj.title}</h4>
                          <p className="mt-1 text-[11px] text-slate-600 font-mono leading-relaxed">
                            {proj.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {proj.repoUrl && (
                            <a
                              href={proj.repoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs"
                            >
                              <Github className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {proj.liveUrl && (
                            <a
                              href={proj.liveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {proj.techStack.map((tech) => (
                          <span
                            key={tech}
                            className={`rounded-md border px-2 py-0.5 text-[10px] font-mono font-medium ${techChipClass(
                              tech
                            )}`}
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SKILLS & ENDORSEMENTS */}
          {activeTab === "skills" && (
            <div className="space-y-6 animate-fade-in">
              <div className="sense-card p-6 border border-slate-200/80 bg-white/95 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-[#4F46E5]" /> Technical Competencies & Endorsements
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Verified against institutional evaluation tests and peer endorsements
                    </p>
                  </div>
                  <input
                    type="text"
                    value={skillSearch}
                    onChange={(e) => setSkillSearch(e.target.value)}
                    placeholder="Filter skills..."
                    className="rounded-full bg-slate-50 border border-slate-200 px-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4F46E5] w-full sm:w-44 shadow-2xs"
                  />
                </div>

                {/* Skill List */}
                <div className="space-y-3.5">
                  {filteredSkills.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center text-xs text-slate-500 font-mono">
                      {user.skills.length === 0
                        ? "No skills added yet. Use the form below to add your technical skills."
                        : "No skills match your filter."}
                    </div>
                  ) : (
                    filteredSkills.map((s) => (
                    <div
                      key={s.name}
                      className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{s.name}</span>
                          {s.verified ? (
                            <span className="badge-mint text-[10px] py-0.5 px-2">
                              <CheckCircle2 className="h-3 w-3" /> Verified
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono">Self-Reported</span>
                          )}
                          <span className="text-[10px] text-slate-500 font-mono">
                            ({s.endorsements} endorsements)
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden max-w-md">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#4F46E5] to-[#00C48C]"
                            style={{ width: `${s.level}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <span className="text-xs font-mono font-bold text-slate-700">{s.level}%</span>
                        <button
                          type="button"
                          onClick={() => handleEndorseSkill(s.name)}
                          className="btn-dibs-secondary py-1 px-3 text-[11px] inline-flex items-center gap-1.5"
                        >
                          <ThumbsUp className="h-3 w-3 text-[#4F46E5]" /> Endorse
                        </button>
                      </div>
                    </div>
                    ))
                  )}
                </div>

                {/* Add Skill Form */}
                <form
                  onSubmit={handleAddSkill}
                  className="mt-6 p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 flex flex-col sm:flex-row items-end gap-3"
                >
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-semibold text-slate-700 mb-1 font-mono">
                      Add New Technical Skill
                    </label>
                    <input
                      type="text"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="e.g. Kubernetes, Golang, GraphQL"
                      className="w-full rounded-xl bg-white border border-slate-200 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#4F46E5] shadow-2xs"
                    />
                  </div>
                  <div className="w-full sm:w-28">
                    <label className="block text-xs font-semibold text-slate-700 mb-1 font-mono">
                      Level: {newSkillLevel}%
                    </label>
                    <input
                      type="range"
                      min={30}
                      max={100}
                      value={newSkillLevel}
                      onChange={(e) => setNewSkillLevel(Number(e.target.value))}
                      className="w-full accent-[#4F46E5]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn-dibs-primary py-2 px-4 text-xs w-full sm:w-auto shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Skill
                  </button>
                </form>
              </div>
            </div>
          )}
          {/* TAB 3: PROJECTS */}
          {activeTab === "projects" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <FolderGit2 className="h-5 w-5 text-[#4F46E5]" /> Engineering Portfolio & Artifacts
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    Public GitHub repositories and production deployments
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddProject(!showAddProject)}
                  className="btn-dibs-primary py-2 px-4 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> {showAddProject ? "Cancel" : "Ship Project"}
                </button>
              </div>

              {/* Add Project Drawer */}
              {showAddProject && (
                <form
                  onSubmit={handleAddProject}
                  className="sense-card p-5 border border-slate-200/80 bg-slate-50/90 space-y-3.5 animate-fade-in shadow-xs"
                >
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                    Publish New Project to Profile
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={projTitle}
                        onChange={(e) => setProjTitle(e.target.value)}
                        placeholder="Project Title (e.g. V-Link Multi-Tenant SaaS Platform)"
                        className="w-full rounded-xl bg-white border border-slate-200 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#4F46E5] shadow-2xs"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <textarea
                        rows={2}
                        value={projDesc}
                        onChange={(e) => setProjDesc(e.target.value)}
                        placeholder="Concise description of the problem solved, architecture, and impact..."
                        className="w-full rounded-xl bg-white border border-slate-200 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#4F46E5] shadow-2xs"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={projStack}
                        onChange={(e) => setProjStack(e.target.value)}
                        placeholder="Tech Stack (comma separated: Next.js, FastAPI, AWS)"
                        className="w-full rounded-xl bg-white border border-slate-200 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#00C48C] shadow-2xs"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={projRepo}
                        onChange={(e) => setProjRepo(e.target.value)}
                        placeholder="GitHub Repo URL (optional)"
                        className="w-full rounded-xl bg-white border border-slate-200 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#4F46E5] shadow-2xs"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={projLive}
                        onChange={(e) => setProjLive(e.target.value)}
                        placeholder="Live Demo URL (optional)"
                        className="w-full rounded-xl bg-white border border-slate-200 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#00C48C] shadow-2xs"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddProject(false)}
                      className="btn-dibs-secondary py-1.5 px-3 text-xs"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-dibs-primary py-1.5 px-4 text-xs">
                      Publish Project
                    </button>
                  </div>
                </form>
              )}

              {/* Projects Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {user.projects.length === 0 ? (
                  <div className="sm:col-span-2 sense-card p-8 border border-dashed border-slate-200 bg-white/95 text-center">
                    <FolderGit2 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-800">No projects published yet</p>
                    <p className="text-xs text-slate-500 mt-1 font-mono">
                      Click &ldquo;Add Project&rdquo; above to showcase your repositories and live builds.
                    </p>
                  </div>
                ) : (
                  user.projects.map((proj) => (
                  <div
                    key={proj.id}
                    className="sense-card p-5 border border-slate-200/80 bg-white/95 flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{proj.title}</h4>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {proj.repoUrl && (
                            <a
                              href={proj.repoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/70 shadow-2xs"
                              title="GitHub Repository"
                            >
                              <Github className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {proj.liveUrl && (
                            <a
                              href={proj.liveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/70 shadow-2xs"
                              title="Live Deployment"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </div>

                      <p className="mt-2 text-xs text-slate-600 font-mono leading-relaxed">
                        {proj.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                      {proj.techStack.map((tech) => (
                        <span
                          key={tech}
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-mono font-medium ${techChipClass(
                            tech
                          )}`}
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: ACADEMICS & HIET CREDENTIALS */}
          {activeTab === "academics" && (
            <div className="space-y-6 animate-fade-in">
              <div className="sense-card p-6 border border-slate-200/80 bg-white/95 space-y-5 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#4F46E5] to-amber-500 flex items-center justify-center text-white shadow-md">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Campus Credential Registry</h3>
                    <p className="text-xs text-slate-500 font-mono">
                      {user.campus}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60">
                    <div className="text-[11px] text-slate-500 font-mono uppercase font-semibold">Education &amp; Program</div>
                    <div className="text-sm font-bold text-slate-900 mt-1">
                      {user.education || "Not added yet (click Edit Profile)"}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{user.department || "Department not set"}</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60">
                    <div className="text-[11px] text-slate-500 font-mono uppercase font-semibold">Graduation &amp; Role Focus</div>
                    <div className="text-sm font-bold text-[#00A878] mt-1">
                      Class of {user.graduationYear || "2026"}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Target: {user.targetRole || "Not specified"}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60">
                    <div className="text-[11px] text-slate-500 font-mono uppercase font-semibold">Campus Email</div>
                    <div className="text-sm font-bold text-slate-900 mt-1 font-mono break-all">
                      {user.email}
                    </div>
                    <div className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1 font-mono font-medium">
                      <ShieldCheck className="h-3 w-3" /> {user.verifiedCampusBadge ? "Verified Institutional Account" : "Standard Student Account"}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60">
                    <div className="text-[11px] text-slate-500 font-mono uppercase font-semibold">DRI Readiness Status</div>
                    <div className="text-sm font-bold text-[#4F46E5] mt-1">
                      {user.readinessScore > 0 ? `${user.readinessScore}% · ${user.readinessTier}` : "Diagnostic Pending (0%)"}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {user.readinessScore > 0 ? "AI Diagnostic Verified" : "Complete AI DRI test on Readiness tab"}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-[#00A878]" />
                    <div className="text-xs text-slate-700 font-mono">
                      Campus placement coordination is managed with your institution&apos;s TPO cell.
                    </div>
                  </div>
                  <Link href="/tpo" className="btn-dibs-mint py-1.5 px-3 text-xs shrink-0">
                    View TPO Portal
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CERTIFICATIONS */}
          {activeTab === "certifications" && (
            <div className="space-y-6 animate-fade-in">
              <div className="sense-card p-6 border border-slate-200/80 bg-white/95 shadow-xs">
                <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-[#4F46E5]" />
                    <h3 className="text-base font-bold text-slate-900">Certifications &amp; Micro-Credentials</h3>
                  </div>
                  <Link href="/readiness?tab=certs" className="btn-dibs-secondary py-1.5 px-3 text-xs">
                    Browse Catalog
                  </Link>
                </div>

                {certProgress.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center">
                    <Award className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-800">No certifications tracked yet</p>
                    <p className="text-xs text-slate-500 mt-1 font-mono">
                      Start or complete accredited tracks in the Readiness Hub to display verified certificates here.
                    </p>
                    <Link href="/readiness?tab=certs" className="mt-4 inline-flex btn-dibs-primary py-2 px-4 text-xs">
                      Explore Certifications
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {certProgress.map((cp) => {
                      const cert = certCatalog.find((c) => c.id === cp.certId);
                      return (
                        <div
                          key={cp.certId}
                          className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60 space-y-2 hover:border-slate-300 transition-all shadow-2xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-xs font-bold text-slate-900">{cert?.title || cp.certId}</h4>
                              <p className="text-[11px] text-slate-500 font-mono">{cert?.provider || "Verified Provider"}</p>
                            </div>
                            <Award className={`h-4 w-4 shrink-0 ${cp.completed ? "text-[#00A878]" : "text-[#4F46E5]"}`} />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-2 border-t border-slate-200/60">
                            <span>{cp.completed ? "Completed" : `Progress: ${cp.progress}%`}</span>
                            <span className="text-slate-600 font-semibold">{cp.completed ? "✓ Verified" : "In Progress"}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Rail: Sense AI Companion & Profile Completion (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Profile Completion Circular Gauge */}
          <div className="sense-card p-6 border border-slate-200/80 bg-white/95 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-[#4F46E5]" /> Profile Health
              </h3>
              <span className="text-xs font-mono font-bold text-[#4F46E5]">{completion}%</span>
            </div>

            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-4">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#4F46E5] to-[#00C48C] transition-all duration-700"
                style={{ width: `${completion}%` }}
              />
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              {[
                { label: "Headline & Career Bio", done: Boolean(user.headline?.trim() && user.bio?.trim().length > 25) },
                { label: "Academic Details Added", done: Boolean(user.education?.trim()) },
                { label: "3+ Technical Skills", done: user.skills.length >= 3 },
                { label: "1+ Portfolio Project", done: user.projects.length >= 1 },
                { label: "AI DRI Diagnostic Taken", done: user.readinessScore > 0 },
              ].map((item) => (
                <div key={item.label} className={`flex items-center gap-2 ${item.done ? "text-slate-700" : "text-slate-500"}`}>
                  {item.done ? (
                    <CheckCircle2 className="h-4 w-4 text-[#00A878] shrink-0" />
                  ) : (
                    <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                  )}
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sense AI Career Copilot Widget */}
          <div className="sense-card p-6 border border-slate-200/80 bg-white/95 relative overflow-hidden shadow-xs">
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-[#00C48C]/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-7 w-7 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#00A878]">
                <Cpu className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">Sense AI Assistant</h4>
                <div className="text-[10px] text-emerald-600 font-mono flex items-center gap-1 font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" /> Gemini 3 Active
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 font-mono leading-relaxed">
              {user.readinessScore > 0 ? (
                <>
                  Current DRI for <strong>{user.targetRole || "your target role"}</strong> is{" "}
                  <strong>{user.readinessScore}%</strong>. Use AI Resume Studio &amp; Job Radar to prepare for placements.
                </>
              ) : (
                <>
                  Your DRI diagnostic has not been completed yet. Take the AI Readiness test to generate your score and personalized roadmap for{" "}
                  <strong>{user.targetRole || "your target role"}</strong>.
                </>
              )}
            </p>

            <Link
              href="/readiness"
              className="mt-4 w-full btn-dibs-primary py-2 text-xs text-center justify-center inline-flex"
            >
              {user.readinessScore > 0 ? "View DRI Report" : "Start AI DRI Test"}
            </Link>
          </div>

          {/* HIET Peer Network Radar */}
          <div className="sense-card p-6 border border-slate-200/80 bg-white/95 shadow-xs">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2 mb-3">
              <ShieldCheck className="h-4 w-4 text-[#4F46E5]" /> HIET Core Creators & Peers
            </h4>

            <div className="space-y-3 pt-1">
              {[
                { name: "Tarun Kashyap", role: "Backend & Distributed Systems", campus: "HIET CSE" },
                { name: "Deepika", role: "UI/UX & Product Design", campus: "HIET CSE" },
                { name: "Simran Rana", role: "Data & ML Pipeline Engineer", campus: "HIET CSE" },
              ].map((peer) => (
                <div
                  key={peer.name}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center">
                      {getInitials(peer.name)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{peer.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{peer.campus}</div>
                    </div>
                  </div>
                  <Link
                    href="/network"
                    className="btn-dibs-secondary py-1 px-2.5 text-[10px]"
                  >
                    Connect
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
