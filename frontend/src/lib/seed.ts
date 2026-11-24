import { hashPassword } from "./auth";
import { VLinkDatabase } from "./types";
import seedData from "./seed-data.json";

export function createSeedDatabase(): VLinkDatabase {
  const defaultPass = hashPassword("vlink123");
  const data = JSON.parse(JSON.stringify(seedData)) as VLinkDatabase;
  data.users.forEach((u) => {
    u.passwordHash = defaultPass;
  });
  return data;
}