import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { postLikes, postReposts, projectEyes, projects, timelinePosts, users } from "@/db/schema";

export type ProfilePostActivity = {
  id: string;
  body: string;
  attachmentType: string | null;
  attachmentUrl: string | null;
  videoUrl: string | null;
  createdAt: Date;
  actedAt: Date;
  authorId: string;
  authorName: string | null;
  authorImage: string | null;
  authorProfession: string | null;
};

export type ProfileWatchingActivity = {
  id: string;
  title: string;
  summary: string;
  industry: string;
  stage: string;
  accent: string;
  imageUrl: string | null;
  createdAt: Date;
  actedAt: Date;
  ownerId: string;
  ownerName: string | null;
};

const postSelection = {
  id: timelinePosts.id,
  body: timelinePosts.body,
  attachmentType: timelinePosts.attachmentType,
  attachmentUrl: timelinePosts.attachmentUrl,
  videoUrl: timelinePosts.videoUrl,
  createdAt: timelinePosts.createdAt,
  authorId: users.id,
  authorName: users.name,
  authorImage: users.image,
  authorProfession: users.profession,
};

export async function getProfileActivity(userId: string) {
  const db = getDb();
  const [likes, reposts, watching] = await Promise.all([
    db.select({ ...postSelection, actedAt: postLikes.createdAt })
      .from(postLikes)
      .innerJoin(timelinePosts, eq(timelinePosts.id, postLikes.postId))
      .innerJoin(users, eq(users.id, timelinePosts.authorId))
      .where(and(eq(postLikes.userId, userId), eq(timelinePosts.status, "visible"), eq(timelinePosts.visibility, "network"), eq(users.status, "active")))
      .orderBy(desc(postLikes.createdAt)).limit(60),
    db.select({ ...postSelection, actedAt: postReposts.createdAt })
      .from(postReposts)
      .innerJoin(timelinePosts, eq(timelinePosts.id, postReposts.postId))
      .innerJoin(users, eq(users.id, timelinePosts.authorId))
      .where(and(eq(postReposts.userId, userId), eq(timelinePosts.status, "visible"), eq(timelinePosts.visibility, "network"), eq(users.status, "active")))
      .orderBy(desc(postReposts.createdAt)).limit(60),
    db.select({
      id: projects.id,
      title: projects.title,
      summary: projects.summary,
      industry: projects.industry,
      stage: projects.stage,
      accent: projects.accent,
      imageUrl: projects.imageUrl,
      createdAt: projects.createdAt,
      actedAt: projectEyes.createdAt,
      ownerId: users.id,
      ownerName: users.name,
    }).from(projectEyes)
      .innerJoin(projects, eq(projects.id, projectEyes.projectId))
      .innerJoin(users, eq(users.id, projects.ownerId))
      .where(and(eq(projectEyes.userId, userId), eq(projects.status, "active"), eq(projects.visibility, "network"), eq(users.status, "active")))
      .orderBy(desc(projectEyes.createdAt)).limit(60),
  ]);
  return { likes, watching, reposts };
}
