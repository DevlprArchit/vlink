"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  Bell,
  Briefcase,
  CheckCheck,
  FileText,
  Home,
  LogIn,
  LogOut,
  MessageSquare,
  Search,
  Send,
  Sparkles,
  User,
  Users,
  Briefcase as BriefcaseIcon,
  UserPlus,
  Star,
  Trophy,
  Clock,
  Trash2,
  Building2,
  FileSearch,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AuthGateModal } from "./AuthGateModal";

interface SearchResults {
  people: Array<{ id: string; name: string; headline: string; campus: string }>;
  posts: Array<{ id: string; title?: string; content: string; authorName: string }>;
  companies: Array<{ id: string; name: string; industry: string }>;
  jobs: Array<{ id: string; title: string; companyName: string; location: string }>;
}

type NotificationCategory = "application" | "connection" | "endorsement" | "milestone" | "other";

interface CopilotMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  time: string;
}

const INITIAL_COPILOT_MESSAGES: CopilotMessage[] = [
  {
    id: "welcome-1",
    sender: "ai",
    text: "👋 Hi! I am your V-Link AI Mentor. Ask me about boosting your Demonstrable Readiness Index (DRI), optimizing your resume for ATS, technical interview prep, or exploring campus hiring drives.",
    time: "Just now",
  },
];

function getNotifCategory(title: string): NotificationCategory {
  const t = title.toLowerCase();
  if (t.includes("appli") || t.includes("interview") || t.includes("shortlist")) return "application";
  if (t.includes("connect") || t.includes("follow") || t.includes("request")) return "connection";
  if (t.includes("endors") || t.includes("skill")) return "endorsement";
  if (t.includes("milestone") || t.includes("badge") || t.includes("complet") || t.includes("achieve")) return "milestone";
  return "other";
}

