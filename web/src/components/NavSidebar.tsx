import { useState, useCallback, useEffect } from "react";
import { SOURCES } from "@primed/parser";
import type { SourceId, SourceConfig } from "@primed/parser";

interface Props {
  activeSource: SourceId;
  activeItemId: number | null;
  onSelectSource: (id: SourceId) => void;
  onSelectItem: (sourceId: SourceId, itemId: number) => void;
  itemsBySource: Record<SourceId, { id: number; title: string }[]>;
  open: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  settingsActive: boolean;
}

const ALL_SOURCES = Object.values(SOURCES) as SourceConfig[];

function groupByCategory(
  sources: SourceConfig[],
): Array<{ category: string; sources: SourceConfig[] }> {
  const order: string[] = [];
  const buckets = new Map<string, SourceConfig[]>();
  for (const s of sources) {
    const cat = s.category?.trim() || "Other";
    if (!buckets.has(cat)) {
      order.push(cat);
      buckets.set(cat, []);
    }
    buckets.get(cat)!.push(s);
  }
  return order.map((c) => ({ category: c, sources: buckets.get(c)! }));
}

const GROUPED = groupByCategory(ALL_SOURCES);

export function NavSidebar({
  activeSource,
  activeItemId,
  onSelectSource,
  onSelectItem,
  itemsBySource,
  open,
  onClose,
  onOpenSettings,
  settingsActive,
}: Props) {
  const [expanded, setExpanded] = useState<Set<SourceId>>(
    () => new Set([activeSource]),
  );

  // Auto-expand the active source
  useEffect(() => {
    setExpanded((prev) => {
      if (prev.has(activeSource)) return prev;
      return new Set([...prev, activeSource]);
    });
  }, [activeSource]);

  const toggleSource = useCallback((id: SourceId) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const sidebar = (
    <aside className="w-70 h-full flex-shrink-0 border-r border-[var(--color-border)] bg-[var(--color-panel)] flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 border-b border-[var(--color-border)] flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div>
            <div className="text-[var(--color-text-strong)] font-extrabold text-lg tracking-widest leading-tight">
              PRIMED
            </div>
            <div className="text-[var(--color-text-dim)] text-[11px] mt-0.5">
              Interview prep
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Settings"
            className={`btn !px-2 !py-1.5 text-base leading-none ${settingsActive ? "border-[var(--color-accent)] text-[var(--color-text-strong)]" : ""}`}
          >
            ⚙
          </button>
          {open && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="btn !px-2 !py-1.5 text-base leading-none md:hidden"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Tree nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {GROUPED.map(({ category, sources }) => (
          <div key={category} className="pt-1 pb-1">
            {/* Category header */}
            <div className="px-4 pt-2 pb-1">
              <span className="text-[var(--color-text-dim)] text-[10px] font-bold tracking-[1.4px] uppercase">
                {category}
              </span>
            </div>

            {/* Sources in this category */}
            {sources.map((src) => {
              const id = src.id as SourceId;
              const isActive = id === activeSource;
              const isExpanded = expanded.has(id);
              const items = itemsBySource[id] ?? [];

              return (
                <div key={id}>
                  {/* Source row */}
                  <button
                    type="button"
                    onClick={() => {
                      toggleSource(id);
                      onSelectSource(id);
                    }}
                    className={`w-full flex items-center gap-0 pr-4 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-[var(--color-panel-2)]"
                        : "hover:bg-[var(--color-panel-2)]"
                    }`}
                  >
                    {/* Accent strip */}
                    <span
                      className="w-[3px] h-5 mr-2 flex-shrink-0 rounded-sm"
                      style={{
                        backgroundColor: isActive
                          ? "var(--color-accent)"
                          : "transparent",
                      }}
                    />
                    <span className="text-[var(--color-text-dim)] text-xs w-3.5 text-center flex-shrink-0">
                      {isExpanded ? "▾" : "▸"}
                    </span>
                    <span
                      className={`ml-1 font-medium flex-1 text-left leading-tight ${
                        isActive
                          ? "text-[var(--color-text-strong)] font-semibold"
                          : "text-[var(--color-text)]"
                      }`}
                    >
                      {src.title}
                    </span>
                  </button>

                  {/* Items list */}
                  {isExpanded && (
                    <ul className="m-0 p-0 list-none pl-7 pb-1">
                      {items.length === 0 ? (
                        <li className="px-2 py-1.5 text-xs text-[var(--color-text-dim)] italic">
                          Loading…
                        </li>
                      ) : (
                        items.map((item) => {
                          const isActiveItem =
                            isActive && activeItemId === item.id;
                          return (
                            <li key={item.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectItem(id, item.id);
                                  onClose();
                                }}
                                className={`w-full flex items-start gap-2 px-2 py-1.5 text-left transition-colors rounded-sm ${
                                  isActiveItem
                                    ? "bg-[var(--color-panel-2)]"
                                    : "hover:bg-[var(--color-panel-2)]"
                                }`}
                              >
                                <span className="text-[var(--color-text-dim)] text-[11px] tabular-nums w-5 text-right mt-px flex-shrink-0">
                                  {item.id}
                                </span>
                                <span
                                  className={`text-xs leading-4 flex-1 ${
                                    isActiveItem
                                      ? "text-[var(--color-text-strong)] font-medium"
                                      : "text-[var(--color-text)]"
                                  }`}
                                >
                                  {item.title}
                                </span>
                              </button>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Sidebar — drawer on mobile, static on desktop */}
      <div
        className={`fixed md:static inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {sidebar}
      </div>
    </>
  );
}
