export interface QnA {
  question: string;
  answer: string;
}

export interface SubBlock {
  heading: string;
  body: string;
}

const Q_LINE_RE = /^\*\*Q:\s*(.+?)\*\*\s*$/;

/**
 * Split a Follow-Ups section into individual Q&A pairs.
 * Each pair: a `**Q: ...?**` line, then the answer paragraph(s) up to the next Q.
 */
export function splitFollowUps(content: string): QnA[] {
  const lines = content.split("\n");
  const out: QnA[] = [];
  let current: QnA | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (current) {
      current.answer = buffer.join("\n").trim();
      out.push(current);
    }
    buffer = [];
  };

  for (const line of lines) {
    const m = line.match(Q_LINE_RE);
    if (m) {
      flush();
      current = { question: m[1].trim(), answer: "" };
      continue;
    }
    if (current) buffer.push(line);
  }
  flush();
  return out;
}

/**
 * Split a Detailed Design section into sub-blocks at `**Heading.**` markers.
 * Each block: heading string + body markdown (everything until the next bold-heading line).
 *
 * Recognizes a "heading" as a paragraph-leading `**...**` followed by either:
 *  - end-of-line (the heading takes the whole line, body follows), or
 *  - the rest of the same line (heading + inline intro on one line).
 */
export function splitDetailedDesign(content: string): SubBlock[] {
  const lines = content.split("\n");
  const out: SubBlock[] = [];
  let current: SubBlock | null = null;
  let buffer: string[] = [];
  let inFence = false;

  const HEADING_RE = /^\*\*([^*]+?)\*\*([.:]?)\s*(.*)$/;

  const flush = () => {
    if (current) {
      current.body = buffer.join("\n").trim();
      out.push(current);
    }
    buffer = [];
  };

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      inFence = !inFence;
      buffer.push(line);
      continue;
    }

    if (!inFence) {
      const m = line.match(HEADING_RE);
      // Treat as a heading only if the bold runs to a sentence-ending or trailing colon — and
      // there is no content immediately preceding (start of paragraph).
      if (m && (m[2] === "." || m[2] === ":")) {
        flush();
        current = { heading: m[1].trim(), body: "" };
        if (m[3]) buffer.push(m[3]);
        continue;
      }
    }

    if (current) buffer.push(line);
    else {
      // Content before first heading: collect into a synthetic "Overview" block
      if (line.trim()) {
        current = { heading: "Overview", body: "" };
        buffer.push(line);
      }
    }
  }
  flush();

  // If only one synthetic Overview block exists with no real subheadings, return empty
  // so caller can fall back to plain markdown render.
  if (out.length === 1 && out[0].heading === "Overview") return [];
  return out;
}
