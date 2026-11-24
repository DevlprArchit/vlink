import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { callAiService } from "@/lib/ai-client";
import { createNotification, readDb, toPublicProfile, writeDb } from "@/lib/store";

export async function GET(req: NextRequest) {
  const db = readDb();
  const q = (req.nextUrl.searchParams.get("q") || "").trim().toLowerCase();
  const currentUserId = await getSessionUserId();

  const profiles = db.users
    .filter((u) => {
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.headline.toLowerCase().includes(q) ||
        u.campus.toLowerCase().includes(q) ||
        u.skills.some((s) => s.name.toLowerCase().includes(q))
      );
    })
    .map(toPublicProfile);

  const currentUser = currentUserId
    ? db.users.find((u) => u.id === currentUserId)
    : undefined;

  let recommendations: Array<{
    user_id: string;
    similarity_score: number;
    shared_skills: string[];
    shared_interests: string[];
    reason: string;
  }> = [];

  if (currentUser) {
    const candidates = db.users.filter((u) => u.id !== currentUser.id);
    const aiRes = await callAiService(
      "/api/ai/recommend-connections",
      {
        user_skills: currentUser.skills.map((s) => s.name),
        user_interests: currentUser.interests,
        user_campus: currentUser.campus,
        candidates: candidates.map((c) => ({
          id: c.id,
          name: c.name,
          skills: c.skills.map((s) => s.name),
          interests: c.interests,
          campus: c.campus,
        })),
      },
      () => ({
        recommendations: candidates.map((c) => {
          const sharedSkills = c.skills
            .map((s) => s.name)
            .filter((name) =>
              currentUser.skills.some(
                (us) => us.name.toLowerCase() === name.toLowerCase()
              )
            );
          const sharedInterests = c.interests.filter((i) =>
            currentUser.interests.includes(i)
          );
          const sameCampus = c.campus === currentUser.campus;
          const score = Math.min(
            98,
            25 + sharedSkills.length * 18 + sharedInterests.length * 10 + (sameCampus ? 12 : 0)
          );
          return {
            user_id: c.id,
            similarity_score: score,
            shared_skills: sharedSkills,
            shared_interests: sharedInterests,
            reason:
              sharedSkills.length > 0
                ? `Shared skills: ${sharedSkills.slice(0, 3).join(", ")}`
                : sameCampus
                ? `Same campus (${c.campus})`
                : "Peer student builder",
          };
        }),
      })
    );
    recommendations = aiRes.data.recommendations;
  }

  return NextResponse.json({ profiles, recommendations });
}

export async function PATCH(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = readDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = (await req.json()) as {
    action:
      | "update_profile"
      | "add_skill"
      | "add_project"
      | "connect"
      | "follow"
      | "endorse";
    headline?: string;
    bio?: string;
    targetRole?: string;
    education?: string;
    interests?: string[];
    skillName?: string;
    skillLevel?: number;
    project?: {
      title: string;
      description: string;
      techStack: string[];
      repoUrl?: string;
      liveUrl?: string;
    };
    targetUserId?: string;
    endorseSkill?: string;
  };

  if (body.action === "update_profile") {
    if (body.headline !== undefined) user.headline = body.headline;
    if (body.bio !== undefined) user.bio = body.bio;
    if (body.targetRole !== undefined) user.targetRole = body.targetRole;
    if (body.education !== undefined) user.education = body.education;
    if (body.interests !== undefined) user.interests = body.interests;
  } else if (body.action === "add_skill" && body.skillName) {
    const clean = body.skillName.trim();
    if (clean && !user.skills.some((s) => s.name.toLowerCase() === clean.toLowerCase())) {
      user.skills.push({
        name: clean,
        level: Math.min(100, Math.max(20, body.skillLevel || 70)),
        verified: false,
        endorsements: 0,
      });
    }
  } else if (body.action === "add_project" && body.project?.title) {
    user.projects.unshift({
      id: `proj-${Date.now()}`,
      title: body.project.title.trim(),
      description: body.project.description.trim(),
      techStack: body.project.techStack,
      repoUrl: body.project.repoUrl?.trim() || undefined,
      liveUrl: body.project.liveUrl?.trim() || undefined,
      highlights: [body.project.description.trim()],
    });
  } else if (body.action === "connect" && body.targetUserId) {
    const peer = db.users.find((u) => u.id === body.targetUserId);
    if (!peer) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }
    const already = user.connections.includes(peer.id);
    if (already) {
      user.connections = user.connections.filter((id) => id !== peer.id);
      peer.connections = peer.connections.filter((id) => id !== user.id);
    } else {
      user.connections.push(peer.id);
      if (!peer.connections.includes(user.id)) peer.connections.push(user.id);
      if (!user.following.includes(peer.id)) user.following.push(peer.id);
      createNotification(db, {
        userId: peer.id,
        category: "connection",
        title: `${user.name} connected with you`,
        body: `${user.name} (${user.campus}) is now in your V-Link network.`,
        link: "/network",
      });
    }
  } else if (body.action === "follow" && body.targetUserId) {
    if (user.following.includes(body.targetUserId)) {
      user.following = user.following.filter((id) => id !== body.targetUserId);
    } else {
      user.following.push(body.targetUserId);
    }
  } else if (body.action === "endorse" && body.targetUserId && body.endorseSkill) {
    const peer = db.users.find((u) => u.id === body.targetUserId);
    const skill = peer?.skills.find(
      (s) => s.name.toLowerCase() === body.endorseSkill?.toLowerCase()
    );
    if (peer && skill) {
      const endorsers = skill.endorsedBy || [];
      if (!endorsers.includes(user.id)) {
        endorsers.push(user.id);
        skill.endorsedBy = endorsers;
        skill.endorsements += 1;
        createNotification(db, {
          userId: peer.id,
          category: "endorsement",
          title: `${user.name} endorsed your ${skill.name} skill`,
          body: `Your ${skill.name} skill now has ${skill.endorsements} endorsement(s).`,
          link: "/profile",
        });
      }
    }
  }

  writeDb(db);
  return NextResponse.json({ user: toPublicProfile(user) });
}
