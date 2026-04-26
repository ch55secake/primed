import { useEffect, useMemo, useState, useCallback } from "react";
import { parsePatterns, sortSections } from "./lib/parser";
import type { Pattern } from "./lib/parser";
import { Sidebar } from "./components/Sidebar";
import { PatternView } from "./components/PatternView";

const STORAGE_KEY = "sdf:revealed:v1";
const SELECTED_KEY = "sdf:selected:v1";

type RevealedMap = Record<number, string[]>;

function loadRevealed(): RevealedMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveRevealed(map: RevealedMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function loadSelected(): number {
  const raw = localStorage.getItem(SELECTED_KEY);
  const n = raw ? parseInt(raw, 10) : 1;
  return Number.isFinite(n) ? n : 1;
}

export default function App() {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [selectedId, setSelectedId] = useState<number>(loadSelected());
  const [revealedMap, setRevealedMap] = useState<RevealedMap>(loadRevealed());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/patterns.md")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((md) => {
        setPatterns(parsePatterns(md));
        setLoading(false);
      })
      .catch((e) => {
        setLoadError(String(e));
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    localStorage.setItem(SELECTED_KEY, String(selectedId));
  }, [selectedId]);

  const selected = useMemo(
    () => patterns.find((p) => p.id === selectedId) ?? patterns[0] ?? null,
    [patterns, selectedId],
  );

  const sortedSelectedSections = useMemo(
    () => (selected ? sortSections(selected.sections) : []),
    [selected],
  );

  const revealed = useMemo(() => {
    if (!selected) return new Set<string>();
    const arr = revealedMap[selected.id] ?? ["Problem"];
    return new Set(arr);
  }, [revealedMap, selected]);

  const updateRevealed = useCallback(
    (patternId: number, updater: (prev: Set<string>) => Set<string>) => {
      setRevealedMap((prev) => {
        const cur = new Set(prev[patternId] ?? ["Problem"]);
        const next = updater(cur);
        const out = { ...prev, [patternId]: [...next] };
        saveRevealed(out);
        return out;
      });
    },
    [],
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
    updateRevealed(selected.id, () => new Set(["Problem"]));
  }, [selected, updateRevealed]);

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
  }, [patterns, selectedId]);

  const progress = useMemo(() => {
    const out: Record<number, { revealed: number; total: number }> = {};
    for (const p of patterns) {
      const r = revealedMap[p.id] ?? ["Problem"];
      out[p.id] = { revealed: r.length, total: p.sections.length };
    }
    return out;
  }, [patterns, revealedMap]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--color-text-dim)]">
        Loading patterns…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--color-warn)] p-8">
        Failed to load patterns.md: {loadError}
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--color-text-dim)]">
        No patterns parsed.
      </div>
    );
  }

  return (
    <div className="h-full flex">
      <Sidebar
        patterns={patterns}
        selectedId={selected.id}
        progress={progress}
        onSelect={setSelectedId}
      />
      <PatternView
        key={selected.id}
        pattern={selected}
        revealed={revealed}
        onToggle={onToggle}
        onShowAll={onShowAll}
        onHideAll={onHideAll}
        onRevealNext={onRevealNext}
      />
    </div>
  );
}
