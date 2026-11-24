import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { readDb, toPublicProfile, writeDb } from "@/lib/store";
import { Post } from "@/lib/types";

export async function GET(req: NextRequest) {
  const db = readDb();
  const groupId = req.nextUrl.searchParams.get("groupId");
  const q = (req.nextUrl.searchParams.get("q") || "").trim().toLowerCase();
  const scope = req.nextUrl.searchParams.get("scope");
  const userId = await getSessionUserId();

  const currentUser = userId ? db.users.find((u) => u.id === userId) : undefined;

  const posts = db.posts
    .filter((p) => {
      if (groupId && p.groupId !== groupId) return false;
      if (scope === "network" && currentUser) {
        const visibleAuthors = new Set([
          currentUser.id,
          ...currentUser.connections,
          ...currentUser.following,
        ]);
        if (!visibleAuthors.has(p.authorId)) return false;
      }
      if (q) {
        const matchText =
          p.content.toLowerCase().includes(q) ||
          (p.title || "").toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchText) return false;
      }
      return true;
    })
    .map((p) => {
      const author = db.users.find((u) => u.id === p.authorId);
      const group = p.groupId ? db.groups.find((g) => g.id === p.groupId) : undefined;
      return {
        ...p,
        author: author ? toPublicProfile(author) : null,
        groupName: group?.name || null,
      };
    });

  return NextResponse.json({ posts });
}

export async function POST(req: NextRequest) {
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
    type?: "post" | "project" | "article";
    title?: string;
    content: string;
    imageUrl?: string;
    groupId?: string;
    tags?: string[];
    projectRef?: {
      title: string;
      techStack: string[];
      repoUrl?: string;
    };
  };

  if (!body.content || !body.content.trim()) {
    return NextResponse.json({ error: "Post content is required." }, { status: 400 });
  }

  const newPost: Post = {
    id: `post-${Date.now()}`,
    authorId: user.id,
    type: body.type || "post",
    title: body.title?.trim() || undefined,
    content: body.content.trim(),
    imageUrl: body.imageUrl?.trim() || undefined,
    projectRef: body.projectRef,
    groupId: body.groupId || undefined,
    tags: (body.tags || []).filter(Boolean),
    likes: [],
    reposts: [],
    comments: [],
    createdAt: new Date().toISOString(),
  };

  db.posts.unshift(newPost);
  writeDb(db);

  return NextResponse.json(
    {
      post: {
        ...newPost,
        author: toPublicProfile(user),
      },
    },
    { status: 201 }
  );
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
    postId: string;
    action: "like" | "repost" | "comment";
    commentText?: string;
  };

  const post = db.posts.find((p) => p.id === body.postId);
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (body.action === "like") {
    if (post.likes.includes(user.id)) {
      post.likes = post.likes.filter((id) => id !== user.id);
    } else {
      post.likes.push(user.id);
    }
  } else if (body.action === "repost") {
    if (post.reposts.includes(user.id)) {
      post.reposts = post.reposts.filter((id) => id !== user.id);
    } else {
      post.reposts.push(user.id);
    }
  } else if (body.action === "comment" && body.commentText?.trim()) {
    post.comments.push({
      id: `comment-${Date.now()}`,
      authorId: user.id,
      authorName: user.name,
      authorHeadline: user.headline,
      content: body.commentText.trim(),
      createdAt: new Date().toISOString(),
    });
  }

  writeDb(db);
  return NextResponse.json({ post });
}
