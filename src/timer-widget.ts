import { MarkdownRenderChild, setIcon } from 'obsidian';
import { unlockAudio } from './alarm';
import { formatRemaining, type TimerSpec } from './duration';
import type { TimerState, TimerStatus, TimerStore } from './timer-store';

const TOGGLE_ICON: Record<TimerStatus, string> = {
	idle: 'play',
	running: 'pause',
	paused: 'play',
	done: 'bell-ring',
};

const TOGGLE_LABEL: Record<TimerStatus, string> = {
	idle: 'Start timer',
	running: 'Pause timer',
	paused: 'Resume timer',
	done: 'Dismiss timer',
};

/**
 * Inline badge that replaces a `timer: …` code span in reading mode. Holds no timer
 * state of its own — it renders whatever the store says and forwards clicks to it.
 */
export class TimerWidget extends MarkdownRenderChild {
	private timer: TimerState;
	private toggleEl!: HTMLButtonElement;
	private iconEl!: HTMLElement;
	private roundEl: HTMLElement | null = null;
	private timeEl!: HTMLElement;
	private nextEl: HTMLButtonElement | null = null;
	private resetEl!: HTMLButtonElement;
	private lastStatus: TimerStatus | null = null;

	constructor(
		containerEl: HTMLElement,
		private store: TimerStore,
		private key: string,
		sourcePath: string,
		private spec: TimerSpec,
	) {
		super(containerEl);
		this.timer = store.ensure(key, sourcePath, spec);
	}

	onload(): void {
		const el = this.containerEl;
		el.addClass('cooking-timer');

		this.toggleEl = el.createEl('button', { cls: 'cooking-timer-toggle' });
		this.iconEl = this.toggleEl.createSpan({ cls: 'cooking-timer-icon' });
		if (this.spec.rounds > 1) {
			this.roundEl = this.toggleEl.createSpan({ cls: 'cooking-timer-round' });
		}
		this.timeEl = this.toggleEl.createSpan({ cls: 'cooking-timer-time' });
		if (this.spec.label) {
			this.toggleEl.createSpan({ cls: 'cooking-timer-label', text: this.spec.label });
		}

		if (this.spec.rounds > 1) {
			this.nextEl = el.createEl('button', {
				cls: 'cooking-timer-next',
				attr: { 'aria-label': 'Next round' },
			});
			setIcon(this.nextEl, 'skip-forward');
		}

		this.resetEl = el.createEl('button', {
			cls: 'cooking-timer-reset',
			attr: { 'aria-label': 'Reset timer' },
		});
		setIcon(this.resetEl, 'rotate-ccw');

		this.registerDomEvent(this.toggleEl, 'click', (evt) => {
			evt.preventDefault();
			// Must run inside the click: mobile webviews only allow audio after a user gesture.
			unlockAudio();
			this.store.toggle(this.key);
		});
		if (this.nextEl) {
			this.registerDomEvent(this.nextEl, 'click', (evt) => {
				evt.preventDefault();
				this.store.next(this.key);
			});
		}
		this.registerDomEvent(this.resetEl, 'click', (evt) => {
			evt.preventDefault();
			this.store.reset(this.key);
		});
		this.register(this.store.subscribe(this.key, () => this.render()));
		this.render();
	}

	private render(): void {
		const timer = this.timer;
		this.timeEl.setText(formatRemaining(this.store.remaining(timer)));
		this.roundEl?.setText(`${timer.round}/${timer.rounds}`);

		const active = timer.status === 'running' || timer.status === 'paused';
		// Round changes without a status change, so this sits above the early return.
		this.nextEl?.toggle(active && timer.round < timer.rounds);

		if (timer.status === this.lastStatus) return;
		if (this.lastStatus) this.containerEl.removeClass(`is-${this.lastStatus}`);
		this.containerEl.addClass(`is-${timer.status}`);
		this.lastStatus = timer.status;

		setIcon(this.iconEl, TOGGLE_ICON[timer.status]);
		this.toggleEl.setAttr('aria-label', TOGGLE_LABEL[timer.status]);
		this.resetEl.toggle(active);
	}
}
