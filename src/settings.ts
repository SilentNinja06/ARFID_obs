import { App, PluginSettingTab, Setting } from "obsidian";
import type ArfidTrackerPlugin from "./main";

export class ArfidSettingTab extends PluginSettingTab {
	plugin: ArfidTrackerPlugin;

	constructor(app: App, plugin: ArfidTrackerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Entries folder")
			.setDesc("Where new food entries are created. Existing entries are found by their frontmatter (type: food-entry), so moving notes later is fine.")
			.addText((t) =>
				t
					.setPlaceholder("Food Log")
					.setValue(this.plugin.settings.entriesFolder)
					.onChange(async (v) => {
						this.plugin.settings.entriesFolder = v;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Filename template")
			.setDesc("Tokens: {{date}}, {{time}}, {{food}}.")
			.addText((t) =>
				t
					.setPlaceholder("{{date}} {{time}} {{food}}")
					.setValue(this.plugin.settings.filenameTemplate)
					.onChange(async (v) => {
						this.plugin.settings.filenameTemplate = v;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Exports folder")
			.setDesc("Where CSV and summary exports are written.")
			.addText((t) =>
				t
					.setPlaceholder("Exports")
					.setValue(this.plugin.settings.exportsFolder)
					.onChange(async (v) => {
						this.plugin.settings.exportsFolder = v;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl).setName("Daily note linking").setHeading();

		new Setting(containerEl)
			.setName("Link entries into the daily note")
			.setDesc("Insert a link into that day's daily note whenever an entry is logged. New daily notes are seeded from the Daily Notes core plugin's template.")
			.addToggle((t) =>
				t.setValue(this.plugin.settings.dailyNoteLinking).onChange(async (v) => {
					this.plugin.settings.dailyNoteLinking = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Placement marker")
			.setDesc("Links are inserted after this marker if the daily note contains it (invisible in reading view). Put it in your daily-note template where food links should appear.")
			.addText((t) =>
				t
					.setPlaceholder("%% arfid-log %%")
					.setValue(this.plugin.settings.dailyNoteMarker)
					.onChange(async (v) => {
						this.plugin.settings.dailyNoteMarker = v;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Fallback heading")
			.setDesc("If the marker isn't found, links go under this heading wherever it sits; a heading is appended at the end only as a last resort.")
			.addText((t) =>
				t
					.setPlaceholder("Food log")
					.setValue(this.plugin.settings.dailyNoteHeading)
					.onChange(async (v) => {
						this.plugin.settings.dailyNoteHeading = v;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl).setName("Quick-log chip lists").setHeading();

		new Setting(containerEl)
			.setName("Known strategies")
			.setDesc("One per line. New strategies typed during logging are added here automatically.")
			.addTextArea((t) => {
				t.setValue(this.plugin.settings.knownStrategies.join("\n")).onChange(async (v) => {
					this.plugin.settings.knownStrategies = v
						.split("\n")
						.map((s) => s.trim())
						.filter((s) => s.length > 0);
					await this.plugin.saveSettings();
				});
				t.inputEl.rows = 8;
			});

		new Setting(containerEl)
			.setName("Known contexts")
			.setDesc("One per line. New contexts typed during logging are added here automatically.")
			.addTextArea((t) => {
				t.setValue(this.plugin.settings.knownContexts.join("\n")).onChange(async (v) => {
					this.plugin.settings.knownContexts = v
						.split("\n")
						.map((s) => s.trim())
						.filter((s) => s.length > 0);
					await this.plugin.saveSettings();
				});
				t.inputEl.rows = 6;
			});
	}
}
