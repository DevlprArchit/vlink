"use client";

import Link from "next/link";

import React, { useState } from "react";
import { Building2, ChevronRight, GraduationCap, ShieldCheck, Sparkles, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PublicProfile } from "@/lib/types";

export function AuthGateModal() {
  const { authModalOpen, setAuthModalOpen, setUser, refreshNotifications, demoLogin } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [campus, setCampus] = useState("HIET Shahpur (HPTU)");
  const [department, setDepartment] = useState("Computer Science & Engineering");
  const [targetRole, setTargetRole] = useState("Full-Stack Software Engineer");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!authModalOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "register"
            ? {
                action: "register",
                name,
                email,
                password,
                campus,
                department,
                targetRole,
              }
            : { action: "login", email, password }
        ),
      });
      const data = (await res.json()) as { user?: PublicProfile; error?: string };
      if (!res.ok || !data.user) {
        setError(data.error || "Authentication failed.");
      } else {
        setUser(data.user);
        setAuthModalOpen(false);
        await refreshNotifications();
      }
    } catch {
      setError("Network error while authenticating.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3 sm:p-4 backdrop-blur-md">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-white/95 bg-white/95 p-5 sm:p-8 shadow-2xl backdrop-blur-3xl">
        <button
          onClick={() => setAuthModalOpen(false)}
          aria-label="Close authentication modal"
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 border border-slate-200/60 hover:text-slate-700"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl btn-1of1-primary text-white shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">V-Link Campus Access</h2>
            <p className="text-xs text-slate-500 font-medium">
              Student identity, professional profile, and career readiness
            </p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 rounded-2xl bg-slate-100 border border-slate-200/80 p-1 text-sm font-medium">
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError("");
            }}
            className={`rounded-lg py-1.5 transition ${
              mode === "register" ? "bg-white text-[#4F46E5] font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Register (Campus Email)
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
            className={`rounded-lg py-1.5 transition ${
              mode === "login" ? "bg-white text-[#4F46E5] font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Sign In
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "register" && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rohan Verma"
                className="w-full rounded-xl border border-slate-200/80 bg-white/80 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Campus Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@hiet.co.in"
              className="w-full rounded-xl border border-slate-200/80 bg-white/80 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15"
            />
            {mode === "register" && (
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500 font-mono">
                Campus verification is pending until your email address is confirmed.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full rounded-xl border border-slate-200/80 bg-white/80 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15"
            />
          </div>

          {mode === "register" && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Campus</label>
                  <input
                    type="text"
                    value={campus}
                    onChange={(e) => setCampus(e.target.value)}
                    className="w-full rounded-xl border border-slate-200/80 bg-white/80 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full rounded-xl border border-slate-200/80 bg-white/80 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-[#4F46E5]"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Target Role</label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-[#4F46E5]"
                >
                  <option>Full-Stack Software Engineer</option>
                  <option>AI/ML Engineer</option>
                  <option>Cloud & DevOps Engineer</option>
                  <option>Backend Engineer</option>
                  <option>Frontend Engineer</option>
                  <option>Data Engineer</option>
                </select>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl btn-1of1-primary py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
          >
            {submitting
              ? "Authenticating..."
              : mode === "register"
              ? "Create Student Account"
              : "Sign In"}
          </button>
        </form>

        {process.env.NODE_ENV !== "production" && <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500 font-mono">
            <Sparkles className="h-3.5 w-3.5 text-brand-600" />
            Quick Campus Demo Profiles (1-Click Sign In)
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
                onClick={() => void demoLogin(demo.id)}
                className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-left text-xs font-semibold text-slate-800 transition hover:border-[#4F46E5]/40 hover:bg-indigo-50/50 hover:text-[#4F46E5] shadow-xs"
              >
                {demo.label}
              </button>
            ))}
          </div>
        </div>}

        {/* Dedicated Institutional & Campus TPO Command Gateway */}
        <div className="mt-5 rounded-2xl border border-indigo-100 bg-gradient-to-br from-slate-50 via-white to-indigo-50/50 p-4.5 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs">
                <Building2 className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">Institutional TPO Gateway</span>
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-bold text-indigo-700 border border-indigo-200/60 uppercase tracking-wider">
                    Campus Admin
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-600 leading-relaxed">
                  Placement directors and college administrators can manage verified student cohorts, trigger WhatsApp &amp; Gmail announcements, and export NAAC/NBA audit reports.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-3.5 flex justify-end">
            <Link
              href="/tpo"
              onClick={() => setAuthModalOpen(false)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition"
            >
              <span>Access Campus TPO Portal</span>
              <ChevronRight className="h-3.5 w-3.5 text-indigo-300" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
