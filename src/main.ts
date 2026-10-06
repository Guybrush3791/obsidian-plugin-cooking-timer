import { Notice, Plugin } from 'obsidian';
import { closeAudio, playAlarm } from './alarm';
import { createTimerPostProcessor } from './post-processor';
import { CookingTimerSettingTab, CookingTimerSettings, DEFAULT_SETTINGS } from './settings';
import { TimerStore, type TimerState } from './timer-store';

const TICK_MS = 250;
const REPEAT_ALARM_MS = 10_000;

export default class CookingTimerPlugin extends Plugin {
	settings!: CookingTimerSettings;
	store!: TimerStore;

	async onload() {
		await this.loadSettings();

		this.store = new TimerStore((timer, final) => this.onAlarm(timer, final));
		this.registerMarkdownPostProcessor(createTimerPostProcessor(this.app, this.store));
		this.registerInterval(window.setInterval(() => this.store.tick(), TICK_MS));
		this.registerInterval(
			window.setInterval(() => {
				if (this.settings.repeatAlarm && this.store.hasStatus('done')) {
					playAlarm(true, this.settings.alarmVolume);
				}
			}, REPEAT_ALARM_MS),
		);

		this.addCommand({
			id: 'pause-all',
			name: 'Pause all timers',
			callback: () => this.store.pauseAll(),
		});
		this.addCommand({
			id: 'dismiss-finished',
			name: 'Dismiss finished timers',
			callback: () => this.store.resetAll('done'),
		});
		this.addCommand({
			id: 'reset-all',
			name: 'Reset all timers',
			callback: () => this.store.resetAll(),
		});

		this.addSettingTab(new CookingTimerSettingTab(this.app, this));
	}

	onunload() {
		closeAudio();
	}

	private onAlarm(timer: TimerState, final: boolean) {
		playAlarm(final, this.settings.alarmVolume);

		const name = timer.label || noteName(timer.sourcePath);
		if (!final) {
			new Notice(`${name}: round ${timer.round - 1}/${timer.rounds} done, next round started`, 8000);
			return;
		}

		// Stays until dismissed — from the notice itself or from the widget.
		const notice = new Notice(`${name} is done`, 0);
		notice.containerEl.addEventListener('click', () => this.store.reset(timer.key));
		const unsubscribe = this.store.subscribe(timer.key, () => {
			if (timer.status !== 'done') {
				unsubscribe();
				notice.hide();
			}
		});
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<CookingTimerSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

function noteName(path: string): string {
	return path.split('/').pop()?.replace(/\.md$/, '') ?? 'Timer';
}
