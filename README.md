# System Design Flash

Interactive flashcard study app for the 41 system design interview patterns in `~/Documents/private-vault/Notes/System-Design-Patterns.md`.

Every pattern's High-Level Design is rendered as a Mermaid diagram (dark theme); other sections render as collapsible markdown cards.

## Run

```bash
bun install
bun run dev
```

Open http://localhost:5173.

## Source

`public/patterns.md` is a symlink to the canonical Obsidian markdown. Edit the source in Obsidian, refresh the browser to pick up changes.

## Controls

- Click any section header to toggle.
- `Space` — reveal next section in canonical order.
- `←` / `→` (or `k` / `j`) — jump between patterns.
- Per-pattern reveal state persists in `localStorage`.

## Diagram authoring

HLD diagrams live in `src/lib/diagrams/{NN}-{slug}.mmd`. Mermaid `flowchart` syntax. Theme variables in `src/theme/mermaidTheme.ts`. Edit a `.mmd` file and Vite hot-reloads.

When a diagram is missing, the renderer falls back to the original ASCII from the markdown.
