/* eslint-disable jsx-a11y/media-has-caption */
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { LockKeyhole } from "lucide-react";
import { getDb, isDatabaseConfigured } from "@/db";
import { postReplies, privacySettings, projectComments, projects, timelinePosts, users } from "@/db/schema";
import PublicProfileAction from "@/components/public-profile-actions";
import styles from "./public-profile.module.css";

const publicOrigin = process.env.NEXT_PUBLIC_APP_URL ?? "https://nice2network.vercel.app";

async function getSharedProfile(username: string) {
  if (!isDatabaseConfigured()) return null;
  const db = getDb();
  const [profile] = await db.select({
    id: users.id, username: users.username, name: users.name, image: users.image,
    profession: users.profession, headline: users.headline, bio: users.bio,
    location: users.location, showLocation: privacySettings.showLocation,
    visibility: privacySettings.profileVisibility,
  }).from(users).leftJoin(privacySettings, eq(privacySettings.userId, users.id)).where(and(
    eq(users.username, username.toLowerCase()),
    eq(users.status, "active"),
    isNotNull(users.emailVerified),
  )).limit(1);
  if (!profile) return null;

  if (profile.visibility !== "public") return { profile, posts: [], projects: [], replies: [], comments: [], restricted: true as const };

  const [posts, ownedProjects] = await Promise.all([
    db.select().from(timelinePosts).where(and(
      eq(timelinePosts.authorId, profile.id), eq(timelinePosts.status, "visible"), eq(timelinePosts.visibility, "network"),
    )).orderBy(desc(timelinePosts.createdAt)).limit(60),
    db.select().from(projects).where(and(
      eq(projects.ownerId, profile.id), eq(projects.status, "active"), eq(projects.visibility, "network"),
    )).orderBy(desc(projects.createdAt)).limit(60),
  ]);
  const postIds = posts.map(({ id }) => id);
  const projectIds = ownedProjects.map(({ id }) => id);
  const [replies, comments] = await Promise.all([
    postIds.length ? db.select({ id: postReplies.id, parentId: postReplies.postId, body: postReplies.body, createdAt: postReplies.createdAt, authorName: users.name, authorImage: users.image }).from(postReplies).innerJoin(users, eq(users.id, postReplies.authorId)).where(and(inArray(postReplies.postId, postIds), eq(postReplies.status, "visible"), eq(users.status, "active"))).orderBy(asc(postReplies.createdAt)) : [],
    projectIds.length ? db.select({ id: projectComments.id, parentId: projectComments.projectId, body: projectComments.body, createdAt: projectComments.createdAt, authorName: users.name, authorImage: users.image }).from(projectComments).innerJoin(users, eq(users.id, projectComments.authorId)).where(and(inArray(projectComments.projectId, projectIds), eq(projectComments.status, "visible"), eq(users.status, "active"))).orderBy(asc(projectComments.createdAt)) : [],
  ]);
  return { profile, posts, projects: ownedProjects, replies, comments, restricted: false as const };
}

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const result = await getSharedProfile(username);
  if (!result) return { title: "Profile unavailable — nice 2 network", robots: { index: false, follow: false } };
  const title = `${result.profile.name ?? `@${result.profile.username}`} (@${result.profile.username}) — nice 2 network`;
  const description = result.restricted ? `Request to follow @${result.profile.username} on nice 2 network.` : result.profile.headline ?? result.profile.profession ?? `See @${result.profile.username}'s public posts and projects on nice 2 network.`;
  return { title, description, robots: result.restricted ? { index: false, follow: false } : undefined, alternates: { canonical: `${publicOrigin}/${result.profile.username}` }, openGraph: { title, description, url: `${publicOrigin}/${result.profile.username}`, images: result.profile.image ? [{ url: result.profile.image }] : undefined } };
}

function date(value: Date) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(value);
}

