import { App, PluginSettingTab, Setting, SettingDefinitionItem } from 'obsidian';
import { playAlarm, unlockAudio } from './alarm';
import type CookingTimerPlugin from './main';

export interface CookingTimerSettings {
	alarmVolume: number;
	repeatAlarm: boolean;
}

export const DEFAULT_SETTINGS: CookingTimerSettings = {
	alarmVolume: 0.5,
	repeatAlarm: true,
};

export class CookingTimerSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private plugin: CookingTimerPlugin,
	) {
		super(app, plugin);
	}

	// Obsidian ≥ 1.13 renders (and indexes for settings search) from these
	// definitions; the default get/setControlValue read and persist
	// `plugin.settings[key]`.
	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: 'Alarm volume',
				desc: 'Volume of the sound played when a round or the whole countdown ends.',
				control: { type: 'slider', key: 'alarmVolume', min: 0.1, max: 1, step: 0.1 },
			},
			{
				name: 'Test alarm',
				desc: 'Play the alarm at the current volume.',
				action: () => {
					unlockAudio();
					playAlarm(true, this.plugin.settings.alarmVolume);
				},
			},
			{
				name: 'Repeat alarm until dismissed',
				desc: 'Keep ringing every few seconds after a countdown finishes, until you click it or its notice.',
				control: { type: 'toggle', key: 'repeatAlarm' },
			},
		];
	}

	// Fallback for Obsidian < 1.13 (minAppVersion is 1.8.7); not called when
	// getSettingDefinitions() returns definitions.
	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Alarm volume')
			.setDesc('Volume of the sound played when a round or the whole countdown ends.')
			.addSlider((slider) =>
				slider
					.setLimits(0.1, 1, 0.1)
					.setValue(this.plugin.settings.alarmVolume)
					.onChange(async (value) => {
						this.plugin.settings.alarmVolume = value;
						await this.plugin.saveSettings();
					}),
			)
			.addExtraButton((button) =>
				button
					.setIcon('volume-2')
					.setTooltip('Test alarm')
					.onClick(() => {
						unlockAudio();
						playAlarm(true, this.plugin.settings.alarmVolume);
					}),
			);

		new Setting(containerEl)
			.setName('Repeat alarm until dismissed')
			.setDesc('Keep ringing every few seconds after a countdown finishes, until you click it or its notice.')
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.repeatAlarm).onChange(async (value) => {
					this.plugin.settings.repeatAlarm = value;
					await this.plugin.saveSettings();
				}),
			);
	}
}
