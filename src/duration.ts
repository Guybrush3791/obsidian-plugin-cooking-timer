// Pure parsing/formatting helpers — no Obsidian imports, so they run under `node --test`.

export const TIMER_KEYWORD = 'timer';

export interface TimerSpec {
	durationMs: number;
	// How many back-to-back rounds one start runs (`3x 15:00` → 3).
	rounds: number;
	label: string;
}

// `1h30m`, `10m`, `45s`, `1h5m30s`
const UNIT_RE = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i;
// `5:00`, `1:05:00`
const CLOCK_RE = /^(?:(\d+):)?(\d{1,2}):(\d{2})$/;
// `timer: 10m Simmer`, `timer: 3x 15:00 Stir`, `timer: 3x15m`
const SPEC_RE = new RegExp(
	`^${TIMER_KEYWORD}:\\s*(?:(\\d+)\\s*[x×]\\s*)?(\\S+)(?:\\s+(.+))?$`,
	'i',
);

const num = (s: string | undefined): number => (s ? parseInt(s, 10) : 0);

export function parseDuration(text: string): number | null {
	const unit = UNIT_RE.exec(text);
	if (unit && text.length > 0) {
		return ((num(unit[1]) * 60 + num(unit[2])) * 60 + num(unit[3])) * 1000 || null;
	}
	const clock = CLOCK_RE.exec(text);
	if (clock) {
		const [h, m, s] = [num(clock[1]), num(clock[2]), num(clock[3])];
		if (s > 59 || (clock[1] !== undefined && m > 59)) return null;
		return ((h * 60 + m) * 60 + s) * 1000 || null;
	}
	return null;
}

export function parseTimerSpec(code: string): TimerSpec | null {
	const match = SPEC_RE.exec(code.trim());
	if (!match?.[2]) return null;
	const durationMs = parseDuration(match[2]);
	if (durationMs === null) return null;
	const rounds = match[1] === undefined ? 1 : num(match[1]);
	if (rounds < 1) return null;
	return { durationMs, rounds, label: match[3]?.trim() ?? '' };
}

// Rounds up so the display hits 00:00 exactly when the timer finishes.
export function formatRemaining(ms: number): string {
	const total = Math.max(0, Math.ceil(ms / 1000));
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	const pad = (n: number) => String(n).padStart(2, '0');
	return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
