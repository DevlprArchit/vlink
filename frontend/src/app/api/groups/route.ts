import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { readDbAsync, writeDbAsync } from "@/lib/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const db = await readDbAsync();
  const groups = db.groups.map((g) => ({
    ...g,
    postCount: db.posts.filter((p) => p.groupId === g.id).length,
  }));
  return NextResponse.json({ groups }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await readDbAsync();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = (await req.json()) as {
    action: "toggle_join" | "create";
    groupId?: string;
    name?: string;
    category?: "Campus" | "Technology" | "Builders" | "Placements";
    description?: string;
  };

  if (body.action === "toggle_join" && body.groupId) {
    const group = db.groups.find((g) => g.id === body.groupId);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
    if (group.memberIds.includes(user.id)) {
      group.memberIds = group.memberIds.filter((id) => id !== user.id);
      user.joinedGroups = user.joinedGroups.filter((id) => id !== group.id);
    } else {
      group.memberIds.push(user.id);
      if (!user.joinedGroups.includes(group.id)) {
        user.joinedGroups.push(group.id);
      }
    }
    await writeDbAsync(db);
    return NextResponse.json({ group });
  }

  if (body.action === "create" && body.name?.trim()) {
    const newGroup = {
      id: `grp-${Date.now()}`,
      name: body.name.trim(),
      category: body.category || "Technology",
      campus: user.campus,
      description: body.description?.trim() || "Student community group on V-Link.",
      memberIds: [user.id],
    };
    db.groups.push(newGroup);
    user.joinedGroups.push(newGroup.id);
    await writeDbAsync(db);
    return NextResponse.json({ group: newGroup }, { status: 201 });
  }

  return NextResponse.json({ error: "Invalid group action" }, { status: 400 });
}
