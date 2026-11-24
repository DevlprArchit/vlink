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
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { setUser, refreshNotifications, demoLogin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleStudentLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email, password }),
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
      setError("Network error while logging in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        
        {/* Card 1: Student & Candidate Sign In */}
        <div className="glass-panel rounded-3xl border border-slate-200/85 bg-white p-7 sm:p-9 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-xs">
                <GraduationCap className="h-6 w-6 text-indigo-400" />
              </div>
              <div>
                <h1 className="text-lg font-black text-slate-900 tracking-tight">Student &amp; Candidate Portal</h1>
                <p className="text-xs text-slate-500 font-medium">Access your verified DRI, ATS resume, and matched jobs</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-800">
                {error}
              </div>
            )}

            <form onSubmit={handleStudentLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 font-mono">Institutional Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. yourname@hiet.co.in"
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
                    placeholder="Enter password"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3.5 py-2 text-xs text-slate-800 outline-none focus:border-[#4F46E5] focus:bg-white shadow-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition disabled:opacity-60"
              >
                {submitting ? "Authenticating..." : "Sign In to Student Account"}
              </button>
            </form>

            {/* Quick Demo Logins */}
            <div className="mt-6 border-t border-slate-100 pt-5">
              <div className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500 font-mono">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                <span>1-Click Demo Profiles (CSE, AI/ML, Cloud)</span>
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
                    className="rounded-xl border border-slate-200/80 bg-slate-50/60 px-3 py-2 text-left text-xs font-semibold text-slate-800 transition hover:border-[#4F46E5]/40 hover:bg-indigo-50/50 hover:text-indigo-700 shadow-2xs"
                  >
                    {demo.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500 font-medium">
            First time on V-Link? Accounts are verified via your academic email domain.
          </div>
        </div>

        {/* Card 2: Dedicated Institutional & Campus TPO Command Gateway */}
        <div className="glass-panel rounded-3xl border border-indigo-200/80 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-7 sm:p-9 text-white shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600/30 border border-indigo-400/30 text-white shadow-xs">
                <Building2 className="h-6 w-6 text-indigo-300" />
              </div>
              <span className="rounded-full border border-indigo-400/30 bg-indigo-500/20 px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-300">
                Institutional Portal
              </span>
            </div>

            <h2 className="text-xl font-extrabold text-white tracking-tight mb-2">
              Campus TPO &amp; Placement Command Hub
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed mb-6 font-normal">
              Dedicated administrative terminal for Training &amp; Placement Officers (TPOs), Deans, and Department Heads across partner campuses.
            </p>

            <div className="space-y-3 mb-8">
              {[
                "Scoped institutional login for any campus domain (HIET, etc.)",
                "Candidate hiring pipeline & live placement status management",
                "1-click personalized WhatsApp & Gmail candidate dispatch",
                "Cohort-wide drive broadcasts to eligible verified students",
                "Automated NAAC Criterion 5.2 & NBA Tier-1 accreditation CSV export",
              ].map((feat, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs text-slate-200">
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
              <Building2 className="h-4 w-4" />
              <span>Launch Institutional TPO Command Gateway</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
            <p className="mt-3 text-center text-[11px] text-slate-400 font-mono">
              Supports multi-tenant campus node switching &amp; domain auth
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
