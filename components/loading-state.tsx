import type { CSSProperties } from "react";

type LoadingVariant = "feed" | "list" | "network";

function Bone({
  className = "",
  width,
}: {
  className?: string;
  width?: string;
}) {
  return (
    <span
      className={`loading-bone ${className}`.trim()}
      style={width ? ({ "--bone-width": width } as CSSProperties) : undefined}
      aria-hidden="true"
    />
  );
}

function FeedCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <article className={`loading-card ${compact ? "is-compact" : ""}`} aria-hidden="true">
      <div className="loading-card-accent" />
      <div className="loading-card-body">
        <div className="loading-person-row">
          <Bone className="loading-avatar" />
          <span className="loading-person-copy">
            <Bone width="34%" />
            <Bone className="is-small" width="24%" />
          </span>
        </div>
        <Bone className="loading-pill" width="22%" />
        <Bone className="loading-title" width="76%" />
        <Bone width="100%" />
        <Bone width="91%" />
        <Bone width="64%" />
        <div className="loading-card-footer">
          <Bone width="18%" />
          <Bone width="15%" />
          <Bone width="20%" />
        </div>
      </div>
    </article>
  );
}

function ListSkeleton({ count }: { count: number }) {
  return (
    <div className="loading-list" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div className="loading-list-row" key={index}>
          <Bone className="loading-avatar" />
          <span>
            <Bone width={`${42 + (index % 3) * 9}%`} />
            <Bone className="is-small" width={`${66 + (index % 2) * 13}%`} />
          </span>
          <Bone className="loading-list-tail" />
        </div>
      ))}
    </div>
  );
}

export function LoadingState({
  label = "Loading information",
  variant = "feed",
  count = 2,
  className = "",
}: {
  label?: string;
  variant?: LoadingVariant;
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={`loading-state loading-${variant} ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="visually-hidden">{label}</span>
      {variant === "network" ? (
        <div className="loading-network-map" aria-hidden="true">
          <Bone className="loading-network-self" />
          {Array.from({ length: 7 }, (_, index) => (
            <Bone className={`loading-network-node node-${index + 1}`} key={index} />
          ))}
        </div>
      ) : variant === "list" ? (
        <ListSkeleton count={count} />
      ) : (
        <div className="loading-card-stack">
          {Array.from({ length: count }, (_, index) => (
            <FeedCardSkeleton compact={index > 0} key={index} />
          ))}
        </div>
      )}
      <p className="loading-slow-note">Still loading — this can take a little longer on a slower connection.</p>
    </div>
  );
}

export function AppLoadingShell() {
  return (
    <div className="app-shell app-loading-shell" role="status" aria-live="polite" aria-busy="true">
      <span className="visually-hidden">Loading nice 2 network</span>
      <aside className="sidebar loading-shell-sidebar" aria-hidden="true">
        <div>
          <div className="loading-shell-logo"><span>n2</span><Bone width="108px" /></div>
          <div className="loading-shell-nav">
            {Array.from({ length: 7 }, (_, index) => <Bone key={index} width={`${62 + (index % 3) * 8}%`} />)}
          </div>
        </div>
        <Bone className="loading-shell-account" />
      </aside>
      <main className="main-content">
        <div className="content-column loading-shell-main" aria-hidden="true">
          <Bone className="is-small" width="150px" />
          <Bone className="loading-shell-heading" width="72%" />
          <Bone width="88%" />
          <div className="loading-shell-composer"><Bone className="loading-avatar" /><Bone width="64%" /></div>
          <div className="loading-shell-tabs"><Bone width="62px" /><Bone width="72px" /><Bone width="58px" /></div>
          <FeedCardSkeleton />
          <FeedCardSkeleton compact />
        </div>
      </main>
      <aside className="right-rail loading-shell-rail" aria-hidden="true">
        <Bone className="loading-shell-search" />
        <Bone className="is-small" width="112px" />
        <ListSkeleton count={3} />
      </aside>
    </div>
  );
}
