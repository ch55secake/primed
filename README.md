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
