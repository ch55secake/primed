import type { Pattern } from "./parser";

export interface Page {
  /** Markdown source for this page (joined back together for the renderer). */
  markdown: string;
  /** True if this page contains a single block that exceeds the viewport — caller should make it scrollable. */
  oversized: boolean;
}

const HEIGHT_HEADING_H2 = 40;
const HEIGHT_HEADING_H3 = 32;
const HEIGHT_HEADING_H4 = 28;
const HEIGHT_LINE_PARAGRAPH = 22;
const HEIGHT_LINE_CODE = 18;
const HEIGHT_LINE_TABLE = 32;
const HEIGHT_PADDING_BLOCK = 14;
const HEIGHT_FENCE_OVERHEAD = 24;
const CHARS_PER_LINE = 42;

/**
 * Split markdown into top-level blocks (paragraphs / headings / fenced code / tables).
 * Each block is preserved verbatim — never split internally.
 */
function splitIntoBlocks(md: string): string[] {
  const lines = md.split("\n");
  const blocks: string[] = [];
  let buffer: string[] = [];
  let inFence = false;

  const flush = () => {
    if (buffer.length === 0) return;
    const block = buffer.join("\n").trim();
    if (block) blocks.push(block);
    buffer = [];
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      // Fence boundary — keep within current block, but a new fence opening
      // should start a new block if previous content exists.
      if (!inFence && buffer.length > 0 && !buffer[buffer.length - 1].startsWith("```")) {
        flush();
      }
      buffer.push(line);
      inFence = !inFence;
      if (!inFence) {
        // Fence just closed — emit the code block as its own block
        flush();
      }
      continue;
    }

    if (inFence) {
      buffer.push(line);
      continue;
    }

    if (line.trim() === "") {
      flush();
      continue;
    }

    buffer.push(line);
  }
  flush();
  return blocks;
}

function estimateHeight(block: string): number {
  const trimmed = block.trim();

  // Fenced code block
  if (trimmed.startsWith("```")) {
    const innerLines = trimmed.split("\n").length - 2; // exclude opening + closing fences
    return HEIGHT_FENCE_OVERHEAD + innerLines * HEIGHT_LINE_CODE + HEIGHT_PADDING_BLOCK;
  }

  // Headings
  if (trimmed.startsWith("## ")) return HEIGHT_HEADING_H2 + HEIGHT_PADDING_BLOCK;
  if (trimmed.startsWith("### ")) return HEIGHT_HEADING_H3 + HEIGHT_PADDING_BLOCK;
  if (trimmed.startsWith("#### ")) return HEIGHT_HEADING_H4 + HEIGHT_PADDING_BLOCK;

  // Tables — count rows
  if (trimmed.includes("|") && trimmed.split("\n").every((l) => l.includes("|"))) {
    const rows = trimmed.split("\n").length;
    return rows * HEIGHT_LINE_TABLE + HEIGHT_PADDING_BLOCK;
  }

  // Paragraphs / lists / blockquotes — estimate wrapped lines
  const rawLines = trimmed.split("\n");
  let totalWrapped = 0;
  for (const line of rawLines) {
    const wrapped = Math.max(1, Math.ceil(line.length / CHARS_PER_LINE));
    totalWrapped += wrapped;
  }
  return totalWrapped * HEIGHT_LINE_PARAGRAPH + HEIGHT_PADDING_BLOCK;
}

/**
 * Convert an item's full content into a list of pages whose total estimated
 * height fits the viewport. Blocks are never split across pages. A block that
 * exceeds the viewport on its own gets a dedicated page marked `oversized`
 * (caller should wrap that page in a ScrollView).
 */
export function paginate(item: Pattern, viewportHeight: number): Page[] {
  const blocks: string[] = [];

  for (const section of item.sections) {
    blocks.push(`## ${section.name}`);
    blocks.push(...splitIntoBlocks(section.content));
  }

  if (blocks.length === 0) return [{ markdown: "", oversized: false }];

  const pages: Page[] = [];
  let current: string[] = [];
  let used = 0;

  for (const block of blocks) {
    const h = estimateHeight(block);

    if (h > viewportHeight) {
      // Block is too tall on its own — flush current, give this block its own page
      if (current.length > 0) {
        pages.push({ markdown: current.join("\n\n"), oversized: false });
        current = [];
        used = 0;
      }
      pages.push({ markdown: block, oversized: true });
      continue;
    }

    if (used + h > viewportHeight && current.length > 0) {
      pages.push({ markdown: current.join("\n\n"), oversized: false });
      current = [];
      used = 0;
    }

    current.push(block);
    used += h;
  }

  if (current.length > 0) {
    pages.push({ markdown: current.join("\n\n"), oversized: false });
  }

  return pages;
}
