import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { HLDDiagram } from "./HLDDiagram";
import { AuxDiagram } from "./AuxDiagram";
import { splitFollowUps, splitDetailedDesign } from "../lib/contentSplit";
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

const Markdown = ({ children }: { children: string }) => (
  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
    {children}
  </ReactMarkdown>
);

function FollowUpFlashcards({ content }: { content: string }) {
  const qnas = splitFollowUps(content);
  if (qnas.length === 0) return <Markdown>{content}</Markdown>;
  return (
    <div className="space-y-2">
      <div className="text-xs text-[var(--color-text-dim)] mb-1">
        {qnas.length} question{qnas.length === 1 ? "" : "s"} — click to reveal
        the answer
      </div>
      {qnas.map((qna, i) => (
        <FlashCard key={i} index={i + 1} qna={qna} />
      ))}
    </div>
  );
}

function FlashCard({
  index,
  qna,
}: {
  index: number;
  qna: { question: string; answer: string };
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-[var(--color-panel-2)] transition-colors"
      >
        <span className="text-xs font-mono text-[var(--color-text-dim)] mt-0.5 flex-shrink-0">
          Q{index}
        </span>
        <span className="flex-1 text-[var(--color-text-strong)] font-medium">
          {qna.question}
        </span>
        <span className="text-[var(--color-text-dim)] flex-shrink-0">
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-[var(--color-border)] markdown-body text-sm">
          <Markdown>{qna.answer}</Markdown>
        </div>
      )}
    </div>
  );
}

function DetailedDesignAccordion({ content }: { content: string }) {
  const blocks = splitDetailedDesign(content);
  if (blocks.length === 0) return <Markdown>{content}</Markdown>;
  return (
    <div className="space-y-2">
      <div className="text-xs text-[var(--color-text-dim)] mb-1">
        {blocks.length} subsection{blocks.length === 1 ? "" : "s"} — click to
        expand
      </div>
      {blocks.map((b, i) => (
        <SubBlockCard key={i} index={i + 1} block={b} />
      ))}
    </div>
  );
}

function SubBlockCard({
  index,
  block,
}: {
  index: number;
  block: { heading: string; body: string };
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-[var(--color-panel-2)] transition-colors"
      >
        <span className="text-xs font-mono text-[var(--color-text-dim)] mt-0.5 flex-shrink-0">
          {String(index).padStart(2, "0")}
        </span>
        <span className="flex-1 text-[var(--color-text-strong)] font-medium">
          {block.heading}
        </span>
        <span className="text-[var(--color-text-dim)] flex-shrink-0">
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-[var(--color-border)] markdown-body text-sm">
          <Markdown>{block.body}</Markdown>
        </div>
      )}
    </div>
  );
}

export function Section({
  patternId,
  patternSlug,
  section,
  expanded,
  onToggle,
}: Props) {
  const isHld = section.name === "High-Level Design";
  const isDataModel = section.name === "Data Model";
  const isDetailedDesign = section.name === "Detailed Design";
  const isFollowUps = section.name === "Potential Follow-Up Questions";

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
                  <Markdown>{hldParts.prose}</Markdown>
                </div>
              )}
            </>
          ) : isFollowUps ? (
            <FollowUpFlashcards content={section.content} />
          ) : isDetailedDesign ? (
            <>
              <DetailedDesignAccordion content={section.content} />
              <AuxDiagram
                patternId={patternId}
                patternSlug={patternSlug}
                kind="sequence"
                label="Sequence — happy path"
              />
            </>
          ) : isDataModel ? (
            <>
              <Markdown>{section.content}</Markdown>
              <AuxDiagram
                patternId={patternId}
                patternSlug={patternSlug}
                kind="erd"
                label="Schema overview"
              />
            </>
          ) : (
            <Markdown>{section.content}</Markdown>
          )}
        </div>
      )}
    </div>
  );
}
