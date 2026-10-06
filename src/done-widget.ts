import { App, MarkdownRenderChild, MarkdownSectionInformation, Notice } from 'obsidian';
import { DONE_UNCHECKED, formatCheckTime, setDoneValue, type DoneSpec } from './done';

/**
 * Checkbox that replaces a `done: …` code span in reading mode. Unlike timers it keeps its
 * state in the note itself: a click rewrites the span to `done: 13.46` (or back to
 * `done: unchecked`), and reading view re-renders the section with a fresh widget.
 */
export class DoneWidget extends MarkdownRenderChild {
	constructor(
		containerEl: HTMLElement,
		private app: App,
		private sourcePath: string,
		// Looked up at click time so the line range reflects the note as currently rendered.
		private getSection: () => MarkdownSectionInformation | null,
		private index: number,
		private raw: string,
		private spec: DoneSpec,
	) {
		super(containerEl);
	}

	onload(): void {
		const el = this.containerEl;
		el.addClass('cooking-timer-done');
		el.toggleClass('is-checked', this.spec.checked);

		const checkbox = el.createEl('input', {
			type: 'checkbox',
			cls: 'cooking-timer-done-checkbox',
			attr: { 'aria-label': this.spec.checked ? 'Mark as not done' : 'Mark as done' },
		});
		checkbox.checked = this.spec.checked;
		if (this.spec.checked) {
			el.createSpan({ cls: 'cooking-timer-done-time', text: this.spec.checkedAt });
		}

		this.registerDomEvent(checkbox, 'click', (evt) => {
			// Keeps the click from reaching a heading or list item underneath.
			evt.stopPropagation();
			const value = checkbox.checked ? formatCheckTime(new Date()) : DONE_UNCHECKED;
			void this.write(value).then((ok) => {
				if (ok) return;
				checkbox.checked = this.spec.checked;
				new Notice('Could not update the checkbox: the note changed. Try again.');
			});
		});
	}

	private async write(value: string): Promise<boolean> {
		const section = this.getSection();
		const file = this.app.vault.getFileByPath(this.sourcePath);
		if (!section || !file) return false;

		let ok = false;
		await this.app.vault.process(file, (data) => {
			const updated = setDoneValue(
				data,
				section.lineStart,
				section.lineEnd,
				this.index,
				this.raw,
				value,
			);
			ok = updated !== null;
			return updated ?? data;
		});
		return ok;
	}
}
