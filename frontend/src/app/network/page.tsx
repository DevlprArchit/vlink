"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Award,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Filter,
  GraduationCap,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  ThumbsUp,
  UserCheck,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PublicProfile } from "@/lib/types";

interface Recommendation {
  user_id: string;
  similarity_score: number;
  shared_skills: string[];
  shared_interests: string[];
  reason: string;
}

type NetworkTab = "explore" | "recommended" | "connections" | "mentors";

export default function NetworkPage() {
  const { user, setUser, setAuthModalOpen } = useAuth();
  const router = useRouter();
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [query, setQuery] = useState("");
  const [selectedCampus, setSelectedCampus] = useState("all");
  const [selectedRole, setSelectedRole] = useState("all");
  const [activeTab, setActiveTab] = useState<NetworkTab>("explore");
  const [loading, setLoading] = useState(true);
  const [endorsingMap, setEndorsingMap] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadNetwork = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/profile?q=${encodeURIComponent(query)}`, { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as {
          profiles: PublicProfile[];
          recommendations: Recommendation[];
        };
        setProfiles(data.profiles);
        setRecommendations(data.recommendations || []);
      }
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void loadNetwork();
  }, [loadNetwork]);

  async function handleConnect(targetUserId: string) {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    const isConn = user.connections.includes(targetUserId);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "connect", targetUserId }),
    });
    if (res.ok) {
      const data = (await res.json()) as { user: PublicProfile };
      setUser(data.user);
      showToast(isConn ? "Connection removed." : "Connection request accepted & linked!");
      await loadNetwork();
    }
  }

  async function handleEndorse(targetUserId: string, endorseSkill: string) {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    const key = `${targetUserId}-${endorseSkill}`;
    setEndorsingMap((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "endorse", targetUserId, endorseSkill }),
      });
      if (res.ok) {
        showToast(`Endorsed ${endorseSkill}! Skill score updated.`);
        await loadNetwork();
      }
    } finally {
      setEndorsingMap((prev) => ({ ...prev, [key]: false }));
    }
  }

  async function startChat(recipientId: string) {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", recipientId }),
    });
    router.push("/messages");
  }

  const recMap = new Map(recommendations.map((r) => [r.user_id, r]));

  // Campus options
  const campuses = ["all", "HIET Shahpur (HPTU)", "HPTU Hamirpur", "Partner Campuses"];
  // Target roles
  const roles = [
    "all",
    "Full-Stack Software Engineer",
    "Cloud & DevOps Engineer",
    "AI/ML Engineer",
    "Frontend & UI/UX Developer",
    "Data Engineer",
  ];

  // Filtering
  const filteredPeers = profiles.filter((p) => {
    if (user && p.id === user.id) return false;

    // Tab filter
    if (activeTab === "connections") {
      if (!user || !user.connections.includes(p.id)) return false;
    }
    if (activeTab === "recommended") {
      const rec = recMap.get(p.id);
      if (!rec || rec.similarity_score < 40) return false;
    }
    if (activeTab === "mentors") {
      const isAlumni = p.headline.toLowerCase().includes("amazon") ||
        p.headline.toLowerCase().includes("google") ||
        p.headline.toLowerCase().includes("sde") ||
        p.headline.toLowerCase().includes("mentor") ||
        p.headline.toLowerCase().includes("alumni");
      if (!isAlumni) return false;
    }

    // Campus filter
    if (selectedCampus !== "all") {
      if (selectedCampus === "Partner Campuses") {
        if (p.campus.includes("HIET") || p.campus.includes("HPTU")) return false;
      } else if (!p.campus.toLowerCase().includes(selectedCampus.toLowerCase())) {
        return false;
      }
    }

    // Role filter
    if (selectedRole !== "all") {
      if (!p.targetRole.toLowerCase().includes(selectedRole.toLowerCase()) &&
          !p.headline.toLowerCase().includes(selectedRole.toLowerCase())) {
        return false;
      }
    }

    return true;
  });

  const myConnectionsCount = user ? user.connections.length : 0;
  const verifiedPeersCount = profiles.filter((p) => p.verifiedCampusBadge).length;

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-xs font-semibold text-slate-900 shadow-xl">
          <Sparkles className="h-4 w-4 text-brand-400" /> {toastMessage}
        </div>
      )}

      {/* Network Hero Banner */}
      <div className="sense-card relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-white/90 via-white/80 to-cyan-50/40 border border-white/90 shadow-xl backdrop-blur-2xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full glass-panel/15 px-3 py-1 text-xs font-bold text-[#4F46E5] bg-orange-50 border border-orange-200/50">
            <GraduationCap className="h-3.5 w-3.5" /> Verified Talent & Peer Constellation
          </div>
          <h1 className="mt-2.5 text-2xl font-extrabold text-slate-900 sm:text-3xl">
            Student Network & Peer Directory
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-600">
            Connect with campus builders, endorse verified skills, collaborate on projects, and discover peers matched by AI similarity scoring.
          </p>

          <div className="mt-5 flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2 rounded-xl bg-white/80 border border-slate-200/60 px-3 py-1.5 font-semibold text-slate-800 shadow-xs">
              <Users className="h-4 w-4 text-cyan-300" />
              <span>{profiles.length} Active Students</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white/80 border border-slate-200/60 px-3 py-1.5 font-semibold text-slate-800 shadow-xs">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <span>{verifiedPeersCount} Verified Campus Badges</span>
            </div>
            {user && (
              <div className="flex items-center gap-2 rounded-xl bg-white/80 border border-slate-200/60 px-3 py-1.5 font-semibold text-slate-800 shadow-xs">
                <UserCheck className="h-4 w-4 text-amber-300" />
                <span>{myConnectionsCount} Connections</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="space-y-3 rounded-2xl border border-slate-200/80 glass-panel p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by student name, skill, project, or campus..."
              className="w-full rounded-xl border border-slate-200/80 bg-white/80 py-2 pl-9 pr-3 text-xs outline-none focus:border-brand-500 focus:glass-panel"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedCampus}
              onChange={(e) => setSelectedCampus(e.target.value)}
              className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-brand-500"
            >
              <option value="all">🏫 All Campuses</option>
              <option value="HIET Shahpur (HPTU)">HIET Shahpur</option>
              <option value="HPTU Hamirpur">HPTU Hamirpur</option>
              <option value="Partner Campuses">Partner Campuses</option>
            </select>

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-brand-500"
            >
              <option value="all">🎯 All Target Roles</option>
              <option value="Full-Stack">Full-Stack</option>
              <option value="Cloud & DevOps">Cloud & DevOps</option>
              <option value="AI/ML">AI/ML</option>
              <option value="Frontend">Frontend & UI/UX</option>
              <option value="Data">Data Engineering</option>
            </select>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-t border-slate-200/60 pt-3">
          <button
            type="button"
            onClick={() => setActiveTab("explore")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
              activeTab === "explore"
                ? "btn-1of1-primary text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 border border-slate-200/60"
            }`}
          >
            Explore All ({profiles.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("recommended")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
              activeTab === "recommended"
                ? "btn-1of1-primary text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 border border-slate-200/60"
            }`}
          >
            <Sparkles className="h-3 w-3 text-amber-400" />
            AI Matched Peers
          </button>
          {user && (
            <button
              type="button"
              onClick={() => setActiveTab("connections")}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                activeTab === "connections"
                  ? "btn-1of1-primary text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 border border-slate-200/60"
              }`}
            >
              My Connections ({myConnectionsCount})
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab("mentors")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
              activeTab === "mentors"
                ? "btn-1of1-primary text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 border border-slate-200/60"
            }`}
          >
            <Star className="h-3 w-3 text-amber-500" />
            Alumni & Mentors
          </button>
        </div>
      </div>

      {/* Student Cards Grid */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200/80 glass-panel p-12 text-center text-xs text-slate-500 font-mono shadow-sm">
          Loading student network graph and computing AI similarities...
        </div>
      ) : filteredPeers.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 glass-panel p-12 text-center shadow-sm">
          <Users className="mx-auto h-8 w-8 text-slate-600" />
          <p className="mt-2 text-sm font-semibold text-slate-800">No peers found matching your criteria</p>
          <p className="mt-1 text-xs text-slate-500 font-mono">Try broadening your search query or selecting &quot;All Campuses&quot;.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSelectedCampus("all");
              setSelectedRole("all");
              setActiveTab("explore");
            }}
            className="mt-3 rounded-xl btn-1of1-primary px-4 py-2 text-xs font-semibold text-white"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPeers.map((peer) => {
            const isConnected = user ? user.connections.includes(peer.id) : false;
            const rec = recMap.get(peer.id);
            const isAlumni = peer.headline.toLowerCase().includes("amazon") ||
              peer.headline.toLowerCase().includes("google") ||
              peer.headline.toLowerCase().includes("sde");

            return (
              <div
                key={peer.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/80 glass-panel p-5 shadow-sm transition hover:shadow-md"
              >
                <div>
                  {/* Top Row: Avatar + Name + Campus Badge + Readiness Score */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-base font-bold text-slate-900 shadow-sm"
                        style={{ backgroundColor: peer.avatarColor }}
                      >
                        {peer.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h2 className="text-sm font-bold text-slate-900 font-bold">{peer.name}</h2>
                          {peer.verifiedCampusBadge && (
                            <span title="Verified Campus Student / Alumnus">
                              <ShieldCheck className="h-4 w-4 text-emerald-600" />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-medium text-slate-500 font-mono">{peer.campus}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                        <Award className="h-3 w-3" /> {peer.readinessScore}/100
                      </span>
                      <span className="mt-0.5 text-[10px] text-slate-500">{peer.readinessTier}</span>
                    </div>
                  </div>

                  {/* Headline & Target Role */}
                  <p className="mt-3 text-xs font-semibold text-slate-800 font-medium line-clamp-1">{peer.headline}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] text-slate-500 font-mono leading-relaxed">{peer.bio}</p>

                  {/* AI Similarity Match Banner */}
                  {rec && (
                    <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-[11px] text-indigo-950">
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1 text-indigo-700">
                          <Sparkles className="h-3 w-3 text-amber-500" /> AI Compatibility Match
                        </span>
                        <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-950">
                          {rec.similarity_score}% Match
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-indigo-800">{rec.reason}</p>
                    </div>
                  )}

                  {/* Mentor Highlight Pill if alumni */}
                  {isAlumni && (
                    <div className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800">
                      <Star className="h-3 w-3 text-amber-600 fill-amber-500" />
                      HIET Alumni Mentor · Open for Mock Interviews & Guidance
                    </div>
                  )}

                  {/* Project Showcase preview */}
                  {peer.projects && peer.projects.length > 0 && (
                    <div className="mt-3 rounded-xl border border-slate-200/70 bg-slate-50/60 p-2.5">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3 text-slate-500 font-mono" /> Featured Project
                        </span>
                        <span>{peer.projects[0].techStack.slice(0, 2).join(", ")}</span>
                      </div>
                      <p className="mt-1 text-xs font-bold text-slate-800 font-medium line-clamp-1">
                        {peer.projects[0].title}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono line-clamp-1">
                        {peer.projects[0].description}
                      </p>
                    </div>
                  )}

                  {/* Skills with Endorsement Actions */}
                  <div className="mt-3">
                    <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      <span>Skills</span>
                      <span className="text-[9px] text-brand-600">Click thumb to endorse</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {peer.skills.slice(0, 5).map((sk) => {
                        const isEndorsing = endorsingMap[`${peer.id}-${sk.name}`];
                        return (
                          <div
                            key={sk.name}
                            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition ${
                              sk.verified
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : "border-slate-200/80 bg-slate-50/80 border border-slate-200/60 text-slate-800"
                            }`}
                          >
                            {sk.verified && <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />}
                            <span>{sk.name}</span>
                            <button
                              type="button"
                              disabled={isEndorsing}
                              onClick={() => void handleEndorse(peer.id, sk.name)}
                              title={`Endorse ${peer.name}'s ${sk.name} skill`}
                              className="ml-0.5 flex items-center gap-0.5 rounded px-1 text-[10px] text-slate-500 font-mono hover:bg-slate-200 hover:text-indigo-700"
                            >
                              <ThumbsUp className="h-2.5 w-2.5" />
                              <span>{sk.endorsements}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions: Connect / Message */}
                <div className="mt-4 flex gap-2 border-t border-slate-200/60 pt-3">
                  <button
                    type="button"
                    onClick={() => void handleConnect(peer.id)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition ${
                      isConnected
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "btn-1of1-primary text-white hover:bg-brand-700"
                    }`}
                  >
                    {isConnected ? (
                      <>
                        <UserCheck className="h-3.5 w-3.5" /> Connected
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3.5 w-3.5" /> Connect
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => void startChat(peer.id)}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200/80 px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition"
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> Message
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
