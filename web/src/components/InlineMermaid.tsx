import { useEffect, useState } from "react";
import { renderMermaid } from "../theme/mermaidTheme";
import { useTheme } from "../theme/ThemeContext";

let counter = 0;
const nextId = () => `inline-${++counter}`;

interface Props {
  source: string;
}

export function InlineMermaid({ source }: Props) {
  const { theme } = useTheme();
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSvg(null);
    setError(null);
    (async () => {
      try {
        const id = `${nextId()}-${theme}`;
        const out = await renderMermaid(id, source.trim(), theme);
        if (!cancelled) setSvg(out);
      } catch (e) {
        console.error("Inline mermaid render failed:", e);
        if (!cancelled) setError(String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source, theme]);

  if (error) {
    return (
      <div className="my-3">
        <div className="text-xs text-[var(--color-warn)] mb-1">
          Diagram render failed; showing source:
        </div>
        <pre className="ascii-diagram">{source}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="text-xs text-[var(--color-text-dim)] my-3">
        Rendering diagram…
      </div>
    );
  }

  return (
    <div className="mermaid-host my-3" dangerouslySetInnerHTML={{ __html: svg }} />
  );
}
