import { App, PluginSettingTab, Setting } from 'obsidian';
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
					.setDynamicTooltip()
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
