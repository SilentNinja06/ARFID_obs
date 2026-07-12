import { App, Modal, Notice } from "obsidian";
import { isoDate, isoTime } from "./store";
import { buildSymptomNote } from "./serialize";
import { linkIntoDailyNote } from "./dailynote";
import { buildChipPicker } from "./chips";
import { createEntryFile } from "./quicklog";
import type ArfidTrackerPlugin from "./main";

/** Log ARFID-related symptoms (brain fog, jitters, lightheadedness…) as a
 * standalone timestamped note. One-tap chips, optional freeform note. */
export class SymptomModal extends Modal {
	private plugin: ArfidTrackerPlugin;
	private symptoms = new Set<string>();
	private notes = "";

	constructor(app: App, plugin: ArfidTrackerPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.addClass("arfid-plugin", "arfid-quicklog");
		this.titleEl.setText("Log symptoms");
		contentEl.createDiv({
			cls: "arfid-hint",
			text: "Body signals worth tracking — they often connect back to how eating has gone.",
		});

		buildChipPicker(contentEl, "Symptoms", this.plugin.settings.knownSymptoms, this.symptoms);

		contentEl.createDiv({ cls: "arfid-field-label", text: "Notes (optional)" });
		const notes = contentEl.createEl("textarea", {
			cls: "arfid-textarea",
			attr: { rows: "2", placeholder: "Anything else — when it started, what you'd eaten so far today…" },
		});
		notes.addEventListener("input", () => (this.notes = notes.value));

		const save = contentEl.createEl("button", { cls: "arfid-save-btn", text: "Save symptoms" });
		save.addEventListener("click", () => void this.save());
		this.scope.register(["Mod"], "Enter", () => {
			void this.save();
			return false;
		});
	}

	private async save(): Promise<void> {
		if (this.symptoms.size === 0) {
			new Notice("Pick at least one symptom.");
			return;
		}
		const now = new Date();
		const date = isoDate(now);
		const time = isoTime(now);
		const symptoms = [...this.symptoms];
		const note = buildSymptomNote(date, time, symptoms, this.notes);

		const file = await createEntryFile(this.app, this.plugin, date, time, "symptoms", note);
		await this.plugin.saveSettings(); // persist auto-grown symptom list

		if (this.plugin.settings.dailyNoteLinking) {
			try {
				await linkIntoDailyNote(this.app, this.plugin.settings, date, time, file.basename, `symptoms: ${symptoms.join(", ")}`);
			} catch (e) {
				console.error("ARFID Tracker: daily note linking failed", e);
			}
		}

		new Notice("Symptoms logged.");
		this.close();
		this.plugin.notifyDataChanged();
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
