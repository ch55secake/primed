import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { HLDDiagram } from "./HLDDiagram";
import type { Section as SectionType } from "../lib/parser";

interface Props {
  patternId: number;
  patternSlug: string;
  section: SectionType;
  expanded: boolean;
  onToggle: () => void;
}

interface HldParts {
  ascii: string;
  prose: string;
}

function splitHldContent(content: string): HldParts {
  const fenceRegex = /```[a-z]*\n?([\s\S]*?)```/g;
  const asciiBlocks: string[] = [];
  const prose = content.replace(fenceRegex, (match, body) => {
    if (/[┌│└┘─→↓↑←┐]/.test(body)) {
      asciiBlocks.push(body.trim());
      return "";
    }
    return match;
  });
  return { ascii: asciiBlocks.join("\n\n"), prose: prose.trim() };
}

export function Section({
  patternId,
  patternSlug,
  section,
  expanded,
  onToggle,
}: Props) {
  const isHld = section.name === "High-Level Design";
  const hldParts = isHld ? splitHldContent(section.content) : null;

  return (
    <div className="section-card">
      <div
        className="section-header"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") onToggle();
        }}
      >
        <h3>
          <span className="text-[var(--color-text-dim)] mr-2">
            {expanded ? "▾" : "▸"}
          </span>
          {section.name}
        </h3>
      </div>
      {expanded && (
        <div className="section-body markdown-body">
          {isHld && hldParts ? (
            <>
              <HLDDiagram
                patternId={patternId}
                patternSlug={patternSlug}
                asciiFallback={hldParts.ascii}
              />
              {hldParts.prose && (
                <div className="mt-4">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                  >
                    {hldParts.prose}
                  </ReactMarkdown>
                </div>
              )}
            </>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {section.content}
            </ReactMarkdown>
          )}
        </div>
      )}
    </div>
  );
}
