import { useEffect, useMemo, useState, useCallback } from "react";
import { parseContent, sortSections, SOURCES } from "@primed/parser";
import type { Pattern, SourceId } from "@primed/parser";
import { NavSidebar } from "./components/NavSidebar";
import { PatternView } from "./components/PatternView";
import { SettingsPage } from "./components/SettingsPage";

type RevealedMap = Record<number, string[]>;

interface SourceState {
  patterns: Pattern[];
  loading: boolean;
  error: string | null;
}

const LEGACY_REVEALED_KEY = "sdf:revealed:v1";
const LEGACY_SELECTED_KEY = "sdf:selected:v1";

function revealedKey(source: SourceId) {
  return `${SOURCES[source].storagePrefix}:revealed:v1`;
}

function selectedKey(source: SourceId) {
  return `${SOURCES[source].storagePrefix}:selected:v1`;
}

function migrateLegacyKeys() {
  const legacyRevealed = localStorage.getItem(LEGACY_REVEALED_KEY);
  if (legacyRevealed && !localStorage.getItem(revealedKey("patterns"))) {
    localStorage.setItem(revealedKey("patterns"), legacyRevealed);
  }
  const legacySelected = localStorage.getItem(LEGACY_SELECTED_KEY);
  if (legacySelected && !localStorage.getItem(selectedKey("patterns"))) {
    localStorage.setItem(selectedKey("patterns"), legacySelected);
  }
}

