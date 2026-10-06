# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Obsidian community plugin (id `cooking-timer`, scaffolded from `obsidianmd/obsidian-sample-plugin`). Inline code spans like `` `timer: 3x 15:00 Stir` `` in a recipe become countdown badges in **reading view** that the user can start/pause/reset; `` `done: unchecked` `` spans become checkboxes (with an optional label, struck through when checked) that write the check time back into the note (`` `done: 13.46 Knead` ``). Visual design follows the Text Block Timer plugin's inline "badge" style (github.com/wth461694678/text-block-timer), reframed for countdowns.

## Commands

Toolchain comes from the Nix dev shell in `flake/flake.nix` (Node 22 + npm), loaded by `.envrc` via direnv (`direnv allow` once). The flake is kept in `flake/` rather than the repo root so `path:` evaluation doesn't copy `node_modules` into the store; add tools there, not via global installs.

```bash
npm run dev      # esbuild watch → main.js (inline sourcemaps)
npm run build    # tsc -noEmit type-check, then minified production main.js
npm run lint     # eslint with eslint-plugin-obsidianmd (also run in CI: .github/workflows/lint.yml)
npm test         # node --test "tests/**/*.test.ts"
node --test tests/timer-store.test.ts                       # one file
node --test --test-name-pattern="rounds" "tests/**/*.test.ts"   # one test by name
```

Tests run on Node's built-in runner with native type stripping (Node ≥ 22.18): no transpile step, so test-reachable code (`src/duration.ts`, `src/timer-store.ts`, `src/done.ts`) must use only erasable TS syntax (no parameter properties, enums, namespaces), must not import `obsidian`, and test imports use explicit `.ts` extensions. Between test-reachable `src/` files only `import type` is allowed (erased at runtime); a value import of `./duration` fails under `node --test` because the extensionless path doesn't resolve. `tests/` is excluded from eslint and from `tsconfig.json`.

The user prefers to run build/compile themselves — don't run `npm run build`/`dev` unless asked.

## Architecture

State is deliberately separated from the DOM, because reading view destroys and re-renders sections freely (scroll virtualization, note switches, edits):

- `src/timer-store.ts` — `TimerStore`, the single source of truth, owned by the plugin. Timers are keyed by `sourcePath:sectionLineStart:indexInSection:rawText` (built in `post-processor.ts`), so a re-rendered widget reattaches to its running state, and editing a timer's text yields a fresh timer. Running timers store a wall-clock `endsAt`, not a decremented counter, so late ticks don't drift. `tick()` is driven by a plugin `registerInterval` and advances rounds / finishes timers even when no widget is mounted; it calls the `onAlarm(timer, final)` callback (`final=false` for a round boundary, `true` at the end).
- `src/post-processor.ts` — `MarkdownPostProcessor` that finds non-`<pre>` `<code>` elements matching a `done:` or `timer:` spec, replaces each with a host span, and attaches a `DoneWidget`/`TimerWidget` via `ctx.addChild` (so it unloads with the section).
- `src/done.ts` / `src/done-widget.ts` — `done:` checkboxes. The exception to the store model: state is the note text itself. A click runs `vault.process` → `setDoneValue`, which rewrites the n-th `done:` span within the section's line range (from `ctx.getSectionInfo` at click time) only if it still reads as rendered; reading view then re-renders the section. The checkbox deliberately avoids Obsidian's `task-list-item-checkbox` class so Obsidian's own task toggling doesn't fire.
- `src/timer-widget.ts` — `MarkdownRenderChild`; stateless view that subscribes to its key in the store and forwards clicks. State is exposed as `is-idle|is-running|is-paused|is-done` classes on `.cooking-timer`.
- `src/duration.ts` — pure parsing/formatting; `TIMER_KEYWORD` and the spec regex live here.
- `src/alarm.ts` — Web Audio synthesized beeps (no assets). `unlockAudio()` must be called from a user gesture (the widget's start click) or mobile webviews keep the `AudioContext` suspended and the alarm is silent.
- `src/main.ts` — lifecycle, notices (final notice is persistent and auto-hides when the timer leaves `done`), repeat-alarm interval, commands.
- `styles.css` — per-state colour via a single `--ct-color` (alpha tints via `color-mix`) derived from Obsidian theme RGB vars; a running badge fades green → orange → red from `--ct-remaining`, which the widget sets each render; buttons use `all: unset` to sit inline in text.

Known scope limits: reading view only (Live Preview would need a CodeMirror 6 `ViewPlugin`/`Decoration.replace` widget, as Text Block Timer does); timer state is in memory only and lost on reload.

## Obsidian constraints

- `minAppVersion` is `1.8.7` because `Notice.containerEl` is used; bump it (and `versions.json`) if newer APIs are adopted. Never change the manifest `id` or command IDs after release.
- Release: `npm version <x.y.z>` runs `version-bump.mjs` to sync `manifest.json`/`versions.json`; pushing a tag with no `v` prefix triggers `.github/workflows/release.yml`, which lints, builds and publishes a (non-draft) GitHub release with `main.js`, `manifest.json`, `styles.css` — BRAT installs from that latest published release, so drafts are invisible to it.
- `isDesktopOnly: false` — avoid Node/Electron APIs. Register all listeners/intervals via `register*` helpers so unload is clean.
- UI copy is sentence case (enforced by the obsidianmd lint rules).
