import crypto from "crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "vlink_session";
const SECRET = process.env.VLINK_AUTH_SECRET ||
  (process.env.NODE_ENV === "production" ? "" : "vlink-vision-link-hiet-2026-dev-secret");
const MAX_SESSION_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function getSecret(): string {
  if (!SECRET) {
    throw new Error("VLINK_AUTH_SECRET must be set before enabling production authentication.");
  }
  return SECRET;
}

export function hashPassword(password: string): string {
  return crypto.createHmac("sha256", getSecret()).update(password).digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  const candidate = Buffer.from(hashPassword(password), "hex");
  const stored = Buffer.from(hash, "hex");
  return candidate.length === stored.length && crypto.timingSafeEqual(candidate, stored);
}

export function isValidCampusEmail(email: string): boolean {
  const trimmed = email.trim().toLowerCase();
  // Accept standard academic domains (.edu, .ac.in, .edu.in) or campus domain suffixes
  return /^[^\s@]+@[^\s@]+\.(edu|ac\.in|edu\.in|ac\.[a-z]{2}|hiet\.org|hptu\.ac\.in)$/i.test(trimmed) ||
    /^[^\s@]+@(hiet|hptu|campus|student|vlink)\.[a-z.]{2,}$/i.test(trimmed);
}

export function signSessionToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ userId, iat: Date.now() })).toString("base64url");
  const sig = crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = Buffer.from(crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url"));
  const received = Buffer.from(sig);
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")) as { userId?: string; iat?: number };
    if (typeof parsed.userId !== "string" || !Number.isFinite(parsed.iat)) return null;
    const age = Date.now() - Number(parsed.iat);
    if (age < -60_000 || age > MAX_SESSION_AGE_MS) return null;
    return parsed.userId;
  } catch {
    return null;
  }
}

export async function getSessionUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}
