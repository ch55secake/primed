# PRIMED

Personal interview-prep system. Web app for desk study. Sources backed by markdown files under `web/public/`.

- **System Design** — system design patterns and full example questions (HLD diagrams, requirements, API contracts, data models).
- **DSA** — NeetCode 150 problems with multi-language solutions (Python / Rust / Go / C++), plus DSA patterns primer.
- **Languages** — Java, Kotlin, C#, Go, Python interview primers. Senior-level Q+A, topic summaries, and question cards.
- **Databases** — Postgres primer + SQL practice problems.

## Repo layout

```
primed/
├── web/                ← Vite + React web app
│   ├── public/         ← markdown primers + manifest.json
│   └── src/
├── packages/parser/    ← shared markdown → items parser
└── scripts/            ← content sync helpers
```

## Run

```bash
bun install            # install all workspaces
bun run dev            # web dev server → http://localhost:5173
bun run build          # production build → web/dist/
bun run sync-content   # pull latest markdown from Obsidian (optional, needs VAULT_PATH)
```

## Deploy

Hosted on Vercel. Push to `main` → auto-deploys. Vercel config is in the Vercel dashboard (no `vercel.json` in repo).

## Content model

Every primer is a single markdown file at `web/public/<name>-interview-primer.md`:

- `## Topic` → reader item (sidebar entry, swipeable)
- `### Question` → collapsible card inside that topic

`web/public/manifest.json` declares each source. The parser maps headings to the reader UI via `itemHeadingLevel: 2` / `sectionHeadingLevel: 3`.

## Content authoring

### Summary section (required for every topic)

Every `## Topic` must open with a `### Summary` card — ~700-900 words, framing the topic before Q1. Reference: `web/public/java-interview-primer.md` → `## Core Java` → `### Summary`.

Structure:
1. `### Summary` (the only `###` heading before the questions)
2. `**What this topic covers**`
3. `**Mental model**`
4. `**Key terms**`
5. `**Why interviewers ask this**`
6. `**Common confusions**`
7. `**What follows from this topic**`

**CRITICAL**: Use `**bold**` for subsection headers inside Summary, never `###`. A `###` creates a new parser section.

**Tone**: senior engineer briefing. Opinions, tradeoffs, concrete examples — not a textbook glossary.

### Adding a new primer

1. Write `web/public/<name>-interview-primer.md`. Every `## Topic` opens with `### Summary`.
2. Register in `web/public/manifest.json`. Pattern matches existing language entries.
3. Commit + push to `main`. Vercel auto-deploys.

### Adding a topic to an existing primer

1. Add `## New Topic` at the right position with a `### Summary` card.
2. Add `### Q1.`, `### Q2.`, … underneath.
3. Commit + push.

## Reader UX

- Tap / click section header to reveal.
- `Space` — reveal next section.
- `Esc` — collapse all (web).
- `←` / `→` (or `k` / `j`) — jump between items.
- Per-item reveal state persists in `localStorage`.
- Desktop (≥ 900px): persistent left sidebar. Narrow: stack navigation.
