# DRILLY

Personal interview-prep system covering System Design, DSA, and Java. Web app for desk study, Android app for the commute. Three sources backed by markdown notes from `~/Documents/private-vault/`:

- **System Design** — 41 system design interview patterns. Each pattern's High-Level Design renders as a Mermaid diagram (dark theme); other sections collapse / reveal incrementally.
- **NeetCode 150** — 150 LeetCode problems with multi-language solutions (Python / Rust / Go / C++) via tabs.
- **Java** — 296 senior-Java interview questions across 35 topic areas (Core Java, Java 8+, Collections, Concurrency, JVM Internals, Lock-Free, Spring, JPA, Patterns, Testing, Security, Kafka, Build Tools, Cloud-Native, Networking, Resilience).

## Repo layout

```
drilly/
├── web/                ← Vite + React 19 web app
├── mobile/             ← Expo (React Native) Android app, e-reader paginated
├── packages/parser/    ← shared markdown → items parser
├── scripts/            ← sync from Obsidian
└── vercel.json         ← root-level build config
```

## Run

```bash
bun install            # install all workspaces (web + mobile + packages/parser)
bun run dev:web        # web dev server → http://localhost:5173
bun run dev:mobile     # Expo dev server (needs dev build for native modules)
bun run sync-content   # pull latest markdown from Obsidian into web/public + mobile/assets/content
```

## Web

`web/public/*.md` are committed copies of the canonical Obsidian notes (Vercel can't follow symlinks outside the repo). To resync:

```bash
bun run sync-content
```

**Controls:**
- Click any section header to toggle.
- `Space` — reveal next section in canonical order.
- `Esc` — collapse the most recently revealed section.
- `←` / `→` (or `k` / `j`) — jump between items in the active source.
- Per-item reveal state persists in `localStorage`.
- Mobile-friendly: drawer sidebar below 768px width.

## Mobile (Android)

Expo SDK 54 app. Offline-first: bundled markdown ships with the APK; pull-to-refresh fetches latest from the live web URL.

E-reader mode: each item paginated into viewport-fitting pages, swipe horizontally to advance, haptic tick on page change. Resumes at last-read page per item.

**Build a sideload APK:**
```bash
cd mobile
bunx eas-cli login                # one-time browser auth
bunx eas-cli init                 # links project to your EAS account
bunx eas-cli build --platform android --profile preview
```

EAS produces a download URL — open on your phone, install. Works fully offline.

## Diagram authoring (System Design only, web)

HLD diagrams live in `web/src/lib/diagrams/{NN}-{slug}.mmd`. Mermaid `flowchart` syntax. Theme variables in `web/src/theme/mermaidTheme.ts`. Edit a `.mmd` file and Vite hot-reloads. Missing diagrams fall back to the ASCII in the source markdown.

## Deploy

Web: hosted on Vercel, auto-deploys on push to `main`. See `vercel.json`.
Mobile: EAS build → sideload APK.

## Content authoring

### Primer shape

Each primer (Java, Postgres, C#, Kotlin, System Design Patterns) is a single markdown file under `web/public/*-interview-primer.md`. The parser maps headings to the reader UI:

- `## Topic` → a **topic** (left-sidebar entry, swipeable item in the reader)
- `### Question / Section` → a **collapsible card** inside that topic

Manifest (`web/public/manifest.json` + mirror at `mobile/assets/content/manifest.json`) declares each source with `itemHeadingLevel: 2`, `sectionHeadingLevel: 3`, `autoNumberItems: true`. The bundle mirror under `mobile/assets/content/` is the offline-first fallback for the native app — only Java / Kotlin / NeetCode / Patterns ship bundled; other primers are remote-only.

### Adding a Summary section to a topic (required for new content)

**Every topic must open with a `### Summary` card** — a 700-900 word chapter intro that frames what the questions probe before the reader hits Q1. The Summary card is auto-revealed on first visit (controlled by the `Auto-reveal Summary` setting; default on). This is the project's content authoring contract going forward.

Reference: `web/public/java-interview-primer.md` → `## Core Java` → `### Summary`. Match that depth and structure exactly. The Summary structure is:

1. `### Summary` (H3 heading — the only `###` in the block)
2. `**What this topic covers**` — one paragraph framing the topic
3. `**Mental model**` — substantial paragraph (~150-200 words) on the underlying mental model
4. `**Key terms**` — bullet list of 8-12 definitions
5. `**Why interviewers ask this**` — paragraph (~150 words) on junior vs senior signal
6. `**Common confusions**` — bullet list of misconceptions to call out
7. `**What follows from this topic**` — short paragraph linking to later topics

**CRITICAL**: Use `**bold**` for subsection headers, **never** `###` inside the Summary body. A `###` would create a new parser section that breaks the single-card UX.

**Tone**: senior engineer briefing you. Opinions, tradeoffs, concrete examples, real config knobs / system names — not a textbook glossary.

### Adding a new primer

1. Write the markdown at `web/public/<name>-interview-primer.md`. Open every `## Topic` with a `### Summary` as described above.
2. Register the source in **both** `web/public/manifest.json` and `mobile/assets/content/manifest.json` (must stay in sync). Pattern is identical to the existing Postgres / C# entries.
3. Add the filename to the mirror list in `scripts/build-web.sh` so Vercel publishes it under the deploy root.
4. (Optional, only for offline-first native bundle) Copy the markdown into `mobile/assets/content/` and add a `require(...)` entry in `mobile/lib/content.ts`'s `BUNDLED` map.
5. Commit + push to `main`. Vercel auto-deploys; `drilly-delta-brown.vercel.app` (project domain, auto-promoted) reflects the change.

### Adding a new topic to an existing primer

1. Add a `## New Topic` heading at the right position. Every new topic must have a `### Summary` card matching the structure above before any `### Q...`.
2. Add the H3 questions (`### Q1.`, `### Q2.`, …) underneath.
3. If the primer ships in the native bundle (Java / Kotlin), `cp web/public/<file>.md mobile/assets/content/<file>.md` to keep the offline copy in sync.
4. Commit + push.
