import { App, PluginSettingTab, Setting } from "obsidian";
import type ArfidTrackerPlugin from "./main";

export class ArfidSettingTab extends PluginSettingTab {
	plugin: ArfidTrackerPlugin;

	constructor(app: App, plugin: ArfidTrackerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	private addTextSetting(name: string, desc: string, placeholder: string, get: () => string, set: (v: string) => void): void {
		new Setting(this.containerEl)
			.setName(name)
			.setDesc(desc)
			.addText((t) =>
				t.setPlaceholder(placeholder).setValue(get()).onChange(async (v) => {
					set(v);
					await this.plugin.saveSettings();
				})
			);
	}

	private addListSetting(name: string, desc: string, rows: number, get: () => string[], set: (v: string[]) => void): void {
		new Setting(this.containerEl)
			.setName(name)
			.setDesc(desc)
			.addTextArea((t) => {
				t.setValue(get().join("\n")).onChange(async (v) => {
					set(
						v
							.split("\n")
							.map((s) => s.trim())
							.filter((s) => s.length > 0)
					);
					await this.plugin.saveSettings();
				});
				t.inputEl.rows = rows;
			});
	}

	display(): void {
		const { containerEl } = this;
		const s = this.plugin.settings;
		containerEl.empty();

		this.addTextSetting(
			"Entries folder",
			"Where new food entries are created. Existing entries are found by their frontmatter (type: food-entry), so moving notes later is fine.",
			"Food Log",
			() => s.entriesFolder,
			(v) => (s.entriesFolder = v)
		);
		this.addTextSetting(
			"Filename template",
			"Tokens: {{date}}, {{time}}, {{food}}.",
			"{{date}} {{time}} {{food}}",
			() => s.filenameTemplate,
			(v) => (s.filenameTemplate = v)
		);
		this.addTextSetting(
			"Exports folder",
			"Where CSV and summary exports are written.",
			"Exports",
			() => s.exportsFolder,
			(v) => (s.exportsFolder = v)
		);

		new Setting(containerEl).setName("Daily note linking").setHeading();

		new Setting(containerEl)
			.setName("Link entries into the daily note")
			.setDesc("Insert a link into that day's daily note whenever an entry is logged. New daily notes are seeded from the Daily Notes core plugin's template.")
			.addToggle((t) =>
				t.setValue(s.dailyNoteLinking).onChange(async (v) => {
					s.dailyNoteLinking = v;
					await this.plugin.saveSettings();
				})
			);
		this.addTextSetting(
			"Placement marker",
			"Links are inserted after this marker if the daily note contains it (invisible in reading view). Put it in your daily-note template where food links should appear.",
			"%% arfid-log %%",
			() => s.dailyNoteMarker,
			(v) => (s.dailyNoteMarker = v)
		);
		this.addTextSetting(
			"Fallback heading",
			"If the marker isn't found, links go under this heading wherever it sits; a heading is appended at the end only as a last resort.",
			"Food log",
			() => s.dailyNoteHeading,
			(v) => (s.dailyNoteHeading = v)
		);

		new Setting(containerEl).setName("Quick-log chip lists").setHeading();

		this.addListSetting(
			"Known strategies",
			"One per line. New strategies typed during logging are added here automatically.",
			8,
			() => s.knownStrategies,
			(v) => (s.knownStrategies = v)
		);
		this.addListSetting(
			"Known contexts",
			"One per line. New contexts typed during logging are added here automatically.",
			6,
			() => s.knownContexts,
			(v) => (s.knownContexts = v)
		);
		this.addListSetting(
			"Known symptoms",
			"One per line. New symptoms typed during logging are added here automatically.",
			6,
			() => s.knownSymptoms,
			(v) => (s.knownSymptoms = v)
		);

		new Setting(containerEl).setName("Support & reminders").setHeading();

		this.addListSetting(
			"Kindness reminders",
			"One per line. A random one is shown on the “I'm struggling” screen.",
			6,
			() => s.kindnessReminders,
			(v) => (s.kindnessReminders = v)
		);
		this.addListSetting(
			"Environment checklist",
			"One per line. Shown on the “I'm struggling” screen — things that make eating easier.",
			6,
			() => s.environmentChecklist,
			(v) => (s.environmentChecklist = v)
		);
		this.addListSetting(
			"Exposure checklist",
			"One per line. Shown at the top of the exposure logging screen — the critical things to remember during an exposure.",
			6,
			() => s.exposureChecklist,
			(v) => (s.exposureChecklist = v)
		);
	}
}
