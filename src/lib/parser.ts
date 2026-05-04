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

export type SourceId = "patterns" | "neetcode";

export interface SourceConfig {
  id: SourceId;
  file: string;
  title: string;
  itemLabel: string;
  itemsPlural: string;
  sectionOrder: string[];
  defaultRevealedSections: string[];
  storagePrefix: string;
}

export const SOURCES: Record<SourceId, SourceConfig> = {
  patterns: {
    id: "patterns",
    file: "/patterns.md",
    title: "System Design Flash",
    itemLabel: "Pattern",
    itemsPlural: "interview patterns",
    storagePrefix: "sdf:patterns",
    defaultRevealedSections: ["Problem"],
    sectionOrder: [
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
      "Failure Modes",
      "Observability — Key Metrics & SLOs",
      "Multi-Region & DR",
      "Common Mistakes / Anti-patterns",
      "Talking Points for the Interview",
    ],
  },
  neetcode: {
    id: "neetcode",
    file: "/neetcode-150.md",
    title: "NeetCode 150",
    itemLabel: "Problem",
    itemsPlural: "interview problems",
    storagePrefix: "sdf:neetcode",
    defaultRevealedSections: ["Problem"],
    sectionOrder: ["Problem", "Pattern", "Explanation", "Solution"],
  },
};

const FRONTMATTER_RE = /^---\n[\s\S]*?\n---\n+/;
const PATTERN_HEADER_RE = /^### (\d+)\.\s+(.+)$/;
const SECTION_HEADER_RE = /^#### (.+)$/;

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function parseContent(markdown: string): Pattern[] {
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

export function sortSections(
  sections: Section[],
  sectionOrder: string[],
): Section[] {
  const order = new Map(sectionOrder.map((n, i) => [n, i]));
  return [...sections].sort((a, b) => {
    const ai = order.get(a.name) ?? 999;
    const bi = order.get(b.name) ?? 999;
    return ai - bi;
  });
}
