"use client";

import { useId, useMemo, useRef, useState } from "react";
import { CAREER_SECTORS, type CareerSector } from "@/lib/career-sectors";
import { OTHER_PROFESSION } from "@/lib/professional-profile";

type Match = { sector: CareerSector; career?: string; value: string };

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
  ariaLabel,
  ariaDescribedBy,
  name,
  mode = "industry",
  strict = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  name?: string;
  mode?: "profession" | "industry";
  strict?: boolean;
}) {
  const generatedId = useId();
  const listId = `${id || generatedId}-career-sectors`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const query = value.trim();

  const matches = useMemo<Match[]>(() => {
    if (!query) {
      if (mode === "industry") return CAREER_SECTORS.map((sector) => ({ sector, value: sector.sector }));
      const other = { sector: CAREER_SECTORS[CAREER_SECTORS.length - 1], career: OTHER_PROFESSION, value: OTHER_PROFESSION };
      const professions = CAREER_SECTORS.flatMap(sector => sector.careers.map(career => ({ sector, career, value: career }))).sort((a, b) => a.value.localeCompare(b.value));
      return [other, ...professions.slice(0, 35)];
    }
    const needle = normalise(query);
    const ranked: Array<Match & { score: number }> = [];
    for (const sector of CAREER_SECTORS) {
      const sectorName = normalise(sector.sector);
      const keywordHit = sector.keywords?.some((keyword) => normalise(keyword).includes(needle));
      if (mode === "industry" && (sectorName.includes(needle) || keywordHit)) ranked.push({ sector, value: sector.sector, score: sectorName.startsWith(needle) ? 0 : 2 });
      for (const career of sector.careers) {
        const careerName = normalise(career);
        if (careerName.includes(needle)) ranked.push({ sector, career, value: mode === "industry" ? sector.sector : career, score: careerName.startsWith(needle) ? 1 : 3 });
      }
    }
    if (mode === "profession" && normalise(OTHER_PROFESSION).includes(needle)) ranked.push({ sector: CAREER_SECTORS[CAREER_SECTORS.length - 1], career: OTHER_PROFESSION, value: OTHER_PROFESSION, score: 4 });
    const unique = new Map(ranked.sort((a, b) => a.score - b.score || a.value.localeCompare(b.value)).map(match => [match.value, match]));
    return [...unique.values()].slice(0, 36);
  }, [mode, query]);

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
    onChange(match.value);
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
          aria-label={ariaLabel}
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
        <div id={listId} className="career-industry-list" role="listbox" aria-label={`${mode === "profession" ? "Professions" : "Industries"} grouped by sector`}>
          {!matches.length && <p>{strict ? `Choose a listed ${mode}.` : `No close match. You can use “${value.trim()}” as a custom ${mode}.`}</p>}
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
                  aria-selected={sectorMatch.value === value}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => sectorIndex >= 0 && setActiveIndex(sectorIndex)}
                  onClick={() => choose(sectorMatch)}
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
                  aria-selected={match.value === value}
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
