import { useEffect, useState } from "react";
import { renderMermaid } from "../theme/mermaidTheme";
import { useTheme } from "../theme/ThemeContext";

interface Props {
  patternId: number;
  patternSlug: string;
  kind: "sequence" | "erd";
  label: string;
}

const sequenceSources = import.meta.glob("../lib/sequences/*.mmd", {
  query: "?raw",
  import: "default",
  eager: false,
}) as Record<string, () => Promise<string>>;

const erdSources = import.meta.glob("../lib/erd/*.mmd", {
  query: "?raw",
  import: "default",
  eager: false,
}) as Record<string, () => Promise<string>>;

function findSource(
  kind: "sequence" | "erd",
  patternId: number,
): (() => Promise<string>) | null {
  const sources = kind === "sequence" ? sequenceSources : erdSources;
  const prefix = String(patternId).padStart(2, "0") + "-";
  const key = Object.keys(sources).find((k) => k.includes("/" + prefix));
  return key ? sources[key] : null;
}

export function AuxDiagram({ patternId, patternSlug, kind, label }: Props) {
  const { theme } = useTheme();
  const [svg, setSvg] = useState<string | null>(null);
  const [skip, setSkip] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSvg(null);
    setSkip(false);
    setError(null);
    const loader = findSource(kind, patternId);
    if (!loader) {
      setSkip(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const source = await loader();
        if (cancelled) return;
        // Skip placeholder-only files
        if (
          source.trim().startsWith("%%") &&
          !source.match(/sequenceDiagram|erDiagram/)
        ) {
          setSkip(true);
          return;
        }
        const id = `aux-${kind}-${patternId}-${patternSlug}-${theme}-${Date.now()}`;
        const rendered = await renderMermaid(id, source.trim(), theme);
        if (!cancelled) setSvg(rendered);
      } catch (e) {
        console.error(`${kind} diagram render failed:`, e);
        if (!cancelled) setError(String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patternId, patternSlug, kind, theme]);

  if (skip) return null;

  return (
    <div className="mt-4">
      <div className="text-xs text-[var(--color-text-dim)] uppercase tracking-wider mb-2">
        {label}
      </div>
      {error ? (
        <div className="text-xs text-[var(--color-warn)] p-2 border border-[var(--color-border)] rounded">
          {label} render failed: {error}
        </div>
      ) : svg ? (
        <div
          className="mermaid-host"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="text-xs text-[var(--color-text-dim)] p-3">
          Loading {label}…
        </div>
      )}
    </div>
  );
}
