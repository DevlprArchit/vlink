"use client";

import React, { useCallback, useEffect, useState } from "react";
import { MessageSquare, Plus, Send, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Conversation, PublicProfile } from "@/lib/types";

interface HydratedConversation extends Conversation {
  participants: PublicProfile[];
}

export default function MessagesPage() {
  const { user, setAuthModalOpen } = useAuth();
  const [conversations, setConversations] = useState<HydratedConversation[]>([]);
  const [peers, setPeers] = useState<PublicProfile[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [draft, setDraft] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [selectedPeers, setSelectedPeers] = useState<string[]>([]);
  const [groupTitle, setGroupTitle] = useState("");

  const loadMessages = useCallback(async () => {
    if (!user) return;
    const [msgRes, profRes] = await Promise.all([
      fetch("/api/messages", { cache: "no-store" }),
      fetch("/api/profile", { cache: "no-store" }),
    ]);
    if (msgRes.ok) {
      const d = (await msgRes.json()) as { conversations: HydratedConversation[] };
      setConversations(d.conversations);
      setActiveId((prev) => prev || d.conversations[0]?.id || "");
    }
    if (profRes.ok) {
      const p = (await profRes.json()) as { profiles: PublicProfile[] };
      setPeers(p.profiles.filter((pr) => pr.id !== user.id));
    }
  }, [user]);

  useEffect(() => {
    void loadMessages();
    const timer = setInterval(() => {
      void loadMessages();
    }, 5000);
    return () => clearInterval(timer);
  }, [loadMessages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || !draft.trim()) return;
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send",
        conversationId: activeId,
        content: draft,
      }),
    });
    if (res.ok) {
      setDraft("");
      await loadMessages();
    }
  }

  async function handleStartConversation(e: React.FormEvent) {
    e.preventDefault();
    if (selectedPeers.length === 0) return;
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "start",
        participantIds: selectedPeers,
        title: selectedPeers.length > 1 ? groupTitle || "Campus Study Group" : undefined,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { conversation: Conversation };
      setShowNewChat(false);
      setSelectedPeers([]);
      setGroupTitle("");
      setActiveId(data.conversation.id);
      await loadMessages();
    }
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-white/10 glass-panel p-10 text-center shadow-sm">
        <MessageSquare className="mx-auto h-8 w-8 text-brand-600" />
        <h1 className="mt-2 text-base font-bold text-white font-bold">Sign in to access Messaging</h1>
        <p className="mt-1 text-xs text-slate-400 font-mono">
          One-to-one and group messaging with your campus peers and project teams.
        </p>
        <button
          type="button"
          onClick={() => setAuthModalOpen(true)}
          className="mt-4 rounded-xl btn-1of1-primary px-4 py-2 text-xs font-semibold text-white"
        >
          Sign In / Demo Profile
        </button>
      </div>
    );
  }

  const activeConv = conversations.find((c) => c.id === activeId);

  function convLabel(conv: HydratedConversation) {
    if (conv.title) return conv.title;
    const others = conv.participants.filter((p) => p.id !== user?.id);
    return others.map((o) => o.name).join(", ") || "Direct Message";
  }

  return (
    <div className="grid min-h-[540px] grid-cols-1 overflow-hidden rounded-2xl border border-white/10 glass-panel shadow-sm md:grid-cols-12">
      {/* Sidebar Threads */}
      <aside className="border-b border-white/10 md:col-span-4 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between border-b border-white/5 p-4">
          <h1 className="text-sm font-bold text-slate-900">Messaging</h1>
          <button
            type="button"
            onClick={() => setShowNewChat((prev) => !prev)}
            className="flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-brand-100"
          >
            <Plus className="h-3.5 w-3.5" /> New Chat
          </button>
        </div>

        {showNewChat && (
          <form onSubmit={handleStartConversation} className="space-y-2 border-b border-slate-200/80 bg-white/80 p-3 text-xs">
            <div className="font-semibold text-slate-800">Select peers (1 for DM, 2+ for group):</div>
            <div className="max-h-32 space-y-1 overflow-y-auto">
              {peers.map((p) => (
                <label key={p.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedPeers.includes(p.id)}
                    onChange={(e) =>
                      setSelectedPeers((prev) =>
                        e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)
                      )
                    }
                  />
                  <span>{p.name}</span>
                </label>
              ))}
            </div>
            {selectedPeers.length > 1 && (
              <input
                type="text"
                value={groupTitle}
                onChange={(e) => setGroupTitle(e.target.value)}
                placeholder="Group chat name"
                className="w-full rounded-lg border border-slate-200/80 bg-white/90 px-2.5 py-1.5 text-xs text-slate-800 outline-none rounded-lg"
              />
            )}
            <button
              type="submit"
              className="w-full rounded-lg btn-1of1-primary py-1.5 font-semibold text-white"
            >
              Start Conversation
            </button>
          </form>
        )}

        <div className="divide-y divide-slate-100">
          {conversations.map((conv) => {
            const lastMsg = conv.messages[conv.messages.length - 1];
            const active = conv.id === activeId;
            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => setActiveId(conv.id)}
                className={`w-full p-4 text-left transition hover:bg-slate-100/70 ${
                  active ? "bg-brand-50/60" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    {conv.isGroup && <Users className="h-3.5 w-3.5 text-brand-600" />}
                    {convLabel(conv)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-1 text-[11px] text-slate-400 font-mono">
                  {lastMsg ? `${lastMsg.senderName}: ${lastMsg.content}` : "No messages yet"}
                </p>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Active Conversation */}
      <section className="flex flex-col md:col-span-8">
        {activeConv ? (
          <>
            <div className="border-b border-slate-200/80 px-5 py-3.5 bg-white/60">
              <div className="text-sm font-bold text-slate-900">{convLabel(activeConv)}</div>
              <div className="text-[11px] text-slate-400 font-mono">
                {activeConv.participants.map((p) => p.name).join(" · ")}
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {activeConv.messages.map((m) => {
                const mine = m.senderId === user.id;
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
                  >
                    <span className="mb-0.5 text-[10px] font-semibold text-slate-400">
                      {m.senderName}
                    </span>
                    <div
                      className={`max-w-md rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                        mine
                          ? "btn-1of1-primary text-white"
                          : "bg-white border border-slate-200/80 text-slate-800 font-medium shadow-xs"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                );
              })}
            </div>

            <form
              onSubmit={handleSend}
              className="flex items-center gap-2 border-t border-slate-200/80 p-4 bg-white/60"
            >
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write a message..."
                className="flex-1 rounded-xl border border-slate-200/80 bg-white/90 px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10"
              />
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl btn-1of1-primary px-4 py-2.5 text-xs font-semibold text-white hover:bg-brand-700"
              >
                <Send className="h-3.5 w-3.5" /> Send
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-10 text-xs text-slate-400 font-mono">
            Select or start a conversation.
          </div>
        )}
      </section>
    </div>
  );
}