function Replies({ items }: { items: Array<{ id: string; body: string; authorName: string | null; authorImage: string | null }> }) {
  if (!items.length) return null;
  return <div className={styles.replies}>{items.map(item => <div className={styles.reply} key={item.id}><Image src={item.authorImage || "/brand/nice-2-network-mark.svg"} alt="" width={28} height={28} unoptimized/><div><strong>{item.authorName ?? "n2 member"}</strong><p>{item.body}</p></div></div>)}</div>;
}

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const result = await getSharedProfile(username);
  if (!result) notFound();
  const { profile, posts, projects: publicProjects, replies, comments, restricted } = result;
  const avatar = profile.image || "/brand/nice-2-network-mark.svg";
  const replyMap = new Map(posts.map(post => [post.id, replies.filter(reply => reply.parentId === post.id)]));
  const commentMap = new Map(publicProjects.map(project => [project.id, comments.filter(comment => comment.parentId === project.id)]));

  return <div className={styles.page}>
    <header className={styles.header}><Link className={styles.brand} href="/"><span>n2</span><strong>nice 2 network</strong></Link><PublicProfileAction kind="signin" authenticatedHref="/" /></header>
    <main className={styles.main}>
      <section className={`${styles.profile} ${restricted ? styles.restrictedProfile : ""}`}>
        <Image className={styles.avatar} src={avatar} alt={profile.name ?? profile.username} width={192} height={192} unoptimized/>
        <div className={styles.identity}><small>@{profile.username}</small><h1>{profile.name ?? profile.username}</h1>{restricted ? <p className={styles.privateCopy}><LockKeyhole size={15} /> This profile is private. Send a follow request to ask for access.</p> : <><p>{profile.headline ?? profile.profession ?? "n2 member"}</p>{profile.bio&&<p className={styles.bio}>{profile.bio}</p>}{profile.showLocation&&profile.location&&<p className={styles.location}>{profile.location}</p>}</>}</div>
        <PublicProfileAction kind={restricted ? "request" : "follow"} targetId={restricted ? profile.id : undefined} authenticatedHref={`/?profile=${profile.id}`} />
      </section>
      {restricted ? <section className={styles.privatePanel}><LockKeyhole size={22} /><strong>Shared with permission.</strong><p>Once the profile owner accepts your request, sign in to view the profile through n2.</p></section> : <><div className={styles.tabs}><span>Posts & projects</span><small>{posts.length + publicProjects.length} public</small></div>
      <section className={styles.feed}>
        {!posts.length&&!publicProjects.length&&<div className={styles.empty}>No public posts or projects yet.</div>}
        {posts.map(post => <article className={styles.card} key={post.id}>
          <header className={styles.cardHeader}><Image className={styles.miniAvatar} src={avatar} alt="" width={72} height={72} unoptimized/><div><strong>{profile.name ?? profile.username}</strong><time>{date(post.createdAt)}</time></div></header>
          <p className={styles.body}>{post.body}</p>
          {post.attachmentUrl&&post.attachmentType==="image"&&<Image className={styles.media} src={post.attachmentUrl} alt="Post attachment" width={1200} height={800} unoptimized/>}
          {post.attachmentUrl&&post.attachmentType==="video"&&<video className={styles.media} src={post.attachmentUrl} controls preload="metadata"/>}
          {post.videoUrl&&<p className={styles.body}><a href={post.videoUrl} target="_blank" rel="noreferrer">Watch linked video</a></p>}
          <Replies items={replyMap.get(post.id) ?? []}/><footer className={styles.cardFooter}><span>{(replyMap.get(post.id) ?? []).length} replies</span><PublicProfileAction authenticatedHref={`/?profile=${profile.id}`} /></footer>
        </article>)}
        {publicProjects.map(project => <article className={styles.card} key={project.id}>
          <div className={styles.projectVisual} style={{background:project.accent}}/>
          {project.imageUrl&&<Image className={styles.media} src={project.imageUrl} alt="" width={1200} height={700} unoptimized/>}
          <div className={styles.projectBody}><small>{project.industry} · {project.stage}</small><h2><Link href={`/?view=projects&project=${project.id}`}>{project.title}</Link></h2><p>{project.summary}</p></div>
          <Replies items={commentMap.get(project.id) ?? []}/><footer className={styles.cardFooter}><span>{(commentMap.get(project.id) ?? []).length} replies</span><PublicProfileAction label="Reply or join project" authenticatedHref={`/?project=${project.id}`} /></footer>
        </article>)}
      </section></>}
      <footer className={styles.footer}>Public profile on <Link href="/">nice 2 network</Link></footer>
    </main>
  </div>;
}
