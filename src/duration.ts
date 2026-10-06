// Pure parsing/formatting helpers — no Obsidian imports, so they run under `node --test`.

export const TIMER_KEYWORD = 'timer';

export interface TimerSpec {
	// Starting duration; for an adjustable `15m -3m`, the stated one (15m).
	durationMs: number;
	// Bounds of an adjustable timer (`15m -3m` → 12m..15m); both equal `durationMs` for a fixed one.
	minMs: number;
	maxMs: number;
	// How many back-to-back rounds one start runs (`3x 15:00` → 3).
	rounds: number;
	label: string;
}

// `1h30m`, `10m`, `45s`, `1h5m30s`
const UNIT_RE = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i;
// `5:00`, `1:05:00`
const CLOCK_RE = /^(?:(\d+):)?(\d{1,2}):(\d{2})$/;
// `timer: 10m Simmer`, `timer: 3x 15:00 Stir`, `timer: 3x15m`, `timer: 15m -3m Roast`.
// The variation is a sign (`-`, `+`, `±`; en dash and minus sign count as `-`) and a duration
// starting with a digit, so a label like `- stir well` isn't mistaken for one.
const SPEC_RE = new RegExp(
	`^${TIMER_KEYWORD}:\\s*(?:(\\d+)\\s*[x×]\\s*)?(\\S+?)(?:\\s*([-–−+±])\\s*(\\d\\S*))?(?:\\s+(.+))?$`,
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

	let minMs = durationMs;
	let maxMs = durationMs;
	const sign = match[3];
	if (sign && match[4]) {
		const deltaMs = parseDuration(match[4]);
		if (deltaMs === null) return null;
		if (sign !== '+') minMs -= deltaMs;
		if (sign === '+' || sign === '±') maxMs += deltaMs;
		if (minMs <= 0) return null;
	}
	return { durationMs, minMs, maxMs, rounds, label: match[5]?.trim() ?? '' };
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
