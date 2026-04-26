import type { Pattern } from "../lib/parser";
import { useTheme } from "../theme/ThemeContext";

interface Props {
  patterns: Pattern[];
  selectedId: number;
  progress: Record<number, { revealed: number; total: number }>;
  onSelect: (id: number) => void;
}

function progressDot(state?: { revealed: number; total: number }) {
  if (!state || state.revealed === 0) {
    return (
      <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-border)]" />
    );
  }
  if (state.revealed === state.total) {
    return (
      <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-success)]" />
    );
  }
  return (
    <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-accent)]" />
  );
}

export function Sidebar({ patterns, selectedId, progress, onSelect }: Props) {
  const { theme, toggle } = useTheme();
  return (
    <aside className="w-72 flex-shrink-0 border-r border-[var(--color-border)] bg-[var(--color-panel)] flex flex-col">
      <div className="px-4 py-4 border-b border-[var(--color-border)] flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="m-0 text-lg font-bold text-[var(--color-text-strong)] tracking-tight">
            System Design Flash
          </h1>
          <p className="m-0 mt-1 text-xs text-[var(--color-text-dim)]">
            {patterns.length} interview patterns
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-label="Toggle theme"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          className="btn !px-2 !py-1.5 text-base leading-none flex-shrink-0"
        >
          {theme === "dark" ? "☀" : "☾"}
        </button>
      </div>
      <ul className="m-0 p-0 list-none overflow-y-auto flex-1">
        {patterns.map((p) => {
          const isSelected = p.id === selectedId;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onSelect(p.id)}
                className={`w-full text-left px-4 py-2.5 flex items-center gap-3 text-sm border-l-2 transition-colors ${
                  isSelected
                    ? "bg-[var(--color-panel-2)] border-[var(--color-accent)] text-[var(--color-text-strong)]"
                    : "border-transparent text-[var(--color-text)] hover:bg-[var(--color-panel-2)] hover:text-[var(--color-text-strong)]"
                }`}
              >
                {progressDot(progress[p.id])}
                <span className="text-[var(--color-text-dim)] tabular-nums w-5 text-right">
                  {p.id}
                </span>
                <span className="flex-1 leading-tight">{p.title}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
