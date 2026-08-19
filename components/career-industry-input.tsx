"use client";

import { useId, useMemo, useRef, useState } from "react";
import { CAREER_SECTORS, type CareerSector } from "@/lib/career-sectors";

type Match = { sector: CareerSector; career?: string };

const normalise = (value: string) => value.trim().toLocaleLowerCase();

function highlighted(value: string, query: string) {
  const start = normalise(value).indexOf(normalise(query));
  if (!query.trim() || start < 0) return value;
  return <>{value.slice(0, start)}<mark>{value.slice(start, start + query.trim().length)}</mark>{value.slice(start + query.trim().length)}</>;
}

export default function CareerIndustryInput({
  id,
  value,
  onChange,
  placeholder = "Type an industry or career",
  required = false,
  ariaDescribedBy,
  name,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  ariaDescribedBy?: string;
  name?: string;
}) {
  const generatedId = useId();
  const listId = `${id || generatedId}-career-sectors`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const query = value.trim();

  const matches = useMemo<Match[]>(() => {
    if (!query) return CAREER_SECTORS.map((sector) => ({ sector }));
    const needle = normalise(query);
    const ranked: Array<Match & { score: number }> = [];
    for (const sector of CAREER_SECTORS) {
      const sectorName = normalise(sector.sector);
      const keywordHit = sector.keywords?.some((keyword) => normalise(keyword).includes(needle));
      if (sectorName.includes(needle) || keywordHit) ranked.push({ sector, score: sectorName.startsWith(needle) ? 0 : 2 });
      for (const career of sector.careers) {
        const careerName = normalise(career);
        if (careerName.includes(needle)) ranked.push({ sector, career, score: careerName.startsWith(needle) ? 1 : 3 });
      }
    }
    return ranked.sort((a, b) => a.score - b.score || (a.career ?? a.sector.sector).localeCompare(b.career ?? b.sector.sector)).slice(0, 36);
  }, [query]);

  const grouped = useMemo(() => {
    const groups = new Map<string, { sector: CareerSector; matches: Match[] }>();
    for (const match of matches) {
      const current = groups.get(match.sector.sector) ?? { sector: match.sector, matches: [] };
      current.matches.push(match);
      groups.set(match.sector.sector, current);
    }
    return [...groups.values()];
  }, [matches]);

  function choose(match: Match) {
    onChange(match.sector.sector);
    setOpen(false);
  }

  function activeMatch() {
    return matches[Math.min(activeIndex, Math.max(0, matches.length - 1))];
  }

  return (
    <div className="career-industry-picker">
      <div className="career-industry-control">
        <input
          id={id}
          name={name}
          role="combobox"
          required={required}
          value={value}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-describedby={ariaDescribedBy}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          aria-activedescendant={open && matches.length ? `${listId}-option-${Math.min(activeIndex, matches.length - 1)}` : undefined}
          placeholder={placeholder}
          onFocus={() => { if (blurTimer.current) clearTimeout(blurTimer.current); setOpen(true); }}
          onBlur={() => { blurTimer.current = setTimeout(() => setOpen(false), 120); }}
          onChange={(event) => { onChange(event.target.value); setActiveIndex(0); setOpen(true); }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActiveIndex((index) => Math.min(index + 1, matches.length - 1)); }
            if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)); }
            if (event.key === "Escape") setOpen(false);
            if (event.key === "Enter" && open && activeMatch()) { event.preventDefault(); choose(activeMatch()); }
          }}
        />
      </div>
      {open && (
        <div id={listId} className="career-industry-list" role="listbox" aria-label="Industries grouped by sector and matching careers">
          {!matches.length && <p>No close match. You can use “{value.trim()}” as a custom industry.</p>}
          {grouped.map(({ sector, matches: sectorMatches }) => {
            const sectorMatch = sectorMatches.find((match) => !match.career);
            const careerMatches = sectorMatches.filter((match) => match.career);
            const sectorIndex = sectorMatch ? matches.indexOf(sectorMatch) : -1;
            return (
              <section key={sector.sector} role="group" aria-label={sector.sector}>
                {sectorMatch ? <button
                  type="button"
                  id={`${listId}-option-${sectorIndex}`}
                  className="career-industry-sector"
                  role="option"
                  aria-selected={sector.sector === value}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => sectorIndex >= 0 && setActiveIndex(sectorIndex)}
                  onClick={() => choose({ sector })}
                >
                  <strong>{highlighted(sector.sector, query)}</strong>
                  {!query && <small>{sector.careers.slice(0, 3).join(" · ")}</small>}
                </button> : <span className="career-industry-group-label">{sector.sector}</span>}
                {careerMatches.map((match) => {
                  const index = matches.indexOf(match);
                  return <button
                    type="button"
                    id={`${listId}-option-${index}`}
                    className="career-industry-career"
                    role="option"
                    aria-selected={index === activeIndex}
                    key={match.career}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => choose(match)}
                  ><span>{highlighted(match.career!, query)}</span><small>{sector.sector}</small></button>;
                })}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
