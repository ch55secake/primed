import { useEffect, useMemo, useState } from "react";
import hljs from "highlight.js/lib/core";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import go from "highlight.js/lib/languages/go";
import cpp from "highlight.js/lib/languages/cpp";

hljs.registerLanguage("python", python);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("go", go);
hljs.registerLanguage("cpp", cpp);

const LANG_KEY = "sdf:codeLang";
const SUPPORTED = ["python", "rust", "go", "cpp"] as const;
type Lang = (typeof SUPPORTED)[number];

const LANG_LABELS: Record<Lang, string> = {
  python: "Python",
  rust: "Rust",
  go: "Go",
  cpp: "C++",
};

const LANG_ALIASES: Record<string, Lang> = {
  python: "python",
  py: "python",
  rust: "rust",
  rs: "rust",
  go: "go",
  golang: "go",
  cpp: "cpp",
  "c++": "cpp",
  cxx: "cpp",
};

export interface CodeBlock {
  lang: Lang;
  code: string;
}

const CODE_FENCE_RE = /```\s*([A-Za-z+]+)\s*\n([\s\S]*?)```/g;

export function extractCodeBlocks(content: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  let match: RegExpExecArray | null;
  CODE_FENCE_RE.lastIndex = 0;
  while ((match = CODE_FENCE_RE.exec(content)) !== null) {
    const raw = match[1].toLowerCase();
    const normalized = LANG_ALIASES[raw];
    if (!normalized) continue;
    blocks.push({ lang: normalized, code: match[2].replace(/\s+$/, "") });
  }
  return blocks;
}

function loadLang(): Lang {
  try {
    const raw = localStorage.getItem(LANG_KEY);
    if (raw && (SUPPORTED as readonly string[]).includes(raw)) return raw as Lang;
  } catch {
    // ignore
  }
  return "python";
}

export function CodeTabs({ blocks }: { blocks: CodeBlock[] }) {
  const available = useMemo(() => {
    const seen = new Set<Lang>();
    return blocks.filter((b) => {
      if (seen.has(b.lang)) return false;
      seen.add(b.lang);
      return true;
    });
  }, [blocks]);

  const [active, setActive] = useState<Lang>(() => {
    const preferred = loadLang();
    if (available.some((b) => b.lang === preferred)) return preferred;
    return available[0]?.lang ?? "python";
  });

  useEffect(() => {
    if (!available.some((b) => b.lang === active) && available[0]) {
      setActive(available[0].lang);
    }
  }, [available, active]);

  const onSelect = (lang: Lang) => {
    setActive(lang);
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      // ignore
    }
  };

  const current = available.find((b) => b.lang === active) ?? available[0];

  if (!current) {
    return (
      <div className="text-sm text-[var(--color-text-dim)] italic">
        No solutions available yet.
      </div>
    );
  }

  const highlighted = useMemo(() => {
    try {
      return hljs.highlight(current.code, { language: current.lang }).value;
    } catch {
      return current.code;
    }
  }, [current]);

  return (
    <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
      <div
        role="tablist"
        className="flex items-center gap-1 px-2 py-1.5 bg-[var(--color-panel-2)] border-b border-[var(--color-border)]"
      >
        {SUPPORTED.map((lang) => {
          const has = available.some((b) => b.lang === lang);
          const isActive = current.lang === lang;
          return (
            <button
              key={lang}
              role="tab"
              type="button"
              aria-selected={isActive}
              disabled={!has}
              onClick={() => has && onSelect(lang)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                isActive
                  ? "bg-[var(--color-panel)] text-[var(--color-text-strong)] border border-[var(--color-accent)]"
                  : has
                    ? "text-[var(--color-text-dim)] hover:text-[var(--color-text-strong)] hover:bg-[var(--color-panel)] border border-transparent"
                    : "text-[var(--color-border)] cursor-not-allowed border border-transparent"
              }`}
            >
              {LANG_LABELS[lang]}
            </button>
          );
        })}
      </div>
      <pre className="m-0 overflow-x-auto">
        <code
          className={`hljs language-${current.lang} block p-4 text-sm leading-relaxed`}
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </pre>
    </div>
  );
}
