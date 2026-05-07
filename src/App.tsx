import { useEffect, useMemo, useState, useCallback } from "react";
import { parseContent, sortSections, SOURCES } from "./lib/parser";
import type { Pattern, SourceId } from "./lib/parser";
import { Sidebar } from "./components/Sidebar";
import { PatternView } from "./components/PatternView";
import { SourceTabs } from "./components/SourceTabs";

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

const VALID_SOURCES: SourceId[] = ["patterns", "neetcode", "java"];

function readSourceFromHash(): SourceId {
  const h = window.location.hash.replace(/^#\/?/, "").toLowerCase();
  return (VALID_SOURCES as string[]).includes(h) ? (h as SourceId) : "patterns";
}

function writeSourceToHash(source: SourceId) {
  const target = `#/${source}`;
  if (window.location.hash !== target) {
    window.location.hash = target;
  }
}

export default function App() {
  const [activeSource, setActiveSource] = useState<SourceId>(() => {
    migrateLegacyKeys();
    return readSourceFromHash();
  });

  // Mobile drawer state — open on mobile when user taps menu, closed by default
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [sources, setSources] = useState<Record<SourceId, SourceState>>({
    patterns: { patterns: [], loading: true, error: null },
    neetcode: { patterns: [], loading: true, error: null },
    java: { patterns: [], loading: true, error: null },
  });

  const [selectedIds, setSelectedIds] = useState<Record<SourceId, number>>({
    patterns: loadSelected("patterns"),
    neetcode: loadSelected("neetcode"),
    java: loadSelected("java"),
  });

  const [revealedMaps, setRevealedMaps] = useState<Record<SourceId, RevealedMap>>({
    patterns: loadRevealed("patterns"),
    neetcode: loadRevealed("neetcode"),
    java: loadRevealed("java"),
  });

  useEffect(() => {
    const onHash = () => setActiveSource(readSourceFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (Object.keys(SOURCES) as SourceId[]).forEach((id) => {
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
  }, []);

  const setSelectedId = useCallback(
    (id: number) => {
      setSelectedIds((prev) => ({ ...prev, [activeSource]: id }));
      localStorage.setItem(selectedKey(activeSource), String(id));
      // On mobile, close the drawer after selection so the user sees their pick
      setSidebarOpen(false);
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

  const progress = useMemo(() => {
    const out: Record<number, { revealed: number; total: number }> = {};
    for (const p of patterns) {
      const r = revealedMap[p.id] ?? sourceConfig.defaultRevealedSections;
      out[p.id] = { revealed: r.length, total: p.sections.length };
    }
    return out;
  }, [patterns, revealedMap, sourceConfig]);

  return (
    <div className="h-full flex flex-col">
      <SourceTabs active={activeSource} onSelect={onSelectSource} />

      {/* Mobile-only top bar: hamburger + current item title */}
      <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-panel)]">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="btn !px-3 !py-2 text-base leading-none flex-shrink-0"
          aria-label="Open menu"
        >
          ☰
        </button>
        <div className="text-sm text-[var(--color-text-strong)] truncate flex-1 min-w-0">
          {selected ? (
            <>
              <span className="text-[var(--color-text-dim)] mr-1">#{selected.id}</span>
              {selected.title}
            </>
          ) : (
            sourceConfig.title
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        {sourceState.loading ? (
          <div className="h-full flex items-center justify-center text-[var(--color-text-dim)]">
            Loading {sourceConfig.title}…
          </div>
        ) : sourceState.error ? (
          <div className="h-full flex items-center justify-center text-[var(--color-warn)] p-8">
            Failed to load {sourceConfig.file}: {sourceState.error}
          </div>
        ) : !selected ? (
          <div className="h-full flex items-center justify-center text-[var(--color-text-dim)]">
            No content parsed.
          </div>
        ) : (
          <div className="h-full flex relative">
            {/* Backdrop for mobile drawer */}
            <div
              className={`md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-200 ${
                sidebarOpen
                  ? "opacity-100 pointer-events-auto"
                  : "opacity-0 pointer-events-none"
              }`}
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />

            {/* Sidebar — fixed drawer below md, normal flex column at md+ */}
            <div
              className={`fixed md:static inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-out ${
                sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
              }`}
            >
              <Sidebar
                source={sourceConfig}
                patterns={patterns}
                selectedId={selected.id}
                progress={progress}
                onSelect={setSelectedId}
                onClose={() => setSidebarOpen(false)}
              />
            </div>

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
          </div>
        )}
      </div>
    </div>
  );
}
