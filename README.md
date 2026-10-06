# Cooking Timer

Inline countdowns for recipes in Obsidian. Write a timer as inline code and, in **reading view**, it becomes a badge you can start, pause and reset without leaving the step you're on.

Visual design is modelled on [Text Block Timer](https://github.com/wth461694678/text-block-timer)'s inline badge, reframed as a countdown.

## Syntax

```markdown
1. Bring the water to a boil, add the pasta: `timer: 9m Pasta`
2. Simmer the ragù: `timer: 2h30m`
3. Proof the dough, folding between rounds: `timer: 3x 15:00 Stretch & fold`
4. Roast the bones until browned (12–15 min): `timer: 15m -3m`
```

`` `timer: [N x] <duration> [±variation] [label]` ``

- **Duration**: `10m`, `1h30m`, `45s`, `1h5m30s`, or clock form `5:00`, `1:05:00`.
- **Variation** (optional): a sign and a duration after the main one makes it adjustable. `15m -3m` allows 12–15 min, `15m +5m` allows 15–20 min, `15m ±2m` allows 13–17 min (`15:00 -3:00` works too). The badge starts at the written duration and gets − / + buttons (`− ▶ 15:00 +`) that change it by 1 minute while the timer is idle; − is disabled at the minimum and + at the maximum. Once started, the duration is locked. Resetting keeps the chosen value.
- **Rounds** (optional): `3x 15:00` runs three 15-minute rounds back to back from a single start. The badge shows the time left overall before the current round (`⏸ 41:32 1/3 11:32`); each countdown fades green → orange → red on its own share of time left. A short chime plays at the end of each round and the next round starts automatically, with both countdowns still running; the final round plays the full alarm.
- **Label** (optional): shown in the badge and in the notice when the timer rings. Without one, the note name is used.

### Checkboxes

```markdown
## Fase 1 ~ prepare the dough `done: unchecked`
- Preheat the oven `done: unchecked`
```

`` `done: unchecked` `` becomes an empty checkbox in reading view, inline in text, list items and headings. Checking it writes the time into the note — `` `done: 13.46` `` — and the box then shows as checked with that time next to it. Unchecking writes `done: unchecked` back. Since the state lives in the note, it survives restarts and syncs like any other text.

## Controls (reading view)

| State | Badge | Click |
| --- | --- | --- |
| Idle | grey, ▶ full duration (− / + for a range) | start |
| Running | green, ⏸ counting down | pause |
| Paused | orange, ▶ remaining | resume |
| Done | red, 🔔 pulsing | dismiss (resets) |

The ↺ button next to a running/paused badge resets it. Multi-round timers also get a ⏭ button that jumps to the start of the next round (no alarm); it's hidden on the last round. Commands: **Pause all timers**, **Dismiss finished timers**, **Reset all timers**.

When a countdown finishes, the alarm plays and a notice stays on screen until dismissed. With **Repeat alarm until dismissed** on (default), it rings again every 10 seconds. Volume and a test button are in settings.

Timers keep running when you switch notes or scroll away; state lives in memory and is lost when Obsidian restarts. Live Preview and source mode show the plain inline code.

## Installation

### Using BRAT

1. Install the [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin.
2. Go to **Settings → BRAT → Add Beta Plugin**.
3. Enter `Guybrush3791/obsidian-plugin-cooking-timer` and click **Add Plugin**.

## Development

With Nix + direnv, run `direnv allow` once to get Node 22 and npm from `flake/flake.nix`. Otherwise use Node ≥ 22.18.

```bash
npm install
npm run dev     # watch build → main.js
npm run build   # type-check + production build
npm run lint
npm test
```

Copy or symlink `main.js`, `manifest.json` and `styles.css` into `<vault>/.obsidian/plugins/cooking-timer/`, then enable the plugin under **Settings → Community plugins**.

## License

[MIT](LICENSE)
