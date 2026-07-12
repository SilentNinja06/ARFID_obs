import { App, Modal, Notice } from "obsidian";
import { FOOD_STATUSES, FoodStatus, FoodSummary, STATUS_LABELS, normalizeFoodKey } from "./types";
import { isoDate, isoTime } from "./store";
import { buildEntryNote } from "./serialize";
import { linkIntoDailyNote } from "./dailynote";
import { buildChoiceRow } from "./chips";
import { createEntryFile } from "./quicklog";
import type ArfidTrackerPlugin from "./main";

/** Change a food's status in two taps, with a place to capture the specific
 * thought behind the change. Saves a minimal food-entry so the change shows
 * up in the status shift tracker with its reason. */
export class StatusChangeModal extends Modal {
	private plugin: ArfidTrackerPlugin;
	private foods: FoodSummary[] = [];
	private foodName = "";
	private status: FoodStatus | "" = "";
	private reason = "";
	private currentLine!: HTMLElement;
	private statusSetter: { set: (v: FoodStatus | "") => void } | null = null;

	constructor(app: App, plugin: ArfidTrackerPlugin, prefillFood?: string) {
		super(app);
		this.plugin = plugin;
		if (prefillFood) this.foodName = prefillFood;
	}

	onOpen(): void {
		this.foods = this.plugin.store.getFoods();
		const { contentEl } = this;
		contentEl.addClass("arfid-plugin", "arfid-quicklog");
		this.titleEl.setText("Change a food's status");

		contentEl.createDiv({ cls: "arfid-field-label", text: "Food" });
		const foodInput = contentEl.createEl("input", {
			cls: "arfid-input",
			attr: { type: "text", placeholder: "Which food?" },
		});
		foodInput.value = this.foodName;
		const suggestions = contentEl.createDiv({ cls: "arfid-suggestions" });
		this.currentLine = contentEl.createDiv({ cls: "arfid-hint" });

		const updateCurrent = () => {
			const known = this.known();
			this.currentLine.setText(
				known ? `Currently: ${STATUS_LABELS[known.currentStatus]} (since ${known.lastLogged})` : ""
			);
		};
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
					updateCurrent();
				});
			}
		};
		foodInput.addEventListener("input", () => {
			this.foodName = foodInput.value;
			renderSuggestions();
			updateCurrent();
		});
		renderSuggestions();
		updateCurrent();

		contentEl.createDiv({ cls: "arfid-field-label", text: "New status" });
		this.statusSetter = buildChoiceRow<FoodStatus>(
			contentEl,
			FOOD_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s], dotClass: `arfid-status-${s}` })),
			"",
			(v) => (this.status = v)
		);

		contentEl.createDiv({ cls: "arfid-field-label", text: "What changed?" });
		const reason = contentEl.createEl("textarea", {
			cls: "arfid-textarea",
			attr: {
				rows: "3",
				placeholder: "The specific thought or moment behind this — why was it gained or lost?",
			},
		});
		reason.addEventListener("input", () => (this.reason = reason.value));

		const save = contentEl.createEl("button", { cls: "arfid-save-btn", text: "Save status change" });
		save.addEventListener("click", () => void this.save());
	}

	private known(): FoodSummary | undefined {
		return this.foods.find((f) => f.key === normalizeFoodKey(this.foodName));
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
		const known = this.known();
		if (known && known.currentStatus === this.status) {
			new Notice(`${food} is already marked ${STATUS_LABELS[this.status].toLowerCase()}.`);
			return;
		}
		const now = new Date();
		const date = isoDate(now);
		const time = isoTime(now);

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

		const file = await createEntryFile(this.app, this.plugin, date, time, food, note);

		if (this.plugin.settings.dailyNoteLinking) {
			const fromLabel = known ? `${STATUS_LABELS[known.currentStatus].toLowerCase()} → ` : "";
			const label = `status: ${food} — ${fromLabel}${STATUS_LABELS[this.status].toLowerCase()}`;
			try {
				await linkIntoDailyNote(this.app, this.plugin.settings, date, time, file.basename, label);
			} catch (e) {
				console.error("ARFID Tracker: daily note linking failed", e);
			}
		}

		new Notice(`${food} → ${STATUS_LABELS[this.status].toLowerCase()}`);
		this.close();
		this.plugin.notifyDataChanged();
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
