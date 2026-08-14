/* eslint-disable no-empty, @next/next/no-img-element, jsx-a11y/media-has-caption, jsx-a11y/no-autofocus, react-hooks/set-state-in-effect, react-hooks/immutability */
"use client";

import {
  ArrowLeft,
  ArrowUpRight,
  Bell,
  Bold,
  Bookmark,
  BriefcaseBusiness,
  CalendarDays,
  CheckCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CircleHelp,
  CircleAlert,
  Circle,
  Clock3,
  Ellipsis,
  Eye,
  Image as ImageIcon,
  Italic,
  GraduationCap,
  Globe2,
  Home,
  Lightbulb,
  Link2,
  Mail,
  Paperclip,
  LogOut,
  MapPin,
  Mic,
  Menu,
  MessageCircle,
  Pencil,
  Pin,
  Plus,
  Repeat2,
  Search,
  Send,
  Share2,
  SmilePlus,
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
  X,
} from "lucide-react";
import { FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import PasswordInput from "@/components/password-input";
import EmojiPicker from "@/components/emoji-picker";
import { sanitizeRichText } from "@/lib/rich-text";

type View =
  | "feed"
  | "projects"
  | "network"
  | "messages"
  | "meet"
  | "profile"
  | "settings";
type MemberPerson = {
  id?: string;
  name: string;
  role: string;
  img?: string | null;
  isN2Admin?: boolean;
};
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
type NotificationRecord = {
  id: string;
  type: string;
  title: string;
  body: string;
  href?: string | null;
  readAt?: string | null;
  createdAt: string;
  actorName?: string | null;
  actorImage?: string | null;
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
    fetch(`/api/link-preview?url=${encodeURIComponent(target)}`, {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setPreview(data))
      .catch(() => undefined);
    return () => controller.abort();
  }, [target]);
  if (!target || !preview) return null;
  return (
    <a className="rich-link-preview" href={preview.url} target="_blank" rel="noreferrer">
      {preview.image && <img src={preview.image} alt="" />}
      <span>
        <small>{preview.siteName || preview.domain}</small>
        <strong>{preview.title}</strong>
        {preview.description && <p>{preview.description}</p>}
        <em>{preview.domain} <ArrowUpRight size={11} /></em>
      </span>
    </a>
  );
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

function RichTextEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
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
        ref={editorRef}
        className="rich-text-editor"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
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
  { id: "projects" as View, label: "Projects", icon: BriefcaseBusiness },
  { id: "network" as View, label: "Networks", icon: NetworkGraphIcon },
  { id: "messages" as View, label: "Messages", icon: MessageCircle },
  { id: "meet" as View, label: "Meet", icon: CalendarDays },
];

function Avatar({
  person,
  size = "md",
  ring = false,
}: {
  person: MemberPerson;
  size?: "sm" | "md" | "lg" | "xl";
  ring?: boolean;
}) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      className={`avatar avatar-${size} ${ring ? "avatar-ring" : ""}`}
      src={person.img || "/brand/nice-2-network-mark.svg"}
      alt={person.img ? person.name : `${person.name} — default n2 avatar`}
    />
  );
}

function N2AdminBadge() {
  return (
    <span className="n2-admin-badge" aria-label="Official n2 administrator">
      <b>n2</b> ADMIN
    </span>
  );
}
function N2FounderLabel() {
  return <span className="n2-founder-label">n2 Founder</span>;
}
function DemoBadge() {
  return (
    <span
      className="demo-badge"
      title="Faux content that will be removed before launch"
    >
      DEMO
    </span>
  );
}

function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <button className="logo" aria-label="Nice 2 Network home" onClick={onClick}>
      <span className="logo-mark">n2</span>
      <span>nice 2 network</span>
    </button>
  );
}

function N2Mark({ inverse = false }: { inverse?: boolean }) {
  return (
    <span
      className={`n2-ai-mark ${inverse ? "inverse" : ""}`}
      aria-label="n2 intelligence"
    >
      n2
    </span>
  );
}

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

function LegacyProjectMenu({
  project,
  onChanged,
  onToast,
}: {
  project: ProjectRecord;
  onChanged?: (project: ProjectRecord | null) => void;
  onToast?: (message: string) => void;
}) {
  const [open, setOpen] = useState(false),
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
  async function getInvolved() {
    const message = window.prompt(
      "Tell the project owner how you would like to contribute",
    );
    if (!message) return;
    const services =
      window
        .prompt("Skills or services you can offer (comma separated)", "")
        ?.split(",")
        .map((value) => value.trim())
        .filter(Boolean) ?? [];
    const response = await fetch(`/api/projects/${project.id}/involvement`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, services }),
      }),
      result = await response.json();
    onToast?.(result.message ?? result.error ?? "Could not send your offer.");
    setOpen(false);
  }
  async function leaveProject() {
    if (!window.confirm(`Leave ${project.title}?`)) return;
    const response = await fetch(`/api/projects/${project.id}/leave`, {
        method: "DELETE",
      }),
      result = await response.json();
    if (response.ok) {
      onChanged?.({ ...project, isMember: false });
      onToast?.("You left the project.");
    } else onToast?.(result.error ?? "Could not leave this project.");
    setOpen(false);
  }
  async function preference(action: "pin" | "bookmark") {
    const response = await fetch(`/api/projects/${project.id}/preferences`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const result = await response.json();
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
  async function edit() {
    const title = window.prompt("Project title", project.title);
    if (!title) return;
    const summary = window.prompt("Project summary", project.summary);
    if (!summary) return;
    const stage = window
      .prompt(
        "Project stage: idea, planning, building or launching",
        project.stage,
      )
      ?.trim()
      .toLowerCase();
    if (!stage) return;
    const allowed = ["idea", "planning", "building", "launching"];
    if (!allowed.includes(stage)) {
      onToast?.("Choose idea, planning, building or launching.");
      return;
    }
    const response = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, summary, stage }),
    });
    const result = await response.json();
    if (response.ok) {
      onChanged?.({ ...project, ...result.project });
      onToast?.("Project updated.");
    } else onToast?.(result.error ?? "Could not update this project.");
    setOpen(false);
  }
  async function visibility() {
    const next = project.visibility === "private" ? "network" : "private";
    const response = await fetch(`/api/projects/${project.id}`, {
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
  async function remove() {
    if (
      !window.confirm(
        "Delete this project? It will be removed from the network.",
      )
    )
      return;
    const response = await fetch(`/api/projects/${project.id}`, {
      method: "DELETE",
    });
    if (response.ok) {
      onChanged?.(null);
      onToast?.("Project deleted.");
    }
    setOpen(false);
  }
  return (
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
            <button onClick={getInvolved}>
              <UserPlus size={15} />
              Get involved
            </button>
          )}
          {project.isMember && !project.isOwner && (
            <button className="danger" onClick={leaveProject}>
              <LogOut size={15} />
              Leave project
            </button>
          )}
          {project.isOwner && (
            <>
              <hr />
              <button onClick={edit}>
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
              <button className="danger" onClick={remove}>
                <Trash2 size={15} />
                Delete project
              </button>
            </>
          )}
        </div>
      )}
    </div>
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
  const [step, setStep] = useState(0);
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
    [error, setError] = useState("");
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
          <span>{step === 0 ? "New project" : "Review your team map"}</span>
          <span className="step-count">{step + 1}/2</span>
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
              <label>
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
              onClick={publish}
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
  async function report() {
    const reason = window.prompt(
      "Why are you reporting this post? Enter spam, harassment, fraud, misinformation, privacy, or other.",
      "spam",
    );
    if (!reason) return;
    const allowed = [
        "spam",
        "harassment",
        "fraud",
        "misinformation",
        "privacy",
        "other",
      ],
      selected = allowed.includes(reason.toLowerCase())
        ? reason.toLowerCase()
        : "other";
    const response = await fetch("/api/moderation/reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        targetType: "post",
        targetId: post.id,
        reason: selected,
        details: selected === "other" ? reason : undefined,
      }),
    });
    onToast(
      response.ok
        ? "Post reported to the n2 team."
        : "Could not submit the report.",
    );
    setMenuOpen(false);
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
                  <button onClick={report}>
                    <ShieldCheck size={15} />
                    Report post
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </header>
      <p
        className="post-thread-trigger"
        role="button"
        tabIndex={0}
        onClick={onThread}
        onKeyDown={(event) =>
          (event.key === "Enter" || event.key === " ") && onThread()
        }
      >
        <LinkifiedText text={post.body} />
      </p>
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
    id: "loading",
    kind: "connections",
    label: "NETWORK ACTIVITY",
    value: "—",
    title: "Reading the network pulse…",
    detail: "Live activity will appear here",
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
  function projectQuery(cursor?: string) {
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
  }
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
  }, [filter, authenticated, projectFilters]);
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
          >
            <Bell size={20} />
            {authenticated && unread > 0 && <b>{unread > 9 ? "9+" : unread}</b>}
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
          <SlidersHorizontal size={14} /> Filters
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

