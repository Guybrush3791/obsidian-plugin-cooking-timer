// Pure parsing/rewriting for `done:` checkboxes — no Obsidian imports, so they run under `node --test`.

export const DONE_KEYWORD = 'done';
// The state written for an unchecked box; a check time (`13.46`) marks a checked one.
export const DONE_UNCHECKED = 'unchecked';

export interface DoneSpec {
	checked: boolean;
	// When the box was checked, as written in the note (`13.46`); empty when unchecked.
	checkedAt: string;
	label: string;
}

// `done: unchecked`, `done: 13.46`, `done: unchecked Knead`, `done: 13.46 Knead`, `done: Knead`.
// The state is optional (missing means unchecked) so a bare label isn't misread as a time.
const DONE_RE = new RegExp(
	`^${DONE_KEYWORD}:\\s*(?:(${DONE_UNCHECKED}|\\d{1,2}[.:]\\d{2})(?=\\s|$))?\\s*(.*)$`,
	'i',
);
// An inline code span in the note source (single backticks).
const CODE_SPAN_RE = /`([^`]+)`/g;

export function parseDoneSpec(code: string): DoneSpec | null {
	const match = DONE_RE.exec(code.trim());
	if (!match) return null;
	const state = match[1] ?? '';
	const checked = state !== '' && state.toLowerCase() !== DONE_UNCHECKED;
	return { checked, checkedAt: checked ? state : '', label: match[2]?.trim() ?? '' };
}

// Source text of a span with `state` swapped in, keeping the keyword as the user typed it
// (`Done:` stays `Done:`) and the label.
function withState(inner: string, label: string, state: string): string {
	const keyword = inner.trim().slice(0, DONE_KEYWORD.length);
	return `\`${keyword}: ${state}${label ? ` ${label}` : ''}\``;
}

// `13.46`, local time.
export function formatCheckTime(date: Date): string {
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${pad(date.getHours())}.${pad(date.getMinutes())}`;
}

/**
 * Rewrites the `index`-th `done:` code span between `lineStart` and `lineEnd` (inclusive)
 * of `source` to carry `value`. Returns null when that span is missing or no longer reads
 * `expected` — the note changed since it was rendered, so the click is not applied.
 */
export function setDoneValue(
	source: string,
	lineStart: number,
	lineEnd: number,
	index: number,
	expected: string,
	value: string,
): string | null {
	const lines = source.split('\n');
	if (lineStart < 0 || lineEnd >= lines.length || lineStart > lineEnd) return null;
	const section = lines.slice(lineStart, lineEnd + 1).join('\n');

	let seen = 0;
	let result: string | null = null;
	const updated = section.replace(CODE_SPAN_RE, (span, inner: string) => {
		const spec = parseDoneSpec(inner);
		if (result !== null || !spec) return span;
		if (seen++ !== index) return span;
		if (inner.trim() !== expected.trim()) {
			result = '';
			return span;
		}
		result = withState(inner, spec.label, value);
		return result;
	});
	if (!result) return null;

	lines.splice(lineStart, lineEnd - lineStart + 1, ...updated.split('\n'));
	return lines.join('\n');
}

// Opening/closing line of a fenced code block, whose contents are never rendered as checkboxes.
const FENCE_RE = /^\s*(`{3,}|~{3,})/;

/**
 * Sets every `done:` span in `source` back to `done: unchecked`, leaving fenced code blocks
 * alone. Returns the new text and how many spans changed.
 */
export function uncheckAll(source: string): { text: string; count: number } {
	let count = 0;
	let fence: string | null = null;
	const lines = source.split('\n').map((line) => {
		const marker = FENCE_RE.exec(line)?.[1];
		if (marker) {
			if (fence === null) fence = marker;
			else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null;
			return line;
		}
		if (fence !== null) return line;
		return line.replace(CODE_SPAN_RE, (span, inner: string) => {
			const spec = parseDoneSpec(inner);
			if (!spec?.checked) return span;
			count++;
			return withState(inner, spec.label, DONE_UNCHECKED);
		});
	});
	return { text: lines.join('\n'), count };
}
