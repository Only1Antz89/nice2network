/* eslint-disable no-empty, @next/next/no-img-element, jsx-a11y/media-has-caption, jsx-a11y/no-autofocus, jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex, react-hooks/set-state-in-effect */
"use client";

import {
  ArrowLeft,
  ArrowUpRight,
  Bell,
  Bold,
  Bookmark,
  BriefcaseBusiness,
  CalendarDays,
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
  List,
  Paperclip,
  LogOut,
  MapPin,
  Minus,
  Mic,
  Menu,
  MessageCircle,
  Navigation,
  Pencil,
  Pin,
  Plus,
  Repeat2,
  Search,
  Send,
  Share2,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  UserPlus,
  UsersRound,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Underline,
  Video,
  Archive,
  Accessibility,
  X,
} from "lucide-react";
import { FormEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import EmojiPicker from "@/components/emoji-picker";
import GuestAuthPrompt from "@/components/guest-auth-prompt";
import HelpPanel from "@/components/help-panel";
import NotificationPanel, {
  type NotificationRecord,
} from "@/components/notification-panel";
import SearchOverlay from "@/components/search-overlay";
import ShareSheet from "@/components/share-sheet";
import N2OrbitMark from "@/components/n2-orbit-mark";
import ActionDialog from "@/components/action-dialog";
import PeopleDiscoveryPanel from "@/components/people-discovery-panel";
import {
  Avatar,
  DemoBadge,
  Logo,
  N2AdminBadge,
  N2FounderLabel,
  N2Mark,
  type MemberPerson,
} from "@/components/network-brand";
import { sanitizeRichText } from "@/lib/rich-text";
import { layoutFocusedNetwork } from "@/lib/network-focus-layout";
import {
  ACCESSIBILITY_STORAGE_KEY,
  ACCESSIBILITY_EVENT,
  DEFAULT_ACCESSIBILITY_PREFERENCES,
  applyAccessibilityPreferences,
  normaliseAccessibilityPreferences,
  storeAndApplyAccessibilityPreferences,
  type AccessibilityPreferences,
} from "@/lib/accessibility-preferences";

type View =
  | "feed"
  | "projects"
  | "network"
  | "messages"
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
};
type ContributionTarget = {
  projectId: string;
  projectTitle: string;
  roles: ProjectRoleRecord[];
  initialRoleId?: string;
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
  createdAt: string;
};

const PROJECT_INDUSTRIES = [
  "Agriculture & food",
  "Arts & culture",
  "Automotive & mobility",
  "Beauty & wellness",
  "Charity & social impact",
  "Climate & energy",
  "Community & local services",
  "Construction & built environment",
  "Consumer products & retail",
  "Creative industries",
  "Education & training",
  "Entertainment & media",
  "Fashion & textiles",
  "Finance & fintech",
  "Gaming & interactive",
  "Government & public services",
  "Healthcare & life sciences",
  "Hospitality & tourism",
  "Legal & professional services",
  "Manufacturing & engineering",
  "Marketing & communications",
  "Property & real estate",
  "Science & research",
  "Sport & fitness",
  "Sustainability & circular economy",
  "Technology & software",
  "Transport & logistics",
  "Other",
] as const;

const COMMON_TIMEZONES = [
  "Europe/London",
  "Europe/Dublin",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Africa/Accra",
  "Africa/Lagos",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Sao_Paulo",
  "UTC",
] as const;
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
  isN2Admin: boolean;
  isFounder: boolean;
  isDemo?: boolean;
  isCurrent: boolean;
  projectCount: number;
  involvedCount: number;
  followers: number;
  following: number;
  isFollowing: boolean;
  isMutual: boolean;
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
type PeopleSuggestionRecord = {
  recommendationId: string;
  id: string;
  name: string | null;
  image: string | null;
  profession: string | null;
  location: string | null;
  score: number;
  reasons: string[];
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
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  if (hour < 22) return "Good evening";
  return "Good night";
}

function firstUrl(value?: string | null) {
  const match = value?.match(/https?:\/\/[^\s<>]+/i)?.[0];
  return match?.replace(/[),.!?;:]+$/, "") ?? null;
}

