import { App, Modal, Notice } from "obsidian";
import {
	EXPOSURE_STEP_LABELS,
	EXPOSURE_STEPS,
	ExposureStep,
	FOOD_STATUSES,
	FoodStatus,
	FoodSummary,
	STATUS_LABELS,
	StrategyWorked,
	normalizeFoodKey,
} from "./types";
import { isoDate, isoTime } from "./store";
import { buildEntryNote } from "./serialize";
import { linkIntoDailyNote } from "./dailynote";
import { buildChecklist, buildChipPicker, buildChoiceRow } from "./chips";
import { createEntryFile } from "./quicklog";
import type ArfidTrackerPlugin from "./main";

/** Exposure logging: pick a fear/trying food, see the exposure checklist,
 * record how far up the ladder this exposure went, the environment, and the
 * thoughts around it. Any step counts. */
export class ExposureModal extends Modal {
	private plugin: ArfidTrackerPlugin;
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
	private workedSection!: HTMLElement;

	constructor(app: App, plugin: ArfidTrackerPlugin, prefillFood?: string) {
		super(app);
		this.plugin = plugin;
		if (prefillFood) this.foodName = prefillFood;
	}

	onOpen(): void {
		this.foods = this.plugin.store.getFoods();
		const { contentEl } = this;
		contentEl.addClass("arfid-plugin", "arfid-quicklog", "arfid-exposure");
		this.titleEl.setText("Log an exposure");

		buildChecklist(contentEl, "During the exposure", this.plugin.settings.exposureChecklist);

		// --- food (fear/trying foods suggested first) ---
		contentEl.createDiv({ cls: "arfid-field-label", text: "Food" });
		const foodInput = contentEl.createEl("input", {
			cls: "arfid-input",
			attr: { type: "text", placeholder: "Which food?", enterkeyhint: "done" },
		});
		foodInput.value = this.foodName;
		const suggestions = contentEl.createDiv({ cls: "arfid-suggestions" });

		const candidates = () => {
			const q = normalizeFoodKey(foodInput.value);
			const pool = [...this.foods].sort((a, b) => {
				const rank = (f: FoodSummary) => (f.currentStatus === "fear" ? 0 : f.currentStatus === "trying" ? 1 : 2);
				return rank(a) - rank(b) || b.lastLogged.localeCompare(a.lastLogged);
			});
			return pool.filter((f) => (!q || f.key.includes(q)) && f.key !== q).slice(0, 6);
		};
		const syncStatusToKnown = () => {
			const known = this.foods.find((f) => f.key === normalizeFoodKey(foodInput.value));
			if (known && !this.statusTouched) {
				this.status = known.currentStatus;
				this.statusSetter?.set(known.currentStatus);
			}
		};
		const renderSuggestions = () => {
			suggestions.empty();
			for (const f of candidates()) {
				const chip = suggestions.createEl("button", { cls: "arfid-chip arfid-suggestion" });
				chip.createSpan({ cls: `arfid-status-dot arfid-status-${f.currentStatus}` });
				chip.createSpan({ text: f.name });
				chip.addEventListener("click", () => {
					foodInput.value = f.name;
					this.foodName = f.name;
					syncStatusToKnown();
					renderSuggestions();
				});
			}
		};
		foodInput.addEventListener("input", () => {
			this.foodName = foodInput.value;
			syncStatusToKnown();
			renderSuggestions();
		});
		renderSuggestions();

		// --- how far did it go ---
		contentEl.createDiv({ cls: "arfid-field-label", text: "How far did it go? (any step counts)" });
		buildChoiceRow<Exclude<ExposureStep, "">>(
			contentEl,
			EXPOSURE_STEPS.map((s) => ({ value: s, label: EXPOSURE_STEP_LABELS[s] })),
			"",
			(v) => (this.step = v),
			true
		);

		// --- status ---
		contentEl.createDiv({ cls: "arfid-field-label", text: "Status" });
		this.statusSetter = buildChoiceRow<FoodStatus>(
			contentEl,
			FOOD_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s], dotClass: `arfid-status-${s}` })),
			this.status,
			(v) => {
				if (v !== "") {
					this.status = v;
					this.statusTouched = true;
				}
			}
		);
		syncStatusToKnown();

		// --- environment & strategies ---
		buildChipPicker(contentEl, "Environment & context", this.plugin.settings.knownContexts, this.contexts);
		buildChipPicker(contentEl, "Strategies used", this.plugin.settings.knownStrategies, this.strategies, () =>
			this.updateWorkedVisibility()
		);
		this.workedSection = contentEl.createDiv();
		this.workedSection.createDiv({ cls: "arfid-field-label", text: "Did the strategy help?" });
		buildChoiceRow<"true" | "false" | "n/a">(
			this.workedSection,
			[
				{ value: "true", label: "Helped" },
				{ value: "false", label: "Didn't help" },
				{ value: "n/a", label: "Not sure" },
			],
			"n/a",
			(v) => (this.strategyWorked = v === "true" ? true : v === "false" ? false : "n/a")
		);
		this.updateWorkedVisibility();

		// --- thoughts ---
		contentEl.createDiv({ cls: "arfid-field-label", text: "How did it go? (saved into the note)" });
		const thoughts = contentEl.createEl("textarea", {
			cls: "arfid-textarea",
			attr: { rows: "3", placeholder: "What happened, what it felt like, what the next step could be…" },
		});
		thoughts.addEventListener("input", () => (this.thoughts = thoughts.value));

		const save = contentEl.createEl("button", { cls: "arfid-save-btn", text: "Save exposure" });
		save.addEventListener("click", () => void this.save());
		this.scope.register(["Mod"], "Enter", () => {
			void this.save();
			return false;
		});

		if (!this.foodName) window.setTimeout(() => foodInput.focus(), 50);
	}

	private updateWorkedVisibility(): void {
		if (this.strategies.size > 0) this.workedSection.show();
		else this.workedSection.hide();
	}

	private async save(): Promise<void> {
		const food = this.foodName.trim();
		if (!food) {
			new Notice("Add a food name first.");
			return;
		}
		const now = new Date();
		const date = isoDate(now);
		const time = isoTime(now);
		const strategies = [...this.strategies];

		// eating steps also fill the outcome field so meal stats stay coherent
		const outcome = this.step === "portion" ? "full" : this.step === "bite" || this.step === "tasted" ? "partial" : "";

		const note = buildEntryNote({
			date,
			time,
			food,
			meal: "",
			status: this.status,
			outcome,
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

		const file = await createEntryFile(this.app, this.plugin, date, time, food, note);
		await this.plugin.saveSettings();

		if (this.plugin.settings.dailyNoteLinking) {
			const stepLabel = this.step ? EXPOSURE_STEP_LABELS[this.step as Exclude<ExposureStep, "">].toLowerCase() : "exposure";
			const label = `exposure: ${food} — ${stepLabel}`;
			try {
				await linkIntoDailyNote(this.app, this.plugin.settings, date, time, file.basename, label);
			} catch (e) {
				console.error("ARFID Tracker: daily note linking failed", e);
			}
		}

		new Notice(`Exposure logged — nice work with ${food}.`);
		this.close();
		this.plugin.notifyDataChanged();
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