function loadRevealed(source: SourceId): RevealedMap {
  try {
    const raw = localStorage.getItem(revealedKey(source));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveRevealed(source: SourceId, map: RevealedMap) {
  localStorage.setItem(revealedKey(source), JSON.stringify(map));
}

function loadSelected(source: SourceId): number {
  const raw = localStorage.getItem(selectedKey(source));
  const n = raw ? parseInt(raw, 10) : 1;
  return Number.isFinite(n) ? n : 1;
}

const ALL_SOURCE_IDS = Object.keys(SOURCES) as SourceId[];

const VALID_SOURCES: SourceId[] = [
  "patterns",
  "neetcode",
  "java",
  "kotlin",
  "csharp",
  "go",
  "python",
  "postgres",
  "sql-practice",
  "event-sourcing",
  "kafka",
  "cqrs",
  "ddia",
  "cassandra",
  "redis",
];

function readHashView(): { view: "settings" | "source"; source: SourceId } {
  const h = window.location.hash.replace(/^#\/?/, "").toLowerCase();
  if (h === "settings") return { view: "settings", source: "patterns" };
  const source = (VALID_SOURCES as string[]).includes(h)
    ? (h as SourceId)
    : "patterns";
  return { view: "source", source };
}

function writeSourceToHash(source: SourceId) {
  const target = `#/${source}`;
  if (window.location.hash !== target) {
    window.location.hash = target;
  }
}

const emptySourceState: SourceState = { patterns: [], loading: true, error: null };

function initSources(): Record<SourceId, SourceState> {
  return Object.fromEntries(
    ALL_SOURCE_IDS.map((id) => [id, { ...emptySourceState }]),
  ) as Record<SourceId, SourceState>;
}

function initRecord<T>(fn: (id: SourceId) => T): Record<SourceId, T> {
  return Object.fromEntries(ALL_SOURCE_IDS.map((id) => [id, fn(id)])) as Record<
    SourceId,
    T
  >;
}

export default function App() {
  const [view, setView] = useState<"settings" | "source">(() => {
    migrateLegacyKeys();
    return readHashView().view;
  });
  const [activeSource, setActiveSource] = useState<SourceId>(
    () => readHashView().source,
  );

  const [navOpen, setNavOpen] = useState(false);

  const [sources, setSources] = useState<Record<SourceId, SourceState>>(initSources);

  const [selectedIds, setSelectedIds] = useState<Record<SourceId, number>>(() =>
    initRecord(loadSelected),
  );

  const [revealedMaps, setRevealedMaps] = useState<Record<SourceId, RevealedMap>>(() =>
    initRecord(loadRevealed),
  );

  useEffect(() => {
    const onHash = () => {
      const parsed = readHashView();
      setView(parsed.view);
      if (parsed.view === "source") setActiveSource(parsed.source);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    let cancelled = false;
    ALL_SOURCE_IDS.forEach((id) => {
      fetch(SOURCES[id].file)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.text();
        })
        .then((md) => {
          if (cancelled) return;
          setSources((prev) => ({
            ...prev,
            [id]: { patterns: parseContent(md, SOURCES[id]), loading: false, error: null },
          }));
        })
        .catch((e) => {
          if (cancelled) return;
          setSources((prev) => ({
            ...prev,
            [id]: { patterns: [], loading: false, error: String(e) },
          }));
        });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const sourceConfig = SOURCES[activeSource];
  const sourceState = sources[activeSource];
  const patterns = sourceState.patterns;
  const selectedId = selectedIds[activeSource];
  const revealedMap = revealedMaps[activeSource];

  const onSelectSource = useCallback((id: SourceId) => {
    writeSourceToHash(id);
    setActiveSource(id);
    setView("source");
  }, []);

  const onOpenSettings = useCallback(() => {
    window.location.hash = "#/settings";
    setView("settings");
  }, []);

  const onSelectItem = useCallback(
    (sourceId: SourceId, itemId: number) => {
      writeSourceToHash(sourceId);
      setActiveSource(sourceId);
      setSelectedIds((prev) => ({ ...prev, [sourceId]: itemId }));
      localStorage.setItem(selectedKey(sourceId), String(itemId));
    },
    [],
  );

  const setSelectedId = useCallback(
    (id: number) => {
      setSelectedIds((prev) => ({ ...prev, [activeSource]: id }));
      localStorage.setItem(selectedKey(activeSource), String(id));
      setNavOpen(false);
    },
    [activeSource],
  );

  const selected = useMemo(
    () => patterns.find((p) => p.id === selectedId) ?? patterns[0] ?? null,
    [patterns, selectedId],
  );

  const sortedSelectedSections = useMemo(
    () => (selected ? sortSections(selected.sections, sourceConfig.sectionOrder) : []),
    [selected, sourceConfig],
  );

  const revealed = useMemo(() => {
    if (!selected) return new Set<string>();
    const arr = revealedMap[selected.id] ?? sourceConfig.defaultRevealedSections;
    return new Set(arr);
  }, [revealedMap, selected, sourceConfig]);

  const updateRevealed = useCallback(
    (patternId: number, updater: (prev: Set<string>) => Set<string>) => {
      setRevealedMaps((prev) => {
        const sourceMap = prev[activeSource];
        const cur = new Set(sourceMap[patternId] ?? sourceConfig.defaultRevealedSections);
        const next = updater(cur);
        const out = { ...sourceMap, [patternId]: [...next] };
        saveRevealed(activeSource, out);
        return { ...prev, [activeSource]: out };
      });
    },
    [activeSource, sourceConfig],
  );

  const onToggle = useCallback(
    (name: string) => {
      if (!selected) return;
      updateRevealed(selected.id, (prev) => {
        const next = new Set(prev);
        if (next.has(name)) next.delete(name);
        else next.add(name);
        return next;
      });
    },
    [selected, updateRevealed],
  );

  const onShowAll = useCallback(() => {
    if (!selected) return;
    updateRevealed(
      selected.id,
      () => new Set(sortedSelectedSections.map((s) => s.name)),
    );
  }, [selected, sortedSelectedSections, updateRevealed]);

  const onHideAll = useCallback(() => {
    if (!selected) return;
    updateRevealed(selected.id, () => new Set(sourceConfig.defaultRevealedSections));
  }, [selected, sourceConfig, updateRevealed]);

  const onRevealNext = useCallback(() => {
    if (!selected) return;
    updateRevealed(selected.id, (prev) => {
      const ordered = sortedSelectedSections.map((s) => s.name);
      const next = ordered.find((n) => !prev.has(n));
      if (!next) return prev;
      const out = new Set(prev);
      out.add(next);
      return out;
    });
  }, [selected, sortedSelectedSections, updateRevealed]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.matches("input, textarea")) return;
      if (e.key === "ArrowRight" || e.key === "j") {
        const idx = patterns.findIndex((p) => p.id === selectedId);
        if (idx >= 0 && idx < patterns.length - 1) {
          setSelectedId(patterns[idx + 1].id);
        }
      } else if (e.key === "ArrowLeft" || e.key === "k") {
        const idx = patterns.findIndex((p) => p.id === selectedId);
        if (idx > 0) setSelectedId(patterns[idx - 1].id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [patterns, selectedId, setSelectedId]);

  // Build items-by-source map for the nav sidebar
  const itemsBySource = useMemo(
    () =>
      Object.fromEntries(
        ALL_SOURCE_IDS.map((id) => [
          id,
          sources[id].patterns.map((p) => ({ id: p.id, title: p.title })),
        ]),
      ) as Record<SourceId, { id: number; title: string }[]>,
    [sources],
  );

  return (
    <div className="h-full flex">
      <NavSidebar
        activeSource={activeSource}
        activeItemId={selected?.id ?? null}
        onSelectSource={onSelectSource}
        onSelectItem={onSelectItem}
        itemsBySource={itemsBySource}
        open={navOpen}
        onClose={() => setNavOpen(false)}
        onOpenSettings={onOpenSettings}
        settingsActive={view === "settings"}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-panel)]">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="btn !px-3 !py-2 text-base leading-none flex-shrink-0"
            aria-label="Open menu"
          >
            ☰
          </button>
          <div className="text-sm text-[var(--color-text-strong)] truncate flex-1 min-w-0">
            {view === "settings" ? (
              "Settings"
            ) : selected ? (
              <>
                <span className="text-[var(--color-text-dim)] mr-1">#{selected.id}</span>
                {selected.title}
              </>
            ) : (
              sourceConfig.title
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {view === "settings" ? (
            <SettingsPage onBack={() => { writeSourceToHash(activeSource); setView("source"); }} />
          ) : sourceState.loading ? (
            <div className="h-full flex items-center justify-center text-[var(--color-text-dim)]">
              Loading {sourceConfig.title}…
            </div>
          ) : sourceState.error ? (
            <div className="h-full flex items-center justify-center text-[var(--color-warn)] p-8">
              Failed to load {sourceConfig.file}: {sourceState.error}
            </div>
          ) : !selected ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 p-12">
              <div className="text-[var(--color-text-strong)] text-5xl font-extrabold tracking-[4px]">
                PRIMED
              </div>
              <div className="text-[var(--color-text-dim)] text-base">
                Pick a source from the sidebar to get primed.
              </div>
            </div>
          ) : (
            <PatternView
              key={`${activeSource}-${selected.id}`}
              source={sourceConfig}
              pattern={selected}
              revealed={revealed}
              onToggle={onToggle}
              onShowAll={onShowAll}
              onHideAll={onHideAll}
              onRevealNext={onRevealNext}
            />
          )}
        </div>
      </div>
    </div>
  );
}
