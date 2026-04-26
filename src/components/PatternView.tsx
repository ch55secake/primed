import { useEffect, useMemo } from "react";
import type { Pattern } from "../lib/parser";
import { sortSections } from "../lib/parser";
import { Section } from "./Section";

interface Props {
  pattern: Pattern;
  revealed: Set<string>;
  onToggle: (sectionName: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
  onRevealNext: () => void;
}

export function PatternView({
  pattern,
  revealed,
  onToggle,
  onShowAll,
  onHideAll,
  onRevealNext,
}: Props) {
  const sortedSections = useMemo(
    () => sortSections(pattern.sections),
    [pattern],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" && !(e.target as HTMLElement).matches("input, textarea, button")) {
        e.preventDefault();
        onRevealNext();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onRevealNext]);

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-8 py-8">
        <header className="mb-6 flex items-start justify-between gap-6">
          <div>
            <div className="text-xs text-[var(--color-text-dim)] tracking-widest uppercase mb-1">
              Pattern {pattern.id}
            </div>
            <h2 className="m-0 text-3xl font-bold text-[var(--color-text-strong)] tracking-tight">
              {pattern.title}
            </h2>
          </div>
          <span className="chip">
            {revealed.size} / {sortedSections.length} revealed
          </span>
        </header>

        <div className="flex gap-2 mb-6">
          <button type="button" className="btn btn-primary" onClick={onRevealNext}>
            Reveal next ↓
          </button>
          <button type="button" className="btn" onClick={onShowAll}>
            Show all
          </button>
          <button type="button" className="btn" onClick={onHideAll}>
            Hide all
          </button>
          <span className="ml-auto self-center text-xs text-[var(--color-text-dim)]">
            <kbd className="font-mono px-1.5 py-0.5 bg-[var(--color-panel-2)] rounded border border-[var(--color-border)] mx-0.5">Space</kbd>
            reveal next ·
            <kbd className="font-mono px-1.5 py-0.5 bg-[var(--color-panel-2)] rounded border border-[var(--color-border)] mx-0.5">←</kbd>
            <kbd className="font-mono px-1.5 py-0.5 bg-[var(--color-panel-2)] rounded border border-[var(--color-border)] mx-0.5">→</kbd>
            switch pattern
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
