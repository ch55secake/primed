export interface Section {
  name: string;
  content: string;
}

export interface Pattern {
  id: number;
  slug: string;
  title: string;
  sections: Section[];
}

const FRONTMATTER_RE = /^---\n[\s\S]*?\n---\n+/;
const PATTERN_HEADER_RE = /^### (\d+)\.\s+(.+)$/;
const SECTION_HEADER_RE = /^#### (.+)$/;

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function parsePatterns(markdown: string): Pattern[] {
  const stripped = markdown.replace(FRONTMATTER_RE, "");
  const lines = stripped.split("\n");

  const patterns: Pattern[] = [];
  let current: Pattern | null = null;
  let currentSection: Section | null = null;
  let buffer: string[] = [];

  const flushSection = () => {
    if (current && currentSection) {
      currentSection.content = buffer.join("\n").trim();
      current.sections.push(currentSection);
    }
    buffer = [];
    currentSection = null;
  };

  for (const line of lines) {
    const patternMatch = line.match(PATTERN_HEADER_RE);
    if (patternMatch) {
      flushSection();
      if (current) patterns.push(current);
      const id = parseInt(patternMatch[1], 10);
      const title = patternMatch[2].trim();
      current = { id, slug: slugify(title), title, sections: [] };
      continue;
    }

    const sectionMatch = line.match(SECTION_HEADER_RE);
    if (sectionMatch && current) {
      flushSection();
      currentSection = { name: sectionMatch[1].trim(), content: "" };
      continue;
    }

    if (currentSection) buffer.push(line);
  }

  flushSection();
  if (current) patterns.push(current);

  return patterns;
}

export const CANONICAL_SECTION_ORDER = [
  "Problem",
  "Summary",
  "Clarifying Questions",
  "Requirements",
  "Scale Estimate",
  "API Contract",
  "High-Level Design",
  "Data Model",
  "Algorithm Comparison",
  "Detailed Design",
  "Potential Follow-Up Questions",
  "Bottlenecks & Mitigations",
  "Talking Points for the Interview",
];

export function sortSections(sections: Section[]): Section[] {
  const order = new Map(CANONICAL_SECTION_ORDER.map((n, i) => [n, i]));
  return [...sections].sort((a, b) => {
    const ai = order.get(a.name) ?? 999;
    const bi = order.get(b.name) ?? 999;
    return ai - bi;
  });
}
