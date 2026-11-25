import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { readDbAsync, writeDbAsync } from "@/lib/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ notifications: [] }, { headers: { "Cache-Control": "no-store" } });
  }
  const db = await readDbAsync();
  const notifications = db.notifications.filter((n) => n.userId === userId);
  return NextResponse.json({ notifications }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = await readDbAsync();
  const body = (await req.json()) as { notificationId?: string; markAll?: boolean };
  for (const n of db.notifications) {
    if (n.userId === userId && (body.markAll || n.id === body.notificationId)) {
      n.read = true;
    }
  }
  await writeDbAsync(db);
  return NextResponse.json({
    notifications: db.notifications.filter((n) => n.userId === userId),
  });
}
