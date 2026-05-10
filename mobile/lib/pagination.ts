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

/**
 * Approximate average glyph advance for the reader's body font (15pt
 * proportional). Used together with the viewport width to derive a
 * realistic chars-per-line so the height estimator doesn't drastically
 * over-count paragraph wraps on wide displays (which produced near-empty
 * pages on phones and especially on 1264px-wide e-readers).
 */
const AVG_CHAR_WIDTH_PX = 8;
const PAGE_HORIZONTAL_PADDING = 32; // 16 each side, matches Reader.styles.pageContent
/** Code blocks render in a monospace font that's narrower than the body font. */
const AVG_CODE_CHAR_WIDTH_PX = 7;

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

function estimateHeight(block: string, viewportWidth: number): number {
  const trimmed = block.trim();
  const usableWidth = Math.max(200, viewportWidth - PAGE_HORIZONTAL_PADDING);
  const charsPerLine = Math.max(20, Math.floor(usableWidth / AVG_CHAR_WIDTH_PX));
  const charsPerCodeLine = Math.max(
    20,
    Math.floor(usableWidth / AVG_CODE_CHAR_WIDTH_PX),
  );

  // Fenced code block
  if (trimmed.startsWith("```")) {
    const inner = trimmed.split("\n").slice(1, -1); // exclude opening + closing fences
    let lines = 0;
    for (const l of inner) {
      lines += Math.max(1, Math.ceil(l.length / charsPerCodeLine));
    }
    return HEIGHT_FENCE_OVERHEAD + lines * HEIGHT_LINE_CODE + HEIGHT_PADDING_BLOCK;
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

  // Paragraphs / lists / blockquotes — estimate wrapped lines using the
  // width-derived chars-per-line so the same prose paginates differently on
  // a 1080-wide phone and a 1264-wide e-reader.
  const rawLines = trimmed.split("\n");
  let totalWrapped = 0;
  for (const line of rawLines) {
    totalWrapped += Math.max(1, Math.ceil(line.length / charsPerLine));
  }
  return totalWrapped * HEIGHT_LINE_PARAGRAPH + HEIGHT_PADDING_BLOCK;
}

/**
 * Convert an item's full content into a list of pages whose total estimated
 * height fits the viewport. Blocks are never split across pages. A block that
 * exceeds the viewport on its own gets a dedicated page marked `oversized`
 * (caller should wrap that page in a ScrollView).
 */
export function paginate(
  item: Pattern,
  viewportHeight: number,
  viewportWidth: number,
): Page[] {
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
    const h = estimateHeight(block, viewportWidth);

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
