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

export type SourceId = "patterns" | "neetcode" | "java" | "kotlin" | "csharp" | "go" | "python" | "postgres" | "sql-practice" | "event-sourcing" | "kafka" | "cqrs" | "ddia" | "cassandra" | "redis";

export interface SourceConfig {
  id: SourceId;
  file: string;
  title: string;
  itemLabel: string;
  itemsPlural: string;
  sectionOrder: string[];
  defaultRevealedSections: string[];
  storagePrefix: string;
  /**
   * Top-level grouping for the home library / web sidebar. Sources sharing
   * a category render under one heading. Free-form string ("Languages",
   * "System Design", "DSA", "Behavioural", …). Sources without a category
   * fall under "Other".
   */
  category?: string;
  /** Markdown heading level for items. Default 3 (### N. Title). */
  itemHeadingLevel?: number;
  /** Markdown heading level for sections. Default 4 (#### Section). */
  sectionHeadingLevel?: number;
  /** When true, items don't need explicit "N." numbering — IDs assigned by encounter order. */
  autoNumberItems?: boolean;
}

export const SOURCES: Record<SourceId, SourceConfig> = {
  patterns: {
    id: "patterns",
    file: "/patterns.md",
    title: "System Design",
    category: "System Design",
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
    category: "DSA",
    itemLabel: "Problem",
    itemsPlural: "interview problems",
    storagePrefix: "sdf:neetcode",
    defaultRevealedSections: ["Problem"],
    sectionOrder: ["Problem", "Pattern", "Explanation", "Solution"],
  },
  java: {
    id: "java",
    file: "/java-interview-primer.md",
    title: "Java",
    category: "Languages",
    itemLabel: "Topic",
    itemsPlural: "Java topics",
    storagePrefix: "ip:java",
    defaultRevealedSections: [],
    itemHeadingLevel: 2,
    sectionHeadingLevel: 3,
    autoNumberItems: true,
    sectionOrder: [],
  },
  kotlin: {
    id: "kotlin",
    file: "/kotlin-interview-primer.md",
    title: "Kotlin",
    category: "Languages",
    itemLabel: "Topic",
    itemsPlural: "Kotlin topics",
    storagePrefix: "ip:kotlin",
    defaultRevealedSections: [],
    itemHeadingLevel: 2,
    sectionHeadingLevel: 3,
    autoNumberItems: true,
    sectionOrder: [],
  },
  csharp: {
    id: "csharp",
    file: "/csharp-interview-primer.md",
    title: "C#",
    category: "Languages",
    itemLabel: "Topic",
    itemsPlural: "C# topics",
    storagePrefix: "ip:csharp",
    defaultRevealedSections: [],
    itemHeadingLevel: 2,
    sectionHeadingLevel: 3,
    autoNumberItems: true,
    sectionOrder: [],
  },
  go: {
    id: "go",
    file: "/go-interview-primer.md",
    title: "Go",
    category: "Languages",
    itemLabel: "Topic",
    itemsPlural: "Go topics",
    storagePrefix: "ip:go",
    defaultRevealedSections: [],
    itemHeadingLevel: 2,
    sectionHeadingLevel: 3,
    autoNumberItems: true,
    sectionOrder: [],
  },
  python: {
    id: "python",
    file: "/python-interview-primer.md",
    title: "Python",
    category: "Languages",
    itemLabel: "Topic",
    itemsPlural: "Python topics",
    storagePrefix: "ip:python",
    defaultRevealedSections: [],
    itemHeadingLevel: 2,
    sectionHeadingLevel: 3,
    autoNumberItems: true,
    sectionOrder: [],
  },
  postgres: {
    id: "postgres",
    file: "/postgres-interview-primer.md",
    title: "Postgres",
    category: "Databases",
    itemLabel: "Topic",
    itemsPlural: "Postgres topics",
    storagePrefix: "ip:postgres",
    defaultRevealedSections: [],
    itemHeadingLevel: 2,
    sectionHeadingLevel: 3,
    autoNumberItems: true,
    sectionOrder: [],
  },
  "sql-practice": {
    id: "sql-practice",
    file: "/sql-practice.md",
    title: "SQL Practice",
    category: "Databases",
    itemLabel: "Problem",
    itemsPlural: "SQL problems",
    storagePrefix: "sdf:sql-practice",
    defaultRevealedSections: ["Problem"],
    sectionOrder: ["Problem", "Pattern", "Explanation", "Solution"],
  },
  "event-sourcing": {
    id: "event-sourcing",
    file: "/event-sourcing-primer.md",
    title: "Event Sourcing",
    category: "Architecture",
    itemLabel: "Topic",
    itemsPlural: "Event Sourcing topics",
    storagePrefix: "ip:event-sourcing",
    defaultRevealedSections: [],
    itemHeadingLevel: 2,
    sectionHeadingLevel: 3,
    autoNumberItems: true,
    sectionOrder: [],
  },
  kafka: {
    id: "kafka",
    file: "/kafka-interview-primer.md",
    title: "Kafka",
    category: "Messaging",
    itemLabel: "Topic",
    itemsPlural: "Kafka topics",
    storagePrefix: "ip:kafka",
    defaultRevealedSections: [],
    itemHeadingLevel: 2,
    sectionHeadingLevel: 3,
    autoNumberItems: true,
    sectionOrder: [],
  },
  cqrs: {
    id: "cqrs",
    file: "/cqrs-primer.md",
    title: "CQRS",
    category: "Architecture",
    itemLabel: "Topic",
    itemsPlural: "CQRS topics",
    storagePrefix: "ip:cqrs",
    defaultRevealedSections: [],
    itemHeadingLevel: 2,
    sectionHeadingLevel: 3,
    autoNumberItems: true,
    sectionOrder: [],
  },
  ddia: {
    id: "ddia",
    file: "/ddia-scenarios.md",
    title: "DDIA Scenarios",
    category: "System Design",
    itemLabel: "Scenario",
    itemsPlural: "DDIA scenarios",
    storagePrefix: "sdf:ddia",
    defaultRevealedSections: ["Problem"],
    itemHeadingLevel: 3,
    sectionHeadingLevel: 4,
    autoNumberItems: false,
    sectionOrder: [
      "Problem",
      "Summary",
      "Clarifying Questions",
      "Requirements",
      "Scale Estimate",
      "High-Level Design",
      "Data Model",
      "Detailed Design",
      "Failure Modes",
      "Talking Points for the Interview",
    ],
  },
  cassandra: {
    id: "cassandra",
    file: "/cassandra-primer.md",
    title: "Cassandra",
    category: "Databases",
    itemLabel: "Topic",
    itemsPlural: "Cassandra topics",
    storagePrefix: "ip:cassandra",
    defaultRevealedSections: [],
    itemHeadingLevel: 2,
    sectionHeadingLevel: 3,
    autoNumberItems: true,
    sectionOrder: [],
  },
  redis: {
    id: "redis",
    file: "/redis-primer.md",
    title: "Redis",
    category: "Databases",
    itemLabel: "Topic",
    itemsPlural: "Redis topics",
    storagePrefix: "ip:redis",
    defaultRevealedSections: [],
    itemHeadingLevel: 2,
    sectionHeadingLevel: 3,
    autoNumberItems: true,
    sectionOrder: [],
  },
};

