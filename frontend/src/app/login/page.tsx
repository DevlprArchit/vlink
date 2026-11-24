"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
  BookOpen,
  Briefcase,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { setUser, refreshNotifications, demoLogin } = useAuth();
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [campus, setCampus] = useState("HIET Shahpur (HPTU)");
  const [department, setDepartment] = useState("Computer Science & Engineering");
  const [targetRole, setTargetRole] = useState("Full-Stack Software Engineer");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const payload =
        authMode === "register"
          ? {
              action: "register",
              name: name.trim(),
              email: email.trim(),
              password,
              campus,
              department,
              targetRole,
            }
          : { action: "login", email: email.trim(), password };

      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.user) {
        setError(data.error || "Authentication failed. Please verify credentials.");
      } else {
        setUser(data.user);
        await refreshNotifications();
        router.push("/profile");
      }
    } catch {
      setError("Network error while authenticating. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-3 sm:px-4 py-8 sm:py-12">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* Card 1: Student & Candidate Sign In / Sign Up */}
        <div className="glass-panel rounded-3xl border border-slate-200/85 bg-white p-5 sm:p-8 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-xs shrink-0">
                <GraduationCap className="h-6 w-6 text-indigo-400" />
              </div>
              <div>
                <h1 className="text-lg font-black text-slate-900 tracking-tight">Student Portal</h1>
                <p className="text-xs text-slate-500 font-medium">Access verified DRI, ATS resume, and matched jobs</p>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="mb-5 grid grid-cols-2 rounded-2xl bg-slate-100 p-1 text-xs font-semibold border border-slate-200/80">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setError("");
                }}
                className={`rounded-xl py-2 transition-all ${
                  authMode === "login"
                    ? "bg-white text-indigo-600 font-bold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("register");
                  setError("");
                }}
                className={`rounded-xl py-2 transition-all ${
                  authMode === "register"
                    ? "bg-white text-indigo-600 font-bold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Create Account
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-800">
                {error}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              {authMode === "register" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 font-mono">Full Name</label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Archit Sharma"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3.5 py-2 text-xs text-slate-800 outline-none focus:border-[#4F46E5] focus:bg-white shadow-xs"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 font-mono">
                  {authMode === "register" ? "Campus or Personal Email" : "Institutional Email"}
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. archit.sharma@hiet.co.in"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3.5 py-2 text-xs text-slate-800 outline-none focus:border-[#4F46E5] focus:bg-white shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 font-mono">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={authMode === "register" ? "Min 6 characters" : "Enter password (or demo)"}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3.5 py-2 text-xs text-slate-800 outline-none focus:border-[#4F46E5] focus:bg-white shadow-xs"
                  />
                </div>
              </div>

              {authMode === "register" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 font-mono">Campus / College</label>
                      <input
                        type="text"
                        required
                        value={campus}
                        onChange={(e) => setCampus(e.target.value)}
                        placeholder="e.g. HIET Shahpur (HPTU)"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#4F46E5] focus:bg-white shadow-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 font-mono">Department</label>
                      <input
                        type="text"
                        required
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="e.g. Computer Science"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#4F46E5] focus:bg-white shadow-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 font-mono">Target Career Role</label>
                    <input
                      type="text"
                      required
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder="e.g. Cloud Engineer, Full-Stack Developer"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#4F46E5] focus:bg-white shadow-xs"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition disabled:opacity-60 cursor-pointer"
              >
                {submitting
                  ? "Authenticating..."
                  : authMode === "register"
                  ? "Create Campus Account & Sign In"
                  : "Sign In to Student Account"}
              </button>
            </form>

            {/* Quick Demo Logins */}
            <div className="mt-5 border-t border-slate-100 pt-4">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500 font-mono">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                  <span>1-Click Demo Profiles</span>
                </div>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                  Instant Access
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "user-archit", label: "Archit Sharma (CSE)" },
                  { id: "user-deepika", label: "Deepika (AI/ML)" },
                  { id: "user-tarun", label: "Tarun Kashyap (Cloud)" },
                  { id: "user-simran", label: "Simran Rana (Frontend)" },
                ].map((demo) => (
                  <button
                    key={demo.id}
                    type="button"
                    onClick={async () => {
                      await demoLogin(demo.id);
                      router.push("/profile");
                    }}
                    className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-2.5 py-2 text-left text-xs font-semibold text-slate-800 transition hover:border-[#4F46E5]/40 hover:bg-indigo-50/50 hover:text-indigo-700 shadow-2xs truncate"
                  >
                    {demo.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 text-center text-xs text-slate-500 font-medium">
            First time on V-Link? Accounts are verified via your academic email domain.
          </div>
        </div>

        {/* Card 2: Dedicated Institutional & Campus TPO Command Gateway */}
        <div className="glass-panel rounded-3xl border border-indigo-200/80 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-5 sm:p-8 text-white shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600/30 border border-indigo-400/30 text-white shadow-xs shrink-0">
                <Building2 className="h-6 w-6 text-indigo-300" />
              </div>
              <span className="rounded-full border border-indigo-400/30 bg-indigo-500/20 px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-300">
                Institutional Portal
              </span>
            </div>

            <h2 className="text-xl font-extrabold text-white tracking-tight mb-2">
              Campus TPO &amp; Placement Command Hub
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed mb-5 font-normal">
              Dedicated administrative terminal for Training &amp; Placement Officers (TPOs), Deans, and Department Heads across partner campuses.
            </p>

            <div className="space-y-2.5 mb-6">
              {[
                "Scoped institutional login for any campus domain (HIET, etc.)",
                "Candidate hiring pipeline & live placement status management",
                "1-click personalized WhatsApp & Gmail candidate dispatch",
                "Cohort-wide drive broadcasts to eligible verified students",
                "Automated NAAC Criterion 5.2 & NBA Tier-1 accreditation CSV export",
              ].map((feat, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Link
              href="/tpo"
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 transition shadow-indigo-900/30"
            >
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="truncate">Launch Institutional TPO Command Gateway</span>
              <ChevronRight className="h-4 w-4 shrink-0" />
            </Link>
            <p className="mt-2.5 text-center text-[11px] text-slate-400 font-mono">
              Supports multi-tenant campus node switching &amp; domain auth
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
