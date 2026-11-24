import fs from "fs";
import path from "path";
import { createSeedDatabase } from "./seed";
import { PublicProfile, UserProfile, VLinkDatabase } from "./types";

const IS_SERVERLESS = Boolean(
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT ||
  process.env.VERCEL ||
  process.env.AMPLIFY_MONOREPO_APP_ROOT ||
  process.env.NODE_ENV === "production"
);

function getDbLocation(): { dataDir: string; dbPath: string } {
  if (IS_SERVERLESS && process.platform !== "win32") {
    const tmpDir = path.join("/tmp", "vlink-data");
    const tmpDb = path.join(tmpDir, "vlink-db.json");
    return { dataDir: tmpDir, dbPath: tmpDb };
  }
  const localDir = path.join(process.cwd(), "data");
  return { dataDir: localDir, dbPath: path.join(localDir, "vlink-db.json") };
}

export function readDb(): VLinkDatabase {
  const { dataDir, dbPath } = getDbLocation();
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(dbPath)) {
      // If in serverless mode, copy initial bundled seed data from cwd if available
      const bundledPath = path.join(process.cwd(), "data", "vlink-db.json");
      if (fs.existsSync(bundledPath)) {
        const raw = fs.readFileSync(bundledPath, "utf-8");
        fs.writeFileSync(dbPath, raw, "utf-8");
        return JSON.parse(raw) as VLinkDatabase;
      }
      const seed = createSeedDatabase();
      fs.writeFileSync(dbPath, JSON.stringify(seed, null, 2), "utf-8");
      return seed;
    }
    const raw = fs.readFileSync(dbPath, "utf-8");
    return JSON.parse(raw) as VLinkDatabase;
  } catch (err) {
    console.warn("readDb warning:", err);
    return createSeedDatabase();
  }
}

export function writeDb(db: VLinkDatabase): void {
  const { dataDir, dbPath } = getDbLocation();
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const tmpPath = `${dbPath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), "utf-8");
    fs.renameSync(tmpPath, dbPath);
  } catch (err) {
    console.warn("writeDb warning:", err);
  }
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
