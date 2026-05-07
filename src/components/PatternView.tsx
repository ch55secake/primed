import { useEffect, useMemo } from "react";
import type { Pattern, SourceConfig } from "../lib/parser";
import { sortSections } from "../lib/parser";
import { Section } from "./Section";

interface Props {
  source: SourceConfig;
  pattern: Pattern;
  revealed: Set<string>;
  onToggle: (sectionName: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
  onRevealNext: () => void;
}

const sectionDomId = (name: string) =>
  `section-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

const scrollToSection = (name: string) => {
  requestAnimationFrame(() => {
    const el = document.getElementById(sectionDomId(name));
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
};

export function PatternView({
  source,
  pattern,
  revealed,
  onToggle,
  onShowAll,
  onHideAll,
  onRevealNext,
}: Props) {
  const sortedSections = useMemo(
    () => sortSections(pattern.sections, source.sectionOrder),
    [pattern, source],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.matches("input, textarea, button")) return;

      if (e.code === "Space") {
        e.preventDefault();
        const ordered = sortedSections.map((s) => s.name);
        const next = ordered.find((n) => !revealed.has(n));
        if (next) {
          onRevealNext();
          scrollToSection(next);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        const ordered = sortedSections.map((s) => s.name);
        let lastRevealed: string | null = null;
        for (const n of ordered) {
          if (revealed.has(n)) lastRevealed = n;
        }
        if (!lastRevealed || lastRevealed === ordered[0]) return;
        onToggle(lastRevealed);
        const idx = ordered.indexOf(lastRevealed);
        const prev = idx > 0 ? ordered[idx - 1] : ordered[0];
        scrollToSection(prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [revealed, sortedSections, onRevealNext, onToggle]);

  const handleRevealNextClick = () => {
    const ordered = sortedSections.map((s) => s.name);
    const next = ordered.find((n) => !revealed.has(n));
    if (next) {
      onRevealNext();
      scrollToSection(next);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto min-w-0">
      <div className="max-w-4xl mx-auto px-4 py-4 md:px-8 md:py-8">
        <header className="mb-4 md:mb-6 flex flex-col md:flex-row md:items-start md:justify-between gap-2 md:gap-6">
          <div className="min-w-0">
            <div className="text-xs text-[var(--color-text-dim)] tracking-widest uppercase mb-1">
              {source.itemLabel} {pattern.id}
            </div>
            <h2 className="m-0 text-xl md:text-3xl font-bold text-[var(--color-text-strong)] tracking-tight break-words">
              {pattern.title}
            </h2>
          </div>
          <span className="chip self-start md:self-auto flex-shrink-0">
            {revealed.size} / {sortedSections.length} revealed
          </span>
        </header>

        <div className="flex gap-2 mb-4 md:mb-6 flex-wrap">
          <button type="button" className="btn btn-primary" onClick={handleRevealNextClick}>
            Reveal next ↓
          </button>
          <button type="button" className="btn" onClick={onShowAll}>
            Show all
          </button>
          <button type="button" className="btn" onClick={onHideAll}>
            Hide all
          </button>
          <span className="ml-auto self-center text-xs text-[var(--color-text-dim)] hidden md:inline">
            <kbd className="font-mono px-1.5 py-0.5 bg-[var(--color-panel-2)] rounded border border-[var(--color-border)] mx-0.5">Space</kbd>
            reveal ·
            <kbd className="font-mono px-1.5 py-0.5 bg-[var(--color-panel-2)] rounded border border-[var(--color-border)] mx-0.5">Esc</kbd>
            collapse last ·
            <kbd className="font-mono px-1.5 py-0.5 bg-[var(--color-panel-2)] rounded border border-[var(--color-border)] mx-0.5">←</kbd>
            <kbd className="font-mono px-1.5 py-0.5 bg-[var(--color-panel-2)] rounded border border-[var(--color-border)] mx-0.5">→</kbd>
            switch
          </span>
        </div>

        <div>
          {sortedSections.map((s) => (
            <Section
              key={s.name}
              patternId={pattern.id}
              patternSlug={pattern.slug}
              section={s}
              expanded={revealed.has(s.name)}
              onToggle={() => onToggle(s.name)}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