function NotifCategoryIcon({ category }: { category: NotificationCategory }) {
  const cls = "h-3.5 w-3.5 shrink-0";
  if (category === "application") return <BriefcaseIcon className={`${cls} text-cyan-400`} />;
  if (category === "connection") return <UserPlus className={`${cls} text-emerald-400`} />;
  if (category === "endorsement") return <Star className={`${cls} text-amber-400`} />;
  if (category === "milestone") return <Trophy className={`${cls} text-yellow-400`} />;
  return <Bell className={`${cls} text-slate-400`} />;
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const NAV_ITEMS = [
  { href: "/", label: "Feed", icon: Home },
  { href: "/network", label: "Network", icon: Users },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/readiness", label: "Readiness", icon: Award },
  { href: "/resume", label: "Resume", icon: FileText },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/profile", label: "Profile", icon: User },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, notifications, setAuthModalOpen, logout, refreshNotifications } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifList, setNotifList] = useState(notifications);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotInput, setCopilotInput] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotMessages, setCopilotMessages] = useState<CopilotMessage[]>(INITIAL_COPILOT_MESSAGES);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  function handleClearChat() {
    setCopilotMessages(INITIAL_COPILOT_MESSAGES);
  }

  async function handleSendCopilot(overrideText?: string) {
    const textToSend = (overrideText ?? copilotInput).trim();
    if (!textToSend || copilotLoading) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: CopilotMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: textToSend,
      time: timeStr,
    };

    setCopilotMessages((prev) => [...prev, userMsg]);
    if (!overrideText) {
      setCopilotInput("");
    }
    setCopilotLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "copilot-chat",
          payload: {
            message: textToSend,
            context: {
              userName: user?.name,
              targetRole: user?.targetRole,
              readinessScore: user?.readinessScore,
            },
          },
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const replyText =
          json?.data?.reply ||
          json?.reply ||
          "I am analyzing your profile data. Check /readiness for detailed recommendations.";
        const aiMsg: CopilotMessage = {
          id: `ai-${Date.now()}`,
          sender: "ai",
          text: replyText,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setCopilotMessages((prev) => [...prev, aiMsg]);
      } else {
        const errMsg: CopilotMessage = {
          id: `ai-err-${Date.now()}`,
          sender: "ai",
          text: "I encountered a connection issue. Please make sure the service is online or try again.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setCopilotMessages((prev) => [...prev, errMsg]);
      }
    } catch {
      const errMsg: CopilotMessage = {
        id: `ai-err-${Date.now()}`,
        sender: "ai",
        text: "Unable to reach the AI service right now. Please verify network connectivity and try again.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setCopilotMessages((prev) => [...prev, errMsg]);
    } finally {
      setCopilotLoading(false);
    }
  }

  useEffect(() => {
    if (copilotOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [copilotMessages, copilotLoading, copilotOpen]);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const unreadMessages = 3;

  useEffect(() => {
    setNotifList(notifications);
  }, [notifications]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchResults(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("global-search")?.focus();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          setSearchResults((await res.json()) as SearchResults);
        }
      } catch {}
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    await refreshNotifications();
  }

  function clearAllNotifications() {
    setNotifList([]);
  }

  return (
    <div className="min-h-screen text-slate-900 flex flex-col font-sans selection:bg-[#4F46E5] selection:text-white bg-transparent">
      {/* â”€â”€â”€ 1-of-1 Dynamic Command HUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <header className="sticky top-3 z-50 w-full px-3 sm:px-6 max-w-7xl mx-auto no-print">
        <div className="glass-panel rounded-2xl px-3 sm:px-5 py-2.5 flex items-center justify-between gap-3 shadow-sm border border-slate-200/80 bg-white/90 backdrop-blur-2xl">
          {/* Brand + Live Status Node */}
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 font-black text-white shadow-sm ring-1 ring-slate-800 transition group-hover:bg-indigo-600">
                V
                <span className="absolute inset-0 rounded-xl bg-white/20 animate-pulse pointer-events-none" />
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black tracking-wider text-slate-900 uppercase">V-LINK</span>
                  <span className="text-[9px] font-mono tracking-widest px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-semibold">
                    INTELLIGENCE
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium font-mono">
                  <span className="status-node-live inline-block" />
                  <span className="text-slate-600 font-semibold">Campus Talent & Career OS</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Search Box with ⌘K */}
          <div ref={searchRef} className="relative flex-1 max-w-xs md:max-w-sm hidden md:block">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              id="global-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Explore peers, skills, roles..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/90 py-1.5 pl-8 pr-12 text-xs text-slate-800 outline-none transition focus:border-[#4F46E5] focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/10 font-medium placeholder:text-slate-400"
            />
            <span className="pointer-events-none absolute right-2.5 top-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-500 border border-slate-200">
              ⌘K
            </span>

            {/* Live Search dropdown */}
            {searchResults && (
              <div className="absolute left-0 right-0 top-full mt-2 z-50 max-h-96 overflow-y-auto rounded-2xl border border-white/90 bg-white/90 p-3 shadow-2xl backdrop-blur-2xl">
                <div className="mb-2 flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  <span>Query Matches</span>
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(""); setSearchResults(null); }}
                    className="text-cyan-400 hover:underline"
                  >
                    Clear
                  </button>
                </div>
                {searchResults.people.length === 0 &&
                searchResults.jobs.length === 0 &&
                searchResults.companies.length === 0 &&
                searchResults.posts.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-500">No matches found for &quot;{searchQuery}&quot;.</p>
                ) : (
                  <div className="space-y-2.5 text-xs">
                    {searchResults.people.length > 0 && (
                      <div>
                        <div className="mb-1 flex items-center gap-1 text-[10px] font-mono font-semibold uppercase text-cyan-400">
                          <Users className="h-3 w-3" /> Students & Peers
                        </div>
                        {searchResults.people.map((p) => (
                          <Link
                            key={p.id}
                            href="/network"
                            onClick={() => setSearchResults(null)}
                            className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-100/80 transition"
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-50 text-[#4F46E5] border border-orange-200/60 font-bold text-[10px]">
                              {p.name.slice(0, 1)}
                            </span>
                            <div>
                              <div className="font-bold text-slate-800">{p.name}</div>
                              <div className="text-[10px] text-slate-400">{p.headline}</div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                    {searchResults.jobs.length > 0 && (
                      <div>
                        <div className="mb-1 flex items-center gap-1 text-[10px] font-mono font-semibold uppercase text-emerald-400">
                          <Briefcase className="h-3 w-3" /> Opportunities
                        </div>
                        {searchResults.jobs.map((j) => (
                          <Link
                            key={j.id}
                            href="/jobs"
                            onClick={() => setSearchResults(null)}
                            className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-100/80 transition"
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-bold text-[10px]">
                              J
                            </span>
                            <div>
                              <div className="font-bold text-slate-800">{j.title}</div>
                              <div className="text-[10px] text-slate-400">{j.companyName} · {j.location}</div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation Pill Dock (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/90 p-1 rounded-full border border-slate-200/80">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
                    active
                      ? "bg-white text-[#4F46E5] shadow-xs font-bold border border-slate-200/60"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? "text-[#4F46E5]" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                  {item.href === "/messages" && unreadMessages > 0 && (
                    <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-500 px-1 text-[9px] font-bold text-slate-950">
                      {unreadMessages}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Icons & User Badge */}
          <div className="flex items-center gap-2 shrink-0">

            {user ? (
              <>
                {/* Readiness Ticker */}
                <Link
                  href="/readiness"
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-mono font-bold text-[#00A878] transition hover:bg-emerald-100/60 shadow-xs"
                >
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0 animate-pulse" />
                  <span>DRI {user.readinessScore}%</span>
                </Link>

                {/* Notifications */}
                <div ref={notifRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setNotifOpen((prev) => !prev)}
                    aria-label="Notifications"
                    className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-[#4F46E5]/40 hover:text-slate-900 shadow-xs"
                  >
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-500 px-1 text-[10px] font-bold text-slate-950 shadow-[0_0_8px_rgba(6,182,212,0.8)]">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-88 rounded-2xl border border-white/90 bg-white/90 shadow-2xl backdrop-blur-2xl p-2">
                      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">Alert Feed</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void markAllRead()}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-400 hover:underline"
                          >
                            <CheckCheck className="h-3 w-3 shrink-0" /> Mark all read
                          </button>
                          <button
                            type="button"
                            onClick={clearAllNotifications}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-400 hover:underline"
                          >
                            <Trash2 className="h-3 w-3 shrink-0" /> Clear
                          </button>
                        </div>
                      </div>

                      <div className="max-h-72 space-y-1 overflow-y-auto p-1.5">
                        {notifList.length === 0 ? (
                          <p className="py-6 text-center text-xs text-slate-400 font-mono">Everything up to date âœ¦</p>
                        ) : (
                          notifList.map((n) => {
                            const cat = getNotifCategory(n.title);
                            return (
                              <Link
                                key={n.id}
                                href={n.link}
                                onClick={() => setNotifOpen(false)}
                                className={`flex items-start gap-2.5 rounded-xl p-2.5 text-xs transition-colors ${
                                  n.read ? "bg-slate-50 text-slate-600 hover:bg-slate-100/70" : "bg-orange-50/60 text-slate-900 border border-orange-200/40 hover:bg-orange-50"
                                }`}
                              >
                                <div className="mt-0.5">
                                  <NotifCategoryIcon category={cat} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold leading-tight">{n.title}</div>
                                  <div className="mt-0.5 text-[11px] text-slate-400 leading-tight">{n.body}</div>
                                  {(n as any).createdAt && (
                                    <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                                      <Clock className="h-3 w-3 shrink-0" />
                                      {timeAgo((n as any).createdAt)}
                                    </div>
                                  )}
                                </div>
                              </Link>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile Pill */}
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/90 bg-white/80 px-2.5 py-1.5 text-xs font-semibold text-slate-800 transition hover:border-[#4F46E5]/40 hover:bg-white shadow-xs"
                >
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-black text-slate-950 shrink-0 shadow"
                    style={{ backgroundColor: user.avatarColor || "#38bdf8" }}
                  >
                    {user.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="hidden sm:inline font-mono text-[11px]">{user.name.split(" ")[0]}</span>
                </Link>

                {/* Sign Out */}
                <button
                  type="button"
                  onClick={() => void logout()}
                  title="Sign out"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/90 bg-white/80 text-slate-500 transition hover:border-rose-500/40 hover:text-rose-600 hover:bg-rose-50/60 shadow-xs shrink-0"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="btn-1of1-primary text-xs"
              >
                <LogIn className="h-3.5 w-3.5 shrink-0" />
                <span>Access Node</span>
              </button>
            )}
          </div>
        </div>

        {/* Medium-screen secondary nav */}
        <div className="hidden md:flex lg:hidden items-center gap-1 overflow-x-auto border border-white/90 px-3 py-1 bg-white/80 rounded-xl mt-1.5 backdrop-blur-xl">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  active ? "bg-white text-[#4F46E5] font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Icon className="h-3 w-3 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* â”€â”€â”€ Main Content Canvas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-3 sm:px-6 py-6 pb-28 md:pb-16">
        {children}
      </main>

      {/* â”€â”€â”€ Footer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <footer className="no-print mt-auto border-t border-slate-200/60 bg-white/60 px-4 sm:px-6 py-4 text-xs text-slate-600 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-3 font-mono text-[11px]">
          <div className="flex items-center gap-2">
            <span className="status-node-live inline-block" />
            <span className="font-bold text-slate-800">V-LINK (VISION LINK)</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400">AUTONOMOUS CAREER & TALENT CLOUD</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <Link href="/readiness" className="hover:text-[#4F46E5] transition">Readiness Engine</Link>
            <Link href="/resume" className="hover:text-[#4F46E5] transition">ATS Studio</Link>
            <Link href="/jobs" className="hover:text-[#4F46E5] transition">Job Radar</Link>
            <Link href="/network" className="hover:text-[#4F46E5] transition">Peer Constellation</Link>
          </div>
        </div>
      </footer>

      {/* â”€â”€â”€ Mobile Bottom Nav (<768px) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <nav className="fixed bottom-2 left-3 right-3 z-50 rounded-2xl border border-white/90 bg-white/85 backdrop-blur-2xl md:hidden no-print shadow-2xl p-1.5">
        <div className="flex items-stretch justify-around">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-1.5 text-[9px] font-semibold transition-all ${
                  active ? "text-[#4F46E5] font-bold scale-105" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? "text-[#4F46E5]" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ─── Floating "✦ V-Link AI Mentor" Real Conversational HUD ──── */}
      <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40 no-print flex flex-col items-end">
        {copilotOpen && (
          <div className="mb-3 w-[340px] sm:w-[420px] h-[520px] max-h-[82vh] flex flex-col card-dibs shadow-2xl border border-white/95 bg-white/95 backdrop-blur-3xl rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Copilot Header */}
            <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-slate-100 bg-white/60">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4F46E5] to-amber-500 text-white shadow-md">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">V-Link AI Mentor</h4>
                  <p className="text-[10px] text-slate-500 font-medium">AI Career Coach & Placement Intelligence</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleClearChat}
                  title="Clear conversation"
                  className="text-slate-400 hover:text-slate-700 text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 font-semibold transition"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setCopilotOpen(false)}
                  className="text-slate-400 hover:text-slate-700 text-xs px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 transition font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Quick Suggestion Chips */}
            <div className="px-3 py-2 border-b border-slate-100/80 bg-slate-50/60 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => void handleSendCopilot("How do I improve my DRI readiness score to 90%?")}
                className="shrink-0 rounded-full bg-white border border-slate-200 px-2.5 py-0.5 text-[10px] text-slate-700 font-semibold hover:border-[#4F46E5] hover:text-[#4F46E5] transition shadow-2xs"
              >
                ⚡ Boost DRI
              </button>
              <button
                type="button"
                onClick={() => void handleSendCopilot("How to optimize my resume for ATS parsers?")}
                className="shrink-0 rounded-full bg-white border border-slate-200 px-2.5 py-0.5 text-[10px] text-slate-700 font-semibold hover:border-[#4F46E5] hover:text-[#4F46E5] transition shadow-2xs"
              >
                📄 ATS Resume Tips
              </button>
              <button
                type="button"
                onClick={() => void handleSendCopilot("Give me a system design interview roadmap.")}
                className="shrink-0 rounded-full bg-white border border-slate-200 px-2.5 py-0.5 text-[10px] text-slate-700 font-semibold hover:border-[#4F46E5] hover:text-[#4F46E5] transition shadow-2xs"
              >
                💻 System Design
              </button>
              <button
                type="button"
                onClick={() => void handleSendCopilot("Show top active placement drives on V-Link.")}
                className="shrink-0 rounded-full bg-white border border-slate-200 px-2.5 py-0.5 text-[10px] text-slate-700 font-semibold hover:border-[#4F46E5] hover:text-[#4F46E5] transition shadow-2xs"
              >
                🚀 Active Jobs
              </button>
            </div>

            {/* Chat Messages Feed */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
              {copilotMessages.map((m) => {
                const isUser = m.sender === "user";
                return (
                  <div key={m.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                    <div
                      className={`max-w-[88%] text-xs leading-relaxed whitespace-pre-line rounded-2xl p-3 shadow-xs ${
                        isUser
                          ? "btn-dibs-primary text-white font-medium rounded-tr-xs"
                          : "bg-white border border-slate-200/80 text-slate-800 rounded-tl-xs"
                      }`}
                    >
                      {m.text}
                    </div>
                    <span className="mt-1 text-[9px] text-slate-400 font-mono px-1">{m.time}</span>
                  </div>
                );
              })}
              {copilotLoading && (
                <div className="flex items-center gap-1.5 p-3 rounded-2xl bg-white border border-slate-200/80 max-w-[65%] text-xs text-slate-500 shadow-xs">
                  <span className="h-2 w-2 rounded-full bg-[#4F46E5] animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-[#00C48C] animate-bounce" style={{ animationDelay: "300ms" }} />
                  <span className="ml-1 text-[11px] font-medium">V-Link AI is generating...</span>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSendCopilot();
              }}
              className="p-3 border-t border-slate-100 bg-white/80 flex items-center gap-2"
            >
              <input
                type="text"
                value={copilotInput}
                onChange={(e) => setCopilotInput(e.target.value)}
                placeholder="Ask V-Link AI anything..."
                className="flex-1 rounded-full border border-slate-200 bg-slate-50/90 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#4F46E5] focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/15 transition font-medium"
              />
              <button
                type="submit"
                disabled={!copilotInput.trim() || copilotLoading}
                className="btn-dibs-primary rounded-full p-2 h-8 w-8 flex items-center justify-center shrink-0 disabled:opacity-40 transition-transform active:scale-95"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        )}

        <button
          type="button"
          onClick={() => setCopilotOpen(!copilotOpen)}
          className="btn-dibs-primary flex items-center gap-2 px-4 py-2.5 shadow-2xl transition-transform hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Sparkles className="h-4 w-4" />
          <span className="tracking-wide">✦ V-Link AI Mentor</span>
          <span className="badge-mint py-0.5 px-1.5 text-[9px] uppercase tracking-wider">Live</span>
        </button>
      </div>

      <AuthGateModal />
    </div>
  );
}


