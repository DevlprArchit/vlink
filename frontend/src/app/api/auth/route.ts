import { NextRequest, NextResponse } from "next/server";
import {
  getSessionUserBackup,
  getSessionUserId,
  hashPassword,
  isValidCampusEmail,
  PROFILE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  signJsonToken,
  signSessionToken,
  verifyPassword,
} from "@/lib/auth";
import { createNotification, readDbAsync, toPublicProfile, writeDbAsync } from "@/lib/store";
import { PublicProfile, UserProfile } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function attachSessionCookies(res: NextResponse, user: PublicProfile) {
  const token = signSessionToken(user.id);
  const snap = signJsonToken(user);
  const opts = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    secure: (process.env.NODE_ENV as string) === "production",
  };
  res.cookies.set(SESSION_COOKIE_NAME, token, opts);
  res.cookies.set(PROFILE_COOKIE_NAME, snap, opts);
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
}

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json(
      { user: null },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } }
    );
  }
  const db = await readDbAsync();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    // Restore stateless session backup if container cold-started before sync
    const snap = await getSessionUserBackup<PublicProfile>();
    if (snap && snap.id === userId) {
      return NextResponse.json(
        { user: snap },
        { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } }
      );
    }
    return NextResponse.json(
      { user: null },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } }
    );
  }
  return NextResponse.json(
    { user: toPublicProfile(user) },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } }
  );
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
    res.cookies.delete(PROFILE_COOKIE_NAME);
    res.headers.set("Cache-Control", "no-store");
    return res;
  }

  const db = await readDbAsync();

  if (body.action === "demo") {
    const target = db.users.find((u) => u.id === (body.demoUserId || "user-archit")) || db.users[0];
    const pub = toPublicProfile(target);
    const res = NextResponse.json({ user: pub });
    attachSessionCookies(res, pub);
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
    const pub = toPublicProfile(user);
    const res = NextResponse.json({ user: pub });
    attachSessionCookies(res, pub);
    return res;
  }

  if (body.action === "register") {
    const name = (body.name || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const campus = (body.campus || "").trim();
    const department = (body.department || "").trim();
    const graduationYear = (body.graduationYear || "").trim();
    const targetRole = (body.targetRole || "").trim();

    if (!name || !email || password.length < 6) {
      return NextResponse.json(
        { error: "Provide full name, valid email, and a password of at least 6 characters." },
        { status: 400 }
      );
    }

    if (!isValidCampusEmail(email)) {
      return NextResponse.json(
        { error: "Please register using a valid email address." },
        { status: 400 }
      );
    }

    if (db.users.some((u) => u.email.toLowerCase() === email)) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const newUser: UserProfile = {
      id: `user-${Date.now()}`,
      name,
      email,
      passwordHash: hashPassword(password),
      campus: campus || "Campus Member",
      department: department || "Engineering",
      graduationYear: graduationYear || "2027",
      headline: "",
      bio: "",
      targetRole: targetRole || "",
      verifiedCampusBadge: false,
      avatarColor: "#4F46E5",
      education: "",
      skills: [],
      projects: [],
      interests: [],
      readinessScore: 0,
      readinessTier: "Diagnostic Pending",
      readinessDimensions: {
        "Core Skills": 0,
        "Diagnostic": 0,
        "Projects": 0,
        "Certifications": 0,
        "Verification": 0,
        "Coverage": 0,
      },
      connections: [],
      following: [],
      followedCompanies: [],
      joinedGroups: [],
    };

    db.users.push(newUser);

    createNotification(db, {
      userId: newUser.id,
      category: "connection",
      title: "Welcome to V-Link! Complete Your AI DRI Test",
      body: "Your profile starts fresh at 0 connections & Diagnostic Pending. Add your skills/projects and take the AI DRI Test.",
      link: "/readiness",
    });

    await writeDbAsync(db);

    const pub = toPublicProfile(newUser);
    const res = NextResponse.json({ user: pub }, { status: 201 });
    attachSessionCookies(res, pub);
    return res;
  }

  return NextResponse.json({ error: "Unsupported auth action." }, { status: 400 });
}
