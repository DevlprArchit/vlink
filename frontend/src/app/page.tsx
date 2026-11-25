"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Award,
  Bookmark,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  FolderGit2,
  Heart,
  ImagePlus,
  MessageCircle,
  Pencil,
  Plus,
  Repeat2,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
  X,
  Check,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { CommunityGroup, Post, PublicProfile } from "@/lib/types";

type HydratedPost = Post & { author: PublicProfile | null; groupName?: string | null };
type HydratedGroup = CommunityGroup & { postCount?: number };
type FeedTab = "all" | "network" | "trending";

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string | Date): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function motivationalTagline(score: number): string {
  if (score >= 80) return "🚀 You're industry-ready. Keep the momentum!";
  if (score >= 60) return "💪 Strong progress — push for the next tier!";
  if (score >= 40) return "🌱 Growing steadily. Each step counts!";
  return "✨ Your journey starts here. Let's build it!";
}

const CATEGORY_COLORS: Record<string, string> = {
  Technology: "bg-blue-100 text-blue-700",
  Design: "bg-purple-100 text-purple-700",
  Business: "bg-amber-100 text-amber-700",
  Science: "bg-emerald-100 text-emerald-700",
  Arts: "bg-rose-100 text-rose-700",
  General: "bg-slate-100 border border-slate-200/60 text-slate-700",
};

const STAT_TRENDS = ["+3 from last week", "+1 from last week", "", "+2 from last week"];

// ─── Skeleton Card ───────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-200/80 glass-panel p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="skeleton h-11 w-11 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="skeleton h-3 w-32 rounded-md" />
          <div className="skeleton h-2.5 w-48 rounded-md" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="skeleton h-3 w-full rounded-md" />
        <div className="skeleton h-3 w-5/6 rounded-md" />
        <div className="skeleton h-3 w-4/6 rounded-md" />
      </div>
      <div className="mt-4 flex gap-4 border-t border-slate-100 pt-3">
        <div className="skeleton h-7 w-16 rounded-lg" />
        <div className="skeleton h-7 w-20 rounded-lg" />
        <div className="skeleton h-7 w-16 rounded-lg" />
      </div>
    </div>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 2500);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div className="toast fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 shadow-2xl">
      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
      {message}
    </div>
  );
}

// ─── Progress Ring ────────────────────────────────────────────────────────────

