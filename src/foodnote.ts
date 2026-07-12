import { App, Notice } from "obsidian";
import { FoodSummary, NOTE_KIND_LABELS, NOTE_KINDS, NoteKind } from "./types";
import { nowStamp } from "./store";
import { buildFoodNote, sanitizeForFilename } from "./serialize";
import { createUniqueNote } from "./files";
import { buildChoiceRow, buildFoodPicker } from "./chips";
import { ArfidModal } from "./modal";
import type ArfidTrackerPlugin from "./main";

/** Attach a ritual, an order that works, or a recipe to a food. These are
 * per-food companion notes (`type: food-note`) shown in the food library, so
 * the exact way a food works for you is documented and one tap away. */
export class FoodNoteModal extends ArfidModal {
	private foods: FoodSummary[] = [];
	private foodName = "";
	private kind: NoteKind = "ritual";
	private body = "";

	constructor(app: App, plugin: ArfidTrackerPlugin, prefillFood?: string, prefillKind?: NoteKind) {
		super(app, plugin, "Add a ritual, order, or recipe");
		if (prefillFood) this.foodName = prefillFood;
		if (prefillKind) this.kind = prefillKind;
	}

	protected buildContent(): void {
		this.foods = this.plugin.store.getFoods();
		const { contentEl } = this;

		contentEl.createDiv({ cls: "arfid-field-label", text: "Food" });
		buildFoodPicker(contentEl, this.foods, {
			placeholder: "Which food is this about?",
			initial: this.foodName,
			onChange: (name) => (this.foodName = name),
		});

		contentEl.createDiv({ cls: "arfid-field-label", text: "Kind" });
		buildChoiceRow<NoteKind>(
			contentEl,
			NOTE_KINDS.map((k) => ({ value: k, label: NOTE_KIND_LABELS[k] })),
			this.kind,
			(v) => {
				if (v !== "") this.kind = v;
			}
		);

		contentEl.createDiv({ cls: "arfid-field-label", text: "The details" });
		const body = contentEl.createEl("textarea", {
			cls: "arfid-textarea",
			attr: {
				rows: "6",
				placeholder:
					"Exactly how it works for you — the precise order, substitutions, eating sequence, prep steps. The more specific, the more repeatable.",
			},
		});
		body.addEventListener("input", () => (this.body = body.value));

		this.addSaveButton("Save note", () => this.save());
	}

	private async save(): Promise<void> {
		const food = this.foodName.trim();
		if (!food) {
			new Notice("Add a food name first.");
			return;
		}
		if (!this.body.trim()) {
			new Notice("Write the details first — that's the part future you needs.");
			return;
		}
		const { date } = nowStamp();
		const base = sanitizeForFilename(`${food} — ${NOTE_KIND_LABELS[this.kind].toLowerCase()}`);
		await createUniqueNote(this.app, this.plugin.settings.entriesFolder, base, buildFoodNote(date, food, this.kind, this.body));

		new Notice(`Saved ${NOTE_KIND_LABELS[this.kind].toLowerCase()} for ${food}.`);
		this.close();
		this.plugin.notifyDataChanged();
	}
}
