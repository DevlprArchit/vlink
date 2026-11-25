import fs from "fs";
import path from "path";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { createSeedDatabase } from "./seed";
import { PublicProfile, UserProfile, VLinkDatabase } from "./types";

const IS_SERVERLESS = Boolean(
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT ||
  process.env.VERCEL ||
  process.env.AMPLIFY_MONOREPO_APP_ROOT ||
  process.env.NODE_ENV === "production"
);

const DYNAMO_TABLE = process.env.VLINK_DYNAMODB_TABLE || process.env.NEXT_PUBLIC_DYNAMODB_TABLE || "VLinkCore";
const DYNAMO_REGION = process.env.VLINK_AWS_REGION || process.env.NEXT_PUBLIC_AWS_REGION || "ap-south-1";

// Use DynamoDB inside AWS compute runtimes where IAM compute role credentials are present
const SHOULD_USE_DYNAMO = Boolean(
  DYNAMO_TABLE &&
  (process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.AWS_EXECUTION_ENV ||
    process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI ||
    process.env.USE_AWS_DYNAMODB === "true")
);

let docClient: DynamoDBDocumentClient | null = null;
function getDynamoClient(): DynamoDBDocumentClient {
  if (!docClient) {
    const raw = new DynamoDBClient({ region: DYNAMO_REGION });
    docClient = DynamoDBDocumentClient.from(raw);
  }
  return docClient;
}

const STATE_PK = "APP#STATE";
const STATE_SK = "VLINK_DB_V2";

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

/**
 * Shared persistent database read across stateless AWS Lambda containers.
 * Falls back cleanly to local /tmp or disk cache if DynamoDB is unavailable.
 */
export async function readDbAsync(): Promise<VLinkDatabase> {
  if (SHOULD_USE_DYNAMO) {
    try {
      const res = await getDynamoClient().send(
        new GetCommand({
          TableName: DYNAMO_TABLE,
          Key: { PK: STATE_PK, SK: STATE_SK },
        })
      );
      const rawPayload = res.Item?.payload;
      if (typeof rawPayload === "string" && rawPayload.length > 2) {
        const parsed = JSON.parse(rawPayload) as VLinkDatabase;
        writeDb(parsed);
        return parsed;
      }
      // First initialization in DynamoDB: upload clean seed database
      const initial = readDb();
      await writeDbAsync(initial);
      return initial;
    } catch (err) {
      console.warn("DynamoDB readDbAsync fallback to local cache:", err);
    }
  }
  return readDb();
}

/**
 * Shared persistent database write synced to DynamoDB VLinkCore and local cache.
 */
export async function writeDbAsync(db: VLinkDatabase): Promise<void> {
  writeDb(db);
  if (SHOULD_USE_DYNAMO) {
    try {
      await getDynamoClient().send(
        new PutCommand({
          TableName: DYNAMO_TABLE,
          Item: {
            PK: STATE_PK,
            SK: STATE_SK,
            payload: JSON.stringify(db),
            updatedAt: new Date().toISOString(),
          },
        })
      );
    } catch (err) {
      console.warn("DynamoDB writeDbAsync warning:", err);
    }
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
