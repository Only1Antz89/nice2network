/* eslint-disable jsx-a11y/media-has-caption */
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { LockKeyhole } from "lucide-react";
import { getDb } from "@/db";
import { postReplies, projectComments, projects, timelinePosts, users } from "@/db/schema";
import PublicProfileAction from "@/components/public-profile-actions";
import { getProfileActivity, type ProfilePostActivity } from "@/lib/profile-activity";
import { getSharedProfileIdentity } from "@/lib/public-profile";
import styles from "./public-profile.module.css";

const publicOrigin = process.env.NEXT_PUBLIC_APP_URL ?? "https://nice2network.vercel.app";

const getSharedProfile = cache(async function getSharedProfile(username: string) {
  const profile = await getSharedProfileIdentity(username);
  if (!profile) return null;

  if (profile.visibility !== "public") return { profile, posts: [], projects: [], replies: [], comments: [], activity: { likes: [], watching: [], reposts: [] }, restricted: true as const };

  const db = getDb();
  const [posts, ownedProjects, activity] = await Promise.all([
    db.select().from(timelinePosts).where(and(
      eq(timelinePosts.authorId, profile.id), eq(timelinePosts.status, "visible"), eq(timelinePosts.visibility, "network"),
    )).orderBy(desc(timelinePosts.createdAt)).limit(60),
    db.select().from(projects).where(and(
      eq(projects.ownerId, profile.id), eq(projects.status, "active"), eq(projects.visibility, "network"),
    )).orderBy(desc(projects.createdAt)).limit(60),
    getProfileActivity(profile.id),
  ]);
  const postIds = posts.map(({ id }) => id);
  const projectIds = ownedProjects.map(({ id }) => id);
  const [replies, comments] = await Promise.all([
    postIds.length ? db.select({ id: postReplies.id, parentId: postReplies.postId, body: postReplies.body, createdAt: postReplies.createdAt, authorName: users.name, authorImage: users.image }).from(postReplies).innerJoin(users, eq(users.id, postReplies.authorId)).where(and(inArray(postReplies.postId, postIds), eq(postReplies.status, "visible"), eq(users.status, "active"))).orderBy(asc(postReplies.createdAt)) : [],
    projectIds.length ? db.select({ id: projectComments.id, parentId: projectComments.projectId, body: projectComments.body, createdAt: projectComments.createdAt, authorName: users.name, authorImage: users.image }).from(projectComments).innerJoin(users, eq(users.id, projectComments.authorId)).where(and(inArray(projectComments.projectId, projectIds), eq(projectComments.status, "visible"), eq(users.status, "active"))).orderBy(asc(projectComments.createdAt)) : [],
  ]);
  return { profile, posts, projects: ownedProjects, replies, comments, activity, restricted: false as const };
});

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const result = await getSharedProfile(username);
  if (!result) return { title: "Profile unavailable — nice 2 network", robots: { index: false, follow: false } };
  const title = `${result.profile.name ?? `@${result.profile.username}`} (@${result.profile.username}) — nice 2 network`;
  const description = result.restricted ? `Request to follow @${result.profile.username} on nice 2 network.` : result.profile.headline ?? result.profile.profession ?? `See @${result.profile.username}'s public posts and projects on nice 2 network.`;
  const canonical = `${publicOrigin}/${result.profile.username}`;
  const image = `${canonical}/opengraph-image`;
  return {
    title, description,
    robots: result.restricted ? { index: false, follow: false } : undefined,
    alternates: { canonical },
    openGraph: { type: "profile", siteName: "nice 2 network", title, description, url: canonical, images: [{ url: image, width: 1200, height: 630, alt: `${result.profile.name ?? `@${result.profile.username}`} on nice 2 network` }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
    other: { "og:image:secure_url": image, "og:image:type": "image/png", "twitter:label1": "Profile", "twitter:data1": `@${result.profile.username}` },
  };
}

function date(value: Date) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(value);
}

function Replies({ items }: { items: Array<{ id: string; body: string; authorName: string | null; authorImage: string | null }> }) {
  if (!items.length) return null;
  return <div className={styles.replies}>{items.map(item => <div className={styles.reply} key={item.id}><Image src={item.authorImage || "/brand/nice-2-network-mark.svg"} alt="" width={28} height={28} unoptimized/><div><strong>{item.authorName ?? "n2 member"}</strong><p>{item.body}</p></div></div>)}</div>;
}

function ActivityPostCard({ post, action, profileId }: { post: ProfilePostActivity; action: "Liked" | "Reposted"; profileId: string }) {
  return <article className={styles.card}>
    <div className={styles.activityLabel}>{action} on {date(post.actedAt)}</div>
    <header className={styles.cardHeader}><Image className={styles.miniAvatar} src={post.authorImage || "/brand/nice-2-network-mark.svg"} alt="" width={72} height={72} unoptimized/><div><strong>{post.authorName ?? "n2 member"}</strong><time>{post.authorProfession ?? "n2 member"} · {date(post.createdAt)}</time></div></header>
    <p className={styles.body}>{post.body}</p>
    {post.attachmentUrl&&post.attachmentType==="image"&&<Image className={styles.media} src={post.attachmentUrl} alt="Post attachment" width={1200} height={800} unoptimized/>}
    {post.attachmentUrl&&post.attachmentType==="video"&&<video className={styles.media} src={post.attachmentUrl} controls preload="metadata"/>}
    {post.videoUrl&&<p className={styles.body}><a href={post.videoUrl} target="_blank" rel="noreferrer">Watch linked video</a></p>}
    <footer className={styles.cardFooter}><span>Shared by {post.authorName ?? "an n2 member"}</span><PublicProfileAction label="Open post" authenticatedHref={`/?post=${post.id}&profile=${profileId}`} /></footer>
  </article>;
}