const FRONTMATTER_RE = /^---\n[\s\S]*?\n---\n+/;

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function parseContent(markdown: string, cfg?: SourceConfig): Pattern[] {
  const itemLevel = cfg?.itemHeadingLevel ?? 3;
  const sectionLevel = cfg?.sectionHeadingLevel ?? 4;
  const autoNumber = cfg?.autoNumberItems ?? false;

  const itemHashes = "#".repeat(itemLevel);
  const sectionHashes = "#".repeat(sectionLevel);

  const numberedItemRe = new RegExp(`^${itemHashes} (\\d+)\\.\\s+(.+)$`);
  const plainItemRe = new RegExp(`^${itemHashes} (.+)$`);
  const sectionRe = new RegExp(`^${sectionHashes} (.+)$`);

  const stripped = markdown.replace(FRONTMATTER_RE, "");
  const lines = stripped.split("\n");

  const patterns: Pattern[] = [];
  let current: Pattern | null = null;
  let currentSection: Section | null = null;
  let buffer: string[] = [];
  let nextAutoId = 1;

  const flushSection = () => {
    if (current && currentSection) {
      currentSection.content = buffer.join("\n").trim();
      current.sections.push(currentSection);
    }
    buffer = [];
    currentSection = null;
  };

  for (const line of lines) {
    let id: number | null = null;
    let title: string | null = null;

    if (autoNumber) {
      const m = line.match(plainItemRe);
      if (m) {
        id = nextAutoId++;
        title = m[1].trim();
      }
    } else {
      const m = line.match(numberedItemRe);
      if (m) {
        id = parseInt(m[1], 10);
        title = m[2].trim();
      }
    }

    if (id !== null && title !== null) {
      flushSection();
      if (current) patterns.push(current);
      current = { id, slug: slugify(title), title, sections: [] };
      continue;
    }

    const sectionMatch = line.match(sectionRe);
    if (sectionMatch && current) {
      flushSection();
      currentSection = { name: sectionMatch[1].trim(), content: "" };
      continue;
    }

    if (currentSection) buffer.push(line);
  }

  flushSection();
  if (current) patterns.push(current);

  // Drop items with no content sections — usually trailing "Related Notes" / appendix headings
  return patterns.filter((p) => p.sections.length > 0);
}

export function sortSections(
  sections: Section[],
  sectionOrder: string[],
): Section[] {
  if (sectionOrder.length === 0) return sections;
  const order = new Map(sectionOrder.map((n, i) => [n, i]));
  return [...sections].sort((a, b) => {
    const ai = order.get(a.name) ?? 999;
    const bi = order.get(b.name) ?? 999;
    return ai - bi;
  });
}
