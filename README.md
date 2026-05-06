# Interview Prep

Interactive study site for software engineering interviews. Three sources, all backed by markdown notes from `~/Documents/private-vault/`:

- **System Design** — 41 system design interview patterns. Each pattern's High-Level Design renders as a Mermaid diagram (dark theme); other sections collapse / reveal incrementally.
- **NeetCode 150** — 150 LeetCode problems with multi-language solutions (Python / Rust / Go / C++) via tabs.
- **Java** — 135 senior-Java interview questions across 15 topic areas (Core Java, Java 8+, Collections, Concurrency, GC, Spring, JPA, Patterns, Testing, System Design, Security, Kafka, JPA Extras, Testing Deep, Common Pitfalls).

## Run

```bash
bun install
bun run dev
```

Open http://localhost:5173.

## Sources

Three markdown files in `public/` drive the three tabs:

- `public/patterns.md` — system design patterns
- `public/neetcode-150.md` — DSA problems
- `public/java-interview-primer.md` — Java prep

These are committed copies of the canonical Obsidian notes (so the Vercel build can read them — Vercel can't follow symlinks outside the repo). To re-sync from Obsidian after editing the source notes:

```bash
bun run sync-content
```

## Controls

- Click any section header to toggle.
- `Space` — reveal next section in canonical order.
- `Esc` — collapse the most recently revealed section.
- `←` / `→` (or `k` / `j`) — jump between items in the active source.
- Source tabs at the top switch between System Design / NeetCode / Java.
- Per-item reveal state persists in `localStorage`.

## Diagram authoring (System Design only)

HLD diagrams live in `src/lib/diagrams/{NN}-{slug}.mmd`. Mermaid `flowchart` syntax. Theme variables in `src/theme/mermaidTheme.ts`. Edit a `.mmd` file and Vite hot-reloads. Missing diagrams fall back to the ASCII in the source markdown.

## Deploy

Hosted on Vercel. Auto-deploys on push to `main`.