export default async function PublicProfilePage({ params, searchParams }: { params: Promise<{ username: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { username } = await params;
  const { tab } = await searchParams;
  const result = await getSharedProfile(username);
  if (!result) notFound();
  const { profile, posts, projects: publicProjects, replies, comments, activity, restricted } = result;
  const activeTab = (["posts", "projects", "likes", "watching", "reposts"] as const).find(item => item === tab) ?? "posts";
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
      {restricted ? <section className={styles.privatePanel}><LockKeyhole size={22} /><strong>Shared with permission.</strong><p>Once the profile owner accepts your request, sign in to view the profile through n2.</p></section> : <><nav className={styles.tabs} aria-label="Public profile content">
        <Link className={activeTab === "posts" ? styles.activeTab : ""} href={`/${profile.username}?tab=posts`} aria-current={activeTab === "posts" ? "page" : undefined}>Posts <small>{posts.length}</small></Link>
        <Link className={activeTab === "projects" ? styles.activeTab : ""} href={`/${profile.username}?tab=projects`} aria-current={activeTab === "projects" ? "page" : undefined}>Projects <small>{publicProjects.length}</small></Link>
        <Link className={activeTab === "likes" ? styles.activeTab : ""} href={`/${profile.username}?tab=likes`} aria-current={activeTab === "likes" ? "page" : undefined}>Likes <small>{activity.likes.length}</small></Link>
        <Link className={activeTab === "watching" ? styles.activeTab : ""} href={`/${profile.username}?tab=watching`} aria-current={activeTab === "watching" ? "page" : undefined}>Watching <small>{activity.watching.length}</small></Link>
        <Link className={activeTab === "reposts" ? styles.activeTab : ""} href={`/${profile.username}?tab=reposts`} aria-current={activeTab === "reposts" ? "page" : undefined}>Reposts <small>{activity.reposts.length}</small></Link>
      </nav>
      <section className={styles.feed}>
        {activeTab === "posts" && !posts.length&&<div className={styles.empty}>No public posts yet.</div>}
        {activeTab === "projects" && !publicProjects.length&&<div className={styles.empty}>No public projects yet.</div>}
        {activeTab === "likes" && !activity.likes.length&&<div className={styles.empty}>No public likes yet.</div>}
        {activeTab === "watching" && !activity.watching.length&&<div className={styles.empty}>No public projects being watched yet.</div>}
        {activeTab === "reposts" && !activity.reposts.length&&<div className={styles.empty}>No public reposts yet.</div>}
        {activeTab === "posts" && posts.map(post => <article className={styles.card} key={post.id}>
          <header className={styles.cardHeader}><Image className={styles.miniAvatar} src={avatar} alt="" width={72} height={72} unoptimized/><div><strong>{profile.name ?? profile.username}</strong><time>{date(post.createdAt)}</time></div></header>
          <p className={styles.body}>{post.body}</p>
          {post.attachmentUrl&&post.attachmentType==="image"&&<Image className={styles.media} src={post.attachmentUrl} alt="Post attachment" width={1200} height={800} unoptimized/>}
          {post.attachmentUrl&&post.attachmentType==="video"&&<video className={styles.media} src={post.attachmentUrl} controls preload="metadata"/>}
          {post.videoUrl&&<p className={styles.body}><a href={post.videoUrl} target="_blank" rel="noreferrer">Watch linked video</a></p>}
          <Replies items={replyMap.get(post.id) ?? []}/><footer className={styles.cardFooter}><span>{(replyMap.get(post.id) ?? []).length} replies</span><PublicProfileAction authenticatedHref={`/?profile=${profile.id}`} /></footer>
        </article>)}
        {activeTab === "projects" && publicProjects.map(project => <article className={styles.card} key={project.id}>
          <div className={styles.projectVisual} style={{background:project.accent}}/>
          {project.imageUrl&&<Image className={styles.media} src={project.imageUrl} alt="" width={1200} height={700} unoptimized/>}
          <div className={styles.projectBody}><small>{project.industry} · {project.stage}</small><h2><Link href={`/?view=projects&project=${project.id}`}>{project.title}</Link></h2><p>{project.summary}</p></div>
          <Replies items={commentMap.get(project.id) ?? []}/><footer className={styles.cardFooter}><span>{(commentMap.get(project.id) ?? []).length} replies</span><PublicProfileAction label="Reply or join project" authenticatedHref={`/?project=${project.id}`} /></footer>
        </article>)}
        {activeTab === "likes" && activity.likes.map(post => <ActivityPostCard key={post.id} post={post} action="Liked" profileId={profile.id}/>)}
        {activeTab === "reposts" && activity.reposts.map(post => <ActivityPostCard key={post.id} post={post} action="Reposted" profileId={profile.id}/>)}
        {activeTab === "watching" && activity.watching.map(project => <article className={styles.card} key={project.id}>
          <div className={styles.activityLabel}>Watching since {date(project.actedAt)}</div>
          <div className={styles.projectVisual} style={{background:project.accent}}/>
          {project.imageUrl&&<Image className={styles.media} src={project.imageUrl} alt="" width={1200} height={700} unoptimized/>}
          <div className={styles.projectBody}><small>{project.industry} · {project.stage}</small><h2><Link href={`/?view=projects&project=${project.id}`}>{project.title}</Link></h2><p>{project.summary}</p></div>
          <footer className={styles.cardFooter}><span>Project by {project.ownerName ?? "an n2 member"}</span><PublicProfileAction label="View project" authenticatedHref={`/?view=projects&project=${project.id}`} /></footer>
        </article>)}
      </section></>}
      <footer className={styles.footer}>Public profile on <Link href="/">nice 2 network</Link></footer>
    </main>
  </div>;
}