function LegacyRoadmapPanel({
  project,
  setProject,
  onToast,
}: {
  project: ProjectDetailRecord;
  setProject: (project: ProjectDetailRecord) => void;
  onToast: (message: string) => void;
}) {
  async function refresh() {
    const response = await fetch(`/api/projects/${project.id}`),
      data = await response.json();
    if (response.ok) setProject(data.project);
  }
  async function action(
    item: ProjectDetailRecord["milestones"][number],
    next:
      | "edit"
      | "start"
      | "block"
      | "complete"
      | "reopen"
      | "move_up"
      | "move_down",
  ) {
    let payload: Record<string, unknown> = { action: next };
    if (next === "edit") {
      const title = window.prompt("Roadmap step title", item.title);
      if (!title) return;
      payload = {
        ...payload,
        title,
        description:
          window.prompt("Description", item.description ?? "") ??
          item.description,
        dueAt: item.dueAt,
      };
    }
    if (next === "block") {
      const summary = window.prompt("Explain what is blocking this step");
      if (!summary) return;
      payload.summary = summary;
    }
    if (next === "complete") {
      const summary = window.prompt(
        "Summarise what was completed and the contribution made",
      );
      if (!summary) return;
      payload.summary = summary;
      const stage = window.prompt(
        "Headline project stage after this step: idea, planning, building or launching. Leave blank to keep it unchanged.",
        project.stage,
      );
      if (
        stage &&
        ["idea", "planning", "building", "launching"].includes(stage)
      )
        payload.projectStage = stage;
    }
    const response = await fetch(`/api/milestones/${item.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }),
      data = await response.json();
    if (!response.ok) {
      onToast(data.error ?? "Could not update this roadmap step.");
      return;
    }
    onToast(
      next === "complete"
        ? "Step completed and the next step is now active."
        : "Roadmap updated.",
    );
    await refresh();
  }
  async function add() {
    const title = window.prompt("New roadmap step title");
    if (!title) return;
    const description = window.prompt("What should this step achieve?") ?? "";
    const response = await fetch(`/api/projects/${project.id}/milestones`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, description, phase: "later" }),
      }),
      data = await response.json();
    if (!response.ok) {
      onToast(data.error ?? "Could not add the roadmap step.");
      return;
    }
    await refresh();
  }
  async function remove(item: ProjectDetailRecord["milestones"][number]) {
    if (!window.confirm(`Remove “${item.title}”?`)) return;
    const response = await fetch(`/api/milestones/${item.id}`, {
        method: "DELETE",
      }),
      data = await response.json();
    if (!response.ok) {
      onToast(data.error ?? "Could not remove this step.");
      return;
    }
    await refresh();
  }
  return (
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
          <button className="secondary-button" onClick={add}>
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
                    {linked.length} contribution{linked.length === 1 ? "" : "s"}
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
                  <button onClick={() => action(item, "edit")}>Edit</button>
                  <button
                    disabled={index === 0}
                    onClick={() => action(item, "move_up")}
                  >
                    ↑
                  </button>
                  <button
                    disabled={index === project.milestones.length - 1}
                    onClick={() => action(item, "move_down")}
                  >
                    ↓
                  </button>
                  {item.status === "planned" && (
                    <button onClick={() => action(item, "start")}>Start</button>
                  )}
                  {item.status === "in_progress" && (
                    <>
                      <button onClick={() => action(item, "block")}>
                        Block
                      </button>
                      <button onClick={() => action(item, "complete")}>
                        Complete step
                      </button>
                    </>
                  )}
                  {item.status === "blocked" && (
                    <button onClick={() => action(item, "complete")}>
                      Resolve & complete
                    </button>
                  )}
                  {item.status === "complete" && (
                    <button onClick={() => action(item, "reopen")}>
                      Reopen
                    </button>
                  )}
                  {item.status === "planned" && (
                    <button className="danger" onClick={() => remove(item)}>
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
    } | null>(null);
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
  async function edit(update: ProjectDetailRecord["updates"][number]) {
    const body = window.prompt("Edit project update", update.body);
    if (!body) return;
    const response = await fetch(`/api/project-updates/${update.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          body,
          type: update.type,
          milestoneId: update.milestoneId,
        }),
      }),
      data = await response.json();
    if (!response.ok) {
      onToast(data.error ?? "Could not edit this update.");
      return;
    }
    await refresh();
  }
  async function remove(update: ProjectDetailRecord["updates"][number]) {
    if (!window.confirm("Remove this project update?")) return;
    const response = await fetch(`/api/project-updates/${update.id}`, {
        method: "DELETE",
      }),
      data = await response.json();
    if (!response.ok) {
      onToast(data.error ?? "Could not remove this update.");
      return;
    }
    await refresh();
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
                  <button onClick={() => edit(update)}>Edit</button>
                  <button onClick={() => remove(update)}>Delete</button>
                </footer>
              )}
            </div>
          </article>
        ))}
        {!project.updates.length && (
          <p className="profile-empty">No project updates yet.</p>
        )}
      </div>
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
      "overview" | "team" | "roadmap" | "updates" | "funding"
    >("overview"),
    [fundingOpen, setFundingOpen] = useState(false),
    [fundingType, setFundingType] = useState<
      "invest" | "donate" | "contribute" | "share_request"
    >("contribute"),
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
      : 0;
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
        {(["overview", "team", "roadmap", "updates", "funding"] as const).map(
          (item) => (
            <button
              key={item}
              className={tab === item ? "active" : ""}
              onClick={() => setTab(item)}
            >
              {item}
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
        <section className="project-team-grid">
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
};
type NetworkEdgeRecord = { source: string; target: string; mutual: boolean };
const signalNetworkChanged = () =>
  window.dispatchEvent(new Event("n2:network-changed"));
const networkProfession = (
  person: Pick<NetworkNodeRecord, "profession" | "industry">,
) => {
  const value =
    `${person.profession ?? ""} ${person.industry ?? ""}`.toLowerCase();
  if (/financ|account|invest|bank/.test(value)) return "Finance";
  if (/tech|software|engineer|data|digital/.test(value)) return "Technology";
  if (/design|creative|brand|media|planner|architect/.test(value))
    return "Design & creative";
  if (/education|learning|teacher|programme/.test(value)) return "Education";
  if (/operation|community|food|hospitality|logistic|nonprofit/.test(value))
    return "Operations & community";
  return "Other";
};
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
  const [data, setData] = useState<{
      current: Record<string, unknown> | null;
      nodes: NetworkNodeRecord[];
      edges: NetworkEdgeRecord[];
    }>({ current: null, nodes: [], edges: [] }),
    [loading, setLoading] = useState(true),
    [profession, setProfession] = useState("All professions"),
    [skill, setSkill] = useState(""),
    [platformPeople, setPlatformPeople] = useState<
      Array<Record<string, unknown>>
    >([]),
    [platformSearching, setPlatformSearching] = useState(false),
    [mobileSearchOpen, setMobileSearchOpen] = useState(false),
    [selected, setSelected] = useState<NetworkNodeRecord | null>(null);
  useEffect(() => {
    const loadGraph = () => {
      setLoading(true);
      fetch("/api/network/graph", { cache: "no-store" })
      .then((response) =>
        response.ok ? response.json() : { current: null, nodes: [], edges: [] },
      )
      .then((next) => {
        setData(next);
        setSelected((current) =>
          current
            ? (next.nodes.find((node: NetworkNodeRecord) => node.id === current.id) ?? null)
            : null,
        );
      })
      .finally(() => setLoading(false));
    };
    loadGraph();
    window.addEventListener("n2:network-changed", loadGraph);
    return () => window.removeEventListener("n2:network-changed", loadGraph);
  }, []);
  useEffect(() => {
    const controller = new AbortController(),
      query = skill.trim(),
      timer = setTimeout(() => {
        if (query.length < 2) {
          setPlatformPeople([]);
          setPlatformSearching(false);
          return;
        }
        setPlatformSearching(true);
        fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        })
          .then((response) =>
            response.ok ? response.json() : { people: [] },
          )
          .then((result) => setPlatformPeople(result.people ?? []))
          .catch(() => undefined)
          .finally(() => setPlatformSearching(false));
      }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [skill]);
  const categories = [
      "All professions",
      ...Array.from(new Set(data.nodes.map(networkProfession))).sort(),
    ],
    query = skill.trim().toLowerCase(),
    nodes = data.nodes.filter(
      (node) =>
        (profession === "All professions" ||
          networkProfession(node) === profession) &&
        (!query ||
          [
            node.name,
            node.primary_skill,
            node.secondary_skill,
            node.tertiary_skill,
            node.profession,
          ].some((value) => value?.toLowerCase().includes(query))),
    ),
    positions = new Map(
      nodes.map((node, index) => {
        const angle =
            -Math.PI / 2 + (index / Math.max(1, nodes.length)) * Math.PI * 2,
          xRadius = nodes.length > 10 ? (index % 2 ? 43 : 34) : 40,
          yRadius = nodes.length > 10 ? (index % 2 ? 36 : 29) : 34;
        return [
          node.id,
          {
            x: 50 + Math.cos(angle) * xRadius,
            y: 43 + Math.sin(angle) * yRadius,
          },
        ];
      }),
    ),
    visible = new Set([
      currentMember.id ?? "",
      ...nodes.map((node) => node.id),
    ]),
    edges = data.edges.filter(
      (edge) => visible.has(edge.source) && visible.has(edge.target),
    );
  const point = (id: string) =>
    id === currentMember.id
      ? { x: 50, y: 43 }
      : (positions.get(id) ?? { x: 50, y: 43 });
  return (
    <div className="subpage network-page">
      <div className="network-page-heading">
        <div>
          <span className="eyebrow">YOUR NETWORK</span>
          <h1>Networks</h1>
          <p>Explore the people, professions and skills connected to you.</p>
        </div>
        <div className="network-count">
          <strong>{data.nodes.filter((node) => node.mutual).length}</strong>
          <span>mutual connections</span>
        </div>
      </div>
      <div className="network-workspace">
        <div className="network-canvas">
          <div className="network-legend">
            {categories.slice(1).map((category) => (
              <span key={category}>
                <i style={{ background: networkColour(category) }} />
                {category}
              </span>
            ))}
            <span className="line-key solid">Mutual</span>
            <span className="line-key dashed">One-way follow</span>
          </div>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {edges.map((edge, index) => {
              const a = point(edge.source),
                b = point(edge.target);
              return (
                <line
                  key={`${edge.source}-${edge.target}-${index}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  className={edge.mutual ? "mutual" : "following"}
                />
              );
            })}
          </svg>
          <button
            className="network-node network-self network-self-search"
            style={
              {
                left: "50%",
                top: "43%",
                "--node-colour": "#111",
              } as React.CSSProperties
            }
            onClick={() => setMobileSearchOpen((open) => !open)}
            aria-expanded={mobileSearchOpen}
            aria-label="Search your network"
          >
            <i className="network-self-search-icon"><Search size={28} /></i>
            <span>{currentMember.name}</span>
            <small>{mobileSearchOpen ? "Close search" : "Search your network"}</small>
          </button>
          <div className={`network-floating-tools ${mobileSearchOpen ? "search-open" : ""}`}>
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
          </div>
          {skill.trim().length >= 2 && (
            <section className="network-platform-results" aria-live="polite">
              <div>
                <span className="eyebrow">PEOPLE ACROSS N2</span>
                <small>
                  {platformSearching
                    ? "Searching…"
                    : `${platformPeople.length} found`}
                </small>
              </div>
              {!platformSearching && !platformPeople.length && (
                <p>No public or network-visible profiles match this search.</p>
              )}
              {platformPeople.map((person) => (
                <button
                  key={String(person.id)}
                  onClick={() => onProfile(String(person.id))}
                >
                  <Avatar
                    person={{
                      name: String(person.name ?? "n2 member"),
                      role: String(person.profession ?? "Member"),
                      img: person.image ? String(person.image) : null,
                    }}
                    size="md"
                  />
                  <span>
                    <strong>{String(person.name ?? "n2 member")}</strong>
                    <small>{String(person.profession ?? "n2 member")}</small>
                    <em>
                      {person.isMutual
                        ? "Mutual connection"
                        : person.isFollowing
                          ? "Following"
                          : "View profile"}
                    </em>
                  </span>
                  <ArrowUpRight size={16} />
                </button>
              ))}
            </section>
          )}
          {nodes.map((node) => {
            const position = positions.get(node.id)!,
              category = networkProfession(node);
            return (
              <button
                key={node.id}
                className={`network-node ${selected?.id === node.id ? "selected" : ""}`}
                style={
                  {
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                    "--node-colour": networkColour(category),
                  } as React.CSSProperties
                }
                onClick={() => setSelected(node)}
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
              </button>
            );
          })}
          {loading && (
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
            <aside className="network-brief">
              <button
                className="network-brief-close"
                onClick={() => setSelected(null)}
              >
                <X size={15} />
              </button>
              <Avatar
                person={{
                  name: selected.name ?? "n2 member",
                  role: selected.profession ?? "Member",
                  img: selected.image,
                }}
                size="lg"
                ring
              />
              <span className="network-connection-state">
                {selected.mutual
                  ? "Mutual connection"
                  : selected.is_following
                    ? "You follow this member"
                    : "Follows you"}
              </span>
              <h2>{selected.name}</h2>
              <p className="network-brief-role">
                {selected.profession ?? "n2 member"}
                {selected.location ? ` · ${selected.location}` : ""}
              </p>
              <p>
                {selected.bio ??
                  "Open their profile to learn more about the contribution they make."}
              </p>
              <div className="network-skill-list">
                {[
                  selected.primary_skill,
                  selected.secondary_skill,
                  selected.tertiary_skill,
                ]
                  .filter(Boolean)
                  .map((value) => (
                    <span key={value!}>{value}</span>
                  ))}
              </div>
              <button
                className="primary-button wide"
                onClick={() => onProfile(selected.id)}
              >
                View full profile <ArrowUpRight size={15} />
              </button>
            </aside>
          )}
        </div>
      </div>
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
    [conversationError, setConversationError] = useState("");
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
    if (!selected || (!draft.trim() && !attachment && type === "message"))
      return;
    const response = await fetch(`/api/conversations/${selected.id}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        body: draft,
        attachmentType: attachment?.type,
        attachmentUrl: attachment?.url,
        type,
      }),
    });
    if (response.ok) {
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
  async function editMessage(message: ChatMessage) {
    const body = window.prompt("Edit message", message.body);
    if (!body) return;
    const response = await fetch(`/api/messages/${message.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (response.ok)
      setMessagesList((rows) =>
        rows.map((row) =>
          row.id === message.id
            ? { ...row, body, editedAt: new Date().toISOString() }
            : row,
        ),
      );
  }
  async function deleteMessage(message: ChatMessage) {
    if (!window.confirm("Delete this message?")) return;
    const response = await fetch(`/api/messages/${message.id}`, {
      method: "DELETE",
    });
    if (response.ok)
      setMessagesList((rows) =>
        rows.map((row) =>
          row.id === message.id
            ? {
                ...row,
                body: "Message deleted",
                status: "deleted",
                attachmentUrl: null,
              }
            : row,
        ),
      );
  }
  if (selected) {
    const status = typingNames.length
      ? `${typingNames.join(", ")} ${typingNames.length === 1 ? "is" : "are"} typing…`
      : selected.members.length > 2
        ? `${selected.members.length} members`
        : "Direct conversation";
    return (
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
          <button className="secondary-button" onClick={startCall}>
            <Video size={15} />{" "}
            {selected.members.length > 2 ? "Start meet" : "Video call"}
          </button>
        </div>
        <div className="chat-flow">
          <div className="chat-date">CONVERSATION</div>
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
              {message.editedAt && <small>edited</small>}
              {message.senderId === currentMember.id &&
                message.status !== "deleted" && (
                  <div className="message-actions">
                    <button onClick={() => editMessage(message)}>Edit</button>
                    <button onClick={() => deleteMessage(message)}>
                      Delete
                    </button>
                  </div>
                )}
            </div>
          ))}
        </div>
        <div className="chat-extra-actions">
          <button onClick={() => send("nudge")}>
            <span className="emoji-glyph">👋</span> Nudge for a response
          </button>
          <button onClick={() => conversationAction("delete")}>
            <Trash2 size={13} /> Delete chat
          </button>
        </div>
        {attachment && (
          <div className="chat-attachment">
            <span>{attachment.type} ready</span>
            <button onClick={() => setAttachment(null)}>
              <X size={13} />
            </button>
          </div>
        )}
        <form
          className="chat-composer"
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
        >
          <EmojiPicker
            onSelect={(emoji) => setDraft((value) => `${value}${emoji}`)}
          />
          <label title="Add image">
            <ImageIcon size={17} />
            <input
              type="file"
              accept="image/*"
              onChange={(event) => attach(event.target.files?.[0])}
            />
          </label>
          <label title="Add video">
            <Video size={17} />
            <input
              type="file"
              accept="video/*"
              onChange={(event) => attach(event.target.files?.[0])}
            />
          </label>
          <label title="Add file">
            <Paperclip size={17} />
            <input
              type="file"
              accept=".pdf,.zip,.doc,.docx"
              onChange={(event) => attach(event.target.files?.[0])}
            />
          </label>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={`Message ${title(selected)}…`}
          />
          <button aria-label="Send message">
            <Send size={17} />
          </button>
        </form>
      </div>
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
    [meetLocation, setMeetLocation] = useState(""),
    [meetThumbnail, setMeetThumbnail] = useState<string | null>(null);
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
    setMeetLocation("");
    setMeetThumbnail(null);
    setError("");
    setCreate(true);
  }
  function openEdit(meet: MeetingRecord) {
    setCreate(false);
    setEditing(meet);
    setInvitees((meet.participantProfiles ?? []).map(person => ({
      id: person.id,
      name: person.name,
      image: person.image,
      profession: person.profession,
      group: person.group ?? "public",
      relationship: person.relationship ?? "Invited",
      podcastRole: person.role ?? "listener",
    })));
    setMeetMode(meet.mode ?? (meet.provider === "in_person" ? "in_person" : "video"));
    setMeetVisibility(meet.visibility ?? "public");
    setMeetProjectId(meet.projectId ?? "");
    setMeetStep(1);
    setMeetLocation(meet.location ?? "");
    setMeetThumbnail(meet.thumbnailUrl ?? null);
    setDetail(null);
    setError("");
  }
  function closeEditor() {
    setCreate(false);
    setEditing(null);
    setInvitees([]);
    setMeetStep(1);
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
    setDetail(next);
    setMeets((rows) => rows.map((row) => (row.id === meet.id ? next : row)));
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
    today = new Date();
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
        <span>{meets.length} meets</span>
      </div>
      {meets.length ? (
        meets.map((meet) => {
          const start = new Date(meet.startsAt),
            minutes = Math.round(
              (new Date(meet.endsAt).getTime() - start.getTime()) / 60000,
            ),
            joinOpensAt = start.getTime() - 15 * 60_000,
            canJoin = Boolean(clockNow) && clockNow >= joinOpensAt && clockNow <= new Date(meet.endsAt).getTime(),
            isFuture = Boolean(clockNow) && clockNow < joinOpensAt;
          return (
            <div className="meet-card" key={meet.id}>
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
                      <input name="title" required minLength={3} defaultValue={editing?.title ?? ""} placeholder="Give this meet a clear name" />
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
                <div className="meet-step-summary">{meetThumbnail ? <img src={meetThumbnail} alt="" /> : <span>{meetMode === "audio" ? <Mic size={20}/> : meetMode === "in_person" ? <MapPin size={20}/> : <Video size={20}/>}</span>}<div><span className="eyebrow">{meetMode === "audio" ? "PODCAST" : meetMode === "in_person" ? "IN PERSON" : "VIDEO MEET"}</span><strong>{(meetFormRef.current?.elements.namedItem("title") as HTMLInputElement | null)?.value || editing?.title || "Untitled meet"}</strong><small>{meetVisibility === "project" ? "Project visibility" : `${meetVisibility[0].toUpperCase()}${meetVisibility.slice(1)} visibility`}{meetLocation ? ` · ${meetLocation}` : ""}</small></div><button type="button" onClick={() => setMeetStep(1)}>Edit details</button></div>
                <MeetAttendeePicker selected={invitees} onChange={setInvitees} max={meetMode === "video" ? 7 : meetMode === "audio" ? 15 : 100} podcast={meetMode === "audio"} />
                {error && <p className="form-error">{error}</p>}
              </section>
            </div>
            <footer className="meet-flow-footer">
              <p>{meetStep === 1 ? "Add the essentials now. Invitees come next." : `${invitees.length} ${invitees.length === 1 ? "person" : "people"} selected`}</p>
              <div>
                {meetStep === 2 && <button type="button" className="secondary-button" onClick={() => setMeetStep(1)}><ArrowLeft size={16}/> Back</button>}
                {meetStep === 1 ? <button type="button" className="primary-button" onClick={continueMeetSetup}>Continue to invites <ChevronRight size={16}/></button> : <button className="primary-button">{editing ? "Save changes" : "Create meet"}</button>}
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
    </div>
  );
}

function LegacyProfileView({
  member,
  userId,
  onEdit,
}: {
  member: MemberPerson;
  userId?: string | null;
  onEdit: () => void;
}) {
  const [profile, setProfile] = useState<ProfileRecord | null>(null),
    [loading, setLoading] = useState(Boolean(userId)),
    [section, setSection] = useState<
      "profile" | "projects" | "media" | "bookmarks"
    >("profile"),
    [media, setMedia] = useState<
      Array<{
        id: string;
        body: string;
        attachmentType: string | null;
        attachmentUrl: string | null;
        videoUrl: string | null;
        createdAt: string;
      }>
    >([]),
    [saved, setSaved] = useState<
      Array<{
        id: string;
        entityType: string;
        entityId: string;
        pinned: boolean;
        bookmarked: boolean;
        details: Record<string, unknown>;
      }>
    >([]);
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/profiles/${userId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setProfile(data?.profile ?? null))
      .finally(() => setLoading(false));
  }, [userId]);
  useEffect(() => {
    if (!userId || section === "profile" || section === "projects") return;
    if (section === "media")
      fetch(`/api/profiles/${userId}/media`)
        .then((r) => (r.ok ? r.json() : { media: [] }))
        .then((data) => setMedia(data.media ?? []));
    else if (profile?.isCurrent)
      fetch("/api/saved-items")
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((data) => setSaved(data.items ?? []));
  }, [section, userId, profile?.isCurrent]);
  if (loading)
    return (
      <div className="profile-loading">
        <span />
        <p>Loading member profile…</p>
      </div>
    );
  const person: MemberPerson = profile
    ? {
        id: profile.id,
        name: profile.name ?? "n2 member",
        role: profile.headline ?? profile.profession ?? "n2 member",
        img: profile.image,
        isN2Admin: profile.isN2Admin,
      }
    : member;
  const skills = profile?.rankedSkills?.slice(0, 3) ?? [
    "Collaboration",
    "Strategy",
    "Projects",
  ];
  async function toggleFollow() {
    if (!profile || profile.isCurrent) return;
    if (
      profile.isFollowing &&
      !window.confirm(`Stop following ${profile.name ?? "this member"}?`)
    )
      return;
    const response = await fetch(`/api/users/${profile.id}/follow`, {
        method: profile.isFollowing ? "DELETE" : "POST",
      }),
      result = await response.json();
    if (response.ok) {
      signalNetworkChanged();
      setProfile({
        ...profile,
        isFollowing: result.following,
        isMutual: result.mutual,
        followers: Math.max(0, profile.followers + (result.following ? 1 : -1)),
      });
    }
  }
  return (
    <div className="subpage profile-page">
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
          className="secondary-button"
          onClick={profile?.isCurrent ? onEdit : undefined}
        >
          {profile?.isCurrent !== false ? "Edit profile" : "Connect"}
        </button>
        <h1>
          {person.name} {person.isN2Admin && <N2AdminBadge />}
        </h1>
        <p className="profile-role">
          {person.role}
          {profile?.location ? ` · ${profile.location}` : ""}
        </p>
        <nav className="profile-tabs">
          <button
            className={section === "profile" ? "active" : ""}
            onClick={() => setSection("profile")}
          >
            Profile
          </button>
          <button
            className={section === "projects" ? "active" : ""}
            onClick={() => setSection("projects")}
          >
            Projects
          </button>
          <button
            className={section === "media" ? "active" : ""}
            onClick={() => setSection("media")}
          >
            Media
          </button>
          {profile?.isCurrent && (
            <button
              className={section === "bookmarks" ? "active" : ""}
              onClick={() => setSection("bookmarks")}
            >
              <Bookmark size={14} /> Bookmarks
            </button>
          )}
        </nav>
        {section === "projects" ? (
          <section className="profile-library">
            <div className="profile-section-head">
              <span className="eyebrow">PROJECT HISTORY</span>
              <small>
                Projects{" "}
                {profile?.isCurrent ? "you have" : person.name + " has"} started
                or contributed to
              </small>
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
            <div className="profile-section-head">
              <span className="eyebrow">MEDIA</span>
              <small>
                Images and videos shared by{" "}
                {profile?.isCurrent ? "you" : person.name}
              </small>
            </div>
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
                ) : item.videoUrl ? (
                  <article key={item.id} className="media-link">
                    <Video size={24} />
                    <a href={item.videoUrl} target="_blank" rel="noreferrer">
                      {item.body || "Open shared video"}
                    </a>
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
            <div className="profile-section-head">
              <span className="eyebrow">BOOKMARKS</span>
              <small>
                {saved.filter((item) => item.pinned).length}/3 items pinned
              </small>
            </div>
            <div className="saved-list">
              {saved.map((item) => (
                <article key={item.id}>
                  <span className="saved-kind">{item.entityType}</span>
                  <div>
                    <strong>
                      {String(
                        item.details.title ??
                          item.details.projectTitle ??
                          "Saved comment",
                      )}
                    </strong>
                    <p>
                      {String(
                        item.details.summary ??
                          item.details.body ??
                          (item.details.startsAt
                            ? new Date(
                                String(item.details.startsAt),
                              ).toLocaleString()
                            : "Saved for later"),
                      )}
                    </p>
                  </div>
                  {item.pinned && <Pin size={15} />}
                </article>
              ))}
              {!saved.length && (
                <p className="profile-empty">
                  Your bookmarked projects, comments and meets will appear here.
                </p>
              )}
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
            <section className="profile-section">
              <div className="profile-section-head">
                <span className="eyebrow">CAREER HISTORY</span>
                <BriefcaseBusiness size={16} />
              </div>
              <div className="timeline-list">
                {profile?.career.length ? (
                  profile.career.map((item) => (
                    <article key={item.id}>
                      <i />
                      <div>
                        <strong>{item.title}</strong>
                        <span>
                          {item.company}
                          {item.location ? ` · ${item.location}` : ""}
                        </span>
                        <small>
                          {item.startDate?.slice(0, 4) ?? ""} —{" "}
                          {item.current
                            ? "Present"
                            : (item.endDate?.slice(0, 4) ?? "")}
                        </small>
                        {item.description && <div className="rich-role-description" dangerouslySetInnerHTML={{ __html: sanitizeRichText(item.description) }} />}
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="profile-empty">No career history added yet.</p>
                )}
              </div>
            </section>
            <section className="profile-section">
              <div className="profile-section-head">
                <span className="eyebrow">EDUCATION</span>
                <GraduationCap size={16} />
              </div>
              <div className="timeline-list">
                {profile?.education.length ? (
                  profile.education.map((item) => (
                    <article key={item.id}>
                      <i />
                      <div>
                        <strong>
                          {item.qualification}
                          {item.fieldOfStudy ? ` · ${item.fieldOfStudy}` : ""}
                        </strong>
                        <span>{item.institution}</span>
                        <small>
                          {item.startYear ?? ""}
                          {item.endYear ? ` — ${item.endYear}` : ""}
                        </small>
                        {item.description && <div className="rich-role-description" dangerouslySetInnerHTML={{ __html: sanitizeRichText(item.description) }} />}
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="profile-empty">No education added yet.</p>
                )}
              </div>
            </section>
            <div className="profile-numbers">
              <div>
                <strong>
                  {String(profile?.projectCount ?? 4).padStart(2, "0")}
                </strong>
                <span>Projects started</span>
              </div>
              <div>
                <strong>
                  {String(profile?.involvedCount ?? 0).padStart(2, "0")}
                </strong>
                <span>Projects involved</span>
              </div>
              <div>
                <strong>{profile?.interests.length ?? 0}</strong>
                <span>Interests</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function LegacyProfileView2({
  member,
  userId,
  onEdit,
}: {
  member: MemberPerson;
  userId?: string | null;
  onEdit: () => void;
}) {
  const [profile, setProfile] = useState<ProfileRecord | null>(null),
    [loading, setLoading] = useState(true),
    [section, setSection] = useState<
      "profile" | "projects" | "media" | "bookmarks"
    >("profile"),
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
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    fetch(`/api/profiles/${userId}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setProfile(data?.profile ?? null))
      .finally(() => setLoading(false));
  }, [userId]);
  useEffect(() => {
    if (!userId) return;
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
    if (
      profile.isFollowing &&
      !window.confirm(`Stop following ${profile.name ?? "this member"}?`)
    )
      return;
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
  }
  if (loading)
    return (
      <div className="profile-loading">
        <span />
        <p>Loading member profile…</p>
      </div>
    );
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
            : busy
              ? "Updating…"
              : profile?.isMutual
                ? "Connected"
                : profile?.isFollowing
                  ? "Following"
                  : "Connect"}
        </button>
        <h1>
          {person.name} {person.isN2Admin && <N2AdminBadge />}
        </h1>
        <p className="profile-role">
          {profile?.isFounder ? <N2FounderLabel /> : person.role}
          {profile?.location ? ` · ${profile.location}` : ""}
        </p>
        {profile && (
          <div className="profile-network-counts">
            <span>
              <strong>{profile.followers}</strong> followers
            </span>
            <span>
              <strong>{profile.following}</strong> following
            </span>
            {profile.isMutual && <b>Mutual connection</b>}
          </div>
        )}
        <nav className="profile-tabs">
          <button
            className={section === "profile" ? "active" : ""}
            onClick={() => setSection("profile")}
          >
            Profile
          </button>
          <button
            className={section === "projects" ? "active" : ""}
            onClick={() => setSection("projects")}
          >
            Projects
          </button>
          <button
            className={section === "media" ? "active" : ""}
            onClick={() => setSection("media")}
          >
            Media
          </button>
          {profile?.isCurrent && (
            <button
              className={section === "bookmarks" ? "active" : ""}
              onClick={() => setSection("bookmarks")}
            >
              <Bookmark size={14} /> Bookmarks
            </button>
          )}
        </nav>
        {section === "projects" ? (
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
            <div className="profile-section-head">
              <span className="eyebrow">MEDIA</span>
              <small>
                Images and videos shared by{" "}
                {profile?.isCurrent ? "you" : person.name}
              </small>
            </div>
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
                ) : item.videoUrl ? (
                  <article key={item.id} className="media-link">
                    <Video size={24} />
                    <a href={item.videoUrl} target="_blank" rel="noreferrer">
                      {item.body || "Open shared video"}
                    </a>
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
            <div className="profile-section-head">
              <span className="eyebrow">BOOKMARKS</span>
              <small>
                {saved.filter((item) => item.pinned).length}/3 items pinned
              </small>
            </div>
            <div className="saved-list">
              {saved.map((item) => (
                <article key={item.id}>
                  <span className="saved-kind">{item.entityType}</span>
                  <div>
                    <strong>
                      {String(
                        item.details.title ??
                          item.details.projectTitle ??
                          "Saved item",
                      )}
                    </strong>
                    <p>
                      {String(
                        item.details.summary ??
                          item.details.body ??
                          "Saved for later",
                      )}
                    </p>
                  </div>
                  {item.pinned && <Pin size={15} />}
                </article>
              ))}
              {!saved.length && (
                <p className="profile-empty">
                  Your saved projects, comments and meets will appear here.
                </p>
              )}
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
                {!skills.length && (
                  <p className="profile-empty">No career skills added yet.</p>
                )}
              </div>
            </section>
            <section className="profile-section">
              <div className="profile-section-head">
                <span className="eyebrow">CAREER HISTORY</span>
                <BriefcaseBusiness size={16} />
              </div>
              <div className="timeline-list">
                {profile?.career.length ? (
                  profile.career.map((item) => (
                    <article key={item.id}>
                      <i />
                      <div>
                        <strong>{item.title}</strong>
                        <span>
                          {item.company}
                          {item.location ? ` · ${item.location}` : ""}
                        </span>
                        <small>
                          {item.startDate?.slice(0, 4) ?? ""} —{" "}
                          {item.current
                            ? "Present"
                            : (item.endDate?.slice(0, 4) ?? "")}
                        </small>
                        {item.description && <p>{item.description}</p>}
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="profile-empty">No career history added yet.</p>
                )}
              </div>
            </section>
            <section className="profile-section">
              <div className="profile-section-head">
                <span className="eyebrow">EDUCATION</span>
                <GraduationCap size={16} />
              </div>
              <div className="timeline-list">
                {profile?.education.length ? (
                  profile.education.map((item) => (
                    <article key={item.id}>
                      <i />
                      <div>
                        <strong>
                          {item.qualification}
                          {item.fieldOfStudy ? ` · ${item.fieldOfStudy}` : ""}
                        </strong>
                        <span>{item.institution}</span>
                        <small>
                          {item.startYear ?? ""}
                          {item.endYear ? ` — ${item.endYear}` : ""}
                        </small>
                        {item.description && <p>{item.description}</p>}
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="profile-empty">No education added yet.</p>
                )}
              </div>
            </section>
          </>
        )}
      </div>
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
    [busy, setBusy] = useState(false);
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
    if (
      profile.isFollowing &&
      !window.confirm(`Stop following ${profile.name ?? "this member"}?`)
    )
      return;
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
                <article key={item.id}>
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
                </article>
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

function LegacyMatchPanel({
  onClose,
  onMessage,
}: {
  onClose: () => void;
  onMessage: () => void;
}) {
  const [feedback, setFeedback] = useState<"helpful" | "not_relevant" | null>(
    null,
  );
  function rate(signal: "helpful" | "not_relevant") {
    setFeedback(signal);
  }
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => e.currentTarget === e.target && onClose()}
    >
      <section className="match-panel" role="dialog" aria-modal="true">
        <div className="modal-head">
          <button className="icon-button" onClick={onClose}>
            <X size={20} />
          </button>
          <span>Why this match</span>
          <span className="match-score">94%</span>
        </div>
        <div className="match-body">
          <span className="eyebrow">A USEFUL CONNECTION</span>
          <div className="match-person">
            <Avatar person={people.lena} size="xl" ring />
            <div>
              <h2>Lena Vogt</h2>
              <p>Brand strategist · Climate and public good</p>
              <span>
                <MapPin size={13} /> London · 2 mutual connections
              </span>
            </div>
          </div>
          <div className="reason-grid">
            <div>
              <N2Mark />
              <strong>Project fit</strong>
              <p>Lena has launched two neighbourhood climate programmes.</p>
            </div>
            <div>
              <UsersRound size={16} />
              <strong>Working style</strong>
              <p>You both prefer small pilots before scaling.</p>
            </div>
            <div>
              <Bookmark size={16} />
              <strong>Shared interest</strong>
              <p>Community ownership and accessible services.</p>
            </div>
          </div>
          <div className="warm-intro">
            <Avatar person={people.marcus} size="sm" />
            <p>
              <strong>Marcus can introduce you.</strong>
              <br />A warm introduction makes this connection 3× more likely to
              lead somewhere useful.
            </p>
          </div>
          <div className="match-feedback">
            <span>
              {feedback
                ? "Thanks — your matches will adapt."
                : "Is this match useful?"}
            </span>
            <button
              className={feedback === "helpful" ? "active" : ""}
              onClick={() => rate("helpful")}
            >
              <ThumbsUp size={14} />
            </button>
            <button
              className={feedback === "not_relevant" ? "active" : ""}
              onClick={() => rate("not_relevant")}
            >
              <ThumbsDown size={14} />
            </button>
          </div>
          <div className="match-actions">
            <button className="secondary-button" onClick={onClose}>
              Maybe later
            </button>
            <button className="primary-button" onClick={onMessage}>
              <MessageCircle size={16} /> Ask for intro
            </button>
          </div>
        </div>
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

function SearchOverlay({
  onClose,
  onNavigate,
  onProfile,
}: {
  onClose: () => void;
  onNavigate: (view: View) => void;
  onProfile: (userId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
      people: Array<Record<string, unknown>>;
      projects: Array<Record<string, unknown>>;
      roles: Array<Record<string, unknown>>;
    }>({ people: [], projects: [], roles: [] }),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    const controller = new AbortController(),
      timer = setTimeout(() => {
        if (query.trim().length < 2) {
          setResults({ people: [], projects: [], roles: [] });
          setLoading(false);
          return;
        }
        setLoading(true);
        fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        })
          .then((r) =>
            r.ok ? r.json() : { people: [], projects: [], roles: [] },
          )
          .then(setResults)
          .catch(() => undefined)
          .finally(() => setLoading(false));
      }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  const total =
    results.people.length + results.projects.length + results.roles.length;
  return (
    <div
      className="search-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Search the network"
    >
      <div className="search-modal">
        <div className="search-field">
          <Search size={20} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people, skills, industries or projects"
          />
          <button onClick={onClose}>ESC</button>
        </div>
        <div className="search-results">
          <span className="eyebrow">
            {loading
              ? "SEARCHING THE NETWORK"
              : query
                ? `${total} RESULTS`
                : "TRY A SEARCH"}
          </span>
          {query.trim().length >= 2 ? (
            <>
              {results.people.map((person) => {
                const ranked = [
                  person.primarySkill,
                  person.secondarySkill,
                  person.tertiarySkill,
                ]
                  .filter(Boolean)
                  .map(String);
                return (
                  <button
                    key={String(person.id)}
                    onClick={() => {
                      onProfile(String(person.id));
                      onClose();
                    }}
                  >
                    <Avatar
                      person={{
                        name: String(person.name ?? "Member"),
                        role: String(
                          person.profession ?? person.industry ?? "n2 member",
                        ),
                        img: person.image as string | null,
                        isN2Admin: Boolean(person.isN2Admin),
                      }}
                      size="md"
                    />
                    <span>
                      <strong>
                        {String(person.name)}{" "}
                        {Boolean(person.isN2Admin) && <N2AdminBadge />}
                      </strong>
                      <small>
                        {String(
                          person.profession ?? person.industry ?? "n2 member",
                        )}{" "}
                        ·{" "}
                        {(ranked.length
                          ? ranked
                          : (person.skills as string[]).slice(0, 3)
                        ).join(" · ")}
                      </small>
                    </span>
                    <ArrowUpRight size={17} />
                  </button>
                );
              })}
              {results.projects.map((project) => (
                <button
                  key={String(project.id)}
                  onClick={() => {
                    onNavigate("projects");
                    onClose();
                  }}
                >
                  <span className="result-icon">
                    <BriefcaseBusiness size={18} />
                  </span>
                  <span>
                    <strong>{String(project.title)}</strong>
                    <small>
                      Project · {String(project.industry)} ·{" "}
                      {String(project.stage)}
                    </small>
                  </span>
                  <ArrowUpRight size={17} />
                </button>
              ))}
              {results.roles.map((role) => (
                <button
                  key={String(role.id)}
                  onClick={() => {
                    onNavigate("projects");
                    onClose();
                  }}
                >
                  <span className="result-icon">
                    <UserPlus size={18} />
                  </span>
                  <span>
                    <strong>{String(role.title)}</strong>
                    <small>
                      {String(role.projectTitle)} · {String(role.department)}
                    </small>
                  </span>
                  <ArrowUpRight size={17} />
                </button>
              ))}
              {!loading && !total && (
                <div className="search-empty">
                  <Search size={19} />
                  <strong>No exact match yet</strong>
                  <p>
                    Try a skill, profession, industry, project name or open
                    role.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="search-prompts">
              <button onClick={() => setQuery("Climate")}>
                Climate projects
              </button>
              <button onClick={() => setQuery("Product designer")}>
                Product designers
              </button>
              <button onClick={() => setQuery("Community")}>
                Community roles
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NotificationPanel({
  onClose,
  onUnread,
}: {
  onClose: () => void;
  onUnread: (count: number) => void;
}) {
  const [items, setItems] = useState<NotificationRecord[]>([]),
    [unread, setUnread] = useState(0),
    [loading, setLoading] = useState(true);
  const [systemPermission, setSystemPermission] = useState<
    NotificationPermission | "unsupported"
  >("unsupported");
  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : { notifications: [], unread: 0 }))
      .then((data) => {
        setItems(data.notifications ?? []);
        setUnread(data.unread ?? 0);
        onUnread(data.unread ?? 0);
      })
      .finally(() => setLoading(false));
  }, [onUnread]);
  useEffect(() => {
    setSystemPermission(
      typeof Notification === "undefined"
        ? "unsupported"
        : Notification.permission,
    );
  }, []);
  async function read(item?: NotificationRecord) {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        item
          ? { action: "read", notificationId: item.id }
          : { action: "read_all" },
      ),
    });
    if (!response.ok) return;
    if (item) {
      setItems((current) =>
        current.map((row) =>
          row.id === item.id
            ? { ...row, readAt: new Date().toISOString() }
            : row,
        ),
      );
      if (!item.readAt)
        setUnread((value) => {
          const next = Math.max(0, value - 1);
          onUnread(next);
          return next;
        });
    } else {
      setItems((current) =>
        current.map((row) => ({ ...row, readAt: new Date().toISOString() })),
      );
      setUnread(0);
      onUnread(0);
    }
  }
  async function enableSystemNotifications() {
    if (typeof Notification === "undefined") return;
    const permission = await Notification.requestPermission();
    setSystemPermission(permission);
    if (permission === "granted")
      localStorage.setItem("n2-system-message-notifications", "enabled");
  }
  // eslint-disable-next-line jsx-a11y/no-static-element-interactions
  return (
    <div
      className="panel-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <aside
        className="notification-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
      >
        <header>
          <div>
            <span className="eyebrow">YOUR NETWORK</span>
            <h2>Notifications {unread > 0 && <b>{unread}</b>}</h2>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X size={19} />
          </button>
        </header>
        {systemPermission === "default" && (
          <button
            className="system-notification-prompt"
            onClick={enableSystemNotifications}
          >
            <Bell size={16} />
            <span>
              <strong>Enable device notifications</strong>
              <small>See new messages even when n2 is in the background.</small>
            </span>
          </button>
        )}
        {systemPermission === "denied" && (
          <p className="system-notification-denied">
            Device notifications are blocked in your browser settings.
          </p>
        )}
        {unread > 0 && (
          <button className="mark-read" onClick={() => read()}>
            <CheckCheck size={15} /> Mark all as read
          </button>
        )}
        <div className="notification-list">
          {loading ? (
            <p className="notification-empty">Loading notifications…</p>
          ) : items.length ? (
            items.map((item) => (
              <a
                key={item.id}
                className={item.readAt ? "" : "unread"}
                href={item.href ?? "#"}
                onClick={() => read(item)}
              >
                <Avatar
                  person={{
                    name: item.actorName ?? "nice 2 network",
                    role: "",
                    img: item.actorImage,
                  }}
                  size="sm"
                />
                <span>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                  <small>{new Date(item.createdAt).toLocaleString()}</small>
                </span>
                {!item.readAt && <i />}
              </a>
            ))
          ) : (
            <div className="notification-empty">
              <Bell size={22} />
              <strong>You’re all caught up</strong>
              <p>
                Project activity, messages, invitations and meets will appear
                here.
              </p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function HelpPanel({
  onClose,
  onNavigate,
}: {
  onClose: () => void;
  onNavigate: (view: View) => void;
}) {
  const [query, setQuery] = useState(""),
    [open, setOpen] = useState<string | null>(null);
  const topics = [
    {
      id: "projects",
      title: "Starting and joining projects",
      answer:
        "Start a project from Home, review the suggested team map, then publish it. Use Views to follow momentum, comments to discuss the work, and open roles to contribute.",
      view: "projects" as View,
      label: "Open projects",
    },
    {
      id: "feed",
      title: "Posts, ideas and project tags",
      answer:
        "Share a post or idea from Home. Add an image, video or video link, then tag one of your projects or any public project so people can move directly from the conversation to the work.",
      view: "feed" as View,
      label: "Go to Home",
    },
    {
      id: "messages",
      title: "Messages and group conversations",
      answer:
        "Use Messages for direct or group conversations. Project comments remain attached to the project so the full working context stays together.",
      view: "messages" as View,
      label: "Open messages",
    },
    {
      id: "meet",
      title: "Meets and video calls",
      answer:
        "Create an n2 Meet, invite up to four people for a demo video call, or add an in-person session to your calendar.",
      view: "meet" as View,
      label: "Open Meet",
    },
    {
      id: "account",
      title: "Profile, privacy and account help",
      answer:
        "Your profile, notification choices, visibility, password and calendar preferences are managed from Settings.",
      view: "settings" as View,
      label: "Open settings",
    },
  ];
  const visible = topics.filter((topic) =>
    `${topic.title} ${topic.answer}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <div
      className="panel-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <aside
        className="help-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Help centre"
      >
        <header>
          <div>
            <span className="eyebrow">N2 SUPPORT</span>
            <h2>How can we help?</h2>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X size={19} />
          </button>
        </header>
        <label className="help-search">
          <Search size={17} />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search help"
          />
        </label>
        <div className="help-topics">
          {visible.map((topic) => (
            <article key={topic.id}>
              <button
                onClick={() =>
                  setOpen((current) => (current === topic.id ? null : topic.id))
                }
              >
                <span>{topic.title}</span>
                <ChevronDown size={16} />
              </button>
              {open === topic.id && (
                <div>
                  <p>{topic.answer}</p>
                  <button
                    onClick={() => {
                      onNavigate(topic.view);
                      onClose();
                    }}
                  >
                    {topic.label}
                    <ArrowUpRight size={14} />
                  </button>
                </div>
              )}
            </article>
          ))}
          {!visible.length && (
            <div className="help-empty">
              <CircleHelp size={21} />
              <strong>No matching help article</strong>
              <p>Try “projects”, “messages”, “profile” or “meet”.</p>
            </div>
          )}
        </div>
        <footer>
          <ShieldCheck size={16} />
          <p>
            <strong>Safety concern?</strong>
            <span>
              Use the report option on the relevant project, post or member so
              the n2 team receives the right context.
            </span>
          </p>
        </footer>
      </aside>
    </div>
  );
}

function GuestAuthPrompt({
  onClose,
  initialMode = "register",
}: {
  onClose: () => void;
  initialMode?: "register" | "signin";
}) {
  const [mode, setMode] = useState<"register" | "signin">(initialMode),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [photo, setPhoto] = useState("");
  async function choosePhoto(file?: File) {
    if (!file) return;
    if (file.size > 500_000) {
      setError("Choose a photo smaller than 500 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result));
    reader.readAsDataURL(file);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget),
      email = String(data.get("email")),
      password = String(data.get("password"));
    if (mode === "signin") {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Check your email and password.");
        setBusy(false);
        return;
      }
      window.location.reload();
      return;
    }
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: data.get("title"),
        firstName: data.get("firstName"),
        lastName: data.get("lastName"),
        dateOfBirth: data.get("dateOfBirth"),
        image: photo,
        email,
        password,
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "Could not create your account.");
      setBusy(false);
      return;
    }
    window.location.href = result.onboarding ? "/onboarding" : "/signin";
  }
  return (
    <div
      className="modal-backdrop guest-auth-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="guest-auth-modal"
        role="dialog"
        aria-modal="true"
        aria-label={
          mode === "register" ? "Create an n2 account" : "Sign in to n2"
        }
      >
        <header>
          <Logo />
          <button className="icon-button" onClick={onClose}>
            <X size={19} />
          </button>
        </header>
        <div className="guest-auth-intro">
          <span className="eyebrow">
            {mode === "register" ? "JOIN THE NETWORK" : "WELCOME BACK"}
          </span>
          <h2>
            {mode === "register"
              ? "Turn interest into contribution."
              : "Continue where you left off."}
          </h2>
          <p>
            {mode === "register"
              ? "Create an account to view projects, comment, share ideas, start projects and meet useful people."
              : "Sign in to interact with projects and your network."}
          </p>
        </div>
        <div className="guest-auth-tabs">
          <button
            className={mode === "register" ? "active" : ""}
            onClick={() => {
              setMode("register");
              setError("");
            }}
          >
            Create account
          </button>
          <button
            className={mode === "signin" ? "active" : ""}
            onClick={() => {
              setMode("signin");
              setError("");
            }}
          >
            Sign in
          </button>
        </div>
        <form onSubmit={submit}>
          {mode === "register" && (
            <>
              <div className="guest-signup-grid">
                <label>
                  Title
                  <select name="title" defaultValue="Ms" required>
                    <option>Mr</option>
                    <option>Ms</option>
                    <option>Mrs</option>
                    <option>Miss</option>
                    <option>Mx</option>
                    <option>Dr</option>
                    <option>Prof</option>
                  </select>
                </label>
                <label>
                  Date of birth
                  <input
                    name="dateOfBirth"
                    type="date"
                    max={new Date(
                      new Date().setFullYear(new Date().getFullYear() - 16),
                    )
                      .toISOString()
                      .slice(0, 10)}
                    required
                  />
                </label>
                <label>
                  First name
                  <input
                    name="firstName"
                    autoComplete="given-name"
                    minLength={2}
                    required
                  />
                </label>
                <label>
                  Surname
                  <input
                    name="lastName"
                    autoComplete="family-name"
                    minLength={2}
                    required
                  />
                </label>
              </div>
              <label className="guest-photo-field">
                <span>
                  Profile photo <small>Optional</small>
                </span>
                <span className="guest-photo-picker">
                  {photo ? (
                    <img src={photo} alt="Profile preview" />
                  ) : (
                    <b>n2</b>
                  )}
                  <span>
                    {photo ? "Photo ready" : "Use the n2 mark or add a photo"}
                  </span>
                  <ImageIcon size={15} />
                  <input
                    aria-label="Choose a profile photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => choosePhoto(event.target.files?.[0])}
                  />
                </span>
              </label>
            </>
          )}
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label htmlFor="guest-password">
            Password
            <PasswordInput
              id="guest-password"
              name="password"
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              minLength={10}
              required
            />
            <small>At least 10 characters.</small>
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button wide" disabled={busy}>
            {busy
              ? "One moment…"
              : mode === "register"
                ? "Create account"
                : "Sign in"}
          </button>
        </form>
        <small className="guest-auth-terms">
          By joining, you agree to follow the n2 community standards and privacy
          choices.
        </small>
      </section>
    </div>
  );
}

function ShareSheet({
  item,
  authenticated,
  onRequireAuth,
  onClose,
  onToast,
}: {
  item: {
    id: string;
    title: string;
    summary: string;
    kind?: "project" | "post";
  };
  authenticated: boolean;
  onRequireAuth: () => void;
  onClose: () => void;
  onToast: (message: string) => void;
}) {
  const kind = item.kind ?? "project",
    url =
      typeof window !== "undefined"
        ? `${window.location.origin}/share/${kind}/${item.id}`
        : "";
  const encoded = encodeURIComponent(url);
  const [panel, setPanel] = useState<"main" | "messages" | "projects">("main"),
    [more, setMore] = useState(true),
    [busy, setBusy] = useState(""),
    [conversations, setConversations] = useState<ConversationRecord[]>([]),
    [projects, setProjects] = useState<ProjectRecord[]>([]);
  useEffect(() => {
    if (!authenticated) return;
    Promise.all([
      fetch("/api/conversations").then((r) =>
        r.ok ? r.json() : { conversations: [] },
      ),
      fetch("/api/projects?scope=mine&limit=50").then((r) =>
        r.ok ? r.json() : { projects: [] },
      ),
    ])
      .then(([chats, work]) => {
        setConversations(chats.conversations ?? []);
        setProjects(
          (work.projects ?? []).filter(
            (project: ProjectRecord) =>
              project.status === "active" && project.id !== item.id,
          ),
        );
      })
      .catch(() => undefined);
  }, [authenticated, item.id]);
  function track(channel: string) {
    if (kind === "project")
      fetch(`/api/projects/${item.id}/share`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channel }),
      }).catch(() => undefined);
  }
  function requireAccess(next: "messages" | "projects") {
    if (!authenticated) {
      onClose();
      onRequireAuth();
      return;
    }
    setPanel(next);
  }
  async function copy() {
    await navigator.clipboard.writeText(url);
    track("copy");
    onToast("Link copied.");
    onClose();
  }
  async function nativeShare() {
    if (navigator.share) {
      await navigator.share({ title: item.title, url });
      track("native");
      onClose();
    } else await copy();
  }
  async function sendToConversation(conversation: ConversationRecord) {
    setBusy(conversation.id);
    const response = await fetch(
      `/api/conversations/${conversation.id}/messages`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          body: `${item.title}\n${item.summary}\n${url}`,
        }),
      },
    );
    setBusy("");
    if (response.ok) {
      track("n2_message");
      onToast("Shared in messages.");
      onClose();
    } else onToast("Could not share to this conversation.");
  }
  async function sendToProject(project: ProjectRecord) {
    setBusy(project.id);
    const response = await fetch(`/api/projects/${project.id}/updates`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "update",
        body: `Shared from the n2 timeline: ${item.title}\n${item.summary}\n${url}`,
      }),
    });
    setBusy("");
    if (response.ok) {
      track("n2_project");
      onToast(`Shared to ${project.title}.`);
      onClose();
    } else onToast("Join this project before sharing to its updates.");
  }
  const conversationTitle = (row: ConversationRecord) =>
    row.name ||
    row.members
      .map((member) => member.name)
      .filter(Boolean)
      .join(", ") ||
    "Conversation";
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className="share-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`Share ${item.title}`}
      >
        <header>
          <div>
            {panel !== "main" && (
              <button className="share-back" onClick={() => setPanel("main")}>
                <ArrowLeft size={15} /> Back
              </button>
            )}
            <span className="eyebrow">BRING IN USEFUL PEOPLE</span>
            <h2>
              {panel === "messages"
                ? "Share in messages"
                : panel === "projects"
                  ? "Share to a project"
                  : `Share this ${kind}`}
            </h2>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X size={19} />
          </button>
        </header>
        <div className="share-project">
          <N2Mark />
          <span>
            <strong>{item.title}</strong>
            <small>{item.summary}</small>
          </span>
        </div>
        {panel === "main" ? (
          <>
            <div className="share-primary">
              <button onClick={() => requireAccess("messages")}>
                <MessageCircle size={20} />
                <span>
                  <strong>Send in messages</strong>
                  <small>Choose an n2 conversation</small>
                </span>
              </button>
              <button onClick={() => requireAccess("projects")}>
                <BriefcaseBusiness size={20} />
                <span>
                  <strong>Share to a project</strong>
                  <small>Add it to project updates</small>
                </span>
              </button>
              <button onClick={copy}>
                <Link2 size={20} />
                <span>
                  <strong>Copy link</strong>
                  <small>Includes a rich preview</small>
                </span>
              </button>
              <div className="share-more-wrap">
                <button
                  aria-label="More sharing options"
                  aria-expanded={more}
                  onClick={() => setMore((value) => !value)}
                >
                  <Ellipsis size={21} />
                  <span>
                    <strong>More</strong>
                    <small>External sharing options</small>
                  </span>
                </button>
                {more && (
                  <div className="share-more-menu">
                    <button onClick={nativeShare}>
                      <Share2 size={16} />
                      Device share
                    </button>
                    <a
                      href={`https://wa.me/?text=${encoded}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle size={16} />
                      WhatsApp
                    </a>
                    <a
                      href={`https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <UsersRound size={16} />
                      LinkedIn
                    </a>
                    <a
                      href={`https://www.facebook.com/sharer/sharer.php?u=${encoded}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <UsersRound size={16} />
                      Facebook
                    </a>
                    <a
                      href={`https://twitter.com/intent/tweet?url=${encoded}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Share2 size={16} />X
                    </a>
                    <a
                      href={`https://t.me/share/url?url=${encoded}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Send size={16} />
                      Telegram
                    </a>
                    <a
                      href={`mailto:?subject=${encodeURIComponent(item.title)}&body=${encoded}`}
                    >
                      <Mail size={16} />
                      Email
                    </a>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="share-destination-list">
            {panel === "messages"
              ? conversations.map((row) => (
                  <button
                    key={row.id}
                    disabled={busy === row.id}
                    onClick={() => sendToConversation(row)}
                  >
                    <MessageCircle size={18} />
                    <span>
                      <strong>{conversationTitle(row)}</strong>
                      <small>
                        {row.lastMessage?.body ??
                          "Start the conversation with this share"}
                      </small>
                    </span>
                    <ArrowUpRight size={15} />
                  </button>
                ))
              : projects.map((project) => (
                  <button
                    key={project.id}
                    disabled={busy === project.id}
                    onClick={() => sendToProject(project)}
                  >
                    <BriefcaseBusiness size={18} />
                    <span>
                      <strong>{project.title}</strong>
                      <small>
                        {project.industry} · {project.stage}
                      </small>
                    </span>
                    <ArrowUpRight size={15} />
                  </button>
                ))}
            {panel === "messages" && !conversations.length && (
              <p>No conversations yet. Start one in Messages first.</p>
            )}
            {panel === "projects" && !projects.length && (
              <p>No eligible projects yet. Create or join a project first.</p>
            )}
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
    "root" | "profile" | "notifications" | "calendar" | "privacy" | "security"
  >(initialPanel);
  const [saved, setSaved] = useState(false);
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
          if (typeof value.recommendations === "boolean")
            setRecommendations(value.recommendations);
          if (typeof value.availability === "boolean")
            setAvailability(value.availability);
        } catch {
          /* Keep safe defaults when local settings are invalid. */
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
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  async function saveSettings() {
    if (saveStatus.busy) return;
    setSaved(false);
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
      localStorage.setItem(
        "n2-settings",
        JSON.stringify({ calendarPrefs, privacy, recommendations, availability }),
      );
      setSaveStatus({ busy: false, error: "" });
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
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
      privacy: [
        "Privacy and visibility",
        "Decide who can find, contact and understand you.",
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
                  <Check size={15} /> Saved
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
              <label>
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
                    <label className="full">
                      Role description
                      <RichTextEditor
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
          ["privacy", "Privacy and visibility"],
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

function PeopleDiscoveryPanel({
  onClose,
  onProfile,
  onToast,
}: {
  onClose: () => void;
  onProfile: (id: string) => void;
  onToast: (message: string) => void;
}) {
  const [items, setItems] = useState<PeopleSuggestionRecord[]>([]),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    const params = new URLSearchParams({ limit: "40", filter });
    if (query.trim()) params.set("q", query.trim());
    const timer = setTimeout(
      () =>
        fetch(`/api/people/suggestions?${params}`)
          .then((response) =>
            response.ok ? response.json() : { suggestions: [] },
          )
          .then((data) => setItems(data.suggestions ?? []))
          .finally(() => setLoading(false)),
      200,
    );
    return () => clearTimeout(timer);
  }, [query, filter]);
  async function follow(item: PeopleSuggestionRecord) {
    const response = await fetch(`/api/users/${item.id}/follow`, {
        method: "POST",
      }),
      result = await response.json();
    if (response.ok) {
      signalNetworkChanged();
      setItems((rows) => rows.filter((row) => row.id !== item.id));
      onToast(
        result.mutual
          ? `You and ${item.name} are now mutually connected.`
          : `You’re now following ${item.name}.`,
      );
    } else onToast(result.error ?? "Could not follow this member.");
  }
  async function feedback(
    item: PeopleSuggestionRecord,
    signal: "hide" | "not_relevant",
  ) {
    const reason =
      signal === "not_relevant"
        ? (window.prompt("What made this suggestion irrelevant? (optional)") ??
          undefined)
        : undefined;
    const response = await fetch("/api/people/suggestions/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        recommendationId: item.recommendationId,
        signal,
        reason,
      }),
    });
    if (response.ok)
      setItems((rows) => rows.filter((row) => row.id !== item.id));
  }
  return (
    <div
      className="panel-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <aside
        className="people-discovery-panel"
        role="dialog"
        aria-modal="true"
        aria-label="People to know"
      >
        <header>
          <div>
            <span className="eyebrow">USEFUL PEOPLE</span>
            <h2>People to know</h2>
            <p>Suggested for credible collaboration, not popularity.</p>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X size={19} />
          </button>
        </header>
        <label className="help-search">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search profession, skill, industry or location"
          />
        </label>
        <div className="people-filter-tabs">
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button
            className={filter === "project" ? "active" : ""}
            onClick={() => setFilter("project")}
          >
            Project fit
          </button>
          <button
            className={filter === "local" ? "active" : ""}
            onClick={() => setFilter("local")}
          >
            Near you
          </button>
        </div>
        <div className="people-discovery-list">
          {loading ? (
            <p>Finding useful people…</p>
          ) : (
            items.map((item) => (
              <article key={item.id}>
                <button
                  className="people-profile"
                  onClick={() => {
                    onProfile(item.id);
                    onClose();
                  }}
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
                    <small>
                      {item.profession ?? "Member"}
                      {item.location ? ` · ${item.location}` : ""}
                    </small>
                    <i>{item.reasons.join(" · ")}</i>
                  </span>
                </button>
                <div>
                  <button
                    className="secondary-button"
                    onClick={() => follow(item)}
                  >
                    <Plus size={14} /> Follow
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Hide suggestion"
                    onClick={() => feedback(item, "hide")}
                  >
                    <X size={14} />
                  </button>
                  <button
                    className="text-button"
                    onClick={() => feedback(item, "not_relevant")}
                  >
                    Not relevant
                  </button>
                </div>
              </article>
            ))
          )}
          {!loading && !items.length && (
            <div className="onboarding-empty">
              <UsersRound size={22} />
              <strong>Your useful network is growing</strong>
              <p>Complete your profile or return as more live members join.</p>
            </div>
          )}
        </div>
      </aside>
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
    if (!authenticated) return;
    let mounted = true;
    async function poll() {
      const response = await fetch("/api/notifications");
      if (!response.ok) return;
      const data = await response.json();
      if (!mounted) return;
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
    }
    poll().catch(() => undefined);
    const timer = window.setInterval(
      () => poll().catch(() => undefined),
      15000,
    );
    return () => {
      mounted = false;
      window.clearInterval(timer);
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
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div>
          <Logo onClick={() => go("feed")} />
          <nav>
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={view === item.id ? "active" : ""}
                  onClick={() => go(item.id)}
                >
                  <Icon size={20} />
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
              {currentMember.isN2Admin && (
                <a className="admin-nav-link" href="/admin">
                  <ShieldCheck size={20} />
                  <span>Admin console</span>
                  <N2AdminBadge />
                </a>
              )}
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
              <button onClick={() => setHelpOpen(true)}>
                <CircleHelp size={20} />
                <span>Help</span>
              </button>
              <button onClick={() => signOut({ redirectTo: "/signin" })}>
                <LogOut size={20} />
                <span>Log out</span>
              </button>
              <button className="profile-chip" onClick={openOwnProfile}>
                <Avatar person={currentMember} size="sm" />
                <span>
                  <strong>
                    {currentMember.name}{" "}
                    {currentMember.isN2Admin && <N2AdminBadge />}
                  </strong>
                  <small>View profile</small>
                </span>
                <ChevronDown size={16} />
              </button>
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
      <main className="main-content">
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
            <Bell size={20} />
            {unreadNotifications > 0 && (
              <b>{unreadNotifications > 9 ? "9+" : unreadNotifications}</b>
            )}
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
            >
              <Bell size={19} />
              {authenticated && unreadNotifications > 0 && (
                <b>{unreadNotifications > 9 ? "9+" : unreadNotifications}</b>
              )}
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
              <button>About</button>
              <button>Privacy</button>
              <button>Community</button>
            </div>
            <small>© 2026 nice 2 network</small>
          </footer>
        </aside>
      )}
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {nav
          .slice(0, 5)
          .filter((item) => item.id !== view)
          .map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => go(item.id)}>
                <Icon size={21} />
                <span>{item.label}</span>
              </button>
            );
          })}
        {view !== "profile" && (
          <button onClick={openOwnProfile}>
            <UserRound size={21} />
            <span>Me</span>
          </button>
        )}
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
        />
      )}
      {authenticated && notificationsOpen && (
        <NotificationPanel
          onClose={() => setNotificationsOpen(false)}
          onUnread={setUnreadNotifications}
        />
      )}
      {authenticated && helpOpen && (
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
