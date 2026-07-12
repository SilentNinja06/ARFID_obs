import { App, Notice } from "obsidian";
import { FoodStatus, FoodSummary, STATUS_LABELS, findFood } from "./types";
import { nowStamp } from "./store";
import { buildEntryNote } from "./serialize";
import { saveEntryNote } from "./files";
import { buildFoodPicker, buildStatusRow } from "./chips";
import { ArfidModal } from "./modal";
import type ArfidTrackerPlugin from "./main";

/** Change a food's status in two taps, with a place to capture the specific
 * thought behind the change. Saves a minimal food-entry so the change shows
 * up in the status shift tracker with its reason. */
export class StatusChangeModal extends ArfidModal {
	private foods: FoodSummary[] = [];
	private foodName = "";
	private status: FoodStatus | "" = "";
	private reason = "";
	private currentLine!: HTMLElement;

	constructor(app: App, plugin: ArfidTrackerPlugin, prefillFood?: string) {
		super(app, plugin, "Change a food's status");
		if (prefillFood) this.foodName = prefillFood;
	}

	protected buildContent(): void {
		this.foods = this.plugin.store.getFoods();
		const { contentEl } = this;

		contentEl.createDiv({ cls: "arfid-field-label", text: "Food" });
		buildFoodPicker(contentEl, this.foods, {
			placeholder: "Which food?",
			initial: this.foodName,
			onChange: (name) => {
				this.foodName = name;
				this.updateCurrent();
			},
		});
		this.currentLine = contentEl.createDiv({ cls: "arfid-hint" });
		this.updateCurrent();

		contentEl.createDiv({ cls: "arfid-field-label", text: "New status" });
		buildStatusRow(contentEl, "", (v) => (this.status = v));

		contentEl.createDiv({ cls: "arfid-field-label", text: "What changed?" });
		const reason = contentEl.createEl("textarea", {
			cls: "arfid-textarea",
			attr: {
				rows: "3",
				placeholder: "The specific thought or moment behind this — why was it gained or lost?",
			},
		});
		reason.addEventListener("input", () => (this.reason = reason.value));

		this.addSaveButton("Save status change", () => this.save());
	}

	private updateCurrent(): void {
		const known = findFood(this.foods, this.foodName);
		this.currentLine.setText(
			known ? `Currently: ${STATUS_LABELS[known.currentStatus]} (since ${known.lastLogged})` : ""
		);
	}

	private async save(): Promise<void> {
		const food = this.foodName.trim();
		if (!food) {
			new Notice("Add a food name first.");
			return;
		}
		if (!this.status) {
			new Notice("Pick the new status.");
			return;
		}
		const known = findFood(this.foods, food);
		if (known && known.currentStatus === this.status) {
			new Notice(`${food} is already marked ${STATUS_LABELS[this.status].toLowerCase()}.`);
			return;
		}
		const { date, time } = nowStamp();
		const note = buildEntryNote({
			date,
			time,
			food,
			meal: "",
			status: this.status,
			outcome: "",
			exposure: false,
			exposureStep: "",
			statusReason: this.reason.trim(),
			textureNotes: "",
			context: [],
			strategies: [],
			strategyWorked: "n/a",
			tags: ["status-change"],
		});

		const fromLabel = known ? `${STATUS_LABELS[known.currentStatus].toLowerCase()} → ` : "";
		await saveEntryNote(this.plugin, date, time, food, note, {
			dailyLabel: `status: ${food} — ${fromLabel}${STATUS_LABELS[this.status].toLowerCase()}`,
			notice: `${food} → ${STATUS_LABELS[this.status].toLowerCase()}`,
		});
		this.close();
	}
}
