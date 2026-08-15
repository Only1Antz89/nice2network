"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, BriefcaseBusiness, Search, UserPlus } from "lucide-react";
import { Avatar, N2AdminBadge } from "@/components/network-brand";

export default function SearchOverlay({
  onClose,
  onNavigate,
  onProfile,
}: {
  onClose: () => void;
  onNavigate: (view: "projects") => void;
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
                          : (Array.isArray(person.skills) ? person.skills : []).slice(0, 3)
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
