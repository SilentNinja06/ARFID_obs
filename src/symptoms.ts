import { App, Notice } from "obsidian";
import { nowStamp } from "./store";
import { buildSymptomNote } from "./serialize";
import { saveEntryNote } from "./files";
import { buildChipPicker } from "./chips";
import { ArfidModal } from "./modal";
import type ArfidTrackerPlugin from "./main";

/** Log ARFID-related symptoms (brain fog, jitters, lightheadedness…) as a
 * standalone timestamped note. One-tap chips, optional freeform note. */
export class SymptomModal extends ArfidModal {
	private symptoms = new Set<string>();
	private notes = "";

	constructor(app: App, plugin: ArfidTrackerPlugin) {
		super(app, plugin, "Log symptoms");
	}

	protected buildContent(): void {
		const { contentEl } = this;
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

		this.addSaveButton("Save symptoms", () => this.save());
	}

	private async save(): Promise<void> {
		if (this.symptoms.size === 0) {
			new Notice("Pick at least one symptom.");
			return;
		}
		const { date, time } = nowStamp();
		const symptoms = [...this.symptoms];
		await this.plugin.saveSettings(); // persist auto-grown symptom list
		await saveEntryNote(this.plugin, date, time, "symptoms", buildSymptomNote(date, time, symptoms, this.notes), {
			dailyLabel: `symptoms: ${symptoms.join(", ")}`,
			notice: "Symptoms logged.",
		});
		this.close();
	}
}
