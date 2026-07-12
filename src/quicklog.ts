import { App, Notice } from "obsidian";
import {
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
import { buildChipPicker, buildChoiceRow, buildFoodPicker, buildStrategySection } from "./chips";
import { ArfidModal } from "./modal";
import { StatusChangeModal } from "./statuschange";
import type ArfidTrackerPlugin from "./main";

export interface QuickLogPrefill {
	food?: string;
	meal?: MealType;
}

/** Quick-log modal: food name with autocomplete, meal/outcome chips,
 * everything else behind an "Add details" disclosure. Logging never touches
 * a food's category — that's a deliberate, separate action. Designed for
 * one-handed use — every control is a ≥44px tap target. */
export class QuickLogModal extends ArfidModal {
	private foods: FoodSummary[] = [];
	private prefill: QuickLogPrefill;

	private foodName = "";
	private meal: MealType = "";
	private outcome: Outcome | "" = "full";
	private textureNotes = "";
	private contexts = new Set<string>();
	private strategies = new Set<string>();
	private strategyWorked: StrategyWorked = "n/a";
	private tagsText = "";

	private categoryLine!: HTMLElement;

	constructor(app: App, plugin: ArfidTrackerPlugin, prefill: QuickLogPrefill = {}) {
		super(app, plugin, "Log a food");
		this.prefill = prefill;
	}

	protected buildContent(): void {
		this.foods = this.plugin.store.getFoods();
		this.foodName = this.prefill.food ?? "";
		this.meal = this.prefill.meal ?? guessMealType(new Date());
		const { contentEl } = this;

		const { input: foodInput } = buildFoodPicker(contentEl, this.foods, {
			placeholder: "Food or drink (e.g. scrambled eggs, water)",
			initial: this.foodName,
			onChange: (name) => {
				this.foodName = name;
				this.updateCategoryLine();
			},
		});
		this.categoryLine = contentEl.createDiv({ cls: "arfid-hint arfid-category-line" });
		this.updateCategoryLine();

		contentEl.createDiv({ cls: "arfid-field-label", text: "Meal" });
		buildChoiceRow<Exclude<MealType, "">>(
			contentEl,
			MEAL_TYPES.map((m) => ({ value: m, label: MEAL_LABELS[m] })),
			this.meal === "" ? "" : this.meal,
			(v) => (this.meal = v),
			true
		);

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

	/** Show the known food's category (informational — logging never changes
	 * it) with a tap-through to the dedicated change flow. */
	private updateCategoryLine(): void {
		this.categoryLine.empty();
		const known = findFood(this.foods, this.foodName);
		if (!known) return;
		this.categoryLine.createSpan({
			text: `Category: ${STATUS_LABELS[known.currentStatus].toLowerCase()} · `,
		});
		const change = this.categoryLine.createEl("a", { text: "change" });
		change.addEventListener("click", () => {
			this.close();
			new StatusChangeModal(this.app, this.plugin, known.name).open();
		});
	}

	private async save(): Promise<void> {
		const food = this.foodName.trim();
		if (!food) {
			new Notice("Add a food name first.");
			return;
		}
		const { date, time } = nowStamp();
		const strategies = [...this.strategies];

		const note = buildEntryNote({
			date,
			time,
			food,
			meal: this.meal,
			status: "", // ordinary logs never assert a category
			outcome: this.outcome,
			exposure: false,
			exposureStep: "",
			statusReason: "",
			textureNotes: this.textureNotes.trim(),
			context: [...this.contexts],
			strategies,
			strategyWorked: strategies.length > 0 ? this.strategyWorked : "n/a",
			tags: splitList(this.tagsText),
		});

		await this.plugin.saveSettings(); // persist any auto-grown chip lists
		const mealPrefix = this.meal ? `${this.meal}: ` : "";
		await saveEntryNote(this.plugin, date, time, food, note, {
			dailyLabel: `${mealPrefix}${food}${this.outcome ? " — " + this.outcome : ""}`,
			notice: `Logged ${food}`,
		});
		this.close();
	}
}
