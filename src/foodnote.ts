import { App, Modal, Notice, TFolder, normalizePath } from "obsidian";
import { FoodSummary, NOTE_KIND_LABELS, NOTE_KINDS, NoteKind, normalizeFoodKey } from "./types";
import { isoDate } from "./store";
import { buildFoodNote, sanitizeForFilename } from "./serialize";
import { buildChoiceRow } from "./chips";
import type ArfidTrackerPlugin from "./main";

/** Attach a ritual, an order that works, or a recipe to a food. These are
 * per-food companion notes (`type: food-note`) shown in the food library, so
 * the exact way a food works for you is documented and one tap away. */
export class FoodNoteModal extends Modal {
	private plugin: ArfidTrackerPlugin;
	private foods: FoodSummary[] = [];
	private foodName = "";
	private kind: NoteKind = "ritual";
	private body = "";

	constructor(app: App, plugin: ArfidTrackerPlugin, prefillFood?: string, prefillKind?: NoteKind) {
		super(app);
		this.plugin = plugin;
		if (prefillFood) this.foodName = prefillFood;
		if (prefillKind) this.kind = prefillKind;
	}

	onOpen(): void {
		this.foods = this.plugin.store.getFoods();
		const { contentEl } = this;
		contentEl.addClass("arfid-plugin", "arfid-quicklog");
		this.titleEl.setText("Add a ritual, order, or recipe");

		contentEl.createDiv({ cls: "arfid-field-label", text: "Food" });
		const foodInput = contentEl.createEl("input", {
			cls: "arfid-input",
			attr: { type: "text", placeholder: "Which food is this about?" },
		});
		foodInput.value = this.foodName;
		const suggestions = contentEl.createDiv({ cls: "arfid-suggestions" });
		const renderSuggestions = () => {
			suggestions.empty();
			const q = normalizeFoodKey(foodInput.value);
			const matches = this.foods.filter((f) => (!q || f.key.includes(q)) && f.key !== q).slice(0, 6);
			for (const f of matches) {
				const chip = suggestions.createEl("button", { cls: "arfid-chip arfid-suggestion" });
				chip.createSpan({ cls: `arfid-status-dot arfid-status-${f.currentStatus}` });
				chip.createSpan({ text: f.name });
				chip.addEventListener("click", () => {
					foodInput.value = f.name;
					this.foodName = f.name;
					renderSuggestions();
				});
			}
		};
		foodInput.addEventListener("input", () => {
			this.foodName = foodInput.value;
			renderSuggestions();
		});
		renderSuggestions();

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

		const save = contentEl.createEl("button", { cls: "arfid-save-btn", text: "Save note" });
		save.addEventListener("click", () => void this.save());
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
		const date = isoDate(new Date());
		const content = buildFoodNote(date, food, this.kind, this.body);

		const folder = this.plugin.settings.entriesFolder.trim().replace(/\/+$/, "");
		if (folder && !(this.app.vault.getAbstractFileByPath(normalizePath(folder)) instanceof TFolder)) {
			await this.app.vault.createFolder(normalizePath(folder)).catch(() => {});
		}
		const base = sanitizeForFilename(`${food} — ${NOTE_KIND_LABELS[this.kind].toLowerCase()}`);
		let path = normalizePath((folder ? folder + "/" : "") + base + ".md");
		let n = 1;
		while (this.app.vault.getAbstractFileByPath(path)) {
			path = normalizePath((folder ? folder + "/" : "") + `${base} ${++n}` + ".md");
		}
		await this.app.vault.create(path, content);

		new Notice(`Saved ${NOTE_KIND_LABELS[this.kind].toLowerCase()} for ${food}.`);
		this.close();
		this.plugin.notifyDataChanged();
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
