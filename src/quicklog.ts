import { App, Notice } from "obsidian";
import {
	FoodStatus,
	FoodSummary,
	MEAL_LABELS,
	MEAL_TYPES,
	MealType,
	OUTCOME_LABELS,
	OUTCOMES,
	Outcome,
	STATUS_LABELS,
	StrategyWorked,
	findFood,
	guessMealType,
	splitList,
} from "./types";
import { nowStamp } from "./store";
import { buildEntryNote } from "./serialize";
import { saveEntryNote } from "./files";
import { buildChipPicker, buildChoiceRow, buildFoodPicker, buildStatusRow, buildStrategySection } from "./chips";
import { ArfidModal } from "./modal";
import type ArfidTrackerPlugin from "./main";

export interface QuickLogPrefill {
	food?: string;
	status?: FoodStatus;
	meal?: MealType;
}

/** Quick-log modal: food name with autocomplete, meal/status/outcome chips,
 * everything else behind an "Add details" disclosure. Designed for
 * one-handed use — every control is a ≥44px tap target. */
export class QuickLogModal extends ArfidModal {
	private foods: FoodSummary[] = [];
	private prefill: QuickLogPrefill;

	private foodName = "";
	private meal: MealType = "";
	private status: FoodStatus = "trying";
	private statusTouched = false;
	private outcome: Outcome | "" = "full";
	private statusReason = "";
	private textureNotes = "";
	private contexts = new Set<string>();
	private strategies = new Set<string>();
	private strategyWorked: StrategyWorked = "n/a";
	private tagsText = "";

	private statusSetter: { set: (v: FoodStatus | "") => void } | null = null;
	private reasonSection!: HTMLElement;

	constructor(app: App, plugin: ArfidTrackerPlugin, prefill: QuickLogPrefill = {}) {
		super(app, plugin, "Log a food");
		this.prefill = prefill;
	}

	protected buildContent(): void {
		this.foods = this.plugin.store.getFoods();
		this.foodName = this.prefill.food ?? "";
		this.meal = this.prefill.meal ?? guessMealType(new Date());
		if (this.prefill.status) {
			this.status = this.prefill.status;
			this.statusTouched = true;
		}
		const { contentEl } = this;

		const { input: foodInput } = buildFoodPicker(contentEl, this.foods, {
			placeholder: "Food (e.g. scrambled eggs)",
			initial: this.foodName,
			onChange: (name) => {
				this.foodName = name;
				// follow a known food's current status until the user picks one
				const known = findFood(this.foods, name);
				if (known && !this.statusTouched) this.setStatus(known.currentStatus, false);
				this.updateReasonVisibility();
			},
		});

		contentEl.createDiv({ cls: "arfid-field-label", text: "Meal" });
		buildChoiceRow<Exclude<MealType, "">>(
			contentEl,
			MEAL_TYPES.map((m) => ({ value: m, label: MEAL_LABELS[m] })),
			this.meal === "" ? "" : this.meal,
			(v) => (this.meal = v),
			true
		);

		contentEl.createDiv({ cls: "arfid-field-label", text: "Status" });
		this.statusSetter = buildStatusRow(contentEl, this.status, (v) => {
			if (v !== "") this.setStatus(v, true);
		});

		// status change reason (shown when a known food's status changes)
		this.reasonSection = contentEl.createDiv();
		this.reasonSection.createDiv({ cls: "arfid-field-label", text: "What changed? (why is this food moving?)" });
		const reason = this.reasonSection.createEl("textarea", {
			cls: "arfid-textarea",
			attr: { rows: "2", placeholder: "The specific thought or moment behind the change — future you will want this." },
		});
		reason.addEventListener("input", () => (this.statusReason = reason.value));
		this.updateReasonVisibility();

		contentEl.createDiv({ cls: "arfid-field-label", text: "Outcome" });
		buildChoiceRow<Outcome>(
			contentEl,
			OUTCOMES.map((o) => ({ value: o, label: OUTCOME_LABELS[o] })),
			this.outcome,
			(v) => (this.outcome = v),
			true
		);

		const detailsToggle = contentEl.createEl("button", {
			cls: "arfid-details-toggle",
			text: "Add details",
		});
		const details = contentEl.createDiv({ cls: "arfid-details" });
		details.hide();
		detailsToggle.addEventListener("click", () => {
			const open = details.isShown();
			if (open) details.hide();
			else details.show();
			detailsToggle.setText(open ? "Add details" : "Hide details");
		});

		buildStrategySection(details, this.plugin.settings.knownStrategies, this.strategies, (w) => (this.strategyWorked = w));
		buildChipPicker(details, "Context", this.plugin.settings.knownContexts, this.contexts);

		details.createDiv({ cls: "arfid-field-label", text: "Texture notes" });
		const texture = details.createEl("textarea", {
			cls: "arfid-textarea",
			attr: { rows: "2", placeholder: "Texture, temperature, presentation…" },
		});
		texture.addEventListener("input", () => (this.textureNotes = texture.value));

		details.createDiv({ cls: "arfid-field-label", text: "Tags" });
		const tags = details.createEl("input", {
			cls: "arfid-input",
			attr: { type: "text", placeholder: "comma, separated" },
		});
		tags.addEventListener("input", () => (this.tagsText = tags.value));

		this.addSaveButton("Save entry", () => this.save());
		if (!this.foodName) window.setTimeout(() => foodInput.focus(), 50);
	}

	private setStatus(s: FoodStatus, touched: boolean): void {
		this.status = s;
		if (touched) this.statusTouched = true;
		this.statusSetter?.set(s);
		this.updateReasonVisibility();
	}

	/** Ask "what changed?" only when this entry moves a known food to a new status. */
	private updateReasonVisibility(): void {
		if (!this.reasonSection) return;
		const known = findFood(this.foods, this.foodName);
		if (known && known.currentStatus !== this.status) this.reasonSection.show();
		else this.reasonSection.hide();
	}

	private async save(): Promise<void> {
		const food = this.foodName.trim();
		if (!food) {
			new Notice("Add a food name first.");
			return;
		}
		const { date, time } = nowStamp();
		const strategies = [...this.strategies];
		const known = findFood(this.foods, food);
		const isShift = !!known && known.currentStatus !== this.status;

		const note = buildEntryNote({
			date,
			time,
			food,
			meal: this.meal,
			status: this.status,
			outcome: this.outcome,
			exposure: false,
			exposureStep: "",
			statusReason: isShift ? this.statusReason.trim() : "",
			textureNotes: this.textureNotes.trim(),
			context: [...this.contexts],
			strategies,
			strategyWorked: strategies.length > 0 ? this.strategyWorked : "n/a",
			tags: splitList(this.tagsText),
		});

		await this.plugin.saveSettings(); // persist any auto-grown chip lists
		const mealPrefix = this.meal ? `${this.meal}: ` : "";
		await saveEntryNote(this.plugin, date, time, food, note, {
			dailyLabel: `${mealPrefix}${food} — ${STATUS_LABELS[this.status].toLowerCase()}${this.outcome ? ", " + this.outcome : ""}`,
			notice: `Logged ${food}`,
		});
		this.close();
	}
}
