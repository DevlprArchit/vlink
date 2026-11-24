import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { readDb, writeDb } from "@/lib/store";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ notifications: [] });
  }
  const db = readDb();
  const notifications = db.notifications.filter((n) => n.userId === userId);
  return NextResponse.json({ notifications });
}

export async function PATCH(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = readDb();
  const body = (await req.json()) as { notificationId?: string; markAll?: boolean };
  for (const n of db.notifications) {
    if (n.userId === userId && (body.markAll || n.id === body.notificationId)) {
      n.read = true;
    }
  }
  writeDb(db);
  return NextResponse.json({
    notifications: db.notifications.filter((n) => n.userId === userId),
  });
}
