import type { SourceConfig, SourceId } from "@primed/parser";
import { SOURCES } from "@primed/parser";

interface Props {
  active: SourceId;
  onSelect: (id: SourceId) => void;
}

const ORDER: SourceId[] = ["patterns", "neetcode", "java", "kotlin", "csharp", "postgres", "sql-practice"];

export function SourceTabs({ active, onSelect }: Props) {
  return (
    <div
      role="tablist"
      className="flex items-center gap-1 px-2 md:px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-panel)] overflow-x-auto"
    >
      <img src="/favicon.svg" alt="Primed" className="w-7 h-7 flex-shrink-0 mr-2" />
      <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
      {ORDER.map((id) => {
        const cfg: SourceConfig = SOURCES[id];
        const isActive = id === active;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onSelect(id)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              isActive
                ? "bg-[var(--color-panel-2)] text-[var(--color-text-strong)] border border-[var(--color-accent)]"
                : "text-[var(--color-text-dim)] hover:text-[var(--color-text-strong)] hover:bg-[var(--color-panel-2)] border border-transparent"
            }`}
          >
            {cfg.title}
          </button>
        );
      })}
      </div>
    </div>
  );
}
