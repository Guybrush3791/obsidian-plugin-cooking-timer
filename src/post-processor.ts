import type { App, MarkdownPostProcessor } from 'obsidian';
import { parseDoneSpec } from './done';
import { DoneWidget } from './done-widget';
import { parseTimerSpec } from './duration';
import type { TimerStore } from './timer-store';
import { TimerWidget } from './timer-widget';

/**
 * Reading-mode only: swaps inline `timer: …` code spans for live countdown widgets and
 * `done: …` code spans for checkboxes.
 * Live Preview / source mode are untouched (that would need a CodeMirror 6 extension).
 */
export function createTimerPostProcessor(app: App, store: TimerStore): MarkdownPostProcessor {
	return (el, ctx) => {
		const line = ctx.getSectionInfo(el)?.lineStart ?? '?';
		let index = 0;
		// Position among this section's `done:` spans, used to find the one to rewrite.
		let doneIndex = 0;

		for (const code of Array.from(el.querySelectorAll('code'))) {
			if (code.closest('pre')) continue;
			const raw = code.textContent ?? '';

			const done = parseDoneSpec(raw);
			if (done) {
				const host = createSpan();
				code.replaceWith(host);
				ctx.addChild(
					new DoneWidget(host, app, ctx.sourcePath, () => ctx.getSectionInfo(el), doneIndex++, raw, done),
				);
				continue;
			}

			const spec = parseTimerSpec(raw);
			if (!spec) continue;

			// The key ties a re-rendered widget back to its running state. Including the raw
			// text means editing a timer's duration gives it fresh state.
			const key = `${ctx.sourcePath}:${line}:${index++}:${raw}`;
			const host = createSpan();
			code.replaceWith(host);
			ctx.addChild(new TimerWidget(host, store, key, ctx.sourcePath, spec));
		}
	};
}
