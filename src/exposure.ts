import { App, Notice } from "obsidian";
import {
	EXPOSURE_STEP_LABELS,
	EXPOSURE_STEPS,
	ExposureStep,
	FoodStatus,
	FoodSummary,
	StrategyWorked,
	findFood,
	outcomeForStep,
} from "./types";
import { nowStamp } from "./store";
import { buildEntryNote } from "./serialize";
import { saveEntryNote } from "./files";
import { buildChecklist, buildChipPicker, buildChoiceRow, buildFoodPicker, buildStatusRow, buildStrategySection } from "./chips";
import { ArfidModal } from "./modal";
import type ArfidTrackerPlugin from "./main";

const statusRank: Record<FoodStatus, number> = { fear: 0, trying: 1, safe: 2, "recently-expanded": 2 };

/** Exposure logging: pick a fear/trying food, see the exposure checklist,
 * record how far up the ladder this exposure went, the environment, and the
 * thoughts around it. Any step counts. */
export class ExposureModal extends ArfidModal {
	private foods: FoodSummary[] = [];
	private foodName = "";
	private status: FoodStatus = "fear";
	private statusTouched = false;
	private step: ExposureStep = "";
	private contexts = new Set<string>();
	private strategies = new Set<string>();
	private strategyWorked: StrategyWorked = "n/a";
	private thoughts = "";

	private statusSetter: { set: (v: FoodStatus | "") => void } | null = null;

	constructor(app: App, plugin: ArfidTrackerPlugin, prefillFood?: string) {
		super(app, plugin, "Log an exposure");
		if (prefillFood) this.foodName = prefillFood;
	}

	protected buildContent(): void {
		this.foods = this.plugin.store.getFoods();
		const { contentEl } = this;

		buildChecklist(contentEl, "During the exposure", this.plugin.settings.exposureChecklist);

		contentEl.createDiv({ cls: "arfid-field-label", text: "Food" });
		const { input: foodInput } = buildFoodPicker(contentEl, this.foods, {
			placeholder: "Which food?",
			initial: this.foodName,
			// fear foods first — they're what exposures are usually about
			sort: (a, b) =>
				statusRank[a.currentStatus] - statusRank[b.currentStatus] ||
				b.lastLogged.localeCompare(a.lastLogged),
			onChange: (name) => {
				this.foodName = name;
				const known = findFood(this.foods, name);
				if (known && !this.statusTouched) {
					this.status = known.currentStatus;
					this.statusSetter?.set(known.currentStatus);
				}
			},
		});

		contentEl.createDiv({ cls: "arfid-field-label", text: "How far did it go? (any step counts)" });
		buildChoiceRow<Exclude<ExposureStep, "">>(
			contentEl,
			EXPOSURE_STEPS.map((s) => ({ value: s, label: EXPOSURE_STEP_LABELS[s] })),
			"",
			(v) => (this.step = v),
			true
		);

		contentEl.createDiv({ cls: "arfid-field-label", text: "Status" });
		this.statusSetter = buildStatusRow(contentEl, this.status, (v) => {
			if (v !== "") {
				this.status = v;
				this.statusTouched = true;
			}
		});
		const known = findFood(this.foods, this.foodName);
		if (known && !this.statusTouched) {
			this.status = known.currentStatus;
			this.statusSetter.set(known.currentStatus);
		}

		buildChipPicker(contentEl, "Environment & context", this.plugin.settings.knownContexts, this.contexts);
		buildStrategySection(contentEl, this.plugin.settings.knownStrategies, this.strategies, (w) => (this.strategyWorked = w));

		contentEl.createDiv({ cls: "arfid-field-label", text: "How did it go? (saved into the note)" });
		const thoughts = contentEl.createEl("textarea", {
			cls: "arfid-textarea",
			attr: { rows: "3", placeholder: "What happened, what it felt like, what the next step could be…" },
		});
		thoughts.addEventListener("input", () => (this.thoughts = thoughts.value));

		this.addSaveButton("Save exposure", () => this.save());
		if (!this.foodName) window.setTimeout(() => foodInput.focus(), 50);
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
			meal: "",
			status: this.status,
			outcome: outcomeForStep(this.step),
			exposure: true,
			exposureStep: this.step,
			statusReason: "",
			textureNotes: "",
			context: [...this.contexts],
			strategies,
			strategyWorked: strategies.length > 0 ? this.strategyWorked : "n/a",
			tags: [],
			body: this.thoughts.trim(),
		});

		await this.plugin.saveSettings();
		const stepLabel = this.step ? EXPOSURE_STEP_LABELS[this.step].toLowerCase() : "exposure";
		await saveEntryNote(this.plugin, date, time, food, note, {
			dailyLabel: `exposure: ${food} — ${stepLabel}`,
			notice: `Exposure logged — nice work with ${food}.`,
		});
		this.close();
	}
}
