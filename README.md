# Cooking Timer

Inline countdowns for recipes in Obsidian. Write a timer as inline code and, in **reading view**, it becomes a badge you can start, pause and reset without leaving the step you're on.

Visual design is modelled on [Text Block Timer](https://github.com/wth461694678/text-block-timer)'s inline badge, reframed as a countdown.

## Syntax

```markdown
1. Bring the water to a boil, add the pasta: `timer: 9m Pasta`
2. Simmer the ragù: `timer: 2h30m`
3. Proof the dough, folding between rounds: `timer: 3x 15:00 Stretch & fold`
4. Roast the bones until browned (15–20 min): `timer: 15-20m`
```

`` `timer: [N x] <duration> [label]` ``

- **Duration**: `10m`, `1h30m`, `45s`, `1h5m30s`, or clock form `5:00`, `1:05:00`.
- **Range** (optional): `15-20m`, `15:00-20:00` or `1h-1h30m` makes the duration adjustable. The badge starts at the lower bound and gets − / + buttons (`− ▶ 15:00 +`) that change it by 1 minute while the timer is idle; − is disabled at the minimum and + at the maximum. Once started, the duration is locked. Resetting keeps the chosen value.
- **Rounds** (optional): `3x 15:00` runs three 15-minute rounds back to back from a single start. A short chime plays at the end of each round and the next round starts automatically; the final round plays the full alarm.
- **Label** (optional): shown in the badge and in the notice when the timer rings. Without one, the note name is used.

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
