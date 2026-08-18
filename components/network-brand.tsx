import Image from "next/image";

export type MemberPerson = {
  id?: string;
  name: string;
  role: string;
  img?: string | null;
  isN2Admin?: boolean;
};

export function Avatar({
  person,
  size = "md",
  ring = false,
  expandable = true,
}: {
  person: MemberPerson;
  size?: "sm" | "md" | "lg" | "xl";
  ring?: boolean;
  expandable?: boolean;
}) {
  const canExpand = expandable && Boolean(person.img);

  return (
    <Image
      className={`avatar avatar-${size} ${ring ? "avatar-ring" : ""}`}
      src={person.img || "/brand/nice-2-network-mark.svg"}
      alt={person.img ? person.name : `${person.name} — default n2 avatar`}
      width={160}
      height={160}
      sizes="160px"
      unoptimized
      data-expandable={canExpand ? "true" : undefined}
      role={canExpand ? "button" : undefined}
      tabIndex={canExpand ? 0 : undefined}
      onClick={canExpand ? event => {
        event.stopPropagation();
        window.dispatchEvent(new CustomEvent("n2:expand-profile-photo", { detail: { src: person.img, alt: person.name } }));
      } : undefined}
      onKeyDown={canExpand ? event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          window.dispatchEvent(new CustomEvent("n2:expand-profile-photo", { detail: { src: person.img, alt: person.name } }));
        }
      } : undefined}
    />
  );
}

export function N2AdminBadge() {
  return (
    <span className="n2-admin-badge" aria-label="Official n2 administrator">
      <b>n2</b> ADMIN
    </span>
  );
}

export function N2IntAilliumWordmark() {
  return (
    <span
      className="n2-intaillium-wordmark"
      aria-label="n2 / IntAillium"
    >
      <b aria-hidden="true">n2</b>
      <i aria-hidden="true">/</i>
      <span aria-hidden="true">IntAillium</span>
    </span>
  );
}
export function N2FounderLabel() {
  return <span className="n2-founder-label">n2 Founder</span>;
}
export function DemoBadge() {
  return (
    <span
      className="demo-badge"
      title="Faux content that will be removed before launch"
    >
      DEMO
    </span>
  );
}

export function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <button className="logo" aria-label="Nice 2 Network home" onClick={onClick}>
      <span className="logo-mark">n2</span>
      <span>nice 2 network</span>
    </button>
  );
}

export function N2Mark({ inverse = false }: { inverse?: boolean }) {
  return (
    <span
      className={`n2-ai-mark ${inverse ? "inverse" : ""}`}
      aria-label="n2 intelligence"
    >
      n2
    </span>
  );
}
