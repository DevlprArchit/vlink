import {
  hashPassword,
  isValidCampusEmail,
  signSessionToken,
  verifyPassword,
  verifySessionToken,
} from "@/lib/auth";
import { createSeedDatabase } from "@/lib/seed";

describe("V-Link Core Auth & Domain Tests (Section 8.3 & 8.4)", () => {
  test("TC-01: validates campus emails and rejects non-campus personal emails", () => {
    expect(isValidCampusEmail("student@hiet.co.in")).toBe(true);
    expect(isValidCampusEmail("aarav@hptu.ac.in")).toBe(true);
    expect(isValidCampusEmail("alex@mit.edu")).toBe(true);
    expect(isValidCampusEmail("random@gmail.com")).toBe(false);
  });

  test("signs and verifies session tokens securely", () => {
    const token = signSessionToken("user-archit");
    expect(verifySessionToken(token)).toBe("user-archit");
    expect(verifySessionToken(`${token}tampered`)).toBeNull();
  });

  test("hashes and verifies passwords consistently", () => {
    const hash = hashPassword("vlink123");
    expect(verifyPassword("vlink123", hash)).toBe(true);
    expect(verifyPassword("wrongpass", hash)).toBe(false);
  });

  test("seed database includes all 11 core entities from Section 5.3", () => {
    const db = createSeedDatabase();
    expect(db.users.length).toBeGreaterThanOrEqual(4);
    expect(db.posts.length).toBeGreaterThanOrEqual(3);
    expect(db.groups.length).toBeGreaterThanOrEqual(3);
    expect(db.conversations.length).toBeGreaterThanOrEqual(2);
    expect(db.companies.length).toBeGreaterThanOrEqual(3);
    expect(db.jobs.length).toBeGreaterThanOrEqual(4);
    expect(db.applications.length).toBeGreaterThanOrEqual(1);
    expect(db.roadmaps.length).toBeGreaterThanOrEqual(1);
    expect(db.certifications.length).toBeGreaterThanOrEqual(4);
    expect(db.assessments.length).toBeGreaterThanOrEqual(1);
    expect(db.notifications.length).toBeGreaterThanOrEqual(2);
  });
});