function ProgressRing({ score }: { score: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="relative flex h-24 w-24 items-center justify-center">
      <svg className="progress-ring -rotate-90" width="96" height="96">
        <circle cx="48" cy="48" r={r} stroke="#d1fae5" strokeWidth="8" fill="none" />
        <circle
          cx="48"
          cy="48"
          r={r}
          stroke="#059669"
          strokeWidth="8"
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <span className="absolute text-lg font-extrabold text-emerald-700">{score}</span>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyFeed({ onClear }: { onClear?: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 glass-panel p-10 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-4xl">
        📡
      </div>
      <h3 className="text-base font-bold text-slate-800">No posts yet</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-500 font-mono">
        Be the first to share a project milestone, learning win, or campus update!
      </p>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="mt-4 rounded-xl btn-1of1-primary px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-brand-700"
        >
          Clear filters &amp; explore all posts
        </button>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function HomeFeedPage() {
  const { user, setAuthModalOpen, demoLogin } = useAuth();
  const [posts, setPosts] = useState<HydratedPost[]>([]);
  const [groups, setGroups] = useState<HydratedGroup[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string>("");
  const [scope, setScope] = useState<FeedTab>("all");
  const [loadingFeed, setLoadingFeed] = useState(true);

  // Composer state
  const [postType, setPostType] = useState<"post" | "project" | "article">("post");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [composerGroupId, setComposerGroupId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [projectRepo, setProjectRepo] = useState("");
  const [publishing, setPublishing] = useState(false);

  // Comment drafts per post
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});

  // Bookmarks (local state)
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());

  // Reactions per post: map postId → reaction key
  const [reactions, setReactions] = useState<Record<string, string>>({});

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  // Edit / Delete post state (LinkedIn-style author controls)
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editTags, setEditTags] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  // Create group state
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");

  // Static demo streak
  const STREAK = 7;

  const loadFeed = useCallback(async () => {
    setLoadingFeed(true);
    try {
      const params = new URLSearchParams();
      if (activeGroupId) params.set("groupId", activeGroupId);
      if (scope === "network") params.set("scope", "network");
      const [postsRes, groupsRes] = await Promise.all([
        fetch(`/api/posts?${params.toString()}`, { cache: "no-store" }),
        fetch("/api/groups", { cache: "no-store" }),
      ]);
      if (postsRes.ok) {
        const d = (await postsRes.json()) as { posts: HydratedPost[] };
        setPosts(d.posts);
      }
      if (groupsRes.ok) {
        const g = (await groupsRes.json()) as { groups: HydratedGroup[] };
        setGroups(g.groups);
      }
    } finally {
      setLoadingFeed(false);
    }
  }, [activeGroupId, scope]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handlePublishPost(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    if (!content.trim()) return;
    setPublishing(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean);

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: postType,
          title: title || undefined,
          content,
          imageUrl: imageUrl || undefined,
          groupId: composerGroupId || undefined,
          tags,
          projectRef:
            postType === "project" && projectTitle.trim()
              ? {
                  title: projectTitle.trim(),
                  techStack: tags.length ? tags : ["Next.js", "TypeScript"],
                  repoUrl: projectRepo.trim() || undefined,
                }
              : undefined,
        }),
      });
      if (res.ok) {
        setTitle("");
        setContent("");
        setTagsInput("");
        setImageUrl("");
        setProjectTitle("");
        setProjectRepo("");
        await loadFeed();
      }
    } finally {
      setPublishing(false);
    }
  }

  async function handlePostAction(
    postId: string,
    action: "like" | "repost" | "comment",
    commentText?: string
  ) {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    const res = await fetch("/api/posts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, action, commentText }),
    });
    if (res.ok) {
      if (action === "comment") {
        setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
      }
      await loadFeed();
    }
  }

  async function handleToggleGroup(groupId: string) {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_join", groupId }),
    });
    await loadFeed();
  }

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    if (!newGroupName.trim()) return;
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        name: newGroupName,
        category: "Technology",
        description: newGroupDesc,
      }),
    });
    if (res.ok) {
      setNewGroupName("");
      setNewGroupDesc("");
      setShowNewGroup(false);
      await loadFeed();
    }
  }

  function handleShare(postId: string) {
    const url = `${window.location.origin}/posts/${postId}`;
    void navigator.clipboard.writeText(url).then(() => setToast("Link copied!"));
  }

  function toggleBookmark(postId: string) {
    setBookmarked((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  }

  function toggleReaction(postId: string, emoji: string) {
    setReactions((prev) => ({
      ...prev,
      [postId]: prev[postId] === emoji ? "" : emoji,
    }));
  }

  function startEditPost(post: HydratedPost) {
    setEditingPostId(post.id);
    setEditTitle(post.title || "");
    setEditContent(post.content || "");
    setEditTags((post.tags || []).join(", "));
    setConfirmDeleteId(null);
  }

  async function handleSavePostEdit(postId: string) {
    if (!editContent.trim()) return;
    setSavingEdit(true);
    try {
      const tags = editTags
        .split(",")
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean);
      const res = await fetch("/api/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          action: "edit",
          title: editTitle.trim(),
          content: editContent.trim(),
          tags,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { post: HydratedPost };
        setPosts((prev) => prev.map((p) => (p.id === postId ? data.post : p)));
        setEditingPostId(null);
        setToast("Post updated!");
      } else {
        setToast("Unable to update post.");
      }
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeletePost(postId: string) {
    setDeletingPostId(postId);
    try {
      const res = await fetch(`/api/posts?postId=${encodeURIComponent(postId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        setConfirmDeleteId(null);
        setToast("Post deleted!");
      } else {
        setToast("Unable to delete post.");
      }
    } finally {
      setDeletingPostId(null);
    }
  }

  // Trending: sort by likes desc
  const displayedPosts =
    scope === "trending"
      ? [...posts].sort((a, b) => b.likes.length - a.likes.length)
      : posts;

  const readinessScore = user?.readinessScore ?? 0;

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

            {/* ── Modern Human Welcome Center ── */}
      <section className="sense-card p-4 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5 sm:gap-6 border border-slate-200/80 bg-white">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 text-[#4F46E5] border border-orange-200/70">
              <Sparkles className="h-3 w-3" />
              <span>Campus Career Hub</span>
            </span>
            {user && (
              <span className="text-xs text-slate-500 font-medium">
                {user.campus}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back{user ? `, ${user.name.split(" ")[0]}` : ""}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {user
              ? user.readinessScore > 0
                ? `Your AI-verified DRI score is ${user.readinessScore}/100 for ${user.targetRole || "engineering roles"}. Practice an AI mock interview or browse verified opportunities.`
                : `Welcome to V-Link! Your DRI score is pending — complete the AI Readiness Diagnostic to generate your verified DRI Score & Report.`
              : "Join your campus talent network to verify your technical skills, prepare for corporate placement drives, and connect with peers."}
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-2.5">
            <Link href="/readiness" className="btn-dibs-primary text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{user && user.readinessScore === 0 ? "Take AI DRI Test" : "AI Readiness & Mock Interview"}</span>
            </Link>
            <Link href="/jobs" className="btn-dibs-secondary text-xs">
              <span>Explore Jobs</span>
            </Link>
            <Link href="/resume" className="btn-dibs-secondary text-xs">
              <span>ATS Resume Studio</span>
            </Link>
          </div>
        </div>
        {user && (
          <div className="shrink-0 flex items-center gap-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
            <ProgressRing score={readinessScore} />
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-slate-900">AI DRI Score</div>
              <div className="text-sm font-extrabold text-[#4F46E5]">
                {user.readinessScore > 0 ? `${user.readinessScore}/100` : "Pending"}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {user.readinessScore > 0 ? user.readinessTier : "Take Diagnostic"}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Stats ── */}
      <section
        className="dashboard-stats grid grid-cols-2 gap-3 lg:grid-cols-4"
        aria-label="Your V-Link statistics"
      >
        {[
          {
            icon: <Users className="h-5 w-5 text-cyan-700" />,
            label: "Campus connections",
            value: user?.connections.length ?? 0,
            trend: STAT_TRENDS[0],
          },
          {
            icon: <FolderGit2 className="h-5 w-5 text-indigo-600" />,
            label: "Showcase projects",
            value: user?.projects.length ?? 0,
            trend: STAT_TRENDS[1],
          },
          {
            icon: <Award className="h-5 w-5 text-emerald-600" />,
            label: "Career readiness",
            value: user?.readinessScore ?? 0,
            suffix: "/100",
            trend: STAT_TRENDS[2],
          },
          {
            icon: <CheckCircle2 className="h-5 w-5 text-brand-600" />,
            label: "Verified skills",
            value: user?.skills.filter((s) => s.verified).length ?? 0,
            trend: STAT_TRENDS[3],
          },
        ].map((stat, i) => (
          <div key={i} className="stat-card dashboard-stat rounded-2xl p-4">
            {stat.icon}
            <p className="mt-3 text-xs font-semibold text-slate-600">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {stat.value}
              {stat.suffix && <span className="text-sm font-semibold text-slate-500 font-mono">{stat.suffix}</span>}
            </p>
            {stat.trend && (
              <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                <TrendingUp className="h-3 w-3" />
                {stat.trend}
              </p>
            )}
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ── Left Column ── */}
        <aside className="space-y-4 lg:col-span-3">
          {user ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 glass-panel shadow-sm">
              <div className="h-16 bg-gradient-to-r from-brand-600 via-indigo-600 to-sky-500" />
              <div className="-mt-8 px-5 pb-5">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white text-xl font-bold text-white shadow-md"
                  style={{ backgroundColor: user.avatarColor }}
                >
                  {user.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <h2 className="text-base font-bold text-slate-900">{user.name}</h2>
                  {user.verifiedCampusBadge && (
                    <span
                      title="Verified Campus Student"
                      className="inline-flex items-center gap-0.5 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700"
                    >
                      <ShieldCheck className="h-3 w-3" /> Campus
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-600">{user.headline}</p>
                <p className="mt-1 text-[11px] font-medium text-slate-500">{user.campus}</p>

                <div className={`mt-4 rounded-xl border p-3 ${user.readinessScore > 0 ? "border-emerald-100 bg-emerald-50/70" : "border-amber-200 bg-amber-50/60"}`}>
                  <div className={`flex items-center justify-between text-xs font-semibold ${user.readinessScore > 0 ? "text-emerald-900" : "text-amber-900"}`}>
                    <span>AI Career Readiness</span>
                    <span className={`text-sm font-extrabold ${user.readinessScore > 0 ? "text-emerald-700" : "text-amber-700"}`}>
                      {user.readinessScore > 0 ? `${user.readinessScore}/100` : "Pending"}
                    </span>
                  </div>
                  <div className={`mt-1.5 h-2 w-full overflow-hidden rounded-full ${user.readinessScore > 0 ? "bg-emerald-200" : "bg-amber-200"}`}>
                    <div
                      className={`h-full rounded-full transition-all ${user.readinessScore > 0 ? "bg-emerald-600" : "bg-amber-500"}`}
                      style={{ width: `${user.readinessScore}%` }}
                    />
                  </div>
                  <div className={`mt-1.5 flex items-center justify-between text-[11px] ${user.readinessScore > 0 ? "text-emerald-700" : "text-amber-800"}`}>
                    <span>{user.readinessScore > 0 ? user.readinessTier : "Not evaluated yet"}</span>
                    <Link href="/readiness" className="font-semibold underline">
                      {user.readinessScore > 0 ? "View Report" : "Take DRI Test"}
                    </Link>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
                  <div>
                    <div className="text-sm font-bold text-slate-900">{user.connections.length}</div>
                    <div className="text-[11px] text-slate-500 font-mono">Peers</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{user.projects.length}</div>
                    <div className="text-[11px] text-slate-500 font-mono">Projects</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {user.skills.filter((s) => s.verified).length}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">Verified</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link
                    href="/resume"
                    className="rounded-xl border border-slate-200/80 py-2 text-center text-xs font-semibold text-slate-800 hover:bg-slate-50/80 border border-slate-200/60"
                  >
                    ATS Resume
                  </Link>
                  <Link
                    href="/jobs"
                    className="rounded-xl btn-dibs-primary py-2 text-center text-xs font-semibold text-white shadow-xs"
                  >
                    Matched Jobs
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200/80 glass-panel p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Sparkles className="h-5 w-5" />
              </div>
              <h2 className="mt-3 text-base font-bold text-slate-900">
                One Profile. Verified Readiness.
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                V-Link unites student networking, project showcasing, skill diagnostics, roadmaps,
                ATS resumes, and job matching in one campus platform.
              </p>
              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(true)}
                  className="w-full rounded-xl btn-1of1-primary py-2 text-xs font-semibold text-slate-900 hover:bg-brand-700"
                >
                  Register with Campus Email
                </button>
                <button
                  type="button"
                  onClick={() => void demoLogin("user-archit")}
                  className="w-full rounded-xl border border-slate-200/80 bg-white/80 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 border border-slate-200/60"
                >
                  Explore as Archit Sharma (Demo)
                </button>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200/80 glass-panel p-4 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Quick Readiness Links
            </h3>
            <div className="mt-2.5 space-y-1.5 text-xs font-medium text-slate-800">
              <Link href="/readiness" className="flex items-center justify-between rounded-lg p-2 hover:bg-slate-50/80 border border-slate-200/60">
                <span>Skill Diagnostic &amp; Score</span>
                <Award className="h-4 w-4 text-brand-600" />
              </Link>
              <Link href="/readiness?tab=roadmap" className="flex items-center justify-between rounded-lg p-2 hover:bg-slate-50/80 border border-slate-200/60">
                <span>Personalised Roadmap</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </Link>
              <Link href="/resume" className="flex items-center justify-between rounded-lg p-2 hover:bg-slate-50/80 border border-slate-200/60">
                <span>ATS PDF Resume Builder</span>
                <ExternalLink className="h-4 w-4 text-indigo-600" />
              </Link>
            </div>
          </div>
        </aside>

        {/* ── Center Column ── */}
        <section className="space-y-4 lg:col-span-6">
          {/* Composer */}
          <form
            onSubmit={handlePublishPost}
            className="rounded-2xl border border-slate-200/80 glass-panel p-4 shadow-sm"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 border border-slate-200/60 p-1 text-xs font-semibold">
                {(["post", "project", "article"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPostType(t)}
                    className={`rounded-lg px-3 py-1 capitalize transition ${
                      postType === t ? "glass-panel text-slate-900 font-bold shadow-sm" : "text-slate-500 font-mono"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <select
                value={composerGroupId}
                onChange={(e) => setComposerGroupId(e.target.value)}
                aria-label="Select community group"
                className="rounded-xl border border-slate-200/80 bg-white/80 px-2.5 py-1.5 text-xs text-slate-800 outline-none"
              >
                <option value="">Public Campus Feed</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    Group: {g.name}
                  </option>
                ))}
              </select>
            </div>

            {(postType === "article" || postType === "project") && (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  postType === "project"
                    ? "Post headline (e.g. Shipped V-Link Beta)"
                    : "Article title..."
                }
                className="mb-2 w-full rounded-xl border border-slate-200/80 px-3 py-2 text-sm font-medium outline-none focus:border-brand-500"
              />
            )}

            {postType === "project" && (
              <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="Project name"
                  className="rounded-xl border border-slate-200/80 px-3 py-1.5 text-xs outline-none focus:border-brand-500"
                />
                <input
                  type="url"
                  value={projectRepo}
                  onChange={(e) => setProjectRepo(e.target.value)}
                  placeholder="GitHub / Live URL (optional)"
                  className="rounded-xl border border-slate-200/80 px-3 py-1.5 text-xs outline-none focus:border-brand-500"
                />
              </div>
            )}

            <div className="relative">
              <textarea
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={2000}
                placeholder={
                  postType === "project"
                    ? "What milestone did you achieve today? Share your progress, tech stack, and learnings…"
                    : postType === "article"
                    ? "Write your article intro — spark curiosity, share insights…"
                    : "Share a project milestone, learning takeaway, or campus update…"
                }
                className="w-full resize-none rounded-xl border border-slate-200/80 p-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
              <span
                className={`absolute bottom-2 right-3 text-[10px] font-medium ${
                  content.length > 1800 ? "text-rose-500" : "text-slate-500"
                }`}
              >
                {2000 - content.length} left
              </span>
            </div>

            {imageUrl && (
              <div className="relative mt-2 overflow-hidden rounded-xl border border-slate-200/80">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Post attachment preview" className="max-h-56 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  className="absolute right-2 top-2 rounded-lg bg-slate-100/70 px-2 py-1 text-[11px] font-semibold text-slate-900"
                >
                  Remove
                </button>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200/80 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50/80 border border-slate-200/60">
                  <ImagePlus className="h-4 w-4 text-brand-600" />
                  Attach Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="Tags (comma separated)"
                  className="w-40 rounded-xl border border-slate-200/80 px-2.5 py-1.5 text-xs outline-none focus:border-brand-500"
                />
              </div>

              <button
                type="submit"
                disabled={publishing}
                className="flex items-center gap-1.5 rounded-xl btn-dibs-primary px-4 py-2 text-xs font-semibold text-white shadow-xs disabled:opacity-60"
              >
                <Send className="h-3.5 w-3.5" />
                {publishing ? "Posting..." : "Publish"}
              </button>
            </div>
          </form>

          {/* Feed Filters */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200/80 glass-panel px-4 py-2.5 shadow-sm">
            <div className="flex items-center gap-1 text-xs font-semibold">
              {(
                [
                  { key: "all", label: "All Campus Posts" },
                  { key: "network", label: "My Connections" },
                  { key: "trending", label: "🔥 Trending", icon: <TrendingUp className="h-3 w-3" /> },
                ] as { key: FeedTab; label: string; icon?: React.ReactNode }[]
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setScope(tab.key)}
                  className={`flex items-center gap-1 rounded-lg px-3 py-1 transition ${
                    scope === tab.key
                      ? "bg-brand-50 text-indigo-700"
                      : "text-slate-600 hover:bg-slate-50/80 border border-slate-200/60"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {activeGroupId && (
              <button
                type="button"
                onClick={() => setActiveGroupId("")}
                className="text-xs font-semibold text-brand-600 hover:underline"
              >
                Clear group filter
              </button>
            )}
          </div>

          {/* Feed Items */}
          {loadingFeed ? (
            <div className="space-y-4">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : displayedPosts.length === 0 ? (
            <EmptyFeed
              onClear={
                activeGroupId || scope !== "all"
                  ? () => {
                      setActiveGroupId("");
                      setScope("all");
                    }
                  : undefined
              }
            />
          ) : (
            displayedPosts.map((post) => {
              const isLiked = user ? post.likes.includes(user.id) : false;
              const isReposted = user ? post.reposts.includes(user.id) : false;
              const isBookmarked = bookmarked.has(post.id);
              const myReaction = reactions[post.id] || "";
              const authorInitials = (post.author?.name || "S")
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <article
                  key={post.id}
                  className="post-card rounded-2xl border border-slate-200/80 glass-panel p-5 shadow-sm"
                >
                  {/* Author row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm"
                        style={{ backgroundColor: post.author?.avatarColor || "#4F46E5" }}
                      >
                        {authorInitials}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link
                            href={`/profile/${post.author?.id ?? ""}`}
                            className="text-sm font-bold text-slate-900 hover:text-indigo-700 hover:underline"
                          >
                            {post.author?.name || "Student"}
                          </Link>
                          {post.author?.verifiedCampusBadge && (
                            <ShieldCheck className="h-3.5 w-3.5 text-brand-600" />
                          )}
                          <span className="rounded-md bg-slate-100 border border-slate-200/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                            {post.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono">{post.author?.headline}</p>
                        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                          <Clock className="h-3 w-3" />
                          {timeAgo(post.createdAt)}
                          {post.updatedAt && <span className="text-slate-400">· edited</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {post.groupName && (
                        <span className="hidden sm:inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-medium text-indigo-700">
                          {post.groupName}
                        </span>
                      )}
                      {user && post.authorId === user.id && (
                        <>
                          <button
                            type="button"
                            onClick={() => startEditPost(post)}
                            title="Edit post"
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200/70"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(confirmDeleteId === post.id ? null : post.id)}
                            title="Delete post"
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50 border border-rose-200/70"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Delete</span>
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleBookmark(post.id)}
                        title={isBookmarked ? "Remove bookmark" : "Save post"}
                        className={`rounded-lg p-1.5 transition hover:bg-slate-100 border border-slate-200/60 ${
                          isBookmarked ? "text-brand-600" : "text-slate-500"
                        }`}
                      >
                        <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-brand-600" : ""}`} />
                      </button>
                    </div>
                  </div>

                  {/* Inline Delete Confirmation */}
                  {confirmDeleteId === post.id && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs">
                      <span className="font-semibold text-rose-800">
                        Delete this post permanently?
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={deletingPostId === post.id}
                          onClick={() => void handleDeletePost(post.id)}
                          className="rounded-lg bg-rose-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                        >
                          {deletingPostId === post.id ? "Deleting..." : "Confirm Delete"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Post content or Inline Edit Mode */}
                  {editingPostId === post.id ? (
                    <div className="mt-3 space-y-2.5 rounded-xl border border-indigo-200 bg-indigo-50/40 p-3.5">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Headline (optional)"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-indigo-500"
                      />
                      <textarea
                        rows={4}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        placeholder="Edit your post..."
                        className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-900 outline-none focus:border-indigo-500"
                      />
                      <input
                        type="text"
                        value={editTags}
                        onChange={(e) => setEditTags(e.target.value)}
                        placeholder="Tags (comma separated)"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-500"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingPostId(null)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <X className="h-3.5 w-3.5" /> Cancel
                        </button>
                        <button
                          type="button"
                          disabled={savingEdit || !editContent.trim()}
                          onClick={() => void handleSavePostEdit(post.id)}
                          className="inline-flex items-center gap-1 rounded-lg btn-dibs-primary px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" /> {savingEdit ? "Saving..." : "Save Changes"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {post.title && (
                        <h3 className="mt-3 text-base font-bold text-slate-900">{post.title}</h3>
                      )}
                      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-800 font-normal">
                        {post.content}
                      </p>
                    </>
                  )}

                  {/* Project card */}
                  {post.projectRef && (
                    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-indigo-50/40 p-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg btn-1of1-primary/10 text-brand-600">
                            <FolderGit2 className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-bold text-slate-900">
                            {post.projectRef.title}
                          </span>
                        </div>
                        {post.projectRef.repoUrl && (
                          <a
                            href={post.projectRef.repoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 rounded-lg btn-dibs-primary px-2.5 py-1 text-[11px] font-semibold text-white shadow-xs"
                          >
                            <ExternalLink className="h-3 w-3" /> View Repo
                          </a>
                        )}
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {post.projectRef.techStack.map((tech) => (
                          <span
                            key={tech}
                            className="chip rounded-full glass-panel px-2.5 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Image */}
                  {post.imageUrl && (
                    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200/80">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={post.imageUrl}
                        alt={post.title || "Student post attachment"}
                        className="max-h-80 w-full object-cover"
                      />
                    </div>
                  )}

                  {/* Tags */}
                  {post.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-slate-100 border border-slate-200/60 px-2.5 py-0.5 text-[11px] font-medium text-slate-600"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3 text-xs font-semibold text-slate-600">
                    {/* Like */}
                    <button
                      type="button"
                      onClick={() => void handlePostAction(post.id, "like")}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition hover:bg-slate-50/80 border border-slate-200/60 ${
                        isLiked ? "text-rose-600" : ""
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${isLiked ? "fill-rose-600" : ""}`} />
                      {post.likes.length}
                    </button>

                    {/* Reactions */}
                    {[
                      { emoji: "👏", label: "Celebrate" },
                      { emoji: "💡", label: "Insightful" },
                    ].map((r) => (
                      <button
                        key={r.emoji}
                        type="button"
                        title={r.label}
                        onClick={() => toggleReaction(post.id, r.emoji)}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 transition hover:bg-slate-50/80 border border-slate-200/60 ${
                          myReaction === r.emoji
                            ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                            : ""
                        }`}
                      >
                        {r.emoji}
                        <span className="text-[11px]">{r.label}</span>
                      </button>
                    ))}

                    {/* Comment */}
                    <button
                      type="button"
                      onClick={() =>
                        setOpenComments((prev) => ({ ...prev, [post.id]: !prev[post.id] }))
                      }
                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 hover:bg-slate-50/80 border border-slate-200/60"
                    >
                      <MessageCircle className="h-4 w-4" />
                      {post.comments.length}
                    </button>

                    {/* Repost */}
                    <button
                      type="button"
                      onClick={() => void handlePostAction(post.id, "repost")}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition hover:bg-slate-50/80 border border-slate-200/60 ${
                        isReposted ? "text-emerald-600" : ""
                      }`}
                    >
                      <Repeat2 className="h-4 w-4" />
                      {post.reposts.length}
                    </button>

                    {/* Share */}
                    <button
                      type="button"
                      onClick={() => handleShare(post.id)}
                      className="ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 hover:bg-slate-50/80 border border-slate-200/60"
                    >
                      <Share2 className="h-4 w-4" />
                      Share
                    </button>
                  </div>

                  {/* Comments */}
                  {(openComments[post.id] || post.comments.length > 0) && (
                    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                      {post.comments.map((c) => (
                        <div key={c.id} className="rounded-xl bg-slate-50/80 border border-slate-200/60 px-3 py-2 text-xs">
                          <span className="font-bold text-slate-900">{c.authorName}</span>{" "}
                          <span className="text-[11px] text-slate-500">· {c.authorHeadline}</span>
                          <p className="mt-0.5 text-slate-800">{c.content}</p>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={commentDrafts[post.id] || ""}
                          onChange={(e) =>
                            setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                          }
                          placeholder="Write a constructive comment..."
                          className="flex-1 rounded-xl border border-slate-200/80 px-3 py-1.5 text-xs outline-none focus:border-brand-500"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            void handlePostAction(post.id, "comment", commentDrafts[post.id] || "")
                          }
                          className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-800"
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </section>

        {/* ── Right Column ── */}
        <aside className="space-y-4 lg:col-span-3">
          <div className="rounded-2xl border border-slate-200/80 glass-panel p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Users className="h-4 w-4 text-brand-600" />
                Communities
              </div>
              <button
                type="button"
                onClick={() => setShowNewGroup((prev) => !prev)}
                className="flex items-center gap-1 rounded-lg bg-slate-100 border border-slate-200/60 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
              >
                <Plus className="h-3 w-3" /> New
              </button>
            </div>

            {showNewGroup && (
              <form onSubmit={handleCreateGroup} className="mt-3 space-y-2 rounded-xl bg-slate-50/80 border border-slate-200/60 p-3">
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Group name"
                  className="w-full rounded-lg border border-slate-200/80 glass-panel px-2.5 py-1.5 text-xs outline-none"
                />
                <input
                  type="text"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="Short description"
                  className="w-full rounded-lg border border-slate-200/80 glass-panel px-2.5 py-1.5 text-xs outline-none"
                />
                <button
                  type="submit"
                  className="w-full rounded-lg btn-1of1-primary py-1.5 text-xs font-semibold text-slate-900"
                >
                  Create Group
                </button>
              </form>
            )}

            <div className="mt-3 space-y-2.5">
              {groups.map((grp) => {
                const joined = user ? grp.memberIds.includes(user.id) : false;
                const isSelected = activeGroupId === grp.id;
                const colorClass =
                  CATEGORY_COLORS[grp.category] ?? "bg-slate-100 border border-slate-200/60 text-slate-800";
                return (
                  <div
                    key={grp.id}
                    className={`rounded-xl border p-3 transition ${
                      isSelected ? "border-brand-400 bg-brand-50/40" : "border-slate-100 bg-slate-50/80 border border-slate-200/60/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveGroupId(isSelected ? "" : grp.id)}
                        className="text-left text-xs font-bold text-slate-900 hover:text-indigo-700"
                      >
                        {grp.name}
                      </button>
                      <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${colorClass}`}>
                        {grp.category}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] text-slate-500 font-mono">{grp.description}</p>
                    <div className="mt-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700">
                        <Users className="h-3 w-3 text-slate-500" />
                        <span className="text-slate-900 font-bold">{grp.memberIds.length}</span>
                        <span className="font-normal text-slate-500">
                          members · {grp.postCount || 0} posts
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleToggleGroup(grp.id)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                          joined
                            ? "bg-emerald-50 text-emerald-700"
                            : "btn-1of1-primary text-white hover:bg-brand-700"
                        }`}
                      >
                        {joined ? "✓ Joined" : "Join"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
