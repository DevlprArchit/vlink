import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { readDbAsync, toPublicProfile, writeDbAsync } from "@/lib/store";
import { Post } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const db = await readDbAsync();
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

  const db = await readDbAsync();
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
  await writeDbAsync(db);

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

  const db = await readDbAsync();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = (await req.json()) as {
    postId: string;
    action: "like" | "repost" | "comment" | "edit";
    commentText?: string;
    title?: string;
    content?: string;
    tags?: string[];
  };

  const post = db.posts.find((p) => p.id === body.postId);
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (body.action === "edit") {
    if (post.authorId !== user.id) {
      return NextResponse.json({ error: "Forbidden: You can only edit your own posts." }, { status: 403 });
    }
    if (!body.content || !body.content.trim()) {
      return NextResponse.json({ error: "Post content cannot be empty." }, { status: 400 });
    }
    post.content = body.content.trim();
    if (body.title !== undefined) {
      post.title = body.title.trim() || undefined;
    }
    if (Array.isArray(body.tags)) {
      post.tags = body.tags.map((t) => t.trim().replace(/^#/, "")).filter(Boolean);
    }
    post.updatedAt = new Date().toISOString();
    await writeDbAsync(db);
    const group = post.groupId ? db.groups.find((g) => g.id === post.groupId) : undefined;
    return NextResponse.json({
      post: {
        ...post,
        author: toPublicProfile(user),
        groupName: group?.name || null,
      },
    });
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

  await writeDbAsync(db);
  return NextResponse.json({ post });
}

export async function DELETE(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let postId = req.nextUrl.searchParams.get("postId") || "";
  if (!postId) {
    try {
      const body = (await req.json()) as { postId?: string };
      postId = body.postId || "";
    } catch {
      // ignore empty body
    }
  }

  if (!postId) {
    return NextResponse.json({ error: "postId is required." }, { status: 400 });
  }

  const db = await readDbAsync();
  const idx = db.posts.findIndex((p) => p.id === postId);
  if (idx === -1) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (db.posts[idx].authorId !== userId) {
    return NextResponse.json({ error: "Forbidden: You can only delete your own posts." }, { status: 403 });
  }

  db.posts.splice(idx, 1);
  await writeDbAsync(db);
  return NextResponse.json({ deleted: true, postId });
}
