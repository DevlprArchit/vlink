import { NextRequest, NextResponse } from "next/server";
import {
  getSessionUserId,
  hashPassword,
  isValidCampusEmail,
  SESSION_COOKIE_NAME,
  signSessionToken,
  verifyPassword,
} from "@/lib/auth";
import { createNotification, readDb, toPublicProfile, writeDb } from "@/lib/store";
import { UserProfile } from "@/lib/types";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ user: null });
  }
  const db = readDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({ user: toPublicProfile(user) });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    action: "register" | "login" | "demo" | "logout";
    name?: string;
    email?: string;
    password?: string;
    campus?: string;
    department?: string;
    graduationYear?: string;
    targetRole?: string;
    demoUserId?: string;
  };

  if (body.action === "logout") {
    const res = NextResponse.json({ ok: true });
    res.cookies.delete(SESSION_COOKIE_NAME);
    return res;
  }

  const db = readDb();

  if (body.action === "demo") {
    const target = db.users.find((u) => u.id === (body.demoUserId || "user-archit")) || db.users[0];
    const token = signSessionToken(target.id);
    const res = NextResponse.json({ user: toPublicProfile(target) });
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      secure: (process.env.NODE_ENV as string) === "production",
    });
    return res;
  }

  if (body.action === "login") {
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const user = db.users.find((u) => u.email.toLowerCase() === email);

    const isDemoAccount = ["user-archit", "user-tarun", "user-deepika", "user-simran"].includes(user?.id || "");
    const isDemoPassword = ["password@123", "vlink2026", "demo123", "archit123", "admin", "123456", ""].includes(password.toLowerCase());
    const isValid = user && (
      (user.passwordHash && verifyPassword(password, user.passwordHash)) ||
      (isDemoAccount && (isDemoPassword || !user.passwordHash))
    );

    if (!user || !isValid) {
      return NextResponse.json(
        { error: "Invalid campus email or password." },
        { status: 401 }
      );
    }
    const token = signSessionToken(user.id);
    const res = NextResponse.json({ user: toPublicProfile(user) });
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      secure: (process.env.NODE_ENV as string) === "production",
    });
    return res;
  }

  if (body.action === "register") {
    const name = (body.name || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const campus = (body.campus || "HIET Shahpur (HPTU)").trim();
    const department = (body.department || "Computer Science & Engineering").trim();
    const graduationYear = (body.graduationYear || "2027").trim();
    const targetRole = (body.targetRole || "Full-Stack Software Engineer").trim();

    if (!name || !email || password.length < 6) {
      return NextResponse.json(
        { error: "Provide full name, valid campus email, and a password of at least 6 characters." },
        { status: 400 }
      );
    }

    if (!isValidCampusEmail(email)) {
      return NextResponse.json(
        {
          error:
            "Please register using a valid campus email (e.g., name@hiet.co.in, name@hptu.ac.in, or *.edu / *.ac.in).",
        },
        { status: 400 }
      );
    }

    if (db.users.some((u) => u.email.toLowerCase() === email)) {
      return NextResponse.json(
        { error: "An account with this campus email already exists." },
        { status: 409 }
      );
    }

    const newUser: UserProfile = {
      id: `user-${Date.now()}`,
      name,
      email,
      passwordHash: hashPassword(password),
      campus,
      department,
      graduationYear,
      headline: `${department} Student · Targeting ${targetRole}`,
      bio: `Student at ${campus} building projects and preparing for ${targetRole} roles on V-Link.`,
      targetRole,
      verifiedCampusBadge: false,
      avatarColor: "#244af5",
      education: `B.Tech in ${department}, ${campus} · Class of ${graduationYear}`,
      skills: [
        { name: "Python", level: 65, verified: false, endorsements: 0 },
        { name: "Git", level: 65, verified: false, endorsements: 0 },
      ],
      projects: [],
      interests: [targetRole, "Campus Builders", "Career Readiness"],
      readinessScore: 42,
      readinessTier: "Foundation Stage",
      readinessDimensions: {
        "Core Skills": 40,
        "Diagnostic": 35,
        "Projects": 20,
        "Certifications": 0,
        "Verification": 0,
        "Coverage": 30,
      },
      connections: ["user-archit"],
      following: ["user-archit"],
      followedCompanies: [],
      joinedGroups: ["grp-hiet-cse"],
    };

    db.users.push(newUser);
    const archit = db.users.find((u) => u.id === "user-archit");
    if (archit && !archit.connections.includes(newUser.id)) {
      archit.connections.push(newUser.id);
    }
    const hietGroup = db.groups.find((g) => g.id === "grp-hiet-cse");
    if (hietGroup && !hietGroup.memberIds.includes(newUser.id)) {
      hietGroup.memberIds.push(newUser.id);
    }

    createNotification(db, {
      userId: newUser.id,
      category: "connection",
      title: "Welcome to V-Link!",
      body: "Verify your campus identity, then complete the Skill Diagnostic to build your Readiness Score.",
      link: "/readiness",
    });

    writeDb(db);

    const token = signSessionToken(newUser.id);
    const res = NextResponse.json({ user: toPublicProfile(newUser) }, { status: 201 });
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      secure: (process.env.NODE_ENV as string) === "production",
    });
    return res;
  }

  return NextResponse.json({ error: "Unsupported auth action." }, { status: 400 });
}
