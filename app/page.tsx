/* eslint-disable no-empty, @next/next/no-img-element, jsx-a11y/label-has-associated-control, jsx-a11y/media-has-caption, jsx-a11y/no-autofocus, jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex, react-hooks/set-state-in-effect */
"use client";

import {
  ArrowLeft,
  ArrowUpRight,
  AudioLines,
  Bell,
  Bold,
  Bookmark,
  BriefcaseBusiness,
  CalendarDays,
  ClipboardList,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CircleAlert,
  Clock3,
  Ellipsis,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Italic,
  Globe2,
  Home,
  Lightbulb,
  Laptop,
  List,
  Paperclip,
  Pause,
  Play,
  LogOut,
  MapPin,
  Maximize2,
  Minus,
  Minimize2,
  Mic,
  Menu,
  MessageCircle,
  Navigation,
  Pencil,
  Pin,
  Plus,
  Repeat2,
  Rocket,
  Search,
  Send,
  Share2,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  UserX,
  UserPlus,
  UsersRound,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Underline,
  Video,
  Wrench,
  Zap,
  Archive,
  Accessibility,
  X,
} from "lucide-react";
import { FormEvent, type ReactNode, type RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import EmojiPicker from "@/components/emoji-picker";
import type { NotificationRecord } from "@/components/notification-panel";
import N2OrbitMark from "@/components/n2-orbit-mark";
import PeopleDiscoveryPanel from "@/components/people-discovery-panel";
import CareerIndustryInput from "@/components/career-industry-input";
import N2Select from "@/components/n2-select";
import { AppLoadingShell, LoadingState } from "@/components/loading-state";
import { PROJECT_ACCENT } from "@/lib/content-accents";
import { PROJECT_INDUSTRIES } from "@/lib/career-sectors";
import { canonicalIndustry, canonicalProfession, isMeaningfulOtherHeadline, OTHER_PROFESSION } from "@/lib/professional-profile";
import {
  getBrowserNotificationPreferences,
  playBrowserNotificationSound,
  setBrowserNotificationPreference,
} from "@/lib/browser-notifications";
import {
  Avatar,
  DemoBadge,
  Logo,
  N2AdminBadge,
  N2FounderLabel,
  N2IntAilliumWordmark,
  N2Mark,
  type MemberPerson,
} from "@/components/network-brand";
import { sanitizeRichText } from "@/lib/rich-text";
import { layoutFocusedNetwork } from "@/lib/network-focus-layout";
import { mergeNewestTimeline } from "@/lib/newest-timeline";
import { signalDeploymentNavigation } from "@/lib/deployment-navigation";
import { type ContentDraft, type DraftSummary, type PostDraftPayload, type ProjectDraftPayload } from "@/lib/content-drafts";
import { DraftSaveIndicator, useContentDraft } from "@/lib/use-content-draft";
import {
  ACCESSIBILITY_STORAGE_KEY,
  ACCESSIBILITY_EVENT,
  DEFAULT_ACCESSIBILITY_PREFERENCES,
  applyAccessibilityPreferences,
  normaliseAccessibilityPreferences,
  storeAndApplyAccessibilityPreferences,
  type AccessibilityPreferences,
} from "@/lib/accessibility-preferences";

const ActionDialog = dynamic(() => import("@/components/action-dialog"));
const GuestAuthPrompt = dynamic(() => import("@/components/guest-auth-prompt"));
const HelpPanel = dynamic(() => import("@/components/help-panel"));
const NotificationsPage = dynamic(() => import("@/components/notifications-page"));
const SearchOverlay = dynamic(() => import("@/components/search-overlay"));
const ShareSheet = dynamic(() => import("@/components/share-sheet"));

type View =
  | "feed"
  | "projects"
  | "network"
  | "messages"
  | "notifications"
  | "meet"
  | "profile"
  | "settings";
type ProjectRoleRecord = {
  id: string;
  title: string;
  department: string;
  description?: string | null;
  phase: string;
  status: string;
  criticality: string;
  capacity: number;
  filled: number;
  professions?: string[];
  requiredSkills?: string[];
  usefulSkills?: string[];
  workMode?: "remote" | "hybrid" | "in_person" | null;
  applicationCount?: number;
  pendingApplicationCount?: number;
};
type ContributionTarget = {
  projectId: string;
  projectTitle: string;
  roles: ProjectRoleRecord[];
  initialRoleId?: string;
};
type CoOwnerCandidate = {
  id: string;
  username: string | null;
  name: string | null;
  image: string | null;
  profession: string | null;
};
type ProjectRecord = {
  id: string;
  title: string;
  summary: string;
  description?: string | null;
  imageUrl?: string | null;
  industry: string;
  stage: string;
  status?: string;
  visibility?: string;
  accent: string;
  workMode?: string;
  city?: string | null;
  country?: string | null;
  ownerId?: string;
  ownerName: string | null;
  ownerImage: string | null;
  ownerIsAdmin?: boolean;
  isDemo?: boolean;
  isOwner?: boolean;
  isPrimaryOwner?: boolean;
  isMember?: boolean;
  isFollowingProject?: boolean;
  isPinned?: boolean;
  isBookmarked?: boolean;
  eyeCount: number;
  commentCount?: number;
  matchScore?: number;
  recommendationId?: string;
  recommendationTier?: string;
  recommendationReasons?: string[];
  matchedRole?: string;
  eyeMomentum?: number;
  deletionRequestedAt?: string | null;
  deletionScheduledAt?: string | null;
  deletionRequestedBy?: string | null;
  isReadOnly?: boolean;
  roles?: ProjectRoleRecord[];
  team?: Array<{
    userId: string;
    roleId?: string | null;
    name: string | null;
    image: string | null;
    profession: string | null;
    department: string | null;
    membershipRole: string;
  }>;
  pendingCoOwners?: Array<{
    invitationId: string;
    userId: string;
    name: string | null;
    username: string | null;
    image: string | null;
    profession: string | null;
    expiresAt: string;
  }>;
  createdAt: string;
};

type BlueprintRole = {
  phase: "now" | "next" | "later";
  department: string;
  title: string;
  headcount: number;
  professions: string[];
  requiredSkills: string[];
  usefulSkills: string[];
  criticality: "critical" | "important" | "useful";
  reason: string;
  workMode: "remote" | "hybrid" | "in_person";
};
type BlueprintRecord = {
  id: string;
  outcome: string;
  assumptions: string[];
  coveredContributions: Array<{ area: string; evidence: string }>;
  milestones: Array<{ title: string; phase: string }>;
  gaps: string[];
  risks: string[];
  roles: BlueprintRole[];
  provider: string;
  usedFallback?: boolean;
  failureStatus?: string | null;
};
type SimilarProjectSuggestion = {
  projectId: string;
  title: string;
  summary: string;
  stage: string;
  location: string | null;
  teamSize: number;
  progress: number;
  score: number;
  reasons: string[];
  matchingRole: { id: string; title: string; openings: number; fitScore: number };
};
type ProfileRecord = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  coverImage?: string | null;
  profession: string | null;
  headline: string | null;
  bio: string | null;
  industry: string | null;
  rankedSkills: string[];
  interests: string[];
  location: string | null;
  visibility?: string | null;
  isN2Admin: boolean;
  isFounder: boolean;
  isDemo?: boolean;
  status?: string;
  deactivated?: boolean;
  isCurrent: boolean;
  projectCount: number;
  involvedCount: number;
  followers: number;
  following: number;
  isFollowing: boolean;
  isMutual: boolean;
  posts: TimelinePost[];
  projects: Array<{
    id: string;
    title: string;
    summary: string;
    industry: string;
    stage: string;
    status: string;
    accent: string;
    createdAt: string;
    isOwner: boolean;
    membershipRole: string;
    department: string | null;
  }>;
  career: Array<{
    id: string;
    title: string;
    company: string;
    location: string | null;
    startDate: string | null;
    endDate: string | null;
    current: boolean;
    description: string | null;
  }>;
  education: Array<{
    id: string;
    institution: string;
    qualification: string;
    fieldOfStudy: string | null;
    startYear: number | null;
    endYear: number | null;
    description: string | null;
  }>;
};
type SavedContentItem = {
  id: string;
  entityType: "project" | "comment" | "meeting" | "post";
  entityId: string;
  pinned: boolean;
  bookmarked: boolean;
  updatedAt: string;
  href: string;
  details: Record<string, unknown>;
};
type PeopleSuggestionRecord = {
  recommendationId: string;
  id: string;
  name: string | null;
  image: string | null;
  profession: string | null;
  location: string | null;
  score: number;
  reasons: string[];
  components: Record<string, number>;
  headline?: string;
  description?: string;
  isFollowing: boolean;
  isMutual: boolean;
};
type TimelinePost = {
  id: string;
  body: string;
  attachmentType?: "image" | "video" | null;
  attachmentUrl?: string | null;
  videoUrl?: string | null;
  visibility?: "network" | "connections";
  createdAt: string;
  authorId: string;
  authorName: string | null;
  authorImage: string | null;
  authorProfession?: string | null;
  authorStatus?: string;
  authorIsAdmin?: boolean;
  isDemo?: boolean;
  isPinned?: boolean;
  isBookmarked?: boolean;
  replyCount?: number;
  likeCount?: number;
  repostCount?: number;
  liked?: boolean;
  reposted?: boolean;
  linkedProjects: Array<{ id: string; title: string }>;
};
type LeadershipElectionView = {
  id: string;
  projectId: string;
  projectTitle: string;
  electorate: "co_owners" | "members";
  deadline: string;
  selectedCandidateId: string | null;
  candidates: Array<{ id: string; name: string | null; image: string | null; profession: string | null; membershipRole: string }>;
};
type ProfileActivityPost = {
  id: string;
  body: string;
  attachmentType: string | null;
  attachmentUrl: string | null;
  videoUrl: string | null;
  createdAt: string;
  actedAt: string;
  authorId: string;
  authorName: string | null;
  authorImage: string | null;
  authorProfession: string | null;
};
type ProfileWatchingActivity = {
  id: string;
  title: string;
  summary: string;
  industry: string;
  stage: string;
  accent: string;
  imageUrl: string | null;
  createdAt: string;
  actedAt: string;
  ownerId: string;
  ownerName: string | null;
};
type ProfileActivity = {
  likes: ProfileActivityPost[];
  watching: ProfileWatchingActivity[];
  reposts: ProfileActivityPost[];
};
type LinkPreviewRecord = {
  url: string;
  title: string;
  description: string;
  image: string | null;
  imageAlt?: string;
  siteName: string;
  domain: string;
};
type PulseSlide = {
  id: string;
  kind: string;
  label: string;
  value: string;
  title: string;
  detail: string;
  progress: number;
  projectId?: string;
};
type FeedFilterState = {
  industry: string;
  stage: string;
  workMode: string;
  location: string;
};
type ProjectDetailRecord = ProjectRecord & {
  description?: string | null;
  location?: string | null;
  ownerProfession?: string | null;
  currentUserId: string;
  isMember: boolean;
  membershipRole?: string | null;
  isFollowingProject: boolean;
  involvementStatus?: string | null;
  fundingGoal: number | null;
  shareLimit: number | null;
  openToInvestment: boolean;
  openToContributions: boolean;
  team: Array<{
    userId: string;
    name: string | null;
    image: string | null;
    profession: string | null;
    membershipRole: string;
    department: string | null;
  }>;
  roles: ProjectRoleRecord[];
  milestones: Array<{
    id: string;
    title: string;
    description: string | null;
    phase: string;
    ownerId: string | null;
    status: string;
    dueAt: string | null;
    startedAt: string | null;
    completedAt: string | null;
    completionSummary: string | null;
    sortOrder: number;
  }>;
  updates: Array<{
    id: string;
    milestoneId: string | null;
    type: string;
    body: string;
    attachmentType: string | null;
    attachmentUrl: string | null;
    attachmentName: string | null;
    updatedAt: string;
    createdAt: string;
    authorId: string;
    authorName: string | null;
    authorImage: string | null;
  }>;
  applications: Array<{
    id: string;
    status: string;
    message: string | null;
    createdAt: string;
    applicantId: string;
    applicantName: string | null;
    applicantImage: string | null;
    applicantProfession: string | null;
    profileBrief: string;
    applicantLocation: string | null;
    applicantSkills: string[];
    applicantInterests: string[];
    fit: { score: number; professionMatch: boolean; requiredMatches: string[]; usefulMatches: string[]; mismatch: boolean };
    roleId: string;
    roleTitle: string;
    roleDepartment: string;
  }>;
  pendingApplicationCount: number;
  involvementRequests: Array<{
    id: string;
    status: string;
    message: string;
    services: string[];
    createdAt: string;
    userId: string;
    userName: string | null;
    userImage: string | null;
    userProfession: string | null;
    userLocation: string | null;
    userSkills: string[];
    userInterests: string[];
    profileBrief: string;
  }>;
  pendingInvolvementCount: number;
  fundingInterests: Array<{
    id: string;
    type: "invest" | "donate" | "contribute" | "share_request";
    amount: number | null;
    message: string | null;
    status: string;
    createdAt: string;
    userId: string;
    userName: string | null;
    userImage: string | null;
  }>;
};

function formatNetworkDate(
  value: Date | string,
  options: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat("en-GB", {
    ...options,
    timeZone: "Europe/London",
  }).format(typeof value === "string" ? new Date(value) : value);
}

function relativeNetworkAge(value: Date | string) {
  const timestamp = typeof value === "string" ? new Date(value) : value;
  const elapsed = Math.max(0, Date.now() - timestamp.getTime());
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return formatNetworkDate(timestamp, { day: "numeric", month: "short" });
}

function localGreeting(value: Date) {
  const hour = value.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function firstUrl(value?: string | null) {
  const match = value?.match(/https?:\/\/[^\s<>]+/i)?.[0];
  return match?.replace(/[),.!?;:]+$/, "") ?? null;
}

function LinkifiedText({ text }: { text: string }) {
  const matches = [...text.matchAll(/https?:\/\/[^\s<>]+|@[a-z0-9_-]{2,30}/gi)];
  if (!matches.length) return <>{text}</>;
  const content: ReactNode[] = [];
  let cursor = 0;
  matches.forEach((match, index) => {
    const start = match.index ?? 0;
    const raw = match[0];
    const mention = raw.startsWith("@");
    const href = mention ? `/${raw.slice(1)}` : raw.replace(/[),.!?;:]+$/, "");
    const trailing = raw.slice(href.length);
    if (start > cursor) content.push(text.slice(cursor, start));
    content.push(
      <a
        className="n2-hyperlink"
        href={href}
        target={mention ? undefined : "_blank"}
        rel={mention ? undefined : "noopener noreferrer"}
        key={`${href}-${start}-${index}`}
        onClick={(event) => event.stopPropagation()}
      >
        {href}
      </a>,
    );
    if (trailing) content.push(trailing);
    cursor = start + raw.length;
  });
  if (cursor < text.length) content.push(text.slice(cursor));
  return <>{content}</>;
}

type MentionPerson = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  profession?: string | null;
};

type PostTagProject = Pick<
  ProjectRecord,
  "id" | "title" | "industry" | "ownerName"
>;

type ActivePostTag = {
  kind: "person" | "project";
  query: string;
  start: number;
  end: number;
};

function projectTagSlug(title: string) {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function activePostTagAtCursor(
  value: string,
  input: HTMLTextAreaElement | null,
): ActivePostTag | null {
  const cursor = input?.selectionStart ?? value.length;
  const match = value.slice(0, cursor).match(/(?:^|\s)([@#])([a-z0-9_-]*)$/i);
  if (!match) return null;
  return {
    kind: match[1] === "@" ? "person" : "project",
    query: match[2],
    start: cursor - match[2].length - 1,
    end: cursor,
  };
}

function replaceActivePostTag(
  value: string,
  active: ActivePostTag,
  replacement: string,
  input: HTMLTextAreaElement | null,
  setValue: (value: string) => void,
) {
  const insertion = `${active.kind === "person" ? "@" : "#"}${replacement} `;
  const next = `${value.slice(0, active.start)}${insertion}${value.slice(active.end)}`;
  setValue(next);
  requestAnimationFrame(() => {
    const cursor = active.start + insertion.length;
    input?.focus();
    input?.setSelectionRange(cursor, cursor);
  });
  return next;
}

function PostTagSuggestions({
  value,
  inputRef,
  setValue,
  ownProjects,
  linkedProjectIds,
  onChooseProject,
}: {
  value: string;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  setValue: (value: string) => void;
  ownProjects: PostTagProject[];
  linkedProjectIds: string[];
  onChooseProject: (project: PostTagProject) => boolean;
}) {
  const [active, setActive] = useState<ActivePostTag | null>(null);
  const suppressedValue = useRef("");
  const [dismissedKey, setDismissedKey] = useState("");
  const activeKey = active ? `${active.kind}:${active.start}:${active.query}` : "";
  const activeKind = active?.kind;
  const query = active?.query.trim().toLowerCase() ?? "";
  const searchQuery = activeKind === "project"
    ? query.replace(/[-_]+/g, " ").trim()
    : query;
  const [people, setPeople] = useState<MentionPerson[]>([]);
  const [projects, setProjects] = useState<PostTagProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

  useEffect(() => {
    if (value === suppressedValue.current) {
      setActive(null);
      return;
    }
    suppressedValue.current = "";
    const next = activePostTagAtCursor(value, inputRef.current);
    const nextKey = next ? `${next.kind}:${next.start}:${next.query}` : "";
    setActive(nextKey && nextKey !== dismissedKey ? next : null);
  }, [dismissedKey, inputRef, value]);

  useEffect(() => {
    setHighlighted(0);
  }, [activeKey]);

  useEffect(() => {
    if (!activeKind) {
      setPeople([]);
      setProjects([]);
      setLoading(false);
      return;
    }
    if (activeKind === "project" && searchQuery.length < 2) {
      setProjects([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      const scope = activeKind === "person" ? "&scope=mentions" : "";
      fetch(`/api/search?q=${encodeURIComponent(searchQuery)}${scope}`, {
        signal: controller.signal,
      })
        .then((response) =>
          response.ok ? response.json() : { people: [], projects: [] },
        )
        .then((data) => {
          if (activeKind === "person") {
            setPeople(
              (data.people ?? []).filter((person: MentionPerson) => person.username),
            );
            setProjects([]);
          } else {
            setProjects(data.projects ?? []);
            setPeople([]);
          }
        })
        .catch(() => undefined)
        .finally(() => setLoading(false));
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [activeKey, activeKind, searchQuery]);

  const personalProjects = useMemo(() => activeKind === "project"
    ? ownProjects.filter((project) =>
        !linkedProjectIds.includes(project.id) &&
        (!searchQuery || `${project.title} ${project.industry}`.toLowerCase().includes(searchQuery)),
      )
    : [], [activeKind, linkedProjectIds, ownProjects, searchQuery]);
  const networkProjects = useMemo(() => {
    const personalIds = new Set(personalProjects.map((project) => project.id));
    return activeKind === "project"
      ? projects.filter((project) =>
        !linkedProjectIds.includes(project.id) && !personalIds.has(project.id),
      )
      : [];
  }, [activeKind, linkedProjectIds, personalProjects, projects]);
  const options = useMemo<Array<
    | { kind: "person"; person: MentionPerson }
    | { kind: "project"; project: PostTagProject }
  >>(() => activeKind === "person"
    ? people.slice(0, 8).map((person) => ({ kind: "person", person }))
    : [
        ...personalProjects.slice(0, 8).map((project) => ({ kind: "project" as const, project })),
        ...networkProjects.slice(0, 8).map((project) => ({ kind: "project" as const, project })),
      ], [activeKind, networkProjects, people, personalProjects]);

  const choose = useCallback((option: (typeof options)[number]) => {
    if (!active) return;
    if (option.kind === "person") {
      suppressedValue.current = replaceActivePostTag(value, active, option.person.username, inputRef.current, setValue);
    } else if (onChooseProject(option.project)) {
      suppressedValue.current = replaceActivePostTag(value, active, projectTagSlug(option.project.title), inputRef.current, setValue);
    }
    setActive(null);
    setDismissedKey(activeKey);
  }, [active, activeKey, inputRef, onChooseProject, setValue, value]);

  useEffect(() => {
    if (!active) return;
    function keydown(event: KeyboardEvent) {
      if (document.activeElement !== inputRef.current) return;
      if (event.key === "Escape") {
        event.preventDefault();
        setDismissedKey(activeKey);
        return;
      }
      if (!options.length) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setHighlighted((index) =>
          event.key === "ArrowDown"
            ? (index + 1) % options.length
            : (index - 1 + options.length) % options.length,
        );
      } else if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        choose(options[Math.min(highlighted, options.length - 1)]);
      }
    }
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, [active, activeKey, choose, highlighted, inputRef, options]);

  if (!active) return null;
  return (
    <div className={`post-tag-suggestions ${active.kind}`}>
      <div className="post-tag-query">
        <Search size={14}/>
        <span>
          {active.kind === "person"
            ? query ? `People matching @${query}` : "Tag a person"
            : query ? `Projects matching #${query}` : "Your projects"}
        </span>
      </div>
      <div className="post-tag-results" role="listbox" aria-label={active.kind === "person" ? "People to tag" : "Projects to tag"}>
        {active.kind === "project" && personalProjects.length > 0 && (
          <section className="post-personal-projects" aria-label="Your projects">
            <small>Your projects</small>
            <div>
              {personalProjects.slice(0, 8).map((project, index) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={highlighted === index}
                  className={highlighted === index ? "highlighted" : ""}
                  key={project.id}
                  onMouseEnter={() => setHighlighted(index)}
                  onClick={() => choose({ kind: "project", project })}
                >
                  #{projectTagSlug(project.title)}
                </button>
              ))}
            </div>
          </section>
        )}
        {active.kind === "person" && people.slice(0, 8).map((person, index) => (
          <button
            type="button"
            role="option"
            aria-selected={highlighted === index}
            className={`post-tag-person ${highlighted === index ? "highlighted" : ""}`}
            key={person.id}
            onMouseEnter={() => setHighlighted(index)}
            onClick={() => choose({ kind: "person", person })}
          >
            <Avatar person={{ name: person.name ?? person.username, role: person.profession ?? `@${person.username}`, img: person.image }} size="sm"/>
            <span><strong>{person.name ?? person.username}</strong><small>@{person.username} · {person.profession ?? "n2 member"}</small></span>
          </button>
        ))}
        {active.kind === "project" && networkProjects.slice(0, 8).map((project, projectIndex) => {
          const index = personalProjects.slice(0, 8).length + projectIndex;
          return (
            <button
              type="button"
              role="option"
              aria-selected={highlighted === index}
              className={`post-tag-project ${highlighted === index ? "highlighted" : ""}`}
              key={project.id}
              onMouseEnter={() => setHighlighted(index)}
              onClick={() => choose({ kind: "project", project })}
            >
              <span><strong>#{projectTagSlug(project.title)}</strong><small>{project.industry}{project.ownerName ? ` · ${project.ownerName}` : ""}</small></span>
            </button>
          );
        })}
        {loading && <p>Searching…</p>}
        {!loading && !options.length && (
          <p>{active.kind === "person" ? "No people match that tag." : query.length < 2 ? "Type at least two characters to search the network." : "No projects match that tag."}</p>
        )}
      </div>
      <small className="post-tag-keyboard-hint">↑↓ to choose · Enter to add · Esc to close</small>
    </div>
  );
}

function activeMentionAtCursor(
  value: string,
  input: HTMLInputElement | HTMLTextAreaElement | null,
) {
  const cursor = input?.selectionStart ?? value.length;
  const match = value.slice(0, cursor).match(/(?:^|\s)@([a-z0-9_-]*)$/i);
  if (!match) return null;
  return { query: match[1], start: cursor - match[1].length - 1, end: cursor };
}

function MentionSuggestions({
  value,
  inputRef,
  setValue,
  allowedIds,
  placement,
}: {
  value: string;
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  setValue: (value: string) => void;
  allowedIds?: string[];
  placement: "post" | "reply" | "message";
}) {
  const [activeMention, setActiveMention] = useState<ReturnType<typeof activeMentionAtCursor>>(null);
  const query = activeMention?.query ?? "";
  const mentionStart = activeMention?.start ?? -1;
  const [results, setResults] = useState<MentionPerson[]>([]),
    [loading, setLoading] = useState(false);
  const allowedKey = allowedIds?.join(",") ?? "";
  useEffect(() => {
    setActiveMention(activeMentionAtCursor(value, inputRef.current));
  }, [inputRef, value]);
  useEffect(() => {
    if (mentionStart < 0) {
      setResults([]);
      setLoading(false);
      return;
    }
    const allowed = allowedKey ? new Set(allowedKey.split(",")) : null;
    const controller = new AbortController(), timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(query.trim())}&scope=connections`, { signal: controller.signal })
        .then((response) => response.ok ? response.json() : { people: [] })
        .then((data) => setResults((data.people ?? []).filter((person: MentionPerson) =>
          person.username && (!allowed || allowed.has(person.id)),
        )))
        .catch(() => undefined)
        .finally(() => setLoading(false));
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [mentionStart, query, allowedKey]);
  if (!activeMention) return null;
  return (
    <div className={`mention-suggestions-anchor mention-${placement}`}>
      <div className="mention-popover" role="listbox" aria-label="Connected profiles">
        <div className="mention-query"><Search size={14}/><span>{query ? `Connected profiles matching @${query}` : "Choose a connected profile"}</span></div>
        <div className="mention-results">
          {results.slice(0, 8).map((person) => <button type="button" role="option" aria-selected="false" key={person.id} onClick={() => replaceActiveMention(value, person.username, inputRef.current, setValue)}>
            <Avatar person={{ name: person.name ?? person.username, role: person.profession ?? `@${person.username}`, img: person.image }} size="sm"/>
            <span><strong>{person.name ?? person.username}</strong><small>@{person.username}</small></span>
          </button>)}
          {loading && <p>Searching…</p>}
          {!loading && !results.length && <p>No connected profiles found.</p>}
        </div>
      </div>
    </div>
  );
}

function replaceActiveMention(
  value: string,
  username: string,
  input: HTMLInputElement | HTMLTextAreaElement | null,
  setValue: (value: string) => void,
) {
  const activeMention = activeMentionAtCursor(value, input);
  if (!activeMention) return;
  const insertion = `@${username} `;
  setValue(`${value.slice(0, activeMention.start)}${insertion}${value.slice(activeMention.end)}`);
  requestAnimationFrame(() => {
    const cursor = activeMention.start + insertion.length;
    input?.focus();
    input?.setSelectionRange(cursor, cursor);
  });
}

function RichLinkPreview({ text, url }: { text?: string | null; url?: string | null }) {
  const target = url || firstUrl(text),
    [preview, setPreview] = useState<LinkPreviewRecord | null>(null);
  useEffect(() => {
    if (!target) {
      setPreview(null);
      return;
    }
    const controller = new AbortController();
    loadLinkPreview(target, controller.signal)
      .then((data) => setPreview(data))
      .catch(() => undefined);
    return () => controller.abort();
  }, [target]);
  if (!target || !preview) return null;
  return (
    <a className="rich-link-preview" href={preview.url} target="_blank" rel="noreferrer">
      {preview.image && (
        <img
          src={preview.image}
          alt={preview.imageAlt || ""}
          loading="lazy"
          decoding="async"
          onError={(event) => { event.currentTarget.hidden = true; }}
        />
      )}
      <span>
        <small>{preview.siteName || preview.domain}</small>
        <strong>{preview.title}</strong>
        {preview.description && <p>{preview.description}</p>}
        <em>{preview.domain} <ArrowUpRight size={11} /></em>
      </span>
    </a>
  );
}

const linkPreviewCache = new Map<string, LinkPreviewRecord | null>();

async function loadLinkPreview(target: string, signal: AbortSignal) {
  if (linkPreviewCache.has(target)) return linkPreviewCache.get(target) ?? null;
  const response = await fetch(`/api/link-preview?v=2&url=${encodeURIComponent(target)}`, {
    signal,
  });
  const preview = response.ok && response.status !== 204 ? await response.json() as LinkPreviewRecord : null;
  linkPreviewCache.set(target, preview);
  return preview;
}

const people = {
  maya: {
    name: "Maya Chen",
    role: "Product Designer",
    img: "https://i.pravatar.cc/160?img=47",
  },
  marcus: {
    name: "Marcus Okafor",
    role: "Founder · Clean Energy",
    img: "https://i.pravatar.cc/160?img=12",
  },
  lena: {
    name: "Lena Vogt",
    role: "Brand Strategist",
    img: "https://i.pravatar.cc/160?img=32",
  },
  dev: {
    name: "Dev Shah",
    role: "Full-stack Engineer",
    img: "https://i.pravatar.cc/160?img=11",
  },
  ali: {
    name: "Ali Rahman",
    role: "Operations",
    img: "https://i.pravatar.cc/160?img=51",
  },
  sofia: {
    name: "Sofia Reyes",
    role: "Urban Planner",
    img: "https://i.pravatar.cc/160?img=45",
  },
  jordan: {
    name: "Jordan Lee",
    role: "Community Builder",
    img: "https://i.pravatar.cc/160?img=14",
  },
};

function NetworkGraphIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <g transform="rotate(180 12 12)" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 12 5.2 5.2M12 12l6.8-6.8M12 12 4 13.7M12 12l8 1.7M12 12v7.6" />
        <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
        <circle cx="4.7" cy="4.7" r="2.1" fill="currentColor" stroke="none" />
        <circle cx="19.3" cy="4.7" r="2.1" fill="currentColor" stroke="none" />
        <circle cx="3.5" cy="13.8" r="2.1" fill="currentColor" stroke="none" />
        <circle cx="20.5" cy="13.8" r="2.1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="20.2" r="2.1" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}

type LocationOption = {
  id: number;
  city: string;
  country: string;
  countryCode: string;
  timezone: string;
  region: string | null;
  label: string;
};

function ProjectLocationInput({
  query,
  selected,
  onQueryChange,
  onSelect,
}: {
  query: string;
  selected: Pick<LocationOption, "city" | "country" | "timezone" | "label"> | null;
  onQueryChange: (query: string) => void;
  onSelect: (location: LocationOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [options, setOptions] = useState<LocationOption[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchId = "project-location";

  useEffect(() => {
    const term = query.trim();
    if (term.length < 3 || term === selected?.label) {
      setOptions([]);
      setLoading(false);
      setError("");
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/locations/search?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not search locations.");
        setOptions(Array.isArray(result.results) ? result.results : []);
        setActiveIndex(-1);
        setOpen(true);
      } catch (searchError) {
        if (controller.signal.aborted) return;
        setOptions([]);
        setError(searchError instanceof Error ? searchError.message : "Could not search locations.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 320);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, selected?.label]);

  function choose(location: LocationOption) {
    onSelect(location);
    setOptions([]);
    setOpen(false);
    setActiveIndex(-1);
    setError("");
  }

  return (
    <div className="project-location-picker">
      <label htmlFor={searchId}>Location</label>
      <div className="project-location-combobox">
        <MapPin size={16} aria-hidden="true" />
        <input
          id={searchId}
          role="combobox"
          autoComplete="off"
          value={query}
          placeholder="Start typing a city or town"
          aria-autocomplete="list"
          aria-controls={`${searchId}-results`}
          aria-expanded={open}
          aria-activedescendant={activeIndex >= 0 ? `${searchId}-option-${activeIndex}` : undefined}
          onFocus={() => query.trim().length >= 3 && query !== selected?.label && setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(event) => {
            onQueryChange(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && options.length) {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((index) => Math.min(index + 1, options.length - 1));
            } else if (event.key === "ArrowUp" && options.length) {
              event.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter" && activeIndex >= 0 && options[activeIndex]) {
              event.preventDefault();
              choose(options[activeIndex]);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        {loading && <span className="project-location-loading" aria-label="Searching locations" />}
      </div>
      {open && query.trim().length >= 3 && (
        <div id={`${searchId}-results`} className="project-location-results" role="listbox">
          {options.map((location, index) => (
            <button
              id={`${searchId}-option-${index}`}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              key={`${location.id}-${location.countryCode}`}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(location)}
            >
              <MapPin size={14} />
              <span><strong>{location.city}</strong><small>{[location.region, location.country].filter(Boolean).join(", ")}</small></span>
              <b>{location.countryCode}</b>
            </button>
          ))}
          {!loading && !error && options.length === 0 && <p>No matching locations found.</p>}
          {error && <p className="form-error">{error}</p>}
        </div>
      )}
      {selected ? (
        <div className="project-location-confirmed" aria-live="polite">
          <Check size={14} />
          <span><strong>{selected.country}</strong><small>Timezone assigned automatically: {selected.timezone}</small></span>
        </div>
      ) : (
        <small className="project-location-help">Choose a suggestion to assign its country and timezone.</small>
      )}
    </div>
  );
}

function RichTextEditor({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<Range | null>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = sanitizeRichText(value);
    }
  }, [value]);

  const rememberSelection = () => {
    const selection = window.getSelection();
    if (selection?.rangeCount && editorRef.current?.contains(selection.anchorNode)) {
      selectionRef.current = selection.getRangeAt(0).cloneRange();
    }
  };

  const runCommand = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    const selection = window.getSelection();
    if (selection && selectionRef.current) {
      selection.removeAllRanges();
      selection.addRange(selectionRef.current);
    }
    document.execCommand(command, false, commandValue);
    rememberSelection();
    onChange(sanitizeRichText(editorRef.current?.innerHTML));
  };

  return (
    <div className="rich-text-field">
      <div className="rich-text-toolbar" aria-label="Role description formatting">
        <button type="button" title="Bold" aria-label="Bold" onMouseDown={(event) => { event.preventDefault(); runCommand("bold"); }}><Bold size={15} /></button>
        <button type="button" title="Italic" aria-label="Italic" onMouseDown={(event) => { event.preventDefault(); runCommand("italic"); }}><Italic size={15} /></button>
        <button type="button" title="Underline" aria-label="Underline" onMouseDown={(event) => { event.preventDefault(); runCommand("underline"); }}><Underline size={15} /></button>
        <span />
        <N2Select compact ariaLabel="Font" defaultValue="Arial" onOpen={rememberSelection} onValueChange={(value) => runCommand("fontName", value)} options={[{value:"Arial",label:"Sans serif"},{value:"Georgia",label:"Georgia"},{value:"Times New Roman",label:"Times New Roman"},{value:"Verdana",label:"Verdana"},{value:"Courier New",label:"Monospace"}]}/>
        <N2Select compact ariaLabel="Font size" defaultValue="3" onOpen={rememberSelection} onValueChange={(value) => runCommand("fontSize", value)} options={[{value:"2",label:"Small"},{value:"3",label:"Normal"},{value:"4",label:"Large"},{value:"5",label:"Extra large"}]}/>
      </div>
      <div
        id={id}
        ref={editorRef}
        className="rich-text-editor"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        tabIndex={0}
        aria-multiline="true"
        aria-label="Role description"
        data-placeholder="Describe what you did, achieved and contributed."
        onInput={() => onChange(sanitizeRichText(editorRef.current?.innerHTML))}
        onMouseUp={rememberSelection}
        onKeyUp={rememberSelection}
        onBlur={() => onChange(sanitizeRichText(editorRef.current?.innerHTML))}
      />
    </div>
  );
}

const nav = [
  { id: "feed" as View, label: "Home", icon: Home },
  { id: "profile" as View, label: "Profile", icon: UserRound },
  { id: "projects" as View, label: "Projects", icon: BriefcaseBusiness },
  { id: "network" as View, label: "Networks", icon: NetworkGraphIcon },
  { id: "messages" as View, label: "Messages", icon: MessageCircle },
  { id: "notifications" as View, label: "Notifications", icon: Bell },
  { id: "meet" as View, label: "Meet", icon: CalendarDays },
];

const mobileNav = nav.filter((item) => item.id !== "profile" && item.id !== "network");


function TeamTrail({
  second = false,
  project,
}: {
  second?: boolean;
  project?: ProjectRecord;
}) {
  if (project) {
    const owner = {
        id: project.ownerId,
        name: project.ownerName ?? "n2 member",
        role: "Project owner",
        img: project.ownerImage,
      },
      contributors = (project.team ?? []).filter(
        (member) => member.userId !== project.ownerId,
      ),
      used = new Set<string>();
    const assignments = (project.roles ?? []).flatMap((role) =>
      Array.from({ length: Math.max(1, role.capacity) }, (_, slot) => {
        const member = contributors.find(
          (candidate) =>
            !used.has(candidate.userId) &&
            (candidate.roleId === role.id ||
              candidate.department === role.title ||
              candidate.department === role.department),
        );
        if (member) used.add(member.userId);
        return { role, member, slot };
      }),
    );
    return (
      <div
        className="team-map"
        aria-label="Project owner, filled roles and open roles"
      >
        <div className="map-line" />
        <button
          className="team-person owner"
          onClick={() =>
            project.ownerId &&
            window.dispatchEvent(
              new CustomEvent("n2:open-profile", { detail: project.ownerId }),
            )
          }
        >
          <Avatar person={owner} size="lg" ring />
          <span className="team-role">Owner</span>
        </button>
        {assignments.map(({ role, member, slot }) =>
          member ? (
            <button
              className="team-person filled-role"
              key={`${role.id}-${slot}`}
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("n2:open-profile", { detail: member.userId }),
                )
              }
              title={`${member.name} · ${role.title}`}
            >
              <Avatar
                person={{
                  name: member.name ?? "n2 member",
                  role: role.title,
                  img: member.image,
                }}
                size="md"
              />
              <span className="dept">{role.title}</span>
            </button>
          ) : (
            <button
              type="button"
              className="open-person"
              key={`${role.id}-${slot}`}
              disabled={Boolean(project.isOwner || project.isMember)}
              title={project.isOwner || project.isMember ? `Open role: ${role.title}` : `Apply for ${role.title}`}
              aria-label={project.isOwner || project.isMember ? `Open role: ${role.title}` : `Apply for ${role.title}`}
              onClick={() =>
                !project.isOwner && !project.isMember && window.dispatchEvent(
                  new CustomEvent("n2:apply-role", {
                    detail: {
                      projectId: project.id,
                      projectTitle: project.title,
                      roles: project.roles ?? [],
                      initialRoleId: role.id,
                    },
                  }),
                )
              }
            >
              <Plus size={16} />
              <span>{role.title}</span>
            </button>
          ),
        )}
      </div>
    );
  }
  const team = second
    ? [people.sofia, people.jordan, people.lena]
    : [people.marcus, people.maya, people.dev, people.ali];
  return (
    <div className="team-map" aria-label="Project team and open roles">
      <div className="map-line" />
      <div className="team-person owner">
        <Avatar person={team[0]} size="lg" ring />
        <span className="team-role">Owner</span>
      </div>
      {team.slice(1).map((person, index) => (
        <div className="team-person" key={person.name}>
          <Avatar person={person} size="md" />
          <span className="dept">
            {index === 0 ? "Design" : index === 1 ? "Tech" : "Operations"}
          </span>
        </div>
      ))}
      <div className="open-person">
        <Plus size={16} />
        <span>{second ? "Finance" : "Growth"}</span>
      </div>
    </div>
  );
}

function InterestButton({
  initial = 24,
  projectId,
  durable = false,
  authenticated = true,
  onRequireAuth,
}: {
  initial?: number;
  projectId: string;
  durable?: boolean;
  authenticated?: boolean;
  onRequireAuth?: () => void;
}) {
  const [watched, setWatched] = useState(false);
  const [total, setTotal] = useState(initial);
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      setWatched(localStorage.getItem(`n2-eye-${projectId}`) === "true"),
    );
    return () => cancelAnimationFrame(frame);
  }, [projectId]);
  async function toggle() {
    if (!authenticated) {
      onRequireAuth?.();
      return;
    }
    const next = !watched;
    setWatched(next);
    setTotal((value) => Math.max(0, value + (next ? 1 : -1)));
    localStorage.setItem(`n2-eye-${projectId}`, String(next));
    if (durable) {
      const response = await fetch(`/api/projects/${projectId}/eyes`, {
        method: "POST",
      });
      if (response.ok) {
        const result = await response.json();
        setWatched(result.watching);
        setTotal(result.total);
        localStorage.setItem(`n2-eye-${projectId}`, String(result.watching));
      }
    }
  }
  return (
    <button
      className={`interest-btn ${watched ? "active" : ""}`}
      onClick={toggle}
      aria-pressed={watched}
    >
      <Eye size={18} />
      <span>{total} views</span>
    </button>
  );
}

function ProjectMenu({
  project,
  onChanged,
  onToast,
}: {
  project: ProjectRecord;
  onChanged?: (project: ProjectRecord | null) => void;
  onToast?: (message: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [dialog, setDialog] = useState<
      "edit" | "involve" | "leave" | "delete" | null
    >(null),
    [pinned, setPinned] = useState(Boolean(project.isPinned)),
    [bookmarked, setBookmarked] = useState(Boolean(project.isBookmarked)),
    [deletionPlan, setDeletionPlan] = useState<{
      deadline: string;
      immediate: boolean;
      explanation: string[];
    } | null>(null);
  async function openDeletionDialog() {
    const response = await fetch(`/api/projects/${project.id}/deletion`), result = await response.json();
    if (!response.ok) return onToast?.(result.error ?? "Could not calculate the deletion window.");
    setDeletionPlan(result);
    setDialog("delete");
    setOpen(false);
  }
  async function cancelDeletion() {
    const response = await fetch(`/api/projects/${project.id}/deletion/cancel`, { method: "POST" }), result = await response.json();
    if (response.ok) {
      onChanged?.({ ...project, status: result.status, deletionRequestedAt: null, deletionScheduledAt: null, deletionRequestedBy: null, isReadOnly: false });
      onToast?.("Project deletion cancelled.");
    } else onToast?.(result.error ?? "Could not cancel deletion.");
    setOpen(false);
  }
  async function followProject() {
    const response = await fetch(`/api/projects/${project.id}/follow`, {
        method: project.isFollowingProject ? "DELETE" : "POST",
      }),
      result = await response.json();
    if (response.ok) {
      onChanged?.({ ...project, isFollowingProject: result.following });
      onToast?.(
        result.following
          ? "You are following this project."
          : "You stopped following this project.",
      );
    } else onToast?.(result.error ?? "Could not update this project follow.");
    setOpen(false);
  }
  async function preference(action: "pin" | "bookmark") {
    const response = await fetch(`/api/projects/${project.id}/preferences`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      }),
      result = await response.json();
    if (response.ok) {
      setPinned(result.pinned);
      setBookmarked(result.bookmarked);
      onToast?.(
        action === "pin"
          ? result.pinned
            ? "Project pinned."
            : "Project unpinned."
          : result.bookmarked
            ? "Project bookmarked."
            : "Bookmark removed.",
      );
    } else onToast?.(result.error ?? "Could not update this item.");
    setOpen(false);
  }
  async function visibility() {
    const next = project.visibility === "private" ? "network" : "private",
      response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ visibility: next }),
      });
    if (response.ok) {
      const result = await response.json();
      onChanged?.({ ...project, ...result.project });
      onToast?.(`Project is now ${next === "private" ? "private" : "public"}.`);
    }
    setOpen(false);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (dialog === "edit") {
      const payload = {
        title: String(form.get("title") ?? ""),
        summary: String(form.get("summary") ?? ""),
        stage: String(form.get("stage") ?? project.stage),
        industry: String(form.get("industry") ?? project.industry),
      };
      const response = await fetch(`/api/projects/${project.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        }),
        result = await response.json();
      if (response.ok) {
        onChanged?.({ ...project, ...result.project });
        onToast?.("Project updated.");
        setDialog(null);
      } else onToast?.(result.error ?? "Could not update this project.");
      return;
    }
    if (dialog === "involve") {
      const message = String(form.get("message") ?? ""),
        services = String(form.get("services") ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        response = await fetch(`/api/projects/${project.id}/involvement`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message, services }),
        }),
        result = await response.json();
      onToast?.(result.message ?? result.error ?? "Could not send your offer.");
      if (response.ok) setDialog(null);
      return;
    }
    if (dialog === "leave") {
      const response = await fetch(`/api/projects/${project.id}/leave`, {
          method: "DELETE",
        }),
        result = await response.json();
      if (response.ok) {
        onChanged?.({ ...project, isMember: false });
        onToast?.("You left the project.");
        setDialog(null);
      } else onToast?.(result.error ?? "Could not leave this project.");
      return;
    }
    if (dialog === "delete") {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      }), result = await response.json();
      if (response.ok) {
        if (result.immediate) {
          onChanged?.(null);
          onToast?.("Project deleted.");
        } else {
          onChanged?.({ ...project, status: "pending_deletion", deletionScheduledAt: result.deadline, isReadOnly: true });
          onToast?.("Project deletion scheduled.");
        }
        setDialog(null);
      } else onToast?.(result.error ?? "Could not delete this project.");
    }
  }
  return (
    <>
      <div className="project-menu-wrap">
        <button
          className="icon-button"
          aria-label="Project options"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <Ellipsis size={20} />
        </button>
        {open && (
          <div className="project-menu">
            <button onClick={() => preference("pin")}>
              <Pin size={15} />
              {pinned ? "Unpin" : "Pin"}
            </button>
            <button onClick={() => preference("bookmark")}>
              <Bookmark size={15} fill={bookmarked ? "currentColor" : "none"} />
              {bookmarked ? "Remove bookmark" : "Bookmark"}
            </button>
            {!project.isPrimaryOwner && project.status !== "pending_deletion" && <button onClick={followProject}>
              <Eye size={15} />
              {project.isFollowingProject
                ? "Stop following project"
                : "Follow project"}
            </button>}
            {project.status !== "pending_deletion" && !project.isOwner && !project.isMember && (
              <button
                onClick={() => {
                  setDialog("involve");
                  setOpen(false);
                }}
              >
                <UserPlus size={15} />
                Get involved
              </button>
            )}
            {project.status !== "pending_deletion" && project.isMember && !project.isOwner && (
              <button
                className="danger"
                onClick={() => {
                  setDialog("leave");
                  setOpen(false);
                }}
              >
                <LogOut size={15} />
                Leave project
              </button>
            )}
            {project.isOwner && project.status !== "pending_deletion" && (
              <>
                <hr />
                <button
                  onClick={() => {
                    setDialog("edit");
                    setOpen(false);
                  }}
                >
                  <Pencil size={15} />
                  Edit project
                </button>
                <button onClick={visibility}>
                  {project.visibility === "private" ? (
                    <Globe2 size={15} />
                  ) : (
                    <ShieldCheck size={15} />
                  )}
                  Make {project.visibility === "private" ? "public" : "private"}
                </button>
                <button
                  className="danger"
                  onClick={openDeletionDialog}
                >
                  <Trash2 size={15} />
                  Delete project
                </button>
              </>
            )}
            {project.status === "pending_deletion" && project.isPrimaryOwner && (
              <button className="danger" onClick={cancelDeletion}><X size={15} />Cancel deletion</button>
            )}
          </div>
        )}
      </div>
      {dialog && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setDialog(null)
          }
        >
          <form className="n2-editor-modal" onSubmit={submit}>
            <header>
              <div>
                <span className="eyebrow">
                  {dialog === "edit"
                    ? "PROJECT SETTINGS"
                    : dialog === "involve"
                      ? "OFFER YOUR CONTRIBUTION"
                      : "PLEASE CONFIRM"}
                </span>
                <h2>
                  {dialog === "edit"
                    ? "Edit project"
                    : dialog === "involve"
                      ? "Get involved"
                      : dialog === "leave"
                        ? `Leave ${project.title}?`
                        : `Delete ${project.title}?`}
                </h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setDialog(null)}
              >
                <X size={19} />
              </button>
            </header>
            {dialog === "edit" && (
              <div className="n2-editor-fields">
                <label>
                  Project title
                  <input
                    name="title"
                    defaultValue={project.title}
                    minLength={4}
                    required
                  />
                </label>
                <label>
                  Summary
                  <textarea
                    name="summary"
                    defaultValue={project.summary}
                    minLength={20}
                    required
                  />
                </label>
                <div className="field-row">
                  <label>
                    Stage
                    <N2Select name="stage" defaultValue={project.stage} ariaLabel="Stage" options={[{value:"idea",label:"Idea"},{value:"planning",label:"Planning"},{value:"building",label:"Building"},{value:"launching",label:"Launching"}]}/>
                  </label>
                  <label>
                    Industry
                    <input
                      name="industry"
                      list="project-edit-industries"
                      defaultValue={project.industry}
                      required
                    />
                    <datalist id="project-edit-industries">
                      {PROJECT_INDUSTRIES.map((industry) => (
                        <option key={industry} value={industry} />
                      ))}
                    </datalist>
                  </label>
                </div>
              </div>
            )}
            {dialog === "involve" && (
              <div className="n2-editor-fields">
                <p>
                  Tell the owner what you can contribute even when a matching
                  role is not currently open.
                </p>
                <label>
                  Your offer
                  <textarea
                    name="message"
                    placeholder="How would you help this project?"
                    minLength={10}
                    required
                  />
                </label>
                <label>
                  Skills or services
                  <input
                    name="services"
                    placeholder="Product design, user research, partnerships"
                  />
                  <small>Separate multiple skills with commas.</small>
                </label>
              </div>
            )}
            {dialog === "leave" && (
              <p className="n2-confirm-copy">
                You will lose member access to private project discussions and
                updates. You can still follow the public project.
              </p>
            )}
            {dialog === "delete" && (
              <div className="n2-confirm-copy">
                <p>This deletion is irreversible once finalized.</p>
                {deletionPlan?.explanation?.length ? (
                  <ul>
                    {deletionPlan.explanation.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                ) : null}
                <strong>{deletionPlan?.immediate ? "Deletion will be immediate." : `Deletion is scheduled for ${deletionPlan ? new Date(deletionPlan.deadline).toLocaleString() : "the calculated deadline"}.`}</strong>
              </div>
            )}
            <footer>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setDialog(null)}
              >
                Cancel
              </button>
              <button
                className={`primary-button ${dialog === "delete" ? "danger" : ""}`}
              >
                {dialog === "edit"
                  ? "Save changes"
                  : dialog === "involve"
                    ? "Send offer"
                    : dialog === "leave"
                      ? "Leave project"
                      : "Delete project"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </>
  );
}

function FallbackProjectMenu({
  projectId,
  title,
  summary,
  onShare,
  onToast,
}: {
  projectId: string;
  title: string;
  summary: string;
  onShare?: (project: { id: string; title: string; summary: string }) => void;
  onToast?: (message: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [pinned, setPinned] = useState(false),
    [bookmarked, setBookmarked] = useState(false);
  return (
    <div className="project-menu-wrap">
      <button
        className="icon-button"
        aria-label="Project options"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Ellipsis size={20} />
      </button>
      {open && (
        <div className="project-menu">
          <button
            onClick={() => {
              setPinned((value) => !value);
              onToast?.(
                pinned ? "Project unpinned." : "Project pinned for this demo.",
              );
              setOpen(false);
            }}
          >
            <Pin size={15} />
            {pinned ? "Unpin" : "Pin"}
          </button>
          <button
            onClick={() => {
              setBookmarked((value) => !value);
              onToast?.(
                bookmarked
                  ? "Bookmark removed."
                  : "Project bookmarked for this demo.",
              );
              setOpen(false);
            }}
          >
            <Bookmark size={15} fill={bookmarked ? "currentColor" : "none"} />
            {bookmarked ? "Remove bookmark" : "Bookmark"}
          </button>
          <button
            onClick={() => {
              onShare?.({ id: projectId, title, summary });
              setOpen(false);
            }}
          >
            <Share2 size={15} />
            Share
          </button>
        </div>
      )}
    </div>
  );
}

function ProjectCard({
  second = false,
  onMatch,
  onComments,
  onProfile,
  project,
  onShare,
  onChanged,
  onToast,
  authenticated = true,
  onRequireAuth,
}: {
  second?: boolean;
  onMatch?: () => void;
  onComments?: (project: ProjectRecord) => void;
  onProfile?: (userId: string) => void;
  project?: ProjectRecord;
  onShare?: (project: { id: string; title: string; summary: string }) => void;
  onChanged?: (project: ProjectRecord | null) => void;
  onToast?: (message: string) => void;
  authenticated?: boolean;
  onRequireAuth?: () => void;
}) {
  const owner: MemberPerson = project
    ? {
        name: project.ownerName ?? "n2 member",
        role: `${project.industry} · ${project.stage}`,
        img: project.ownerImage,
        isN2Admin: project.ownerIsAdmin,
      }
    : second
      ? people.sofia
      : people.marcus;
  const projectId = project?.id ?? (second ? "after-dark" : "energy"),
    title =
      project?.title ??
      (second
        ? "Make empty city spaces useful after dark"
        : "Neighbourhood energy, shared fairly"),
    summary =
      project?.summary ??
      (second
        ? "A lightweight way for local groups to find and book underused spaces for classes, studios and community dinners. Looking for people who understand access, safety and local partnerships."
        : "I’m building a toolkit that helps one street buy, share and understand clean energy together. The pilot needs a product thinker, a community voice and someone who can make the numbers work.");
  const currentPeople = project?.team?.length ?? (second ? 3 : 4),
    roleCapacity =
      project?.roles?.reduce((total, role) => total + role.capacity, 0) ?? 0,
    requiredPeople = project
      ? Math.max(currentPeople, 1 + roleCapacity)
      : second
        ? 3
        : 4,
    teamComplete = project && currentPeople >= requiredPeople;
  async function feedback(signal: "not_relevant" | "not_now") {
    if (!project?.recommendationId) return;
    const response = await fetch("/api/matches/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        recommendationId: project.recommendationId,
        signal,
      }),
    });
    if (response.ok) {
      onChanged?.(null);
      onToast?.(
        signal === "not_now"
          ? "Project hidden for two weeks."
          : "Thanks — this will refine future suggestions.",
      );
    }
  }
  return (
    <article className={`project-card ${second ? "project-blue" : "project-orange"}`}>
      <div className="project-accent" />
      <div className="project-body">
        <div className="project-card-title">
          <div className="project-kicker">
            <span className="project-type-label">PROJECT</span>
            <span>
              {project?.industry.toUpperCase() ??
                (second ? "COMMUNITY" : "CLIMATE")}
            </span>
          </div>
          <button
            className="project-title-link"
            disabled={!project}
            onClick={() =>
              project &&
              window.dispatchEvent(
                new CustomEvent("n2:open-project", { detail: project.id }),
              )
            }
          >
            <h2>{title}</h2>
          </button>
        </div>
        <div className="post-head project-owner-line">
          <div className="person-line">
            <Avatar person={owner} size="md" />
            <div>
              <button
                className="profile-name"
                disabled={!project?.ownerId}
                onClick={() => project?.ownerId && onProfile?.(project.ownerId)}
              >
                {owner.name} {owner.isN2Admin && <N2AdminBadge />}{" "}
                {project?.isDemo && <DemoBadge />}
              </button>
              <span suppressHydrationWarning>
                {owner.role} ·{" "}
                {project
                  ? relativeNetworkAge(project.createdAt)
                  : second
                    ? "3h"
                    : "18m"}
              </span>
            </div>
          </div>
          {authenticated ? (
            project ? (
              <ProjectMenu
                project={project}
                onChanged={onChanged}
                onToast={onToast}
              />
            ) : (
              <FallbackProjectMenu
                projectId={projectId}
                title={title}
                summary={summary}
                onShare={onShare}
                onToast={onToast}
              />
            )
          ) : null}
        </div>
        <p className="project-copy">{summary}</p>
        {project?.status === "pending_deletion" && (
          <div className="project-deletion-notice" role="status">
            <strong>Project is being disbanded</strong>
            <span>
              This project is read-only and is scheduled for deletion
              {project.deletionScheduledAt
                ? ` on ${new Date(project.deletionScheduledAt).toLocaleString()}`
                : ""}
              .
            </span>
          </div>
        )}
        {project?.imageUrl && (
          <button
            className="project-card-image"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("n2:open-project", { detail: project.id }),
              )
            }
          >
            <img src={project.imageUrl} alt={`${project.title} project`} loading="lazy" decoding="async" />
          </button>
        )}
        <div className="project-meta">
          <span>
            <Clock3 size={15} />{" "}
            {project
              ? `${project.stage.charAt(0).toUpperCase()}${project.stage.slice(1)}`
              : second
                ? "Early concept"
                : "Pilot in 6 weeks"}
          </span>
          <span>
            <UsersRound size={15} />{" "}
            {project
              ? teamComplete
                ? `${currentPeople}/${requiredPeople} people · Team complete`
                : `${currentPeople}/${requiredPeople} people`
              : second
                ? "3 involved"
                : "4 involved"}
          </span>
        </div>
        <TeamTrail second={second} project={project} />
        {(!project || project.isOwner) && (
          <div className="ai-gap">
            <div className="ai-icon">
              <N2Mark inverse />
            </div>
            <div>
              <strong>
                {project?.matchScore
                  ? `${project.matchScore}% match for ${project.matchedRole}`
                  : "Suggested contributor"}
              </strong>
              <p>
                {project?.recommendationReasons?.length
                  ? project.recommendationReasons.join(" · ")
                  : second
                    ? "A finance lead could turn this into a sustainable local model."
                    : "A growth lead with community launch experience would round out this team."}
              </p>
            </div>
            <button onClick={onMatch}>
              Review match <ArrowUpRight size={15} />
            </button>
          </div>
        )}
        {project?.recommendationId && (
          <div className="recommendation-feedback">
            <span>Was this suggestion helpful?</span>
            <button onClick={() => feedback("not_now")}>Not now</button>
            <button onClick={() => feedback("not_relevant")}>
              <ThumbsDown size={13} /> Show me something else
            </button>
          </div>
        )}
        <div className="post-actions">
          <InterestButton
            projectId={projectId}
            durable={Boolean(project)}
            initial={project?.eyeCount ?? (second ? 41 : 24)}
            authenticated={authenticated}
            onRequireAuth={onRequireAuth}
          />
          <button
            onClick={() =>
              authenticated
                ? project && onComments?.(project)
                : onRequireAuth?.()
            }
          >
            <MessageCircle size={18} />{" "}
            {project?.commentCount ?? (second ? 12 : 8)} comments
          </button>
          <button
            className="share-button"
            onClick={() => onShare?.({ id: projectId, title, summary })}
          >
            <Share2 size={17} /> Share
          </button>
        </div>
      </div>
    </article>
  );
}

function CreateProject({
  onClose,
  onPublish,
  onToast,
  currentMember,
  initialDraft,
}: {
  onClose: () => void;
  onPublish: (project: ProjectRecord) => void;
  onToast: (message: string) => void;
  currentMember: MemberPerson;
  initialDraft?: ContentDraft<ProjectDraftPayload> | null;
}) {
  const initial = initialDraft?.payload;
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>((initial?.step ?? 0) as 0 | 1 | 2 | 3 | 4);
  const [locationQuery, setLocationQuery] = useState(initial?.locationQuery ?? "");
  const [form, setForm] = useState<ProjectDraftPayload["form"]>(initial?.form ?? {
    title: "",
    summary: "",
    description: "",
    imageUrl: null as string | null,
    industry: "",
    stage: "idea",
    workMode: "remote",
    city: "",
    country: "",
    timezone: "",
    allowRemoteFallback: false,
  });
  const [projectId, setProjectId] = useState(initial?.projectId ?? ""),
    [blueprint, setBlueprint] = useState<BlueprintRecord | null>(null),
    [roles, setRoles] = useState<BlueprintRole[]>(initial?.roles ?? []),
    [roadmap, setRoadmap] = useState<
      Array<{
        title: string;
        description: string;
        phase: "now" | "next" | "later";
        ownerId: string | null;
        dueAt: string | null;
      }>
    >(initial?.roadmap ?? []);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [summaryValidationAttempted, setSummaryValidationAttempted] = useState(false),
    [similarProjects, setSimilarProjects] = useState<SimilarProjectSuggestion[]>(initial?.similarProjects ?? []),
    [coOwnerQuery, setCoOwnerQuery] = useState(""),
    [coOwnerResults, setCoOwnerResults] = useState<CoOwnerCandidate[]>([]),
    [selectedCoOwners, setSelectedCoOwners] = useState<CoOwnerCandidate[]>(initial?.selectedCoOwners ?? []),
    [coOwnerSearchBusy, setCoOwnerSearchBusy] = useState(false);
  const projectDraftPayload = useMemo<ProjectDraftPayload>(() => ({
    form, locationQuery, step, projectId: projectId || null, blueprintId: blueprint?.id ?? initial?.blueprintId ?? null,
    roadmap, roles, selectedCoOwners, similarProjects,
  }), [form, locationQuery, step, projectId, blueprint?.id, initial?.blueprintId, roadmap, roles, selectedCoOwners, similarProjects]);
  const meaningfulDraft = Boolean(form.title.trim() || form.summary.trim() || form.industry.trim() || form.imageUrl || projectId);
  const { draftId, status: draftStatus, saveNow: saveProjectDraft, discard: discardProjectDraft, forget: forgetProjectDraft } = useContentDraft({
    kind: "project", initialDraft, payload: projectDraftPayload,
  });
  useEffect(() => {
    if (!initial?.projectId || blueprint) return;
    fetch(`/api/projects/${initial.projectId}/blueprint`, { cache: "no-store" })
      .then(async response => ({ response, data: await response.json() }))
      .then(({ response, data }) => {
        if (!response.ok || !data.blueprint) return;
        setBlueprint(data.blueprint);
        if (!initial.roles.length) setRoles(data.blueprint.roles ?? []);
        if (!initial.roadmap.length) setRoadmap((data.blueprint.milestones ?? []).map((item: { title: string; phase: "now" | "next" | "later" }) => ({ title: item.title, description: "", phase: item.phase, ownerId: currentMember.id ?? null, dueAt: null })));
      }).catch(() => undefined);
  }, [initial, blueprint, currentMember.id]);
  async function closeProjectComposer() {
    if (meaningfulDraft) {
      const savedId = await saveProjectDraft();
      if (!savedId) { setError("Could not save this project draft. Please try again."); return; }
      onToast("Project saved to drafts.");
    } else if (draftId && !await discardProjectDraft()) {
      setError("Could not remove this empty project draft. Please try again.");
      return;
    }
    onClose();
  }
  useEffect(() => {
    if (step !== 2 || coOwnerQuery.trim().length < 2) {
      setCoOwnerResults([]);
      setCoOwnerSearchBusy(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setCoOwnerSearchBusy(true);
      fetch(`/api/search?q=${encodeURIComponent(coOwnerQuery.trim())}&scope=connections`, { signal: controller.signal })
        .then((response) => response.ok ? response.json() : { people: [] })
        .then((data) => setCoOwnerResults((data.people ?? []).filter((person: CoOwnerCandidate) =>
          person.id !== currentMember.id && !selectedCoOwners.some((selected) => selected.id === person.id),
        )))
        .catch(() => undefined)
        .finally(() => setCoOwnerSearchBusy(false));
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [step, coOwnerQuery, currentMember.id, selectedCoOwners]);
  async function mapTeam() {
    setSummaryValidationAttempted(true);
    const titleLength = form.title.trim().length;
    const summaryLength = form.summary.trim().length;
    if (titleLength < 4 || titleLength > 120) {
      setError("Project title must be between 4 and 120 characters.");
      return;
    }
    if (summaryLength < 10) {
      setError(`Project summary must be at least 10 characters (${summaryLength}/10).`);
      return;
    }
    if (summaryLength > 500) {
      setError(`Project summary is ${summaryLength} characters. Shorten it to 500 characters or fewer.`);
      return;
    }
    if (form.industry.trim().length < 2) {
      setError("Type or choose an industry before building your project plan.");
      return;
    }
    if (!form.city || !form.country || !form.timezone) {
      setError("Choose a location from the suggestions so its country and timezone can be assigned.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const draftResponse = await fetch("/api/projects/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const draft = await draftResponse.json();
      if (!draftResponse.ok) {
        setError(draft.error ?? "Could not save the private project draft.");
        return;
      }
      setProjectId(draft.project.id);
      const response = await fetch(
        `/api/projects/${draft.project.id}/blueprint`,
        { method: "POST" },
      );
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Could not prepare the project team.");
        return;
      }
      setBlueprint(result.blueprint);
      setRoles(result.blueprint.roles);
      const nextRoadmap = result.blueprint.milestones.map(
          (item: { title: string; phase: "now" | "next" | "later" }) => ({
            title: item.title,
            description: "",
            phase: item.phase,
            ownerId: currentMember.id ?? null,
            dueAt: null,
          }));
      setRoadmap(nextRoadmap);
      setStep(1);
      await saveProjectDraft({ ...projectDraftPayload, step: 1, projectId: draft.project.id, blueprintId: result.blueprint.id, roles: result.blueprint.roles, roadmap: nextRoadmap });
    } catch {
      setError("We couldn't build your project plan. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }
  async function publish() {
    if (!blueprint || !projectId) return;
    setBusy(true);
    setError("");
    const response = await fetch(
      `/api/projects/${projectId}/blueprint/${blueprint.id}/approve`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          roles,
          milestones: roadmap,
          visibility: "network",
          allowRemoteFallback: form.allowRemoteFallback,
          coOwnerIds: selectedCoOwners.map((person) => person.id),
          draftId: draftId || undefined,
        }),
      },
    );
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "Could not publish this project.");
      setBusy(false);
      return;
    }
    onPublish({
      id: projectId,
      title: form.title,
      summary: form.summary,
      description: form.description,
      imageUrl: form.imageUrl,
      industry: form.industry,
      stage: form.stage,
      status: "active",
      visibility: "network",
      accent: PROJECT_ACCENT,
      workMode: form.workMode,
      city: form.city,
      country: form.country,
      ownerId: currentMember.id,
      ownerName: currentMember.name,
      ownerImage: currentMember.img ?? null,
      ownerIsAdmin: currentMember.isN2Admin,
      isOwner: true,
      roles: roles.map((role, index) => ({
        id: `new-${index}`,
        title: role.title,
        department: role.department,
        phase: role.phase,
        status: "open",
        criticality: role.criticality,
        capacity: role.headcount,
        filled: 0,
      })),
      team: [
        {
          userId: currentMember.id ?? "owner",
          name: currentMember.name,
          image: currentMember.img ?? null,
          profession: currentMember.role,
          department: "Leadership",
          membershipRole: "owner",
        },
      ],
      eyeCount: 0,
      commentCount: 0,
      createdAt: new Date().toISOString(),
    });
    await forgetProjectDraft();
    onClose();
  }
  async function checkSimilarityAndPublish() {
    if (!projectId || !blueprint) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/projects/similarity/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId, roles, milestones: roadmap }),
      });
      if (response.ok) {
        const result = await response.json();
        const suggestions = Array.isArray(result.suggestions) ? result.suggestions as SimilarProjectSuggestion[] : [];
        if (result.enabled !== false && suggestions.length) {
          setSimilarProjects(suggestions);
          setStep(4);
          setBusy(false);
          return;
        }
      }
    } catch { /* Similarity checks are advisory and never block publication. */ }
    await publish();
  }
  async function continueWithProject() {
    setBusy(true);
    fetch("/api/projects/similarity/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "continued_own_project", sourceProjectId: projectId }),
    }).catch(() => undefined);
    await publish();
  }
  function recordSimilarProjectView(targetProjectId: string) {
    fetch("/api/projects/similarity/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "target_viewed", sourceProjectId: projectId, targetProjectId }),
      keepalive: true,
    }).catch(() => undefined);
  }
  function chooseProjectImage(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > 1_500_000) {
      setError("Project images must be under 1.5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((value) => ({ ...value, imageUrl: String(reader.result) }));
      setError("");
    };
    reader.readAsDataURL(file);
  }
  function updateRole(index: number, patch: Partial<BlueprintRole>) {
    setRoles((rows) =>
      rows.map((role, i) => (i === index ? { ...role, ...patch } : role)),
    );
  }
  function addRole() {
    setRoles((rows) => [
      ...rows,
      {
        phase: "now",
        department: "New department",
        title: "New role",
        headcount: 1,
        professions: ["Relevant professional"],
        requiredSkills: ["Relevant skill"],
        usefulSkills: [],
        criticality: "important",
        reason: "This contribution helps the project reach its next milestone.",
        workMode: form.workMode as BlueprintRole["workMode"],
      },
    ]);
  }
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget) void closeProjectComposer(); }}
    >
      <section
        className="project-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-head">
          <button className="icon-button" onClick={() => void closeProjectComposer()} aria-label="Close">
            <X size={20} />
          </button>
          <span>
            {step === 0
              ? "New project"
              : step === 1
                ? "Guided roadmap"
                : step === 2
                  ? "Ownership"
                  : step === 3
                    ? "Suggested recruitment"
                    : "Similar projects"}
          </span>
          <span className="step-count">{step < 4 ? `${step + 1}/4` : "Review"}</span>
        </div>
        {draftStatus !== "idle" && <div className="project-draft-status"><DraftSaveIndicator status={draftStatus} /></div>}
        {step === 0 ? (
          <div className="modal-content">
            <span className="eyebrow">START WITH THE SPARK</span>
            <h2 id="modal-title">What would you like to make happen?</h2>
            <label>
              Project title
              <input
                value={form.title}
                onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
                placeholder="What will your project be called?"
                minLength={4}
                maxLength={120}
              />
            </label>
            <section className="project-visual-fields">
              <label className="project-image-input">
                <ImageIcon size={16} />
                <span>
                  <strong>{form.imageUrl ? "Change project image" : "Add a project image"}</strong>
                  <small>Optional · JPG, PNG or WebP · 1.5 MB maximum</small>
                </span>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseProjectImage(event.target.files?.[0])} />
              </label>
              {form.imageUrl && (
                <div className="project-image-preview">
                  <img src={form.imageUrl} alt="Project preview" />
                  <button type="button" onClick={() => setForm((current) => ({ ...current, imageUrl: null }))}><X size={14} /> Remove</button>
                </div>
              )}
            </section>
            <div className="project-summary-field">
              <label htmlFor="project-summary">Project summary</label>
              <div className="project-summary-input">
                <textarea
                  id="project-summary"
                  placeholder="Describe the idea, why it matters, and where you'd like help…"
                  value={form.summary}
                  onChange={(e) => setForm((current) => ({ ...current, summary: e.target.value }))}
                  minLength={10}
                  maxLength={500}
                  aria-describedby={`${summaryValidationAttempted && form.summary.trim().length < 10 ? "project-summary-minimum " : ""}project-summary-hint`}
                  aria-invalid={summaryValidationAttempted && form.summary.trim().length < 10}
                />
                <div className="project-summary-footer">
                  <label htmlFor="project-industry" className="project-summary-industry">
                    <CareerIndustryInput
                      id="project-industry"
                      value={form.industry}
                      onChange={(industry) => setForm((current) => ({ ...current, industry }))}
                      placeholder="Type or choose an industry"
                      required
                      ariaLabel="Industry"
                      ariaDescribedBy="project-industry-hint"
                    />
                    <small id="project-industry-hint" className="visually-hidden">Required. Start typing or choose a suggestion.</small>
                  </label>
                  <small id="project-summary-hint" className="field-limit" aria-live="polite">
                    <i className="character-fill" aria-hidden="true" style={{ "--character-fill": `${Math.min(100, form.summary.length / 5)}%` } as React.CSSProperties} />
                    <span aria-label={`${form.summary.length} of 500 characters`}>{form.summary.length}/500</span>
                  </small>
                </div>
              </div>
              {summaryValidationAttempted && form.summary.trim().length < 10 && <small id="project-summary-minimum" className="project-summary-minimum" role="alert">Minimum 10 characters required.</small>}
            </div>
            <fieldset className="project-icon-field">
              <legend>Stage</legend>
              <div className="project-icon-choices four-up">
                {([
                  ["idea", "Idea", Lightbulb],
                  ["planning", "Planning", ClipboardList],
                  ["building", "Building", Wrench],
                  ["launching", "Launching", Rocket],
                ] as const).map(([value, label, Icon]) => (
                  <label key={value} className={form.stage === value ? "selected" : ""}>
                    <input type="radio" name="project-stage" value={value} checked={form.stage === value} onChange={() => setForm((current) => ({ ...current, stage: value }))} />
                    <Icon size={21} aria-hidden="true" /><span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="project-icon-field">
              <legend>Working style</legend>
              <div className="project-icon-choices">
                {([
                  ["remote", "Remote", Globe2],
                  ["hybrid", "Hybrid", Laptop],
                  ["in_person", "In person", MapPin],
                ] as const).map(([value, label, Icon]) => (
                  <label key={value} className={form.workMode === value ? "selected" : ""}>
                    <input type="radio" name="project-work-mode" value={value} checked={form.workMode === value} onChange={() => setForm((current) => ({ ...current, workMode: value }))} />
                    <Icon size={21} aria-hidden="true" /><span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <ProjectLocationInput
              query={locationQuery}
              selected={form.city && form.country && form.timezone ? {
                city: form.city,
                country: form.country,
                timezone: form.timezone,
                label: locationQuery,
              } : null}
              onQueryChange={(query) => {
                setLocationQuery(query);
                setForm((current) => ({ ...current, city: "", country: "", timezone: "" }));
              }}
              onSelect={(location) => {
                setLocationQuery(location.label);
                setForm((current) => ({
                  ...current,
                  city: location.city,
                  country: location.country,
                  timezone: location.timezone,
                }));
                setError("");
              }}
            />
            {error && <p className="form-error" role="alert" aria-live="polite">{error}</p>}
            <div className="project-wizard-actions project-details-actions">
              <button className="primary-button project-plan-button" disabled={busy} onClick={mapTeam}>
                {busy ? "Mapping the project…" : "Build my project plan"}
              </button>
            </div>
          </div>
        ) : step === 4 ? (
          <div className="modal-content similar-project-review">
            <div className="ai-orbit"><N2Mark /><span>n2 project check</span></div>
            <span className="eyebrow">SIMILAR WORK FOUND</span>
            <h2 id="modal-title">Similar work is already underway</h2>
            <p>These projects share a very close purpose and have an open role that fits your profile. Joining is optional—you can still publish your own project.</p>
            <div className="similar-project-list">
              {similarProjects.map((project) => (
                <article key={project.projectId}>
                  <header><div><span>{project.score}% aligned</span><h3>{project.title}</h3></div><b>{project.stage}</b></header>
                  <p>{project.summary}</p>
                  <div className="similar-project-metrics">
                    <span><UsersRound size={14}/><b>{project.teamSize}</b> people</span>
                    <span><Clock3 size={14}/><b>{project.progress}%</b> progress</span>
                    {project.location && <span><MapPin size={14}/>{project.location}</span>}
                  </div>
                  <div className="similar-project-role"><BriefcaseBusiness size={16}/><span><strong>{project.matchingRole.title}</strong><small>{project.matchingRole.openings} open · {project.matchingRole.fitScore}% profile fit</small></span></div>
                  <ul>{project.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                  <a href={`/?project=${encodeURIComponent(project.projectId)}&role=${encodeURIComponent(project.matchingRole.id)}&sourceProject=${encodeURIComponent(projectId)}`} target="_blank" rel="noreferrer" onClick={() => recordSimilarProjectView(project.projectId)}>View matching role <ArrowUpRight size={15}/></a>
                </article>
              ))}
            </div>
            {error && <p className="form-error">{error}</p>}
            <div className="similar-project-actions">
              <button type="button" className="secondary-button" onClick={() => setStep(3)} disabled={busy}><ArrowLeft size={15}/> Back</button>
              <button type="button" className="primary-button" onClick={continueWithProject} disabled={busy}>{busy ? "Publishing…" : "Continue with my project"}</button>
            </div>
          </div>
        ) : step === 1 ? (
          <div className="modal-content ai-result">
            <div className="ai-orbit">
              <N2Mark />
              <span>n2 project map</span>
            </div>
            <h2 id="modal-title">{blueprint?.outcome}</h2>
            <p>
              Shape the suggested steps into a practical roadmap for your
              project. You can edit, reorder or add to it.
            </p>
            {blueprint?.usedFallback && (
              <div className="blueprint-fallback">
                <ShieldCheck size={16} />
                <span>
                  <strong>Your editable roadmap is ready</strong>
                  <small>
                    Adjust these suggested steps to fit the way you want to
                    deliver the project.
                  </small>
                </span>
              </div>
            )}
            {blueprint?.coveredContributions?.length ? (
              <div className="covered-contributions">
                <span>Already covered by you</span>
                {blueprint.coveredContributions.map((item) => (
                  <b key={item.area}>{item.area}</b>
                ))}
              </div>
            ) : null}
            <section className="blueprint-roadmap">
              <header>
                <span className="eyebrow">GUIDED ROADMAP</span>
                <button
                  type="button"
                  onClick={() =>
                    setRoadmap((items) => [
                      ...items,
                      {
                        title: "New roadmap step",
                        description: "",
                        phase: "later",
                        ownerId: currentMember.id ?? null,
                        dueAt: null,
                      },
                    ])
                  }
                >
                  <Plus size={14} /> Add step
                </button>
              </header>
              {roadmap.map((item, index) => (
                <article key={index}>
                  <b>{index + 1}</b>
                  <div>
                    <input
                      aria-label="Roadmap step title"
                      value={item.title}
                      onChange={(e) =>
                        setRoadmap((items) =>
                          items.map((row, i) =>
                            i === index
                              ? { ...row, title: e.target.value }
                              : row,
                          ),
                        )
                      }
                    />
                    <textarea
                      aria-label="Roadmap step description"
                      placeholder="What will this step achieve?"
                      value={item.description}
                      onChange={(e) =>
                        setRoadmap((items) =>
                          items.map((row, i) =>
                            i === index
                              ? { ...row, description: e.target.value }
                              : row,
                          ),
                        )
                      }
                    />
                    <div>
                      <N2Select
                        value={item.phase}
                        onValueChange={(phase) =>
                          setRoadmap((items) =>
                            items.map((row, i) =>
                              i === index
                                ? {
                                    ...row,
                                    phase: phase as typeof item.phase,
                                  }
                                : row,
                            ),
                          )
                        }
                        options={[{ value: "now", label: "Now" }, { value: "next", label: "Next" }, { value: "later", label: "Later" }]}
                        compact
                      />
                      <input
                        aria-label="Due date"
                        type="date"
                        value={item.dueAt?.slice(0, 10) ?? ""}
                        onChange={(e) =>
                          setRoadmap((items) =>
                            items.map((row, i) =>
                              i === index
                                ? {
                                    ...row,
                                    dueAt: e.target.value
                                      ? new Date(
                                          `${e.target.value}T12:00:00Z`,
                                        ).toISOString()
                                      : null,
                                  }
                                : row,
                            ),
                          )
                        }
                      />
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() =>
                          setRoadmap((items) => {
                            const next = [...items];
                            [next[index - 1], next[index]] = [
                              next[index],
                              next[index - 1],
                            ];
                            return next;
                          })
                        }
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={index === roadmap.length - 1}
                        onClick={() =>
                          setRoadmap((items) => {
                            const next = [...items];
                            [next[index + 1], next[index]] = [
                              next[index],
                              next[index + 1],
                            ];
                            return next;
                          })
                        }
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        aria-label="Remove roadmap step"
                        onClick={() =>
                          setRoadmap((items) =>
                            items.filter((_, i) => i !== index),
                          )
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </section>
            <div className="project-wizard-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setStep(0)}
                disabled={busy}
              >
                <ArrowLeft size={15} /> Back
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => setStep(2)}
                disabled={busy || roadmap.length === 0}
              >
                Continue to ownership <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ) : step === 2 ? (
          <div className="modal-content ai-result project-ownership-step">
            <div className="ai-orbit">
              <N2Mark />
              <span>n2 ownership</span>
            </div>
            <span className="eyebrow">PROJECT OWNERSHIP</span>
            <h2 id="modal-title">Choose who can help lead</h2>
            <p>
              Keep yourself as primary owner and optionally invite up to two mutual connections as co-owners.
            </p>
            <section className="project-ownership-section" aria-labelledby="project-ownership-heading">
              <header>
                <div>
                  <span className="eyebrow">OWNERSHIP</span>
                  <h3 id="project-ownership-heading">Choose who can help lead</h3>
                </div>
                <span>{selectedCoOwners.length}/2 co-owners</span>
              </header>
              <p>Your selections receive seven-day invitations. They only receive co-owner permissions after accepting.</p>
              <div className="project-primary-owner">
                <article className="project-owner-slot">
                  <Avatar person={{ name: currentMember.name, role: currentMember.role, img: currentMember.img }} size="sm" />
                  <span><strong>{currentMember.name}</strong><small>Primary owner · fixed</small></span>
                </article>
              </div>
              <div className="project-owner-divider" aria-hidden="true" />
              <div className="project-owner-slots">
                {[0, 1].map((index) => {
                  const person = selectedCoOwners[index];
                  return person ? (
                    <article className="project-owner-slot" key={person.id}>
                      <Avatar person={{ name: person.name ?? person.username ?? "n2 member", role: person.profession ?? "Co-owner invitation", img: person.image }} size="sm" />
                      <span><strong>{person.name ?? `@${person.username}`}</strong><small>{person.profession ?? "Invitation pending"}</small></span>
                      <button type="button" aria-label={`Remove ${person.name ?? person.username}`} onClick={() => setSelectedCoOwners((people) => people.filter((item) => item.id !== person.id))}><X size={14}/></button>
                    </article>
                  ) : (
                    <article className="project-owner-slot empty" key={`empty-${index}`}>
                      <span className="co-owner-slot-number">{index + 1}</span>
                      <span><strong>Optional co-owner</strong><small>Mutual connections only</small></span>
                    </article>
                  );
                })}
              </div>
              {selectedCoOwners.length < 2 && (
                <div className="co-owner-search">
                  <label htmlFor="co-owner-search">Search mutual connections</label>
                  <div><Search size={16}/><input id="co-owner-search" value={coOwnerQuery} onChange={(event) => setCoOwnerQuery(event.target.value)} placeholder="Name, @username or profession" autoComplete="off" /></div>
                  {(coOwnerQuery.trim().length >= 2 || coOwnerSearchBusy) && (
                    <div className="co-owner-results" role="listbox" aria-label="Eligible co-owners">
                      {coOwnerResults.map((person) => (
                        <button type="button" role="option" aria-selected="false" key={person.id} onClick={() => {
                          if (selectedCoOwners.length >= 2 || selectedCoOwners.some((selected) => selected.id === person.id)) return;
                          setSelectedCoOwners((people) => [...people, person]);
                          setCoOwnerQuery("");
                          setCoOwnerResults([]);
                        }}>
                          <Avatar person={{ name: person.name ?? person.username ?? "n2 member", role: person.profession ?? `@${person.username}`, img: person.image }} size="sm" />
                          <span><strong>{person.name ?? person.username}</strong><small>{person.username ? `@${person.username}` : "No username"}{person.profession ? ` · ${person.profession}` : ""}</small></span>
                          <Plus size={15}/>
                        </button>
                      ))}
                      {coOwnerSearchBusy && <p>Searching mutual connections…</p>}
                      {!coOwnerSearchBusy && !coOwnerResults.length && <p>No eligible mutual connections found.</p>}
                    </div>
                  )}
                </div>
              )}
            </section>
            {error && <p className="form-error">{error}</p>}
            <div className="project-wizard-actions">
              <button type="button" className="secondary-button" onClick={() => setStep(1)} disabled={busy}><ArrowLeft size={15} /> Back</button>
              <button type="button" className="primary-button" onClick={() => setStep(3)} disabled={busy}>Continue to recruitment <ChevronRight size={16} /></button>
            </div>
          </div>
        ) : (
          <div className="modal-content ai-result project-recruitment-step">
            <div className="ai-orbit"><N2Mark /><span>n2 team match</span></div>
            <span className="eyebrow">SUGGESTED RECRUITMENT</span>
            <h2 id="modal-title">Build the team your project needs</h2>
            <p>Review and edit each suggested role before it affects matching. n2 never sends automatic invitations.</p>
            <div className="remote-fallback remote-fallback-switch">
              <span className="remote-fallback-icon"><Globe2 size={19} aria-hidden="true" /></span>
              <span><strong>Use remote fallback</strong><small>Widen matching only when suitable local people are scarce.</small></span>
              <button type="button" role="switch" aria-checked={form.allowRemoteFallback} aria-label="Use remote fallback" onClick={() => setForm((current) => ({ ...current, allowRemoteFallback: !current.allowRemoteFallback }))}>
                <span aria-hidden="true" />
              </button>
            </div>
            <div className="blueprint-roles">
              {roles.map((role, index) => (
                <article key={`${index}-${role.title}`}>
                  <div className="blueprint-role-head">
                    <N2Select
                      aria-label="Role phase"
                      value={role.phase}
                      onValueChange={(phase) =>
                        updateRole(index, {
                          phase: phase as BlueprintRole["phase"],
                        })
                      }
                      options={[{ value: "now", label: "Now" }, { value: "next", label: "Next" }, { value: "later", label: "Later" }]}
                      compact
                    />
                    <N2Select
                      aria-label="Role criticality"
                      value={role.criticality}
                      onValueChange={(criticality) =>
                        updateRole(index, {
                          criticality: criticality as BlueprintRole["criticality"],
                        })
                      }
                      options={[{ value: "critical", label: "Critical" }, { value: "important", label: "Important" }, { value: "useful", label: "Useful" }]}
                      compact
                    />
                    <button
                      aria-label={`Remove ${role.title}`}
                      onClick={() =>
                        setRoles((rows) => rows.filter((_, i) => i !== index))
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="field-row">
                    <label>
                      Role
                      <input
                        value={role.title}
                        onChange={(e) =>
                          updateRole(index, { title: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Department
                      <input
                        value={role.department}
                        onChange={(e) =>
                          updateRole(index, { department: e.target.value })
                        }
                      />
                    </label>
                  </div>
                  <label>
                    Required skills
                    <input
                      value={role.requiredSkills.join(", ")}
                      onChange={(e) =>
                        updateRole(index, {
                          requiredSkills: e.target.value
                            .split(",")
                            .map((value) => value.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  </label>
                  <label>
                    Suitable professions
                    <input
                      value={role.professions.join(", ")}
                      onChange={(e) =>
                        updateRole(index, {
                          professions: e.target.value
                            .split(",")
                            .map((value) => value.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  </label>
                  <small>{role.reason}</small>
                </article>
              ))}
            </div>
            <button className="secondary-button wide" onClick={addRole}>
              <Plus size={16} /> Add another role
            </button>
            {error && <p className="form-error">{error}</p>}
            <div className="project-wizard-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setStep(2)}
                disabled={busy}
              >
                <ArrowLeft size={15} /> Back
              </button>
              <button
                type="button"
                className="primary-button publish-project-button"
                disabled={busy || roles.length === 0}
                onClick={checkSimilarityAndPublish}
              >
                {busy ? (
                  "Publishing and matching…"
                ) : (
                  <>
                    Review matches & publish <ArrowUpRight size={17} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function videoEmbed(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (parsed.hostname === "youtu.be")
      return `https://www.youtube-nocookie.com/embed/${parsed.pathname.slice(1)}`;
    if (parsed.hostname.includes("vimeo.com")) {
      const id = parsed.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {}
  return null;
}

function TimelinePostCard({
  post,
  currentMember,
  onProfile,
  onProject,
  onThread,
  onEngage,
  canEngage,
  onShare,
  onToast,
  onChanged,
}: {
  post: TimelinePost;
  currentMember: MemberPerson;
  onProfile: (id: string) => void;
  onProject: (projectId?: string) => void;
  onThread: () => void;
  onEngage: () => void;
  canEngage: boolean;
  onShare: (item: {
    id: string;
    title: string;
    summary: string;
    kind?: "project" | "post";
  }) => void;
  onToast: (message: string) => void;
  onChanged: (post: TimelinePost | null) => void;
}) {
  const embed = post.videoUrl ? videoEmbed(post.videoUrl) : null;
  const [menuOpen, setMenuOpen] = useState(false),
    [editOpen, setEditOpen] = useState(false),
    [deleteOpen, setDeleteOpen] = useState(false),
    [reportOpen, setReportOpen] = useState(false),
    menuRef = useRef<HTMLDivElement>(null),
    owner = post.authorId === currentMember.id;
  useEffect(() => {
    if (!menuOpen) return;
    function dismiss(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function dismissWithKeyboard(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", dismissWithKeyboard);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", dismissWithKeyboard);
    };
  }, [menuOpen]);
  function share() {
    onShare({
      id: post.id,
      title: `Post by ${post.authorName ?? "an n2 member"}`,
      summary: post.body,
      kind: "post",
    });
  }
  async function save(action: "pin" | "bookmark") {
    const response = await fetch("/api/saved-items", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entityType: "post", entityId: post.id, action }),
      }),
      result = await response.json();
    if (!response.ok) {
      onToast(result.error ?? "Could not save this post.");
      return;
    }
    onChanged({
      ...post,
      isPinned: result.pinned,
      isBookmarked: result.bookmarked,
    });
    onToast(
      action === "pin"
        ? result.pinned
          ? "Post pinned."
          : "Post unpinned."
        : result.bookmarked
          ? "Post bookmarked."
          : "Bookmark removed.",
    );
    setMenuOpen(false);
  }
  function edit() {
    setMenuOpen(false);
    setEditOpen(true);
  }
  async function visibility() {
    const visibility =
        post.visibility === "connections" ? "network" : "connections",
      response = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ visibility }),
      }),
      result = await response.json();
    if (response.ok) {
      onChanged({ ...post, visibility });
      onToast(
        visibility === "network"
          ? "Post is now public to the network."
          : "Post is now limited to connections.",
      );
    } else onToast(result.error ?? "Could not change visibility.");
    setMenuOpen(false);
  }
  async function remove() {
    const response = await fetch(`/api/posts/${post.id}`, { method: "DELETE" }),
      result = await response.json();
    if (response.ok) {
      onChanged(null);
      onToast("Post deleted.");
    } else onToast(result.error ?? "Could not delete this post.");
    setDeleteOpen(false);
  }
  async function report({ reason, details }: Record<string, string>) {
    const response = await fetch("/api/moderation/reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        targetType: "post",
        targetId: post.id,
        reason,
        details: details || undefined,
      }),
    });
    onToast(
      response.ok
        ? "Post reported to the n2 team."
        : "Could not submit the report.",
    );
    return response.ok;
  }
  async function react(action: "like" | "repost") {
    if (!canEngage) {
      onEngage();
      return;
    }
    const response = await fetch(`/api/posts/${post.id}/reactions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      }),
      result = await response.json();
    if (!response.ok) {
      onToast(result.error ?? "Could not update this post.");
      return;
    }
    onChanged({
      ...post,
      liked: action === "like" ? result.active : post.liked,
      reposted: action === "repost" ? result.active : post.reposted,
      likeCount: result.likeCount,
      repostCount: result.repostCount,
    });
    onToast(
      action === "like"
        ? result.active
          ? "Post liked."
          : "Like removed."
        : result.active
          ? "Post reposted."
          : "Repost removed.",
    );
  }
  return (
    <>
    <article className="timeline-post">
      <header>
        <Avatar
          person={{
            name: post.authorName ?? "n2 member",
            role: post.authorProfession ?? "n2 member",
            img: post.authorImage,
            isN2Admin: post.authorIsAdmin,
          }}
          size="md"
        />
        <div>
          <button
            className="profile-name"
            onClick={() => onProfile(post.authorId)}
          >
            {post.authorName ?? "n2 member"}{" "}
            {post.authorIsAdmin && <N2AdminBadge />}{" "}
            {post.isDemo && <DemoBadge />}
            {post.authorStatus && post.authorStatus !== "active" && <small className="account-state-badge">Account no longer active</small>}
          </button>
          <span>
            {post.authorProfession ?? "n2 member"} ·{" "}
            {formatNetworkDate(post.createdAt, {
              day: "numeric",
              month: "short",
            })}
            {post.visibility === "connections" ? " · Connections only" : ""}
          </span>
        </div>
        <div className="project-menu-wrap" ref={menuRef}>
          <button
            className="icon-button"
            aria-label="Post options"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <Ellipsis size={18} />
          </button>
          {menuOpen && (
            <div className="project-menu">
              <button onClick={() => save("pin")}>
                <Pin size={15} />
                {post.isPinned ? "Unpin" : "Pin"}
              </button>
              <button onClick={() => save("bookmark")}>
                <Bookmark
                  size={15}
                  fill={post.isBookmarked ? "currentColor" : "none"}
                />
                {post.isBookmarked ? "Remove bookmark" : "Bookmark"}
              </button>
              <button onClick={share}>
                <Share2 size={15} />
                Share
              </button>
              {owner ? (
                <>
                  <hr />
                  <button onClick={edit}>
                    <Pencil size={15} />
                    Edit post
                  </button>
                  <button onClick={visibility}>
                    {post.visibility === "connections" ? (
                      <Globe2 size={15} />
                    ) : (
                      <ShieldCheck size={15} />
                    )}
                    Make{" "}
                    {post.visibility === "connections"
                      ? "public"
                      : "connections only"}
                  </button>
                  <button
                    className="danger"
                    onClick={() => {
                      setMenuOpen(false);
                      setDeleteOpen(true);
                    }}
                  >
                    <Trash2 size={15} />
                    Delete post
                  </button>
                </>
              ) : (
                <>
                  <hr />
                  <button onClick={() => { setMenuOpen(false); setReportOpen(true); }}>
                    <ShieldCheck size={15} />
                    Report post
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </header>
      <button
        type="button"
        className="post-thread-trigger"
        onClick={onThread}
      >
        <LinkifiedText text={post.body} />
      </button>
      <RichLinkPreview text={post.body} url={!embed ? post.videoUrl : null} />
      {post.linkedProjects.length > 0 && (
        <div className="post-project-links">
          {post.linkedProjects.map((project) => (
            <button key={project.id} onClick={() => onProject(project.id)}>
              #{projectTagSlug(project.title)}
            </button>
          ))}
        </div>
      )}
      {post.attachmentType === "image" && post.attachmentUrl && (
        <img
          className="post-media"
          src={post.attachmentUrl}
          alt="Post attachment"
          loading="lazy"
          decoding="async"
        />
      )}
      {post.attachmentType === "video" && post.attachmentUrl && (
        <video
          className="post-media"
          src={post.attachmentUrl}
          controls
          preload="metadata"
        />
      )}
      {embed && (
        <div className="post-video-embed">
          <iframe
            src={embed}
            title="Video shared in post"
            allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
      <footer>
        <button onClick={onThread}>
          <MessageCircle size={16} /> Reply
          {post.replyCount ? ` ${post.replyCount}` : ""}
        </button>
        <button
          className={post.liked ? "active" : ""}
          onClick={() => react("like")}
        >
          <ThumbsUp size={16} fill={post.liked ? "currentColor" : "none"} />{" "}
          Like{post.likeCount ? ` ${post.likeCount}` : ""}
        </button>
        <button
          className={post.reposted ? "active" : ""}
          onClick={() => react("repost")}
        >
          <Repeat2 size={16} /> Repost
          {post.repostCount ? ` ${post.repostCount}` : ""}
        </button>
        <button onClick={share}>
          <Share2 size={16} /> Share
        </button>
      </footer>
    </article>
    {editOpen && (
      <PostComposer
        currentMember={currentMember}
        initialPost={post}
        onClose={() => setEditOpen(false)}
        onPosted={(updated) => onChanged(updated)}
        onToast={onToast}
      />
    )}
    {deleteOpen && (
      <div
        className="modal-backdrop"
        role="presentation"
        onMouseDown={(event) =>
          event.target === event.currentTarget && setDeleteOpen(false)
        }
      >
        <section className="confirm-modal" role="dialog" aria-modal="true">
          <span className="eyebrow">DELETE POST</span>
          <h2>Remove this post?</h2>
          <p>It will disappear from the timeline, replies and shared links.</p>
          <footer>
            <button className="secondary-button" onClick={() => setDeleteOpen(false)}>
              Keep post
            </button>
            <button className="primary-button danger" onClick={remove}>
              <Trash2 size={16} /> Delete post
            </button>
          </footer>
        </section>
      </div>
    )}
    {reportOpen && (
      <ActionDialog
        eyebrow="REPORT POST"
        title="Tell the n2 team what happened."
        description="Reports are reviewed privately. Choose the closest reason and add any context that may help."
        confirmLabel="Submit report"
        fields={[
          { name: "reason", label: "Reason", kind: "select", defaultValue: "spam", required: true, options: [
            { value: "spam", label: "Spam" },
            { value: "harassment", label: "Harassment" },
            { value: "fraud", label: "Fraud" },
            { value: "misinformation", label: "Misinformation" },
            { value: "privacy", label: "Privacy" },
            { value: "other", label: "Other" },
          ] },
          { name: "details", label: "Details (optional)", placeholder: "Describe what the review team should know", maxLength: 2000 },
        ]}
        onClose={() => setReportOpen(false)}
        onConfirm={report}
      />
    )}
    </>
  );
}

function PostComposer({
  currentMember,
  initialPost,
  initialDraft,
  onClose,
  onPosted,
  onToast,
}: {
  currentMember: MemberPerson;
  initialPost?: TimelinePost;
  initialDraft?: ContentDraft<PostDraftPayload> | null;
  onClose: () => void;
  onPosted: (post: TimelinePost) => void;
  onToast: (message: string) => void;
}) {
  const editing = Boolean(initialPost);
  const initialProjectDetails: PostTagProject[] = (initialPost?.linkedProjects ?? []).map((project) => ({
    ...project,
    industry: "",
    ownerName: null,
  }));
  const [body, setBody] = useState(initialPost?.body ?? initialDraft?.payload.body ?? ""),
    [attachment, setAttachment] = useState<{
      type: "image" | "video";
      url: string;
      name: string;
    } | null>(
      initialPost?.attachmentType && initialPost.attachmentUrl
        ? {
            type: initialPost.attachmentType,
            url: initialPost.attachmentUrl,
            name: "Current attachment",
          }
        : initialDraft?.payload.attachment ?? null,
    ),
    [ownProjects, setOwnProjects] = useState<ProjectRecord[]>([]),
    [projectDetails, setProjectDetails] = useState<PostTagProject[]>(initialProjectDetails),
    [linked, setLinked] = useState<string[]>(
      initialPost?.linkedProjects.map((project) => project.id) ?? initialDraft?.payload.linkedProjectIds ?? [],
    ),
    [showTools, setShowTools] = useState(false),
    [composerExpanded, setComposerExpanded] = useState(false),
    [composerFullscreen, setComposerFullscreen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const managedProjectTags = useRef(new Set(
    initialProjectDetails
      .filter((project) => new RegExp(`(?:^|\\s)#${projectTagSlug(project.title)}(?=\\s|$|[.,!?;:])`, "i").test(body))
      .map((project) => project.id),
  ));
  const postDraftPayload = useMemo<PostDraftPayload>(() => ({ body, linkedProjectIds: linked, attachment, visibility: initialDraft?.payload.visibility ?? "network" }), [body, linked, attachment, initialDraft?.payload.visibility]);
  const meaningfulDraft = !editing && Boolean(body.trim() || attachment || linked.length);
  const { draftId, status: draftStatus, saveNow: savePostDraft, discard: discardPostDraft, forget: forgetPostDraft } = useContentDraft({
    kind: "post", initialDraft, payload: postDraftPayload,
  });
  async function closePostComposer() {
    if (meaningfulDraft) {
      const savedId = await savePostDraft();
      if (!savedId) { setError("Could not save this post draft. Please try again."); return; }
      onToast("Post saved to drafts.");
    } else if (draftId && !await discardPostDraft()) {
      setError("Could not remove this empty post draft. Please try again.");
      return;
    }
    onClose();
  }
  useEffect(() => {
    fetch("/api/projects?scope=mine&limit=40")
      .then(async (mine) => {
        const mineData = mine.ok ? await mine.json() : { projects: [] };
        setOwnProjects(
          (mineData.projects ?? []).filter(
            (project: ProjectRecord) =>
              project.status === "active" && project.visibility === "network",
          ),
        );
      })
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    const known = new Set(projectDetails.map((project) => project.id));
    const missing = linked.filter((id) => !known.has(id));
    if (!missing.length) return;
    const controller = new AbortController();
    Promise.all(missing.map((id) =>
      fetch(`/api/projects/${encodeURIComponent(id)}`, { signal: controller.signal })
        .then(async (response) => response.ok ? (await response.json()).project as PostTagProject : null)
        .catch(() => null),
    )).then((rows) => {
      const resolved = rows.filter((project): project is PostTagProject => Boolean(project));
      if (!resolved.length) return;
      setProjectDetails((current) => [
        ...current,
        ...resolved.filter((project) => !current.some((item) => item.id === project.id)),
      ]);
    });
    return () => controller.abort();
  }, [linked, projectDetails]);
  useEffect(() => {
    for (const project of projectDetails) {
      if (linked.includes(project.id) && new RegExp(`(?:^|\\s)#${projectTagSlug(project.title)}(?=\\s|$|[.,!?;:])`, "i").test(body)) {
        managedProjectTags.current.add(project.id);
      }
    }
  }, [body, linked, projectDetails]);
  useEffect(() => {
    if (!bodyRef.current) return;
    bodyRef.current.style.height = "auto";
    bodyRef.current.style.height = `${Math.min(132, Math.max(24, bodyRef.current.scrollHeight))}px`;
  }, [body, composerExpanded, composerFullscreen]);
  useEffect(() => {
    if (!composerFullscreen) return;
    const leaveFullscreen = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setComposerFullscreen(false);
      requestAnimationFrame(() => bodyRef.current?.focus());
    };
    window.addEventListener("keydown", leaveFullscreen);
    return () => window.removeEventListener("keydown", leaveFullscreen);
  }, [composerFullscreen]);
  const projectsList: PostTagProject[] = [
    ...ownProjects,
    ...projectDetails.filter((project) => !ownProjects.some((own) => own.id === project.id)),
  ];
  const selectedProjects = linked
    .map((id) => projectsList.find((project) => project.id === id))
    .filter((project): project is PostTagProject => Boolean(project));
  const mentionedUsernames = [...new Set(
    [...body.matchAll(/(?:^|\s)@([a-z0-9_-]{2,30})\b/gi)].map((match) => match[1].toLowerCase()),
  )];

  function updateBody(next: string) {
    setBody(next);
    const removedIds = [...managedProjectTags.current].filter((id) => {
      const project = projectsList.find((item) => item.id === id);
      return project && !new RegExp(`(?:^|\\s)#${projectTagSlug(project.title)}(?=\\s|$|[.,!?;:])`, "i").test(next);
    });
    if (removedIds.length) {
      setLinked((ids) => ids.filter((id) => !removedIds.includes(id)));
      removedIds.forEach((id) => managedProjectTags.current.delete(id));
    }
  }

  function insertAtCursor(text: string) {
    const input = bodyRef.current;
    const start = input?.selectionStart ?? body.length;
    const end = input?.selectionEnd ?? body.length;
    const next = `${body.slice(0, start)}${text}${body.slice(end)}`;
    if (next.length > 1000) return;
    updateBody(next);
    requestAnimationFrame(() => {
      const cursor = start + text.length;
      input?.focus();
      input?.setSelectionRange(cursor, cursor);
    });
  }
  function chooseFile(file?: File) {
    if (!file) return;
    const isImage = file.type.startsWith("image/"),
      isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      setError("Choose an image or video file.");
      return;
    }
    const max = isImage ? 2_000_000 : 2_500_000;
    if (file.size > max) {
      setError(
        `${isImage ? "Images" : "Videos"} must be under ${isImage ? "2 MB" : "2.5 MB"}.`,
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        type: isImage ? "image" : "video",
        url: String(reader.result),
        name: file.name,
      });
      setError("");
    };
    reader.readAsDataURL(file);
  }
  function chooseProject(project: PostTagProject) {
    if (!linked.includes(project.id) && linked.length >= 8) {
      setError("You can tag up to eight projects in one post.");
      return false;
    }
    setProjectDetails((current) => current.some((item) => item.id === project.id) ? current : [...current, project]);
    setLinked((ids) => ids.includes(project.id) ? ids : [...ids, project.id]);
    managedProjectTags.current.add(project.id);
    setError("");
    return true;
  }

  function removeProject(project: PostTagProject) {
    const slug = projectTagSlug(project.title);
    const next = body
      .replace(new RegExp(`(^|\\s)#${slug}(?=\\s|$|[.,!?;:])`, "i"), "$1")
      .replace(/ {2,}/g, " ")
      .trimEnd();
    managedProjectTags.current.delete(project.id);
    setLinked((ids) => ids.filter((id) => id !== project.id));
    setBody(next);
  }

  function removeMention(username: string) {
    updateBody(body
      .replace(new RegExp(`(^|\\s)@${username}(?=\\s|$|[.,!?;:])`, "i"), "$1")
      .replace(/ {2,}/g, " ")
      .trimEnd());
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (body.length > 1000) {
      setError(`Shorten this post by ${body.length - 1000} characters before publishing.`);
      return;
    }
    setBusy(true);
    setError("");
    const response = await fetch(
      editing ? `/api/posts/${initialPost!.id}` : "/api/posts",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          body,
          linkedProjectIds: linked,
          attachmentType: attachment?.type ?? null,
          attachmentUrl: attachment?.url ?? null,
          videoUrl: firstUrl(body),
          draftId: editing ? undefined : draftId || undefined,
        }),
      },
    );
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Could not publish your post.");
      setBusy(false);
      return;
    }
    onPosted({
      ...(initialPost ?? {}),
      ...data.post,
      linkedProjects: projectsList
        .filter((project) => linked.includes(project.id))
        .map((project) => ({ id: project.id, title: project.title })),
    });
    onToast(editing ? "Post updated." : "Your idea is now on the timeline.");
    if (!editing) await forgetPostDraft();
    onClose();
  }
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) void closePostComposer(); }}
    >
      <form
        className={`post-composer-modal ${composerExpanded ? "composer-active" : ""} ${composerFullscreen ? "composer-fullscreen" : ""}`}
        onSubmit={submit}
      >
        <header>
          <div>
            <span className="eyebrow">
              {editing ? "EDIT YOUR POST" : "SHARE WITH THE NETWORK"}
            </span>
            <h2>{editing ? "Edit post" : "Share a post or idea"}</h2>
          </div>
          <button type="button" className="icon-button" onClick={() => void closePostComposer()}>
            <X size={19} />
          </button>
        </header>
        <div className="post-author">
          <Avatar person={currentMember} size="md" />
          <span>
            <strong>{currentMember.name}</strong>
            <small>Visible to the n2 network</small>
          </span>
        </div>
        {attachment && (
          <div className="attachment-preview">
            <button type="button" onClick={() => setAttachment(null)} aria-label="Remove attachment">
              <X size={14} />
            </button>
            {attachment.type === "image" ? (
              <img src={attachment.url} alt="Selected attachment" />
            ) : (
              <video src={attachment.url} controls />
            )}
            <small>{attachment.name}</small>
          </div>
        )}
        <div className="post-composer-dock">
          <div className="post-add-wrap">
            <button
              type="button"
              className={`post-circle-button post-add-button ${showTools ? "active" : ""}`}
              onClick={() => setShowTools((value) => !value)}
              aria-label="Add to post"
              aria-expanded={showTools}
            >
              <Plus size={20}/>
            </button>
            {showTools && (
              <div className="post-attachment-menu" aria-label="Post attachments">
                <EmojiPicker onSelect={(emoji) => { insertAtCursor(emoji); setShowTools(false); }}/>
                <label title="Add photo">
                  <ImageIcon size={18}/><span>Photo</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => { chooseFile(event.target.files?.[0]); setShowTools(false); }}/>
                </label>
                <label title="Add video">
                  <Video size={18}/><span>Video</span>
                  <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(event) => { chooseFile(event.target.files?.[0]); setShowTools(false); }}/>
                </label>
              </div>
            )}
          </div>
          <div className="post-composer-main">
            <textarea
              ref={bodyRef}
              rows={1}
              value={body}
              onFocus={() => setComposerExpanded(true)}
              onChange={(event) => updateBody(event.target.value)}
              placeholder="Share a post or idea… Use @ for people and # for projects"
              maxLength={1000}
              aria-label="Post text"
              aria-autocomplete="list"
            />
            {composerExpanded && (
              <button
                type="button"
                className="post-composer-expand-button"
                aria-label={composerFullscreen ? "Exit full screen editor" : "Open full screen editor"}
                aria-pressed={composerFullscreen}
                title={composerFullscreen ? "Exit full screen" : "Write in full screen"}
                onClick={() => {
                  setComposerFullscreen((value) => !value);
                  requestAnimationFrame(() => bodyRef.current?.focus());
                }}
              >
                {composerFullscreen ? <Minimize2 size={17}/> : <Maximize2 size={17}/>}
              </button>
            )}
          </div>
          <button
            className="post-circle-button post-submit-button"
            aria-label={editing ? "Save post changes" : "Publish post"}
            title={editing ? "Save changes" : "Post"}
            disabled={busy || !body.trim() || body.length > 1000}
          >
            <ArrowUpRight size={20} strokeWidth={1.8}/>
            <span className="visually-hidden">{busy ? editing ? "Saving…" : "Posting…" : editing ? "Save changes" : "Post"}</span>
          </button>
          <PostTagSuggestions
            value={body}
            inputRef={bodyRef}
            setValue={updateBody}
            ownProjects={ownProjects}
            linkedProjectIds={linked}
            onChooseProject={chooseProject}
          />
        </div>
        {(mentionedUsernames.length > 0 || selectedProjects.length > 0) && (
          <div className="post-selected-tags" aria-label="Tagged people and projects">
            {mentionedUsernames.map((username) => (
              <button type="button" className="person" key={username} onClick={() => removeMention(username)} aria-label={`Remove @${username}`}>
                @{username}<X size={11}/>
              </button>
            ))}
            {selectedProjects.map((project) => (
              <button type="button" className="project" key={project.id} onClick={() => removeProject(project)} aria-label={`Remove ${project.title}`}>
                #{projectTagSlug(project.title)}<X size={11}/>
              </button>
            ))}
          </div>
        )}
        {error && <p className="form-error">{error}</p>}
        <footer className="post-composer-meta">
          <span className="post-character-count" aria-label={`${body.length} of 1000 characters`}>
            <i className="post-character-ring" style={{ "--post-character-fill": `${Math.min(100, body.length / 10)}%` } as React.CSSProperties}/>
            <small>{body.length}/1000</small>
          </span>
          <DraftSaveIndicator status={draftStatus}/>
        </footer>
      </form>
    </div>
  );
}

function ContentDraftList({ kind, onResume, compact = false, emptyMessage, onCountChange }: { kind: "project" | "post"; onResume: (draft: ContentDraft) => void; compact?: boolean; emptyMessage?: string; onCountChange?: (count: number) => void }) {
  const [drafts, setDrafts] = useState<DraftSummary[]>([]), [expanded, setExpanded] = useState(false), [busyId, setBusyId] = useState(""), [deleteTarget, setDeleteTarget] = useState<DraftSummary | null>(null);
  const load = useCallback(() => {
    fetch(`/api/drafts?kind=${kind}`, { cache: "no-store" })
      .then(response => response.ok ? response.json() : { drafts: [] })
      .then(data => {
        const nextDrafts = (data.drafts ?? []) as DraftSummary[];
        setDrafts(nextDrafts);
        onCountChange?.(nextDrafts.length);
      })
      .catch(() => undefined);
  }, [kind, onCountChange]);
  useEffect(() => {
    load();
    const changed = (event: Event) => { if ((event as CustomEvent<{ kind?: string }>).detail?.kind === kind) load(); };
    window.addEventListener("n2:drafts-changed", changed);
    return () => window.removeEventListener("n2:drafts-changed", changed);
  }, [kind, load]);
  async function resume(id: string) {
    setBusyId(id);
    const response = await fetch(`/api/drafts/${id}`, { cache: "no-store" }), result = await response.json().catch(() => ({}));
    setBusyId("");
    if (response.ok && result.draft) onResume(result.draft);
  }
  async function remove(draft: DraftSummary) {
    setBusyId(draft.id);
    const response = await fetch(`/api/drafts/${draft.id}`, { method: "DELETE" });
    setBusyId("");
    if (response.ok) {
      setDrafts(rows => {
        const nextRows = rows.filter(row => row.id !== draft.id);
        onCountChange?.(nextRows.length);
        return nextRows;
      });
      window.dispatchEvent(new CustomEvent("n2:drafts-changed", { detail: { kind } }));
    }
  }
  if (!drafts.length) return emptyMessage ? <p className="profile-empty draft-library-empty">{emptyMessage}</p> : null;
  const visible = compact && !expanded ? drafts.slice(0, 3) : drafts;
  return (<>
    <section className={`content-draft-list ${compact ? "compact" : ""}`} aria-label={`${kind} drafts`}>
      <header><div><span className="eyebrow">DRAFTS</span><h3>{kind === "project" ? "Draft projects" : "Post drafts"}</h3></div><b>{drafts.length}</b></header>
      <div>
        {visible.map(draft => (
          <article key={draft.id}>
            <button className="draft-resume" onClick={() => void resume(draft.id)} disabled={busyId === draft.id}>
              <strong>{draft.title || (kind === "project" ? "Untitled project" : "Post draft")}</strong>
              <span>{draft.preview || "Continue where you left off"}</span>
              <small>{kind === "project" ? `${["Project details", "Roadmap", "Recruitment", "Review"][draft.step] ?? "Project details"} · ` : ""}Saved {new Date(draft.updatedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</small>
            </button>
            <button className="draft-delete" aria-label={`Delete ${draft.title || kind} draft`} onClick={() => setDeleteTarget(draft)} disabled={busyId === draft.id}><Trash2 size={15}/></button>
          </article>
        ))}
      </div>
      {compact && drafts.length > 3 && <button className="draft-expand" onClick={() => setExpanded(value => !value)}>{expanded ? "Show fewer drafts" : `View all ${drafts.length} drafts`}</button>}
    </section>
    {deleteTarget && <ActionDialog eyebrow="DELETE DRAFT" title={`Delete this ${kind} draft?`} description={kind === "project" ? "This permanently removes the private project draft and its generated plan." : "This permanently removes the saved post draft."} confirmLabel="Delete draft" cancelLabel="Keep draft" danger onClose={() => setDeleteTarget(null)} onConfirm={() => remove(deleteTarget)} />}
  </>);
}

function NetworkPulse({ onProjects }: { onProjects: () => void }) {
  const [slides, setSlides] = useState<PulseSlide[]>([]),
    [active, setActive] = useState(0),
    [paused, setPaused] = useState(false),
    [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1361px)");
    const sync = () => setEnabled(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetch("/api/network-pulse", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : { slides: [] }))
      .then((data) => setSlides(data.slides ?? []))
      .catch(() => undefined);
    return () => controller.abort();
  }, [enabled]);
  useEffect(() => {
    if (!enabled || paused || slides.length < 2) return;
    const timer = setInterval(
      () => setActive((index) => (index + 1) % slides.length),
      5500,
    );
    return () => clearInterval(timer);
  }, [enabled, paused, slides.length]);
  useEffect(() => {
    if (active >= slides.length) setActive(0);
  }, [active, slides.length]);
  const slide = slides[active] ?? {
    id: "empty",
    kind: "connections",
    label: "NETWORK ACTIVITY",
    value: "—",
    title: "Live network activity will appear here.",
    detail: "No recent activity to show yet",
    progress: 0,
  };
  function move(direction: number) {
    setActive((index) => (index + direction + slides.length) % slides.length);
  }
  if (!enabled) return null;
  return (
    <section
      className="rail-card pulse-card"
      aria-roledescription="carousel"
      aria-label="Network pulse"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="pulse-head">
        <span>NETWORK PULSE</span>
        <i>LIVE</i>
      </div>
      <div className="pulse-viewport">
        <div
          className="pulse-track"
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {(slides.length ? slides : [slide]).map((item) => (
            <article key={item.id} aria-hidden={item.id !== slide.id}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <button
                disabled={!item.projectId}
                onClick={item.projectId ? onProjects : undefined}
              >
                {item.title}
              </button>
              <small>{item.detail}</small>
              <div className="pulse-bar">
                <span style={{ width: `${Math.max(4, item.progress)}%` }} />
              </div>
            </article>
          ))}
        </div>
      </div>
      <footer>
        <div className="pulse-dots">
          {slides.slice(0, 12).map((item, index) => (
            <button
              key={item.id}
              aria-label={`Show ${item.label}`}
              className={index === active ? "active" : ""}
              onClick={() => setActive(index)}
            />
          ))}
        </div>
        <div className="pulse-controls">
          <button
            aria-label="Previous pulse"
            disabled={slides.length < 2}
            onClick={() => move(-1)}
          >
            <ChevronLeft size={14} />
          </button>
          <span>
            {slides.length ? `${active + 1}/${slides.length}` : "0/0"}
          </span>
          <button
            aria-label="Next pulse"
            disabled={slides.length < 2}
            onClick={() => move(1)}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </footer>
    </section>
  );
}

function FeedFilters({
  value,
  industries,
  onClose,
  onApply,
}: {
  value: FeedFilterState;
  industries: string[];
  onClose: () => void;
  onApply: (filters: FeedFilterState) => void;
}) {
  const [draft, setDraft] = useState(value);
  const active = Object.values(draft).filter(Boolean).length;
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="feed-filter-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Filter projects"
      >
        <header>
          <div>
            <span className="eyebrow">REFINE YOUR TIMELINE</span>
            <h2>Filter projects</h2>
            <p>
              Posts stay in place; these choices refine the project
              recommendations around them.
            </p>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X size={19} />
          </button>
        </header>
        <div className="feed-filter-fields">
          <label>
            Industry
            <N2Select value={draft.industry} onValueChange={(industry) => setDraft({ ...draft, industry })} ariaLabel="Industry" options={[{value:"",label:"All industries"},...industries.map(industry=>({value:industry,label:industry}))]}/>
          </label>
          <label>
            Stage
            <N2Select value={draft.stage} onValueChange={(stage) => setDraft({ ...draft, stage })} ariaLabel="Stage" options={[{value:"",label:"Any stage"},{value:"idea",label:"Idea"},{value:"planning",label:"Planning"},{value:"building",label:"Building"},{value:"launching",label:"Launching"}]}/>
          </label>
          <label>
            Working style
            <N2Select value={draft.workMode} onValueChange={(workMode) => setDraft({ ...draft, workMode })} ariaLabel="Working style" options={[{value:"",label:"Any working style"},{value:"remote",label:"Remote"},{value:"hybrid",label:"Hybrid"},{value:"in_person",label:"In person"}]}/>
          </label>
          <label>
            Location
            <input
              value={draft.location}
              onChange={(event) =>
                setDraft({ ...draft, location: event.target.value })
              }
              placeholder="City or country"
            />
          </label>
        </div>
        <footer>
          <button
            className="secondary-button"
            onClick={() =>
              setDraft({ industry: "", stage: "", workMode: "", location: "" })
            }
          >
            Clear all
          </button>
          <button className="primary-button" onClick={() => onApply(draft)}>
            Show projects
            {active
              ? ` · ${active} ${active === 1 ? "filter" : "filters"}`
              : ""}
          </button>
        </footer>
      </section>
    </div>
  );
}

function NotificationUnreadIndicator({ unread }: { unread: number }) {
  return (
    <span className="notification-unread-indicator" aria-hidden="true">
      <b className="notification-count">{unread > 9 ? "9+" : unread}</b>
      <Bell className="notification-count-bell" size={18} />
    </span>
  );
}

function MessageUnreadIndicator({ unread }: { unread: number }) {
  return (
    <span className="notification-unread-indicator message-unread-indicator" aria-hidden="true">
      <b className="notification-count">{unread > 9 ? "9+" : unread}</b>
      <MessageCircle className="notification-count-bell" size={18} />
    </span>
  );
}

function Feed({
  onCreate,
  onDiscover,
  onShareIdea,
  onMatch,
  onComments,
  onPostThread,
  onProfile,
  onProject,
  onShare,
  onToast,
  currentMember,
  newPost,
  newProject,
  authenticated,
  onRequireAuth,
}: {
  onCreate: () => void;
  onDiscover: () => void;
  onShareIdea: () => void;
  onMatch: () => void;
  onComments: (project: ProjectRecord) => void;
  onPostThread: (post: TimelinePost) => void;
  onProfile: (userId: string) => void;
  onProject: () => void;
  onShare: (project: {
    id: string;
    title: string;
    summary: string;
    kind?: "project" | "post";
  }) => void;
  onToast: (message: string) => void;
  currentMember: MemberPerson;
  newPost: TimelinePost | null;
  newProject: ProjectRecord | null;
  authenticated: boolean;
  onRequireAuth: () => void;
}) {
  const [filter, setFilter] = useState("For you");
  const [clock, setClock] = useState<Date | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false),
    [projectFilters, setProjectFilters] = useState<FeedFilterState>({
      industry: "",
      stage: "",
      workMode: "",
      location: "",
    });
  const [notices, setNotices] = useState<
    Array<{
      id: string;
      title: string;
      body: string;
      authorName: string | null;
    }>
  >([]);
  const [liveProjects, setLiveProjects] = useState<ProjectRecord[]>([]);
  const [posts, setPosts] = useState<TimelinePost[]>([]);
  const [newJoiners, setNewJoiners] = useState<
    Array<{
      id: string;
      memberId: string;
      name: string | null;
      image: string | null;
      profession: string | null;
      activityType: "network_join" | "project_join";
      projectId: string | null;
      projectTitle: string | null;
      roleTitle: string | null;
      createdAt: string;
    }>
  >([]);
  const [worthMeeting, setWorthMeeting] = useState<PeopleSuggestionRecord | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null),
    [loadingMore, setLoadingMore] = useState(false),
    [algorithmMode, setAlgorithmMode] = useState("shadow"),
    [noticesLoading, setNoticesLoading] = useState(true),
    [postsLoading, setPostsLoading] = useState(true),
    [projectsLoading, setProjectsLoading] = useState(true),
    [joinersLoading, setJoinersLoading] = useState(false),
    [worthMeetingLoading, setWorthMeetingLoading] = useState(false);
  useEffect(() => {
    const sync = () => setClock(new Date());
    sync();
    const timer = window.setInterval(sync, 60_000);
    window.addEventListener("focus", sync);
    const visible = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);
  useEffect(() => {
    let active = true;
    fetch("/api/notices")
      .then((r) => (r.ok ? r.json() : { notices: [] }))
      .then((data) => active && setNotices(data.notices ?? []))
      .catch(() => undefined)
      .finally(() => active && setNoticesLoading(false));
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const scope =
      filter === "Following"
        ? "following"
        : filter === "Newest"
          ? "newest"
          : "for_you";
    setPostsLoading(true);
    fetch(`/api/posts?scope=${scope}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { posts: [] }))
      .then((data) => active && setPosts(data.posts ?? []))
      .catch(() => undefined)
      .finally(() => active && setPostsLoading(false));
    return () => { active = false; controller.abort(); };
  }, [filter, authenticated]);
  useEffect(() => {
    if (!authenticated || filter !== "Newest") {
      setNewJoiners([]);
      setJoinersLoading(false);
      return;
    }
    const controller = new AbortController();
    let active = true;
    setJoinersLoading(true);
    fetch("/api/feed/new-joiners", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { joiners: [] }))
      .then((data) => active && setNewJoiners(data.joiners ?? []))
      .catch(() => undefined)
      .finally(() => active && setJoinersLoading(false));
    return () => { active = false; controller.abort(); };
  }, [authenticated, filter]);
  useEffect(() => {
    if (!authenticated || filter !== "Following") {
      setWorthMeeting(null);
      setWorthMeetingLoading(false);
      return;
    }
    const controller = new AbortController();
    let active = true;
    setWorthMeetingLoading(true);
    fetch("/api/people/worth-meeting", { signal: controller.signal, cache: "no-store" })
      .then((response) => response.ok ? response.json() : { worthMeeting: null })
      .then((data) => active && setWorthMeeting(data.worthMeeting ?? null))
      .catch((error) => {
        if (active && !(error instanceof DOMException && error.name === "AbortError")) setWorthMeeting(null);
      })
      .finally(() => active && setWorthMeetingLoading(false));
    return () => { active = false; controller.abort(); };
  }, [authenticated, filter]);
  useEffect(() => {
    if (newPost)
      setPosts((rows) => [
        newPost,
        ...rows.filter((row) => row.id !== newPost.id),
      ]);
  }, [newPost]);
  useEffect(() => {
    if (newProject && filter === "Newest")
      setLiveProjects((rows) => [
        newProject,
        ...rows.filter((row) => row.id !== newProject.id),
      ]);
  }, [filter, newProject]);
  useEffect(() => {
    const sync = (event: Event) => {
      const next = (event as CustomEvent<TimelinePost>).detail;
      setPosts((rows) => rows.map((row) => (row.id === next.id ? next : row)));
    };
    window.addEventListener("n2:post-updated", sync);
    return () => window.removeEventListener("n2:post-updated", sync);
  }, []);
  const projectQuery = useCallback((cursor?: string) => {
    const params = new URLSearchParams({
      scope: "discover",
      filter: filter.toLowerCase().replaceAll(" ", "_"),
    });
    if (projectFilters.industry)
      params.set("industry", projectFilters.industry);
    if (projectFilters.stage) params.set("stage", projectFilters.stage);
    if (projectFilters.workMode)
      params.set("workMode", projectFilters.workMode);
    if (projectFilters.location)
      params.set("location", projectFilters.location);
    if (cursor) params.set("cursor", cursor);
    return `/api/projects?${params}`;
  }, [filter, projectFilters]);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setProjectsLoading(true);
    fetch(projectQuery(), { signal: controller.signal, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { projects: [] }))
      .then((data) => {
        if (!active) return;
        const projects = (data.projects ?? []) as ProjectRecord[];
        setLiveProjects(newProject && filter === "Newest"
          ? [newProject, ...projects.filter((project) => project.id !== newProject.id)]
          : projects);
        setNextCursor(data.nextCursor ?? null);
        setAlgorithmMode(data.algorithmMode ?? "shadow");
      })
      .catch(() => undefined)
      .finally(() => active && setProjectsLoading(false));
    return () => { active = false; controller.abort(); };
  }, [authenticated, newProject, projectQuery]);
  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    const response = await fetch(projectQuery(nextCursor));
    const data = await response.json();
    if (response.ok) {
      setLiveProjects((rows) => [...rows, ...(data.projects ?? [])]);
      setNextCursor(data.nextCursor ?? null);
    }
    setLoadingMore(false);
  }
  const filterCount = Object.values(projectFilters).filter(Boolean).length;
  const mixedFeed: Array<
    | { kind: "post"; item: TimelinePost }
    | { kind: "project"; item: ProjectRecord }
  > = [];
  const mixedFeedLength = Math.max(posts.length, liveProjects.length);
  for (let index = 0; index < mixedFeedLength; index += 1) {
    if (posts[index]) mixedFeed.push({ kind: "post", item: posts[index] });
    if (liveProjects[index])
      mixedFeed.push({ kind: "project", item: liveProjects[index] });
  }
  const timelineFeed =
    filter === "Newest"
      ? mergeNewestTimeline({
          members: newJoiners,
          posts,
          projects: liveProjects,
        })
      : mixedFeed;
  const contentLoading = noticesLoading || postsLoading || projectsLoading || joinersLoading || worthMeetingLoading;
  return (
    <>
      <div className="mobile-topbar">
        <Logo />
        {!authenticated && (
          <div className="public-mobile-actions">
            <Link className="public-mobile-signin" href="/signin?mode=register">
              Join n2
            </Link>
          </div>
        )}
      </div>
      <header className="feed-intro">
        <div>
          <span className="eyebrow">
            {clock
              ? new Intl.DateTimeFormat(undefined, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })
                  .format(clock)
                  .toUpperCase()
              : "YOUR NETWORK"}
          </span>
          <h1>
            {authenticated
              ? `${clock ? localGreeting(clock) : "Hello"}, ${currentMember.name.split(" ")[0]}.`
              : "See what the community is creating."}
          </h1>
          <p>
            {authenticated
              ? "Explore projects, share encouragement and find new ways to take part today."
              : "Explore ideas, meet people and join collaborations growing across n2."}
          </p>
        </div>
        <button
          className="primary-button feed-create-project"
          onClick={authenticated ? onCreate : onRequireAuth}
        >
          <Plus size={18} /> Start a project
        </button>
        <button
          className="primary-button feed-mobile-discovery"
          onClick={authenticated ? onDiscover : onRequireAuth}
          aria-label="Search n2 members and see people to know"
        >
          <Search size={20} />
        </button>
      </header>
      <section className="composer">
        <Avatar
          person={
            authenticated
              ? currentMember
              : { name: "nice 2 network", role: "Public network" }
          }
          size="md"
        />
        <button onClick={authenticated ? onShareIdea : onRequireAuth}>
          {authenticated
            ? "Share a post or idea…"
            : "Join n2 to share a post or idea…"}
        </button>
        <span>
          <Lightbulb size={18} />
        </span>
      </section>
      <div className="feed-filter">
        {["For you", "Following", "Newest"].map((item) => (
          <button
            key={item}
            className={filter === item ? "active" : ""}
            onClick={() => {
              if (!authenticated) {
                onRequireAuth();
                return;
              }
              if (item !== filter) {
                setPostsLoading(true);
                setProjectsLoading(true);
                setJoinersLoading(item === "Newest");
                setWorthMeetingLoading(item === "Following");
                setFilter(item);
              }
            }}
          >
            {item}
          </button>
        ))}
        <button
          className={`filter-control ${filterCount ? "active" : ""}`}
          onClick={() =>
            authenticated ? setFiltersOpen(true) : onRequireAuth()
          }
        >
          <SlidersHorizontal size={14} /> {authenticated ? "Filters" : "Join to filter"}
          {filterCount > 0 && <b>{filterCount}</b>}
        </button>
      </div>
      {!authenticated && (
        <div className="public-feed-note">
          <span>PUBLIC PREVIEW</span>
          <p>Join n2 to personalise these views.</p>
        </div>
      )}
      {contentLoading && (
        <LoadingState label="Loading your network feed" count={2} />
      )}
      {!contentLoading && notices.map((notice) => (
        <article className="official-notice" key={notice.id}>
          <span className="official-badge">
            <b>n2</b> OFFICIAL NOTICE
          </span>
          <h2>{notice.title}</h2>
          <p>{notice.body}</p>
          <small>
            {notice.authorName ?? "n2 team"} <N2AdminBadge />
          </small>
        </article>
      ))}
      {!contentLoading && authenticated && filter === "Following" && (
        <div className="feed-context">
          <UsersRound size={16} />
          <span>
            Projects from people you know, with open roles that fit your
            network.
          </span>
        </div>
      )}
      {!contentLoading && authenticated && filter === "Newest" && (
        <div className="feed-context">
          <Clock3 size={16} />
          <span>
            New projects, posts and members—mixed together and ordered newest
            first.
          </span>
        </div>
      )}
      {!contentLoading && authenticated && filter === "For you" && algorithmMode === "shadow" && (
        <div className="feed-context">
          <N2Mark />
          <span>
            n2 is validating team recommendations in shadow mode. Your feed
            stays stable while quality is measured.
          </span>
        </div>
      )}
      {!contentLoading && timelineFeed.map((entry) => {
        if (entry.kind === "member") {
          const person = entry.item;
          const joinedProject = person.activityType === "project_join" && person.projectTitle;
          return (
            <button
              className="new-joiner-card"
              key={`member-${person.id}`}
              onClick={() => onProfile(person.memberId)}
            >
              <Avatar
                person={{
                  name: person.name ?? "n2 member",
                  role: person.roleTitle ?? person.profession ?? "New member",
                  img: person.image,
                }}
                size="md"
              />
              <span>
                <strong>
                  {person.name ?? "New n2 member"}
                  {joinedProject ? <> joined <span className="project-join-name">{person.projectTitle}</span></> : " joined n2"}
                </strong>
                <small>
                  {joinedProject
                    ? `Joining as ${person.roleTitle ?? "Project contributor"} · ${person.profession ?? "n2 member"}`
                    : person.profession ?? "Completing their profile"} · {" "}
                  {new Date(person.createdAt).toLocaleDateString()}
                </small>
              </span>
              <ArrowUpRight size={16} />
            </button>
          );
        }
        if (entry.kind === "post") {
          const post = entry.item;
          return (
            <TimelinePostCard
              key={`post-${post.id}`}
              post={post}
              currentMember={currentMember}
              onProfile={onProfile}
              onProject={authenticated ? onProject : onRequireAuth}
              onThread={() =>
                authenticated ? onPostThread(post) : onRequireAuth()
              }
              onEngage={onRequireAuth}
              canEngage={authenticated}
              onShare={onShare}
              onToast={onToast}
              onChanged={(next) =>
                setPosts((rows) =>
                  next
                    ? rows.map((row) => (row.id === next.id ? next : row))
                    : rows.filter((row) => row.id !== post.id),
                )
              }
            />
          );
        }
        const project = entry.item;
        return (
          <ProjectCard
            key={`project-${project.id}`}
            project={project}
            onShare={onShare}
            onMatch={authenticated ? onMatch : onRequireAuth}
            onComments={onComments}
            onProfile={onProfile}
            onToast={onToast}
            authenticated={authenticated}
            onRequireAuth={onRequireAuth}
            onChanged={(next) =>
              setLiveProjects((rows) =>
                next
                  ? rows.map((row) => (row.id === next.id ? next : row))
                  : rows.filter((row) => row.id !== project.id),
              )
            }
          />
        );
      })}
      {!contentLoading && !liveProjects.length && (
        <ProjectCard
          onShare={onShare}
          onMatch={authenticated ? onMatch : onRequireAuth}
          authenticated={authenticated}
          onRequireAuth={onRequireAuth}
        />
      )}
      {!contentLoading && nextCursor && (
        <button
          className="feed-load-more"
          disabled={loadingMore}
          onClick={loadMore}
        >
          {loadingMore ? "Loading more community projects…" : "Load more projects"}
        </button>
      )}
      {!contentLoading && !liveProjects.length && (
        <ProjectCard
          second
          onShare={onShare}
          onMatch={authenticated ? onMatch : onRequireAuth}
          authenticated={authenticated}
          onRequireAuth={onRequireAuth}
        />
      )}
      {!contentLoading && authenticated && filter === "Following" && worthMeeting && (
        <article className="connection-card">
          <div className="connection-copy">
            <span className="eyebrow">WORTH MEETING</span>
            <h3>{worthMeeting.headline}</h3>
            <p>{worthMeeting.description}</p>
            <button onClick={() => onProfile(worthMeeting.id)}>
              View {worthMeeting.name?.split(" ")[0] ?? "their"} profile <ArrowUpRight size={16} />
            </button>
          </div>
          <Avatar person={{ name: worthMeeting.name ?? "n2 member", role: worthMeeting.profession ?? "Member", img: worthMeeting.image }} size="xl" ring />
        </article>
      )}
      {!contentLoading && <div className="end-note">
        <span>n2</span>
        <p>You’re all caught up for now.</p>
      </div>}
      {filtersOpen && (
        <FeedFilters
          value={projectFilters}
          industries={[
            ...new Set(liveProjects.map((project) => project.industry)),
          ].sort()}
          onClose={() => setFiltersOpen(false)}
          onApply={(next) => {
            setProjectFilters(next);
            setFiltersOpen(false);
          }}
        />
      )}
    </>
  );
}

function RoadmapPanel({
  project,
  setProject,
  onToast,
}: {
  project: ProjectDetailRecord;
  setProject: (project: ProjectDetailRecord) => void;
  onToast: (message: string) => void;
}) {
  type Milestone = ProjectDetailRecord["milestones"][number];
  const [editor, setEditor] = useState<{
    mode: "add" | "edit" | "block" | "complete" | "remove";
    item?: Milestone;
  } | null>(null);
  async function refresh() {
    const response = await fetch(`/api/projects/${project.id}`),
      data = await response.json();
    if (response.ok) setProject(data.project);
  }
  async function quick(
    item: Milestone,
    action: "start" | "reopen" | "move_up" | "move_down",
  ) {
    const response = await fetch(`/api/milestones/${item.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      }),
      data = await response.json();
    if (!response.ok) {
      onToast(data.error ?? "Could not update this roadmap step.");
      return;
    }
    onToast("Roadmap updated.");
    await refresh();
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) return;
    const form = new FormData(event.currentTarget);
    if (editor.mode === "add") {
      const response = await fetch(`/api/projects/${project.id}/milestones`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: form.get("title"),
            description: form.get("description"),
            phase: form.get("phase"),
            dueAt: form.get("dueAt") || null,
          }),
        }),
        data = await response.json();
      if (!response.ok) {
        onToast(data.error ?? "Could not add the roadmap step.");
        return;
      }
    } else if (editor.mode === "remove" && editor.item) {
      const response = await fetch(`/api/milestones/${editor.item.id}`, {
          method: "DELETE",
        }),
        data = await response.json();
      if (!response.ok) {
        onToast(data.error ?? "Could not remove this step.");
        return;
      }
    } else if (editor.item) {
      let payload: Record<string, unknown> = { action: editor.mode };
      if (editor.mode === "edit")
        payload = {
          ...payload,
          title: form.get("title"),
          description: form.get("description"),
          dueAt: form.get("dueAt") || null,
        };
      if (editor.mode === "block") payload.summary = form.get("summary");
      if (editor.mode === "complete") {
        payload.summary = form.get("summary");
        const stage = String(form.get("projectStage") ?? "");
        if (stage) payload.projectStage = stage;
      }
      const response = await fetch(`/api/milestones/${editor.item.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        }),
        data = await response.json();
      if (!response.ok) {
        onToast(data.error ?? "Could not update this roadmap step.");
        return;
      }
    }
    setEditor(null);
    onToast(
      editor.mode === "complete"
        ? "Step completed and the next step is now active."
        : "Roadmap updated.",
    );
    await refresh();
  }
  return (
    <>
      <section className="project-roadmap">
        <header className="project-section-actions">
          <div>
            <span className="eyebrow">PROJECT ROADMAP</span>
            <p>
              Completed steps include the owner’s summary and linked team
              contributions.
            </p>
          </div>
          {project.isOwner && (
            <button
              className="secondary-button"
              onClick={() => setEditor({ mode: "add" })}
            >
              <Plus size={14} /> Add step
            </button>
          )}
        </header>
        {project.milestones.map((item, index) => {
          const linked = project.updates.filter(
            (update) => update.milestoneId === item.id,
          );
          return (
            <article
              key={item.id}
              className={item.status === "complete" ? "complete" : item.status}
            >
              <b>{index + 1}</b>
              <div>
                <span>
                  {item.status.replace("_", " ")} · {item.phase}
                </span>
                <h3>{item.title}</h3>
                {item.description && <p>{item.description}</p>}
                {item.completionSummary && (
                  <blockquote>
                    <strong>Step summary</strong>
                    {item.completionSummary}
                  </blockquote>
                )}
                <small>
                  {item.completedAt
                    ? `Completed ${new Date(item.completedAt).toLocaleDateString()}`
                    : item.dueAt
                      ? `Due ${new Date(item.dueAt).toLocaleDateString()}`
                      : "Date to be agreed"}
                </small>
                {linked.length > 0 && (
                  <div className="roadmap-contributions">
                    <strong>
                      {linked.length} contribution
                      {linked.length === 1 ? "" : "s"}
                    </strong>
                    {linked.slice(0, 3).map((update) => (
                      <p key={update.id}>
                        {update.authorName}: {update.body}
                      </p>
                    ))}
                  </div>
                )}
                {project.isOwner && (
                  <div className="roadmap-actions">
                    <button onClick={() => setEditor({ mode: "edit", item })}>
                      Edit
                    </button>
                    <button
                      disabled={index === 0}
                      onClick={() => quick(item, "move_up")}
                    >
                      ↑
                    </button>
                    <button
                      disabled={index === project.milestones.length - 1}
                      onClick={() => quick(item, "move_down")}
                    >
                      ↓
                    </button>
                    {item.status === "planned" && (
                      <button onClick={() => quick(item, "start")}>
                        Start
                      </button>
                    )}
                    {item.status === "in_progress" && (
                      <>
                        <button
                          onClick={() => setEditor({ mode: "block", item })}
                        >
                          Block
                        </button>
                        <button
                          onClick={() => setEditor({ mode: "complete", item })}
                        >
                          Complete step
                        </button>
                      </>
                    )}
                    {item.status === "blocked" && (
                      <button
                        onClick={() => setEditor({ mode: "complete", item })}
                      >
                        Resolve & complete
                      </button>
                    )}
                    {item.status === "complete" && (
                      <button onClick={() => quick(item, "reopen")}>
                        Reopen
                      </button>
                    )}
                    {item.status === "planned" && (
                      <button
                        className="danger"
                        onClick={() => setEditor({ mode: "remove", item })}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
        {!project.milestones.length && (
          <p className="profile-empty">
            The project roadmap has not been published yet.
          </p>
        )}
      </section>
      {editor && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setEditor(null)
          }
        >
          <form
            className="n2-editor-modal roadmap-editor-modal"
            onSubmit={submit}
          >
            <header>
              <div>
                <span className="eyebrow">PROJECT ROADMAP</span>
                <h2>
                  {editor.mode === "add"
                    ? "Add roadmap step"
                    : editor.mode === "edit"
                      ? "Edit roadmap step"
                      : editor.mode === "block"
                        ? "Mark step as blocked"
                        : editor.mode === "complete"
                          ? "Complete roadmap step"
                          : "Remove roadmap step"}
                </h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setEditor(null)}
              >
                <X size={19} />
              </button>
            </header>
            {(editor.mode === "add" || editor.mode === "edit") && (
              <div className="n2-editor-fields">
                <label>
                  Step title
                  <input
                    name="title"
                    defaultValue={editor.item?.title ?? ""}
                    minLength={3}
                    autoFocus
                    required
                  />
                </label>
                <label>
                  Description
                  <textarea
                    name="description"
                    defaultValue={editor.item?.description ?? ""}
                    placeholder="What should this step achieve?"
                  />
                </label>
                <div className="field-row">
                  {editor.mode === "add" && (
                    <label>
                      Phase
                      <N2Select name="phase" defaultValue="later" ariaLabel="Phase" options={[{value:"now",label:"Now"},{value:"next",label:"Next"},{value:"later",label:"Later"}]}/>
                    </label>
                  )}
                  <label>
                    Due date
                    <input
                      name="dueAt"
                      type="date"
                      defaultValue={editor.item?.dueAt?.slice(0, 10) ?? ""}
                    />
                  </label>
                </div>
              </div>
            )}
            {editor.mode === "block" && (
              <div className="n2-editor-fields">
                <p>
                  Explain the obstacle so contributors understand what is needed
                  next.
                </p>
                <label>
                  Blocker summary
                  <textarea name="summary" minLength={5} autoFocus required />
                </label>
              </div>
            )}
            {editor.mode === "complete" && (
              <div className="n2-editor-fields">
                <label>
                  Completion summary
                  <textarea
                    name="summary"
                    placeholder="What was completed and who contributed?"
                    minLength={5}
                    autoFocus
                    required
                  />
                </label>
                <label>
                  Headline project stage
                  <N2Select name="projectStage" defaultValue="" ariaLabel="Headline project stage" options={[{value:"",label:`Keep ${project.stage}`},{value:"idea",label:"Idea"},{value:"planning",label:"Planning"},{value:"building",label:"Building"},{value:"launching",label:"Launching"}]}/>
                </label>
              </div>
            )}
            {editor.mode === "remove" && (
              <p className="n2-confirm-copy">
                Remove “{editor.item?.title}” from this roadmap? This cannot be
                undone.
              </p>
            )}
            <footer>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setEditor(null)}
              >
                Cancel
              </button>
              <button
                className={`primary-button ${editor.mode === "remove" ? "danger" : ""}`}
              >
                {editor.mode === "add"
                  ? "Add step"
                  : editor.mode === "edit"
                    ? "Save changes"
                    : editor.mode === "block"
                      ? "Mark blocked"
                      : editor.mode === "complete"
                        ? "Complete step"
                        : "Remove step"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </>
  );
}

function UpdatesPanel({
  project,
  setProject,
  onToast,
}: {
  project: ProjectDetailRecord;
  setProject: (project: ProjectDetailRecord) => void;
  onToast: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false),
    [attachment, setAttachment] = useState<{
      type: "image" | "video" | "file";
      url: string;
      name: string;
    } | null>(null),
    [editTarget, setEditTarget] = useState<ProjectDetailRecord["updates"][number] | null>(null),
    [deleteTarget, setDeleteTarget] = useState<ProjectDetailRecord["updates"][number] | null>(null);
  async function refresh() {
    const response = await fetch(`/api/projects/${project.id}`),
      data = await response.json();
    if (response.ok) setProject(data.project);
  }
  function choose(file?: File) {
    if (!file) return;
    if (file.size > 2_500_000) {
      onToast("Attachments must be under 2.5 MB.");
      return;
    }
    const type = file.type.startsWith("image/")
      ? "image"
      : file.type.startsWith("video/")
        ? "video"
        : "file";
    const reader = new FileReader();
    reader.onload = () =>
      setAttachment({ type, url: String(reader.result), name: file.name });
    reader.readAsDataURL(file);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget),
      response = await fetch(`/api/projects/${project.id}/updates`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          body: form.get("body"),
          type: form.get("type"),
          milestoneId: form.get("milestoneId") || null,
          attachment,
        }),
      }),
      data = await response.json();
    setBusy(false);
    if (!response.ok) {
      onToast(data.error ?? "Could not publish this update.");
      return;
    }
    (event.currentTarget as HTMLFormElement).reset();
    setAttachment(null);
    onToast("Project update published.");
    await refresh();
  }
  async function saveEdit({ body }: Record<string, string>) {
    if (!editTarget) return false;
    const response = await fetch(`/api/project-updates/${editTarget.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          body,
          type: editTarget.type,
          milestoneId: editTarget.milestoneId,
        }),
      }),
      data = await response.json();
    if (!response.ok) {
      onToast(data.error ?? "Could not edit this update.");
      return false;
    }
    await refresh();
    return true;
  }
  async function remove() {
    if (!deleteTarget) return false;
    const response = await fetch(`/api/project-updates/${deleteTarget.id}`, {
        method: "DELETE",
      }),
      data = await response.json();
    if (!response.ok) {
      onToast(data.error ?? "Could not remove this update.");
      return false;
    }
    await refresh();
    return true;
  }
  return (
    <section className="project-updates-panel">
      {project.isMember && (
        <form className="project-update-composer" onSubmit={submit}>
          <header>
            <div>
              <span className="eyebrow">CONTRIBUTE AN UPDATE</span>
              <h3>Show how the project is moving.</h3>
            </div>
          </header>
          <div className="field-row">
            <label>
              Update type
              <N2Select name="type" defaultValue="progress" ariaLabel="Update type" options={[{value:"progress",label:"Progress"},{value:"decision",label:"Decision"},{value:"risk",label:"Risk"},{value:"win",label:"Win"},{value:"update",label:"General update"}]}/>
            </label>
            <label>
              Roadmap step
              <N2Select
                name="milestoneId"
                defaultValue={
                  project.milestones.find(
                    (item) => item.status === "in_progress",
                  )?.id ?? ""
                }
                ariaLabel="Roadmap step"
                options={[{value:"",label:"Project-wide update"},...project.milestones.map(item=>({value:item.id,label:item.title}))]}
              />
            </label>
          </div>
          <textarea
            name="body"
            required
            minLength={2}
            maxLength={3000}
            placeholder="What changed, what did you contribute, and what happens next?"
          />
          <footer>
            <label>
              <Paperclip size={15} />
              {attachment ? attachment.name : "Add image, video or file"}
              <input
                type="file"
                onChange={(event) => choose(event.target.files?.[0])}
              />
            </label>
            {attachment && (
              <button type="button" onClick={() => setAttachment(null)}>
                Remove attachment
              </button>
            )}
            <button className="primary-button" disabled={busy}>
              {busy ? "Publishing…" : "Publish update"}
            </button>
          </footer>
        </form>
      )}
      <div className="project-update-list">
        {project.updates.map((update) => (
          <article key={update.id}>
            <Avatar
              person={{
                name: update.authorName ?? "n2 member",
                role: "",
                img: update.authorImage,
              }}
              size="sm"
            />
            <div>
              <header>
                <strong>{update.authorName}</strong>
                <small>
                  {update.type} · {new Date(update.createdAt).toLocaleString()}
                  {new Date(update.updatedAt).getTime() >
                  new Date(update.createdAt).getTime() + 1000
                    ? " · edited"
                    : ""}
                </small>
              </header>
              <p><LinkifiedText text={update.body} /></p>
              {update.attachmentType === "image" && update.attachmentUrl && (
                <img
                  src={update.attachmentUrl}
                  alt={update.attachmentName ?? "Update attachment"}
                  loading="lazy"
                  decoding="async"
                />
              )}{" "}
              {update.attachmentType === "video" && update.attachmentUrl && (
                <video src={update.attachmentUrl} controls />
              )}
              {update.attachmentType === "file" && update.attachmentUrl && (
                <a
                  href={update.attachmentUrl}
                  download={update.attachmentName ?? "attachment"}
                >
                  <Paperclip size={14} />
                  {update.attachmentName}
                </a>
              )}
              {(update.authorId === project.currentUserId ||
                project.isOwner) && (
                <footer>
                  <button onClick={() => setEditTarget(update)}>Edit</button>
                  <button onClick={() => setDeleteTarget(update)}>Delete</button>
                </footer>
              )}
            </div>
          </article>
        ))}
        {!project.updates.length && (
          <p className="profile-empty">No project updates yet.</p>
        )}
      </div>
      {editTarget && (
        <ActionDialog eyebrow="EDIT UPDATE" title="Refine this project update." confirmLabel="Save changes" fields={[{ name: "body", label: "Update", defaultValue: editTarget.body, required: true, maxLength: 3000 }]} onClose={() => setEditTarget(null)} onConfirm={saveEdit} />
      )}
      {deleteTarget && (
        <ActionDialog eyebrow="DELETE UPDATE" title="Remove this project update?" description="It will no longer appear in the project history." confirmLabel="Delete update" cancelLabel="Keep update" danger onClose={() => setDeleteTarget(null)} onConfirm={remove} />
      )}
    </section>
  );
}

type RoleFitResult = {
  role: ProjectRoleRecord;
  fit: {
    match: boolean;
    profession: string | null;
    professionMatch: boolean;
    skills: string[];
    requiredMatches: string[];
    usefulMatches: string[];
    warning: string | null;
  };
  alreadyMember: boolean;
  existingStatus: string | null;
};
function ContributionDialog({
  target,
  onClose,
  onToast,
}: {
  target: ContributionTarget;
  onClose: () => void;
  onToast: (message: string) => void;
}) {
  const openRoles = target.roles.filter(
      (role) => role.status === "open" && role.filled < role.capacity,
    ),
    initial =
      openRoles.find((role) => role.id === target.initialRoleId) ?? null;
  const [role, setRole] = useState<ProjectRoleRecord | null>(initial),
    [generic, setGeneric] = useState(openRoles.length === 0),
    [fit, setFit] = useState<RoleFitResult | null>(null),
    [loading, setLoading] = useState(Boolean(initial)),
    [busy, setBusy] = useState(false),
    [acknowledged, setAcknowledged] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (!role) {
      setFit(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError("");
    fetch(`/api/projects/${target.projectId}/apply?roleId=${role.id}`)
      .then(async (response) => {
        const data = await response.json();
        if (!active) return;
        if (response.ok) setFit(data);
        else setError(data.error ?? "This role is no longer available.");
      })
      .catch(
        () =>
          active &&
          setError("We could not check your profile against this role."),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [role, target.projectId]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    if (generic) {
      const response = await fetch(
          `/api/projects/${target.projectId}/involvement`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              message: String(form.get("message") ?? ""),
              services: String(form.get("services") ?? "")
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean),
            }),
          },
        ),
        data = await response.json();
      setBusy(false);
      if (!response.ok) {
        setError(data.error ?? "Could not send your offer.");
        return;
      }
      onToast(
        data.message ??
          "Your contribution offer was sent to the project owner.",
      );
      onClose();
      return;
    }
    if (!role) {
      setBusy(false);
      return;
    }
    const response = await fetch(`/api/projects/${target.projectId}/apply`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          roleId: role.id,
          message: String(form.get("message") ?? ""),
        }),
      }),
      data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(data.error ?? "Could not submit your application.");
      return;
    }
    onToast(`Application sent for ${role.title}.`);
    onClose();
  }
  const blocked = Boolean(fit?.alreadyMember || fit?.existingStatus),
    mismatch = Boolean(fit && !fit.fit.match);
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <form className="n2-editor-modal contribution-modal" onSubmit={submit}>
        <header>
          <div>
            <span className="eyebrow">GET INVOLVED</span>
            <h2>
              {generic
                ? `Offer a contribution to ${target.projectTitle}`
                : role
                  ? `Apply for ${role.title}`
                  : "Choose an open contribution"}
            </h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X size={19} />
          </button>
        </header>
        {!role && !generic && (
          <div className="role-choice-list">
            <p>Select the contribution that best matches what you can bring.</p>
            {openRoles.map((item) => (
              <button type="button" key={item.id} onClick={() => setRole(item)}>
                <span>
                  <strong>{item.title}</strong>
                  <small>
                    {item.department} · {item.phase} · {item.criticality}
                  </small>
                </span>
                <b>
                  {Math.max(0, item.capacity - item.filled)} open{" "}
                  <ArrowUpRight size={14} />
                </b>
              </button>
            ))}
            <button
              type="button"
              className="offer-other"
              onClick={() => setGeneric(true)}
            >
              <UserPlus size={17} />
              <span>
                <strong>Offer another contribution</strong>
                <small>
                  Share experience, ideas or support not listed above.
                </small>
              </span>
            </button>
          </div>
        )}
        {role && !generic && (
          <div className="n2-editor-fields">
            <button
              type="button"
              className="contribution-back"
              onClick={() => {
                setRole(null);
                setFit(null);
                setAcknowledged(false);
              }}
            >
              <ArrowLeft size={14} /> Choose another contribution
            </button>
            <div className="role-application-summary">
              <span>
                <strong>{role.title}</strong>
                <small>
                  {role.department} · {role.phase} · {role.criticality}
                </small>
              </span>
              {role.description && <p>{role.description}</p>}
              <div>
                {(role.requiredSkills ?? []).map((skill) => (
                  <i key={skill}>{skill}</i>
                ))}
                {(role.professions ?? []).map((item) => (
                  <i key={item}>{item}</i>
                ))}
              </div>
            </div>
            {loading && (
              <div className="role-fit">
                <Clock3 size={18} />
                <span>
                  <strong>Checking your profile…</strong>
                  <small>
                    Comparing your profession and three career skills.
                  </small>
                </span>
              </div>
            )}
            {fit && !blocked && (
              <div className={`role-fit ${mismatch ? "warning" : "match"}`}>
                {mismatch ? <CircleAlert size={19} /> : <Check size={19} />}
                <span>
                  <strong>
                    {mismatch
                      ? "Your profile may not closely match this contribution"
                      : "Your profile shows shared experience"}
                  </strong>
                  <small>
                    {mismatch
                      ? fit.fit.warning
                      : [
                          fit.fit.professionMatch && fit.fit.profession,
                          fit.fit.requiredMatches.join(", "),
                          fit.fit.usefulMatches.join(", "),
                        ]
                          .filter(Boolean)
                          .join(" · ") ||
                        "Your career information supports this application."}
                  </small>
                </span>
              </div>
            )}
            {fit?.existingStatus && (
              <div className={`role-fit ${fit.existingStatus === "pending" ? "application-pending" : "warning"}`} role="status">
                {fit.existingStatus === "pending" ? <Check size={19} /> : <CircleAlert size={19} />}
                <span>
                  <strong>{fit.existingStatus === "pending" ? "You’ve already applied" : "Application already submitted"}</strong>
                  <small>
                    {fit.existingStatus === "pending"
                      ? "Your application is pending. The project lead will review it and let you know their decision."
                      : `Your application is currently ${fit.existingStatus}.`}
                  </small>
                </span>
              </div>
            )}
            {fit?.alreadyMember && (
              <div className="role-fit">
                <Check size={19} />
                <span>
                  <strong>You are already part of this project</strong>
                  <small>Project members do not need to apply again.</small>
                </span>
              </div>
            )}
            {!blocked && <label>
                How would you like to get involved?
                <textarea
                  name="message"
                  minLength={20}
                  maxLength={1200}
                  placeholder="Share your interests, experience and how you would like to help."
                  required
                />
              </label>}
            {mismatch && !blocked && (
              <label className="role-acknowledgement">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(event) => setAcknowledged(event.target.checked)}
                />
                <span>
                  I understand the profile warning and have explained my
                  transferable experience.
                </span>
              </label>
            )}
          </div>
        )}
        {generic && (
          <div className="n2-editor-fields">
            <button
              type="button"
              className="contribution-back"
              onClick={() => {
                setGeneric(false);
                setRole(null);
              }}
            >
              <ArrowLeft size={14} /> View open contributions
            </button>
            <p>
              There may not be a listed vacancy for what you offer. Explain how
              you could help and the owner can review it.
            </p>
            <label>
              Your offer
              <textarea
                name="message"
                minLength={20}
                maxLength={1200}
                placeholder="How would you help this project?"
                required
              />
            </label>
            <label>
              Skills or services
              <input
                name="services"
                placeholder="Product design, research, partnerships"
              />
              <small>Separate multiple skills with commas.</small>
            </label>
          </div>
        )}
        {error && (
          <div className="role-fit warning">
            <CircleAlert size={19} />
            <span>
              <strong>We couldn’t submit that</strong>
              <small>{error}</small>
            </span>
          </div>
        )}
        <footer>
          <button type="button" className="secondary-button" onClick={onClose}>
            {blocked ? "Close" : "Cancel"}
          </button>
          {(role || generic) && !blocked && (
            <button
              className="primary-button"
              disabled={
                busy || loading || blocked || (mismatch && !acknowledged)
              }
            >
              {busy
                ? "Sending…"
                : generic
                  ? "Send contribution offer"
                  : "Apply for this role"}
            </button>
          )}
        </footer>
      </form>
    </div>
  );
}

type RecruitmentDraft = {
  title: string;
  profession: string;
  department: string;
  description: string;
  requiredSkills: string;
  usefulSkills: string;
  workMode: "remote" | "hybrid" | "in_person";
  capacity: number;
};

const emptyRecruitmentDraft: RecruitmentDraft = {
  title: "",
  profession: "",
  department: "",
  description: "",
  requiredSkills: "",
  usefulSkills: "",
  workMode: "remote",
  capacity: 1,
};

function RequestProfessionDialog({
  project,
  initialDraft = emptyRecruitmentDraft,
  onClose,
  onRoleCreated,
  onToast,
}: {
  project: ProjectDetailRecord;
  initialDraft?: RecruitmentDraft;
  onClose: () => void;
  onRoleCreated: (role: ProjectRoleRecord) => void;
  onToast: (message: string) => void;
}) {
  const [draft, setDraft] = useState<RecruitmentDraft>(initialDraft),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");

  const updateDraft = <K extends keyof RecruitmentDraft,>(
    field: K,
    value: RecruitmentDraft[K],
  ) => setDraft((current) => ({ ...current, [field]: value }));

  async function requestRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const requiredSkills = draft.requiredSkills
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const response = await fetch(`/api/projects/${project.id}/roles`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: draft.title.trim() || draft.profession.trim(),
        department: draft.department.trim(),
        description: draft.description.trim(),
        professions: [draft.profession.trim()],
        requiredSkills,
        usefulSkills: draft.usefulSkills
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        phase: "now",
        criticality: "important",
        workMode: draft.workMode,
        capacity: draft.capacity,
      }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(data.error ?? "Could not publish this role request.");
      return;
    }
    onRoleCreated(data);
    onToast(`${data.title} is now open for recruitment.`);
    onClose();
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="n2-editor-modal recruitment-modal profession-request-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profession-request-title"
      >
        <header>
          <div>
            <span className="eyebrow">Request a profession</span>
            <h2 id="profession-request-title">Add expertise to {project.title}</h2>
            <p>Create a focused open role for the profession your project needs.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close profession request">
            <X size={19} />
          </button>
        </header>
        <form onSubmit={requestRole}>
            <div className="recruitment-intro">
              <span className="eyebrow">MANUAL REQUEST</span>
              <h3>Create an open role</h3>
              <p>Give people enough context to see how they can get involved.</p>
            </div>
            <div className="n2-editor-fields recruitment-fields">
              <div className="field-row">
                <label>
                  Profession or expertise
                  <input
                    value={draft.profession}
                    onChange={(event) => updateDraft("profession", event.target.value)}
                    placeholder="e.g. Mechanical engineer"
                    minLength={2}
                    maxLength={80}
                    required
                    autoFocus
                  />
                </label>
                <label>
                  Role title
                  <input
                    value={draft.title}
                    onChange={(event) => updateDraft("title", event.target.value)}
                    placeholder="Uses the profession if left blank"
                    maxLength={100}
                  />
                </label>
              </div>
              <div className="field-row">
                <label>
                  Team or department
                  <input
                    value={draft.department}
                    onChange={(event) => updateDraft("department", event.target.value)}
                    placeholder="e.g. Engineering"
                    minLength={2}
                    maxLength={80}
                    required
                  />
                </label>
                <label>
                  Working style
                  <N2Select value={draft.workMode} onValueChange={(value) => updateDraft("workMode", value as RecruitmentDraft["workMode"])} ariaLabel="Working style" options={[{value:"remote",label:"Remote"},{value:"hybrid",label:"Hybrid"},{value:"in_person",label:"In person"}]}/>
                </label>
              </div>
              <label>
                What will they help with?
                <textarea
                  value={draft.description}
                  onChange={(event) => updateDraft("description", event.target.value)}
                  placeholder="Describe the challenge and the first outcome you hope to achieve."
                  maxLength={500}
                />
              </label>
              <div className="field-row">
                <label>
                  Required skills
                  <input
                    value={draft.requiredSkills}
                    onChange={(event) => updateDraft("requiredSkills", event.target.value)}
                    placeholder="Prototyping, CAD"
                    required
                  />
                  <small>Separate skills with commas.</small>
                </label>
                <label>
                  Additional skills
                  <input
                    value={draft.usefulSkills}
                    onChange={(event) => updateDraft("usefulSkills", event.target.value)}
                    placeholder="Food systems, testing"
                  />
                  <small>Optional · separate skills with commas.</small>
                </label>
              </div>
              <label className="recruitment-capacity">
                People needed
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={draft.capacity}
                  onChange={(event) => updateDraft("capacity", Number(event.target.value))}
                  required
                />
              </label>
            </div>
            {error && <div className="recruitment-error"><CircleAlert size={16} /> {error}</div>}
            <footer>
              <p>This creates an open role and helps people discover a new way to take part.</p>
              <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
              <button className="primary-button" disabled={busy}>
                {busy ? "Publishing…" : "Publish role request"} <ArrowUpRight size={14} />
              </button>
            </footer>
        </form>
      </section>
    </div>
  );
}

function AiAssistDialog({
  project,
  onClose,
  onRequestRole,
}: {
  project: ProjectDetailRecord;
  onClose: () => void;
  onRequestRole: (draft: RecruitmentDraft) => void;
}) {
  const [blueprint, setBlueprint] = useState<BlueprintRecord | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");

  async function reviewProject() {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/projects/${project.id}/blueprint`, {
      method: "POST",
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(data.error ?? "The project review could not be completed.");
      return;
    }
    setBlueprint(data.blueprint);
  }

  function chooseRecommendation(role: BlueprintRole) {
    onRequestRole({
      title: role.title,
      profession: role.professions[0] ?? role.title,
      department: role.department,
      description: role.reason,
      requiredSkills: role.requiredSkills.join(", "),
      usefulSkills: role.usefulSkills.join(", "),
      workMode: role.workMode,
      capacity: role.headcount,
    });
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="n2-editor-modal recruitment-modal ai-assist-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-assist-title"
      >
        <header>
          <div>
            <span className="eyebrow">AI PROJECT ADVISER</span>
            <h2 id="ai-assist-title">Ai Assist for {project.title}</h2>
            <p>Review the project’s next steps, capability gaps and recommended roles.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close Ai Assist">
            <X size={19} />
          </button>
        </header>
        <div className="recruitment-ai-panel">
          {!blueprint ? (
            <div className="ai-review-start">
              <N2OrbitMark />
              <span className="eyebrow">AI PROJECT ADVISER</span>
              <h3>Find someone to join you next.</h3>
              <p>AI will assess the project brief, stage, current team and owner expertise. It recommends abstract roles only—never named people.</p>
              <div className="ai-review-scope">
                <span><b>01</b> Project clarity</span>
                <span><b>02</b> Capability gaps</span>
                <span><b>03</b> Next milestones</span>
              </div>
              {error && <div className="recruitment-error"><CircleAlert size={16} /> {error}</div>}
              <button type="button" className="primary-button" disabled={busy} onClick={reviewProject}>
                <N2OrbitMark compact /> {busy ? "Reviewing project…" : "Review this project"}
              </button>
            </div>
          ) : (
            <div className="ai-review-results">
              <div className="ai-result-heading">
                <div><span className="eyebrow">AI PROJECT REVIEW</span><h3>{blueprint.outcome}</h3></div>
                <span className="ai-confidence">{blueprint.usedFallback ? "GUIDED REVIEW" : "AI REVIEW"}</span>
              </div>
              {blueprint.usedFallback && <p className="ai-fallback-note">The AI provider was unavailable, so this review uses n2’s industry framework. Review each suggestion before publishing.</p>}
              <section className="ai-next-steps">
                <strong>Recommended next steps</strong>
                <ol>{blueprint.milestones.map((milestone) => <li key={`${milestone.phase}-${milestone.title}`}><span>{milestone.phase}</span>{milestone.title}</li>)}</ol>
              </section>
              <div className="ai-role-recommendations">
                <div><span className="eyebrow">TEAM GAPS</span><p>Choose a suggestion to open it in the separate profession request.</p></div>
                {blueprint.roles.map((role, index) => (
                  <article key={`${role.phase}-${role.title}-${index}`} className={index === 0 ? "featured" : ""}>
                    <b>{String(index + 1).padStart(2, "0")}</b>
                    <div>
                      <span>{role.phase} · {role.criticality}</span>
                      <h4>{role.title}</h4>
                      <p>{role.reason}</p>
                      <small>{role.professions.join(" · ")}</small>
                    </div>
                    <button type="button" onClick={() => chooseRecommendation(role)}>Request this role <ArrowUpRight size={13} /></button>
                  </article>
                ))}
              </div>
              <footer>
                <button type="button" className="secondary-button" onClick={reviewProject} disabled={busy}>
                  <N2OrbitMark compact /> {busy ? "Reviewing…" : "Review again"}
                </button>
              </footer>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ProjectDetailView({
  projectId,
  onBack,
  onProfile,
  onToast,
}: {
  projectId: string;
  onBack: () => void;
  onProfile: (userId: string) => void;
  onToast: (message: string) => void;
}) {
  const [project, setProject] = useState<ProjectDetailRecord | null>(null),
    [loading, setLoading] = useState(true),
    [tab, setTab] = useState<
      "overview" | "team" | "notifications" | "ai_assist" | "roadmap" | "updates" | "funding"
    >("overview"),
    [fundingOpen, setFundingOpen] = useState(false),
    [fundingType, setFundingType] = useState<
      "invest" | "donate" | "contribute" | "share_request"
    >("contribute"),
    [professionRequestOpen, setProfessionRequestOpen] = useState(false),
    [aiAssistOpen, setAiAssistOpen] = useState(false),
    [selectedApplicationRoleId, setSelectedApplicationRoleId] = useState<string | null>(null),
    [selectedRoleId, setSelectedRoleId] = useState<string | null>(null),
    [roleModalTab, setRoleModalTab] = useState<"details" | "applicants">("details"),
    [removeRoleRequested, setRemoveRoleRequested] = useState(false),
    [selectedInvolvementId, setSelectedInvolvementId] = useState<string | null>(null),
    [expandedApplicationId, setExpandedApplicationId] = useState<string | null>(null),
    [professionDraft, setProfessionDraft] = useState<RecruitmentDraft>(emptyRecruitmentDraft),
    [busy, setBusy] = useState(false);
  async function reloadProject() {
    const response = await fetch(`/api/projects/${projectId}`), data = await response.json();
    if (response.ok) setProject(data.project);
    else onToast(data.error ?? "Could not refresh this project.");
  }
  async function joinProjectChat() {
    setBusy(true);
    const response = await fetch(`/api/projects/${projectId}/chat`, { method: "POST" }), data = await response.json();
    setBusy(false);
    if (!response.ok) {
      onToast(data.error ?? "Could not open the project chat.");
      return;
    }
    window.location.assign(`/?view=messages&conversation=${encodeURIComponent(data.conversationId)}`);
  }
  async function saveFundingSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget), goal = Number(form.get("fundingGoal") || 0), share = Number(form.get("shareLimit") || 0);
    setBusy(true);
    const response = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fundingGoal: goal || null,
        shareLimit: share || null,
        openToInvestment: form.get("openToInvestment") === "on",
        openToContributions: form.get("openToContributions") === "on",
      }),
    }), data = await response.json();
    setBusy(false);
    if (!response.ok) {
      onToast(data.error ?? "Could not save funding settings.");
      return;
    }
    setProject((current) => current ? { ...current, ...data.project } : current);
    onToast("Funding settings saved.");
  }
  async function decideApplication(applicationId: string, decision: "accepted" | "declined") {
    const response = await fetch(`/api/applications/${applicationId}/decision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    const result = await response.json();
    if (!response.ok) {
      onToast(result.error ?? "Could not update this application.");
      return;
    }
    setProject(current => current ? {
      ...current,
      applications: current.applications.map(item => item.id === applicationId ? { ...item, status: decision } : item),
      pendingApplicationCount: Math.max(0, current.pendingApplicationCount - 1),
    } : current);
    await reloadProject();
    onToast(`Application ${decision}.`);
  }
  async function saveRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRoleId) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    const response = await fetch(`/api/projects/${projectId}/roles/${selectedRoleId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({
      title: String(form.get("title") || ""), department: String(form.get("department") || ""), description: String(form.get("description") || ""),
      professions: String(form.get("professions") || "").split(",").map(value => value.trim()).filter(Boolean),
      requiredSkills: String(form.get("requiredSkills") || "").split(",").map(value => value.trim()).filter(Boolean),
      usefulSkills: String(form.get("usefulSkills") || "").split(",").map(value => value.trim()).filter(Boolean),
      phase: String(form.get("phase")), criticality: String(form.get("criticality")), workMode: String(form.get("workMode")), capacity: Number(form.get("capacity") || 1),
    }) });
    const data = await response.json(); setBusy(false);
    if (!response.ok) return onToast(data.error ?? "Could not update this role.");
    setProject(current => current ? { ...current, roles: current.roles.map(role => role.id === selectedRoleId ? { ...role, ...data.role } : role) } : current);
    onToast("Role updated.");
  }
  async function removeRole() {
    if (!selectedRoleId) return false;
    setBusy(true); const response = await fetch(`/api/projects/${projectId}/roles/${selectedRoleId}`, { method: "DELETE" }), data = await response.json(); setBusy(false);
    if (!response.ok) {
      onToast(data.error ?? "Could not remove this role.");
      return false;
    }
    setProject(current => current ? { ...current, roles: current.roles.map(role => role.id === selectedRoleId ? { ...role, status: "removed" } : role) } : current);
    setRemoveRoleRequested(false); setSelectedRoleId(null); onToast("Role removed.");
    return true;
  }
  async function decideInvolvement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selectedInvolvementId) return;
    const form = new FormData(event.currentTarget), existingRoleId = String(form.get("roleId") || "");
    setBusy(true); const response = await fetch(`/api/projects/${projectId}/involvement/${selectedInvolvementId}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "onboard", roleId: existingRoleId || undefined, roleTitle: existingRoleId ? undefined : String(form.get("roleTitle") || ""), department: existingRoleId ? undefined : String(form.get("department") || ""), roadmapTitle: String(form.get("roadmapTitle") || "") || undefined }) }), data = await response.json(); setBusy(false);
    if (!response.ok) return onToast(data.error ?? "Could not onboard this contributor.");
    setSelectedInvolvementId(null); await reloadProject(); onToast(`${data.roleTitle} joined the project team.`);
  }
  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then(async (response) => {
        const data = await response.json();
        if (response.ok) setProject(data.project);
        else onToast(data.error ?? "Could not open this project.");
      })
      .finally(() => setLoading(false));
  }, [projectId, onToast]);
  async function submitFunding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget),
      amount = Number(form.get("amount") || 0);
    const response = await fetch(
        `/api/projects/${projectId}/funding-interest`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            type: fundingType,
            amount: amount || undefined,
            message: String(form.get("message") || ""),
          }),
        },
      ),
      data = await response.json();
    setBusy(false);
    if (response.ok) {
      setFundingOpen(false);
      setProject((current) => current && current.isMember ? { ...current, fundingInterests: [data.interest, ...current.fundingInterests] } : current);
      onToast(data.message);
    } else onToast(data.error ?? "Could not register interest.");
  }
  if (loading)
    return (
      <LoadingState label="Loading project details" count={2} />
    );
  if (!project)
    return (
      <div className="empty-meets">
        <BriefcaseBusiness />
        <strong>Project unavailable</strong>
        <button className="secondary-button" onClick={onBack}>
          Back to projects
        </button>
      </div>
    );
  const completed = project.milestones.filter(
      (item) => item.status === "complete",
    ).length,
    progress = project.milestones.length
      ? Math.round((completed / project.milestones.length) * 100)
      : 0,
    canRecruit = project.isOwner,
    canApplyToProject = !project.isOwner && !project.isMember,
    selectedRole = project.roles.find(role => role.id === selectedRoleId) ?? null,
    selectedInvolvement = project.involvementRequests.find(offer => offer.id === selectedInvolvementId) ?? null,
    fundingTotal = project.fundingInterests.reduce((sum, interest) => sum + (interest.amount ?? 0), 0);
  return (
    <div className="project-detail">
      <button className="project-detail-back" onClick={onBack}>
        <ArrowLeft size={16} /> Projects
      </button>
      <header>
        <div>
          <span className="eyebrow">
            {project.industry.toUpperCase()} · {project.stage.toUpperCase()}
          </span>
          <h1>{project.title}</h1>
          <p>{project.summary}</p>
          <div className="project-detail-meta">
            <span>
              <Globe2 size={14} />
              {project.workMode?.replaceAll("_", " ")}
            </span>
            {project.location && (
              <span>
                <MapPin size={14} />
                {project.location}
              </span>
            )}
            <span>
              <UsersRound size={14} />
              {project.team.length} people
            </span>
          </div>
        </div>
        <div className="project-progress">
          <strong>{progress}%</strong>
          <span>project progress</span>
          <i>
            <b style={{ width: `${progress}%` }} />
          </i>
        </div>
      </header>
      <nav className="project-detail-tabs">
        {(["overview", "team", "notifications", "ai_assist", "roadmap", "updates", "funding"] as const)
          .filter((item) => item !== "notifications" || project.isMember)
          .filter((item) => item !== "ai_assist" || canRecruit)
          .map(
          (item) => (
            <button
              key={item}
              className={tab === item ? "active" : ""}
              onClick={() => setTab(item)}
            >
              {item === "ai_assist" ? "Ai Assist" : item}
              {item === "notifications" && project.pendingApplicationCount > 0 && (
                <span className="project-application-count">{project.pendingApplicationCount}</span>
              )}
            </button>
          ),
        )}
      </nav>
      {tab === "overview" && (
        <section className="project-detail-grid">
          <article>
            <span className="eyebrow">THE PROJECT</span>
            <h2>What the team is building</h2>
            <p>{project.description || project.summary}</p>
          </article>
          <article>
            <span className="eyebrow">PROJECT LEAD</span>
            <button
              className="project-lead"
              onClick={() => project.ownerId && onProfile(project.ownerId)}
            >
              <Avatar
                person={{
                  name: project.ownerName ?? "n2 member",
                  role: project.ownerProfession ?? project.industry,
                  img: project.ownerImage,
                }}
                size="md"
              />
              <span>
                <strong>{project.ownerName}</strong>
                <small>{project.ownerProfession ?? "Project owner"}</small>
              </span>
              <ArrowUpRight size={15} />
            </button>
          </article>
          <article className="wide">
            <header className="detail-contribution-head">
              <div>
                <span className="eyebrow">OPEN CONTRIBUTIONS</span>
                <p>
                  {project.isOwner
                    ? "These are the open roles you’re recruiting for."
                    : project.isMember
                      ? "These roles are open to new contributors."
                      : "Apply for a listed role or suggest another way to contribute."}
                </p>
              </div>
              {canApplyToProject && (
                <button
                  className="primary-button"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("n2:apply-role", {
                        detail: {
                          projectId: project.id,
                          projectTitle: project.title,
                          roles: project.roles,
                        },
                      }),
                    )
                  }
                >
                  <UserPlus size={15} /> Get involved
                </button>
              )}
            </header>
            <div className="detail-role-list">
              {project.roles
                .filter(
                  (role) =>
                    role.status === "open" && role.filled < role.capacity,
                )
                .map((role) => (
                  <button
                    type="button"
                    key={role.id}
                    disabled={!canApplyToProject && !project.isOwner}
                    onClick={() => {
                      if (project.isOwner) {
                        setSelectedRoleId(role.id);
                        setRoleModalTab("details");
                        return;
                      }
                      if (canApplyToProject) {
                        window.dispatchEvent(
                          new CustomEvent("n2:apply-role", {
                            detail: {
                              projectId: project.id,
                              projectTitle: project.title,
                              roles: project.roles,
                              initialRoleId: role.id,
                            },
                          }),
                        );
                      }
                    }}
                  >
                    <span>
                      <span className="detail-role-title">
                        <strong>{role.title}</strong>
                        {canRecruit && (role.applicationCount ?? 0) > 0 && (
                          <em
                            className="role-application-badge"
                            aria-label={`${role.applicationCount} applications`}
                            title={`${role.applicationCount} applications`}
                          >
                            {role.applicationCount}
                          </em>
                        )}
                      </span>
                      <small>
                        {role.department} · {role.phase} · {role.criticality}
                      </small>
                    </span>
                    <b>
                      {Math.max(0, role.capacity - role.filled)} open{" "}
                      {(canApplyToProject || project.isOwner) && <ArrowUpRight size={13} />}
                    </b>
                  </button>
                ))}
              {!project.roles.some(
                (role) => role.status === "open" && role.filled < role.capacity,
              ) && (
                <p>
                  No listed roles right now. You can still suggest another way
                  to get involved.
                </p>
              )}
            </div>
            {canRecruit && (
              <section className="involvement-offers">
                <header><div><span className="eyebrow">OTHER WAYS TO GET INVOLVED</span><h3>Offers beyond the listed roles</h3><p>Review people who have offered their skills without applying for a specific position.</p></div>{project.pendingInvolvementCount > 0 && <b>{project.pendingInvolvementCount}</b>}</header>
                {project.involvementRequests.filter(offer => offer.status === "pending").map(offer => (
                  <article key={offer.id}>
                    <button type="button" className="application-person" onClick={() => onProfile(offer.userId)}><Avatar person={{ name: offer.userName ?? "n2 member", role: offer.userProfession ?? "Contributor", img: offer.userImage }} size="md" /><span><strong>{offer.userName ?? "n2 member"}</strong><small>{offer.userProfession ?? "Open contributor"} · {offer.userLocation || "Location not shared"}</small></span></button>
                    <p>{offer.message}</p>
                    <div className="application-tags">{offer.services.map(service => <span key={service}>{service}</span>)}</div>
                    <footer><button type="button" className="secondary-button" onClick={() => onProfile(offer.userId)}>View profile</button><button type="button" className="primary-button" onClick={() => setSelectedInvolvementId(offer.id)}>Onboard early</button></footer>
                  </article>
                ))}
                {!project.involvementRequests.some(offer => offer.status === "pending") && <p className="profile-empty">No general offers are waiting for review.</p>}
              </section>
            )}
          </article>
        </section>
      )}
      {tab === "team" && (
        <section className="project-team-section">
          <header className="project-team-head">
            <div>
              <span className="eyebrow">PROJECT TEAM</span>
              <h2>The people making it happen</h2>
              <p>{canRecruit ? "Add the expertise needed to reach the next milestone." : `${project.team.length} people are contributing to this project.`}</p>
            </div>
            <div className="project-team-actions">
              {project.isMember && (
                <button className="secondary-button" disabled={busy} onClick={joinProjectChat}>
                  <MessageCircle size={15} /> {busy ? "Opening…" : "Join chat"}
                </button>
              )}
              {canRecruit && (
                <button className="primary-button" onClick={() => { setProfessionDraft(emptyRecruitmentDraft); setProfessionRequestOpen(true); }}>
                  <UserPlus size={15} /> Add member
                </button>
              )}
            </div>
          </header>
          <div className="project-team-grid">
            {project.team.map((person) => (
              <button
                key={person.userId}
                onClick={() => onProfile(person.userId)}
              >
                <Avatar
                  person={{
                    name: person.name ?? "n2 member",
                    role: person.profession ?? "Contributor",
                    img: person.image,
                  }}
                  size="lg"
                />
                <span>
                  <strong>{person.name}</strong>
                  <small>{person.department || person.membershipRole}</small>
                  <i>{person.profession}</i>
                </span>
                <ArrowUpRight size={15} />
              </button>
            ))}
            {(project.pendingCoOwners ?? []).map((person) => (
              <article className="project-team-pending" key={person.invitationId}>
                <Avatar person={{ name: person.name ?? person.username ?? "n2 member", role: person.profession ?? "Invited co-owner", img: person.image }} size="lg" />
                <span>
                  <strong>{person.name ?? `@${person.username}`}</strong>
                  <small>Co-owner</small>
                  <i>Invitation pending</i>
                </span>
                <b>Pending</b>
              </article>
            ))}
            {canRecruit && (
              <button className="project-team-recruit" onClick={() => { setProfessionDraft(emptyRecruitmentDraft); setProfessionRequestOpen(true); }}>
                <span><Plus size={18} /></span>
                <div><strong>Grow your team</strong><small>Request the profession this project needs next</small></div>
                <ArrowUpRight size={15} />
              </button>
            )}
          </div>
        </section>
      )}
      {tab === "notifications" && project.isMember && (
        <section className="project-notifications-section">
          <header>
            <div>
              <span className="eyebrow">PROJECT NOTIFICATIONS</span>
              <h2>{canRecruit && selectedApplicationRoleId ? `Applications for ${project.roles.find(role => role.id === selectedApplicationRoleId)?.title ?? "this role"}` : "Team activity"}</h2>
              <p>{canRecruit ? "Expand role applications or review changes to the project team." : "See when members join or leave this project."}</p>
            </div>
            <div className="application-section-tools">
              {canRecruit && selectedApplicationRoleId && <button type="button" className="secondary-button" onClick={() => setSelectedApplicationRoleId(null)}>All applications</button>}
              {canRecruit && project.pendingApplicationCount > 0 && <b>{project.pendingApplicationCount} pending</b>}
            </div>
          </header>
          {canRecruit && (
            <div className="project-application-list">
              {project.applications.filter(application => !selectedApplicationRoleId || application.roleId === selectedApplicationRoleId).map(application => {
                const expanded = expandedApplicationId === application.id;
                return (
                  <article key={application.id} className={`${application.status === "pending" ? "pending" : ""} ${expanded ? "expanded" : ""}`}>
                    <div className="application-summary-row">
                      <button type="button" className="application-person" onClick={() => onProfile(application.applicantId)}>
                        <Avatar person={{ name: application.applicantName ?? "n2 member", role: application.applicantProfession ?? "n2 member", img: application.applicantImage }} size="md" />
                        <span><strong>{application.applicantName ?? "n2 member"}</strong><small>{application.roleTitle} · {application.applicantProfession ?? "n2 member"}</small></span>
                      </button>
                      <div className="application-fit" data-fit-tier={application.fit.score >= 80 ? "high" : application.fit.score <= 50 ? "low" : "medium"} role="meter" aria-label="Role fit" aria-valuemin={0} aria-valuemax={100} aria-valuenow={application.fit.score} style={{ "--role-fit-progress": `${Math.max(0, Math.min(100, application.fit.score))}%` } as React.CSSProperties}><strong>{application.fit.score}%</strong><small>role fit</small></div>
                      <button type="button" className="application-expand" aria-expanded={expanded} onClick={() => setExpandedApplicationId(expanded ? null : application.id)}>
                        {expanded ? "Hide details" : "Review details"} <ChevronRight size={15} />
                      </button>
                    </div>
                    {expanded && (
                      <div className="application-expanded-details">
                        <p className="application-profile-brief">{application.profileBrief}</p>
                        <dl className="application-profile-details">
                          <div><dt>Applied for</dt><dd><strong>{application.roleTitle}</strong> · {application.roleDepartment}</dd></div>
                          <div><dt>Location</dt><dd>{application.applicantLocation || "Not shared"}</dd></div>
                          <div><dt>Skills</dt><dd className="application-tags">{application.applicantSkills.length ? application.applicantSkills.map(skill => <span key={skill}>{skill}</span>) : "Not added"}</dd></div>
                          <div><dt>Interests</dt><dd className="application-tags">{application.applicantInterests.length ? application.applicantInterests.map(interest => <span key={interest}>{interest}</span>) : "Not added"}</dd></div>
                        </dl>
                        {application.message && <div className="application-note"><small>APPLICATION NOTE</small><p>{application.message}</p></div>}
                        <div className="application-review-actions">
                          <span className={`application-status ${application.status}`}>{application.status}</span>
                          {application.status === "pending" && (<><button type="button" className="secondary-button" onClick={() => decideApplication(application.id, "declined")}>Decline</button><button type="button" className="primary-button" onClick={() => decideApplication(application.id, "accepted")}>Accept</button></>)}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
              {!project.applications.some(application => !selectedApplicationRoleId || application.roleId === selectedApplicationRoleId) && <p className="profile-empty">No applications for this role yet.</p>}
            </div>
          )}
          <div className="project-membership-activity">
            <h3>Member activity</h3>
            {project.updates.filter(update => update.type === "member_joined" || update.type === "member_left").map(update => (
              <article key={update.id}>
                <Avatar person={{ name: update.authorName ?? "n2 member", role: update.type === "member_joined" ? "Joined project" : "Left project", img: update.authorImage }} size="sm" />
                <div><strong>{update.body}</strong><time>{formatNetworkDate(update.createdAt, { day: "numeric", month: "short", year: "numeric" })}</time></div>
              </article>
            ))}
            {!project.updates.some(update => update.type === "member_joined" || update.type === "member_left") && <p className="profile-empty">No team changes yet.</p>}
          </div>
        </section>
      )}
      {tab === "ai_assist" && canRecruit && (
        <section className="project-ai-assist-panel">
          <N2OrbitMark />
          <span className="eyebrow">AI PROJECT ADVISER</span>
          <h2>Work out what this project needs next.</h2>
          <p>Ai Assist reviews the project brief, stage, current team and your experience to suggest roles and milestones that could help the project move forward.</p>
          <div className="ai-review-scope">
            <span><b>01</b> Project clarity</span>
            <span><b>02</b> Capability gaps</span>
            <span><b>03</b> Next milestones</span>
          </div>
          <div className="project-ai-context">
            <span><strong>{project.team.length}</strong><small>people on the team</small></span>
            <span><strong>{project.roles.filter((role) => role.status === "open").length}</strong><small>open roles</small></span>
            <span><strong>{project.milestones.length}</strong><small>roadmap milestones</small></span>
          </div>
          <button type="button" className="primary-button" onClick={() => setAiAssistOpen(true)}>
            <N2OrbitMark compact /> Start Ai Assist
          </button>
          <small>Suggestions are advisory. You choose and edit every role before publishing.</small>
        </section>
      )}
      {tab === "roadmap" && (
        <RoadmapPanel
          project={project}
          setProject={setProject}
          onToast={onToast}
        />
      )}
      {tab === "updates" && (
        <UpdatesPanel
          project={project}
          setProject={setProject}
          onToast={onToast}
        />
      )}
      {tab === "funding" && (
        <section className="project-funding">
          <div className="funding-intro">
            <span className="eyebrow">SUPPORT THE WORK</span>
            <h2>Help this project move forward.</h2>
            <p>
              Register interest in investing, donating or making a financial
              contribution. n2 does not currently process funds or transfer
              ownership; the project owner will receive your verified expression
              of interest.
            </p>
          </div>
          {!project.isOwner && (
            <div className="funding-options">
              {([
                ...(project.openToContributions ? [["contribute", "Contribute", "Offer practical financial support"], ["donate", "Donate", "Offer funding without ownership"]] : []),
                ...(project.openToInvestment ? [["invest", "Invest", "Start an investment conversation"], ["share_request", "Request a share", "Ask the owner to discuss ownership terms"]] : []),
              ] as string[][]).map(([id, title, copy]) => (
                <button key={id} onClick={() => { setFundingType(id as typeof fundingType); setFundingOpen(true); }}>
                  <span><strong>{title}</strong><small>{copy}</small></span><ArrowUpRight size={16} />
                </button>
              ))}
              {!project.openToContributions && !project.openToInvestment && <p className="profile-empty">This project is not accepting funding interest right now.</p>}
            </div>
          )}
          {project.isOwner && (
            <form className="funding-owner-settings" onSubmit={saveFundingSettings}>
              <div><span className="eyebrow">OWNER CONTROLS</span><h3>Funding and ownership settings</h3><p>Only owners and co-owners can change these settings.</p></div>
              <label>Funding goal (£)<input name="fundingGoal" type="number" min="1" max="100000000" defaultValue={project.fundingGoal ?? ""} placeholder="Optional" /></label>
              <label>Maximum shares available (%)<input name="shareLimit" type="number" min="0" max="100" defaultValue={project.shareLimit ?? ""} placeholder="Optional" /></label>
              <label className="funding-toggle"><input aria-label="Open to contributions" name="openToContributions" type="checkbox" defaultChecked={project.openToContributions} /><span><strong>Open to contributions</strong><small>Allow contribution and donation interest.</small></span></label>
              <label className="funding-toggle"><input aria-label="Open to investment" name="openToInvestment" type="checkbox" defaultChecked={project.openToInvestment} /><span><strong>Open to investment</strong><small>Allow investment and share discussions.</small></span></label>
              <button className="primary-button" disabled={busy}>{busy ? "Saving…" : "Save funding settings"}</button>
            </form>
          )}
          {project.isMember && (
            <div className="funding-ledger">
              <header>
                <div><span className="eyebrow">MEMBER VIEW</span><h3>Funding activity</h3><p>Verified expressions of interest from members.</p></div>
                <div className="funding-progress"><strong>£{fundingTotal.toLocaleString("en-GB")}</strong><small>{project.fundingGoal ? `of £${project.fundingGoal.toLocaleString("en-GB")} goal` : "registered interest"}</small>{project.fundingGoal && <i><b style={{ width: `${Math.min(100, Math.round(fundingTotal / project.fundingGoal * 100))}%` }} /></i>}</div>
              </header>
              <div>
                {project.fundingInterests.map(interest => (
                  <article key={interest.id}>
                    <Avatar person={{ name: interest.userName ?? "n2 member", role: interest.type.replaceAll("_", " "), img: interest.userImage }} size="sm" />
                    <span><strong>{interest.userName ?? "n2 member"}</strong><small>{interest.type.replaceAll("_", " ")} · {formatNetworkDate(interest.createdAt, { day: "numeric", month: "short", year: "numeric" })}</small></span>
                    <b>{interest.amount ? `£${interest.amount.toLocaleString("en-GB")}` : "Discussion"}</b>
                  </article>
                ))}
                {!project.fundingInterests.length && <p className="profile-empty">No funding interest has been registered yet.</p>}
              </div>
              {project.shareLimit !== null && <small className="funding-share-limit">Up to {project.shareLimit}% of project shares are available for discussion.</small>}
            </div>
          )}
          <div className="funding-caveat">
            <ShieldCheck size={18} />
            <p>
              <strong>Protected discussion, not a transaction.</strong> Any
              payment, equity or revenue-share arrangement requires separate
              identity checks, contracts and regulatory review outside this
              beta.
            </p>
          </div>
        </section>
      )}
      {fundingOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setFundingOpen(false)
          }
        >
          <form className="funding-modal" onSubmit={submitFunding}>
            <button
              type="button"
              className="icon-button"
              onClick={() => setFundingOpen(false)}
            >
              <X />
            </button>
            <span className="eyebrow">VERIFIED INTEREST</span>
            <h2>
              {fundingType === "share_request"
                ? "Request an ownership discussion"
                : `Register ${fundingType} interest`}
            </h2>
            <p>No money or ownership will change hands through this form.</p>
            <label>
              Indicative amount (£)
              <input
                name="amount"
                type="number"
                min="1"
                max="1000000"
                placeholder="Optional"
              />
            </label>
            <label>
              Message to the project owner
              <textarea
                name="message"
                maxLength={600}
                placeholder="Explain what you can offer and what you would like to discuss."
              />
            </label>
            <button className="primary-button wide" disabled={busy}>
              {busy ? "Sending…" : "Send verified interest"}
            </button>
          </form>
        </div>
      )}
      {selectedRole && canRecruit && (
        <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setSelectedRoleId(null)}>
          <section className="role-management-modal" role="dialog" aria-modal="true" aria-label={`Manage ${selectedRole.title}`}>
            <header><div><span className="eyebrow">OPEN CONTRIBUTION</span><h2>{selectedRole.title}</h2><p>{selectedRole.department} · {Math.max(0, selectedRole.capacity - selectedRole.filled)} places open</p></div><button type="button" className="icon-button" onClick={() => setSelectedRoleId(null)}><X /></button></header>
            <nav><button type="button" className={roleModalTab === "details" ? "active" : ""} onClick={() => setRoleModalTab("details")}>Role details</button><button type="button" className={roleModalTab === "applicants" ? "active" : ""} onClick={() => setRoleModalTab("applicants")}>Applicants <b>{selectedRole.applicationCount ?? 0}</b></button></nav>
            {roleModalTab === "details" ? (
              <form onSubmit={saveRole}>
                <div className="field-row"><label>Role title<input name="title" defaultValue={selectedRole.title} /></label><label>Department<input name="department" defaultValue={selectedRole.department} /></label></div>
                <label>Description<textarea name="description" defaultValue={selectedRole.description ?? ""} maxLength={500} /></label>
                <div className="field-row"><label>Professions<input name="professions" defaultValue={(selectedRole.professions ?? []).join(", ")} placeholder="Product designer, UX researcher" /></label><label>Capacity<input name="capacity" type="number" min={Math.max(1, selectedRole.filled)} max={10} defaultValue={selectedRole.capacity} /></label></div>
                <label>Required skills<input name="requiredSkills" defaultValue={(selectedRole.requiredSkills ?? []).join(", ")} /></label>
                <label>Additional skills<input name="usefulSkills" defaultValue={(selectedRole.usefulSkills ?? []).join(", ")} /></label>
                <div className="field-row"><label>Timing<N2Select name="phase" defaultValue={selectedRole.phase} ariaLabel="Timing" options={[{value:"now",label:"Now"},{value:"next",label:"Next"},{value:"later",label:"Later"}]}/></label><label>Priority<N2Select name="criticality" defaultValue={selectedRole.criticality} ariaLabel="Priority" options={[{value:"critical",label:"Critical"},{value:"important",label:"Important"},{value:"useful",label:"Useful"}]}/></label></div>
                <label>Working style<N2Select name="workMode" defaultValue={selectedRole.workMode ?? "remote"} ariaLabel="Working style" options={[{value:"remote",label:"Remote"},{value:"hybrid",label:"Hybrid"},{value:"in_person",label:"In person"}]}/></label>
                <footer><button type="button" className="danger-button" disabled={busy} onClick={() => setRemoveRoleRequested(true)}>Remove role</button><button type="submit" className="primary-button" disabled={busy}>{busy ? "Saving…" : "Save role"}</button></footer>
              </form>
            ) : (
              <div className="role-applicant-list">
                {project.applications.filter(application => application.roleId === selectedRole.id).map(application => (
                  <article key={application.id}>
                    <header><button type="button" className="application-person" onClick={() => onProfile(application.applicantId)}><Avatar person={{ name: application.applicantName ?? "n2 member", role: application.applicantProfession ?? "n2 member", img: application.applicantImage }} size="md" /><span><strong>{application.applicantName ?? "n2 member"}</strong><small>{application.applicantProfession ?? "Profession not shared"} · {application.applicantLocation || "Location not shared"}</small></span></button><div className="application-fit" data-fit-tier={application.fit.score >= 80 ? "high" : application.fit.score <= 50 ? "low" : "medium"} role="meter" aria-label="Role fit" aria-valuemin={0} aria-valuemax={100} aria-valuenow={application.fit.score} style={{ "--role-fit-progress": `${Math.max(0, Math.min(100, application.fit.score))}%` } as React.CSSProperties}><strong>{application.fit.score}%</strong><small>role fit</small></div></header>
                    {application.fit.mismatch && <span className="application-mismatch">Applied outside role match</span>}
                    <p>{application.profileBrief}</p>
                    <dl><div><dt>Skills</dt><dd className="application-tags">{application.applicantSkills.length ? application.applicantSkills.map(skill => <span key={skill}>{skill}</span>) : "Not added"}</dd></div><div><dt>Interests</dt><dd className="application-tags">{application.applicantInterests.length ? application.applicantInterests.map(interest => <span key={interest}>{interest}</span>) : "Not added"}</dd></div></dl>
                    <div className="application-note"><small>REASON FOR JOINING</small><p>{application.message || "No application note was provided."}</p></div>
                    <footer><span className={`application-status ${application.status}`}>{application.status}</span>{application.status === "pending" && <><button type="button" className="secondary-button" onClick={() => decideApplication(application.id, "declined")}>Decline</button><button type="button" className="primary-button" onClick={() => decideApplication(application.id, "accepted")}>Add to team</button></>}</footer>
                  </article>
                ))}
                {!project.applications.some(application => application.roleId === selectedRole.id) && <p className="profile-empty">No one has applied for this role yet.</p>}
              </div>
            )}
          </section>
        </div>
      )}
      {removeRoleRequested && selectedRole && (
        <ActionDialog
          eyebrow="REMOVE ROLE"
          title={`Remove ${selectedRole.title}?`}
          description="The role will stop accepting applications. Existing application records will remain available to the project owners."
          confirmLabel="Remove role"
          cancelLabel="Keep role"
          danger
          onClose={() => setRemoveRoleRequested(false)}
          onConfirm={removeRole}
        />
      )}
      {selectedInvolvement && canRecruit && (
        <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setSelectedInvolvementId(null)}>
          <form className="involvement-onboard-modal" onSubmit={decideInvolvement}>
            <header><div><span className="eyebrow">EARLY ONBOARDING</span><h2>Add {selectedInvolvement.userName ?? "this contributor"} to the team</h2><p>Assign a role now and optionally give them a first roadmap responsibility.</p></div><button type="button" className="icon-button" onClick={() => setSelectedInvolvementId(null)}><X /></button></header>
            <div className="onboard-profile"><Avatar person={{ name: selectedInvolvement.userName ?? "n2 member", role: selectedInvolvement.userProfession ?? "Contributor", img: selectedInvolvement.userImage }} size="lg" /><span><strong>{selectedInvolvement.userName}</strong><small>{selectedInvolvement.profileBrief}</small></span></div>
            <label>Assign an existing open role<N2Select name="roleId" defaultValue="" ariaLabel="Assign an existing open role" options={[{value:"",label:"Create a role for this person"},...project.roles.filter(role => role.status === "open" && role.filled < role.capacity).map(role=>({value:role.id,label:role.title}))]}/></label>
            <div className="field-row"><label>New role title<input name="roleTitle" placeholder="Community partnerships lead" /></label><label>Department<input name="department" placeholder="Community" /></label></div>
            <label>Optional first roadmap step<input name="roadmapTitle" placeholder="e.g. Map the first ten community partners" /><small>This creates a planned roadmap item owned by the new member.</small></label>
            <footer><button type="button" className="secondary-button" onClick={() => onProfile(selectedInvolvement.userId)}>View full profile</button><button type="submit" className="primary-button" disabled={busy}>{busy ? "Adding…" : "Add to team"}</button></footer>
          </form>
        </div>
      )}
      {professionRequestOpen && canRecruit && (
        <RequestProfessionDialog
          project={project}
          initialDraft={professionDraft}
          onClose={() => setProfessionRequestOpen(false)}
          onToast={onToast}
          onRoleCreated={(role) =>
            setProject((current) =>
              current ? { ...current, roles: [...current.roles, role] } : current,
            )
          }
        />
      )}
      {aiAssistOpen && canRecruit && (
        <AiAssistDialog
          project={project}
          onClose={() => setAiAssistOpen(false)}
          onRequestRole={(draft) => {
            setProfessionDraft(draft);
            setAiAssistOpen(false);
            setProfessionRequestOpen(true);
          }}
        />
      )}
    </div>
  );
}

function ProjectsView({
  onCreate,
  onResumeDraft,
  latestProject,
  onComments,
  onProfile,
  onShare,
  onToast,
  onShortlist,
}: {
  onCreate: () => void;
  onResumeDraft: (draft: ContentDraft<ProjectDraftPayload>) => void;
  latestProject: ProjectRecord | null;
  onComments: (project: ProjectRecord) => void;
  onProfile: (userId: string) => void;
  onShare: (project: { id: string; title: string; summary: string }) => void;
  onToast: (message: string) => void;
  onShortlist: (projectId: string) => void;
}) {
  const [records, setRecords] = useState<ProjectRecord[]>([]),
    [discover, setDiscover] = useState<ProjectRecord[]>([]),
    [loading, setLoading] = useState(true),
    [draftCount, setDraftCount] = useState(0),
    [tab, setTab] = useState<"mine" | "drafts" | "involved" | "discover">("mine");
  useEffect(() => {
    const loadDraftCount = () => {
      fetch("/api/drafts?kind=project", { cache: "no-store" })
        .then(response => response.ok ? response.json() : { drafts: [] })
        .then(data => setDraftCount((data.drafts ?? []).length))
        .catch(() => undefined);
    };
    const changed = (event: Event) => {
      if ((event as CustomEvent<{ kind?: string }>).detail?.kind === "project") loadDraftCount();
    };
    loadDraftCount();
    window.addEventListener("n2:drafts-changed", changed);
    return () => window.removeEventListener("n2:drafts-changed", changed);
  }, []);
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/projects?scope=mine&limit=40"),
      fetch("/api/projects?scope=discover&filter=newest&limit=40"),
    ])
      .then(async ([mineResponse, discoverResponse]) => {
        const mineData = mineResponse.ok
            ? await mineResponse.json()
            : { projects: [] },
          discoverData = discoverResponse.ok
            ? await discoverResponse.json()
            : { projects: [] };
        setRecords(mineData.projects ?? []);
        setDiscover(discoverData.projects ?? []);
      })
      .finally(() => setLoading(false));
  }, [latestProject]);
  const allMine =
    latestProject && !records.some((record) => record.id === latestProject.id)
      ? [latestProject, ...records]
      : records;
  const owned = allMine.filter((record) => record.status !== "draft" && record.isOwner !== false),
    involved = allMine.filter((record) => record.status !== "draft" && record.isOwner === false);
  const visible =
    tab === "mine" ? owned : tab === "involved" ? involved : tab === "discover" ? discover : [];
  const empty =
    tab === "mine"
      ? {
          title: "No projects started yet",
          body: "Start an idea and use n2 to build the team around it.",
        }
      : tab === "involved"
        ? {
            title: "You haven’t joined a project yet",
            body: "Explore public projects and find one that needs your skills.",
          }
        : {
            title: "No public projects available",
            body: "New public projects will appear here as the network grows.",
          };
  return (
    <div className="subpage">
      <div className="subpage-head">
        <div>
          <span className="eyebrow">YOUR WORK</span>
          <h1>Projects</h1>
          <p>The ideas you started and the ones you’re helping grow.</p>
        </div>
        <button className="primary-button" onClick={onCreate}>
          <Plus size={18} /> New project
        </button>
      </div>
      <div className={`stats-row ${loading ? "is-loading" : ""}`} aria-busy={loading}>
        <div>
          <strong>{loading ? <span className="loading-stat-value" aria-label="Loading project count" /> : String(owned.length).padStart(2, "0")}</strong>
          <span>Your projects</span>
        </div>
        <div>
          <strong>{loading ? <span className="loading-stat-value" aria-label="Loading involvement count" /> : involved.length}</strong>
          <span>Involved</span>
        </div>
        <div>
          <strong>{loading ? <span className="loading-stat-value" aria-label="Loading public project count" /> : discover.length}</strong>
          <span>Public projects</span>
        </div>
      </div>
      <div
        className="project-library-tabs"
        role="tablist"
        aria-label="Project views"
      >
        <button
          role="tab"
          aria-selected={tab === "mine"}
          className={tab === "mine" ? "active" : ""}
          onClick={() => setTab("mine")}
        >
          My projects <b>{owned.length}</b>
        </button>
        <button
          role="tab"
          aria-selected={tab === "drafts"}
          className={tab === "drafts" ? "active" : ""}
          onClick={() => setTab("drafts")}
        >
          Drafts <b>{draftCount}</b>
        </button>
        <button
          role="tab"
          aria-selected={tab === "involved"}
          className={tab === "involved" ? "active" : ""}
          onClick={() => setTab("involved")}
        >
          Involved <b>{involved.length}</b>
        </button>
        <button
          role="tab"
          aria-selected={tab === "discover"}
          className={tab === "discover" ? "active" : ""}
          onClick={() => setTab("discover")}
        >
          Discover <b>{discover.length}</b>
        </button>
      </div>
      <div className="section-title">
        <h3>
          {tab === "mine"
            ? "Started by you"
            : tab === "drafts"
              ? "Saved project drafts"
            : tab === "involved"
              ? "Projects you’re helping"
              : "Explore the network"}
        </h3>
        {tab !== "discover" && tab !== "drafts" && (
          <button onClick={() => setTab("discover")}>
            Discover projects <ArrowUpRight size={15} />
          </button>
        )}
      </div>
      {tab === "drafts" && <ContentDraftList kind="project" emptyMessage="No project drafts saved yet." onCountChange={setDraftCount} onResume={(draft) => onResumeDraft(draft as ContentDraft<ProjectDraftPayload>)} />}
      {loading && tab !== "drafts" && (
        <LoadingState label="Loading your project workspaces" count={2} />
      )}
      {!loading && tab !== "drafts" &&
        visible.map((record) => (
          <ProjectCard
            key={`${tab}-${record.id}`}
            project={record}
            onShare={onShare}
            onMatch={record.isOwner ? () => onShortlist(record.id) : undefined}
            onComments={onComments}
            onProfile={onProfile}
            onToast={onToast}
            onChanged={(next) => {
              setRecords((rows) =>
                next
                  ? rows.map((row) => (row.id === next.id ? next : row))
                  : rows.filter((row) => row.id !== record.id),
              );
              setDiscover((rows) =>
                next
                  ? rows.map((row) => (row.id === next.id ? next : row))
                  : rows.filter((row) => row.id !== record.id),
              );
            }}
          />
        ))}
      {!loading && tab !== "drafts" && !visible.length && (
        <div className="empty-meets project-library-empty">
          <BriefcaseBusiness size={20} />
          <strong>{empty.title}</strong>
          <p>{empty.body}</p>
          {tab !== "discover" && (
            <button
              className="secondary-button"
              onClick={() => setTab("discover")}
            >
              Discover projects
            </button>
          )}
        </div>
      )}
    </div>
  );
}

type NetworkNodeRecord = {
  kind: "person";
  id: string;
  name: string | null;
  image: string | null;
  profession: string | null;
  industry: string | null;
  primary_skill: string | null;
  secondary_skill: string | null;
  tertiary_skill: string | null;
  bio: string | null;
  location: string | null;
  mutual: boolean;
  is_following: boolean;
  follows_viewer: boolean;
  can_expand: boolean;
  degree: 1 | 2;
  shared_by: string | null;
  category: string;
  relevance: number;
  reasons: string[];
  introduction_eligible: boolean;
  connected_to_focus: boolean;
  focus_follows: boolean;
  follows_focus: boolean;
};
type NetworkClusterRecord = {
  kind: "cluster";
  id: string;
  category: string;
  label: string;
  count: number;
  sample: string[];
  degree: 1 | 2;
};
type NetworkGraphNode = NetworkNodeRecord | NetworkClusterRecord;
type NetworkEdgeRecord = { source: string; target: string; mutual: boolean; aggregate?: boolean };
type NetworkGraphRecord = {
  mode?: "overview" | "focus";
  current: Record<string, unknown> | null;
  nodes: NetworkGraphNode[];
  edges: NetworkEdgeRecord[];
  totals?: { visible: number; rendered: number; aggregated: number; hidden: number };
  list?: { items: NetworkNodeRecord[]; cursor: string | null; nextCursor: string | null; total: number; page: number; pageCount: number; from: number; to: number };
  viewport?: { minScale: number; maxScale: number; suggestedScale: number };
  preferences?: { showNetworkKey: boolean };
  focus?: {
    id: string;
    expanded: boolean;
    visibleCount: number;
    followingCount: number;
    followerCount: number;
    reason: "private" | "not-following" | null;
  } | null;
};
type IncomingIntroduction = { id: string; context: string; status: string; expires_at: string; requester_name: string | null; requester_image: string | null; requester_profession: string | null; target_name: string | null; target_image: string | null; target_profession: string | null };
const signalNetworkChanged = () =>
  window.dispatchEvent(new Event("n2:network-changed"));
const networkColour = (category: string) =>
  ({
    Finance: "#1f9d68",
    Technology: "#4f6dff",
    "Design & creative": "#9a63d5",
    Education: "#d39a2c",
    "Operations & community": "#e8683f",
    Other: "#657078",
  })[category] ?? "#657078";

function NetworkView({
  currentMember,
  onProfile,
}: {
  currentMember: MemberPerson;
  onProfile: (id: string) => void;
}) {
  const [data, setData] = useState<NetworkGraphRecord>({
      current: null,
      nodes: [],
      edges: [],
    }),
    [loading, setLoading] = useState(true),
    [focusLoading, setFocusLoading] = useState(false),
    [overviewData, setOverviewData] = useState<NetworkGraphRecord | null>(null),
    [showKey, setShowKey] = useState(true),
    [displayMenuOpen, setDisplayMenuOpen] = useState(false),
    [showConnections, setShowConnections] = useState(true),
    [showFollowing, setShowFollowing] = useState(true),
    [showFollowers, setShowFollowers] = useState(false),
    [activeCluster, setActiveCluster] = useState(""),
    [viewport, setViewport] = useState({ scale: 0.9, panX: 0, panY: 0 }),
    [canvasSize, setCanvasSize] = useState({ width: 1280, height: 720 }),
    [mapInteracting, setMapInteracting] = useState(false),
    [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null),
    [sheetLevel, setSheetLevel] = useState<"collapsed" | "mid" | "full">("mid"),
    [detailTab, setDetailTab] = useState<"profile" | "connections">("profile"),
    [connectionPageLoading, setConnectionPageLoading] = useState(false),
    [whyReasons, setWhyReasons] = useState<string[]>([]),
    [introTarget, setIntroTarget] = useState<NetworkNodeRecord | null>(null),
    [incomingIntroduction, setIncomingIntroduction] = useState<IncomingIntroduction | null>(null),
    [profession, setProfession] = useState("All professions"),
    [skill, setSkill] = useState(""),
    [mobileSearchOpen, setMobileSearchOpen] = useState(false),
    [selected, setSelected] = useState<NetworkNodeRecord | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>()),
    canvasRef = useRef<HTMLDivElement | null>(null),
    gesture = useRef<{ distance: number; scale: number } | null>(null),
    sheetDrag = useRef<number | null>(null),
    previousViewport = useRef<{ scale: number; panX: number; panY: number } | null>(null),
    lastGraphQuery = useRef("overview|||All professions|"),
    panFrame = useRef<number | null>(null),
    pendingPan = useRef({ x: 0, y: 0 });
  const currentFocusId = data.focus?.id;
  useEffect(() => {
    const loadGraph = () => {
      setLoading(true);
      fetch("/api/network/graph", { cache: "no-store" })
      .then((response) =>
        response.ok ? response.json() : { current: null, nodes: [], edges: [] },
      )
      .then((next) => {
        setData(next);
        setOverviewData(next);
        setShowKey(next.preferences?.showNetworkKey ?? true);
        setSelected((current) =>
          current
            ? (next.nodes.find((node: NetworkGraphNode) => node.kind === "person" && node.id === current.id) as NetworkNodeRecord | undefined) ?? null
            : null,
        );
        setViewport({ scale: next.viewport?.suggestedScale ?? 0.9, panX: 0, panY: 0 });
      })
      .finally(() => setLoading(false));
    };
    loadGraph();
    window.addEventListener("n2:network-changed", loadGraph);
    return () => window.removeEventListener("n2:network-changed", loadGraph);
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const min = data.viewport?.minScale ?? .45, max = data.viewport?.maxScale ?? 2.2;
      setViewport((current) => ({ ...current, scale: Math.min(max, Math.max(min, current.scale + (event.deltaY > 0 ? -.1 : .1))) }));
    };
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [data.viewport?.maxScale, data.viewport?.minScale]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const measure = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) setCanvasSize({ width: Math.round(rect.width), height: Math.round(rect.height) });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    measure();
    return () => {
      observer.disconnect();
      if (panFrame.current !== null) cancelAnimationFrame(panFrame.current);
    };
  }, []);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("introduction");
    if (!id) return;
    fetch(`/api/network/introductions/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((record) => { if (record?.status === "pending") setIncomingIntroduction(record); })
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    const queryKey = `${currentFocusId ? "focus" : "overview"}|${currentFocusId ?? ""}|${skill.trim()}|${profession}|${activeCluster}`;
    if (lastGraphQuery.current === queryKey) return;
    lastGraphQuery.current = queryKey;
    const controller = new AbortController(), timer = window.setTimeout(() => {
      const params = new URLSearchParams({ mode: currentFocusId ? "focus" : "overview" });
      if (currentFocusId) params.set("focus", currentFocusId);
      if (skill.trim()) params.set("query", skill.trim());
      if (profession !== "All professions") params.set("cluster", profession);
      if (activeCluster) params.set("cluster", activeCluster);
      setFocusLoading(true);
      fetch(`/api/network/graph?${params}`, { cache: "no-store", signal: controller.signal })
        .then((response) => response.ok ? response.json() : null)
        .then((next) => {
          if (!next) return;
          setData(next);
          setSelected((current) => current ? ((next.nodes.find((node: NetworkGraphNode) => node.kind === "person" && node.id === current.id) as NetworkNodeRecord | undefined) ?? current) : null);
          if (!currentFocusId) setViewport((current) => ({ ...current, scale: next.viewport?.suggestedScale ?? current.scale, panX: 0, panY: 0 }));
        })
        .catch(() => undefined)
        .finally(() => setFocusLoading(false));
    }, 280);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [skill, profession, activeCluster, currentFocusId]);
  async function selectNetworkNode(node: NetworkNodeRecord) {
    setSelected(node);
    setSheetLevel("mid");
    if (!node.is_following) return;
    setFocusLoading(true);
    try {
      const response = await fetch(`/api/network/graph?focus=${encodeURIComponent(node.id)}`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const next = (await response.json()) as NetworkGraphRecord;
      lastGraphQuery.current = skill.trim() || profession !== "All professions" || activeCluster
        ? ""
        : `focus|${node.id}||All professions|`;
      setData(next);
      setViewport({ scale: 1, panX: 0, panY: 0 });
      setSelected((next.nodes.find((item) => item.kind === "person" && item.id === node.id) as NetworkNodeRecord | undefined) ?? node);
      setShowKey(next.preferences?.showNetworkKey ?? true);
      setActiveCluster("");
      setDetailTab("profile");
      setWhyReasons([]);
    } finally {
      setFocusLoading(false);
    }
  }
  async function closeNetworkBrief() {
    setSelected(null);
    if (!data.focus) return;
    await restoreDefaultView();
  }
  async function restoreDefaultView() {
    setSelected(null);
    setDetailTab("profile");
    setDisplayMenuOpen(false);
    setProfession("All professions");
    setSkill("");
    lastGraphQuery.current = "overview|||All professions|";
    if (overviewData) setData(overviewData);
    const response = await fetch("/api/network/graph", { cache: "no-store" });
    if (response.ok) {
      const next = (await response.json()) as NetworkGraphRecord;
      setData(next);
      setOverviewData(next);
    }
    setActiveCluster("");
    setViewport({ scale: 0.9, panX: 0, panY: 0 });
  }
  async function toggleNetworkKey() {
    const next = !showKey;
    setShowKey(next);
    const response = await fetch("/api/privacy", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ showNetworkKey: next }),
    });
    if (!response.ok) setShowKey(!next);
  }
  const categories = [
      "All professions",
      ...Array.from(new Set(data.nodes.map((node) => node.category))).sort(),
    ],
    allNodes = data.nodes,
    focusedId = data.focus?.id,
    nodes = allNodes.filter((node) => {
      if (node.kind === "cluster") return !focusedId || showFollowing;
      if (node.id === focusedId) return true;
      if (node.degree === 2) return showFollowing && node.focus_follows;
      if (node.is_following) return showFollowing;
      return showFollowers && node.follows_viewer;
    }),
    peopleNodes = nodes.filter((node): node is NetworkNodeRecord => node.kind === "person"),
    secondDegreeNodes = peopleNodes.filter((node) => node.degree === 2),
    secondDegreeSet = new Set(secondDegreeNodes.map((node) => node.id)),
    activePathNodeId = hoveredNodeId ?? selected?.id ?? null,
    visible = new Set([
      currentMember.id ?? "",
      ...nodes.map((node) => node.id),
    ]),
    edges = showConnections ? data.edges.filter(
      (edge) => visible.has(edge.source) && visible.has(edge.target),
    ) : [];
  const positions = new Map<string, { x: number; y: number }>();
  const overviewPeople = (overviewData?.nodes ?? allNodes).filter((node): node is NetworkNodeRecord => node.kind === "person"),
    defaultFrameIds = overviewPeople.filter((node) => node.is_following).map((node) => node.id),
    defaultFrameSet = new Set(defaultFrameIds),
    focusNode = peopleNodes.find((node) => node.id === focusedId),
    aspectScale = Math.max(.7, canvasSize.width / canvasSize.height),
    overviewRings = [{ capacity: 8, radius: 21 }, { capacity: 14, radius: 32 }, { capacity: 20, radius: 42 }, { capacity: 28, radius: 49 }];
  let overviewOffset = 0;
  overviewRings.forEach((ring, ringIndex) => {
    const ringIds = defaultFrameIds.slice(overviewOffset, overviewOffset + ring.capacity);
    ringIds.forEach((id, index) => {
      const angle = -Math.PI / 2 + (index / Math.max(1, ringIds.length)) * Math.PI * 2 + ringIndex * .13;
      positions.set(id, { x: 50 + Math.cos(angle) * ring.radius / aspectScale, y: 50 + Math.sin(angle) * ring.radius });
    });
    overviewOffset += ringIds.length;
  });
  const followerOnlyNodes = peopleNodes.filter((node) => node.degree === 1 && !defaultFrameSet.has(node.id));
  followerOnlyNodes.forEach((node, index) => {
    const angle = -Math.PI / 2 + ((index + .5) / Math.max(1, followerOnlyNodes.length)) * Math.PI * 2;
    positions.set(node.id, { x: 50 + Math.cos(angle) * 46 / aspectScale, y: 50 + Math.sin(angle) * 46 });
  });
  const releasedNodes = nodes.filter((node) => node.id !== focusedId && (node.kind === "cluster" || node.degree === 2));
  const focusAnchor = focusNode ? (positions.get(focusNode.id) ?? { x: 50, y: 19 }) : { x: 50, y: 19 },
    focusAnchorX = focusAnchor.x,
    focusAnchorY = focusAnchor.y,
    selectedPanelOpen = Boolean(selected),
    releasedNodeKey = releasedNodes.map((node) => node.id).join("|"),
    obstaclePointKey = peopleNodes
      .filter((node) => node.degree === 1 && node.id !== focusedId)
      .map((node) => positions.get(node.id))
      .filter((point): point is { x: number; y: number } => Boolean(point))
      .map((point) => `${point.x},${point.y}`)
      .join(";");
  const focusLayout = useMemo(() => {
    if (!focusedId) return null;
    const width = canvasSize.width, height = canvasSize.height,
      compact = width <= 560,
      toolbarWidth = compact ? width - 20 : Math.min(720, width - 36),
      toolbarHeight = compact ? 220 : 118,
      reservedRects = [
        { x: width / 2 - 92, y: height / 2 - 78, width: 184, height: 156 },
      ];
    if (mobileSearchOpen) reservedRects.push({ x: width / 2 - toolbarWidth / 2, y: height / 2 + 46, width: toolbarWidth, height: toolbarHeight });
    if (selectedPanelOpen) {
      if (compact) {
        const sheetHeight = sheetLevel === "full" ? height * .88 : sheetLevel === "mid" ? height * .48 : 104;
        reservedRects.push({ x: 0, y: height - sheetHeight, width, height: sheetHeight });
      } else reservedRects.push({ x: width - 292, y: Math.max(0, height - 440), width: 292, height: 440 });
    }
    return layoutFocusedNetwork({
      width,
      height,
      anchor: { x: focusAnchorX, y: focusAnchorY },
      nodeIds: releasedNodeKey ? releasedNodeKey.split("|") : [],
      obstaclePoints: obstaclePointKey ? obstaclePointKey.split(";").map((value) => {
        const [x, y] = value.split(",").map(Number);
        return { x, y };
      }) : [],
      reservedRects,
    });
  }, [canvasSize.height, canvasSize.width, focusAnchorX, focusAnchorY, focusedId, mobileSearchOpen, obstaclePointKey, releasedNodeKey, selectedPanelOpen, sheetLevel]);
  if (focusLayout) Object.entries(focusLayout.positions).forEach(([id, position]) => positions.set(id, position));
  useEffect(() => {
    if (!focusedId) return;
    setViewport({ scale: 1, panX: 0, panY: 0 });
  }, [canvasSize.height, canvasSize.width, focusedId, mobileSearchOpen, selectedPanelOpen, sheetLevel, showFollowers, showFollowing]);
  const basePoint = (id: string) => id === currentMember.id
    ? { x: 50, y: 50 }
    : (positions.get(id) ?? { x: 50, y: 50 });
  const point = (id: string) => {
    const base = basePoint(id);
    if (id === currentMember.id) return base;
    return { x: 50 + (base.x - 50) * viewport.scale + viewport.panX, y: 50 + (base.y - 50) * viewport.scale + viewport.panY };
  };
  const clampScale = (value: number) => Math.min(data.viewport?.maxScale ?? 2.2, Math.max(data.viewport?.minScale ?? 0.45, value));
  const zoomBy = (amount: number) => setViewport((current) => ({ ...current, scale: clampScale(current.scale + amount) }));
  const fitView = () => setViewport({ scale: focusedId ? 1 : data.viewport?.suggestedScale ?? 0.9, panX: 0, panY: 0 });
  const onMapPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button,input,select,aside")) return;
    setMapInteracting(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale: viewport.scale };
    }
  };
  const onMapPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2 && gesture.current) {
      const [a, b] = [...pointers.current.values()], distance = Math.hypot(a.x - b.x, a.y - b.y);
      setViewport((current) => ({ ...current, scale: clampScale(gesture.current!.scale * distance / Math.max(1, gesture.current!.distance)) }));
      return;
    }
    if (pointers.current.size === 1) {
      const rect = event.currentTarget.getBoundingClientRect();
      pendingPan.current.x += (event.clientX - previous.x) / rect.width * 100;
      pendingPan.current.y += (event.clientY - previous.y) / rect.height * 100;
      if (panFrame.current === null) panFrame.current = requestAnimationFrame(() => {
        const delta = pendingPan.current;
        pendingPan.current = { x: 0, y: 0 };
        panFrame.current = null;
        setViewport((current) => ({ ...current, panX: current.panX + delta.x, panY: current.panY + delta.y }));
      });
    }
  };
  const onMapPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) gesture.current = null;
    if (pointers.current.size === 0) setMapInteracting(false);
  };
  async function explainConnection() {
    if (!selected) return;
    const params = new URLSearchParams({ target: selected.id });
    if (selected.shared_by) params.set("via", selected.shared_by);
    const response = await fetch(`/api/network/explain?${params}`);
    if (response.ok) setWhyReasons((await response.json()).reasons ?? []);
  }
  async function requestIntroduction(fields: Record<string, string>) {
    if (!introTarget?.shared_by) return;
    const response = await fetch("/api/network/introductions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ connectorId: introTarget.shared_by, targetId: introTarget.id, context: fields.context }) });
    if (response.ok) setIntroTarget(null);
  }
  async function respondToIntroduction(action: "accept" | "decline") {
    if (!incomingIntroduction) return;
    const response = await fetch(`/api/network/introductions/${encodeURIComponent(incomingIntroduction.id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
    if (!response.ok) return;
    const result = await response.json();
    setIncomingIntroduction(null);
    window.history.replaceState({}, "", "/?view=network");
    if (result.conversationId) window.location.assign("/?view=messages");
  }
  async function loadConnectionPage(cursor: string | null) {
    if (connectionPageLoading) return;
    const params = new URLSearchParams({ mode: data.focus ? "focus" : "overview" });
    if (data.focus?.id) params.set("focus", data.focus.id);
    if (cursor) params.set("cursor", cursor);
    if (skill.trim()) params.set("query", skill.trim());
    if (profession !== "All professions") params.set("cluster", profession);
    setConnectionPageLoading(true);
    try {
      const response = await fetch(`/api/network/graph?${params}`, { cache: "no-store" });
      if (response.ok) setData(await response.json());
    } finally {
      setConnectionPageLoading(false);
    }
  }
  return (
    <div className="subpage network-page">
      <div className="network-page-heading">
        <div>
          <span className="eyebrow">YOUR NETWORK</span>
          <h1>Networks</h1>
          <p>Explore the people, professions and skills connected to you.</p>
        </div>
        <div className="network-count">
          <strong>{loading ? <span className="loading-stat-value" aria-label="Loading connection count" /> : data.totals?.visible ?? peopleNodes.length}</strong>
          <span>visible connections</span>
        </div>
      </div>
      <div className="network-workspace">
        <div
          ref={canvasRef}
          className={`network-canvas${mapInteracting ? " is-interacting" : ""} density-${nodes.length > 42 ? "extreme" : nodes.length > 24 ? "dense" : nodes.length > 12 ? "busy" : "calm"} semantic-${viewport.scale < .7 ? "far" : viewport.scale < 1.2 ? "medium" : "near"}`}
          role="application"
          tabIndex={0}
          aria-label="Interactive network map. Use plus and minus to zoom, or drag to pan."
          onPointerDown={onMapPointerDown}
          onPointerMove={onMapPointerMove}
          onPointerUp={onMapPointerUp}
          onPointerCancel={onMapPointerUp}
          onKeyDown={(event) => {
            if (event.key === "+" || event.key === "=") zoomBy(.1);
            if (event.key === "-") zoomBy(-.1);
            if (event.key === "0") fitView();
          }}
        >
          {showKey ? (
            <div className="network-legend" aria-label="Network key">
              {categories.slice(1).map((category) => (
                <span key={category}>
                  <i style={{ background: networkColour(category) }} />
                  {category}
                </span>
              ))}
              <span className="line-key solid">Mutual</span>
              <span className="line-key dashed">One-way follow</span>
              {secondDegreeNodes.length > 0 && (
                <span className="line-key discovered">Member connection</span>
              )}
              <button onClick={toggleNetworkKey} aria-label="Hide network key">
                <EyeOff size={12} /> Hide key
              </button>
            </div>
          ) : (
            <button className="network-key-show" onClick={toggleNetworkKey}>
              <Eye size={13} /> Show key
            </button>
          )}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {focusNode && focusLayout && releasedNodes.length > 0 && (() => {
              const centre = point(focusNode.id);
              return (
                <g className="network-node-orbits">
                  {releasedNodes.length > 8 && <ellipse cx={centre.x} cy={centre.y} rx={focusLayout.orbit.rx * viewport.scale * .62} ry={focusLayout.orbit.ry * viewport.scale * .62} />}
                  <ellipse className="outer" cx={centre.x} cy={centre.y} rx={focusLayout.orbit.rx * viewport.scale} ry={focusLayout.orbit.ry * viewport.scale} />
                </g>
              );
            })()}
            {edges.map((edge, index) => {
              const a = point(edge.source),
                b = point(edge.target),
                discovered = secondDegreeNodes.some(
                  (node) => node.id === edge.source || node.id === edge.target,
                ),
                focusPrimary = Boolean(focusedId) && (
                  edge.source === focusedId && secondDegreeSet.has(edge.target) ||
                  edge.target === focusedId && secondDegreeSet.has(edge.source)
                ),
                focusCrossLink = Boolean(focusedId) && !focusPrimary && (secondDegreeSet.has(edge.source) || secondDegreeSet.has(edge.target)),
                adjacent = Boolean(activePathNodeId) && (edge.source === activePathNodeId || edge.target === activePathNodeId),
                subdued = Boolean(activePathNodeId) && !adjacent;
              return (
                <line
                  key={`${edge.source}-${edge.target}-${index}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  className={`${edge.mutual ? "mutual" : "following"}${discovered ? " discovered" : ""}${focusPrimary ? " focus-primary" : ""}${focusCrossLink ? " focus-cross-link" : ""}${focusedId && !focusPrimary && !focusCrossLink ? " focus-backdrop" : ""}${adjacent ? " path-adjacent" : ""}${subdued ? " path-subdued" : ""}`}
                />
              );
            })}
          </svg>
          <button
            className="network-node network-self network-self-search"
            style={
              {
                left: `${point(currentMember.id ?? "").x}%`,
                top: `${point(currentMember.id ?? "").y}%`,
                "--node-colour": "#111",
              } as React.CSSProperties
            }
            onClick={() => setMobileSearchOpen((open) => { if (open) setDisplayMenuOpen(false); return !open; })}
            aria-expanded={mobileSearchOpen}
            aria-label="Search your network"
          >
            <Avatar
              person={{
                name: currentMember.name,
                role: currentMember.role ?? "Member",
                img: currentMember.img,
              }}
              size="lg"
              expandable={false}
            />
            <i className="network-self-search-icon" aria-hidden="true"><Search size={28} /></i>
          </button>
          {focusNode && (
            <div className="network-focus-label" style={{ left: `${point(focusNode.id).x}%`, top: `${Math.max(5, point(focusNode.id).y - 11)}%` }}>
              <strong>{focusNode.name}&apos;s network</strong>
              <span>{data.focus?.followingCount ?? releasedNodes.length} following · {releasedNodes.length} shown</span>
            </div>
          )}
          {focusedId && !mobileSearchOpen && (
            <button className="network-back-float" onClick={restoreDefaultView}>
              <ArrowLeft size={14} /> Default view
            </button>
          )}
          <div className={`network-floating-tools network-map-toolbar ${mobileSearchOpen ? "search-open" : "search-closed"}`} aria-hidden={!mobileSearchOpen}>
            <label className="network-search">
              <Search size={16} />
              <input
                value={skill}
                onChange={(event) => setSkill(event.target.value)}
                placeholder="Search people or skills"
                aria-label="Search people across n2"
              />
              {skill && (
                <button onClick={() => setSkill("")} aria-label="Clear search">
                  <X size={14} />
                </button>
              )}
            </label>
            <label className="network-profession-filter">
              <NetworkGraphIcon size={16} />
              <N2Select compact value={profession} onValueChange={setProfession} ariaLabel="Filter network by profession" options={categories.map(value=>({value,label:value}))}/>
            </label>
            {(skill || profession !== "All professions") && (
              <button
                className="network-clear"
                onClick={() => {
                  setProfession("All professions");
                  setSkill("");
                }}
              >
                Clear
              </button>
            )}
            {activeCluster && <button className="network-clear" onClick={() => { setActiveCluster(""); setProfession("All professions"); if (previousViewport.current) setViewport(previousViewport.current); previousViewport.current = null; }}>Back to network</button>}
            {focusedId && <button className="network-back-default" onClick={restoreDefaultView}><ArrowLeft size={14} /> Default view</button>}
            <div className="network-zoom-controls" aria-label="Map zoom controls">
              <button onClick={() => zoomBy(.12)} aria-label="Zoom in"><Plus size={15} /></button>
              <button onClick={() => zoomBy(-.12)} aria-label="Zoom out"><Minus size={15} /></button>
              <button onClick={fitView} aria-label="Fit network to view"><NetworkGraphIcon size={15} /></button>
              <div className="network-display-menu">
                <button onClick={() => setDisplayMenuOpen((open) => !open)} aria-label="Network display options" aria-expanded={displayMenuOpen}><List size={15} /></button>
                {displayMenuOpen && <div className="network-display-popover" role="menu" aria-label="Network display options">
                  <strong>Display</strong>
                  <button className={showConnections ? "active" : ""} aria-pressed={showConnections} onClick={() => setShowConnections((value) => !value)}><span>See connections</span><i>{showConnections ? "On" : "Off"}</i></button>
                  <button className={showKey ? "active" : ""} aria-pressed={showKey} onClick={toggleNetworkKey}><span>Show key</span><i>{showKey ? "On" : "Off"}</i></button>
                  <button className={showFollowing ? "active" : ""} aria-pressed={showFollowing} onClick={() => setShowFollowing((value) => !value)}><span>Show following</span><i>{showFollowing ? "On" : "Off"}</i></button>
                  <button className={showFollowers ? "active" : ""} aria-pressed={showFollowers} onClick={() => setShowFollowers((value) => !value)}><span>Show followers<small>People you do not follow back</small></span><i>{showFollowers ? "On" : "Off"}</i></button>
                </div>}
              </div>
            </div>
          </div>
          {nodes.map((node) => {
            const position = point(node.id), category = node.category;
            if (node.kind === "cluster") return (
              <button
                key={node.id}
                className="network-node network-cluster-node"
                style={{ left: `${position.x}%`, top: `${position.y}%`, "--node-colour": networkColour(category) } as React.CSSProperties}
                onClick={() => { previousViewport.current = viewport; setActiveCluster(node.category); setProfession(node.category); }}
                aria-label={`Explore ${node.count} more ${node.label} connections`}
              >
                <i><strong>{node.count}</strong><small>more</small></i>
                <span>{node.label}</span>
                <small>{node.sample.filter(Boolean).slice(0, 2).join(" · ")}</small>
              </button>
            );
            return (
              <button
                key={node.id}
                className={`network-node ${node.degree === 2 ? "second-degree" : "direct"} ${data.focus && node.degree === 1 && data.focus.id !== node.id ? "network-backdrop-node" : ""} ${data.focus && !node.connected_to_focus && data.focus.id !== node.id ? "network-context-node" : ""} ${data.focus?.id === node.id ? "network-focus" : ""} ${selected?.id === node.id ? "selected" : ""}`}
                style={
                  {
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                    "--node-colour": networkColour(category),
                  } as React.CSSProperties
                }
                onClick={() => { setSelected(node); if (node.is_following) selectNetworkNode(node); }}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                onFocus={() => setHoveredNodeId(node.id)}
                onBlur={() => setHoveredNodeId(null)}
                aria-label={`${node.name ?? "n2 member"}. ${node.reasons.join(". ")}`}
              >
                <Avatar
                  person={{
                    name: node.name ?? "n2 member",
                    role: node.profession ?? "Member",
                    img: node.image,
                  }}
                  size="lg"
                  expandable={false}
                />
                <span>{node.name}</span>
                <small>{category}</small>
                {node.degree === 2 && <em>via {peopleNodes.find((item) => item.id === node.shared_by)?.name ?? "your network"}</em>}
                {data.focus && !node.connected_to_focus && data.focus.id !== node.id && <em>your connection</em>}
              </button>
            );
          })}
          {loading && (
            <LoadingState label="Mapping your network" variant="network" className="network-loading-state" />
          )}
          {!loading && focusLoading && (
            <div className="network-map-status">Mapping your network…</div>
          )}
          {!loading && !data.nodes.length && (
            <div className="network-map-status network-cold-start">
              <NetworkGraphIcon size={28} />
              <strong>Your community starts with one connection</strong>
              <p>
                Connect with a member from their profile. They will appear
                around you here.
              </p>
            </div>
          )}
          {!loading && data.nodes.length && !nodes.length && (
            <div className="network-map-status">
              <strong>No connections match these filters</strong>
              <button
                onClick={() => {
                  setProfession("All professions");
                  setSkill("");
                }}
              >
                Show everyone
              </button>
            </div>
          )}
          {selected && (
            <aside className={`network-brief sheet-${sheetLevel}${detailTab === "connections" ? " connections-open" : ""}`}>
              <button className="network-sheet-handle" aria-label={`${sheetLevel === "full" ? "Collapse" : "Expand"} member details`} onClick={() => setSheetLevel((level) => level === "collapsed" ? "mid" : level === "mid" ? "full" : "collapsed")} onPointerDown={(event) => { sheetDrag.current = event.clientY; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerUp={(event) => { if (sheetDrag.current === null) return; const delta = event.clientY - sheetDrag.current; if (delta < -30) setSheetLevel((level) => level === "collapsed" ? "mid" : "full"); if (delta > 30) setSheetLevel((level) => level === "full" ? "mid" : "collapsed"); sheetDrag.current = null; }}><i /></button>
              <button
                className="network-brief-close"
                onClick={closeNetworkBrief}
                aria-label="Close member details"
              >
                <X size={15} />
              </button>
              <div className="network-sheet-summary">
                <Avatar person={{ name: selected.name ?? "n2 member", role: selected.profession ?? "Member", img: selected.image }} size="lg" ring expandable />
                <span><b className="network-connection-state">{selected.mutual ? "Mutual connection" : selected.is_following ? "You follow this member" : selected.degree === 2 ? "Member of member" : "Follows you"}</b><h2>{selected.name}</h2><small>{selected.profession ?? "n2 member"}{selected.location ? ` · ${selected.location}` : ""}</small></span>
              </div>
              <div className="network-sheet-tabs" role="tablist">
                <button className={detailTab === "profile" ? "active" : ""} onClick={() => setDetailTab("profile")} role="tab">Profile</button>
                <button className={detailTab === "connections" ? "active" : ""} onClick={() => setDetailTab("connections")} role="tab">Connections {data.list?.total ?? 0}</button>
              </div>
              {detailTab === "profile" ? <>
                <p>{selected.bio ?? "Open their profile to learn more about the contribution they make."}</p>
                <div className="network-skill-list">{[selected.primary_skill, selected.secondary_skill, selected.tertiary_skill].filter(Boolean).map((value) => <span key={value!}>{value}</span>)}</div>
                {selected.is_following && data.focus?.id === selected.id && <div className={`network-release ${data.focus.expanded ? "released" : "private"}`}><UsersRound size={15} /><span><strong>{data.focus.expanded ? `${data.focus.followingCount} following · ${data.focus.followerCount} followers` : "Connections kept private"}</strong><small>{data.focus.expanded ? "Shown with every member’s privacy choices applied." : "This member has chosen not to share their network."}</small></span></div>}
                <div className="network-reasons">
                  <button onClick={explainConnection}><CircleHelp size={14} /> Why you see this person</button>
                  {(whyReasons.length ? whyReasons : selected.reasons).map((reason) => <small key={reason}>{reason}</small>)}
                </div>
                {selected.introduction_eligible && <div className="network-brief-actions">
                  <button
                    className="secondary-button network-introduction-button"
                    onClick={() => setIntroTarget(selected)}
                  >
                    <UserPlus size={14} aria-hidden="true" />
                    <span>Ask for an introduction</span>
                  </button>
                </div>}
                <button className="primary-button wide" onClick={() => { fetch("/api/network/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event: "profile_opened", targetId: selected.id }), keepalive: true }).catch(() => undefined); onProfile(selected.id); }}>View full profile <ArrowUpRight size={15} /></button>
              </> : <div className={`network-connection-list${connectionPageLoading ? " is-loading" : ""}`} role="tabpanel" aria-busy={connectionPageLoading}>
                <div className="network-connection-page">
                  {(data.list?.items ?? []).map((item) => <button key={item.id} onClick={() => setSelected(item)}><Avatar person={{ name: item.name ?? "n2 member", role: item.profession ?? "Member", img: item.image }} size="sm" /><span><strong>{item.name}</strong><small>{item.reasons[0]}</small></span><ArrowUpRight size={14} /></button>)}
                  {!data.list?.items.length && <p>No visible connections in this view.</p>}
                </div>
                <footer><button disabled={connectionPageLoading || !data.list?.cursor} onClick={() => loadConnectionPage(data.list?.cursor ?? null)}><ChevronLeft size={14} /> Previous</button><small aria-live="polite">{connectionPageLoading ? "Loading…" : `${data.list?.from ?? 0}–${data.list?.to ?? 0} of ${data.list?.total ?? 0}`}</small><button disabled={connectionPageLoading || !data.list?.nextCursor} onClick={() => loadConnectionPage(data.list?.nextCursor ?? null)}>Next <ChevronRight size={14} /></button></footer>
              </div>}
            </aside>
          )}
        </div>
      </div>
      {introTarget && <ActionDialog eyebrow="WARM INTRODUCTION" title={`Ask for an introduction to ${introTarget.name ?? "this member"}?`} description="Your mutual connection can accept or decline. If they accept, n2 creates a three-person conversation." confirmLabel="Send request" fields={[{ name: "context", label: "What would you like to explore together?", placeholder: "Share a little context for your connection to consider…", required: true, minLength: 20, maxLength: 500, multiline: true }]} onClose={() => setIntroTarget(null)} onConfirm={requestIntroduction} />}
      {incomingIntroduction && <div className="modal-backdrop action-dialog-backdrop" role="presentation"><section className="n2-editor-modal action-dialog network-introduction-review" role="dialog" aria-modal="true" aria-labelledby="network-introduction-title"><header><div><span className="eyebrow">WARM INTRODUCTION</span><h2 id="network-introduction-title">Would you introduce these members?</h2></div><button className="icon-button" onClick={() => setIncomingIntroduction(null)} aria-label="Close request"><X size={18}/></button></header><div className="network-introduction-people"><Avatar person={{ name: incomingIntroduction.requester_name ?? "n2 member", role: incomingIntroduction.requester_profession ?? "Member", img: incomingIntroduction.requester_image }} size="lg"/><span><strong>{incomingIntroduction.requester_name}</strong><small>would like to meet</small><strong>{incomingIntroduction.target_name}</strong></span><Avatar person={{ name: incomingIntroduction.target_name ?? "n2 member", role: incomingIntroduction.target_profession ?? "Member", img: incomingIntroduction.target_image }} size="lg"/></div><blockquote>{incomingIntroduction.context}</blockquote><p>Accepting creates a named three-person conversation. Declining shares no private reason.</p><footer><button className="secondary-button" onClick={() => respondToIntroduction("decline")}>Decline</button><button className="primary-button" onClick={() => respondToIntroduction("accept")}>Accept and introduce</button></footer></section></div>}
    </div>
  );
}

type ConversationRecord = {
  id: string;
  name: string | null;
  image?: string | null;
  projectId?: string | null;
  archivedAt?: string | null;
  snoozedUntil?: string | null;
  unreadCount?: number;
  members: Array<{
    userId: string;
    username: string;
    name: string | null;
    image: string | null;
    profession: string | null;
    status?: string;
  }>;
  lastMessage?: { body: string; created_at: string } | null;
};
type ChatMessage = {
  id: string;
  body: string;
  attachmentType?: string | null;
  attachmentUrl?: string | null;
  status: string;
  editedAt?: string | null;
  createdAt: string;
  senderId: string;
  senderName: string | null;
  senderImage: string | null;
  senderStatus?: string;
};
function isNudgeMessage(message: ChatMessage) {
  return message.body === "User has been nudged" || message.body.startsWith("⚡ Nudge —");
}
function formatVoiceTime(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, "0")}`;
}
function VoiceNotePlayer({
  src,
  active,
  onPlaybackChange,
}: {
  src: string;
  active: boolean;
  onPlaybackChange: (playing: boolean) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const scrubbingRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const barCount = 24;
  const progress = duration > 0 ? currentTime / duration : 0;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 1;
    if (!active && !audio.paused) audio.pause();
  }, [active]);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 1;
    if (audio.paused) await audio.play();
    else audio.pause();
  }
  function seekTo(nextTime: number) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const boundedTime = Math.min(duration, Math.max(0, nextTime));
    audio.currentTime = boundedTime;
    setCurrentTime(boundedTime);
  }
  function seekFromPointer(event: React.PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    seekTo(((event.clientX - bounds.left) / bounds.width) * duration);
  }
  return (
    <div className={`voice-message ${playing ? "speaking" : ""}`}>
      <button type="button" className="voice-play-button" onClick={togglePlayback} aria-label={playing ? "Pause voice note" : "Play voice note"}>
        {playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
      </button>
      <div
        className="voice-wave voice-scrubber"
        role="slider"
        tabIndex={0}
        aria-label="Scrub voice note"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(currentTime)}
        aria-valuetext={`${formatVoiceTime(currentTime)} of ${formatVoiceTime(duration)}`}
        onPointerDown={(event) => {
          scrubbingRef.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          seekFromPointer(event);
        }}
        onPointerMove={(event) => scrubbingRef.current && seekFromPointer(event)}
        onPointerUp={(event) => {
          scrubbingRef.current = false;
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => { scrubbingRef.current = false; }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") { event.preventDefault(); seekTo(currentTime - 5); }
          if (event.key === "ArrowRight") { event.preventDefault(); seekTo(currentTime + 5); }
          if (event.key === "Home") { event.preventDefault(); seekTo(0); }
          if (event.key === "End") { event.preventDefault(); seekTo(duration); }
        }}
      >
        {Array.from({ length: barCount }, (_, index) => <i className={(index + 1) / barCount <= progress ? "played" : ""} key={index} />)}
      </div>
      <time>{formatVoiceTime(currentTime)} / {formatVoiceTime(duration)}</time>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(event) => { event.currentTarget.volume = 1; setDuration(event.currentTarget.duration); }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => { setPlaying(true); onPlaybackChange(true); }}
        onPause={() => { setPlaying(false); onPlaybackChange(false); }}
        onEnded={() => { setPlaying(false); setCurrentTime(0); onPlaybackChange(false); }}
      />
    </div>
  );
}
function MessagesView({
  currentMember,
  initialConversationId,
  onUnreadCounts,
}: {
  currentMember: MemberPerson;
  initialConversationId?: string | null;
  onUnreadCounts: (unread: number, unreadMessages: number) => void;
}) {
  const [conversationsList, setConversationsList] = useState<
      ConversationRecord[]
    >([]),
    [selected, setSelected] = useState<ConversationRecord | null>(null),
    [messagesList, setMessagesList] = useState<ChatMessage[]>([]),
    [draft, setDraft] = useState(""),
    [query, setQuery] = useState(""),
    [compose, setCompose] = useState(false),
    [memberSearch, setMemberSearch] = useState(""),
    [memberResults, setMemberResults] = useState<
      Array<Record<string, unknown>>
    >([]),
    [chosen, setChosen] = useState<string[]>([]),
    [groupName, setGroupName] = useState(""),
    [attachment, setAttachment] = useState<{
      type: string;
      url: string;
    } | null>(null),
    [typingNames, setTypingNames] = useState<string[]>([]),
    [showArchived, setShowArchived] = useState(false),
    [conversationError, setConversationError] = useState(""),
    [isSending, setIsSending] = useState(false),
    [sendError, setSendError] = useState(""),
    [chatQuery, setChatQuery] = useState(""),
    [showChatSearch, setShowChatSearch] = useState(false),
    [showChatDetails, setShowChatDetails] = useState(false),
    [showAttachments, setShowAttachments] = useState(false),
    [conversationsLoading, setConversationsLoading] = useState(true),
    [messagesLoading, setMessagesLoading] = useState(false),
    [isRecording, setIsRecording] = useState(false),
    [recordingSeconds, setRecordingSeconds] = useState(0),
    [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null),
    [chatDeleteTarget, setChatDeleteTarget] = useState<ConversationRecord | null>(null),
    [editMessageTarget, setEditMessageTarget] = useState<ChatMessage | null>(null),
    [deleteMessageTarget, setDeleteMessageTarget] = useState<ChatMessage | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const messageDraftRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingSecondsRef = useRef(0);
  const initialConversationHandled = useRef(false);
  const selectedConversationId = selected?.id;
  const latestMessageId = messagesList.at(-1)?.id;
  const title = (row: ConversationRecord) =>
    row.name ||
    row.members
      .filter((member) => member.userId !== currentMember.id)
      .map((member) => member.name)
      .join(", ") ||
    "Conversation";

  const conversationTitleClass = (row: ConversationRecord) =>
    row.projectId
      ? "conversation-title--project"
      : row.members.length <= 2
        ? "conversation-title--direct"
        : undefined;
  async function load() {
    setConversationsLoading(true);
    try {
      const response = await fetch("/api/conversations"),
        data = await response
          .json()
          .catch(() => ({
            conversations: [],
            error: "Messages could not be loaded.",
          }));
      if (!response.ok)
        setConversationError(data.error ?? "Messages could not be loaded.");
      else {
        setConversationError("");
        setConversationsList(data.conversations ?? []);
      }
    } catch {
      setConversationError("Messages could not be loaded. Check your connection and try again.");
    } finally {
      setConversationsLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (!initialConversationId || initialConversationHandled.current || !conversationsList.length) return;
    initialConversationHandled.current = true;
    const conversation = conversationsList.find((row) => row.id === initialConversationId);
    if (conversation) setSelected(conversation);
  }, [conversationsList, initialConversationId]);
  useEffect(() => {
    if (!selectedConversationId) return;
    fetch("/api/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "read_conversation", conversationId: selectedConversationId }),
    })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (data) {
          onUnreadCounts(data.unread ?? 0, data.unreadMessages ?? 0);
          setConversationsList((rows) => rows.map((row) => row.id === selectedConversationId ? { ...row, unreadCount: 0 } : row));
        }
      })
      .catch(() => undefined);
  }, [onUnreadCounts, selectedConversationId]);
  useEffect(() => {
    if (!selected) return;
    let firstLoad = true;
    let active = true;
    setMessagesList([]);
    setMessagesLoading(true);
    const run = () =>
      Promise.all([
        fetch(`/api/conversations/${selected.id}/messages`).then((r) =>
          r.ok ? r.json() : { messages: [] },
        ),
        fetch(`/api/conversations/${selected.id}/typing`).then((r) =>
          r.ok ? r.json() : { people: [] },
        ),
      ]).then(([messageData, typingData]) => {
        if (!active) return;
        setMessagesList(messageData.messages ?? []);
        setTypingNames(
          (typingData.people ?? []).map(
            (person: { name?: string | null }) => person.name || "Someone",
          ),
        );
      }).catch(() => undefined).finally(() => {
        if (active && firstLoad) {
          firstLoad = false;
          setMessagesLoading(false);
        }
      });
    run();
    const timer = setInterval(run, 2500);
    return () => { active = false; clearInterval(timer); };
  }, [selected]);
  useEffect(() => {
    if (!selected || !draft.trim()) return;
    const ping = () =>
      fetch(`/api/conversations/${selected.id}/typing`, {
        method: "POST",
      }).catch(() => undefined);
    ping();
    const timer = setInterval(ping, 3000);
    return () => clearInterval(timer);
  }, [selected, draft]);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [selectedConversationId, latestMessageId]);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (memberSearch.trim().length < 2) {
        setMemberResults([]);
        return;
      }
      fetch(`/api/search?q=${encodeURIComponent(memberSearch)}`)
        .then((r) => (r.ok ? r.json() : { people: [] }))
        .then((data) => setMemberResults(data.people ?? []));
    }, 250);
    return () => clearTimeout(timer);
  }, [memberSearch]);
  async function send(type: "message" | "nudge" = "message", voice?: { url: string; body: string }) {
    if (
      !selected ||
      isSending ||
      (!draft.trim() && !attachment && !voice && type === "message")
    )
      return;
    setIsSending(true);
    setSendError("");
    try {
      const response = await fetch(
        `/api/conversations/${selected.id}/messages`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            body: voice?.body ?? draft,
            attachmentType: voice ? "audio" : attachment?.type,
            attachmentUrl: voice?.url ?? attachment?.url,
            type,
          }),
        },
      );
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        setSendError(result.error ?? "Your message could not be sent.");
        return;
      }
      setDraft("");
      setAttachment(null);
      const data = await response.json();
      setMessagesList((rows) => [
        ...rows,
        {
          ...data,
          senderId: currentMember.id ?? "",
          senderName: currentMember.name,
          senderImage: currentMember.img,
          status: "visible",
        },
      ]);
    } catch {
      setSendError("Your message could not be sent. Check your connection and try again.");
    } finally {
      setIsSending(false);
    }
  }
  function formatDuration(seconds: number) {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }
  async function startVoiceRecording() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setSendError("Voice messages are not supported by this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordingChunksRef.current = [];
      recordingSecondsRef.current = 0;
      setRecordingSeconds(0);
      recorder.ondataavailable = (event) => event.data.size && recordingChunksRef.current.push(event.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size > 2_000_000) {
          setSendError("Voice messages must be shorter than about two minutes.");
          return;
        }
        const reader = new FileReader();
        reader.onload = () => send("message", { url: String(reader.result), body: `Voice message · ${formatDuration(recordingSecondsRef.current)}` });
        reader.readAsDataURL(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      setSendError("Microphone access is needed to record a voice message.");
    }
  }
  function finishVoiceRecording() {
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    setIsRecording(false);
  }
  useEffect(() => {
    if (!isRecording) return;
    const timer = window.setInterval(() => {
      recordingSecondsRef.current += 1;
      setRecordingSeconds(recordingSecondsRef.current);
      if (recordingSecondsRef.current >= 120) finishVoiceRecording();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRecording]);
  async function conversationAction(
    action: "archive" | "restore" | "snooze" | "delete",
  ) {
    if (!selected) return;
    await fetch("/api/conversations", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        conversationId: selected.id,
        action,
        until:
          action === "snooze"
            ? new Date(Date.now() + 86400000).toISOString()
            : undefined,
      }),
    });
    setSelected(null);
    load();
  }
  async function conversationListAction(row: ConversationRecord, action: "archive" | "restore" | "snooze" | "delete") {
    const response = await fetch("/api/conversations", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        conversationId: row.id,
        action,
      }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setConversationError(result.error ?? "The chat could not be updated.");
      return false;
    }
    setConversationError("");
    await load();
    return true;
  }
  async function updateConversation(action: "rename" | "set_image" | "add_member", values: Record<string, unknown>) {
    if (!selected) return false;
    const response = await fetch("/api/conversations", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conversationId: selected.id, action, ...values }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setConversationError(result.error ?? "The chat could not be updated.");
      return false;
    }
    await load();
    setSelected((row) => {
      if (!row) return row;
      const added = action === "add_member" ? memberResults.find((person) => String(person.id) === values.userId) : null;
      return {
        ...row,
        ...(action === "rename" ? { name: String(values.name || "") || null } : {}),
        ...(action === "set_image" ? { image: values.image as string | null } : {}),
        ...(added ? { members: [...row.members, { userId: String(added.id), username: String(added.username ?? "member"), name: String(added.name ?? "n2 member"), image: added.image as string | null, profession: added.profession as string | null }] } : {}),
      };
    });
    return true;
  }
  function changeChatImage(file?: File) {
    if (!file || file.size > 2_000_000) return;
    const reader = new FileReader();
    reader.onload = () => updateConversation("set_image", { image: String(reader.result) });
    reader.readAsDataURL(file);
  }
  async function createConversation() {
    setConversationError("");
    const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          recipientIds: chosen,
          name: chosen.length > 1 ? groupName || "New group" : undefined,
        }),
      }),
      result = await response
        .json()
        .catch(() => ({ error: "The conversation could not be created." }));
    if (response.ok) {
      setCompose(false);
      setChosen([]);
      setGroupName("");
      await load();
    } else
      setConversationError(
        result.error ?? "The conversation could not be created.",
      );
  }
  async function startCall() {
    if (!selected) return;
    const now = new Date(),
      end = new Date(now.getTime() + 45 * 60000);
    const response = await fetch("/api/calendar/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider: "n2",
        visibility: "private",
        title: `${title(selected)} call`,
        description: "Started from n2 messages",
        startsAt: now.toISOString(),
        endsAt: end.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        attendees: [],
      }),
    });
    if (response.ok) {
      const meet = await response.json();
      window.location.href = meet.joinUrl;
    }
  }
  function attach(file?: File) {
    if (!file || file.size > 2_000_000) return;
    const reader = new FileReader();
    reader.onload = () =>
      setAttachment({
        type: file.type.startsWith("image/")
          ? "image"
          : file.type.startsWith("video/")
            ? "video"
            : "file",
        url: String(reader.result),
      });
    reader.readAsDataURL(file);
  }
  async function saveMessage({ body }: Record<string, string>) {
    if (!editMessageTarget) return false;
    const response = await fetch(`/api/messages/${editMessageTarget.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (response.ok)
      setMessagesList((rows) =>
        rows.map((row) =>
          row.id === editMessageTarget.id
            ? { ...row, body, editedAt: new Date().toISOString() }
            : row,
        ),
      );
    return response.ok;
  }
  async function deleteMessage() {
    if (!deleteMessageTarget) return false;
    const response = await fetch(`/api/messages/${deleteMessageTarget.id}`, {
      method: "DELETE",
    });
    if (response.ok)
      setMessagesList((rows) =>
        rows.map((row) =>
          row.id === deleteMessageTarget.id
            ? {
                ...row,
                body: "Message deleted",
                status: "deleted",
                attachmentUrl: null,
              }
            : row,
        ),
      );
    return response.ok;
  }
  if (selected) {
    const showsMessageSenders = Boolean(selected.projectId) || selected.members.length > 2;
    const inactiveMembers = selected.members.filter(member => member.userId !== currentMember.id && member.status && member.status !== "active");
    const speakingMessage = messagesList.find((message) => message.id === speakingMessageId);
    const status = speakingMessage
      ? `${speakingMessage.senderId === currentMember.id ? "You are" : `${speakingMessage.senderName ?? "Someone"} is`} speaking…`
      : typingNames.length
      ? `${typingNames.join(", ")} ${typingNames.length === 1 ? "is" : "are"} typing…`
      : selected.members.length > 2
        ? `${selected.members.length} members`
        : inactiveMembers.length
          ? "Account deactivated"
          : "Direct conversation";
    const visibleMessages = chatQuery.trim()
      ? messagesList.filter((message) => message.body.toLowerCase().includes(chatQuery.trim().toLowerCase()))
      : messagesList;
    const sharedMedia = messagesList.filter((message) => message.attachmentUrl);
    return (
      <>
      <div className="subpage messages-page conversation-page">
        <div className="conversation-top">
        <div className="conversation-head">
          <button
            className="icon-button border"
            onClick={() => setSelected(null)}
          >
            <ArrowLeft size={18} />
          </button>
          <button className="conversation-identity" onClick={() => { setShowChatDetails(true); setMemberSearch(""); }} aria-label="Open chat details">
            <Avatar person={{ name: title(selected), role: "Conversation", img: selected.image }} size="md" />
            <span>
              <strong className={conversationTitleClass(selected)}>{title(selected)}</strong>
              <small>{status}</small>
            </span>
          </button>
          <button
            className="icon-button border"
            onClick={() => setShowChatSearch((value) => !value)}
            title="Search in chat"
            aria-label="Search in chat"
          >
            <Search size={16} />
          </button>
          <button
            className="icon-button border conversation-meet-button"
            onClick={startCall}
            aria-label={selected.members.length > 2 ? "Start meet" : "Start video call"}
            title={selected.members.length > 2 ? "Start meet" : "Start video call"}
          >
            <Video size={16} />
          </button>
        </div>
        {showChatSearch && <div className="conversation-search"><Search size={15}/><input autoFocus value={chatQuery} onChange={(event) => setChatQuery(event.target.value)} placeholder="Search in this chat"/><button onClick={() => { setChatQuery(""); setShowChatSearch(false); }} aria-label="Close chat search"><X size={15}/></button></div>}
        </div>
        <div className="chat-flow" role="log" aria-live="polite">
          <div className="chat-date">CONVERSATION</div>
          {messagesLoading && <LoadingState label="Loading conversation" variant="list" count={4} className="loading-chat" />}
          {!messagesLoading && !messagesList.length && (
            <div className="chat-empty-state">
              <span>
                <MessageCircle size={23} />
              </span>
              <strong>Start the conversation</strong>
              <p>
                Send a message, share a file, or start with a quick wave.
              </p>
            </div>
          )}
          {chatQuery && !visibleMessages.length && <div className="chat-search-empty">No messages match “{chatQuery}”.</div>}
          {!messagesLoading && visibleMessages.map((message) => isNudgeMessage(message) ? (
            <div className="chat-nudge-event" key={message.id} role="status">User has been nudged</div>
          ) : (
            <div className={`chat-message-row ${message.senderId === currentMember.id ? "mine" : "theirs"}`} key={message.id} tabIndex={message.status === "deleted" ? undefined : 0}>
            {showsMessageSenders && (
              <div className="message-sender">
                <Avatar
                  person={{
                    name: message.senderName ?? "n2 member",
                    role: "Message sender",
                    img: message.senderImage,
                  }}
                  size="sm"
                  expandable={false}
                />
                <strong>{message.senderName ?? "n2 member"}</strong>
                {message.senderStatus && message.senderStatus !== "active" && <small className="account-state-badge">Account no longer active</small>}
              </div>
            )}
            {!showsMessageSenders && message.senderStatus && message.senderStatus !== "active" && <span className="message-account-state">Account no longer active</span>}
            <div
              className={`bubble ${message.senderId === currentMember.id ? "mine" : "theirs"} ${message.status === "deleted" ? "deleted" : ""}`}
            >
              {message.attachmentType === "image" && message.attachmentUrl && (
                <img src={message.attachmentUrl} alt="Message attachment" loading="lazy" decoding="async" />
              )}
              {message.attachmentType === "video" && message.attachmentUrl && (
                <video src={message.attachmentUrl} controls />
              )}
              {message.attachmentType === "file" && message.attachmentUrl && (
                <a href={message.attachmentUrl} download="n2-attachment">
                  Download file
                </a>
              )}
              {message.attachmentType === "audio" && message.attachmentUrl && (
                <VoiceNotePlayer src={message.attachmentUrl} active={speakingMessageId === message.id} onPlaybackChange={(playing) => setSpeakingMessageId((id) => playing ? message.id : id === message.id ? null : id)} />
              )}
              <span><LinkifiedText text={message.body} /></span>
              {message.status !== "deleted" && <RichLinkPreview text={message.body} />}
            </div>
            <div className="message-footer">
              <small className="message-meta">
                <time dateTime={message.createdAt}>
                  {new Date(message.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
                {message.editedAt && " · edited"}
              </small>
              {message.status !== "deleted" && <div className="message-actions">
                {message.senderId === currentMember.id && <><button onClick={() => setEditMessageTarget(message)} title="Edit message" aria-label="Edit message"><Pencil size={11}/><span>Edit</span></button><button onClick={() => setDeleteMessageTarget(message)} title="Delete message" aria-label="Delete message"><Trash2 size={11}/><span>Delete</span></button></>}
              </div>}
            </div>
            </div>
          ))}
          {typingNames.length > 0 && <div className="chat-participant-activity" role="status"><span className="typing-dots" aria-hidden="true"><i/><i/><i/></span><strong>{typingNames.join(", ")}</strong><small>{typingNames.length === 1 ? "is" : "are"} typing</small></div>}
          {speakingMessage && <div className="chat-participant-activity speaking" role="status"><AudioLines size={15}/><strong>{speakingMessage.senderId === currentMember.id ? "You" : speakingMessage.senderName ?? "Someone"}</strong><small>{speakingMessage.senderId === currentMember.id ? "are" : "is"} speaking</small></div>}
          <div ref={chatEndRef} />
        </div>
        <div className="conversation-composer-dock">
          {attachment && (
            <div className="chat-attachment" role="status">
              <span>
                <Paperclip size={14} /> {attachment.type} ready to send
              </span>
              <button
                type="button"
                onClick={() => setAttachment(null)}
                aria-label="Remove attachment"
              >
                <X size={14} />
              </button>
            </div>
          )}
          {sendError && <p className="chat-send-error">{sendError}</p>}
          <form
            className="dm-composer"
            onSubmit={(event) => {
              event.preventDefault();
              if (draft.trim() || attachment) send();
              else if (isRecording) finishVoiceRecording();
              else startVoiceRecording();
            }}
          >
            <div className="dm-add-wrap">
              <button type="button" className={`dm-circle-button dm-add-button ${showAttachments ? "active" : ""}`} onClick={() => setShowAttachments((value) => !value)} aria-label="Add to message" aria-expanded={showAttachments}><Plus size={20}/></button>
              {showAttachments && <div className="dm-attachment-menu" aria-label="Message attachments">
                <EmojiPicker onSelect={(emoji) => { setDraft((value) => `${value}${emoji}`); setShowAttachments(false); }}/>
                <label title="Add image"><ImageIcon size={18}/><span>Photo</span><input type="file" accept="image/*" onChange={(event) => { attach(event.target.files?.[0]); setShowAttachments(false); }}/></label>
                <label title="Add video"><Video size={18}/><span>Video</span><input type="file" accept="video/*" onChange={(event) => { attach(event.target.files?.[0]); setShowAttachments(false); }}/></label>
                <label title="Add file"><Paperclip size={18}/><span>File</span><input type="file" accept=".pdf,.zip,.doc,.docx" onChange={(event) => { attach(event.target.files?.[0]); setShowAttachments(false); }}/></label>
                <button type="button" className="dm-nudge-action" onClick={() => { setShowAttachments(false); send("nudge"); }} disabled={isSending} title="Nudge this conversation"><Zap size={18}/><span>Nudge</span></button>
              </div>}
            </div>
            {selected.members.length > 2 && <MentionSuggestions
              value={draft}
              inputRef={messageDraftRef}
              setValue={setDraft}
              allowedIds={selected.members.filter((member) => member.userId !== currentMember.id).map((member) => member.userId)}
              placement="message"
            />}
            <div className="dm-composer-main">
              {isRecording ? <div className="voice-recording" role="status"><span className="voice-wave recording" aria-hidden="true">{Array.from({length:16},(_,index)=><i key={index}/>)}</span><strong>{formatDuration(recordingSeconds)}</strong><small>Recording voice message</small></div> :
              <textarea
                ref={messageDraftRef}
                rows={1}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    send();
                  }
                }}
                placeholder={`Write a message to ${title(selected)}…`}
                aria-label={`Message ${title(selected)}`}
              />}
            </div>
            <button
              className="dm-circle-button dm-send-button"
              aria-label={draft.trim() || attachment || isRecording ? "Send message" : "Record voice message"}
              title={draft.trim() || attachment || isRecording ? "Send" : "Record voice message"}
              disabled={isSending}
            >
              {draft.trim() || attachment || isRecording ? <ArrowUpRight size={20} strokeWidth={1.8}/> : <Mic size={19}/>}
            </button>
          </form>
        </div>
      </div>
      {showChatDetails && <div className="modal-backdrop chat-details-backdrop" role="presentation"><section className="chat-details-panel" role="dialog" aria-modal="true" aria-labelledby="chat-details-title">
        <header><div><span className="eyebrow">CHAT DETAILS</span><h2 id="chat-details-title">{title(selected)}</h2></div><button className="icon-button" onClick={() => setShowChatDetails(false)} aria-label="Close chat details"><X size={18}/></button></header>
        <div className="chat-details-profile">
          <Avatar person={{name:title(selected),role:"Conversation",img:selected.image}} size="lg"/>
          <label className="media-change"><ImageIcon size={14}/> Change chat picture<input type="file" accept="image/*" onChange={(event)=>changeChatImage(event.target.files?.[0])}/></label>
        </div>
        <form className="chat-name-form" onSubmit={async event=>{event.preventDefault();const data=new FormData(event.currentTarget);await updateConversation("rename",{name:data.get("name")});}}><label>Chat name<input name="name" defaultValue={selected.name??""} placeholder={title(selected)} maxLength={100}/></label><button className="secondary-button">Save</button></form>
        <section className="chat-details-section"><div className="chat-details-heading"><strong>Members</strong><span>{selected.members.length}</span></div><div className="chat-member-list">{selected.members.map(member=><article key={member.userId}><Avatar person={{name:member.name??"n2 member",role:member.profession??"Member",img:member.image}} size="sm"/><span><strong>{member.name??"n2 member"}</strong><small>{member.status&&member.status!=="active"?"Account no longer active":member.userId===currentMember.id?"You":member.profession??"Member"}</small></span></article>)}</div>
          <div className="message-search compact"><UserPlus size={15}/><input value={memberSearch} onChange={event=>setMemberSearch(event.target.value)} placeholder="Add a member"/></div>
          {memberSearch.trim().length>=2&&<div className="chat-add-results">{memberResults.filter(person=>person.canMessage!==false&&!selected.members.some(member=>member.userId===String(person.id))).slice(0,4).map(person=><button key={String(person.id)} onClick={()=>updateConversation("add_member",{userId:String(person.id)})}><Avatar person={{name:String(person.name),role:String(person.profession??"Member"),img:person.image as string|null}} size="sm"/><span><strong>{String(person.name)}</strong><small>{String(person.profession??"Member")}</small></span><Plus size={15}/></button>)}</div>}
        </section>
        <section className="chat-details-section"><div className="chat-details-heading"><strong>Media and files</strong><span>{sharedMedia.length}</span></div>{sharedMedia.length?<div className="chat-media-grid">{sharedMedia.map(message=>message.attachmentType==="image"?<a key={message.id} href={message.attachmentUrl!} target="_blank" rel="noreferrer"><img src={message.attachmentUrl!} alt="Shared chat media" loading="lazy" decoding="async"/></a>:<a key={message.id} href={message.attachmentUrl!} download><span>{message.attachmentType==="video"?<Video size={19}/>:message.attachmentType==="audio"?<AudioLines size={19}/>:<Paperclip size={19}/>}</span><small>{message.attachmentType}</small></a>)}</div>:<p className="chat-details-empty">Media and files shared in this chat will appear here.</p>}</section>
        {conversationError&&<p className="messages-error"><CircleAlert size={15}/>{conversationError}</p>}
        <footer><button className="secondary-button" onClick={()=>conversationAction(selected.archivedAt?"restore":"archive")}><Archive size={15}/>{selected.archivedAt?"Restore chat":"Archive chat"}</button><button className="secondary-button danger" onClick={()=>conversationAction("delete")}><Trash2 size={15}/>Delete chat</button></footer>
      </section></div>}
      {editMessageTarget && (
        <ActionDialog eyebrow="EDIT MESSAGE" title="Edit your message." confirmLabel="Save message" fields={[{ name: "body", label: "Message", defaultValue: editMessageTarget.body, required: true, maxLength: 5000 }]} onClose={() => setEditMessageTarget(null)} onConfirm={saveMessage} />
      )}
      {deleteMessageTarget && (
        <ActionDialog eyebrow="DELETE MESSAGE" title="Delete this message?" description="Other people in the conversation will see that the message was deleted." confirmLabel="Delete message" cancelLabel="Keep message" danger onClose={() => setDeleteMessageTarget(null)} onConfirm={deleteMessage} />
      )}
      </>
    );
  }
  const filtered = conversationsList.filter(
    (row) =>
      `${title(row)} ${row.lastMessage?.body ?? ""}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (showArchived ? Boolean(row.archivedAt) : !row.archivedAt),
  );
  return (
    <div className="subpage messages-page">
      <div className="subpage-head compact">
        <div>
          <span className="eyebrow">CONVERSATIONS</span>
          <h1>Messages</h1>
        </div>
        <div className="messages-head-actions">
          <button
            className="secondary-button"
            onClick={() => setShowArchived((value) => !value)}
          >
            <Archive size={15} />
            {showArchived ? "Inbox" : "Archived"}
          </button>
          <button
            className="icon-button border"
            onClick={() => {
              setConversationError("");
              setCompose(true);
            }}
          >
            <Plus size={20} />
          </button>
        </div>
      </div>
      {conversationError && !compose && (
        <p className="messages-error">
          <CircleAlert size={15} />
          {conversationError}
        </p>
      )}
      <div className="message-search">
        <Search size={18} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            showArchived ? "Search archived chats" : "Search conversations"
          }
        />
      </div>
      <div className="message-list">
        {conversationsLoading && <LoadingState label="Loading conversations" variant="list" count={5} className="loading-conversations" />}
        {!conversationsLoading && filtered.map((row) => (
          <article className={`message-list-row ${row.unreadCount ? "unread" : ""}`} key={row.id}>
          <button className="message-list-row-main" onClick={() => setSelected(row)}>
            <Avatar
              person={{
                name: title(row),
                role: "Conversation",
                img: row.image ?? row.members.find(
                  (member) => member.userId !== currentMember.id,
                )?.image,
              }}
              size="md"
            />
            <span>
              <strong className={conversationTitleClass(row)}>{title(row)}</strong>
              {row.members.some(member => member.userId !== currentMember.id && member.status && member.status !== "active") && <span className="account-state-badge">Account no longer active</span>}
              <small>
                {row.snoozedUntil ? "Snoozed · " : ""}
                {row.lastMessage?.body ?? "Start the conversation"}
              </small>
            </span>
          </button>
          <div className="message-list-row-end">
            {!!row.unreadCount && <b className="message-row-unread-count" aria-label={`${row.unreadCount} unread ${row.unreadCount === 1 ? "message" : "messages"}`}>{row.unreadCount > 99 ? "99+" : row.unreadCount}</b>}
            <time>
              {row.lastMessage
                ? new Date(row.lastMessage.created_at).toLocaleDateString(
                    undefined,
                    { weekday: "short" },
                  )
                : "New"}
            </time>
            <div className="message-list-row-actions" aria-label={`Actions for ${title(row)}`}>
              <button onClick={() => conversationListAction(row, row.archivedAt ? "restore" : "archive")} title={row.archivedAt ? "Restore chat" : "Archive chat"} aria-label={row.archivedAt ? `Restore ${title(row)}` : `Archive ${title(row)}`}><Archive size={15}/></button>
              <button onClick={() => conversationListAction(row, "snooze")} title="Snooze for one day" aria-label={`Snooze ${title(row)} for one day`}><Clock3 size={15}/></button>
              <button className="danger" onClick={() => setChatDeleteTarget(row)} title="Delete chat" aria-label={`Delete ${title(row)}`}><Trash2 size={15}/></button>
            </div>
          </div>
          </article>
        ))}
        {!conversationsLoading && !filtered.length && (
          <div className="empty-meets">
            <MessageCircle size={20} />
            <strong>
              {showArchived ? "No archived chats" : "No conversations found"}
            </strong>
            <p>
              {showArchived
                ? "Archived conversations will appear here."
                : "Use + to start a direct or group chat."}
            </p>
          </div>
        )}
      </div>
      {chatDeleteTarget && <ActionDialog eyebrow="DELETE CHAT" title={`Delete ${title(chatDeleteTarget)}?`} description="This removes the chat from your messages. Other members will keep their copy." confirmLabel="Delete chat" cancelLabel="Keep chat" danger onClose={() => setChatDeleteTarget(null)} onConfirm={() => conversationListAction(chatDeleteTarget, "delete")}/>}
      {compose && (
        <div className="modal-backdrop">
          <section className="new-chat-modal">
            <header>
              <div>
                <span className="eyebrow">NEW CONVERSATION</span>
                <h2>Choose people</h2>
                <p>
                  Messages are available to mutual connections and accepted
                  project members.
                </p>
              </div>
              <button
                className="icon-button"
                onClick={() => {
                  setCompose(false);
                  setConversationError("");
                }}
              >
                <X size={18} />
              </button>
            </header>
            <div className="message-search">
              <Search size={17} />
              <input
                autoFocus
                value={memberSearch}
                onChange={(event) => setMemberSearch(event.target.value)}
                placeholder="Search the network"
              />
            </div>
            {chosen.length > 1 && (
              <input
                className="group-name-input"
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder="Group name"
              />
            )}
            <div className="new-chat-results">
              {memberResults.map((person) => {
                const eligible = person.canMessage !== false;
                return (
                  <button
                    key={String(person.id)}
                    disabled={!eligible}
                    className={`${chosen.includes(String(person.id)) ? "selected" : ""} ${eligible ? "" : "ineligible"}`}
                    onClick={() =>
                      eligible &&
                      setChosen((ids) =>
                        ids.includes(String(person.id))
                          ? ids.filter((id) => id !== String(person.id))
                          : [...ids, String(person.id)],
                      )
                    }
                  >
                    <Avatar
                      person={{
                        name: String(person.name),
                        role: String(person.profession ?? "n2 member"),
                        img: person.image as string | null,
                      }}
                      size="md"
                    />
                    <span>
                      <strong>{String(person.name)}</strong>
                      <small>{String(person.profession ?? "n2 member")}</small>
                      <em>{String(person.messageReason ?? "")}</em>
                    </span>
                    {chosen.includes(String(person.id)) && <Check size={16} />}
                  </button>
                );
              })}
            </div>
            {conversationError && (
              <p className="messages-error">
                <CircleAlert size={15} />
                {conversationError}
              </p>
            )}
            <button
              className="primary-button wide"
              disabled={!chosen.length}
              onClick={createConversation}
            >
              {chosen.length > 1 ? "Create group chat" : "Start conversation"}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

type MeetingRecord = {
  id: string;
  title: string;
  description?: string | null;
  provider: string;
  visibility?: "public" | "project" | "private";
  projectId?: string | null;
  startsAt: string;
  endsAt: string;
  endedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  timezone: string;
  joinUrl?: string | null;
  location?: string | null;
  thumbnailUrl?: string | null;
  mode?: "video" | "audio" | "in_person";
  maxParticipants?: number;
  reminderMinutes?: number;
  attendees?: Array<{ email: string; name?: string }>;
  participantProfiles?: Array<MeetInvitee & { status?: string; role?: MeetInviteRole }>;
  canManage?: boolean;
  canDelete?: boolean;
  canEdit?: boolean;
  isPinned?: boolean;
  isBookmarked?: boolean;
};
type MeetInvitee = {
  id: string;
  name: string;
  image?: string | null;
  profession: string;
  group: "connections" | "followers" | "public";
  relationship: string;
  cohostEligible?: boolean;
  meetRole?: MeetInviteRole;
};
type MeetInviteRole = "cohost" | "speaker" | "listener";
type MeetVenue = { latitude: number; longitude: number; displayName: string };
type MeetRoute = { durationSeconds: number; distanceMeters: number };

function MeetCardActions({
  meet,
  onSave,
  onEdit,
  onDelete,
}: {
  meet: MeetingRecord;
  onSave: (meet: MeetingRecord, action: "pin" | "bookmark") => void;
  onEdit: (meet: MeetingRecord) => void;
  onDelete: (meet: MeetingRecord) => void;
}) {
  return (
    <div className="meet-card-actions" role="group" aria-label={`Actions for ${meet.title}`}>
      <button
        type="button"
        className={meet.isPinned ? "active" : ""}
        aria-label={meet.isPinned ? `Unpin ${meet.title}` : `Pin ${meet.title}`}
        title={meet.isPinned ? "Unpin" : "Pin"}
        onClick={() => onSave(meet, "pin")}
      >
        <Pin size={14} fill={meet.isPinned ? "currentColor" : "none"} />
      </button>
      <button
        type="button"
        className={meet.isBookmarked ? "active" : ""}
        aria-label={meet.isBookmarked ? `Remove ${meet.title} from bookmarks` : `Bookmark ${meet.title}`}
        title={meet.isBookmarked ? "Remove bookmark" : "Bookmark"}
        onClick={() => onSave(meet, "bookmark")}
      >
        <Bookmark size={14} fill={meet.isBookmarked ? "currentColor" : "none"} />
      </button>
      {meet.canManage && (
          <button
            type="button"
            aria-label={`Edit ${meet.title}`}
            title="Edit"
            onClick={() => onEdit(meet)}
          >
            <Pencil size={14} />
          </button>
      )}
      {meet.canDelete && (
          <button
            type="button"
            className="danger"
            aria-label={`Delete ${meet.title}`}
            title="Delete"
            onClick={() => onDelete(meet)}
          >
            <Trash2 size={14} />
          </button>
      )}
    </div>
  );
}

function InPersonMeetMap({ location }: { location: string }) {
  const [venue, setVenue] = useState<MeetVenue | null>(null),
    [route, setRoute] = useState<MeetRoute | null>(null),
    [routeCalculatedAt, setRouteCalculatedAt] = useState<number | null>(null),
    [origin, setOrigin] = useState<{ latitude: number; longitude: number } | null>(null),
    [loadingVenue, setLoadingVenue] = useState(true),
    [loadingRoute, setLoadingRoute] = useState(false),
    [routeError, setRouteError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setVenue(null);
    setRoute(null);
    setRouteCalculatedAt(null);
    setOrigin(null);
    setRouteError("");
    setLoadingVenue(true);
    fetch(`/api/maps/route?destination=${encodeURIComponent(location)}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Map unavailable");
        return response.json();
      })
      .then(result => setVenue(result.venue ?? null))
      .catch(error => {
        if (error instanceof Error && error.name !== "AbortError") setRouteError("The venue map is temporarily unavailable. Directions will still open in Maps.");
      })
      .finally(() => setLoadingVenue(false));
    return () => controller.abort();
  }, [location]);

  function requestRoute() {
    if (!navigator.geolocation) {
      setRouteError("Location sharing is not available in this browser.");
      return;
    }
    setLoadingRoute(true);
    setRouteError("");
    navigator.geolocation.getCurrentPosition(async position => {
      const current = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setOrigin(current);
      try {
        const query = new URLSearchParams({
          destination: location,
          latitude: String(current.latitude),
          longitude: String(current.longitude),
        });
        const response = await fetch(`/api/maps/route?${query}`, { cache: "no-store" });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.route) throw new Error(result.error ?? "Route unavailable");
        setVenue(result.venue ?? null);
        setRoute(result.route);
        setRouteCalculatedAt(Date.now());
      } catch {
        setRouteError("We couldn't calculate an ETA. You can still open turn-by-turn directions.");
      } finally {
        setLoadingRoute(false);
      }
    }, error => {
      setLoadingRoute(false);
      setRouteError(error.code === error.PERMISSION_DENIED
        ? "Location wasn't shared. Allow it in your browser to see a live ETA."
        : "Your current location couldn't be found. Try opening directions instead.");
    }, { enableHighAccuracy: false, maximumAge: 300_000, timeout: 10_000 });
  }

  const mapUrl = venue ? (() => {
      const latitudeSpan = 0.008;
      const longitudeSpan = 0.012;
      const params = new URLSearchParams({
        bbox: `${venue.longitude - longitudeSpan},${venue.latitude - latitudeSpan},${venue.longitude + longitudeSpan},${venue.latitude + latitudeSpan}`,
        layer: "mapnik",
        marker: `${venue.latitude},${venue.longitude}`,
      });
      return `https://www.openstreetmap.org/export/embed.html?${params}`;
    })() : null,
    directionsParams = new URLSearchParams({ api: "1", destination: location, travelmode: "driving" });
  if (origin) directionsParams.set("origin", `${origin.latitude},${origin.longitude}`);
  const directionsUrl = `https://www.google.com/maps/dir/?${directionsParams}`,
    minutes = route ? Math.max(1, Math.round(route.durationSeconds / 60)) : null,
    distance = route ? route.distanceMeters >= 1_000 ? `${(route.distanceMeters / 1_000).toFixed(1)} km` : `${Math.round(route.distanceMeters)} m` : null,
    arrival = route && routeCalculatedAt ? new Date(routeCalculatedAt + route.durationSeconds * 1_000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;

  return (
    <section className="meet-route-panel" aria-label="Venue map and directions">
      <div className="meet-map-frame">
        {mapUrl ? <iframe src={mapUrl} title={`Map of ${location}`} loading="lazy" referrerPolicy="no-referrer" /> : <div className="meet-map-placeholder"><MapPin size={22}/><strong>{loadingVenue ? "Loading venue map…" : location}</strong></div>}
      </div>
      <div className="meet-route-copy">
        <div>
          <span className="eyebrow">GETTING THERE</span>
          <strong>{route ? `${minutes} min by car` : "Plan your journey"}</strong>
          <small>{route ? `${distance} · estimated arrival ${arrival}` : "Share your current location once to calculate distance and ETA."}</small>
        </div>
        <div className="meet-route-actions">
          <button type="button" className="secondary-button" onClick={requestRoute} disabled={loadingRoute}>
            <Navigation size={14}/>{loadingRoute ? "Calculating…" : route ? "Refresh ETA" : "Use my location for ETA"}
          </button>
          <a className="primary-button" href={directionsUrl} target="_blank" rel="noreferrer">
            Directions <ArrowUpRight size={14}/>
          </a>
        </div>
        <small className="meet-route-privacy">Your current coordinates are used for this route only and are not saved.</small>
        {routeError && <p className="meet-route-error" role="status">{routeError}</p>}
      </div>
    </section>
  );
}

function defaultMeetInviteRole(mode: "video" | "audio" | "in_person"): MeetInviteRole {
  return mode === "audio" ? "listener" : "speaker";
}

function meetRoleLabel(mode: "video" | "audio" | "in_person", role: MeetInviteRole) {
  if (role === "cohost") return "Co-host";
  if (mode === "audio") return role === "speaker" ? "Guest speaker" : "Listener";
  return mode === "in_person" ? "Attendee" : "Participant";
}

function MeetAttendeePicker({
  selected,
  onChange,
  max,
  mode,
  canAssignCohosts,
}: {
  selected: MeetInvitee[];
  onChange: (people: MeetInvitee[]) => void;
  max: number;
  mode: "video" | "audio" | "in_person";
  canAssignCohosts: boolean;
}) {
  const [people, setPeople] = useState<MeetInvitee[]>([]),
    [query, setQuery] = useState(""),
    [group, setGroup] = useState<"all" | MeetInvitee["group"]>("all"),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController(),
      timer = setTimeout(() => {
        setLoading(true);
        fetch(
          `/api/meetings/attendees${query.trim().length >= 2 ? `?q=${encodeURIComponent(query.trim())}` : ""}`,
          { signal: controller.signal },
        )
          .then((response) => (response.ok ? response.json() : { people: [] }))
          .then((result) => setPeople(result.people ?? []))
          .catch(() => undefined)
          .finally(() => setLoading(false));
      }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  const visible = people.filter(
      (person) => group === "all" || person.group === group,
    ),
    chosen = new Set(selected.map((person) => person.id)),
    cohostCount = selected.filter(person => person.meetRole === "cohost").length;
  function toggle(person: MeetInvitee) {
    if (chosen.has(person.id))
      onChange(selected.filter((item) => item.id !== person.id));
    else if (selected.length < max) onChange([...selected, { ...person, meetRole: defaultMeetInviteRole(mode) }]);
  }
  function setRole(person: MeetInvitee, role: MeetInviteRole) {
    if (role === "cohost" && (person.group !== "connections" || person.cohostEligible === false || (person.meetRole !== "cohost" && cohostCount >= 2))) return;
    onChange(selected.map(item => item.id === person.id ? { ...item, meetRole: role } : item));
  }
  return (
    <fieldset className="meet-attendee-picker">
      <legend>Invite people</legend>
      <p>
        Select followers, mutual connections or discoverable public profiles.
      </p>
      {selected.length > 0 && (
        <div className="meet-selected-people">
          {selected.map((person) => {
            const role = person.meetRole ?? defaultMeetInviteRole(mode);
            const canChooseOrdinaryRole = mode === "audio";
            const showRoleSelect = canChooseOrdinaryRole || canAssignCohosts || role === "cohost";
            return <div className="meet-selected-person" key={person.id}>
              <button type="button" onClick={() => toggle(person)} disabled={role === "cohost" && !canAssignCohosts} aria-label={role === "cohost" && !canAssignCohosts ? `${person.name} is a co-host; only the primary host can remove them` : `Remove ${person.name}`}>
                <Avatar person={{ name: person.name, role: person.profession, img: person.image }} size="sm" />
                <span>{person.name}</span>{(role !== "cohost" || canAssignCohosts) && <X size={13} />}
              </button>
              {showRoleSelect ? <N2Select compact ariaLabel={`${person.name} meet role`} value={role} disabled={role === "cohost" && !canAssignCohosts} onValueChange={value => setRole(person, value as MeetInviteRole)} options={[...(canAssignCohosts ? [{value:"cohost",label:`Co-host${person.group !== "connections" ? " · mutual connections only" : person.cohostEligible === false ? " · unavailable" : ""}`,disabled:person.group !== "connections" || person.cohostEligible === false || (role !== "cohost" && cohostCount >= 2)}] : []),...(mode === "audio" ? [{value:"speaker",label:"Guest speaker"}] : []),{value:mode === "audio" ? "listener" : "speaker",label:meetRoleLabel(mode, defaultMeetInviteRole(mode))},...(!canAssignCohosts && role === "cohost" ? [{value:"cohost",label:"Co-host"}] : [])]}/> : <span className="meet-role-label">{meetRoleLabel(mode, role)}</span>}
            </div>;
          })}
        </div>
      )}
      <div className="meet-people-search">
        <Search size={16} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search people by name or profession"
        />
      </div>
      <div className="meet-people-tabs">
        {(
          [
            ["all", "All"],
            ["connections", "Connections"],
            ["followers", "Followers"],
            ["public", "Public profiles"],
          ] as const
        ).map(([value, label]) => (
          <button
            type="button"
            className={group === value ? "active" : ""}
            onClick={() => setGroup(value)}
            key={value}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="meet-people-results">
        {loading ? (
          <p>Finding people…</p>
        ) : visible.length ? (
          visible.map((person) => (
            <button
              type="button"
              className={chosen.has(person.id) ? "selected" : ""}
              onClick={() => toggle(person)}
              key={person.id}
            >
              <Avatar
                person={{
                  name: person.name,
                  role: person.profession,
                  img: person.image,
                }}
                size="md"
              />
              <span>
                <strong>{person.name}</strong>
                <small>{person.profession}</small>
                <em>{person.relationship}</em>
              </span>
              {chosen.has(person.id) ? <Check size={16} /> : <Plus size={16} />}
            </button>
          ))
        ) : (
          <p>No matching profiles in this group.</p>
        )}
      </div>
      <small>
        {selected.length}/{max} guests selected · {cohostCount}/2 co-hosts
        {max === 7 ? " · up to eight people on video" : max === 15 ? " · up to sixteen people on audio" : ""}
      </small>
    </fieldset>
  );
}
function MeetView({ initialMeetingId = null }: { initialMeetingId?: string | null }) {
  const meetFormRef = useRef<HTMLFormElement>(null);
  const meetFlowBodyRef = useRef<HTMLDivElement>(null);
  const [clockNow, setClockNow] = useState(0);
  const [calendarView, setCalendarView] = useState<"agenda" | "month">(
      "agenda",
    ),
    [meets, setMeets] = useState<MeetingRecord[]>([]),
    [create, setCreate] = useState(false),
    [editing, setEditing] = useState<MeetingRecord | null>(null),
    [detail, setDetail] = useState<MeetingRecord | null>(null),
    [error, setError] = useState(""),
    [invitees, setInvitees] = useState<MeetInvitee[]>([]),
    [meetMode, setMeetMode] = useState<"video" | "audio" | "in_person">("video"),
    [meetVisibility, setMeetVisibility] = useState<
      "public" | "project" | "private"
    >("public"),
    [meetProjectId, setMeetProjectId] = useState(""),
    [meetProjects, setMeetProjects] = useState<ProjectRecord[]>([]),
    [meetStep, setMeetStep] = useState<1 | 2>(1),
    [meetTitle, setMeetTitle] = useState(""),
    [meetLocation, setMeetLocation] = useState(""),
    [meetThumbnail, setMeetThumbnail] = useState<string | null>(null),
    [confirmEmptyMeet, setConfirmEmptyMeet] = useState(false);
  const [showAllPastMeets, setShowAllPastMeets] = useState(false);
  const [pastMeetsCollapsed, setPastMeetsCollapsed] = useState(true);
  const [deleteMeetTarget, setDeleteMeetTarget] = useState<MeetingRecord | null>(null);
  async function load() {
    const response = await fetch("/api/calendar/events");
    const data = response.ok ? await response.json() : { meetings: [] };
    const loaded = (data.meetings ?? []) as MeetingRecord[];
    setMeets(loaded);
    if (initialMeetingId) setDetail(loaded.find((meeting) => meeting.id === initialMeetingId) ?? null);
  }
  useEffect(() => {
    setClockNow(Date.now());
    const timer = window.setInterval(() => setClockNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [initialMeetingId]);
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (!create && !editing) return;
    fetch("/api/projects?scope=mine&limit=40")
      .then((response) => (response.ok ? response.json() : { projects: [] }))
      .then((result) =>
        setMeetProjects(
          (result.projects ?? []).filter(
            (project: ProjectRecord) => project.status === "active",
          ),
        ),
      )
      .catch(() => setMeetProjects([]));
  }, [create, editing]);
  function openCreate() {
    setEditing(null);
    setInvitees([]);
    setMeetMode("video");
    setMeetVisibility("public");
    setMeetProjectId("");
    setMeetStep(1);
    setMeetTitle("");
    setMeetLocation("");
    setMeetThumbnail(null);
    setConfirmEmptyMeet(false);
    setError("");
    setCreate(true);
  }
  async function openEdit(meet: MeetingRecord) {
    let currentMeet = meet;
    try {
      const response = await fetch(`/api/meetings/${meet.id}`);
      if (response.ok) {
        const result = await response.json();
        currentMeet = {
          ...meet,
          ...result.meeting,
          participantProfiles: result.participants ?? [],
          canManage: result.canManage ?? result.canEdit,
          canDelete: result.canDelete,
          canEdit: result.canEdit,
        };
      }
    } catch {
      // The calendar payload contains enough data to keep editing available offline.
    }
    setCreate(false);
    setEditing(currentMeet);
    setInvitees((currentMeet.participantProfiles ?? []).map(person => ({
      id: person.id,
      name: person.name,
      image: person.image,
      profession: person.profession || "n2 member",
      group: person.group ?? "public",
      relationship: person.relationship ?? "Invited",
      cohostEligible: person.cohostEligible,
      meetRole: person.role ?? defaultMeetInviteRole(currentMeet.mode ?? "video"),
    })));
    setMeetMode(currentMeet.mode ?? (currentMeet.provider === "in_person" ? "in_person" : "video"));
    setMeetVisibility(currentMeet.visibility ?? "public");
    setMeetProjectId(currentMeet.projectId ?? "");
    setMeetStep(1);
    setMeetTitle(currentMeet.title);
    setMeetLocation(currentMeet.location ?? "");
    setMeetThumbnail(currentMeet.thumbnailUrl ?? null);
    setConfirmEmptyMeet(false);
    setDetail(null);
    setError("");
  }
  function closeEditor() {
    setCreate(false);
    setEditing(null);
    setInvitees([]);
    setMeetStep(1);
    setMeetTitle("");
    setMeetLocation("");
    setMeetThumbnail(null);
    setConfirmEmptyMeet(false);
    setError("");
  }
  function selectMeetThumbnail(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPG, PNG or WebP image for the meet cover.");
      return;
    }
    if (file.size > 1_500_000) {
      setError("Meet cover images must be 1.5 MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setMeetThumbnail(String(reader.result));
      setError("");
    };
    reader.readAsDataURL(file);
  }
  function continueMeetSetup() {
    const form = meetFormRef.current;
    if (!form?.reportValidity()) return;
    if (meetVisibility === "project" && !meetProjectId) {
      setError("Choose the project this meet belongs to.");
      return;
    }
    setError("");
    setMeetStep(2);
    window.requestAnimationFrame(() => {
      meetFlowBodyRef.current?.scrollTo({ top: 0, behavior: "instant" });
      meetFlowBodyRef.current?.querySelector<HTMLInputElement>(".meet-invite-step input")?.focus();
    });
  }
  async function persistMeet(form: HTMLFormElement) {
    setError("");
    const data = new FormData(form),
      start = new Date(String(data.get("startsAt"))),
      duration = Number(data.get("duration"));
    if (meetVisibility === "project" && !meetProjectId) {
      setError("Choose the project this meet belongs to.");
      return false;
    }
    const target = editing ? `/api/meetings/${editing.id}` : "/api/calendar/events";
    const response = await fetch(target, {
      method: editing ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider: meetMode === "in_person" ? "in_person" : "n2",
        mode: meetMode,
        visibility: meetVisibility,
        projectId:
          meetVisibility === "project" ? meetProjectId : undefined,
        title: data.get("title"),
        description: data.get("description"),
        startsAt: start.toISOString(),
        endsAt: new Date(start.getTime() + duration * 60000).toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        location: data.get("location") || undefined,
        thumbnailUrl: meetThumbnail,
        attendeeIds: invitees.map((person) => person.id),
        attendeeRoles: Object.fromEntries(invitees.map(person => [person.id, person.meetRole ?? defaultMeetInviteRole(meetMode)])),
        reminderMinutes: Number(data.get("reminderMinutes") ?? 30),
        online: meetMode !== "in_person",
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "Could not create the meet");
      return false;
    }
    setCreate(false);
    setEditing(null);
    setInvitees([]);
    setMeetStep(1);
    setMeetLocation("");
    setMeetThumbnail(null);
    setMeetVisibility("public");
    setMeetProjectId("");
    setConfirmEmptyMeet(false);
    setDetail({
      ...result,
      participantProfiles: invitees.map(person => ({ ...person, role: person.meetRole })),
      canManage: true,
      canDelete: editing ? Boolean(editing.canDelete) : true,
      canEdit: true,
    });
    load();
    return true;
  }
  async function addMeet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (meetStep === 1) {
      continueMeetSetup();
      return;
    }
    if (!invitees.length) {
      setConfirmEmptyMeet(true);
      return;
    }
    await persistMeet(event.currentTarget);
  }
  async function saveMeet(meet: MeetingRecord, action: "pin" | "bookmark") {
    setError("");
    const response = await fetch("/api/saved-items", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          entityType: "meeting",
          entityId: meet.id,
          action,
        }),
      }),
      result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "Could not save this meet.");
      return;
    }
    const next = {
      ...meet,
      isPinned: result.pinned,
      isBookmarked: result.bookmarked,
    };
    setDetail((current) => current?.id === meet.id ? next : current);
    setMeets((rows) => rows.map((row) => (row.id === meet.id ? next : row)));
  }
  async function deleteMeet() {
    if (!deleteMeetTarget) return false;
    setError("");
    const response = await fetch(`/api/meetings/${deleteMeetTarget.id}`, { method: "DELETE" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.error ?? "Could not delete this meet.");
      setDeleteMeetTarget(null);
      return false;
    }
    setMeets((rows) => rows.filter((row) => row.id !== deleteMeetTarget.id));
    setDetail((current) => current?.id === deleteMeetTarget.id ? null : current);
    return true;
  }
  function join(meet: MeetingRecord) {
    if (meet.provider === "in_person") {
      setDetail(meet);
      return;
    }
    if (meet.joinUrl) window.location.href = meet.joinUrl;
  }
  const eventDays = [
      ...new Set(meets.map((meet) => new Date(meet.startsAt).getDate())),
    ],
    today = new Date(),
    upcomingMeets = clockNow ? meets.filter(meet => !meet.cancelledAt && !meet.endedAt && new Date(meet.endsAt).getTime() >= clockNow) : meets.filter(meet => !meet.cancelledAt),
    pastMeets = clockNow ? meets.filter(meet => Boolean(meet.cancelledAt) || Boolean(meet.endedAt) || new Date(meet.endsAt).getTime() < clockNow) : meets.filter(meet => Boolean(meet.cancelledAt));
  return (
    <div className="subpage">
      <div className="subpage-head">
        <div>
          <span className="eyebrow">
            {today
              .toLocaleDateString(undefined, { month: "long", year: "numeric" })
              .toUpperCase()}
          </span>
          <h1>Meet</h1>
          <p>Small rooms, open conversations.</p>
        </div>
        <div className="meet-head-actions">
          <div className="view-toggle">
            <button
              className={calendarView === "agenda" ? "active" : ""}
              onClick={() => setCalendarView("agenda")}
            >
              Agenda
            </button>
            <button
              className={calendarView === "month" ? "active" : ""}
              onClick={() => setCalendarView("month")}
            >
              Month
            </button>
          </div>
          <button className="primary-button" onClick={openCreate}>
            <Plus size={18} /> Add a meet
          </button>
        </div>
      </div>
      {calendarView === "month" && (
        <div className="month-calendar">
          <div className="month-title">
            <strong>
              {today.toLocaleDateString(undefined, {
                month: "long",
                year: "numeric",
              })}
            </strong>
          </div>
          <div className="month-weekdays">
            {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="month-grid">
            {Array.from(
              {
                length:
                  new Date(today.getFullYear(), today.getMonth(), 1).getDay() ||
                  7,
              },
              (_, i) => (
                <span className="empty" key={i} />
              ),
            )}
            {Array.from(
              {
                length: new Date(
                  today.getFullYear(),
                  today.getMonth() + 1,
                  0,
                ).getDate(),
              },
              (_, i) => i + 1,
            ).map((day) => (
              <button
                key={day}
                className={eventDays.includes(day) ? "has-event" : ""}
              >
                <span>{day}</span>
                {eventDays.includes(day) && <i />}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="section-title">
        <h3>Upcoming</h3>
        <span>{upcomingMeets.length} meets</span>
      </div>
      {error && !create && !editing && !detail && <p className="form-error meet-page-error" role="alert">{error}</p>}
      {upcomingMeets.length ? (
        upcomingMeets.map((meet) => {
          const start = new Date(meet.startsAt),
            minutes = Math.round(
              (new Date(meet.endsAt).getTime() - start.getTime()) / 60000,
            ),
            joinOpensAt = start.getTime() - 15 * 60_000,
            canJoin = Boolean(clockNow) && clockNow >= joinOpensAt && clockNow <= new Date(meet.endsAt).getTime(),
            isFuture = Boolean(clockNow) && clockNow < joinOpensAt;
          return (
            <div className="meet-card" key={meet.id} tabIndex={0}>
              <MeetCardActions meet={meet} onSave={saveMeet} onEdit={openEdit} onDelete={setDeleteMeetTarget} />
              <div className="meet-time">
                <strong>
                  {start.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </strong>
                <span>{minutes} min</span>
              </div>
              <div>
                <div className="meet-card-meta">
                  <span className={`tag ${meet.provider === "in_person" ? "dark" : ""}`}>
                    {meet.mode === "audio" ? <Mic size={11}/> : meet.provider === "in_person" ? <MapPin size={11}/> : <Video size={11}/>}
                    {meet.mode === "audio" ? "PODCAST" : meet.provider === "in_person" ? "IN PERSON" : "VIDEO"}
                  </span>
                  <span className="meet-visibility-label">
                    {meet.visibility === "private" ? <ShieldCheck size={12}/> : meet.visibility === "project" ? <UsersRound size={12}/> : <Globe2 size={12}/>}
                    {meet.visibility ?? "public"}
                  </span>
                </div>
                <button
                  className="meet-title-button"
                  onClick={() => setDetail(meet)}
                >
                  {meet.title}
                </button>
                <p>
                  {meet.description || meet.location || "Open meeting details"}
                </p>
                {meet.provider === "in_person" && meet.location && <span className="meet-card-location"><MapPin size={11}/>{meet.location}</span>}
              </div>
              {meet.provider === "in_person" ? <button className="join-button" onClick={() => setDetail(meet)}>
                  <ArrowUpRight size={16} />
                </button> : canJoin ? <button className="join-button" onClick={() => join(meet)}>Join</button> : isFuture ? (
                  <span className="meet-scheduled-label"><Clock3 size={14}/>{start.toLocaleDateString(undefined, { day: "numeric", month: "short" })} · {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                ) : <span className="meet-scheduled-label ended">Ended</span>}
            </div>
          );
        })
      ) : (
        <div className="empty-meets">
          <CalendarDays size={20} />
          <strong>Nothing planned yet</strong>
          <p>Add a small room or keep the day clear.</p>
        </div>
      )}
      {pastMeets.length > 0 && <>
        <div className="section-title meet-history-title">
          <button
            className="meet-history-toggle"
            aria-expanded={!pastMeetsCollapsed}
            aria-controls="past-meets-list"
            onClick={() => setPastMeetsCollapsed(value => !value)}
          >
            <ChevronRight size={15} />
            <h3>Past meets</h3>
          </button>
          <div className="meet-history-summary">
            <span>{pastMeets.length} {pastMeets.length === 1 ? "meet" : "meets"}</span>
            {!pastMeetsCollapsed && pastMeets.length > 5 && <button onClick={() => setShowAllPastMeets(value => !value)}>{showAllPastMeets ? "Show recent" : "View all"}</button>}
          </div>
        </div>
        <div className="meet-history-list" id="past-meets-list" hidden={pastMeetsCollapsed}>
          {pastMeets.slice(0, showAllPastMeets ? pastMeets.length : 5).map(meet => {
            const start = new Date(meet.startsAt);
            return <div className="meet-card meet-card-past" key={meet.id} tabIndex={0}>
              <MeetCardActions meet={meet} onSave={saveMeet} onEdit={openEdit} onDelete={setDeleteMeetTarget} />
              <div className="meet-time"><strong>{start.toLocaleDateString(undefined, { day: "numeric", month: "short" })}</strong><span>{start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>
              <div>
                <div className="meet-card-meta">
                  <span className={`tag ${meet.provider === "in_person" ? "dark" : ""}`}>{meet.mode === "audio" ? <Mic size={11}/> : meet.provider === "in_person" ? <MapPin size={11}/> : <Video size={11}/>} {meet.mode === "audio" ? "PODCAST" : meet.provider === "in_person" ? "IN PERSON" : "VIDEO"}</span>
                  <span className={`meet-history-status ${meet.cancelledAt ? "cancelled" : ""}`}>{meet.cancelledAt ? "CANCELLED" : "ENDED"}</span>
                </div>
                <button className="meet-title-button" onClick={() => setDetail(meet)}>{meet.title}</button>
                <p>{meet.cancelledAt ? meet.cancellationReason ?? "The host account is no longer active." : meet.description || meet.location || "Open meeting details"}</p>
              </div>
              <button className="meet-history-detail" onClick={() => setDetail(meet)}>Details</button>
            </div>;
          })}
        </div>
      </>}
      {(create || editing) && (
        <div className="modal-backdrop">
          <form ref={meetFormRef} className="meet-modal meet-creation-flow" onSubmit={addMeet}>
            <header className="meet-flow-header">
              <div>
                <span className="eyebrow">{editing ? "EDIT MEET" : "NEW MEET"}</span>
                <h2>{meetStep === 1 ? (editing ? "Update the room" : "Bring people together") : "Invite people to join"}</h2>
              </div>
              <div className="meet-flow-header-actions">
                <div className="meet-flow-progress" aria-label={`Step ${meetStep} of 2`}>
                  <span className={meetStep >= 1 ? "active" : ""}>Details</span>
                  <i />
                  <span className={meetStep >= 2 ? "active" : ""}>Invitees</span>
                </div>
                <button type="button" className="icon-button" aria-label="Close meet editor" onClick={closeEditor}><X size={18} /></button>
              </div>
            </header>
            <div className="meet-flow-body" ref={meetFlowBodyRef}>
              <section className="meet-editor-step" hidden={meetStep !== 1}>
                <div className="meet-editor-panel meet-editor-basics">
                  <div className="meet-editor-visual-row">
                    <div className={`meet-cover-preview ${meetThumbnail ? "has-image" : ""}`}>
                      {meetThumbnail ? <img src={meetThumbnail} alt="Meet thumbnail preview" /> : meetMode === "in_person" && meetLocation ? <div className="meet-local-map"><MapPin size={25}/><strong>{meetLocation}</strong><small>Venue map card</small></div> : <div><ImageIcon size={24}/><strong>{meetMode === "audio" ? "Podcast artwork" : meetMode === "in_person" ? "Venue map" : "Video thumbnail"}</strong><small>{meetMode === "in_person" ? "Add the venue below to create its map card." : "Add a recognisable cover for this meet."}</small></div>}
                    </div>
                    <div className="meet-cover-copy"><span className="eyebrow">MEET VISUAL</span><h3>{meetMode === "audio" ? "Set the episode artwork" : meetMode === "in_person" ? "Help people find the venue" : "Set the room thumbnail"}</h3><p>This appears in event details and helps people recognise the meet.</p><div className="meet-cover-actions"><label className="secondary-button"><ImageIcon size={15}/>{meetThumbnail ? "Replace" : "Add thumbnail"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => selectMeetThumbnail(event.target.files?.[0])}/></label>{meetThumbnail && <button type="button" onClick={() => setMeetThumbnail(null)}>Remove</button>}</div><small>JPG, PNG or WebP · up to 1.5 MB</small></div>
                  </div>
                  <div className="meet-core-fields">
                    <label>
                      Title
                      <input name="title" required minLength={3} value={meetTitle} onChange={(event) => setMeetTitle(event.target.value)} placeholder="Give this meet a clear name" />
                    </label>
                    <label>
                      Description
                      <textarea name="description" defaultValue={editing?.description ?? ""} placeholder="What will people discuss or do?" />
                    </label>
                  </div>
                </div>

                <fieldset className="meet-visibility-picker">
                  <legend>Who can see this meet?</legend>
                  <div className="meet-visibility-options" role="group" aria-label="Meet visibility">
                {(
                  [
                    ["public", "Public", "Visible to everyone on n2", Globe2],
                    ["project", "Project", "Only the selected project", BriefcaseBusiness],
                    ["private", "Private", "Invited people only", ShieldCheck],
                  ] as const
                ).map(([value, label, description, Icon]) => (
                  <button
                    type="button"
                    key={value}
                    className={meetVisibility === value ? "active" : ""}
                    aria-pressed={meetVisibility === value}
                    onClick={() => {
                      setMeetVisibility(value);
                      setError("");
                      if (value !== "project") setMeetProjectId("");
                    }}
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                    <small>{description}</small>
                  </button>
                ))}
              </div>
              {meetVisibility === "project" && (
                <label className="meet-project-choice">
                  Project
                  <N2Select value={meetProjectId} onValueChange={setMeetProjectId} required ariaLabel="Project" options={[{value:"",label:"Choose a project"},...meetProjects.map(project=>({value:project.id,label:project.title}))]}/>
                  {!meetProjects.length && (
                    <small>You need an active project to create a project meet.</small>
                  )}
                </label>
              )}
                </fieldset>

                <div className="meet-editor-panel">
                  <div className="meet-panel-heading"><span className="eyebrow">WHEN</span><strong>Schedule and reminder</strong></div>
                  <div className="meet-schedule-grid">
                    <label>
                      Starts
                      <input name="startsAt" type="datetime-local" required defaultValue={editing ? new Date(new Date(editing.startsAt).getTime() - new Date(editing.startsAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""} />
                    </label>
                    <label>
                      Duration
                      <N2Select name="duration" defaultValue={editing ? String(Math.max(15, Math.round((new Date(editing.endsAt).getTime() - new Date(editing.startsAt).getTime()) / 60000))) : "45"} ariaLabel="Duration" options={[{value:"30",label:"30 minutes"},{value:"45",label:"45 minutes"},{value:"60",label:"60 minutes"},{value:"90",label:"90 minutes"},{value:"120",label:"2 hours"}]}/>
                    </label>
                    <label>
                      Reminder
                      <N2Select name="reminderMinutes" defaultValue={String(editing?.reminderMinutes ?? 30)} ariaLabel="Reminder" options={[{value:"0",label:"At start time"},{value:"10",label:"10 minutes before"},{value:"30",label:"30 minutes before"},{value:"60",label:"1 hour before"},{value:"1440",label:"1 day before"}]}/>
                    </label>
                  </div>
                </div>

                <fieldset className="meet-editor-panel meet-mode-picker">
                  <legend>Meet type</legend>
                  <div>
                {([
                  ["video", "Video", "Adaptive video · 8 people", Video],
                  ["audio", "Podcast", "Live audio stage · up to 16 people", Mic],
                  ["in_person", "In person", "A physical place · 100 guests", MapPin],
                ] as const).map(([value, label, description, Icon]) => (
                  <button type="button" key={value} className={meetMode === value ? "active" : ""} onClick={() => {
                    setMeetMode(value);
                    const cap = value === "video" ? 7 : value === "audio" ? 15 : 99;
                    setInvitees(people => people.slice(0, cap).map(person => ({
                      ...person,
                      meetRole: person.meetRole === "cohost" ? "cohost" : defaultMeetInviteRole(value),
                    })));
                  }}>
                    <Icon size={18}/><span>{label}</span><small>{description}</small>
                  </button>
                ))}
                  </div>
                  {meetMode === "in_person" && <label className="meet-location-field">
                    Location
                    <input name="location" required value={meetLocation} onChange={(event) => setMeetLocation(event.target.value)} placeholder="Place or address" />
                  </label>}
                </fieldset>
                {error && <p className="form-error">{error}</p>}
              </section>
              <section className="meet-editor-step meet-invite-step" hidden={meetStep !== 2}>
                <div className="meet-step-summary">{meetThumbnail ? <img src={meetThumbnail} alt="" /> : <span>{meetMode === "audio" ? <Mic size={20}/> : meetMode === "in_person" ? <MapPin size={20}/> : <Video size={20}/>}</span>}<div><span className="eyebrow">{meetMode === "audio" ? "PODCAST" : meetMode === "in_person" ? "IN PERSON" : "VIDEO MEET"}</span><strong>{meetTitle || "Untitled meet"}</strong><small>{meetVisibility === "project" ? "Project visibility" : `${meetVisibility[0].toUpperCase()}${meetVisibility.slice(1)} visibility`}{meetLocation ? ` · ${meetLocation}` : ""}</small></div><button type="button" onClick={() => setMeetStep(1)}>Edit details</button></div>
                <MeetAttendeePicker
                  selected={invitees}
                  onChange={setInvitees}
                  max={meetMode === "video" ? 7 : meetMode === "audio" ? 15 : 99}
                  mode={meetMode}
                  canAssignCohosts={!editing || Boolean(editing.canDelete)}
                />
                {error && <p className="form-error">{error}</p>}
              </section>
            </div>
            <footer className="meet-flow-footer">
              <p>{meetStep === 1 ? "Add the essentials now. Invitees come next." : `${invitees.length} ${invitees.length === 1 ? "person" : "people"} selected`}</p>
              <div>
                {meetStep === 2 && <button type="button" className="secondary-button" onClick={() => setMeetStep(1)}><ArrowLeft size={16}/> Back</button>}
                <button type="submit" className="primary-button">
                  {meetStep === 1 ? <>Continue to invitees <ChevronRight size={16}/></> : editing ? "Save changes" : "Create meet"}
                </button>
              </div>
            </footer>
          </form>
        </div>
      )}
      {detail && (
        <div className="modal-backdrop">
          <section className="meet-detail">
            <header>
              <div>
                <span className="eyebrow">MEET DETAILS</span>
                <h2>{detail.title}</h2>
              </div>
              <button className="icon-button" onClick={() => setDetail(null)}>
                <X size={18} />
              </button>
            </header>
            {detail.thumbnailUrl && <img className="meet-detail-cover" src={detail.thumbnailUrl} alt="" loading="lazy" decoding="async" />}
            <p>{detail.description || "No description added."}</p>
            {detail.provider === "in_person" && detail.location && <InPersonMeetMap location={detail.location} />}
            <div className="saved-actions">
              <button onClick={() => saveMeet(detail, "pin")}>
                <Pin size={15} />
                {detail.isPinned ? "Unpin" : "Pin meet"}
              </button>
              <button onClick={() => saveMeet(detail, "bookmark")}>
                <Bookmark size={15} />
                {detail.isBookmarked ? "Remove bookmark" : "Bookmark"}
              </button>
              {detail.canManage && <button onClick={() => openEdit(detail)}><Pencil size={15}/>Edit meet</button>}
            </div>
            {error && <p className="form-error">{error}</p>}
            <dl>
              <div>
                <dt>Starts</dt>
                <dd>{new Date(detail.startsAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{detail.mode === "audio" ? "Podcast" : detail.provider === "in_person" ? "In person" : "Video"}</dd>
              </div>
              <div>
                <dt>Visibility</dt>
                <dd>
                  {detail.visibility === "project"
                    ? "Project"
                    : detail.visibility === "private"
                      ? "Private"
                      : "Public"}
                </dd>
              </div>
              {detail.location && (
                <div>
                  <dt>Location</dt>
                  <dd>{detail.location}</dd>
                </div>
              )}
              <div>
                <dt>People</dt>
                <dd>
                  {(detail.participantProfiles?.length ?? detail.attendees?.length ?? 0) + 1} attending · capacity {detail.maxParticipants ?? (detail.provider === "in_person" ? 100 : 8)}
                </dd>
              </div>
              <div>
                <dt>Reminder</dt>
                <dd>{detail.reminderMinutes === 0 ? "At start time" : `${detail.reminderMinutes ?? 30} minutes before`}</dd>
              </div>
            </dl>
            {!!detail.participantProfiles?.length && (
              <section className="meet-detail-people" aria-label="Meet attendees and roles">
                <span className="eyebrow">ATTENDEES</span>
                <div>
                  {detail.participantProfiles.map(person => {
                    const role = person.role ?? person.meetRole ?? defaultMeetInviteRole(detail.mode ?? "video");
                    return <div className="meet-detail-person" key={person.id}>
                      <Avatar person={{ name: person.name, role: person.profession, img: person.image }} size="sm" />
                      <span><strong>{person.name}</strong><small>{meetRoleLabel(detail.mode ?? "video", role)}</small></span>
                    </div>;
                  })}
                </div>
              </section>
            )}
            {detail.joinUrl && detail.provider !== "in_person" && clockNow >= new Date(detail.startsAt).getTime() - 15 * 60_000 && clockNow <= new Date(detail.endsAt).getTime() && (
              <button
                className="primary-button wide"
                onClick={() => join(detail)}
              >
                Join meet
              </button>
            )}
            {detail.provider !== "in_person" && clockNow < new Date(detail.startsAt).getTime() - 15 * 60_000 && (
              <div className="meet-not-ready"><Clock3 size={17}/><div><strong>Scheduled for {new Date(detail.startsAt).toLocaleString()}</strong><small>The room opens 15 minutes before it starts. We’ll remind you based on your notification setting.</small></div></div>
            )}
            {detail.provider !== "in_person" && clockNow > new Date(detail.endsAt).getTime() && <div className="meet-not-ready ended"><Check size={17}/><div><strong>This meet has ended</strong><small>The room is no longer open.</small></div></div>}
          </section>
        </div>
      )}
      {deleteMeetTarget && (
        <ActionDialog
          eyebrow="DELETE MEET"
          title={`Delete ${deleteMeetTarget.title}?`}
          description="This removes the meet for everyone, including its invitations and room history. This cannot be undone."
          confirmLabel="Delete meet"
          cancelLabel="Keep meet"
          danger
          onClose={() => setDeleteMeetTarget(null)}
          onConfirm={deleteMeet}
        />
      )}
      {confirmEmptyMeet && (
        <ActionDialog
          eyebrow={editing ? "SAVE WITHOUT INVITEES" : "CREATE WITHOUT INVITEES"}
          title={`${editing ? "Save" : "Create"} this meet without invitees?`}
          description="Only you will be attending initially. You can invite people later by editing the meet."
          confirmLabel={editing ? "Save without invitees" : "Create without invitees"}
          cancelLabel="Go back to invites"
          onClose={() => setConfirmEmptyMeet(false)}
          onConfirm={() => meetFormRef.current ? persistMeet(meetFormRef.current) : false}
        />
      )}
    </div>
  );
}

function SavedContentCard({ item, onOpen, compact = false }: { item: SavedContentItem; onOpen: (item: SavedContentItem) => void; compact?: boolean }) {
  const details = item.details,
    kindLabel = item.entityType === "meeting" ? "Meet" : item.entityType[0].toUpperCase() + item.entityType.slice(1),
    title = item.entityType === "post"
      ? `Post by ${String(details.authorName ?? "an n2 member")}`
      : item.entityType === "comment"
        ? `Comment on ${String(details.projectTitle ?? "a project")}`
        : String(details.title ?? "Saved item"),
    excerpt = String(details.summary ?? details.description ?? details.body ?? "Open this saved item to see the full details."),
    person = String(details.authorName ?? details.ownerName ?? details.hostName ?? ""),
    dateValue = details.startsAt ?? details.createdAt ?? item.updatedAt,
    meta = item.entityType === "project"
      ? [details.industry, details.stage].filter(Boolean).join(" · ")
      : item.entityType === "meeting"
        ? [details.mode, details.location].filter(Boolean).join(" · ")
        : person,
    image = String(details.attachmentType === "image" ? details.attachmentUrl ?? "" : details.thumbnailUrl ?? ""),
    Icon = item.entityType === "project" ? BriefcaseBusiness : item.entityType === "meeting" ? CalendarDays : MessageCircle;
  return (
    <article className={`saved-content-card saved-${item.entityType} ${compact ? "compact" : ""}`}>
      {image && <img src={image} alt="" loading="lazy" decoding="async" />}
      <button type="button" onClick={() => onOpen(item)} aria-label={`Open ${kindLabel.toLowerCase()} ${title}`}>
        <span className="saved-content-kind"><Icon size={14} /> {kindLabel}</span>
        <strong>{title}</strong>
        <p>{excerpt}</p>
        <small>{meta}{meta && dateValue ? " · " : ""}{dateValue ? new Date(String(dateValue)).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : ""}</small>
      </button>
      <span className="saved-content-link">View {kindLabel.toLowerCase()} <ArrowUpRight size={14} /></span>
      {item.pinned && <span className="saved-content-pin"><Pin size={13} fill="currentColor" /> Pinned</span>}
    </article>
  );
}

function ProfileView({
  member,
  userId,
  onEdit,
  onProject,
  onProfile,
  onPost,
  onMeet,
  onShare,
  onToast,
  onResumePostDraft,
}: {
  member: MemberPerson;
  userId?: string | null;
  onEdit: () => void;
  onProject: (projectId: string) => void;
  onProfile: (userId: string) => void;
  onPost: (postId: string) => void;
  onMeet: (meetingId: string) => void;
  onShare: (item: { id: string; title: string; summary: string; kind?: "project" | "post" | "profile"; sharePath?: string }) => void;
  onToast: (message: string) => void;
  onResumePostDraft: (draft: ContentDraft<PostDraftPayload>) => void;
}) {
  const [profile, setProfile] = useState<ProfileRecord | null>(null),
    [profileLoading, setProfileLoading] = useState(true),
    [section, setSection] = useState<
      "profile" | "posts" | "projects" | "followers" | "following" | "media" | "likes" | "reposts" | "bookmarks"
    >("profile"),
    [postView, setPostView] = useState<"published" | "drafts">("published"),
    [projectView, setProjectView] = useState<"history" | "watching">("history"),
    [postDraftCount, setPostDraftCount] = useState(0),
    [networkPeople, setNetworkPeople] = useState<
      Array<{
        id: string;
        name: string | null;
        image: string | null;
        profession: string | null;
      }>
    >([]),
    [media, setMedia] = useState<
      Array<{
        id: string;
        body: string;
        attachmentType: string | null;
        attachmentUrl: string | null;
        videoUrl: string | null;
      }>
    >([]),
    [saved, setSaved] = useState<SavedContentItem[]>([]),
    [activity, setActivity] = useState<ProfileActivity>({ likes: [], watching: [], reposts: [] }),
    [activityLoading, setActivityLoading] = useState(false),
    [profilePins, setProfilePins] = useState<SavedContentItem[]>([]),
    [savedCategory, setSavedCategory] = useState<"all" | SavedContentItem["entityType"]>("all"),
    [busy, setBusy] = useState(false),
    [unfollowOpen, setUnfollowOpen] = useState(false);
  useEffect(() => {
    if (!userId) {
      setProfileLoading(false);
      return;
    }
    const controller = new AbortController();
    let active = true;
    setProfileLoading(true);
    fetch(`/api/profiles/${userId}`, { cache: "no-store", signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => active && setProfile(data?.profile ?? null))
      .catch(() => undefined)
      .finally(() => active && setProfileLoading(false));
    return () => { active = false; controller.abort(); };
  }, [userId]);
  useEffect(() => {
    if (!profile?.isCurrent) {
      setPostDraftCount(0);
      return;
    }
    const loadDraftCount = () => {
      fetch("/api/drafts?kind=post", { cache: "no-store" })
        .then(response => response.ok ? response.json() : { drafts: [] })
        .then(data => setPostDraftCount((data.drafts ?? []).length))
        .catch(() => undefined);
    };
    const changed = (event: Event) => {
      if ((event as CustomEvent<{ kind?: string }>).detail?.kind === "post") loadDraftCount();
    };
    loadDraftCount();
    window.addEventListener("n2:drafts-changed", changed);
    return () => window.removeEventListener("n2:drafts-changed", changed);
  }, [profile?.isCurrent]);
  useEffect(() => {
    if (!userId || !profile) return;
    fetch(`/api/saved-items?profile=${encodeURIComponent(userId)}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((data) => setProfilePins((data.items ?? []).filter((item: SavedContentItem) => item.pinned).slice(0, 3)))
      .catch(() => setProfilePins([]));
  }, [userId, profile]);
  useEffect(() => {
    if (!userId) return;
    if (section === "followers" || section === "following")
      fetch(`/api/profiles/${userId}/follows?list=${section}`, {
        cache: "no-store",
      })
        .then((response) => (response.ok ? response.json() : { people: [] }))
        .then((data) => setNetworkPeople(data.people ?? []));
    if (section === "media")
      fetch(`/api/profiles/${userId}/media`)
        .then((response) => (response.ok ? response.json() : { media: [] }))
        .then((data) => setMedia(data.media ?? []));
    if (section === "bookmarks" && profile?.isCurrent)
      fetch("/api/saved-items")
        .then((response) => (response.ok ? response.json() : { items: [] }))
        .then((data) => setSaved(data.items ?? []));
    if (section === "likes" || section === "projects" || section === "reposts") {
      setActivityLoading(true);
      fetch(`/api/profiles/${userId}/activity`, { cache: "no-store" })
        .then((response) => response.ok ? response.json() : { likes: [], watching: [], reposts: [] })
        .then((data) => setActivity({ likes: data.likes ?? [], watching: data.watching ?? [], reposts: data.reposts ?? [] }))
        .finally(() => setActivityLoading(false));
    }
  }, [section, userId, profile?.isCurrent]);
  async function connect() {
    if (!profile || profile.isCurrent || busy) return;
    if (profile.isFollowing) { setUnfollowOpen(true); return; }
    await updateFollow();
  }
  async function updateFollow() {
    if (!profile || profile.isCurrent || busy) return false;
    setBusy(true);
    const response = await fetch(`/api/users/${profile.id}/follow`, {
        method: profile.isFollowing ? "DELETE" : "POST",
      }),
      result = await response.json();
    if (response.ok) {
      signalNetworkChanged();
      setProfile((current) =>
        current
          ? {
              ...current,
              isFollowing: result.following,
              isMutual: result.mutual,
              followers: Math.max(
                0,
                current.followers + (result.following ? 1 : -1),
              ),
            }
          : current,
      );
    }
    setBusy(false);
    return response.ok;
  }
  function openSaved(item: SavedContentItem) {
    if (item.entityType === "project") onProject(item.entityId);
    else if (item.entityType === "comment" && item.details.projectId) onProject(String(item.details.projectId));
    else if (item.entityType === "post") onPost(item.entityId);
    else if (item.entityType === "meeting") onMeet(item.entityId);
  }
  const person: MemberPerson = profile
      ? {
          id: profile.id,
          name: profile.name ?? "n2 member",
          role: profile.isFounder
            ? "n2 Founder"
            : profile.headline ?? profile.profession ?? "n2 member",
          img: profile.image,
          isN2Admin: profile.isN2Admin,
        }
      : member,
    skills = profile?.rankedSkills?.slice(0, 3) ?? [];
  if (profileLoading) return <LoadingState label="Loading profile" count={2} />;
  if (profile?.deactivated) return (
    <div className="subpage profile-page deactivated-profile">
      <div className="profile-cover"><span>n2</span></div>
      <div className="profile-main">
        <Avatar person={{ name: profile.name ?? "Unavailable member", role: "Account unavailable" }} size="xl" ring />
        <h1>{profile.name ?? "n2 member"}</h1>
        <span className="profile-username">@{profile.username}</span>
        <div className="deactivated-profile-notice"><UserX size={22}/><div><strong>Account unavailable</strong><p>This member is not currently available. Their previous posts and messages remain labelled to preserve conversation history.</p></div></div>
      </div>
    </div>
  );
  return (
    <div className="subpage profile-page">
      {unfollowOpen && (
        <ActionDialog eyebrow="UNFOLLOW MEMBER" title={`Stop following ${profile?.name ?? "this member"}?`} description="Their updates will no longer be prioritised in your network feed. You can follow them again later." confirmLabel="Stop following" cancelLabel="Keep following" danger onClose={() => setUnfollowOpen(false)} onConfirm={updateFollow} />
      )}
      <div
        className="profile-cover"
        style={
          profile?.coverImage
            ? { backgroundImage: `url(${profile.coverImage})` }
            : undefined
        }
      >
        <span>{profile?.coverImage ? "" : "n2"}</span>
      </div>
      <div className="profile-main">
        <Avatar person={person} size="xl" ring />
        <button
          className={`secondary-button ${profile?.isMutual ? "connected" : ""}`}
          disabled={busy}
          onClick={profile?.isCurrent ? onEdit : connect}
        >
          {profile?.isCurrent !== false
            ? "Edit profile"
            : profile?.isMutual
              ? "Connected"
              : profile?.isFollowing
                ? "Following"
                : "Follow"}
        </button>
        <h1>
          {person.name} {person.isN2Admin && <N2AdminBadge />}
        </h1>
        {profile?.username && (
          profile.visibility === "public" && !profile.isCurrent
            ? <a className="profile-username" href={`/${profile.username}`}>@{profile.username} <ArrowUpRight size={12} /></a>
            : <span className="profile-username">@{profile.username}</span>
        )}
        <div className="profile-role">
          <span className="profile-identity">
            {profile?.isFounder ? (
              <N2FounderLabel />
            ) : profile?.isN2Admin ? (
              <N2IntAilliumWordmark />
            ) : (
              person.role
            )}
          </span>
          {profile?.location && (
            <>
              <span className="profile-meta-separator" aria-hidden="true">·</span>
              <span className="profile-location">{profile.location}</span>
            </>
          )}
        </div>
        <div className="profile-network-counts">
          <button
            className={section === "followers" ? "active" : ""}
            onClick={() => setSection("followers")}
          >
            <strong>{profile?.followers ?? 0}</strong> followers
          </button>
          <button
            className={section === "following" ? "active" : ""}
            onClick={() => setSection("following")}
          >
            <strong>{profile?.following ?? 0}</strong> following
          </button>
          {profile?.isMutual && <b>Connected</b>}
          <button
            type="button"
            className="profile-share-button"
            disabled={!profile?.username}
            aria-label={`Share ${person.name}'s profile`}
            title="Share profile"
            onClick={() => profile?.username && onShare({
              id: profile.id,
              title: `${person.name}'s profile`,
              summary: profile.headline ?? profile.profession ?? `Connect with @${profile.username} on nice 2 network.`,
              kind: "profile",
              sharePath: `/${profile.username}`,
            })}
          >
            <Share2 size={17} />
          </button>
        </div>
        <nav className="profile-tabs">
          {(["profile", "posts", "projects", "media", "likes", "reposts"] as const).map(
            (item) => (
              <button
                key={item}
                className={section === item ? "active" : ""}
                onClick={() => setSection(item)}
              >
                {item[0].toUpperCase() + item.slice(1)}
              </button>
            ),
          )}
          {profile?.isCurrent && (
            <button
              className={section === "bookmarks" ? "active" : ""}
              onClick={() => setSection("bookmarks")}
            >
              <Bookmark size={14} /> Bookmarks
            </button>
          )}
        </nav>
        {section === "followers" || section === "following" ? (
          <section className="profile-library">
            <div className="profile-section-head">
              <span className="eyebrow">{section.toUpperCase()}</span>
              <small>
                {section === "followers"
                  ? profile?.isCurrent
                    ? "People who follow you"
                    : `People who follow ${person.name}`
                  : profile?.isCurrent
                    ? "People you follow"
                    : `People ${person.name} follows`}
              </small>
            </div>
            <div className="following-list">
              {networkPeople.map((item) => (
                <a
                  key={item.id}
                  href={`/?profile=${encodeURIComponent(item.id)}`}
                  aria-label={`Open ${item.name ?? "n2 member"}'s profile`}
                >
                  <Avatar
                    person={{
                      name: item.name ?? "n2 member",
                      role: item.profession ?? "n2 member",
                      img: item.image,
                    }}
                    size="md"
                  />
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.profession}</small>
                  </span>
                </a>
              ))}
              {!networkPeople.length && (
                <p className="profile-empty">
                  No visible {section} yet.
                </p>
              )}
            </div>
          </section>
        ) : section === "posts" ? (
          <section className={`profile-library ${profile?.isCurrent ? "profile-library-with-subtabs" : ""}`}>
            {profile?.isCurrent && (
              <div className="profile-subtabs" role="tablist" aria-label="Post views">
                <button type="button" role="tab" aria-selected={postView === "published"} className={postView === "published" ? "active" : ""} onClick={() => setPostView("published")}>Published <b>{profile.posts?.length ?? 0}</b></button>
                <button type="button" role="tab" aria-selected={postView === "drafts"} className={postView === "drafts" ? "active" : ""} onClick={() => setPostView("drafts")}>Drafts <b>{postDraftCount}</b></button>
              </div>
            )}
            <div className="profile-section-head">
              <span className="eyebrow">POSTS</span>
            </div>
            {profile?.isCurrent && postView === "drafts" ? (
              <ContentDraftList kind="post" emptyMessage="No post drafts saved yet." onCountChange={setPostDraftCount} onResume={(draft) => onResumePostDraft(draft as ContentDraft<PostDraftPayload>)} />
            ) : <div className="profile-post-list">
              {profile?.posts?.map((post) => (
                <TimelinePostCard
                  key={post.id}
                  post={post}
                  currentMember={member}
                  onProfile={onProfile}
                  onProject={(projectId) => projectId && onProject(projectId)}
                  onThread={() => onPost(post.id)}
                  onEngage={() => undefined}
                  canEngage
                  onShare={onShare}
                  onToast={onToast}
                  onChanged={(next) => setProfile(current => current ? {
                    ...current,
                    posts: next
                      ? current.posts.map(item => item.id === next.id ? next : item)
                      : current.posts.filter(item => item.id !== post.id),
                  } : current)}
                />
              ))}
              {!profile?.posts?.length && <p className="profile-empty">No posts shared yet.</p>}
            </div>}
          </section>
        ) : section === "projects" ? (
          <section className="profile-library profile-library-with-subtabs">
            <div className="profile-subtabs" role="tablist" aria-label="Project views">
              <button type="button" role="tab" aria-selected={projectView === "history"} className={projectView === "history" ? "active" : ""} onClick={() => setProjectView("history")}>Project history <b>{profile?.projects?.length ?? 0}</b></button>
              <button type="button" role="tab" aria-selected={projectView === "watching"} className={projectView === "watching" ? "active" : ""} onClick={() => setProjectView("watching")}>Watching <b>{activity.watching.length}</b></button>
            </div>
            <div className="profile-section-head">
              <span className="eyebrow">{projectView === "history" ? "PROJECT HISTORY" : "WATCHING"}</span>
              <small>{projectView === "history" ? "Started and contributed projects" : "Projects this member is keeping an eye on"}</small>
            </div>
            {projectView === "history" ? <div className="profile-project-grid">
              {profile?.projects?.map((project) => (
                <article key={project.id}>
                  <header>
                    <span>
                      {project.isOwner
                        ? "FOUNDER"
                        : (
                            project.department || project.membershipRole
                          ).toUpperCase()}
                    </span>
                    <i>{project.status}</i>
                  </header>
                  <h3>
                    <button
                      type="button"
                      onClick={() => onProject(project.id)}
                      aria-label={`Open project ${project.title}`}
                    >
                      {project.title}
                    </button>
                  </h3>
                  <p>{project.summary}</p>
                  <footer>
                    <span>{project.industry}</span>
                    <span>{project.stage}</span>
                  </footer>
                </article>
              ))}
              {!profile?.projects?.length && (
                <p className="profile-empty">No public project history yet.</p>
              )}
            </div> : activityLoading ? <div className="profile-activity-loading"><span/>Loading watched projects…</div> : <div className="profile-project-grid profile-watching-grid">
              {activity.watching.map(project => <article key={project.id}>
                <header><span>WATCHING</span><Eye size={15}/></header>
                <h3><button type="button" onClick={() => onProject(project.id)} aria-label={`Open project ${project.title}`}>{project.title}</button></h3>
                <p>{project.summary}</p>
                <footer><span>{project.industry}</span><span>{project.stage}</span></footer>
              </article>)}
              {!activity.watching.length && <p className="profile-empty">No public watched projects yet.</p>}
            </div>}
          </section>
        ) : section === "media" ? (
          <section className="profile-library">
            <div className="media-grid">
              {media.map((item) =>
                item.attachmentType === "image" && item.attachmentUrl ? (
                  <article key={item.id}>
                    <img src={item.attachmentUrl} alt={item.body} loading="lazy" decoding="async" />
                    <p>{item.body}</p>
                  </article>
                ) : item.attachmentType === "video" && item.attachmentUrl ? (
                  <article key={item.id}>
                    <video src={item.attachmentUrl} controls />
                    <p>{item.body}</p>
                  </article>
                ) : null,
              )}
              {!media.length && (
                <p className="profile-empty">No public media shared yet.</p>
              )}
            </div>
          </section>
        ) : section === "likes" || section === "reposts" ? (
          <section className="profile-library profile-activity-library">
            <div className="profile-section-head">
              <div><span className="eyebrow">{section.toUpperCase()}</span><h2>{section === "likes" ? "Posts this member appreciates" : "Posts shared again with their network"}</h2></div>
              <small>{activity[section].length} public {section}</small>
            </div>
            {activityLoading ? <div className="profile-activity-loading"><span/>Loading {section}…</div> : <div className="profile-activity-list">
              {activity[section].map((item) => <article key={item.id} className="profile-activity-card">
                <button type="button" onClick={() => onPost(item.id)} aria-label={`Open post by ${item.authorName ?? "n2 member"}`}>
                  <Avatar person={{ name: item.authorName ?? "n2 member", role: item.authorProfession ?? "n2 member", img: item.authorImage }} size="md" />
                  <span><small>{section === "likes" ? "LIKED" : "REPOSTED"} · {formatNetworkDate(item.actedAt, { day: "numeric", month: "short", year: "numeric" })}</small><strong>{item.authorName ?? "n2 member"}</strong><p>{item.body}</p></span>
                  {section === "likes" ? <ThumbsUp size={18}/> : <Repeat2 size={18}/>}
                </button>
              </article>)}
              {!activity[section].length && <p className="profile-empty">No public {section} yet.</p>}
            </div>}
          </section>
        ) : section === "bookmarks" ? (
          <section className="profile-library">
            <div className="profile-section-head saved-library-head">
              <div><span className="eyebrow">SAVED LIBRARY</span><h2>Your bookmarks, with their original context.</h2></div>
              <small>{saved.filter(item => item.bookmarked).length} bookmarks</small>
            </div>
            <div className="saved-category-tabs" role="tablist" aria-label="Bookmark categories">
              {(["all", "post", "project", "meeting", "comment"] as const).map(category => {
                const count = saved.filter(item => item.bookmarked && (category === "all" || item.entityType === category)).length;
                return <button type="button" role="tab" aria-selected={savedCategory === category} className={savedCategory === category ? "active" : ""} key={category} onClick={() => setSavedCategory(category)}>{category === "all" ? "All" : category === "meeting" ? "Meets" : `${category[0].toUpperCase()}${category.slice(1)}s`} <b>{count}</b></button>;
              })}
            </div>
            <div className="saved-content-grid">
              {saved.filter(item => item.bookmarked && (savedCategory === "all" || item.entityType === savedCategory)).map(item => <SavedContentCard key={item.id} item={item} onOpen={openSaved} />)}
              {!saved.some(item => item.bookmarked && (savedCategory === "all" || item.entityType === savedCategory)) && <p className="profile-empty">No bookmarks in this category yet.</p>}
            </div>
          </section>
        ) : (
          <>
            {profilePins.length > 0 && (
              <section className="profile-pins">
                <div className="profile-section-head"><div><span className="eyebrow">PINNED</span><h2>{profile?.isCurrent ? "Your profile highlights" : `${person.name}'s profile highlights`}</h2></div><small>Up to three pins</small></div>
                <div className={`profile-pin-grid pin-count-${profilePins.length}`}>{profilePins.map(item => <SavedContentCard key={item.id} item={item} onOpen={openSaved} compact />)}</div>
              </section>
            )}
            <section className="profile-section bio-section">
              <span className="eyebrow">ABOUT</span>
              <p className="profile-bio">
                {profile?.bio || "This member hasn’t added a bio yet."}
              </p>
            </section>
            <section className="profile-section">
              <div className="profile-section-head">
                <span className="eyebrow">CAREER SKILLS</span>
                <small>Ranked by strength</small>
              </div>
              <div className="ranked-skills">
                {skills.map((skill, index) => (
                  <div key={skill}>
                    <b>{index + 1}</b>
                    <span>
                      <small>
                        {["PRIMARY", "SECONDARY", "TERTIARY"][index]}
                      </small>
                      <strong>{skill}</strong>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

type ProjectComment = {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string | null;
  authorImage: string | null;
  authorIsAdmin: boolean;
  isPinned?: boolean;
  isBookmarked?: boolean;
};
type PostReply = {
  id: string;
  body: string;
  createdAt: string;
  editedAt?: string | null;
  authorId: string;
  authorName: string | null;
  authorImage: string | null;
  authorProfession?: string | null;
  authorStatus?: string;
  authorIsAdmin?: boolean;
  isDemo?: boolean;
};
function PostThread({
  initialPost,
  currentUserId,
  onClose,
  onProfile,
  onUpdated,
}: {
  initialPost: TimelinePost;
  currentUserId?: string;
  onClose: () => void;
  onProfile: (userId: string) => void;
  onUpdated: (post: TimelinePost) => void;
}) {
  const [post, setPost] = useState(initialPost),
    [replies, setReplies] = useState<PostReply[]>([]),
    [draft, setDraft] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [editReplyTarget, setEditReplyTarget] = useState<PostReply | null>(null),
    [deleteReplyTarget, setDeleteReplyTarget] = useState<PostReply | null>(null),
    [error, setError] = useState("");
  const replyRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    fetch(`/api/posts/${initialPost.id}/thread`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error ?? "Could not load this conversation.");
        setPost((current) => ({ ...current, ...result.post }));
        setReplies(result.replies ?? []);
      })
      .catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not load this conversation.",
        ),
      )
      .finally(() => setLoading(false));
  }, [initialPost.id]);
  function update(next: TimelinePost) {
    setPost(next);
    onUpdated(next);
    window.dispatchEvent(new CustomEvent("n2:post-updated", { detail: next }));
  }
  async function react(action: "like" | "repost") {
    const response = await fetch(`/api/posts/${post.id}/reactions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      }),
      result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "Could not update this post.");
      return;
    }
    update({
      ...post,
      liked: action === "like" ? result.active : post.liked,
      reposted: action === "repost" ? result.active : post.reposted,
      likeCount: result.likeCount,
      repostCount: result.repostCount,
    });
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;
    setBusy(true);
    setError("");
    const response = await fetch(`/api/posts/${post.id}/thread`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: draft }),
      }),
      result = await response.json();
    if (response.ok) {
      setReplies((rows) => [...rows, result.reply]);
      setDraft("");
      update({ ...post, replyCount: (post.replyCount ?? replies.length) + 1 });
    } else setError(result.error ?? "Could not add your reply.");
    setBusy(false);
  }
  async function editReply(values: Record<string, string>) {
    if (!editReplyTarget) return false;
    setError("");
    const response = await fetch(`/api/posts/${post.id}/thread/${editReplyTarget.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: values.body }),
      }),
      result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "Could not edit your reply.");
      return false;
    }
    setReplies((rows) => rows.map((reply) => reply.id === editReplyTarget.id ? { ...reply, ...result.reply } : reply));
    setEditReplyTarget(null);
  }
  async function deleteReply() {
    if (!deleteReplyTarget) return false;
    setError("");
    const response = await fetch(`/api/posts/${post.id}/thread/${deleteReplyTarget.id}`, { method: "DELETE" }),
      result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "Could not delete your reply.");
      return false;
    }
    setReplies((rows) => rows.filter((reply) => reply.id !== deleteReplyTarget.id));
    update({ ...post, replyCount: Math.max(0, (post.replyCount ?? replies.length) - 1) });
    setDeleteReplyTarget(null);
  }
  return (
    <>
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section
        className="comment-thread post-thread"
        role="dialog"
        aria-modal="true"
        aria-label={`Replies to ${post.authorName ?? "this post"}`}
      >
        <header>
          <span className="eyebrow">POST CONVERSATION</span>
          <button className="icon-button" onClick={onClose}>
            <X size={19} />
          </button>
        </header>
        <article className="thread-project thread-post">
          <div className="person-line">
            <Avatar
              person={{
                name: post.authorName ?? "n2 member",
                role: post.authorProfession ?? "n2 member",
                img: post.authorImage,
                isN2Admin: post.authorIsAdmin,
              }}
              size="md"
            />
            <div>
              <button
                className="profile-name"
                onClick={() => {
                  onProfile(post.authorId);
                  onClose();
                }}
              >
                {post.authorName ?? "n2 member"}{" "}
                {post.authorIsAdmin && <N2AdminBadge />}{" "}
                {post.isDemo && <DemoBadge />}
                {post.authorStatus && post.authorStatus !== "active" && <small className="account-state-badge">Account no longer active</small>}
              </button>
              <span>
                {post.authorProfession ?? "n2 member"} ·{" "}
                {formatNetworkDate(post.createdAt, {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
          </div>
          <p><LinkifiedText text={post.body} /></p>
          <RichLinkPreview text={post.body} url={post.videoUrl} />
          <div className="thread-post-actions">
            <button
              className={post.liked ? "active" : ""}
              onClick={() => react("like")}
            >
              <ThumbsUp size={14} fill={post.liked ? "currentColor" : "none"} />{" "}
              Like {post.likeCount ?? 0}
            </button>
            <button
              className={post.reposted ? "active" : ""}
              onClick={() => react("repost")}
            >
              <Repeat2 size={14} /> Repost {post.repostCount ?? 0}
            </button>
          </div>
        </article>
        <div className="thread-comments">
          {error && <p className="form-error">{error}</p>}
          {loading ? (
            <p className="profile-empty">Loading replies…</p>
          ) : replies.length ? (
            replies.map((reply) => (
              <article key={reply.id}>
                <Avatar
                  person={{
                    name: reply.authorName ?? "n2 member",
                    role: reply.authorProfession ?? "",
                    img: reply.authorImage,
                    isN2Admin: reply.authorIsAdmin,
                  }}
                  size="sm"
                />
                <div>
                  <div className="post-reply-heading">
                    <button className="profile-name" onClick={() => { onProfile(reply.authorId); onClose(); }}>
                      {reply.authorName ?? "n2 member"}{" "}
                      {reply.authorIsAdmin && <N2AdminBadge />}{" "}
                      {reply.isDemo && <DemoBadge />}
                      {reply.authorStatus && reply.authorStatus !== "active" && <small className="account-state-badge">Account no longer active</small>}
                    </button>
                    <span className="post-reply-meta">
                      <time>{new Date(reply.createdAt).toLocaleString()}</time>
                      {reply.editedAt && <small>Edited</small>}
                    </span>
                    {reply.authorId === currentUserId && (
                      <span className="post-reply-actions">
                        <button type="button" aria-label="Edit reply" title="Edit reply" onClick={() => setEditReplyTarget(reply)}><Pencil size={13} /></button>
                        <button type="button" className="danger" aria-label="Delete reply" title="Delete reply" onClick={() => setDeleteReplyTarget(reply)}><Trash2 size={13} /></button>
                      </span>
                    )}
                  </div>
                  <p><LinkifiedText text={reply.body} /></p>
                  <RichLinkPreview text={reply.body} />
                </div>
              </article>
            ))
          ) : (
            <div className="comment-empty">
              <MessageCircle size={20} />
              <strong>Start the conversation</strong>
              <p>Reply with a question, perspective, encouragement or offer of support.</p>
            </div>
          )}
        </div>
        <form
          className="comment-composer post-reply-composer"
          onSubmit={submit}
        >
          <EmojiPicker
            onSelect={(emoji) => setDraft((value) => `${value}${emoji}`)}
          />
          <MentionSuggestions
            value={draft}
            inputRef={replyRef}
            setValue={setDraft}
            placement="reply"
          />
          <label>
            <span className="sr-only">Write a reply</span>
            <input
              ref={replyRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={`Reply to ${post.authorName ?? "this post"}…`}
              maxLength={2000}
            />
          </label>
          <button
            className="post-reply-send"
            disabled={busy || !draft.trim()}
            aria-label="Post reply"
          >
            <Send size={17} />
          </button>
        </form>
      </section>
    </div>
    {editReplyTarget && (
      <ActionDialog eyebrow="EDIT REPLY" title="Edit your reply." confirmLabel="Save reply" fields={[{ name: "body", label: "Reply", defaultValue: editReplyTarget.body, required: true, maxLength: 2000 }]} onClose={() => setEditReplyTarget(null)} onConfirm={editReply} />
    )}
    {deleteReplyTarget && (
      <ActionDialog eyebrow="DELETE REPLY" title="Delete this reply?" description="This removes the reply from the post conversation." confirmLabel="Delete reply" cancelLabel="Keep reply" danger onClose={() => setDeleteReplyTarget(null)} onConfirm={deleteReply} />
    )}
    </>
  );
}

function ProjectComments({
  project,
  onClose,
  onProfile,
}: {
  project: ProjectRecord;
  onClose: () => void;
  onProfile: (userId: string) => void;
}) {
  const [comments, setComments] = useState<ProjectComment[]>([]),
    [draft, setDraft] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const commentRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    fetch(`/api/projects/${project.id}/comments`)
      .then((r) => (r.ok ? r.json() : { comments: [] }))
      .then((data) => setComments(data.comments ?? []))
      .finally(() => setLoading(false));
  }, [project.id]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;
    setBusy(true);
    const response = await fetch(`/api/projects/${project.id}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: draft }),
    });
    if (response.ok) {
      const result = await response.json();
      setComments((rows) => [...rows, result.comment]);
      setDraft("");
    }
    setBusy(false);
  }
  async function saveComment(
    comment: ProjectComment,
    action: "pin" | "bookmark",
  ) {
    setError("");
    const response = await fetch("/api/saved-items", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          entityType: "comment",
          entityId: comment.id,
          action,
        }),
      }),
      result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "Could not save this comment.");
      return;
    }
    setComments((rows) =>
      rows.map((row) =>
        row.id === comment.id
          ? { ...row, isPinned: result.pinned, isBookmarked: result.bookmarked }
          : row,
      ),
    );
  }
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className="comment-thread"
        role="dialog"
        aria-modal="true"
        aria-label={`Comments on ${project.title}`}
      >
        <header>
          <div>
            <span className="eyebrow">PROJECT CONVERSATION</span>
            <h2>
              {comments.length} {comments.length === 1 ? "comment" : "comments"}
            </h2>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X size={19} />
          </button>
        </header>
        <article className="thread-project">
          <div className="person-line">
            <Avatar
              person={{
                name: project.ownerName ?? "n2 member",
                role: project.industry,
                img: project.ownerImage,
                isN2Admin: project.ownerIsAdmin,
              }}
              size="md"
            />
            <div>
              <button
                className="profile-name"
                onClick={() => project.ownerId && onProfile(project.ownerId)}
              >
                {project.ownerName ?? "n2 member"}{" "}
                {project.ownerIsAdmin && <N2AdminBadge />}
              </button>
              <span>
                {project.industry} · {project.stage}
              </span>
            </div>
          </div>
          <span className="eyebrow">PROJECT</span>
          <h3>{project.title}</h3>
          <p>{project.summary}</p>
          <div>
            <Eye size={15} />
            {project.eyeCount} views
          </div>
        </article>
        <div className="thread-comments">
          {error && <p className="form-error">{error}</p>}
          {loading ? (
            <p className="profile-empty">Loading conversation…</p>
          ) : comments.length ? (
            comments.map((comment) => (
              <article key={comment.id}>
                <Avatar
                  person={{
                    name: comment.authorName ?? "n2 member",
                    role: "",
                    img: comment.authorImage,
                    isN2Admin: comment.authorIsAdmin,
                  }}
                  size="sm"
                />
                <div>
                  <button
                    className="profile-name"
                    onClick={() => {
                      onProfile(comment.authorId);
                      onClose();
                    }}
                  >
                    {comment.authorName ?? "n2 member"}{" "}
                    {comment.authorIsAdmin && <N2AdminBadge />}
                  </button>
                  <time>{new Date(comment.createdAt).toLocaleString()}</time>
                  <p><LinkifiedText text={comment.body} /></p>
                  <div className="comment-save-actions">
                    <button onClick={() => saveComment(comment, "pin")}>
                      <Pin size={13} />
                      {comment.isPinned ? "Unpin" : "Pin"}
                    </button>
                    <button onClick={() => saveComment(comment, "bookmark")}>
                      <Bookmark size={13} />
                      {comment.isBookmarked ? "Bookmarked" : "Bookmark"}
                    </button>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="comment-empty">
              <MessageCircle size={20} />
              <strong>Start the project conversation</strong>
              <p>Ask a question, share encouragement or offer a contribution.</p>
            </div>
          )}
        </div>
        <form
          className="comment-composer post-reply-composer project-comment-composer"
          onSubmit={submit}
        >
          <EmojiPicker
            onSelect={(emoji) => setDraft((value) => `${value}${emoji}`)}
          />
          <MentionSuggestions
            value={draft}
            inputRef={commentRef}
            setValue={setDraft}
            placement="reply"
          />
          <label>
            <span className="sr-only">Write a project comment</span>
            <input
              ref={commentRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Add a thoughtful comment…"
              maxLength={2000}
              autoComplete="off"
            />
          </label>
          <button
            className="post-reply-send"
            disabled={busy || !draft.trim()}
            aria-label="Post comment"
          >
            <Send size={17} />
          </button>
        </form>
      </section>
    </div>
  );
}

function MatchPanel({
  onClose,
  onMessage,
}: {
  onClose: () => void;
  onMessage: () => void;
}) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.currentTarget === event.target && onClose()}
    >
      <section className="match-panel" role="dialog" aria-modal="true">
        <div className="modal-head">
          <button className="icon-button" onClick={onClose}>
            <X size={20} />
          </button>
          <span>Suggested contributor</span>
          <span className="match-score">94%</span>
        </div>
        <div className="match-body">
          <span className="eyebrow">OWNER CANDIDATE SUGGESTION</span>
          <div className="match-person">
            <Avatar person={people.lena} size="xl" ring />
            <div>
              <h2>Lena Vogt</h2>
              <p>Brand strategist · Climate and public good</p>
              <span>
                <MapPin size={13} /> London · relevant project experience
              </span>
            </div>
          </div>
          <div className="reason-grid">
            <div>
              <N2Mark />
              <strong>Project fit</strong>
              <p>Lena’s experience fits an unfilled role in this project.</p>
            </div>
            <div>
              <UsersRound size={16} />
              <strong>Owner decision</strong>
              <p>
                This is a suggestion, not membership or an automatic invitation.
              </p>
            </div>
            <div>
              <Bookmark size={16} />
              <strong>Safe outreach</strong>
              <p>
                Open their profile and follow them before messaging unless their
                messages are open.
              </p>
            </div>
          </div>
          <div className="match-actions">
            <button className="secondary-button" onClick={onClose}>
              Maybe later
            </button>
            <button className="primary-button" onClick={onMessage}>
              <NetworkGraphIcon size={16} /> Review candidates
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

type ShortlistCandidate = {
  recommendationId: string;
  roleId: string;
  userId: string;
  name: string | null;
  image: string | null;
  profession: string | null;
  primarySkill: string | null;
  score: number;
  tier: string;
  reasons: string[];
};
function ShortlistPanel({
  projectId,
  onClose,
  onProfile,
  onToast,
}: {
  projectId: string;
  onClose: () => void;
  onProfile: (userId: string) => void;
  onToast: (message: string) => void;
}) {
  const [roles, setRoles] = useState<
      Array<{
        roleId: string;
        roleTitle: string;
        phase: string;
        candidates: ShortlistCandidate[];
      }>
    >([]),
    [loading, setLoading] = useState(true),
    [invited, setInvited] = useState<string[]>([]);
  useEffect(() => {
    fetch(`/api/projects/${projectId}/shortlist`)
      .then((response) => (response.ok ? response.json() : { roles: [] }))
      .then((result) => setRoles(result.roles ?? []))
      .finally(() => setLoading(false));
  }, [projectId]);
  async function invite(candidate: ShortlistCandidate) {
    const response = await fetch(`/api/projects/${projectId}/invitations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        inviteeId: candidate.userId,
        roleId: candidate.roleId,
      }),
    });
    const result = await response.json();
    if (response.ok) {
      setInvited((rows) => [...rows, candidate.recommendationId]);
      onToast(`Invitation sent to ${candidate.name ?? "this member"}.`);
    } else onToast(result.error ?? "The invitation could not be sent.");
  }
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="shortlist-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Recommended project contributors"
      >
        <header>
          <div>
            <span className="eyebrow">OWNER SHORTLIST</span>
            <h2>People who could move this forward</h2>
            <p>
              Every open position is shown, with up to five active candidates per role.
            </p>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X size={19} />
          </button>
        </header>
        {loading ? (
          <div className="shortlist-empty">
            Building an explainable shortlist…
          </div>
        ) : roles.length ? (
          roles.map((role) => (
            <section key={role.roleId}>
              <div className="shortlist-role">
                <span>{role.phase}</span>
                <strong>{role.roleTitle}</strong>
                <small>
                  {role.candidates.length
                    ? `${role.candidates.length} ${role.candidates.length === 1 ? "match" : "matches"}`
                    : "No matches yet"}
                </small>
              </div>
              {role.candidates.length ? role.candidates.map((candidate) => (
                <article key={candidate.recommendationId}>
                  <button
                    className="shortlist-person"
                    onClick={() => {
                      onProfile(candidate.userId);
                      onClose();
                    }}
                  >
                    <Avatar
                      person={{
                        name: candidate.name ?? "n2 member",
                        role: candidate.profession ?? "n2 member",
                        img: candidate.image,
                      }}
                      size="md"
                    />
                    <span>
                      <strong>{candidate.name ?? "n2 member"}</strong>
                      <small>
                        {candidate.profession ??
                          candidate.primarySkill ??
                          "Profile contribution"}
                      </small>
                    </span>
                  </button>
                  <div className="shortlist-score">
                    <strong>{candidate.score}%</strong>
                    <small>{candidate.reasons.join(" · ")}</small>
                  </div>
                  <button
                    className={
                      invited.includes(candidate.recommendationId)
                        ? "applied-button"
                        : "secondary-button"
                    }
                    disabled={invited.includes(candidate.recommendationId)}
                    onClick={() => invite(candidate)}
                  >
                    {invited.includes(candidate.recommendationId) ? (
                      <>
                        <Check size={13} /> Invited
                      </>
                    ) : (
                      "Invite"
                    )}
                  </button>
                </article>
              )) : (
                <div className="shortlist-role-empty">
                  <UsersRound size={17} />
                  <span>
                    <strong>No suitable active match yet</strong>
                    <small>
                      This position remains visible while n2 checks new and updated member profiles.
                    </small>
                  </span>
                </div>
              )}
            </section>
          ))
        ) : (
          <div className="shortlist-empty">
            <UsersRound size={20} />
            <strong>No suitable active members yet</strong>
            <p>
              Keep the role open. Remote fallback and new member profiles are
              checked during each recommendation batch.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}






function SettingsView({
  initialPanel = "root",
}: {
  initialPanel?: "root" | "profile";
}) {
  const [recommendations, setRecommendations] = useState(true);
  const [availability, setAvailability] = useState(true);
  const [panel, setPanel] = useState<
    "root" | "profile" | "notifications" | "calendar" | "networking" | "privacy" | "accessibility" | "security"
  >(initialPanel);
  const [saved, setSaved] = useState(false),
    [savedLocally, setSavedLocally] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ busy: false, error: "" });
  const [passwordStatus, setPasswordStatus] = useState({
    busy: false,
    error: "",
    success: false,
  });
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deleteWarningsAccepted, setDeleteWarningsAccepted] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState("");
  const [deactivateAccountOpen, setDeactivateAccountOpen] = useState(false);
  const [deactivateAccountError, setDeactivateAccountError] = useState("");
  const [leadershipElections, setLeadershipElections] = useState<LeadershipElectionView[]>([]);
  const [leadershipVoteStatus, setLeadershipVoteStatus] = useState("");
  const [profileUserId, setProfileUserId] = useState("");
  const [profileSafeguardsEnabled, setProfileSafeguardsEnabled] = useState(true);
  const [profile, setProfile] = useState({
    name: "",
    username: "",
    headline: "",
    profession: "",
    industry: "Technology, data & digital",
    bio: "",
    primarySkill: "",
    secondarySkill: "",
    tertiarySkill: "",
    interests: "",
    location: "",
    timezone:
      Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London",
    workMode: "remote",
    career: [] as Array<{
      title: string;
      company: string;
      location: string;
      startDate: string;
      endDate: string;
      current: boolean;
      description: string;
    }>,
    education: [] as Array<{
      institution: string;
      qualification: string;
      fieldOfStudy: string;
      startYear: string;
      endYear: string;
      description: string;
    }>,
  });
  const persistedProfileRef = useRef("");
  const [profileImage, setProfileImage] = useState(""),
    [coverImage, setCoverImage] = useState("");
  const [notifications, setNotifications] = useState({
    messages: true,
    projects: true,
    matches: true,
    meets: true,
    officialNotices: true,
    followedUpdates: true,
    digest: "weekly",
  });
  const [browserDelivery, setBrowserDelivery] = useState(() => ({
    ...getBrowserNotificationPreferences(),
    permission:
      typeof Notification === "undefined"
        ? ("unsupported" as const)
        : Notification.permission,
  }));
  const [browserNotificationStatus, setBrowserNotificationStatus] = useState("");
  const [calendarPrefs, setCalendarPrefs] = useState({
    defaultCalendar: "Google Calendar",
    autoLinks: true,
    showExternal: true,
  });
  const [privacy, setPrivacy] = useState({
    visibility: "Network only",
    searchable: true,
    showInterests: true,
    showLocation: false,
    showFollowers: true,
    showFollowing: true,
    muteFollowNotifications: false,
    messages: "Connections and project members",
  });
  const [networking, setNetworking] = useState({
    shareNetworkConnections: true,
    allowIntroductions: true,
    showNetworkKey: true,
  });
  const [hiddenNetworkMembers, setHiddenNetworkMembers] = useState<Array<{ id: string; name: string | null; image: string | null; profession: string | null }>>([]);
  const [accessibility, setAccessibility] = useState<AccessibilityPreferences>(
    DEFAULT_ACCESSIBILITY_PREFERENCES,
  );
  async function uploadProfileMedia(type: "avatar" | "banner", file?: File) {
    if (!file || !profileUserId) return;
    if (file.size > (type === "avatar" ? 650_000 : 1_100_000)) {
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const data = String(reader.result);
      const response = await fetch(`/api/profiles/${profileUserId}/media`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type, data }),
      });
      if (response.ok) {
        if (type === "avatar") {
          setProfileImage(data);
          window.dispatchEvent(new CustomEvent("n2:profile-photo-changed", { detail: data }));
        }
        else setCoverImage(data);
      }
    };
    reader.readAsDataURL(file);
  }
  async function removeProfileMedia(type: "avatar" | "banner") {
    if (!profileUserId) return;
    const response = await fetch(`/api/profiles/${profileUserId}/media`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type }),
    });
    if (!response.ok) return;
    if (type === "avatar") {
      setProfileImage("");
      window.dispatchEvent(new CustomEvent("n2:profile-photo-changed", { detail: null }));
    } else setCoverImage("");
  }
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const stored = localStorage.getItem("n2-settings");
      if (stored)
        try {
          const value = JSON.parse(stored);
          if (value.calendarPrefs) setCalendarPrefs(value.calendarPrefs);
          if (value.privacy) setPrivacy(value.privacy);
          if (value.networking) setNetworking((current) => ({ ...current, ...value.networking }));
          if (typeof value.recommendations === "boolean")
            setRecommendations(value.recommendations);
          if (typeof value.availability === "boolean")
            setAvailability(value.availability);
        } catch {
          /* Keep safe defaults when local settings are invalid. */
        }
      try {
        const storedAccessibility = JSON.parse(localStorage.getItem(ACCESSIBILITY_STORAGE_KEY) ?? "null");
        setAccessibility(normaliseAccessibilityPreferences(storedAccessibility));
      } catch {
        setAccessibility(DEFAULT_ACCESSIBILITY_PREFERENCES);
      }
      setBrowserDelivery({
        ...getBrowserNotificationPreferences(),
        permission:
          typeof Notification === "undefined"
            ? "unsupported"
            : Notification.permission,
      });
      fetch("/api/auth/session")
        .then((r) => r.json())
        .then(async (session) => {
          if (!session?.user?.id) return;
          setProfileUserId(session.user.id);
          const response = await fetch(`/api/profiles/${session.user.id}`);
          if (!response.ok) return;
          const { profile: record } = await response.json();
          if (typeof record.profileTaxonomySafeguardsEnabled === "boolean") setProfileSafeguardsEnabled(record.profileTaxonomySafeguardsEnabled);
          setProfileImage(record.image ?? "");
          setCoverImage(record.coverImage ?? "");
          const loadedProfile = {
            name: record.name ?? "",
            username: record.username ?? "",
            headline: record.headline ?? "",
            profession: record.profession ?? "",
            industry: record.industry ?? "Technology, data & digital",
            bio: record.bio ?? "",
            primarySkill: record.rankedSkills?.[0] ?? "",
            secondarySkill: record.rankedSkills?.[1] ?? "",
            tertiarySkill: record.rankedSkills?.[2] ?? "",
            interests: (record.interests ?? []).join(", "),
            location: record.location ?? [record.city, record.country].filter(Boolean).join(", "),
            timezone:
              record.timezone ??
              Intl.DateTimeFormat().resolvedOptions().timeZone ??
              "Europe/London",
            workMode: record.workMode ?? "remote",
            career: (record.career ?? []).map(
              (item: Record<string, unknown>) => ({
                title: String(item.title ?? ""),
                company: String(item.company ?? ""),
                location: String(item.location ?? ""),
                startDate: String(item.startDate ?? "").slice(0, 10),
                endDate: String(item.endDate ?? "").slice(0, 10),
                current: Boolean(item.current),
                description: String(item.description ?? ""),
              }),
            ),
            education: (record.education ?? []).map(
              (item: Record<string, unknown>) => ({
                institution: String(item.institution ?? ""),
                qualification: String(item.qualification ?? ""),
                fieldOfStudy: String(item.fieldOfStudy ?? ""),
                startYear: String(item.startYear ?? ""),
                endYear: String(item.endYear ?? ""),
                description: String(item.description ?? ""),
              }),
            ),
          };
          setProfile(loadedProfile);
          persistedProfileRef.current = JSON.stringify(loadedProfile);
        })
        .catch(() => undefined);
      fetch("/api/notifications")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.preferences)
            setNotifications({
              messages: data.preferences.messages,
              projects: data.preferences.projects,
              matches: data.preferences.matches,
              meets: data.preferences.meets,
              officialNotices: data.preferences.officialNotices,
              followedUpdates: data.preferences.followedUpdates ?? true,
              digest: data.preferences.emailDigest,
            });
        })
        .catch(() => undefined);
      fetch("/api/privacy")
        .then((r) => (r.ok ? r.json() : null))
        .then((settings) => {
          if (!settings) return;
          setPrivacy((current) => ({
            ...current,
            visibility:
              settings.profileVisibility === "public"
                ? "Public"
                : settings.profileVisibility === "connections"
                  ? "Connections only"
                  : settings.profileVisibility === "private"
                    ? "Private"
                    : "Network only",
            showLocation: settings.showLocation ?? current.showLocation,
            showFollowers: settings.showFollowers ?? current.showFollowers,
            showFollowing: settings.showFollowing ?? current.showFollowing,
            muteFollowNotifications: settings.muteFollowNotifications ?? current.muteFollowNotifications,
          }));
          setNetworking({
            shareNetworkConnections: settings.shareNetworkConnections ?? true,
            allowIntroductions: settings.allowIntroductions ?? true,
            showNetworkKey: settings.showNetworkKey ?? true,
          });
        })
        .catch(() => undefined);
      fetch("/api/network/hides", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((result) => setHiddenNetworkMembers(Array.isArray(result?.items) ? result.items : []))
        .catch(() => undefined);
      fetch("/api/accessibility")
        .then(async (response) => ({
          data: response.ok ? await response.json() : null,
          persistence: response.headers.get("x-n2-accessibility-persistence"),
        }))
        .then(({ data, persistence }) => {
          if (data && persistence !== "local") setAccessibility(normaliseAccessibilityPreferences(data));
        })
        .catch(() => undefined);
      fetch("/api/projects/leadership-elections", { cache: "no-store" })
        .then(response => response.ok ? response.json() : { items: [] })
        .then(result => setLeadershipElections(result.items ?? []))
        .catch(() => undefined);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    applyAccessibilityPreferences(accessibility);
    window.dispatchEvent(new CustomEvent(ACCESSIBILITY_EVENT, { detail: accessibility }));
  }, [accessibility]);
  async function saveSettings() {
    if (saveStatus.busy) return;
    setSaved(false);
    setSavedLocally(false);
    setSaveStatus({ busy: true, error: "" });
    if (panel === "profile" && !profileUserId) {
      setSaveStatus({
        busy: false,
        error: "Your profile is still loading. Please try again in a moment.",
      });
      return;
    }
    try {
      if (panel === "profile") {
        const previous = persistedProfileRef.current
          ? JSON.parse(persistedProfileRef.current) as Partial<typeof profile>
          : {};
        const updates: Record<string, unknown> = {};
        const scalarFields = ["name", "username", "headline", "profession", "industry", "bio", "location", "timezone", "workMode"] as const;
        for (const field of scalarFields) {
          if (profile[field] !== previous[field]) updates[field] = profile[field];
        }
        if (updates.name !== undefined && profile.name.trim().length < 2) {
          setSaveStatus({ busy: false, error: "Add at least two characters for your name before saving." });
          return;
        }
        if (updates.username !== undefined && !/^[a-z0-9][a-z0-9_-]{2,29}$/.test(profile.username)) {
          setSaveStatus({ busy: false, error: "Use 3–30 lowercase letters, numbers, underscores or hyphens for your username." });
          return;
        }
        if (profileSafeguardsEnabled && updates.profession !== undefined && !canonicalProfession(profile.profession)) {
          setSaveStatus({ busy: false, error: "Choose a profession from the list before saving." });
          return;
        }
        if (profileSafeguardsEnabled && updates.industry !== undefined && !canonicalIndustry(profile.industry)) {
          setSaveStatus({ busy: false, error: "Choose an industry from the list before saving." });
          return;
        }
        if (profileSafeguardsEnabled && updates.profession !== undefined && canonicalProfession(profile.profession) === OTHER_PROFESSION && !isMeaningfulOtherHeadline(profile.headline)) {
          setSaveStatus({ busy: false, error: "Describe your unlisted profession using at least two meaningful words." });
          return;
        }
        const skillsChanged = ["primarySkill", "secondarySkill", "tertiarySkill"].some(
          field => profile[field as "primarySkill" | "secondarySkill" | "tertiarySkill"] !== previous[field as "primarySkill" | "secondarySkill" | "tertiarySkill"],
        );
        if (skillsChanged) {
          if (![profile.primarySkill, profile.secondarySkill, profile.tertiarySkill].every(skill => skill.trim())) {
            setSaveStatus({ busy: false, error: "Add your primary, secondary and tertiary career skills before saving." });
            return;
          }
          updates.primarySkill = profile.primarySkill;
          updates.secondarySkill = profile.secondarySkill;
          updates.tertiarySkill = profile.tertiarySkill;
        }
        if (profile.interests !== previous.interests) {
          updates.interests = profile.interests.split(",").map(value => value.trim()).filter(Boolean);
        }
        let savedCareer = profile.career;
        if (JSON.stringify(profile.career) !== JSON.stringify(previous.career ?? [])) {
          savedCareer = profile.career.filter(item =>
            [item.title, item.company, item.location, item.startDate, item.endDate, item.description]
              .some(value => String(value ?? "").trim()) || item.current,
          );
          if (savedCareer.some(item => !item.title.trim() || !item.company.trim())) {
            setSaveStatus({ busy: false, error: "Add both a job title and company for each career entry, or remove the unfinished entry." });
            return;
          }
          updates.career = savedCareer.map(item => ({
            ...item,
            startDate: item.startDate || null,
            endDate: item.endDate || null,
          }));
        }
        let savedEducation = profile.education;
        if (JSON.stringify(profile.education) !== JSON.stringify(previous.education ?? [])) {
          savedEducation = profile.education.filter(item =>
            [item.institution, item.qualification, item.fieldOfStudy, item.startYear, item.endYear, item.description]
              .some(value => String(value ?? "").trim()),
          );
          if (savedEducation.some(item => !item.institution.trim() || !item.qualification.trim())) {
            setSaveStatus({ busy: false, error: "Add both an institution and qualification for each education entry, or remove the unfinished entry." });
            return;
          }
          updates.education = savedEducation.map(item => ({
            ...item,
            startYear: item.startYear ? Number(item.startYear) : null,
            endYear: item.endYear ? Number(item.endYear) : null,
          }));
        }
        if (Object.keys(updates).length) {
          const response = await fetch(`/api/profiles/${profileUserId}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(updates),
          });
          if (!response.ok) {
            const result = await response.json().catch(() => null);
            setSaveStatus({ busy: false, error: result?.error || "We couldn't save your changes. Please check the fields and try again." });
            return;
          }
        }
        const savedProfile = { ...profile, career: savedCareer, education: savedEducation };
        setProfile(savedProfile);
        persistedProfileRef.current = JSON.stringify(savedProfile);
      }
      if (panel === "privacy") {
        const response = await fetch("/api/privacy", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          profileVisibility:
            privacy.visibility === "Public"
              ? "public"
              : privacy.visibility === "Network only"
              ? "network"
              : privacy.visibility === "Connections only"
                ? "connections"
                : "private",
          showLocation: privacy.showLocation,
          showFollowers: privacy.showFollowers,
          showFollowing: privacy.showFollowing,
          muteFollowNotifications: privacy.muteFollowNotifications,
          messagePermission:
            privacy.messages === "No one" ? "nobody" : "connections",
        }),
        });
        if (!response.ok) throw new Error("We couldn't save your privacy settings.");
      }
      if (panel === "networking") {
        const response = await fetch("/api/privacy", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(networking),
        });
        if (!response.ok) throw new Error("We couldn't save your networking settings.");
        window.dispatchEvent(new Event("n2:network-changed"));
      }
      if (panel === "notifications") {
        const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "preferences",
          messages: notifications.messages,
          projects: notifications.projects,
          matches: notifications.matches,
          meets: notifications.meets,
          officialNotices: notifications.officialNotices,
          followedUpdates: notifications.followedUpdates,
          emailDigest: notifications.digest,
        }),
        });
        if (!response.ok) throw new Error("We couldn't save your notification settings.");
      }
      if (panel === "accessibility") {
        const response = await fetch("/api/accessibility", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(accessibility),
        });
        if (!response.ok) {
          const result = await response.json().catch(() => null);
          throw new Error(result?.error ?? "We couldn't save your accessibility settings.");
        }
        setSavedLocally(response.headers.get("x-n2-accessibility-persistence") === "local");
        storeAndApplyAccessibilityPreferences(accessibility);
      }
      localStorage.setItem(
        "n2-settings",
        JSON.stringify({ calendarPrefs, privacy, networking, recommendations, availability }),
      );
      setSaveStatus({ busy: false, error: "" });
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setSavedLocally(false);
      }, 3200);
    } catch (error) {
      setSaveStatus({
        busy: false,
        error:
          error instanceof Error
            ? error.message
            : "We couldn't save your changes. Please try again.",
      });
    }
  }
  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const newPassword = String(data.get("newPassword"));
    if (newPassword !== data.get("confirmPassword")) {
      setPasswordStatus({
        busy: false,
        error: "New passwords do not match.",
        success: false,
      });
      return;
    }
    setPasswordStatus({ busy: true, error: "", success: false });
    const response = await fetch("/api/auth/password/change", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        currentPassword: data.get("currentPassword"),
        newPassword,
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      setPasswordStatus({ busy: false, error: result.error, success: false });
      return;
    }
    form.reset();
    setPasswordStatus({ busy: false, error: "", success: true });
  }
  async function deactivateAccount(values: Record<string, string>) {
    setDeactivateAccountError("");
    try {
      const response = await fetch("/api/account/deactivate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: values.password || undefined }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setDeactivateAccountError(result?.error ?? "We couldn't deactivate your account. Please try again.");
        return false;
      }
      localStorage.removeItem("n2-settings");
      localStorage.removeItem(ACCESSIBILITY_STORAGE_KEY);
      await signOut({ redirectTo: "/signin?account=deactivated" });
    } catch {
      setDeactivateAccountError("We couldn't deactivate your account. Check your connection and try again.");
      return false;
    }
  }
  async function deleteAccount(values: Record<string, string>) {
    setDeleteAccountError("");
    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmation: values.confirmation, consequencesAccepted: true, password: values.password || undefined }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setDeleteAccountError(result?.error ?? "We couldn't delete your account. Please try again.");
        return false;
      }
      localStorage.removeItem("n2-settings");
      localStorage.removeItem(ACCESSIBILITY_STORAGE_KEY);
      await signOut({ redirectTo: "/signin?account=deletion-scheduled" });
    } catch {
      setDeleteAccountError("We couldn't delete your account. Check your connection and try again.");
      return false;
    }
  }
  async function castLeadershipVote(electionId: string, candidateId: string) {
    setLeadershipVoteStatus("");
    const response = await fetch("/api/projects/leadership-elections", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ electionId, candidateId }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setLeadershipVoteStatus(result.error ?? "Your vote could not be saved.");
      return;
    }
    setLeadershipElections(items => items.map(item => item.id === electionId ? { ...item, selectedCandidateId: candidateId } : item));
    setLeadershipVoteStatus("Your leadership vote is saved. You can change it until the deadline.");
  }
  async function toggleBrowserPopups() {
    setBrowserNotificationStatus("");
    if (browserDelivery.popups) {
      setBrowserNotificationPreference("popups", false);
      setBrowserDelivery((current) => ({ ...current, popups: false }));
      return;
    }
    if (typeof Notification === "undefined") {
      setBrowserNotificationStatus("This browser does not support web notifications.");
      return;
    }
    let permission = Notification.permission;
    try {
      if (permission === "default") permission = await Notification.requestPermission();
    } catch {
      setBrowserNotificationStatus("This browser could not open its notification permission prompt.");
      return;
    }
    if (permission !== "granted") {
      setBrowserNotificationPreference("popups", false);
      setBrowserDelivery((current) => ({ ...current, popups: false, permission }));
      setBrowserNotificationStatus(
        "Browser popups are blocked. Allow notifications for n2 in your browser's site settings, then try again.",
      );
      return;
    }
    setBrowserNotificationPreference("popups", true);
    setBrowserDelivery((current) => ({ ...current, popups: true, permission }));
    setBrowserNotificationStatus("Browser popups are on for this browser.");
  }
  async function toggleBrowserSound() {
    setBrowserNotificationStatus("");
    const enabled = !browserDelivery.sound;
    if (enabled && !(await playBrowserNotificationSound())) {
      setBrowserNotificationStatus("Notification audio is unavailable in this browser.");
      return;
    }
    setBrowserNotificationPreference("sound", enabled);
    setBrowserDelivery((current) => ({ ...current, sound: enabled }));
    if (enabled) setBrowserNotificationStatus("Notification sound is on. That tone was a preview.");
  }
  const toggle = (on: boolean, action: () => void, label: string) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={on}
      className={`toggle ${on ? "on" : ""}`}
      onClick={action}
    >
      <i />
    </button>
  );
  if (panel !== "root") {
    const titles = {
      profile: [
        "Profile and expertise",
        "Share what you care about and how you would like to take part.",
      ],
      notifications: [
        "Messages and notifications",
        "Choose what deserves your attention.",
      ],
      calendar: [
        "Calendar connections",
        "Bring Google, Outlook, Meet and Teams together.",
      ],
      networking: [
        "Networking",
        "Choose how connections are discovered and explained.",
      ],
      privacy: [
        "Privacy and visibility",
        "Decide who can find, contact and understand you.",
      ],
      accessibility: [
        "Accessibility",
        "Adjust the platform to make it comfortable and clear for you.",
      ],
      security: [
        "Security and password",
        "Keep your account secure and your access private.",
      ],
    } as const;
    return (
      <div className="subpage settings-page settings-detail">
        <div className="detail-head">
          <button
            className="icon-button border"
            onClick={() => setPanel("root")}
            aria-label="Back to settings"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <span className="eyebrow">SETTINGS</span>
            <h1>{titles[panel][0]}</h1>
            <p>{titles[panel][1]}</p>
          </div>
          {panel !== "security" && (
            <button
              className={`save-button ${saved ? "saved" : ""}`}
              onClick={saveSettings}
              disabled={saveStatus.busy}
            >
              {saved ? (
                <>
                  <Check size={15} /> {savedLocally ? "Saved on this device" : "Saved"}
                </>
              ) : (
                saveStatus.busy ? "Saving…" : "Save changes"
              )}
            </button>
          )}
        </div>
        {saveStatus.error && (
          <p className="settings-save-error" role="alert">
            <CircleAlert size={15} /> {saveStatus.error}
          </p>
        )}
        {panel === "profile" && (
          <div className="settings-form">
            <div className="profile-media-editor">
              <label
                className="banner-upload"
                style={
                  coverImage
                    ? { backgroundImage: `url(${coverImage})` }
                    : undefined
                }
              >
                <span>
                  <ImageIcon size={16} /> Change banner
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) =>
                    uploadProfileMedia("banner", e.target.files?.[0])
                  }
                />
              </label>
              {coverImage && (
                <button type="button" className="remove-banner-button" onClick={() => removeProfileMedia("banner")}>
                  <Trash2 size={13} /> Remove banner
                </button>
              )}
              <div className="profile-settings-lead">
                <Avatar
                  person={{
                    name: profile.name || "n2 member",
                    role: profile.headline,
                    img: profileImage || undefined,
                  }}
                  size="lg"
                />
                <div>
                  <strong>Profile picture</strong>
                  <small>
                    Your n2 avatar is used until you upload a photo.
                  </small>
                </div>
                <div className="profile-media-actions">
                  {profileImage && (
                    <button type="button" className="media-remove" onClick={() => removeProfileMedia("avatar")}>
                      <Trash2 size={13} /> Remove photo
                    </button>
                  )}
                  <label className="media-change">
                    Change
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) =>
                        uploadProfileMedia("avatar", e.target.files?.[0])
                      }
                    />
                  </label>
                </div>
              </div>
            </div>
            <div className="form-grid">
              <label>
                Full name
                <input
                  value={profile.name}
                  onChange={(e) =>
                    setProfile({ ...profile, name: e.target.value })
                  }
                />
              </label>
              <label>
                Username
                <div className="username-field">
                  <span aria-hidden="true">@</span>
                  <input
                    value={profile.username}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    minLength={3}
                    maxLength={30}
                    aria-describedby="profile-username-help"
                    onChange={(e) => setProfile({ ...profile, username: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") })}
                  />
                </div>
                <small id="profile-username-help" className="username-help">
                  {profile.username ? <>Public address: <a href={`/${profile.username}`} target="_blank" rel="noreferrer">/{profile.username}</a>{privacy.visibility !== "Public" && " · Set profile visibility to Public before sharing."}</> : "Choose the address for your public profile."}
                </small>
              </label>
              <label htmlFor="profile-profession">
                Profession
                {profileSafeguardsEnabled ? <CareerIndustryInput
                  id="profile-profession"
                  mode="profession"
                  strict
                  value={profile.profession}
                  onChange={(profession) => setProfile({ ...profile, profession })}
                  placeholder="Search professions"
                /> : <input
                  id="profile-profession"
                  value={profile.profession}
                  onChange={(e) => setProfile({ ...profile, profession: e.target.value })}
                />}
                {profileSafeguardsEnabled && <small>Use your genuine profession so discovery and recommendations stay useful.</small>}
              </label>
              <label className="full">
                Professional headline
                <input
                  value={profile.headline}
                  onChange={(e) =>
                    setProfile({ ...profile, headline: e.target.value })
                  }
                />
                {profileSafeguardsEnabled && profile.profession === OTHER_PROFESSION && <small>Required for “Other”. Use at least two words to describe your professional role.</small>}
              </label>
              <label htmlFor="profile-industry">
                Industry
                <CareerIndustryInput
                  id="profile-industry"
                  value={profile.industry}
                  onChange={(industry) => setProfile({ ...profile, industry })}
                  placeholder="Type an industry or career"
                  strict={profileSafeguardsEnabled}
                />
              </label>
              <label>
                Location
                <input
                  value={profile.location}
                  placeholder="e.g. London, United Kingdom"
                  onChange={(e) =>
                    setProfile({ ...profile, location: e.target.value })
                  }
                />
              </label>
              <label className="full">
                Bio
                <textarea
                  value={profile.bio}
                  onChange={(e) =>
                    setProfile({ ...profile, bio: e.target.value })
                  }
                />
                <small>
                  Share the problems you enjoy solving and the contribution you
                  make.
                </small>
              </label>
              <div className="full ranked-skill-form">
                <div>
                  <span className="eyebrow">THREE CAREER SKILLS</span>
                  <small>
                    Rank the contribution you make best. These power profile
                    search and project matching.
                  </small>
                </div>
                {[
                  ["Primary", profile.primarySkill, "primarySkill"],
                  ["Secondary", profile.secondarySkill, "secondarySkill"],
                  ["Tertiary", profile.tertiarySkill, "tertiarySkill"],
                ].map(([label, value, key], index) => (
                  <label key={key}>
                    <b>{index + 1}</b>
                    <span>
                      {label} skill
                      <input
                        value={value}
                        onChange={(e) =>
                          setProfile({ ...profile, [key]: e.target.value })
                        }
                      />
                    </span>
                  </label>
                ))}
              </div>
              <label className="full">
                Interests
                <input
                  value={profile.interests}
                  onChange={(e) =>
                    setProfile({ ...profile, interests: e.target.value })
                  }
                />
                <small>Separate interests with commas.</small>
              </label>
            </div>
            <section className="history-editor">
              <header>
                <div>
                  <span className="eyebrow">CAREER HISTORY</span>
                  <p>Add roles in reverse chronological order.</p>
                </div>
                <button
                  onClick={() =>
                    setProfile({
                      ...profile,
                      career: [
                        ...profile.career,
                        {
                          title: "",
                          company: "",
                          location: "",
                          startDate: "",
                          endDate: "",
                          current: false,
                          description: "",
                        },
                      ],
                    })
                  }
                >
                  <Plus size={14} /> Add role
                </button>
              </header>
              {profile.career.map((item, index) => (
                <article key={index}>
                  <button
                    className="history-remove"
                    aria-label="Remove role"
                    onClick={() =>
                      setProfile({
                        ...profile,
                        career: profile.career.filter((_, i) => i !== index),
                      })
                    }
                  >
                    <X size={14} />
                  </button>
                  <div className="form-grid">
                    <label>
                      Job title
                      <input
                        value={item.title}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            career: profile.career.map((row, i) =>
                              i === index
                                ? { ...row, title: e.target.value }
                                : row,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      Company
                      <input
                        value={item.company}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            career: profile.career.map((row, i) =>
                              i === index
                                ? { ...row, company: e.target.value }
                                : row,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      Start date
                      <input
                        type="date"
                        value={item.startDate}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            career: profile.career.map((row, i) =>
                              i === index
                                ? { ...row, startDate: e.target.value }
                                : row,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      End date
                      <input
                        type="date"
                        disabled={item.current}
                        value={item.endDate}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            career: profile.career.map((row, i) =>
                              i === index
                                ? { ...row, endDate: e.target.value }
                                : row,
                            ),
                          })
                        }
                      />
                    </label>
                    <label className="full" htmlFor={`career-description-${index}`}>
                      Role description
                      <RichTextEditor
                        id={`career-description-${index}`}
                        value={item.description}
                        onChange={(description) =>
                          setProfile({
                            ...profile,
                            career: profile.career.map((row, i) =>
                              i === index
                                ? { ...row, description }
                                : row,
                            ),
                          })
                        }
                      />
                    </label>
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={item.current}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            career: profile.career.map((row, i) =>
                              i === index
                                ? { ...row, current: e.target.checked }
                                : row,
                            ),
                          })
                        }
                      />{" "}
                      I currently work here
                    </label>
                  </div>
                </article>
              ))}
            </section>
            <section className="history-editor">
              <header>
                <div>
                  <span className="eyebrow">EDUCATION</span>
                  <p>Add qualifications and professional education.</p>
                </div>
                <button
                  onClick={() =>
                    setProfile({
                      ...profile,
                      education: [
                        ...profile.education,
                        {
                          institution: "",
                          qualification: "",
                          fieldOfStudy: "",
                          startYear: "",
                          endYear: "",
                          description: "",
                        },
                      ],
                    })
                  }
                >
                  <Plus size={14} /> Add education
                </button>
              </header>
              {profile.education.map((item, index) => (
                <article key={index}>
                  <button
                    className="history-remove"
                    aria-label="Remove education"
                    onClick={() =>
                      setProfile({
                        ...profile,
                        education: profile.education.filter(
                          (_, i) => i !== index,
                        ),
                      })
                    }
                  >
                    <X size={14} />
                  </button>
                  <div className="form-grid">
                    <label>
                      Institution
                      <input
                        value={item.institution}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            education: profile.education.map((row, i) =>
                              i === index
                                ? { ...row, institution: e.target.value }
                                : row,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      Qualification
                      <input
                        value={item.qualification}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            education: profile.education.map((row, i) =>
                              i === index
                                ? { ...row, qualification: e.target.value }
                                : row,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      Field of study
                      <input
                        value={item.fieldOfStudy}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            education: profile.education.map((row, i) =>
                              i === index
                                ? { ...row, fieldOfStudy: e.target.value }
                                : row,
                            ),
                          })
                        }
                      />
                    </label>
                    <label className="full">
                      Education notes
                      <textarea
                        value={item.description}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            education: profile.education.map((row, i) =>
                              i === index
                                ? { ...row, description: e.target.value }
                                : row,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      Years
                      <input
                        value={`${item.startYear}${item.endYear ? ` – ${item.endYear}` : ""}`}
                        placeholder="2014 – 2017"
                        onChange={(e) => {
                          const [startYear = "", endYear = ""] =
                            e.target.value.split(/\s*[–-]\s*/);
                          setProfile({
                            ...profile,
                            education: profile.education.map((row, i) =>
                              i === index
                                ? { ...row, startYear, endYear }
                                : row,
                            ),
                          });
                        }}
                      />
                    </label>
                  </div>
                </article>
              ))}
            </section>
          </div>
        )}
        {panel === "notifications" && (
          <div className="settings-form">
            <div className="settings-section-title">
              <strong>Browser delivery</strong>
              <small>Control popups and audio on this browser.</small>
            </div>
            <div className="preference-row">
              <span>
                <strong>Browser notifications</strong>
                <small>
                  {browserDelivery.permission === "denied"
                    ? "Blocked in this browser's site settings."
                    : browserDelivery.permission === "unsupported"
                      ? "Web notifications are unavailable in this browser."
                      : "Show desktop popups while n2 is open, including in a background tab."}
                </small>
              </span>
              {toggle(
                browserDelivery.popups,
                () => void toggleBrowserPopups(),
                "Toggle browser notifications",
              )}
            </div>
            <div className="preference-row">
              <span>
                <strong>Notification sound</strong>
                <small>Play a short tone when a new browser notification arrives.</small>
              </span>
              {toggle(
                browserDelivery.sound,
                () => void toggleBrowserSound(),
                "Toggle notification sound",
              )}
            </div>
            {browserNotificationStatus && (
              <p className="browser-notification-status" role="status" aria-live="polite">
                {browserNotificationStatus}
              </p>
            )}
            <div className="settings-section-title">
              <strong>Direct activity</strong>
              <small>Immediate updates for things involving you.</small>
            </div>
            {[
              [
                "New messages",
                "When someone starts or replies to a conversation",
                "messages",
              ],
              [
                "Project activity",
                "Applications, invitations, views and role changes",
                "projects",
              ],
              [
                "Recommended matches",
                "People and project suggestions based on your interests",
                "matches",
              ],
              [
                "Meet reminders",
                "A reminder before an upcoming room or event",
                "meets",
              ],
              [
                "Official n2 notices",
                "Important product and community announcements",
                "officialNotices",
              ],
              [
                "Updates from people you follow",
                "New posts and public project updates from followed members",
                "followedUpdates",
              ],
            ].map(([title, copy, key]) => (
              <div className="preference-row" key={key}>
                <span>
                  <strong>{title}</strong>
                  <small>{copy}</small>
                </span>
                {toggle(
                  notifications[key as keyof typeof notifications] === true,
                  () =>
                    setNotifications({
                      ...notifications,
                      [key]: !notifications[key as keyof typeof notifications],
                    }),
                  `Toggle ${title}`,
                )}
              </div>
            ))}
            <label className="select-setting">
              <span>
                <strong>Email digest</strong>
                <small>A calm summary of network activity.</small>
              </span>
              <N2Select ariaLabel="Email digest frequency" value={notifications.digest} onValueChange={(digest) => setNotifications({ ...notifications, digest })} options={[{value:"daily",label:"Daily"},{value:"weekly",label:"Weekly"},{value:"never",label:"Never"}]}/>
            </label>
          </div>
        )}
        {panel === "calendar" && (
          <div className="settings-form">
            <div className="connection-setting">
              <span className="calendar-brand google">G</span>
              <span>
                <strong>Google Calendar & Meet</strong>
                <small>Not connected</small>
              </span>
              {/* OAuth must use a document navigation so the provider redirect is not handled as an RSC response. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/api/integrations/google/connect">Connect</a>
            </div>
            <div className="connection-setting">
              <span className="calendar-brand microsoft">M</span>
              <span>
                <strong>Microsoft Outlook & Teams</strong>
                <small>Not connected</small>
              </span>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/api/integrations/microsoft/connect">Connect</a>
            </div>
            <label className="select-setting spaced">
              <span>
                <strong>Default calendar</strong>
                <small>New n2 meets will be added here.</small>
              </span>
              <N2Select ariaLabel="Default calendar" value={calendarPrefs.defaultCalendar} onValueChange={(defaultCalendar) => setCalendarPrefs({ ...calendarPrefs, defaultCalendar })} options={["Google Calendar","Microsoft Outlook","Ask each time"].map(value=>({value,label:value}))}/>
            </label>
            <div className="preference-row">
              <span>
                <strong>Add video links automatically</strong>
                <small>Use Meet or Teams based on the selected calendar.</small>
              </span>
              {toggle(
                calendarPrefs.autoLinks,
                () =>
                  setCalendarPrefs({
                    ...calendarPrefs,
                    autoLinks: !calendarPrefs.autoLinks,
                  }),
                "Toggle automatic video links",
              )}
            </div>
            <div className="preference-row">
              <span>
                <strong>Show external events in Meet</strong>
                <small>
                  Display busy time without exposing private event details.
                </small>
              </span>
              {toggle(
                calendarPrefs.showExternal,
                () =>
                  setCalendarPrefs({
                    ...calendarPrefs,
                    showExternal: !calendarPrefs.showExternal,
                  }),
                "Toggle external events",
              )}
            </div>
          </div>
        )}
        {panel === "privacy" && (
          <div className="settings-form">
            <label className="select-setting">
              <span>
                <strong>Profile visibility</strong>
                <small>Who can open your complete member profile.</small>
              </span>
              <N2Select ariaLabel="Profile visibility" value={privacy.visibility} onValueChange={(visibility) => setPrivacy({ ...privacy, visibility })} options={["Public","Network only","Connections only","Private"].map(value=>({value,label:value}))}/>
            </label>
            {[
              [
                "Appear in search",
                "Let members find you by name, skill and industry",
                "searchable",
              ],
              [
                "Show interests",
                "Use interests to discover people and ideas you share",
                "showInterests",
              ],
              [
                "Show approximate location",
                "Share your city, never your precise location",
                "showLocation",
              ],
            ].map(([title, copy, key]) => (
              <div className="preference-row" key={key}>
                <span>
                  <strong>{title}</strong>
                  <small>{copy}</small>
                </span>
                {toggle(
                  privacy[key as keyof typeof privacy] === true,
                  () =>
                    setPrivacy({
                      ...privacy,
                      [key]: !privacy[key as keyof typeof privacy],
                    }),
                  `Toggle ${title}`,
                )}
              </div>
            ))}
            <label className="select-setting">
              <span>
                <strong>Who can message you</strong>
                <small>Project owners can always contact applicants.</small>
              </span>
              <N2Select ariaLabel="Message permissions" value={privacy.messages} onValueChange={(messages) => setPrivacy({ ...privacy, messages })} options={["Connections and project members","Connections only","No one"].map(value=>({value,label:value}))}/>
            </label>
            <div className="safety-panel">
              <ShieldCheck size={18} />
              <span>
                <strong>Safety controls</strong>
                <small>
                  Review blocked people or report behaviour to the moderation
                  team.
                </small>
              </span>
              <button>Manage</button>
            </div>
          </div>
        )}
        {panel === "networking" && (
          <div className="settings-form">
            <div className="settings-section-title">
              <strong>Network map</strong>
              <small>Control connection discovery and the map display.</small>
            </div>
            <div className="preference-row">
              <span>
                <strong>Share connections with people who follow me</strong>
                <small>
                  Let followers reveal the members you follow and who follows you,
                  when those members also permit it.
                </small>
              </span>
              {toggle(
                networking.shareNetworkConnections,
                () =>
                  setNetworking({
                    ...networking,
                    shareNetworkConnections: !networking.shareNetworkConnections,
                  }),
                "Toggle sharing connections with followers",
              )}
            </div>
            <div className="preference-row">
              <span>
                <strong>Show the network key</strong>
                <small>
                  Display profession colours and connection line meanings on the map.
                </small>
              </span>
              {toggle(
                networking.showNetworkKey,
                () =>
                  setNetworking({
                    ...networking,
                    showNetworkKey: !networking.showNetworkKey,
                  }),
                "Toggle the network key",
              )}
            </div>
            <div className="preference-row">
              <span>
                <strong>Allow warm introduction requests</strong>
                <small>
                  Let eligible connections ask you to introduce them to someone in your visible network. You always choose whether to accept.
                </small>
              </span>
              {toggle(
                networking.allowIntroductions,
                () => setNetworking({ ...networking, allowIntroductions: !networking.allowIntroductions }),
                "Toggle warm introduction requests",
              )}
            </div>
            <div className="settings-section-title network-hidden-title">
              <strong>Hidden map members</strong>
              <small>Hidden people remain followed and can still appear elsewhere on n2.</small>
            </div>
            {hiddenNetworkMembers.length ? hiddenNetworkMembers.map((member) => (
              <div className="connection-setting" key={member.id}>
                <Avatar person={{ name: member.name ?? "n2 member", role: member.profession ?? "Member", img: member.image }} size="sm" />
                <span><strong>{member.name ?? "n2 member"}</strong><small>{member.profession ?? "Member"}</small></span>
                <button type="button" onClick={async () => {
                  const response = await fetch(`/api/network/hides?targetId=${encodeURIComponent(member.id)}`, { method: "DELETE" });
                  if (response.ok) {
                    setHiddenNetworkMembers((current) => current.filter((item) => item.id !== member.id));
                    window.dispatchEvent(new Event("n2:network-changed"));
                  }
                }}>Show again</button>
              </div>
            )) : <div className="preference-row"><span><strong>No hidden members</strong><small>People you hide from the map will be listed here.</small></span></div>}
          </div>
        )}
        {panel === "accessibility" && (
          <div className="settings-form accessibility-settings">
            <div className="settings-section-title">
              <strong>Vision and reading</strong>
              <small>Make text, colour and controls easier to see and read.</small>
            </div>
            <label className="select-setting">
              <span>
                <strong>Colour theme</strong>
                <small>Follow your device, or keep the platform light or dark.</small>
              </span>
              <N2Select ariaLabel="Colour theme" value={accessibility.colourTheme} onValueChange={(colourTheme) => setAccessibility({ ...accessibility, colourTheme: colourTheme as AccessibilityPreferences["colourTheme"] })} options={[{value:"system",label:"Use device setting"},{value:"light",label:"Light"},{value:"dark",label:"Dark"}]}/>
            </label>
            <label className="select-setting">
              <span>
                <strong>Text size</strong>
                <small>Increase interface text without relying on browser zoom.</small>
              </span>
              <N2Select ariaLabel="Text size" value={accessibility.textSize} onValueChange={(textSize) => setAccessibility({ ...accessibility, textSize: textSize as AccessibilityPreferences["textSize"] })} options={[{value:"default",label:"Default (100%)"},{value:"large",label:"Large (112%)"},{value:"extra-large",label:"Extra large (125%)"}]}/>
            </label>
            <label className="select-setting">
              <span>
                <strong>Contrast</strong>
                <small>Strengthen text, borders and interactive controls.</small>
              </span>
              <N2Select ariaLabel="Contrast" value={accessibility.contrast} onValueChange={(contrast) => setAccessibility({ ...accessibility, contrast: contrast as AccessibilityPreferences["contrast"] })} options={[{value:"standard",label:"Standard"},{value:"high",label:"High contrast"}]}/>
            </label>
            {[
              ["Readable font", "Use a simple, widely spaced font for longer reading.", "readableFont"],
              ["Underline links", "Show links with an underline instead of colour alone.", "underlineLinks"],
            ].map(([title, copy, key]) => (
              <div className="preference-row" key={key}>
                <span><strong>{title}</strong><small>{copy}</small></span>
                {toggle(accessibility[key as keyof AccessibilityPreferences] === true, () => setAccessibility({ ...accessibility, [key]: !accessibility[key as keyof AccessibilityPreferences] }), `Toggle ${title}`)}
              </div>
            ))}

            <div className="settings-section-title accessibility-section-break">
              <strong>Movement and interaction</strong>
              <small>Reduce distraction and make keyboard or pointer use clearer.</small>
            </div>
            <label className="select-setting">
              <span>
                <strong>Animation and motion</strong>
                <small>Reduced motion removes transitions, pulses and smooth scrolling.</small>
              </span>
              <N2Select ariaLabel="Animation and motion" value={accessibility.motion} onValueChange={(motion) => setAccessibility({ ...accessibility, motion: motion as AccessibilityPreferences["motion"] })} options={[{value:"system",label:"Use device setting"},{value:"reduced",label:"Reduce motion"}]}/>
            </label>
            {[
              ["Enhanced keyboard focus", "Add a strong outline to the control you are using.", "enhancedFocus"],
              ["Large pointer", "Use a larger pointer on supported desktop browsers.", "largePointer"],
            ].map(([title, copy, key]) => (
              <div className="preference-row" key={key}>
                <span><strong>{title}</strong><small>{copy}</small></span>
                {toggle(accessibility[key as keyof AccessibilityPreferences] === true, () => setAccessibility({ ...accessibility, [key]: !accessibility[key as keyof AccessibilityPreferences] }), `Toggle ${title}`)}
              </div>
            ))}

            <div className="settings-section-title accessibility-section-break">
              <strong>Audio and video</strong>
              <small>Control how media behaves across posts and meetings.</small>
            </div>
            {[
              ["Prefer captions", "Show captions by default whenever a video provides them.", "captions"],
              ["Prevent media autoplay", "Require a deliberate action before audio or video starts.", "preventAutoplay"],
            ].map(([title, copy, key]) => (
              <div className="preference-row" key={key}>
                <span><strong>{title}</strong><small>{copy}</small></span>
                {toggle(accessibility[key as keyof AccessibilityPreferences] === true, () => setAccessibility({ ...accessibility, [key]: !accessibility[key as keyof AccessibilityPreferences] }), `Toggle ${title}`)}
              </div>
            ))}
            <div className="accessibility-note" role="note">
              <Accessibility size={18}/>
              <span><strong>Assistive technology is always supported</strong><small>Semantic labels, keyboard navigation and screen-reader announcements stay enabled regardless of these choices.</small></span>
            </div>
            <button className="accessibility-reset" onClick={() => setAccessibility(DEFAULT_ACCESSIBILITY_PREFERENCES)}>Reset to recommended defaults</button>
          </div>
        )}
        {panel === "security" && (
          <div className="settings-form password-settings">
            <div className="settings-section-title">
              <strong>Change password</strong>
              <small>
                Use at least 10 characters and avoid a password you use
                elsewhere.
              </small>
            </div>
            <form onSubmit={changePassword}>
              <label>
                Current password
                <input
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </label>
              <label>
                New password
                <input
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={10}
                  required
                />
              </label>
              <label>
                Confirm new password
                <input
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={10}
                  required
                />
              </label>
              {passwordStatus.error && (
                <p className="form-error">{passwordStatus.error}</p>
              )}
              {passwordStatus.success && (
                <p className="form-success">
                  <Check size={14} /> Password changed successfully.
                </p>
              )}
              <button className="primary-button" disabled={passwordStatus.busy}>
                {passwordStatus.busy ? "Updating…" : "Change password"}
              </button>
            </form>
            <div className="security-note">
              <ShieldCheck size={17} />
              <span>
                <strong>Forgot your current password?</strong>
                <small>
                  Sign out and use the password-reset link on the sign-in page.
                </small>
              </span>
            </div>
            <div className="account-danger-zone">
              <span>
                <strong>Deactivate account</strong>
                <small>Take a break for up to three months. Your projects stay in place, future meets you host are cancelled, and signing in again will prompt you to reactivate.</small>
              </span>
              <button type="button" className="secondary-button" onClick={() => { setDeactivateAccountError(""); setDeactivateAccountOpen(true); }}>
                <UserX size={15} /> Deactivate account
              </button>
            </div>
            <div className="account-danger-zone delete-account-zone">
              <span>
                <strong>Delete account</strong>
                <small>This closes your account immediately, starts a 30-day deletion window, and begins any required project leadership handovers.</small>
              </span>
              <button type="button" className="secondary-button danger" onClick={() => { setDeleteAccountError(""); setDeleteWarningsAccepted(false); setDeleteAccountOpen(true); }}>
                <Trash2 size={15} /> Delete account
              </button>
            </div>
          </div>
        )}
        {deactivateAccountOpen && (
          <ActionDialog
            eyebrow="DEACTIVATE ACCOUNT"
            title="Take a break from n2?"
            description="Your account, profile and shared content will be labelled as deactivated. Your projects remain in place, but future meets you host are cancelled. Sign in within three months and confirm reactivation to return. After three months, the 30-day deletion process begins automatically."
            confirmLabel="Deactivate my account"
            cancelLabel="Keep my account"
            error={deactivateAccountError}
            fields={[{ name: "password", label: "Current password (if you use one)", kind: "input", inputType: "password", autoComplete: "current-password", trim: false, maxLength: 128 }]}
            onClose={() => { setDeactivateAccountOpen(false); setDeactivateAccountError(""); }}
            onConfirm={deactivateAccount}
          />
        )}
        {deleteAccountOpen && !deleteWarningsAccepted && (
          <ActionDialog
            eyebrow="BEFORE YOU DELETE"
            title="Review what happens next"
            description="Your account closes immediately. A sole co-owner takes ownership at once; otherwise eligible co-owners or members have 24 hours to vote before n2 selects the strongest project match. Future meets you host are cancelled and attendees are notified. Your posts, messages and profile are labelled as deactivated during the 30-day deletion window. Signing in during that window lets you cancel deletion, but completed transfers and cancelled meets are not automatically reversed."
            confirmLabel="I understand, continue"
            cancelLabel="Keep my account"
            danger
            onClose={() => { setDeleteAccountOpen(false); setDeleteWarningsAccepted(false); setDeleteAccountError(""); }}
            onConfirm={() => { setDeleteWarningsAccepted(true); return false; }}
          />
        )}
        {deleteAccountOpen && deleteWarningsAccepted && (
          <ActionDialog
            eyebrow="DELETE ACCOUNT"
            title="Schedule permanent deletion?"
            description="This is the final confirmation. Type DELETE below. Your permanent deletion is scheduled for 30 days from now."
            confirmLabel="Delete my account"
            cancelLabel="Keep my account"
            danger
            error={deleteAccountError}
            fields={[
              { name: "confirmation", label: "Type DELETE", kind: "input", required: true, placeholder: "DELETE", maxLength: 6 },
              { name: "password", label: "Current password (if you use one)", kind: "input", inputType: "password", autoComplete: "current-password", trim: false, maxLength: 128 },
            ]}
            onClose={() => { setDeleteAccountOpen(false); setDeleteWarningsAccepted(false); setDeleteAccountError(""); }}
            onConfirm={deleteAccount}
          />
        )}
      </div>
    );
  }
  return (
    <div className="subpage settings-page">
      <div className="subpage-head compact">
        <div>
          <span className="eyebrow">YOUR SPACE</span>
          <h1>Settings</h1>
          <p>Control how the network works for you.</p>
        </div>
      </div>
      {leadershipElections.length > 0 && <div className="settings-group">
          <div className="settings-label">PROJECT LEADERSHIP</div>
          {leadershipElections.map(election => <div className="leadership-election" key={election.id}>
            <div><strong>Choose the next lead for {election.projectTitle}</strong><small>{election.electorate === "co_owners" ? "Co-owners" : "Project members"} can vote until {new Date(election.deadline).toLocaleString()}. If there is no clear winner, n2 will select the strongest project match.</small></div>
            <div className="leadership-candidates">
              {election.candidates.map(candidate => <button type="button" className={election.selectedCandidateId === candidate.id ? "selected" : ""} key={candidate.id} onClick={() => castLeadershipVote(election.id, candidate.id)}>
                <Avatar person={{ name: candidate.name ?? "n2 member", role: candidate.profession ?? candidate.membershipRole, img: candidate.image }} size="sm" expandable={false}/>
                <span><strong>{candidate.name ?? "n2 member"}</strong><small>{candidate.profession ?? candidate.membershipRole.replaceAll("_", " ")}</small></span>
                {election.selectedCandidateId === candidate.id && <Check size={15}/>}
              </button>)}
            </div>
          </div>)}
          {leadershipVoteStatus && <p className="settings-inline-status" role="status">{leadershipVoteStatus}</p>}
      </div>}
      <div className="settings-group">
        <div className="settings-label">MATCHING</div>
        <div className="settings-row">
          <span>
            <i>
              <N2Mark />
            </i>
            <span>
              <strong>Smart project recommendations</strong>
              <small>
                Use skills, interests and activity to discover projects you may enjoy.
              </small>
            </span>
          </span>
          {toggle(
            recommendations,
            () => setRecommendations(!recommendations),
            "Toggle smart recommendations",
          )}
        </div>
        <div className="settings-row">
          <span>
            <i>
              <UserPlus size={14} />
            </i>
            <span>
              <strong>Show that I’m available</strong>
              <small>
                Let project owners know you’re open to invitations to get involved.
              </small>
            </span>
          </span>
          {toggle(
            availability,
            () => setAvailability(!availability),
            "Toggle availability",
          )}
        </div>
      </div>
      <div className="settings-group">
        <div className="settings-label">ACCOUNT & CONNECTIONS</div>
        {[
          ["profile", "Profile and expertise"],
          ["notifications", "Messages and notifications"],
          ["calendar", "Calendar connections"],
          ["networking", "Networking"],
          ["privacy", "Privacy and visibility"],
          ["accessibility", "Accessibility"],
          ["security", "Security and password"],
        ].map(([id, label], i) => (
          <button key={id} onClick={() => setPanel(id as typeof panel)}>
            <span>
              <i>{i + 1}</i>
              <strong>{label}</strong>
            </span>
            <ArrowUpRight size={17} />
          </button>
        ))}
      </div>
      <div className="settings-footnote">
        <ShieldCheck size={16} />
        <span>
          <strong>Your choices stay yours.</strong>
          <small>
            Privacy and matching settings can be changed at any time.
          </small>
        </span>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [view, setView] = useState<View>("feed");
  const [createOpen, setCreateOpen] = useState(false);
  const [projectDraftToResume, setProjectDraftToResume] = useState<ContentDraft<ProjectDraftPayload> | null>(null);
  const [editProfileRequested, setEditProfileRequested] = useState(false);
  const [postComposerOpen, setPostComposerOpen] = useState(false);
  const [postDraftToResume, setPostDraftToResume] = useState<ContentDraft<PostDraftPayload> | null>(null);
  const [latestPost, setLatestPost] = useState<TimelinePost | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [matchOpen, setMatchOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [latestProject, setLatestProject] = useState<ProjectRecord | null>(
    null,
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    null,
  );
  const [commentProject, setCommentProject] = useState<ProjectRecord | null>(
    null,
  );
  const [threadPost, setThreadPost] = useState<TimelinePost | null>(null);
  const [shortlistProjectId, setShortlistProjectId] = useState<string | null>(
    null,
  );
  const [shareProject, setShareProject] = useState<{
    id: string;
    title: string;
    summary: string;
    kind?: "project" | "post" | "profile";
    sharePath?: string;
  } | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [guestAuthMode, setGuestAuthMode] = useState<
    "register" | "signin" | null
  >(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [initialGuestPrompt, setInitialGuestPrompt] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [messageConversationId, setMessageConversationId] = useState<string | null>(null);
  const [initialMeetingId, setInitialMeetingId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [peopleSuggestions, setPeopleSuggestions] = useState<
      PeopleSuggestionRecord[]
    >([]),
    [peopleOpen, setPeopleOpen] = useState(false),
    [peopleSuggestionsLoading, setPeopleSuggestionsLoading] = useState(true);
  const [contributionTarget, setContributionTarget] =
    useState<ContributionTarget | null>(null);
  const [currentMember, setCurrentMember] = useState<MemberPerson>({
    name: "nice 2 network",
    role: "Public network",
  });
  const [authenticated, setAuthenticated] = useState(false);
  const [expandedProfilePhoto, setExpandedProfilePhoto] = useState<{ src: string; alt: string } | null>(null);
  const latestBrowserNotification = useRef<string | null | false>(false);
  const peopleSuggestionsLoaded = useRef(false);
  const deepLinkHandled = useRef(false);
  const updateUnreadCounts = useCallback((unread: number, messages: number) => {
    setUnreadNotifications(unread);
    setUnreadMessages(messages);
  }, []);
  useEffect(() => {
    const expand = (event: Event) => setExpandedProfilePhoto((event as CustomEvent<{ src: string; alt: string }>).detail);
    const changed = (event: Event) => setCurrentMember(current => ({ ...current, img: (event as CustomEvent<string | null>).detail }));
    window.addEventListener("n2:expand-profile-photo", expand);
    window.addEventListener("n2:profile-photo-changed", changed);
    return () => {
      window.removeEventListener("n2:expand-profile-photo", expand);
      window.removeEventListener("n2:profile-photo-changed", changed);
    };
  }, []);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const syncKeyboard = () => {
      const inset = Math.max(
        0,
        window.innerHeight - viewport.height - viewport.offsetTop,
      );
      document.documentElement.style.setProperty("--keyboard-inset", `${inset}px`);
      const active = document.activeElement;
      if (
        inset > 80 &&
        active instanceof HTMLElement &&
        (active.matches("input, textarea, [contenteditable='true']"))
      ) {
        window.requestAnimationFrame(() =>
          active.scrollIntoView({ block: "center", inline: "nearest" }),
        );
      }
    };
    viewport.addEventListener("resize", syncKeyboard);
    viewport.addEventListener("scroll", syncKeyboard);
    syncKeyboard();
    return () => {
      viewport.removeEventListener("resize", syncKeyboard);
      viewport.removeEventListener("scroll", syncKeyboard);
      document.documentElement.style.setProperty("--keyboard-inset", "0px");
    };
  }, []);
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((session) => {
        if (session?.user?.forcePasswordChange) {
          window.location.href = "/change-password";
          return;
        }
        if (session?.user?.id && session?.user?.name) {
          setAuthenticated(true);
          setCurrentMember({
            id: session.user.id,
            name: session.user.name,
            role: session.user.profession ?? "n2 member",
            img: session.user.image,
            isN2Admin: Boolean(session.user.isN2Admin),
          });
        }
      })
      .catch(() => undefined)
      .finally(() => setSessionChecked(true));
  }, []);
  useEffect(() => {
    if (!authenticated || !currentMember.id) return;
    const memberId = currentMember.id;
    const controller = new AbortController();
    fetch(`/api/profiles/${encodeURIComponent(memberId)}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => {
        const profile = result?.profile;
        if (!profile) return;
        setCurrentMember((current) =>
          current.id === memberId
            ? {
                ...current,
                name: profile.name ?? current.name,
                role: profile.profession ?? current.role,
                img: profile.image ?? null,
              }
            : current,
        );
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) return;
      });
    return () => controller.abort();
  }, [authenticated, currentMember.id]);
  useEffect(() => {
    if (!sessionChecked || authenticated) return;
    if (window.sessionStorage.getItem("n2-guest-peeked") === "true") return;
    setInitialGuestPrompt(true);
    setGuestAuthMode("signin");
  }, [authenticated, sessionChecked]);
  useEffect(() => {
    if (!authenticated || deepLinkHandled.current) return;
    const params = new URLSearchParams(window.location.search), profileId = params.get("profile"), projectId = params.get("project"), postId = params.get("post"), meetingId = params.get("meeting"), roleId = params.get("role"), requestedView = params.get("view"), conversationId = params.get("conversation");
    if (profileId) {
      deepLinkHandled.current = true;
      setSelectedProfileId(profileId);
      setView("profile");
      return;
    }
    if (requestedView === "messages") {
      deepLinkHandled.current = true;
      setMessageConversationId(conversationId);
      setView("messages");
      return;
    }
    if (postId) {
      deepLinkHandled.current = true;
      void openSavedPost(postId);
      return;
    }
    if (meetingId) {
      deepLinkHandled.current = true;
      setInitialMeetingId(meetingId);
      setView("meet");
      return;
    }
    if (!projectId) return;
    deepLinkHandled.current = true;
    setView("projects");
    setSelectedProjectId(projectId);
    if (!roleId) return;
    fetch(`/api/projects/${encodeURIComponent(projectId)}`)
      .then(async response => ({ response, data: await response.json() }))
      .then(({ response, data }) => {
        if (!response.ok || !data.project) return;
        if (data.project.isOwner || data.project.isMember) return;
        const roles = (data.project.roles ?? []) as ProjectRoleRecord[];
        if (!roles.some(role => role.id === roleId && role.status === "open" && role.filled < role.capacity)) return;
        setContributionTarget({ projectId, projectTitle: data.project.title, roles, initialRoleId: roleId });
      })
      .catch(() => undefined);
  }, [authenticated]);
  useEffect(() => {
    if (!authenticated) return;
    let mounted = true;
    let inFlight = false;
    let retryDelay = 15_000;
    let timer: number | undefined;
    let controller: AbortController | undefined;

    function schedule(delay = retryDelay) {
      window.clearTimeout(timer);
      const delivery = getBrowserNotificationPreferences();
      if (
        mounted &&
        navigator.onLine &&
        (document.visibilityState === "visible" || delivery.popups || delivery.sound)
      ) {
        timer = window.setTimeout(poll, delay);
      }
    }

    async function poll() {
      if (
        !mounted ||
        inFlight ||
        !navigator.onLine ||
        (document.visibilityState === "hidden" &&
          !getBrowserNotificationPreferences().popups &&
          !getBrowserNotificationPreferences().sound)
      )
        return;
      inFlight = true;
      controller = new AbortController();
      try {
        const response = await fetch("/api/notifications", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Notifications returned ${response.status}`);
        const data = await response.json();
        if (!mounted) return;
        retryDelay = 15_000;
        setUnreadNotifications(data.unread ?? 0);
        setUnreadMessages(data.unreadMessages ?? 0);
        const notification = (data.notifications ?? []).find(
          (item: NotificationRecord) => !item.readAt,
        ) as NotificationRecord | undefined;
        if (latestBrowserNotification.current === false) {
          latestBrowserNotification.current = notification?.id ?? null;
          return;
        }
        if (!notification || latestBrowserNotification.current === notification.id) return;
        latestBrowserNotification.current = notification.id;
        const delivery = getBrowserNotificationPreferences();
        if (delivery.sound) await playBrowserNotificationSound();
        if (delivery.popups && typeof Notification !== "undefined") {
          const notice = new Notification(notification.title, {
            body: notification.body,
            icon: "/brand/nice-2-network-mark.svg",
            tag: `n2-notification-${notification.id}`,
          });
          notice.onclick = () => {
            window.focus();
            if (notification.href) window.location.assign(notification.href);
            else setView("notifications");
            notice.close();
          };
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          retryDelay = Math.min(retryDelay * 2, 5 * 60_000);
        }
      } finally {
        inFlight = false;
        controller = undefined;
        schedule();
      }
    }

    const resume = () => {
      retryDelay = 15_000;
      window.clearTimeout(timer);
      void poll();
    };

    void poll();
    window.addEventListener("online", resume);
    window.addEventListener("storage", resume);
    window.addEventListener("n2:browser-notifications-changed", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      mounted = false;
      controller?.abort();
      window.clearTimeout(timer);
      window.removeEventListener("online", resume);
      window.removeEventListener("storage", resume);
      window.removeEventListener("n2:browser-notifications-changed", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [authenticated]);
  useEffect(() => {
    if (!authenticated) return;
    const wideRail = window.matchMedia("(min-width: 1361px)");
    if (!wideRail.matches && !searchOpen && !peopleOpen) return;
    if (peopleSuggestionsLoaded.current) return;
    const controller = new AbortController();
    setPeopleSuggestionsLoading(true);
    fetch("/api/people/suggestions?limit=3", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { suggestions: [] }))
      .then((data) => {
        peopleSuggestionsLoaded.current = true;
        setPeopleSuggestions(data.suggestions ?? []);
      })
      .catch(() => undefined)
      .finally(() => setPeopleSuggestionsLoading(false));
    return () => controller.abort();
  }, [authenticated, peopleOpen, searchOpen]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const open = (event: Event) => {
      if (!authenticated) {
        requireSignIn();
        return;
      }
      setSelectedProjectId((event as CustomEvent<string>).detail);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("n2:open-project", open);
    return () => window.removeEventListener("n2:open-project", open);
  }, [authenticated]);
  useEffect(() => {
    const open = (event: Event) => {
      if (!authenticated) {
        requireSignIn();
        return;
      }
      setContributionTarget((event as CustomEvent<ContributionTarget>).detail);
    };
    window.addEventListener("n2:apply-role", open);
    return () => window.removeEventListener("n2:apply-role", open);
  }, [authenticated]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setMatchOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  function requireSignIn() {
    setInitialGuestPrompt(false);
    setGuestAuthMode("signin");
  }
  function takeGuestPeek() {
    window.sessionStorage.setItem("n2-guest-peeked", "true");
    setInitialGuestPrompt(false);
    setGuestAuthMode(null);
  }
  function go(next: View) {
    if (!authenticated && next !== "feed") {
      requireSignIn();
      return;
    }
    if (next !== view) signalDeploymentNavigation();
    setSelectedProjectId(null);
    if (next === "messages") setMessageConversationId(null);
    setView(next);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function openProfile(userId: string) {
    if (!authenticated) {
      requireSignIn();
      return;
    }
    if (!userId.startsWith("demo-")) {
      if (view === "profile") signalDeploymentNavigation();
      setSelectedProfileId(userId);
      setCommentProject(null);
      go("profile");
    }
  }
  function openOwnProfile() {
    if (!authenticated) {
      requireSignIn();
      return;
    }
    setSelectedProfileId(currentMember.id ?? null);
    go("profile");
  }
  function openProject(projectId: string) {
    if (!authenticated) {
      requireSignIn();
      return;
    }
    signalDeploymentNavigation();
    setSelectedProjectId(projectId);
    setView("projects");
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function openSavedPost(postId: string) {
    if (!authenticated) {
      requireSignIn();
      return;
    }
    const response = await fetch(`/api/posts/${encodeURIComponent(postId)}/thread`, { cache: "no-store" });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.post) {
      setToast(result?.error ?? "This saved post is no longer available.");
      return;
    }
    setThreadPost({ ...result.post, linkedProjects: result.post.linkedProjects ?? [] });
  }
  function openSavedMeet(meetingId: string) {
    if (!authenticated) {
      requireSignIn();
      return;
    }
    signalDeploymentNavigation();
    setInitialMeetingId(meetingId);
    setView("meet");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function followSuggestedPerson(item: Pick<PeopleSuggestionRecord, "id" | "name">) {
    const response = await fetch(`/api/users/${item.id}/follow`, { method: "POST" });
    const result = await response.json();
    if (!response.ok) {
      setToast(result.error ?? "Could not follow this member.");
      return;
    }
    signalNetworkChanged();
    setPeopleSuggestions((rows) => rows.filter((row) => row.id !== item.id));
    setToast(result.mutual
      ? `You and ${item.name} are now mutually connected.`
      : `You’re now following ${item.name}.`);
  }
  if (!sessionChecked) return <AppLoadingShell />;
  return (
    <div
      className={`app-shell ${view === "network" && !selectedProjectId ? "network-shell" : ""}`}
    >
      <a className="skip-link" href="#main-content">Skip to main content</a>
      {menuOpen && (
        <button
          type="button"
          className="mobile-sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside id="mobile-sidebar" className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div>
          <Logo onClick={() => go("feed")} />
          <nav>
            {nav.map((item) => {
              const Icon = item.icon;
              const isProfile = item.id === "profile";
              return (
                <button
                  key={item.id}
                  className={`${view === item.id ? "active" : ""} ${isProfile ? "profile-nav-button" : ""}`.trim()}
                  onClick={() => isProfile ? openOwnProfile() : go(item.id)}
                >
                  {isProfile && authenticated
                    ? <Avatar person={currentMember} size="sm" />
                    : <Icon size={20} />}
                  <span>{item.label}</span>
                  {authenticated && item.id === "messages" && unreadMessages > 0 && <b className="nav-unread-count">{unreadMessages > 9 ? "9+" : unreadMessages}</b>}
                  {authenticated && item.id === "notifications" && unreadNotifications > 0 && <b className="nav-unread-count">{unreadNotifications > 9 ? "9+" : unreadNotifications}</b>}
                  {!authenticated && item.id !== "feed" && (
                    <i className="preview-lock" aria-label="Sign in required" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
        <div className="sidebar-bottom">
          {authenticated ? (
            <>
              <div className="sidebar-account-divider" aria-hidden="true" />
              <button
                onClick={() => {
                  setEditProfileRequested(false);
                  go("settings");
                }}
                className={view === "settings" ? "active" : ""}
              >
                <Settings size={20} />
                <span>Settings</span>
              </button>
              <button onClick={() => signOut({ redirectTo: "/signin" })}>
                <LogOut size={20} />
                <span>Log out</span>
              </button>
              {currentMember.isN2Admin && (
                <Link className="admin-nav-link admin-profile-slot" href="/admin">
                  <ShieldCheck size={20} />
                  <span>Admin console</span>
                  <N2AdminBadge />
                </Link>
              )}
            </>
          ) : (
            <div className="public-sidebar-auth">
              <p>Have a skill, idea, introduction or words of encouragement?</p>
              <Link href="/signin">Sign in</Link>
              <Link className="join" href="/signin?mode=register">
                Join n2
              </Link>
            </div>
          )}
        </div>
      </aside>
      <main className="main-content" id="main-content" tabIndex={-1}>
        <button
          className="mobile-menu"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          aria-controls="mobile-sidebar"
        >
          {menuOpen ? <ArrowLeft /> : <Menu />}
        </button>
        <div className="content-column">
          {selectedProjectId ? (
            <ProjectDetailView
              projectId={selectedProjectId}
              onBack={() => {
                signalDeploymentNavigation();
                setSelectedProjectId(null);
                setView("projects");
              }}
              onProfile={openProfile}
              onToast={setToast}
            />
          ) : (
            <>
              {view === "feed" && (
                <Feed
                  currentMember={currentMember}
                  newPost={latestPost}
                  newProject={latestProject}
                  authenticated={authenticated}
                  onRequireAuth={requireSignIn}
                  onCreate={() => { setProjectDraftToResume(null); setCreateOpen(true); }}
                  onDiscover={() => setSearchOpen(true)}
                  onShareIdea={() => { setPostDraftToResume(null); setPostComposerOpen(true); }}
                  onMatch={() => setMatchOpen(true)}
                  onComments={(project) =>
                    authenticated ? setCommentProject(project) : requireSignIn()
                  }
                  onPostThread={setThreadPost}
                  onProfile={openProfile}
                  onProject={() => go("projects")}
                  onShare={setShareProject}
                  onToast={setToast}
                />
              )}
              {authenticated && view === "projects" && (
                <ProjectsView
                  onCreate={() => { setProjectDraftToResume(null); setCreateOpen(true); }}
                  onResumeDraft={(draft) => { setProjectDraftToResume(draft); setCreateOpen(true); }}
                  latestProject={latestProject}
                  onComments={setCommentProject}
                  onProfile={openProfile}
                  onShare={setShareProject}
                  onToast={setToast}
                  onShortlist={setShortlistProjectId}
                />
              )}
              {authenticated && view === "network" && (
                <NetworkView
                  currentMember={currentMember}
                  onProfile={openProfile}
                />
              )}
              {authenticated && view === "messages" && (
                <MessagesView currentMember={currentMember} initialConversationId={messageConversationId} onUnreadCounts={updateUnreadCounts} />
              )}
              {authenticated && view === "notifications" && (
                <NotificationsPage onUnreadCounts={updateUnreadCounts} />
              )}
              {authenticated && view === "meet" && <MeetView key={initialMeetingId ?? "meet"} initialMeetingId={initialMeetingId} />}
              {authenticated && view === "profile" && (
                <ProfileView
                  key={selectedProfileId ?? currentMember.id ?? "self"}
                  member={currentMember}
                  userId={selectedProfileId ?? currentMember.id}
                  onEdit={() => {
                    setEditProfileRequested(true);
                    go("settings");
                  }}
                  onProject={openProject}
                  onProfile={openProfile}
                  onPost={openSavedPost}
                  onMeet={openSavedMeet}
                  onShare={setShareProject}
                  onToast={setToast}
                  onResumePostDraft={(draft) => { setPostDraftToResume(draft); setPostComposerOpen(true); }}
                />
              )}
              {authenticated && view === "settings" && (
                <SettingsView
                  key={editProfileRequested ? "profile-edit" : "settings"}
                  initialPanel={editProfileRequested ? "profile" : "root"}
                />
              )}
            </>
          )}
        </div>
      </main>
      {view !== "network" && (
        <aside className="right-rail">
          <div className="rail-top">
            <button
              className="search-button"
              onClick={() =>
                authenticated ? setSearchOpen(true) : requireSignIn()
              }
            >
              <Search size={18} />
              <span>Search people & projects</span>
              <kbd>⌘K</kbd>
            </button>
            <button
              className="icon-button border notification-button"
              onClick={() => authenticated ? go("notifications") : requireSignIn()}
              aria-label={authenticated && unreadNotifications > 0 ? `Open notifications page, ${unreadNotifications} unread` : "Open notifications page"}
            >
              {authenticated && unreadNotifications > 0
                ? <NotificationUnreadIndicator unread={unreadNotifications} />
                : <Bell size={19} />}
            </button>
          </div>
          {!authenticated && (
            <div className="public-rail-auth">
              <Link href="/signin">Sign in</Link>
              <Link href="/signin?mode=register">Join n2</Link>
            </div>
          )}
          {authenticated && (
            <section className="rail-card">
              <div className="rail-title">
                <span>PEOPLE TO KNOW</span>
                <button onClick={() => setPeopleOpen(true)}>See all</button>
              </div>
              {peopleSuggestionsLoading && (
                <LoadingState label="Loading people to know" variant="list" count={3} className="loading-rail-people" />
              )}
              {!peopleSuggestionsLoading && peopleSuggestions.map((item) => (
                <div className="person-suggest" key={item.id}>
                  <button
                    className="suggested-person-profile"
                    onClick={() => openProfile(item.id)}
                  >
                    <Avatar
                      person={{
                        name: item.name ?? "n2 member",
                        role: item.profession ?? "Member",
                        img: item.image,
                      }}
                      size="md"
                    />
                    <span>
                      <strong>{item.name ?? "n2 member"}</strong>
                      <i>{item.profession ?? "Member"}</i>
                      <small title={item.reasons.join(" ")}>
                        {item.reasons[0]}
                      </small>
                    </span>
                  </button>
                  <button
                    className="follow-person-button"
                    aria-label={`Follow ${item.name}`}
                    onClick={() => followSuggestedPerson(item)}
                  >
                    <Plus size={17} />
                  </button>
                </div>
              ))}
              {!peopleSuggestionsLoading && !peopleSuggestions.length && (
                <p className="people-cold-start">
                  More people to connect with will appear as the community grows.
                </p>
              )}
            </section>
          )}
          <NetworkPulse onProjects={() => go("projects")} />
          <footer>
            <Logo />
            <p>Connect, create and support each other.</p>
            <div>
              <Link href="/about">About</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/community">Community</Link>
              <button className="rail-help-link" onClick={() => setHelpOpen(true)}>
                <CircleHelp size={10} />
                <span>Help</span>
              </button>
            </div>
            <small>
              © 2026 nice 2 network · built by{" "}
              <a className="intaillium-credit" data-wordmark="IntAillium" href="https://intaillium.com" target="_blank" rel="noreferrer">
                IntAillium
              </a>
            </small>
          </footer>
        </aside>
      )}
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {mobileNav.filter((item) => item.id !== view).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => go(item.id)}
              >
                {authenticated && item.id === "notifications" && unreadNotifications > 0
                  ? <NotificationUnreadIndicator unread={unreadNotifications} />
                  : authenticated && item.id === "messages" && unreadMessages > 0
                    ? <MessageUnreadIndicator unread={unreadMessages} />
                  : <Icon size={21} />}
                <span>{item.label}</span>
              </button>
            );
          })}
      </nav>
      {authenticated && createOpen && (
        <CreateProject
          currentMember={currentMember}
          initialDraft={projectDraftToResume}
          onToast={setToast}
          onClose={() => { setCreateOpen(false); setProjectDraftToResume(null); }}
          onPublish={(project) => {
            setLatestProject(project);
            setToast("Project published — people with shared interests are being notified.");
            go("projects");
          }}
        />
      )}
      {authenticated && postComposerOpen && (
        <PostComposer
          currentMember={currentMember}
          initialDraft={postDraftToResume}
          onClose={() => { setPostComposerOpen(false); setPostDraftToResume(null); }}
          onPosted={setLatestPost}
          onToast={setToast}
        />
      )}
      {authenticated && matchOpen && (
        <MatchPanel
          onClose={() => setMatchOpen(false)}
          onMessage={() => {
            setMatchOpen(false);
            go("network");
          }}
        />
      )}
      {authenticated && searchOpen && (
        <SearchOverlay
          onClose={() => setSearchOpen(false)}
          onNavigate={go}
          onProfile={openProfile}
          suggestions={peopleSuggestions}
          onSeeAllPeople={() => setPeopleOpen(true)}
          onFollowSuggestion={followSuggestedPerson}
        />
      )}
      {authenticated && peopleOpen && (
        <PeopleDiscoveryPanel
          onClose={() => setPeopleOpen(false)}
          onProfile={openProfile}
          onToast={setToast}
          onNetworkChanged={signalNetworkChanged}
        />
      )}
      {helpOpen && (
        <HelpPanel onClose={() => setHelpOpen(false)} onNavigate={go} />
      )}
      {!authenticated && guestAuthMode && (
        <GuestAuthPrompt
          initialMode={guestAuthMode}
          onPeek={initialGuestPrompt ? takeGuestPeek : undefined}
          onClose={initialGuestPrompt ? takeGuestPeek : () => setGuestAuthMode(null)}
        />
      )}
      {shareProject && (
        <ShareSheet
          item={shareProject}
          authenticated={authenticated}
          onRequireAuth={requireSignIn}
          onClose={() => setShareProject(null)}
          onToast={setToast}
        />
      )}
      {commentProject && (
        <ProjectComments
          project={commentProject}
          onClose={() => setCommentProject(null)}
          onProfile={openProfile}
        />
      )}
      {threadPost && (
        <PostThread
          initialPost={threadPost}
          currentUserId={currentMember.id}
          onClose={() => setThreadPost(null)}
          onProfile={openProfile}
          onUpdated={setThreadPost}
        />
      )}
      {shortlistProjectId && (
        <ShortlistPanel
          projectId={shortlistProjectId}
          onClose={() => setShortlistProjectId(null)}
          onProfile={openProfile}
          onToast={setToast}
        />
      )}
      {authenticated && contributionTarget && (
        <ContributionDialog
          target={contributionTarget}
          onClose={() => setContributionTarget(null)}
          onToast={setToast}
        />
      )}
      {expandedProfilePhoto && (
        <div className="profile-photo-lightbox" role="presentation" onMouseDown={event => event.target === event.currentTarget && setExpandedProfilePhoto(null)}>
          <section role="dialog" aria-modal="true" aria-label={`${expandedProfilePhoto.alt} profile photo`}>
            <button type="button" className="icon-button" onClick={() => setExpandedProfilePhoto(null)} aria-label="Close profile photo"><X size={20} /></button>
            <img src={expandedProfilePhoto.src} alt={expandedProfilePhoto.alt} />
          </section>
        </div>
      )}
      {toast && (
        <div className="toast">
          <Check size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}
