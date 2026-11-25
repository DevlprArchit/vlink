import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { createNotification, readDbAsync, toPublicProfile, writeDbAsync } from "@/lib/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ conversations: [] }, { headers: { "Cache-Control": "no-store" } });
  }
  const db = await readDbAsync();
  const conversations = db.conversations
    .filter((c) => c.participantIds.includes(userId))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .map((c) => ({
      ...c,
      participants: c.participantIds
        .map((pid) => db.users.find((u) => u.id === pid))
        .filter((u): u is NonNullable<typeof u> => Boolean(u))
        .map(toPublicProfile),
    }));

  return NextResponse.json({ conversations }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = await readDbAsync();
  const sender = db.users.find((u) => u.id === userId);
  if (!sender) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = (await req.json()) as {
    action: "send" | "start";
    conversationId?: string;
    recipientId?: string;
    title?: string;
    participantIds?: string[];
    content?: string;
  };

  if (body.action === "start") {
    const participants = Array.from(
      new Set([
        userId,
        ...(body.participantIds || []),
        ...(body.recipientId ? [body.recipientId] : []),
      ])
    );

    if (!body.title && participants.length === 2) {
      const existing = db.conversations.find(
        (c) =>
          !c.isGroup &&
          c.participantIds.length === 2 &&
          participants.every((p) => c.participantIds.includes(p))
      );
      if (existing) {
        return NextResponse.json({ conversation: existing });
      }
    }

    const conv = {
      id: `conv-${Date.now()}`,
      title: body.title?.trim() || undefined,
      isGroup: participants.length > 2 || Boolean(body.title),
      participantIds: participants,
      messages: body.content?.trim()
        ? [
            {
              id: `msg-${Date.now()}`,
              senderId: sender.id,
              senderName: sender.name,
              content: body.content.trim(),
              createdAt: new Date().toISOString(),
            },
          ]
        : [],
      updatedAt: new Date().toISOString(),
    };
    db.conversations.unshift(conv);
    await writeDbAsync(db);
    return NextResponse.json({ conversation: conv }, { status: 201 });
  }

  if (body.action === "send" && body.conversationId && body.content?.trim()) {
    const conv = db.conversations.find(
      (c) => c.id === body.conversationId && c.participantIds.includes(userId)
    );
    if (!conv) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    const msg = {
      id: `msg-${Date.now()}`,
      senderId: sender.id,
      senderName: sender.name,
      content: body.content.trim(),
      createdAt: new Date().toISOString(),
    };
    conv.messages.push(msg);
    conv.updatedAt = msg.createdAt;

    for (const pid of conv.participantIds) {
      if (pid !== sender.id) {
        createNotification(db, {
          userId: pid,
          category: "message",
          title: `New message from ${sender.name}`,
          body: msg.content.slice(0, 90),
          link: "/messages",
        });
      }
    }

    await writeDbAsync(db);
    return NextResponse.json({ message: msg, conversation: conv });
  }

  return NextResponse.json({ error: "Invalid message action" }, { status: 400 });
}
