import { useEffect, useRef, useState } from "react";
import { renderMermaid } from "../theme/mermaidTheme";
import { useTheme } from "../theme/ThemeContext";

interface Props {
  patternId: number;
  patternSlug: string;
  asciiFallback: string;
}

const diagramSources = import.meta.glob("../lib/diagrams/*.mmd", {
  query: "?raw",
  import: "default",
  eager: false,
}) as Record<string, () => Promise<string>>;

function findDiagramSource(patternId: number): (() => Promise<string>) | null {
  const prefix = String(patternId).padStart(2, "0") + "-";
  const key = Object.keys(diagramSources).find((k) =>
    k.includes("/" + prefix),
  );
  return key ? diagramSources[key] : null;
}

export function HLDDiagram({ patternId, patternSlug, asciiFallback }: Props) {
  const { theme } = useTheme();
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAscii, setShowAscii] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSvg(null);
    setError(null);
    const loader = findDiagramSource(patternId);
    if (!loader) {
      setError("no-diagram");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const source = await loader();
        if (cancelled) return;
        const id = `m-${patternId}-${patternSlug}-${theme}-${Date.now()}`;
        const rendered = await renderMermaid(id, source, theme);
        if (!cancelled) setSvg(rendered);
      } catch (e) {
        console.error("Mermaid render failed:", e);
        if (!cancelled) setError(String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patternId, patternSlug, theme]);

  const hasMermaid = svg !== null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="chip">
          {hasMermaid && !showAscii ? "Rendered" : "ASCII"}
        </span>
        {hasMermaid && (
          <button
            type="button"
            className="btn"
            onClick={() => setShowAscii((s) => !s)}
          >
            {showAscii ? "Show diagram" : "View source"}
          </button>
        )}
      </div>

      {!hasMermaid || showAscii ? (
        <pre className="ascii-diagram">{asciiFallback}</pre>
      ) : (
        <div
          ref={hostRef}
          className="mermaid-host"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}

      {error && error !== "no-diagram" && (
        <div className="text-xs text-[var(--color-warn)] mt-2">
          Diagram render failed; showing ASCII source. {error}
        </div>
      )}
    </div>
  );
}
