import { NextRequest, NextResponse } from "next/server";
import { readDb, toPublicProfile } from "@/lib/store";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim().toLowerCase();
  const db = readDb();

  if (!q) {
    return NextResponse.json({ people: [], posts: [], companies: [], jobs: [] });
  }

  const people = db.users
    .filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.headline.toLowerCase().includes(q) ||
        u.campus.toLowerCase().includes(q) ||
        u.skills.some((s) => s.name.toLowerCase().includes(q))
    )
    .map(toPublicProfile);

  const posts = db.posts
    .filter(
      (p) =>
        p.content.toLowerCase().includes(q) ||
        (p.title || "").toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    )
    .map((p) => ({
      ...p,
      authorName: db.users.find((u) => u.id === p.authorId)?.name || "Student",
    }));

  const companies = db.companies.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.industry.toLowerCase().includes(q) ||
      c.location.toLowerCase().includes(q)
  );

  const jobs = db.jobs.filter(
    (j) =>
      j.title.toLowerCase().includes(q) ||
      j.companyName.toLowerCase().includes(q) ||
      j.requiredSkills.some((s) => s.toLowerCase().includes(q))
  );

  return NextResponse.json({ people, posts, companies, jobs });
}