function LinkifiedText({ text }: { text: string }) {
  const matches = [...text.matchAll(/https?:\/\/[^\s<>]+/gi)];
  if (!matches.length) return <>{text}</>;
  const content: ReactNode[] = [];
  let cursor = 0;
  matches.forEach((match, index) => {
    const start = match.index ?? 0;
    const raw = match[0];
    const href = raw.replace(/[),.!?;:]+$/, "");
    const trailing = raw.slice(href.length);
    if (start > cursor) content.push(text.slice(cursor, start));
    content.push(
      <a
        className="n2-hyperlink"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
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

function FreeChoiceInput({
  value,
  onChange,
  options,
  placeholder,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  id: string;
}) {
  const [open, setOpen] = useState(false);
  const matches = options
    .filter(
      (option) =>
        !value.trim() || option.toLowerCase().includes(value.toLowerCase()),
    )
    .slice(0, 10);
  return (
    <div className="free-choice">
      <input
        id={id}
        role="combobox"
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        aria-autocomplete="list"
        aria-controls={`${id}-choices`}
        aria-expanded={open}
      />
      {open && (
        <div id={`${id}-choices`} className="free-choice-list" role="listbox">
          {matches.map((option) => (
            <button
              type="button"
              role="option"
              aria-selected={option === value}
              key={option}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
            >
              {option}
            </button>
          ))}
          {value.trim() &&
            !options.some(
              (option) => option.toLowerCase() === value.trim().toLowerCase(),
            ) && (
              <button
                type="button"
                className="free-choice-custom"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setOpen(false)}
              >
                <Plus size={13} /> Use “{value.trim()}”
              </button>
            )}
        </div>
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
        <select aria-label="Font" defaultValue="Arial" onMouseDown={rememberSelection} onChange={(event) => runCommand("fontName", event.target.value)}>
          <option value="Arial">Sans serif</option>
          <option value="Georgia">Georgia</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Verdana">Verdana</option>
          <option value="Courier New">Monospace</option>
        </select>
        <select aria-label="Font size" defaultValue="3" onMouseDown={rememberSelection} onChange={(event) => runCommand("fontSize", event.target.value)}>
          <option value="2">Small</option>
          <option value="3">Normal</option>
          <option value="4">Large</option>
          <option value="5">Extra large</option>
        </select>
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
  { id: "meet" as View, label: "Meet", icon: CalendarDays },
];


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
              title={`Apply for ${role.title}`}
              aria-label={`Apply for ${role.title}`}
              onClick={() =>
                window.dispatchEvent(
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
    [bookmarked, setBookmarked] = useState(Boolean(project.isBookmarked));
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
      });
      if (response.ok) {
        onChanged?.(null);
        onToast?.("Project deleted.");
        setDialog(null);
      }
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
            <button onClick={followProject}>
              <Eye size={15} />
              {project.isFollowingProject
                ? "Stop following project"
                : "Follow project"}
            </button>
            {!project.isOwner && !project.isMember && (
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
            {project.isMember && !project.isOwner && (
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
            {project.isOwner && (
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
                  onClick={() => {
                    setDialog("delete");
                    setOpen(false);
                  }}
                >
                  <Trash2 size={15} />
                  Delete project
                </button>
              </>
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
                    <select name="stage" defaultValue={project.stage}>
                      <option value="idea">Idea</option>
                      <option value="planning">Planning</option>
                      <option value="building">Building</option>
                      <option value="launching">Launching</option>
                    </select>
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
              <p className="n2-confirm-copy">
                This removes the project from the network. This action cannot be
                undone.
              </p>
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
    <article
      className={`project-card ${second ? "project-blue" : "project-orange"}`}
      style={
        project
          ? ({ "--project-accent": project.accent } as React.CSSProperties)
          : undefined
      }
    >
      <div
        className="project-accent"
        style={project ? { background: project.accent } : undefined}
      />
      <div className="project-body">
        <div className="project-card-title">
          <div className="project-kicker">
            <span>PROJECT</span>
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
        {project?.imageUrl && (
          <button
            className="project-card-image"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("n2:open-project", { detail: project.id }),
              )
            }
          >
            <img src={project.imageUrl} alt={`${project.title} project`} />
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
            <span>Was this useful?</span>
            <button onClick={() => feedback("not_now")}>Not now</button>
            <button onClick={() => feedback("not_relevant")}>
              <ThumbsDown size={13} /> Not relevant
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
  currentMember,
}: {
  onClose: () => void;
  onPublish: (project: ProjectRecord) => void;
  currentMember: MemberPerson;
}) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [form, setForm] = useState({
    title: "",
    summary: "",
    description: "",
    imageUrl: null as string | null,
    accent: "#ff6b35",
    industry: "Community & local services",
    stage: "idea",
    workMode: "remote",
    city: "",
    country: "United Kingdom",
    timezone:
      Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London",
    allowRemoteFallback: true,
  });
  const [projectId, setProjectId] = useState(""),
    [blueprint, setBlueprint] = useState<BlueprintRecord | null>(null),
    [roles, setRoles] = useState<BlueprintRole[]>([]),
    [roadmap, setRoadmap] = useState<
      Array<{
        title: string;
        description: string;
        phase: "now" | "next" | "later";
        ownerId: string | null;
        dueAt: string | null;
      }>
    >([]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [similarProjects, setSimilarProjects] = useState<SimilarProjectSuggestion[]>([]);
  async function mapTeam() {
    setBusy(true);
    setError("");
    const draftResponse = await fetch("/api/projects/drafts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const draft = await draftResponse.json();
    if (!draftResponse.ok) {
      setError(draft.error ?? "Could not save the private project draft.");
      setBusy(false);
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
      setBusy(false);
      return;
    }
    setBlueprint(result.blueprint);
    setRoles(result.blueprint.roles);
    setRoadmap(
      result.blueprint.milestones.map(
        (item: { title: string; phase: "now" | "next" | "later" }) => ({
          title: item.title,
          description: "",
          phase: item.phase,
          ownerId: currentMember.id ?? null,
          dueAt: null,
        }),
      ),
    );
    setStep(1);
    setBusy(false);
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
      accent: form.accent,
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
          setStep(2);
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
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className="project-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-head">
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
          <span>{step === 0 ? "New project" : step === 1 ? "Review your team map" : "Similar projects"}</span>
          <span className="step-count">{step === 0 ? "1/2" : step === 1 ? "2/2" : "Review"}</span>
        </div>
        {step === 0 ? (
          <div className="modal-content">
            <span className="eyebrow">START WITH THE SPARK</span>
            <h2 id="modal-title">What would you like to make happen?</h2>
            <label>
              Project title
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Repair, remake, pass it on"
              />
            </label>
            <textarea
              placeholder="Describe the idea, why it matters, and where you'd like help…"
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
            />
            <div className="field-row">
              <label>
                Stage
                <select
                  value={form.stage}
                  onChange={(e) => setForm({ ...form, stage: e.target.value })}
                >
                  <option value="idea">Idea</option>
                  <option value="planning">Planning</option>
                  <option value="building">Building</option>
                  <option value="launching">Launching</option>
                </select>
              </label>
              <label htmlFor="project-industry">
                Industry
                <FreeChoiceInput
                  id="project-industry"
                  value={form.industry}
                  onChange={(industry) => setForm({ ...form, industry })}
                  options={PROJECT_INDUSTRIES}
                  placeholder="Type or choose an industry"
                />
              </label>
            </div>
            <div className="field-row single-field">
              <label>
                Working style
                <select
                  value={form.workMode}
                  onChange={(e) =>
                    setForm({ ...form, workMode: e.target.value })
                  }
                >
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="in_person">In person</option>
                </select>
              </label>
            </div>
            <div className="field-row location-time-row">
              <fieldset className="location-fields">
                <legend>Location</legend>
                <div>
                  <input
                    aria-label="City"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="City"
                  />
                  <input
                    aria-label="Country"
                    value={form.country}
                    onChange={(e) =>
                      setForm({ ...form, country: e.target.value })
                    }
                    placeholder="Country"
                  />
                </div>
              </fieldset>
              <label>
                Timezone
                <input
                  list="n2-timezones"
                  value={form.timezone}
                  onChange={(e) =>
                    setForm({ ...form, timezone: e.target.value })
                  }
                  placeholder="Europe/London"
                />
                <datalist id="n2-timezones">
                  {COMMON_TIMEZONES.map((timezone) => (
                    <option key={timezone} value={timezone} />
                  ))}
                </datalist>
              </label>
            </div>
            <section className="project-visual-fields">
              <div>
                <span>Timeline accent</span>
                <div className="project-colour-options">
                  {[
                    "#ff6b35",
                    "#4169e1",
                    "#7c3aed",
                    "#0f9d72",
                    "#e54885",
                    "#111111",
                  ].map((colour) => (
                    <button
                      type="button"
                      key={colour}
                      className={form.accent === colour ? "active" : ""}
                      style={{ background: colour }}
                      aria-label={`Use ${colour} accent`}
                      aria-pressed={form.accent === colour}
                      onClick={() => setForm({ ...form, accent: colour })}
                    />
                  ))}
                </div>
              </div>
              <label className="project-image-input">
                <ImageIcon size={16} />
                <span>
                  <strong>
                    {form.imageUrl
                      ? "Change project image"
                      : "Add a project image"}
                  </strong>
                  <small>Optional · JPG, PNG or WebP · 1.5 MB maximum</small>
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) =>
                    chooseProjectImage(event.target.files?.[0])
                  }
                />
              </label>
              {form.imageUrl && (
                <div className="project-image-preview">
                  <img src={form.imageUrl} alt="Project preview" />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, imageUrl: null })}
                  >
                    <X size={14} /> Remove
                  </button>
                </div>
              )}
            </section>
            <div className="remote-fallback">
              <input
                id="remote-fallback"
                type="checkbox"
                checked={form.allowRemoteFallback}
                onChange={(e) =>
                  setForm({ ...form, allowRemoteFallback: e.target.checked })
                }
              />
              <label htmlFor="remote-fallback">
                <strong>Use remote fallback</strong>
                <small>
                  Widen the search only when suitable local people are scarce.
                </small>
              </label>
            </div>
            {error && <p className="form-error">{error}</p>}
            <button
              className="primary-button wide"
              disabled={
                busy ||
                form.title.trim().length < 4 ||
                form.summary.trim().length < 20
              }
              onClick={mapTeam}
            >
              {busy ? (
                "Mapping the project…"
              ) : (
                <>
                  Find the gaps <N2Mark inverse />
                </>
              )}
            </button>
          </div>
        ) : step === 2 ? (
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
              <button type="button" className="secondary-button" onClick={() => setStep(1)} disabled={busy}><ArrowLeft size={15}/> Back</button>
              <button type="button" className="primary-button" onClick={continueWithProject} disabled={busy}>{busy ? "Publishing…" : "Continue with my project"}</button>
            </div>
          </div>
        ) : (
          <div className="modal-content ai-result">
            <div className="ai-orbit">
              <N2Mark />
              <span>n2 project map</span>
            </div>
            <h2 id="modal-title">{blueprint?.outcome}</h2>
            <p>
              Review every role before it affects matching. n2 never sends
              automatic invitations.
            </p>
            {blueprint?.usedFallback && (
              <div className="blueprint-fallback">
                <ShieldCheck size={16} />
                <span>
                  <strong>Your editable team map is ready</strong>
                  <small>
                    Review the suggested roles and adjust them to fit the team
                    you want to build.
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
                      <select
                        value={item.phase}
                        onChange={(e) =>
                          setRoadmap((items) =>
                            items.map((row, i) =>
                              i === index
                                ? {
                                    ...row,
                                    phase: e.target.value as typeof item.phase,
                                  }
                                : row,
                            ),
                          )
                        }
                      >
                        <option value="now">Now</option>
                        <option value="next">Next</option>
                        <option value="later">Later</option>
                      </select>
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
            <div className="blueprint-roles">
              {roles.map((role, index) => (
                <article key={`${index}-${role.title}`}>
                  <div className="blueprint-role-head">
                    <select
                      aria-label="Role phase"
                      value={role.phase}
                      onChange={(e) =>
                        updateRole(index, {
                          phase: e.target.value as BlueprintRole["phase"],
                        })
                      }
                    >
                      <option value="now">Now</option>
                      <option value="next">Next</option>
                      <option value="later">Later</option>
                    </select>
                    <select
                      aria-label="Role criticality"
                      value={role.criticality}
                      onChange={(e) =>
                        updateRole(index, {
                          criticality: e.target
                            .value as BlueprintRole["criticality"],
                        })
                      }
                    >
                      <option value="critical">Critical</option>
                      <option value="important">Important</option>
                      <option value="useful">Useful</option>
                    </select>
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
            <button
              className="primary-button wide"
              disabled={busy || roles.length === 0}
              onClick={checkSimilarityAndPublish}
            >
              {busy ? (
                "Publishing and matching…"
              ) : (
                <>
                  Approve map & publish <ArrowUpRight size={17} />
                </>
              )}
            </button>
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
  onProject: () => void;
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
            <button key={project.id} onClick={onProject}>
              #
              {project.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "")}
            </button>
          ))}
        </div>
      )}
      {post.attachmentType === "image" && post.attachmentUrl && (
        <img
          className="post-media"
          src={post.attachmentUrl}
          alt="Post attachment"
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
        description="Reports are reviewed privately. Choose the closest reason and add useful context if needed."
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
  onClose,
  onPosted,
  onToast,
}: {
  currentMember: MemberPerson;
  initialPost?: TimelinePost;
  onClose: () => void;
  onPosted: (post: TimelinePost) => void;
  onToast: (message: string) => void;
}) {
  const editing = Boolean(initialPost);
  const [body, setBody] = useState(initialPost?.body ?? ""),
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
        : null,
    ),
    [ownProjects, setOwnProjects] = useState<ProjectRecord[]>([]),
    [publicProjects, setPublicProjects] = useState<ProjectRecord[]>([]),
    [projectSource, setProjectSource] = useState<"mine" | "public">("mine"),
    [projectQuery, setProjectQuery] = useState(""),
    [linked, setLinked] = useState<string[]>(
      initialPost?.linkedProjects.map((project) => project.id) ?? [],
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    Promise.all([
      fetch("/api/projects?scope=mine&limit=40"),
      fetch("/api/projects?scope=discover&filter=newest&limit=40"),
    ])
      .then(async ([mine, discover]) => {
        const mineData = mine.ok ? await mine.json() : { projects: [] },
          publicData = discover.ok ? await discover.json() : { projects: [] };
        setOwnProjects(
          (mineData.projects ?? []).filter(
            (project: ProjectRecord) =>
              project.status === "active" && project.visibility === "network",
          ),
        );
        setPublicProjects(publicData.projects ?? []);
      })
      .catch(() => undefined);
  }, []);
  const projectsList = [
    ...ownProjects,
    ...publicProjects.filter(
      (project) => !ownProjects.some((own) => own.id === project.id),
    ),
  ];
  const visibleProjects = (
    projectSource === "mine" ? ownProjects : publicProjects
  ).filter(
    (project) =>
      !projectQuery.trim() ||
      `${project.title} ${project.industry}`
        .toLowerCase()
        .includes(projectQuery.trim().toLowerCase()),
  );
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
  function toggleProject(project: ProjectRecord) {
    setLinked((ids) => {
      if (ids.includes(project.id)) {
        setBody((value) =>
          value.replace(
            new RegExp(
              `\\s*#${project.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}\\b`,
              "i",
            ),
            "",
          ),
        );
        return ids.filter((id) => id !== project.id);
      }
      if (ids.length >= 8) return ids;
      const tag = `#${project.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}`;
      setBody((value) => `${value.trim()}${value.trim() ? " " : ""}${tag}`);
      return [...ids, project.id];
    });
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
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
    onClose();
  }
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <form className="post-composer-modal" onSubmit={submit}>
        <header>
          <div>
            <span className="eyebrow">
              {editing ? "EDIT YOUR POST" : "SHARE WITH THE NETWORK"}
            </span>
            <h2>{editing ? "Edit post" : "Share a post or idea"}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
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
        <textarea
          autoFocus
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="What are you thinking about, building or looking to explore?"
          maxLength={3000}
        />
        {attachment && (
          <div className="attachment-preview">
            <button type="button" onClick={() => setAttachment(null)}>
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
        <div className="post-tools">
          <EmojiPicker
            onSelect={(emoji) => setBody((value) => `${value}${emoji}`)}
            align="right"
          />
          <label>
            <ImageIcon size={17} /> Image
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(event) => chooseFile(event.target.files?.[0])}
            />
          </label>
          <label>
            <Video size={17} /> Video
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={(event) => chooseFile(event.target.files?.[0])}
            />
          </label>
        </div>
        <section className="project-hashtags">
          <div>
            <strong>Link existing projects</strong>
            <small>
              Choose one of your public projects or tag any public project.
            </small>
          </div>
          <div className="project-source-tabs">
            <button
              type="button"
              className={projectSource === "mine" ? "active" : ""}
              onClick={() => setProjectSource("mine")}
            >
              Your projects <span>{ownProjects.length}</span>
            </button>
            <button
              type="button"
              className={projectSource === "public" ? "active" : ""}
              onClick={() => setProjectSource("public")}
            >
              Public projects <span>{publicProjects.length}</span>
            </button>
          </div>
          <label className="project-link-search">
            <Search size={14} />
            <input
              value={projectQuery}
              onChange={(event) => setProjectQuery(event.target.value)}
              placeholder="Search projects or industries"
            />
          </label>
          <div className="project-link-results">
            {visibleProjects.map((project) => (
              <button
                type="button"
                key={project.id}
                className={linked.includes(project.id) ? "selected" : ""}
                onClick={() => toggleProject(project)}
              >
                #
                {project.title
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/^-|-$/g, "")}
              </button>
            ))}
            {!visibleProjects.length && (
              <p>
                {projectSource === "mine"
                  ? "You do not have a public project to link yet."
                  : "No public projects match that search."}
              </p>
            )}
          </div>
        </section>
        {error && <p className="form-error">{error}</p>}
        <footer>
          <small>{body.length}/3000</small>
          <button className="primary-button" disabled={busy || !body.trim()}>
            {busy
              ? editing
                ? "Saving…"
                : "Posting…"
              : editing
                ? "Save changes"
                : "Post"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function NetworkPulse({ onProjects }: { onProjects: () => void }) {
  const [slides, setSlides] = useState<PulseSlide[]>([]),
    [active, setActive] = useState(0),
    [paused, setPaused] = useState(false);
  useEffect(() => {
    fetch("/api/network-pulse")
      .then((response) => (response.ok ? response.json() : { slides: [] }))
      .then((data) => setSlides(data.slides ?? []))
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    if (paused || slides.length < 2) return;
    const timer = setInterval(
      () => setActive((index) => (index + 1) % slides.length),
      5500,
    );
    return () => clearInterval(timer);
  }, [paused, slides.length]);
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
            <select
              value={draft.industry}
              onChange={(event) =>
                setDraft({ ...draft, industry: event.target.value })
              }
            >
              <option value="">All industries</option>
              {industries.map((industry) => (
                <option key={industry}>{industry}</option>
              ))}
            </select>
          </label>
          <label>
            Stage
            <select
              value={draft.stage}
              onChange={(event) =>
                setDraft({ ...draft, stage: event.target.value })
              }
            >
              <option value="">Any stage</option>
              <option value="idea">Idea</option>
              <option value="planning">Planning</option>
              <option value="building">Building</option>
              <option value="launching">Launching</option>
            </select>
          </label>
          <label>
            Working style
            <select
              value={draft.workMode}
              onChange={(event) =>
                setDraft({ ...draft, workMode: event.target.value })
              }
            >
              <option value="">Any working style</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="in_person">In person</option>
            </select>
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

function Feed({
  onCreate,
  onShareIdea,
  onMatch,
  onComments,
  onPostThread,
  onProfile,
  onProject,
  onShare,
  onNotifications,
  onToast,
  unread,
  currentMember,
  newPost,
  authenticated,
  onRequireAuth,
}: {
  onCreate: () => void;
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
  onNotifications: () => void;
  onToast: (message: string) => void;
  unread: number;
  currentMember: MemberPerson;
  newPost: TimelinePost | null;
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
      name: string | null;
      image: string | null;
      profession: string | null;
      createdAt: string;
    }>
  >([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null),
    [loadingMore, setLoadingMore] = useState(false),
    [algorithmMode, setAlgorithmMode] = useState("shadow");
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
    fetch("/api/notices")
      .then((r) => (r.ok ? r.json() : { notices: [] }))
      .then((data) => setNotices(data.notices ?? []))
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    const scope =
      filter === "Following"
        ? "following"
        : filter === "Newest"
          ? "newest"
          : "for_you";
    fetch(`/api/posts?scope=${scope}`)
      .then((r) => (r.ok ? r.json() : { posts: [] }))
      .then((data) => setPosts(data.posts ?? []))
      .catch(() => undefined);
  }, [filter, authenticated]);
  useEffect(() => {
    if (authenticated && filter === "Newest")
      fetch("/api/feed/new-joiners")
        .then((r) => (r.ok ? r.json() : { joiners: [] }))
        .then((data) => setNewJoiners(data.joiners ?? []))
        .catch(() => undefined);
  }, [authenticated, filter]);
  useEffect(() => {
    if (newPost)
      setPosts((rows) => [
        newPost,
        ...rows.filter((row) => row.id !== newPost.id),
      ]);
  }, [newPost]);
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
    fetch(projectQuery(), { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { projects: [] }))
      .then((data) => {
        setLiveProjects(data.projects ?? []);
        setNextCursor(data.nextCursor ?? null);
        setAlgorithmMode(data.algorithmMode ?? "shadow");
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [authenticated, projectQuery]);
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
  return (
    <>
      <div className="mobile-topbar">
        <Logo />
        <div className="public-mobile-actions">
          <button
            className="icon-button notification-button"
            onClick={authenticated ? onNotifications : onRequireAuth}
            aria-label={authenticated && unread > 0 ? `Open notifications, ${unread} unread` : "Open notifications"}
          >
            {authenticated && unread > 0
              ? <b className="notification-count" aria-hidden="true">{unread > 9 ? "9+" : unread}</b>
              : <Bell size={20} />}
          </button>
          {!authenticated && (
            <a className="public-mobile-signin" href="/signin?mode=register">
              Join n2
            </a>
          )}
        </div>
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
              : "See what useful people are building."}
          </h1>
          <p>
            {authenticated
              ? "Projects across the network could use someone like you today."
              : "Explore real ideas, open roles and collaborations growing across n2."}
          </p>
        </div>
        <button
          className="primary-button"
          onClick={authenticated ? onCreate : onRequireAuth}
        >
          <Plus size={18} /> Start a project
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
            onClick={() => (authenticated ? setFilter(item) : onRequireAuth())}
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
      {notices.map((notice) => (
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
      {authenticated && filter === "Following" && (
        <div className="feed-context">
          <UsersRound size={16} />
          <span>
            Projects from people you know, with open roles that fit your
            network.
          </span>
        </div>
      )}
      {authenticated && filter === "Newest" && (
        <div className="feed-context">
          <Clock3 size={16} />
          <span>
            New projects, posts and members—ordered by when they joined the
            network.
          </span>
        </div>
      )}
      {authenticated &&
        filter === "Newest" &&
        newJoiners.map((person) => (
          <button
            className="new-joiner-card"
            key={person.id}
            onClick={() => onProfile(person.id)}
          >
            <Avatar
              person={{
                name: person.name ?? "n2 member",
                role: person.profession ?? "New member",
                img: person.image,
              }}
              size="md"
            />
            <span>
              <strong>{person.name ?? "New n2 member"}</strong>
              <small>
                {person.profession ?? "Completing their profile"} · joined{" "}
                {new Date(person.createdAt).toLocaleDateString()}
              </small>
            </span>
            <ArrowUpRight size={16} />
          </button>
        ))}
      {authenticated && filter === "For you" && algorithmMode === "shadow" && (
        <div className="feed-context">
          <N2Mark />
          <span>
            n2 is validating team recommendations in shadow mode. Your feed
            stays stable while quality is measured.
          </span>
        </div>
      )}
      {mixedFeed.map((entry) => {
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
      {!liveProjects.length && (
        <ProjectCard
          onShare={onShare}
          onMatch={authenticated ? onMatch : onRequireAuth}
          authenticated={authenticated}
          onRequireAuth={onRequireAuth}
        />
      )}
      {nextCursor && (
        <button
          className="feed-load-more"
          disabled={loadingMore}
          onClick={loadMore}
        >
          {loadingMore ? "Loading useful projects…" : "Load more projects"}
        </button>
      )}
      <article className="connection-card">
        <div className="connection-copy">
          <span className="eyebrow">WORTH MEETING</span>
          <h3>
            {authenticated
              ? "You and Lena both care about purposeful brands."
              : "Useful projects start with people you would not usually meet."}
          </h3>
          <p>
            {authenticated
              ? "She’s looking to meet product designers working on climate and public good."
              : "Join n2 to discover relevant collaborators across industries and skills."}
          </p>
          <button
            onClick={
              authenticated ? () => onProfile("demo-lena") : onRequireAuth
            }
          >
            {authenticated ? "View Lena’s profile" : "Join the network"}{" "}
            <ArrowUpRight size={16} />
          </button>
        </div>
        <Avatar person={people.lena} size="xl" ring />
      </article>
      {!liveProjects.length && (
        <ProjectCard
          second
          onShare={onShare}
          onMatch={authenticated ? onMatch : onRequireAuth}
          authenticated={authenticated}
          onRequireAuth={onRequireAuth}
        />
      )}
      <div className="end-note">
        <span>n2</span>
        <p>You’re all caught up for now.</p>
      </div>
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
                      <select name="phase" defaultValue="later">
                        <option value="now">Now</option>
                        <option value="next">Next</option>
                        <option value="later">Later</option>
                      </select>
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
                  <select name="projectStage" defaultValue="">
                    <option value="">Keep {project.stage}</option>
                    <option value="idea">Idea</option>
                    <option value="planning">Planning</option>
                    <option value="building">Building</option>
                    <option value="launching">Launching</option>
                  </select>
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
              <select name="type" defaultValue="progress">
                <option value="progress">Progress</option>
                <option value="decision">Decision</option>
                <option value="risk">Risk</option>
                <option value="win">Win</option>
                <option value="update">General update</option>
              </select>
            </label>
            <label>
              Roadmap step
              <select
                name="milestoneId"
                defaultValue={
                  project.milestones.find(
                    (item) => item.status === "in_progress",
                  )?.id ?? ""
                }
              >
                <option value="">Project-wide update</option>
                {project.milestones.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
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
                  Suggest useful experience or services not listed above.
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
            {fit && (
              <div className={`role-fit ${mismatch ? "warning" : "match"}`}>
                {mismatch ? <CircleAlert size={19} /> : <Check size={19} />}
                <span>
                  <strong>
                    {mismatch
                      ? "Your profile may not closely match this contribution"
                      : "Your profile shows a relevant match"}
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
              <div className="role-fit warning">
                <CircleAlert size={19} />
                <span>
                  <strong>Application already submitted</strong>
                  <small>
                    Your application is currently {fit.existingStatus}.
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
            <label>
              Why are you a useful fit?
              <textarea
                name="message"
                minLength={20}
                maxLength={1200}
                placeholder="Describe relevant skills, experience and what you would contribute."
                required
              />
            </label>
            {mismatch && (
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
            Cancel
          </button>
          {(role || generic) && (
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
              <p>Give people enough context to recognise where they can be useful.</p>
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
                  <select value={draft.workMode} onChange={(event) => updateDraft("workMode", event.target.value as RecruitmentDraft["workMode"])}>
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="in_person">In person</option>
                  </select>
                </label>
              </div>
              <label>
                What will they help with?
                <textarea
                  value={draft.description}
                  onChange={(event) => updateDraft("description", event.target.value)}
                  placeholder="Describe the challenge and the first useful outcome."
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
                  Useful skills
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
              <p>This creates an open role and lets relevant members discover it.</p>
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
              <h3>Find the most useful next teammate.</h3>
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
      "overview" | "team" | "ai_assist" | "roadmap" | "updates" | "funding"
    >("overview"),
    [fundingOpen, setFundingOpen] = useState(false),
    [fundingType, setFundingType] = useState<
      "invest" | "donate" | "contribute" | "share_request"
    >("contribute"),
    [professionRequestOpen, setProfessionRequestOpen] = useState(false),
    [aiAssistOpen, setAiAssistOpen] = useState(false),
    [professionDraft, setProfessionDraft] = useState<RecruitmentDraft>(emptyRecruitmentDraft),
    [busy, setBusy] = useState(false);
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
      onToast(data.message);
    } else onToast(data.error ?? "Could not register interest.");
  }
  if (loading)
    return (
      <div className="feed-context">
        <Clock3 size={16} /> Loading project…
      </div>
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
    canRecruit = project.ownerId === project.currentUserId;
  return (
    <div className="project-detail">
      <button className="project-detail-back" onClick={onBack}>
        <ArrowLeft size={16} /> Projects
      </button>
      <header
        style={{ "--detail-accent": project.accent } as React.CSSProperties}
      >
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
        {(["overview", "team", "ai_assist", "roadmap", "updates", "funding"] as const)
          .filter((item) => item !== "ai_assist" || canRecruit)
          .map(
          (item) => (
            <button
              key={item}
              className={tab === item ? "active" : ""}
              onClick={() => setTab(item)}
            >
              {item === "ai_assist" ? "Ai Assist" : item}
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
                  Apply for a listed role or offer another useful contribution.
                </p>
              </div>
              {!project.isOwner && !project.isMember && (
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
                    onClick={() =>
                      window.dispatchEvent(
                        new CustomEvent("n2:apply-role", {
                          detail: {
                            projectId: project.id,
                            projectTitle: project.title,
                            roles: project.roles,
                            initialRoleId: role.id,
                          },
                        }),
                      )
                    }
                  >
                    <span>
                      <strong>{role.title}</strong>
                      <small>
                        {role.department} · {role.phase} · {role.criticality}
                      </small>
                    </span>
                    <b>
                      {Math.max(0, role.capacity - role.filled)} open{" "}
                      <ArrowUpRight size={13} />
                    </b>
                  </button>
                ))}
              {!project.roles.some(
                (role) => role.status === "open" && role.filled < role.capacity,
              ) && (
                <p>
                  No listed roles right now. You can still offer another useful
                  contribution.
                </p>
              )}
            </div>
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
            {canRecruit && (
              <button className="primary-button" onClick={() => { setProfessionDraft(emptyRecruitmentDraft); setProfessionRequestOpen(true); }}>
                <UserPlus size={15} /> Add member
              </button>
            )}
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
      {tab === "ai_assist" && canRecruit && (
        <section className="project-ai-assist-panel">
          <N2OrbitMark />
          <span className="eyebrow">AI PROJECT ADVISER</span>
          <h2>Work out what this project needs next.</h2>
          <p>Ai Assist reviews the project brief, stage, current team and your expertise to recommend the most useful next roles and milestones.</p>
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
          <div className="funding-options">
            {[
              ["contribute", "Contribute", "Offer practical financial support"],
              ["donate", "Donate", "Offer funding without ownership"],
              ["invest", "Invest", "Start an investment conversation"],
              [
                "share_request",
                "Request a share",
                "Ask the owner to discuss ownership terms",
              ],
            ].map(([id, title, copy]) => (
              <button
                key={id}
                onClick={() => {
                  setFundingType(id as typeof fundingType);
                  setFundingOpen(true);
                }}
              >
                <span>
                  <strong>{title}</strong>
                  <small>{copy}</small>
                </span>
                <ArrowUpRight size={16} />
              </button>
            ))}
          </div>
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
  latestProject,
  onComments,
  onProfile,
  onShare,
  onToast,
  onShortlist,
}: {
  onCreate: () => void;
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
    [tab, setTab] = useState<"mine" | "involved" | "discover">("mine");
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
  const owned = allMine.filter((record) => record.isOwner !== false),
    involved = allMine.filter((record) => record.isOwner === false);
  const visible =
    tab === "mine" ? owned : tab === "involved" ? involved : discover;
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
      <div className="stats-row">
        <div>
          <strong>{String(owned.length).padStart(2, "0")}</strong>
          <span>Your projects</span>
        </div>
        <div>
          <strong>{involved.length}</strong>
          <span>Involved</span>
        </div>
        <div>
          <strong>{discover.length}</strong>
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
            : tab === "involved"
              ? "Projects you’re helping"
              : "Explore the network"}
        </h3>
        {tab !== "discover" && (
          <button onClick={() => setTab("discover")}>
            Discover projects <ArrowUpRight size={15} />
          </button>
        )}
      </div>
      {loading && (
        <div className="feed-context">
          <Clock3 size={16} />
          <span>Loading your project workspaces…</span>
        </div>
      )}
      {!loading &&
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
      {!loading && !visible.length && (
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
  list?: { items: NetworkNodeRecord[]; cursor: string | null; nextCursor: string | null; total: number };
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
    [whyReasons, setWhyReasons] = useState<string[]>([]),
    [introTarget, setIntroTarget] = useState<NetworkNodeRecord | null>(null),
    [hideTarget, setHideTarget] = useState<NetworkNodeRecord | null>(null),
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
  async function confirmHideConnection() {
    if (!hideTarget) return;
    const response = await fetch("/api/network/hides", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ targetId: hideTarget.id }) });
    if (response.ok) {
      setHideTarget(null);
      setSelected(null);
      const refreshed = await fetch("/api/network/graph", { cache: "no-store" });
      if (refreshed.ok) setData(await refreshed.json());
    }
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
    const params = new URLSearchParams({ mode: data.focus ? "focus" : "overview" });
    if (data.focus?.id) params.set("focus", data.focus.id);
    if (cursor) params.set("cursor", cursor);
    if (skill.trim()) params.set("query", skill.trim());
    if (profession !== "All professions") params.set("cluster", profession);
    const response = await fetch(`/api/network/graph?${params}`, { cache: "no-store" });
    if (response.ok) setData(await response.json());
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
          <strong>{data.totals?.visible ?? peopleNodes.length}</strong>
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
            <i className="network-self-search-icon"><Search size={28} /></i>
            <span>{currentMember.name}</span>
            <small>{mobileSearchOpen ? "Close search" : "Search your network"}</small>
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
              <select
                value={profession}
                onChange={(event) => setProfession(event.target.value)}
                aria-label="Filter network by profession"
              >
                {categories.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
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
                />
                <span>{node.name}</span>
                <small>{category}</small>
                {node.degree === 2 && <em>via {peopleNodes.find((item) => item.id === node.shared_by)?.name ?? "your network"}</em>}
                {data.focus && !node.connected_to_focus && data.focus.id !== node.id && <em>your connection</em>}
              </button>
            );
          })}
          {(loading || focusLoading) && (
            <div className="network-map-status">Mapping your network…</div>
          )}
          {!loading && !data.nodes.length && (
            <div className="network-map-status network-cold-start">
              <NetworkGraphIcon size={28} />
              <strong>Your network starts with one useful connection</strong>
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
            <aside className={`network-brief sheet-${sheetLevel}`}>
              <button className="network-sheet-handle" aria-label={`${sheetLevel === "full" ? "Collapse" : "Expand"} member details`} onClick={() => setSheetLevel((level) => level === "collapsed" ? "mid" : level === "mid" ? "full" : "collapsed")} onPointerDown={(event) => { sheetDrag.current = event.clientY; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerUp={(event) => { if (sheetDrag.current === null) return; const delta = event.clientY - sheetDrag.current; if (delta < -30) setSheetLevel((level) => level === "collapsed" ? "mid" : "full"); if (delta > 30) setSheetLevel((level) => level === "full" ? "mid" : "collapsed"); sheetDrag.current = null; }}><i /></button>
              <button
                className="network-brief-close"
                onClick={closeNetworkBrief}
                aria-label="Close member details"
              >
                <X size={15} />
              </button>
              <div className="network-sheet-summary">
                <Avatar person={{ name: selected.name ?? "n2 member", role: selected.profession ?? "Member", img: selected.image }} size="lg" ring />
                <span><b className="network-connection-state">{selected.mutual ? "Mutual connection" : selected.is_following ? "You follow this member" : selected.degree === 2 ? "Member of member" : "Follows you"}</b><h2>{selected.name}</h2><small>{selected.profession ?? "n2 member"}{selected.location ? ` · ${selected.location}` : ""}</small></span>
              </div>
              <div className="network-sheet-tabs" role="tablist">
                <button className={detailTab === "profile" ? "active" : ""} onClick={() => setDetailTab("profile")} role="tab">Profile</button>
                <button className={detailTab === "connections" ? "active" : ""} onClick={() => { setDetailTab("connections"); setSheetLevel("full"); }} role="tab">Connections {data.list?.total ?? 0}</button>
              </div>
              {detailTab === "profile" ? <>
                <p>{selected.bio ?? "Open their profile to learn more about the contribution they make."}</p>
                <div className="network-skill-list">{[selected.primary_skill, selected.secondary_skill, selected.tertiary_skill].filter(Boolean).map((value) => <span key={value!}>{value}</span>)}</div>
                {selected.is_following && data.focus?.id === selected.id && <div className={`network-release ${data.focus.expanded ? "released" : "private"}`}><UsersRound size={15} /><span><strong>{data.focus.expanded ? `${data.focus.followingCount} following · ${data.focus.followerCount} followers` : "Connections kept private"}</strong><small>{data.focus.expanded ? "Shown with every member’s privacy choices applied." : "This member has chosen not to share their network."}</small></span></div>}
                <div className="network-reasons">
                  <button onClick={explainConnection}><CircleHelp size={14} /> Why you see this person</button>
                  {(whyReasons.length ? whyReasons : selected.reasons).map((reason) => <small key={reason}>{reason}</small>)}
                </div>
                <div className="network-brief-actions">
                  {selected.introduction_eligible && <button className="secondary-button" onClick={() => setIntroTarget(selected)}><UserPlus size={14} /> Ask for an introduction</button>}
                  <button className="secondary-button" onClick={() => setHideTarget(selected)}>Hide from map</button>
                </div>
                <button className="primary-button wide" onClick={() => { fetch("/api/network/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event: "profile_opened", targetId: selected.id }), keepalive: true }).catch(() => undefined); onProfile(selected.id); }}>View full profile <ArrowUpRight size={15} /></button>
              </> : <div className="network-connection-list" role="tabpanel">
                {(data.list?.items ?? []).map((item) => <button key={item.id} onClick={() => setSelected(item)}><Avatar person={{ name: item.name ?? "n2 member", role: item.profession ?? "Member", img: item.image }} size="sm" /><span><strong>{item.name}</strong><small>{item.reasons[0]}</small></span><ArrowUpRight size={14} /></button>)}
                {!data.list?.items.length && <p>No visible connections in this view.</p>}
                <footer><button disabled={!data.list?.cursor} onClick={() => loadConnectionPage(data.list?.cursor ?? null)}><ChevronLeft size={14} /> Previous</button><small>{data.list?.total ?? 0} visible</small><button disabled={!data.list?.nextCursor} onClick={() => loadConnectionPage(data.list?.nextCursor ?? null)}>Next <ChevronRight size={14} /></button></footer>
              </div>}
            </aside>
          )}
        </div>
      </div>
      {introTarget && <ActionDialog eyebrow="WARM INTRODUCTION" title={`Ask for an introduction to ${introTarget.name ?? "this member"}?`} description="Your mutual connection can accept or decline. If they accept, n2 creates a three-person conversation." confirmLabel="Send request" fields={[{ name: "context", label: "Why would this introduction be useful?", placeholder: "Share enough context for your connection to decide…", required: true, minLength: 20, maxLength: 500, multiline: true }]} onClose={() => setIntroTarget(null)} onConfirm={requestIntroduction} />}
      {hideTarget && <ActionDialog eyebrow="CURATE YOUR MAP" title={`Hide ${hideTarget.name ?? "this member"} from Networks?`} description="This only removes them from your network map. It does not unfollow them or change recommendations elsewhere." confirmLabel="Hide from map" cancelLabel="Keep visible" onClose={() => setHideTarget(null)} onConfirm={confirmHideConnection} />}
      {incomingIntroduction && <div className="modal-backdrop action-dialog-backdrop" role="presentation"><section className="n2-editor-modal action-dialog network-introduction-review" role="dialog" aria-modal="true" aria-labelledby="network-introduction-title"><header><div><span className="eyebrow">WARM INTRODUCTION</span><h2 id="network-introduction-title">Would you introduce these members?</h2></div><button className="icon-button" onClick={() => setIncomingIntroduction(null)} aria-label="Close request"><X size={18}/></button></header><div className="network-introduction-people"><Avatar person={{ name: incomingIntroduction.requester_name ?? "n2 member", role: incomingIntroduction.requester_profession ?? "Member", img: incomingIntroduction.requester_image }} size="lg"/><span><strong>{incomingIntroduction.requester_name}</strong><small>would like to meet</small><strong>{incomingIntroduction.target_name}</strong></span><Avatar person={{ name: incomingIntroduction.target_name ?? "n2 member", role: incomingIntroduction.target_profession ?? "Member", img: incomingIntroduction.target_image }} size="lg"/></div><blockquote>{incomingIntroduction.context}</blockquote><p>Accepting creates a named three-person conversation. Declining shares no private reason.</p><footer><button className="secondary-button" onClick={() => respondToIntroduction("decline")}>Decline</button><button className="primary-button" onClick={() => respondToIntroduction("accept")}>Accept and introduce</button></footer></section></div>}
    </div>
  );
}

type ConversationRecord = {
  id: string;
  name: string | null;
  projectId?: string | null;
  archivedAt?: string | null;
  snoozedUntil?: string | null;
  members: Array<{
    userId: string;
    name: string | null;
    image: string | null;
    profession: string | null;
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
};
function MessagesView({ currentMember }: { currentMember: MemberPerson }) {
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
    [editMessageTarget, setEditMessageTarget] = useState<ChatMessage | null>(null),
    [deleteMessageTarget, setDeleteMessageTarget] = useState<ChatMessage | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const selectedConversationId = selected?.id;
  const latestMessageId = messagesList.at(-1)?.id;
  const title = (row: ConversationRecord) =>
    row.name ||
    row.members
      .filter((member) => member.userId !== currentMember.id)
      .map((member) => member.name)
      .join(", ") ||
    "Conversation";
  async function load() {
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
  }
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (!selected) return;
    const run = () =>
      Promise.all([
        fetch(`/api/conversations/${selected.id}/messages`).then((r) =>
          r.ok ? r.json() : { messages: [] },
        ),
        fetch(`/api/conversations/${selected.id}/typing`).then((r) =>
          r.ok ? r.json() : { people: [] },
        ),
      ]).then(([messageData, typingData]) => {
        setMessagesList(messageData.messages ?? []);
        setTypingNames(
          (typingData.people ?? []).map(
            (person: { name?: string | null }) => person.name || "Someone",
          ),
        );
      });
    run();
    const timer = setInterval(run, 2500);
    return () => clearInterval(timer);
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
  async function send(type: "message" | "nudge" = "message") {
    if (
      !selected ||
      isSending ||
      (!draft.trim() && !attachment && type === "message")
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
            body: draft,
            attachmentType: attachment?.type,
            attachmentUrl: attachment?.url,
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
    const status = typingNames.length
      ? `${typingNames.join(", ")} ${typingNames.length === 1 ? "is" : "are"} typing…`
      : selected.members.length > 2
        ? `${selected.members.length} members`
        : "Direct conversation";
    return (
      <>
      <div className="subpage messages-page conversation-page">
        <div className="conversation-head">
          <button
            className="icon-button border"
            onClick={() => setSelected(null)}
          >
            <ArrowLeft size={18} />
          </button>
          <Avatar
            person={{ name: title(selected), role: "Conversation" }}
            size="md"
          />
          <div>
            <strong>{title(selected)}</strong>
            <span>{status}</span>
          </div>
          <button
            className="icon-button border"
            onClick={() =>
              conversationAction(selected.archivedAt ? "restore" : "archive")
            }
            title={selected.archivedAt ? "Restore" : "Archive"}
          >
            <Archive size={16} />
          </button>
          <button
            className="icon-button border"
            onClick={() => conversationAction("snooze")}
            title="Snooze"
          >
            <Clock3 size={16} />
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
        <div className="chat-flow" role="log" aria-live="polite">
          <div className="chat-date">CONVERSATION</div>
          {!messagesList.length && (
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
          {messagesList.map((message) => (
            <div
              className={`bubble ${message.senderId === currentMember.id ? "mine" : "theirs"} ${message.status === "deleted" ? "deleted" : ""}`}
              key={message.id}
            >
              {message.attachmentType === "image" && message.attachmentUrl && (
                <img src={message.attachmentUrl} alt="Message attachment" />
              )}
              {message.attachmentType === "video" && message.attachmentUrl && (
                <video src={message.attachmentUrl} controls />
              )}
              {message.attachmentType === "file" && message.attachmentUrl && (
                <a href={message.attachmentUrl} download="n2-attachment">
                  Download file
                </a>
              )}
              <span><LinkifiedText text={message.body} /></span>
              {message.status !== "deleted" && <RichLinkPreview text={message.body} />}
              <small className="message-meta">
                <time dateTime={message.createdAt}>
                  {new Date(message.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
                {message.editedAt && " · edited"}
              </small>
              {message.senderId === currentMember.id &&
                message.status !== "deleted" && (
                  <div className="message-actions">
                    <button onClick={() => setEditMessageTarget(message)}>Edit</button>
                    <button onClick={() => setDeleteMessageTarget(message)}>
                      Delete
                    </button>
                  </div>
                )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <div className="conversation-composer-dock">
          <div className="chat-extra-actions">
            <button onClick={() => send("nudge")} disabled={isSending}>
              <span className="emoji-glyph">👋</span> Nudge for a response
            </button>
            <button onClick={() => conversationAction("delete")}>
              <Trash2 size={13} /> Delete chat
            </button>
          </div>
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
              send();
            }}
          >
            <div className="dm-composer-main">
              <textarea
                rows={3}
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
              />
              <div className="dm-composer-toolbar">
                <EmojiPicker
                  onSelect={(emoji) => setDraft((value) => `${value}${emoji}`)}
                />
                <label title="Add image" aria-label="Add image">
                  <ImageIcon size={18} />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => attach(event.target.files?.[0])}
                  />
                </label>
                <label title="Add video" aria-label="Add video">
                  <Video size={18} />
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(event) => attach(event.target.files?.[0])}
                  />
                </label>
                <label title="Add file" aria-label="Add file">
                  <Paperclip size={18} />
                  <input
                    type="file"
                    accept=".pdf,.zip,.doc,.docx"
                    onChange={(event) => attach(event.target.files?.[0])}
                  />
                </label>
                <span>Enter to send · Shift + Enter for a new line</span>
              </div>
            </div>
            <button
              className="dm-send-button"
              aria-label="Send message"
              disabled={isSending || (!draft.trim() && !attachment)}
            >
              <Send size={19} />
              <span>{isSending ? "Sending" : "Send"}</span>
            </button>
          </form>
        </div>
      </div>
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
        {filtered.map((row) => (
          <button onClick={() => setSelected(row)} key={row.id}>
            <Avatar
              person={{
                name: title(row),
                role: "Conversation",
                img: row.members.find(
                  (member) => member.userId !== currentMember.id,
                )?.image,
              }}
              size="md"
            />
            <span>
              <strong>{title(row)}</strong>
              <small>
                {row.snoozedUntil ? "Snoozed · " : ""}
                {row.lastMessage?.body ?? "Start the conversation"}
              </small>
            </span>
            <time>
              {row.lastMessage
                ? new Date(row.lastMessage.created_at).toLocaleDateString(
                    undefined,
                    { weekday: "short" },
                  )
                : "New"}
            </time>
          </button>
        ))}
        {!filtered.length && (
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
  timezone: string;
  joinUrl?: string | null;
  location?: string | null;
  thumbnailUrl?: string | null;
  mode?: "video" | "audio" | "in_person";
  maxParticipants?: number;
  reminderMinutes?: number;
  attendees?: Array<{ email: string; name?: string }>;
  participantProfiles?: Array<MeetInvitee & { status?: string; role?: PodcastInviteRole }>;
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
  podcastRole?: PodcastInviteRole;
};
type PodcastInviteRole = "cohost" | "speaker" | "listener";
type MeetVenue = { latitude: number; longitude: number; displayName: string };
type MeetRoute = { durationSeconds: number; distanceMeters: number };

function MeetCardActions({
  meet,
  onSave,
  onDelete,
}: {
  meet: MeetingRecord;
  onSave: (meet: MeetingRecord, action: "pin" | "bookmark") => void;
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
      {meet.canEdit && (
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

function MeetAttendeePicker({
  selected,
  onChange,
  max,
  podcast,
}: {
  selected: MeetInvitee[];
  onChange: (people: MeetInvitee[]) => void;
  max: number;
  podcast?: boolean;
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
    chosen = new Set(selected.map((person) => person.id));
  function toggle(person: MeetInvitee) {
    if (chosen.has(person.id))
      onChange(selected.filter((item) => item.id !== person.id));
    else if (selected.length < max) onChange([...selected, { ...person, podcastRole: podcast ? "listener" : undefined }]);
  }
  return (
    <fieldset className="meet-attendee-picker">
      <legend>Invite people</legend>
      <p>
        Select followers, mutual connections or discoverable public profiles.
      </p>
      {selected.length > 0 && (
        <div className="meet-selected-people">
          {selected.map((person) => (
            <div className="meet-selected-person" key={person.id}>
              <button type="button" onClick={() => toggle(person)} aria-label={`Remove ${person.name}`}>
                <Avatar person={{ name: person.name, role: person.profession, img: person.image }} size="sm" />
                <span>{person.name}</span><X size={13} />
              </button>
              {podcast && <select aria-label={`${person.name} podcast role`} value={person.podcastRole ?? "listener"} onChange={event => onChange(selected.map(item => item.id === person.id ? { ...item, podcastRole: event.target.value as PodcastInviteRole } : item))}>
                <option value="cohost">Co-host</option>
                <option value="speaker">Guest speaker</option>
                <option value="listener">Listener</option>
              </select>}
            </div>
          ))}
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
        {selected.length}/{max} guests selected
        {max === 7 ? " · up to eight people on video" : max === 15 ? " · up to sixteen people on audio" : ""}
      </small>
    </fieldset>
  );
}
function MeetView() {
  const meetFormRef = useRef<HTMLFormElement>(null);
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
    [meetThumbnail, setMeetThumbnail] = useState<string | null>(null);
  const [showAllPastMeets, setShowAllPastMeets] = useState(false);
  const [pastMeetsCollapsed, setPastMeetsCollapsed] = useState(false);
  const [deleteMeetTarget, setDeleteMeetTarget] = useState<MeetingRecord | null>(null);
  async function load() {
    const response = await fetch("/api/calendar/events");
    const data = response.ok ? await response.json() : { meetings: [] };
    setMeets(data.meetings ?? []);
  }
  useEffect(() => {
    setClockNow(Date.now());
    const timer = window.setInterval(() => setClockNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
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
      podcastRole: person.role ?? "listener",
    })));
    setMeetMode(currentMeet.mode ?? (currentMeet.provider === "in_person" ? "in_person" : "video"));
    setMeetVisibility(currentMeet.visibility ?? "public");
    setMeetProjectId(currentMeet.projectId ?? "");
    setMeetStep(1);
    setMeetTitle(currentMeet.title);
    setMeetLocation(currentMeet.location ?? "");
    setMeetThumbnail(currentMeet.thumbnailUrl ?? null);
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
  }
  async function addMeet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (meetStep === 1) {
      continueMeetSetup();
      return;
    }
    setError("");
    const data = new FormData(event.currentTarget),
      start = new Date(String(data.get("startsAt"))),
      duration = Number(data.get("duration"));
    if (meetVisibility === "project" && !meetProjectId) {
      setError("Choose the project this meet belongs to.");
      return;
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
        attendeeRoles: Object.fromEntries(invitees.map(person => [person.id, person.podcastRole ?? "listener"])),
        reminderMinutes: Number(data.get("reminderMinutes") ?? 30),
        online: meetMode !== "in_person",
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "Could not create the meet");
      return;
    }
    setCreate(false);
    setEditing(null);
    setInvitees([]);
    setMeetStep(1);
    setMeetLocation("");
    setMeetThumbnail(null);
    setMeetVisibility("public");
    setMeetProjectId("");
    setDetail({ ...result, participantProfiles: invitees, canEdit: true });
    load();
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
    upcomingMeets = clockNow ? meets.filter(meet => !meet.endedAt && new Date(meet.endsAt).getTime() >= clockNow) : meets,
    pastMeets = clockNow ? meets.filter(meet => Boolean(meet.endedAt) || new Date(meet.endsAt).getTime() < clockNow) : [];
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
          <p>Small rooms, useful conversations.</p>
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
            <div className="meet-card" key={meet.id}>
              <MeetCardActions meet={meet} onSave={saveMeet} onDelete={setDeleteMeetTarget} />
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
            return <div className="meet-card meet-card-past" key={meet.id}>
              <MeetCardActions meet={meet} onSave={saveMeet} onDelete={setDeleteMeetTarget} />
              <div className="meet-time"><strong>{start.toLocaleDateString(undefined, { day: "numeric", month: "short" })}</strong><span>{start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>
              <div>
                <div className="meet-card-meta">
                  <span className={`tag ${meet.provider === "in_person" ? "dark" : ""}`}>{meet.mode === "audio" ? <Mic size={11}/> : meet.provider === "in_person" ? <MapPin size={11}/> : <Video size={11}/>} {meet.mode === "audio" ? "PODCAST" : meet.provider === "in_person" ? "IN PERSON" : "VIDEO"}</span>
                  <span className="meet-history-status">ENDED</span>
                </div>
                <button className="meet-title-button" onClick={() => setDetail(meet)}>{meet.title}</button>
                <p>{meet.description || meet.location || "Open meeting details"}</p>
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
                <h2>{meetStep === 1 ? (editing ? "Update the room" : "Bring a small room together") : "Invite useful people"}</h2>
              </div>
              <div className="meet-flow-header-actions">
                <div className="meet-flow-progress" aria-label={`Step ${meetStep} of 2`}>
                  <span className={meetStep >= 1 ? "active" : ""}>Details</span>
                  <i />
                  <span className={meetStep >= 2 ? "active" : ""}>Invites</span>
                </div>
                <button type="button" className="icon-button" aria-label="Close meet editor" onClick={closeEditor}><X size={18} /></button>
              </div>
            </header>
            <div className="meet-flow-body">
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
                    ["public", "Public", "Visible to everyone on n2"],
                    ["project", "Project", "Only the selected project"],
                    ["private", "Private", "Invited people only"],
                  ] as const
                ).map(([value, label, description]) => (
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
                    <span>{label}</span>
                    <small>{description}</small>
                  </button>
                ))}
              </div>
              {meetVisibility === "project" && (
                <label className="meet-project-choice">
                  Project
                  <select
                    value={meetProjectId}
                    onChange={(event) => setMeetProjectId(event.target.value)}
                    required
                  >
                    <option value="">Choose a project</option>
                    {meetProjects.map((project) => (
                      <option value={project.id} key={project.id}>
                        {project.title}
                    </option>
                  ))}
                  </select>
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
                      <select name="duration" defaultValue={editing ? String(Math.max(15, Math.round((new Date(editing.endsAt).getTime() - new Date(editing.startsAt).getTime()) / 60000))) : "45"}>
                        <option value="30">30 minutes</option>
                        <option value="45">45 minutes</option>
                        <option value="60">60 minutes</option>
                        <option value="90">90 minutes</option>
                        <option value="120">2 hours</option>
                      </select>
                    </label>
                    <label>
                      Reminder
                      <select name="reminderMinutes" defaultValue={String(editing?.reminderMinutes ?? 30)}>
                        <option value="0">At start time</option>
                        <option value="10">10 minutes before</option>
                        <option value="30">30 minutes before</option>
                        <option value="60">1 hour before</option>
                        <option value="1440">1 day before</option>
                      </select>
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
                    const cap = value === "video" ? 7 : value === "audio" ? 15 : 100;
                    setInvitees(people => people.slice(0, cap));
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
                <MeetAttendeePicker selected={invitees} onChange={setInvitees} max={meetMode === "video" ? 7 : meetMode === "audio" ? 15 : 100} podcast={meetMode === "audio"} />
                {error && <p className="form-error">{error}</p>}
              </section>
            </div>
            <footer className="meet-flow-footer">
              <p>{meetStep === 1 ? "Add the essentials now. Invitees come next." : `${invitees.length} ${invitees.length === 1 ? "person" : "people"} selected`}</p>
              <div>
                {meetStep === 2 && <button type="button" className="secondary-button" onClick={() => setMeetStep(1)}><ArrowLeft size={16}/> Back</button>}
                {meetStep === 1 ? <button type="button" className="primary-button" onClick={continueMeetSetup}>Continue to invites <ChevronRight size={16}/></button> : <button type="submit" className="primary-button">{editing ? "Save changes" : "Create meet"}</button>}
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
            {detail.thumbnailUrl && <img className="meet-detail-cover" src={detail.thumbnailUrl} alt="" />}
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
              {detail.canEdit && <button onClick={() => openEdit(detail)}><Pencil size={15}/>Edit meet</button>}
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
    </div>
  );
}

function ProfileView({
  member,
  userId,
  onEdit,
}: {
  member: MemberPerson;
  userId?: string | null;
  onEdit: () => void;
}) {
  const [profile, setProfile] = useState<ProfileRecord | null>(null),
    [section, setSection] = useState<
      "profile" | "projects" | "followers" | "following" | "media" | "bookmarks"
    >("profile"),
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
    [saved, setSaved] = useState<
      Array<{
        id: string;
        entityType: string;
        pinned: boolean;
        details: Record<string, unknown>;
      }>
    >([]),
    [busy, setBusy] = useState(false),
    [unfollowOpen, setUnfollowOpen] = useState(false);
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/profiles/${userId}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setProfile(data?.profile ?? null));
  }, [userId]);
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
        <p className="profile-role">
          {profile?.isFounder ? <N2FounderLabel /> : person.role}
          {profile?.location ? ` · ${profile.location}` : ""}
        </p>
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
        </div>
        <nav className="profile-tabs">
          {(["profile", "projects", "following", "media"] as const).map(
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
        ) : section === "projects" ? (
          <section className="profile-library">
            <div className="profile-section-head">
              <span className="eyebrow">PROJECT HISTORY</span>
              <small>Started and contributed projects</small>
            </div>
            <div className="profile-project-grid">
              {profile?.projects?.map((project) => (
                <article
                  key={project.id}
                  style={
                    {
                      "--profile-project-accent": project.accent,
                    } as React.CSSProperties
                  }
                >
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
                  <h3>{project.title}</h3>
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
            </div>
          </section>
        ) : section === "media" ? (
          <section className="profile-library">
            <div className="media-grid">
              {media.map((item) =>
                item.attachmentType === "image" && item.attachmentUrl ? (
                  <article key={item.id}>
                    <img src={item.attachmentUrl} alt={item.body} />
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
        ) : section === "bookmarks" ? (
          <section className="profile-library">
            <div className="saved-list">
              {saved.map((item) => (
                <article key={item.id}>
                  <span className="saved-kind">{item.entityType}</span>
                  <strong>{String(item.details.title ?? "Saved item")}</strong>
                  {item.pinned && <Pin size={15} />}
                </article>
              ))}
            </div>
          </section>
        ) : (
          <>
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
  authorId: string;
  authorName: string | null;
  authorImage: string | null;
  authorProfession?: string | null;
  authorIsAdmin?: boolean;
  isDemo?: boolean;
};
function PostThread({
  initialPost,
  onClose,
  onProfile,
  onUpdated,
}: {
  initialPost: TimelinePost;
  onClose: () => void;
  onProfile: (userId: string) => void;
  onUpdated: (post: TimelinePost) => void;
}) {
  const [post, setPost] = useState(initialPost),
    [replies, setReplies] = useState<PostReply[]>([]),
    [draft, setDraft] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
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
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="comment-thread post-thread"
        role="dialog"
        aria-modal="true"
        aria-label={`Replies to ${post.authorName ?? "this post"}`}
      >
        <header>
          <div>
            <span className="eyebrow">POST CONVERSATION</span>
            <h2>
              {post.replyCount ?? replies.length}{" "}
              {(post.replyCount ?? replies.length) === 1 ? "reply" : "replies"}
            </h2>
          </div>
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
                  <button
                    className="profile-name"
                    onClick={() => {
                      onProfile(reply.authorId);
                      onClose();
                    }}
                  >
                    {reply.authorName ?? "n2 member"}{" "}
                    {reply.authorIsAdmin && <N2AdminBadge />}{" "}
                    {reply.isDemo && <DemoBadge />}
                  </button>
                  <time>{new Date(reply.createdAt).toLocaleString()}</time>
                  <p><LinkifiedText text={reply.body} /></p>
                  <RichLinkPreview text={reply.body} />
                </div>
              </article>
            ))
          ) : (
            <div className="comment-empty">
              <MessageCircle size={20} />
              <strong>Start the conversation</strong>
              <p>Reply with a question, perspective or useful offer.</p>
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
          <label>
            <span className="sr-only">Write a reply</span>
            <input
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
              <p>Ask a useful question or offer a contribution.</p>
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
          <label>
            <span className="sr-only">Write a project comment</span>
            <input
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
              Top five active candidates per role. You decide whom to invite.
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
              </div>
              {role.candidates.map((candidate) => (
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
              ))}
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
  const [profileUserId, setProfileUserId] = useState("");
  const [profile, setProfile] = useState({
    name: "",
    headline: "",
    profession: "",
    industry: "Technology",
    bio: "",
    primarySkill: "",
    secondarySkill: "",
    tertiarySkill: "",
    interests: "",
    city: "",
    country: "",
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
  const [profileImage, setProfileImage] = useState(""),
    [coverImage, setCoverImage] = useState("");
  const [notifications, setNotifications] = useState({
    messages: true,
    projects: true,
    matches: true,
    meets: true,
    officialNotices: true,
    digest: "weekly",
  });
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
        if (type === "avatar") setProfileImage(data);
        else setCoverImage(data);
      }
    };
    reader.readAsDataURL(file);
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
      fetch("/api/auth/session")
        .then((r) => r.json())
        .then(async (session) => {
          if (!session?.user?.id) return;
          setProfileUserId(session.user.id);
          const response = await fetch(`/api/profiles/${session.user.id}`);
          if (!response.ok) return;
          const { profile: record } = await response.json();
          setProfileImage(record.image ?? "");
          setCoverImage(record.coverImage ?? "");
          setProfile({
            name: record.name ?? "",
            headline: record.headline ?? "",
            profession: record.profession ?? "",
            industry: record.industry ?? "Technology",
            bio: record.bio ?? "",
            primarySkill: record.rankedSkills?.[0] ?? "",
            secondarySkill: record.rankedSkills?.[1] ?? "",
            tertiarySkill: record.rankedSkills?.[2] ?? "",
            interests: (record.interests ?? []).join(", "),
            city: record.city ?? "",
            country: record.country ?? "",
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
          });
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
              digest: data.preferences.emailDigest,
            });
        })
        .catch(() => undefined);
      fetch("/api/privacy")
        .then((r) => (r.ok ? r.json() : null))
        .then((settings) => {
          if (!settings) return;
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
      const career = profile.career.filter((item) =>
        [item.title, item.company, item.location, item.startDate, item.endDate, item.description]
          .some((value) => String(value ?? "").trim()) || item.current,
      );
      const incompleteCareer = career.find((item) => !item.title.trim() || !item.company.trim());
      if (incompleteCareer) {
        setSaveStatus({ busy: false, error: "Add both a job title and company for each career entry, or remove the unfinished entry." });
        return;
      }
      const education = profile.education.filter((item) =>
        [item.institution, item.qualification, item.fieldOfStudy, item.startYear, item.endYear, item.description]
          .some((value) => String(value ?? "").trim()),
      );
      const incompleteEducation = education.find((item) => !item.institution.trim() || !item.qualification.trim());
      if (incompleteEducation) {
        setSaveStatus({ busy: false, error: "Add both an institution and qualification for each education entry, or remove the unfinished entry." });
        return;
      }
      if (profile.name.trim().length < 2) {
        setSaveStatus({ busy: false, error: "Add at least two characters for your name before saving." });
        return;
      }
      if (![profile.primarySkill, profile.secondarySkill, profile.tertiarySkill].every((skill) => skill.trim())) {
        setSaveStatus({ busy: false, error: "Add your primary, secondary and tertiary career skills before saving." });
        return;
      }
      const response = await fetch(`/api/profiles/${profileUserId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...profile,
          interests: profile.interests
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          career: career.map((item) => ({
            ...item,
            startDate: item.startDate || null,
            endDate: item.endDate || null,
          })),
          education: education.map((item) => ({
            ...item,
            startYear: item.startYear ? Number(item.startYear) : null,
            endYear: item.endYear ? Number(item.endYear) : null,
          })),
        }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        setSaveStatus({ busy: false, error: result?.error || "We couldn't save your changes. Please check the fields and try again." });
        return;
      }
      setProfile((current) => ({ ...current, career, education }));
      }
      if (panel === "privacy") {
        const response = await fetch("/api/privacy", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          profileVisibility:
            privacy.visibility === "Network only"
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
  const toggle = (on: boolean, action: () => void, label: string) => (
    <button
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
        "Help useful people understand what you bring.",
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
                Profession
                <input
                  value={profile.profession}
                  onChange={(e) =>
                    setProfile({ ...profile, profession: e.target.value })
                  }
                />
              </label>
              <label className="full">
                Professional headline
                <input
                  value={profile.headline}
                  onChange={(e) =>
                    setProfile({ ...profile, headline: e.target.value })
                  }
                />
              </label>
              <label htmlFor="profile-industry">
                Industry
                <FreeChoiceInput
                  id="profile-industry"
                  value={profile.industry}
                  onChange={(industry) => setProfile({ ...profile, industry })}
                  options={PROJECT_INDUSTRIES}
                  placeholder="Type or choose an industry"
                />
              </label>
              <label>
                City
                <input
                  value={profile.city}
                  onChange={(e) =>
                    setProfile({ ...profile, city: e.target.value })
                  }
                />
              </label>
              <label>
                Country
                <input
                  value={profile.country}
                  onChange={(e) =>
                    setProfile({ ...profile, country: e.target.value })
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
                "High-quality people and project suggestions",
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
              <select
                aria-label="Email digest frequency"
                value={notifications.digest}
                onChange={(e) =>
                  setNotifications({ ...notifications, digest: e.target.value })
                }
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="never">Never</option>
              </select>
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
              <a href="/api/integrations/google/connect">Connect</a>
            </div>
            <div className="connection-setting">
              <span className="calendar-brand microsoft">M</span>
              <span>
                <strong>Microsoft Outlook & Teams</strong>
                <small>Not connected</small>
              </span>
              <a href="/api/integrations/microsoft/connect">Connect</a>
            </div>
            <label className="select-setting spaced">
              <span>
                <strong>Default calendar</strong>
                <small>New n2 meets will be added here.</small>
              </span>
              <select
                aria-label="Default calendar"
                value={calendarPrefs.defaultCalendar}
                onChange={(e) =>
                  setCalendarPrefs({
                    ...calendarPrefs,
                    defaultCalendar: e.target.value,
                  })
                }
              >
                <option>Google Calendar</option>
                <option>Microsoft Outlook</option>
                <option>Ask each time</option>
              </select>
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
              <select
                aria-label="Profile visibility"
                value={privacy.visibility}
                onChange={(e) =>
                  setPrivacy({ ...privacy, visibility: e.target.value })
                }
              >
                <option>Network only</option>
                <option>Connections only</option>
                <option>Private</option>
              </select>
            </label>
            {[
              [
                "Appear in search",
                "Let members find you by name, skill and industry",
                "searchable",
              ],
              [
                "Show interests",
                "Use interests to make useful connections visible",
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
              <select
                aria-label="Message permissions"
                value={privacy.messages}
                onChange={(e) =>
                  setPrivacy({ ...privacy, messages: e.target.value })
                }
              >
                <option>Connections and project members</option>
                <option>Connections only</option>
                <option>No one</option>
              </select>
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
              <select aria-label="Colour theme" value={accessibility.colourTheme} onChange={(e) => setAccessibility({ ...accessibility, colourTheme: e.target.value as AccessibilityPreferences["colourTheme"] })}>
                <option value="system">Use device setting</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <label className="select-setting">
              <span>
                <strong>Text size</strong>
                <small>Increase interface text without relying on browser zoom.</small>
              </span>
              <select aria-label="Text size" value={accessibility.textSize} onChange={(e) => setAccessibility({ ...accessibility, textSize: e.target.value as AccessibilityPreferences["textSize"] })}>
                <option value="default">Default (100%)</option>
                <option value="large">Large (112%)</option>
                <option value="extra-large">Extra large (125%)</option>
              </select>
            </label>
            <label className="select-setting">
              <span>
                <strong>Contrast</strong>
                <small>Strengthen text, borders and interactive controls.</small>
              </span>
              <select aria-label="Contrast" value={accessibility.contrast} onChange={(e) => setAccessibility({ ...accessibility, contrast: e.target.value as AccessibilityPreferences["contrast"] })}>
                <option value="standard">Standard</option>
                <option value="high">High contrast</option>
              </select>
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
              <select aria-label="Animation and motion" value={accessibility.motion} onChange={(e) => setAccessibility({ ...accessibility, motion: e.target.value as AccessibilityPreferences["motion"] })}>
                <option value="system">Use device setting</option>
                <option value="reduced">Reduce motion</option>
              </select>
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
          </div>
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
                Use skills, interests and activity to find relevant projects.
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
                Let project owners know you’re open to relevant asks.
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
  const [editProfileRequested, setEditProfileRequested] = useState(false);
  const [postComposerOpen, setPostComposerOpen] = useState(false);
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
    kind?: "project" | "post";
  } | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [guestAuthMode, setGuestAuthMode] = useState<
    "register" | "signin" | null
  >(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [toast, setToast] = useState("");
  const [peopleSuggestions, setPeopleSuggestions] = useState<
      PeopleSuggestionRecord[]
    >([]),
    [peopleOpen, setPeopleOpen] = useState(false);
  const [contributionTarget, setContributionTarget] =
    useState<ContributionTarget | null>(null);
  const [currentMember, setCurrentMember] = useState<MemberPerson>({
    name: "nice 2 network",
    role: "Public network",
  });
  const [authenticated, setAuthenticated] = useState(false);
  const latestSystemMessage = useRef<string | null | false>(false);
  const deepLinkHandled = useRef(false);
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
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    if (!authenticated || deepLinkHandled.current) return;
    const params = new URLSearchParams(window.location.search), profileId = params.get("profile"), projectId = params.get("project"), roleId = params.get("role");
    if (profileId) {
      deepLinkHandled.current = true;
      setSelectedProfileId(profileId);
      setView("profile");
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
      if (mounted && navigator.onLine && document.visibilityState === "visible") {
        timer = window.setTimeout(poll, delay);
      }
    }

    async function poll() {
      if (
        !mounted ||
        inFlight ||
        !navigator.onLine ||
        document.visibilityState === "hidden"
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
        const message = (data.notifications ?? []).find(
          (item: NotificationRecord) => item.type === "message" && !item.readAt,
        ) as NotificationRecord | undefined;
        if (latestSystemMessage.current === false) {
          latestSystemMessage.current = message?.id ?? null;
          return;
        }
        if (!message || latestSystemMessage.current === message.id) return;
        latestSystemMessage.current = message.id;
        if (
          typeof Notification !== "undefined" &&
          Notification.permission === "granted" &&
          localStorage.getItem("n2-system-message-notifications") === "enabled"
        ) {
          const notice = new Notification(message.title, {
            body: message.body,
            icon: "/brand/nice-2-network-mark.svg",
            tag: `n2-message-${message.id}`,
          });
          notice.onclick = () => {
            window.focus();
            setView("messages");
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
    document.addEventListener("visibilitychange", resume);
    return () => {
      mounted = false;
      controller?.abort();
      window.clearTimeout(timer);
      window.removeEventListener("online", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [authenticated]);
  useEffect(() => {
    if (!authenticated) return;
    fetch("/api/people/suggestions?limit=3")
      .then((r) => (r.ok ? r.json() : { suggestions: [] }))
      .then((data) => setPeopleSuggestions(data.suggestions ?? []))
      .catch(() => undefined);
  }, [authenticated]);
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
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  function requireSignIn() {
    setGuestAuthMode("register");
  }
  function go(next: View) {
    if (!authenticated && next !== "feed") {
      requireSignIn();
      return;
    }
    setSelectedProjectId(null);
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
  return (
    <div
      className={`app-shell ${view === "network" && !selectedProjectId ? "network-shell" : ""}`}
    >
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div>
          <Logo onClick={() => go("feed")} />
          <nav>
            {nav.map((item) => {
              const Icon = item.icon;
              const isProfile = item.id === "profile";
              return (
                <button
                  key={item.id}
                  className={view === item.id ? "active" : ""}
                  onClick={() => isProfile ? openOwnProfile() : go(item.id)}
                >
                  {isProfile && authenticated
                    ? <Avatar person={currentMember} size="sm" />
                    : <Icon size={20} />}
                  <span>{item.label}</span>
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
                <a className="admin-nav-link admin-profile-slot" href="/admin">
                  <ShieldCheck size={20} />
                  <span>Admin console</span>
                  <N2AdminBadge />
                </a>
              )}
            </>
          ) : (
            <div className="public-sidebar-auth">
              <p>Have a skill, idea or useful introduction?</p>
              <a href="/signin">Sign in</a>
              <a className="join" href="/signin?mode=register">
                Join n2
              </a>
            </div>
          )}
        </div>
      </aside>
      <main className="main-content" id="main-content" tabIndex={-1}>
        <button
          className="mobile-menu"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Open navigation"
        >
          {menuOpen ? <ArrowLeft /> : <Menu />}
        </button>
        {authenticated && view !== "feed" && (
          <button
            className="mobile-page-notification notification-button"
            onClick={() => setNotificationsOpen(true)}
            aria-label={
              unreadNotifications > 0
                ? `Open notifications, ${unreadNotifications} unread`
                : "Open notifications"
            }
          >
            {unreadNotifications > 0
              ? <b className="notification-count" aria-hidden="true">{unreadNotifications > 9 ? "9+" : unreadNotifications}</b>
              : <Bell size={20} />}
          </button>
        )}
        <div className="content-column">
          {selectedProjectId ? (
            <ProjectDetailView
              projectId={selectedProjectId}
              onBack={() => {
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
                  authenticated={authenticated}
                  onRequireAuth={requireSignIn}
                  onCreate={() => setCreateOpen(true)}
                  onShareIdea={() => setPostComposerOpen(true)}
                  onMatch={() => setMatchOpen(true)}
                  onComments={(project) =>
                    authenticated ? setCommentProject(project) : requireSignIn()
                  }
                  onPostThread={setThreadPost}
                  onProfile={openProfile}
                  onProject={() => go("projects")}
                  onShare={setShareProject}
                  onToast={setToast}
                  onNotifications={() => setNotificationsOpen(true)}
                  unread={unreadNotifications}
                />
              )}
              {authenticated && view === "projects" && (
                <ProjectsView
                  onCreate={() => setCreateOpen(true)}
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
                <MessagesView currentMember={currentMember} />
              )}
              {authenticated && view === "meet" && <MeetView />}
              {authenticated && view === "profile" && (
                <ProfileView
                  key={selectedProfileId ?? currentMember.id ?? "self"}
                  member={currentMember}
                  userId={selectedProfileId ?? currentMember.id}
                  onEdit={() => {
                    setEditProfileRequested(true);
                    go("settings");
                  }}
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
              onClick={() =>
                authenticated ? setNotificationsOpen(true) : requireSignIn()
              }
              aria-label={authenticated && unreadNotifications > 0 ? `Open notifications, ${unreadNotifications} unread` : "Open notifications"}
            >
              {authenticated && unreadNotifications > 0
                ? <b className="notification-count" aria-hidden="true">{unreadNotifications > 9 ? "9+" : unreadNotifications}</b>
                : <Bell size={19} />}
            </button>
          </div>
          {!authenticated && (
            <div className="public-rail-auth">
              <a href="/signin">Sign in</a>
              <a href="/signin?mode=register">Join n2</a>
            </div>
          )}
          {authenticated && (
            <section className="rail-card">
              <div className="rail-title">
                <span>PEOPLE TO KNOW</span>
                <button onClick={() => setPeopleOpen(true)}>See all</button>
              </div>
              {peopleSuggestions.map((item) => (
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
                    onClick={async () => {
                      const response = await fetch(
                          `/api/users/${item.id}/follow`,
                          { method: "POST" },
                        ),
                        result = await response.json();
                      if (response.ok) {
                        signalNetworkChanged();
                        setPeopleSuggestions((rows) =>
                          rows.filter((row) => row.id !== item.id),
                        );
                        setToast(
                          result.mutual
                            ? `You and ${item.name} are now mutually connected.`
                            : `You’re now following ${item.name}.`,
                        );
                      } else
                        setToast(
                          result.error ?? "Could not follow this member.",
                        );
                    }}
                  >
                    <Plus size={17} />
                  </button>
                </div>
              ))}
              {!peopleSuggestions.length && (
                <p className="people-cold-start">
                  Useful live members will appear as the network grows.
                </p>
              )}
            </section>
          )}
          <NetworkPulse onProjects={() => go("projects")} />
          <footer>
            <Logo />
            <p>Useful people, brought together.</p>
            <div>
              <a href="/about">About</a>
              <a href="/privacy">Privacy</a>
              <a href="/terms">Terms</a>
              <a href="/community">Community</a>
              <button className="rail-help-link" onClick={() => setHelpOpen(true)}>
                <CircleHelp size={10} />
                <span>Help</span>
              </button>
            </div>
            <small>© 2026 nice 2 network · Built in partnership with IntAillium</small>
          </footer>
        </aside>
      )}
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {nav.map((item) => {
            const Icon = item.icon;
            const isProfile = item.id === "profile";
            return (
              <button
                key={item.id}
                className={view === item.id ? "active" : ""}
                onClick={() => isProfile ? openOwnProfile() : go(item.id)}
              >
                {isProfile && authenticated
                  ? <Avatar person={currentMember} size="sm" />
                  : <Icon size={21} />}
                <span>{item.label}</span>
              </button>
            );
          })}
      </nav>
      {authenticated && createOpen && (
        <CreateProject
          currentMember={currentMember}
          onClose={() => setCreateOpen(false)}
          onPublish={(project) => {
            setLatestProject(project);
            setToast("Project published — useful matches are being notified.");
            go("projects");
          }}
        />
      )}
      {authenticated && postComposerOpen && (
        <PostComposer
          currentMember={currentMember}
          onClose={() => setPostComposerOpen(false)}
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
      {authenticated && notificationsOpen && (
        <NotificationPanel
          onClose={() => setNotificationsOpen(false)}
          onUnread={setUnreadNotifications}
        />
      )}
      {helpOpen && (
        <HelpPanel onClose={() => setHelpOpen(false)} onNavigate={go} />
      )}
      {!authenticated && guestAuthMode && (
        <GuestAuthPrompt
          initialMode={guestAuthMode}
          onClose={() => setGuestAuthMode(null)}
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
      {toast && (
        <div className="toast">
          <Check size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}
