import type { MarkdownPostProcessor } from 'obsidian';
import { parseTimerSpec } from './duration';
import type { TimerStore } from './timer-store';
import { TimerWidget } from './timer-widget';

/**
 * Reading-mode only: swaps inline `timer: …` code spans for live countdown widgets.
 * Live Preview / source mode are untouched (that would need a CodeMirror 6 extension).
 */
export function createTimerPostProcessor(store: TimerStore): MarkdownPostProcessor {
	return (el, ctx) => {
		const line = ctx.getSectionInfo(el)?.lineStart ?? '?';
		let index = 0;

		for (const code of Array.from(el.querySelectorAll('code'))) {
			if (code.closest('pre')) continue;
			const raw = code.textContent ?? '';
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
