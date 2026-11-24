import fs from "fs";
import path from "path";
import { createSeedDatabase } from "./seed";
import { PublicProfile, UserProfile, VLinkDatabase } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "vlink-db.json");

export function readDb(): VLinkDatabase {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const seed = createSeedDatabase();
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2), "utf-8");
    return seed;
  }
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(raw) as VLinkDatabase;
}

export function writeDb(db: VLinkDatabase): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), "utf-8");
  fs.renameSync(tmpPath, DB_PATH);
}

export function toPublicProfile(user: UserProfile): PublicProfile {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...rest } = user;
  return rest;
}

export function createNotification(
  db: VLinkDatabase,
  params: {
    userId: string;
    category: "connection" | "message" | "application" | "milestone" | "endorsement";
    title: string;
    body: string;
    link: string;
  }
): void {
  db.notifications.unshift({
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId: params.userId,
    category: params.category,
    title: params.title,
    body: params.body,
    read: false,
    link: params.link,
    createdAt: new Date().toISOString(),
  });
}
