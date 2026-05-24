# Claude session notes — DRILLY

Project-specific guidance for Claude Code. The README is the human-facing doc; this file captures conventions and gotchas Claude would otherwise re-discover the hard way.

## Stack

- **Single codebase via Expo Web**: `mobile/` is Expo (React Native + react-native-web). The web build is `expo export --platform web` outputting `mobile/dist/`. Vercel serves `mobile/dist/`. Don't add a separate `web/` Vite app — that was removed; the `web/public/` directory is now just **content assets** (markdown + manifest), not an app.
- **Workspaces**: Bun monorepo, `mobile/`, `packages/parser/`, root scripts.
- **Deploy**: push to `main` → Vercel auto-deploys. Project domains `drilly-delta-brown.vercel.app` (share URL) and `drilly-rjh-mopjones-projects.vercel.app` (mobile `REMOTE_BASE` in `mobile/lib/content.ts`) both auto-promote.

## Content model

Every primer is **one markdown file** at `web/public/<name>-interview-primer.md`. Headings drive the reader:

- `## Topic` → reader item (sidebar entry, swipeable)
- `### Question` → collapsible card inside that topic

Manifest at `web/public/manifest.json` + mirror at `mobile/assets/content/manifest.json` declares each source. Build script `scripts/build-web.sh` mirrors `web/public/*.md` + `manifest.json` into `mobile/dist/` for Vercel to serve at the deploy root.

### Summary section — required for every topic

Every `## Topic` must open with a `### Summary` card (~700-900 words, 6 subsections in bold). Reference: `web/public/java-interview-primer.md` → `## Core Java` → `### Summary`. See the **Content authoring** section in `README.md` for the full structure and rules.

**Hard rules when adding content**:
- Use `**bold**` for subsections inside a Summary, **never** `###` — `###` is reserved for the question cards and creates parser splits.
- Match Core Java's depth (~930 words) and tone (senior engineer briefing, opinionated, concrete examples — not a glossary).
- If the primer ships in the native bundle (Java, Kotlin, NeetCode, Patterns), `cp web/public/<file>.md mobile/assets/content/<file>.md` after editing. Other primers are remote-only.

## Standing user preferences

- **Merge policy**: drilly only — once a change is approved, merge straight to `main` without re-asking. The user has explicitly opted into "always merge to main" for this repo.
- **No Co-Authored-By trailers** on commits (global user instruction).
- **Be terse / no fluff**: the user has caveman-mode preferences. Drop pleasantries; lead with the answer.

## Deploy gotchas

- `drilly-delta-brown.vercel.app` is a **project domain**, not a manual alias. It auto-promotes with each prod deploy. **Never** `vercel alias set <deployment> drilly-delta-brown.vercel.app` — that freezes it to a specific deploy. Use `vercel domains add` only.
- The legacy `interview-prep-delta-brown.vercel.app` may auto-regenerate because the project's original name was `interview-prep`. If it reappears, `vercel alias rm` it.
- The Expo dev server (`bunx expo start --web`) **does not serve** `web/public/*.md` — it returns the SPA shell for any non-bundle path, so primers parse as zero items ("No items" in the sidebar). For local content testing, run `bash scripts/build-web.sh` then `bunx serve -s mobile/dist -l 8081`.

## Reader UX rules

- Reveal-on-tap section cards. `Space` reveals next, `Esc` collapses all (web only).
- Reader back arrow goes to `/source/<id>`, deterministic — not history-based.
- Desktop web (≥ 900px width) renders the persistent left sidebar (`mobile/components/DesktopSidebar.tsx`); narrow web + native render the stack with its own back-arrow chrome.
- Per-item revealed state persists via `AsyncStorage` (`revealed:<sourceId>:<itemId>`). The `autoRevealSummary` setting (default on) only seeds the **initial** state for never-opened items — per-item toggles always win after first visit.

## Memory files

User-level memory for this repo lives in the Claude Code user-memory directory for this project. Key entries:
- `drilly-merge-policy.md` — "merge approved branches straight to main"
- `drilly-vercel-deploy.md` — project IDs, alias-vs-domain trap, prod URLs

Update those when you discover something new and operational. Don't duplicate code-discoverable facts there.

## Privacy hygiene

This is a public repository. Do not commit:

- Real names. In code examples, use generic placeholders (`alice`, `bob`, `user1`, `Acme Corp`) — not the maintainer's name or any real person.
- Personal email addresses. Git commits use the GitHub noreply email (`<id>+<username>@users.noreply.github.com`) so commit metadata doesn't leak a personal inbox.
- Absolute paths that identify the maintainer's machine (e.g. home directory, personal vault names). Use env vars (`VAULT_PATH`, `$HOME/notes`) instead.
- API keys, tokens, .env contents. Should never be committed; if one slips, rotate immediately and rewrite history.
- References to the maintainer's employer, current projects outside this repo, or any other identifying context.

If you spot leaked PII while editing, redact it in the same commit and surface it to the user — don't ship the leak forward. If it's in committed history, use `git filter-repo` to rewrite and force-push (see the 2026-05-24 scrub commit for the pattern).

## What NOT to touch without asking

- `packages/parser/src/parser.ts` — content shape is contract; changes propagate through every primer and break the reader. Adjust manifest config first.
- `mobile/lib/content.ts:REMOTE_BASE` — hardcoded to the Vercel project domain; only change if the project URL truly changes.
- `vercel.json` rewrites — SPA fallback. Breaking these breaks deep-links like `/source/java`.
