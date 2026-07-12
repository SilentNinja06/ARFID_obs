import { App, Modal, Notice, TFolder, normalizePath } from "obsidian";
import {
	ExposureStep,
	FOOD_STATUSES,
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
	guessMealType,
	normalizeFoodKey,
} from "./types";
import { isoDate, isoTime } from "./store";
import { buildEntryNote, sanitizeForFilename } from "./serialize";
import { linkIntoDailyNote } from "./dailynote";
import { buildChipPicker, buildChoiceRow } from "./chips";
import type ArfidTrackerPlugin from "./main";

export interface QuickLogPrefill {
	food?: string;
	status?: FoodStatus;
	meal?: MealType;
}

/** Quick-log modal: food name with autocomplete, meal/status/outcome chips,
 * everything else behind an "Add details" disclosure. Designed for
 * one-handed use — every control is a ≥44px tap target. */
export class QuickLogModal extends Modal {
	private plugin: ArfidTrackerPlugin;
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
	private workedSection!: HTMLElement;

	constructor(app: App, plugin: ArfidTrackerPlugin, prefill: QuickLogPrefill = {}) {
		super(app);
		this.plugin = plugin;
		this.prefill = prefill;
	}

	onOpen(): void {
		this.foods = this.plugin.store.getFoods();
		this.foodName = this.prefill.food ?? "";
		this.meal = this.prefill.meal ?? guessMealType(new Date());
		if (this.prefill.status) {
			this.status = this.prefill.status;
			this.statusTouched = true;
		}

		const { contentEl } = this;
		contentEl.addClass("arfid-plugin", "arfid-quicklog");
		this.titleEl.setText("Log a food");

		// --- food name + autocomplete ---
		const foodInput = contentEl.createEl("input", {
			cls: "arfid-input",
			attr: { type: "text", placeholder: "Food (e.g. scrambled eggs)", enterkeyhint: "done" },
		});
		foodInput.value = this.foodName;
		const suggestions = contentEl.createDiv({ cls: "arfid-suggestions" });

		const renderSuggestions = () => {
			suggestions.empty();
			const q = normalizeFoodKey(foodInput.value);
			let matches: FoodSummary[];
			if (!q) {
				// most recently logged foods for zero-typing logging
				matches = [...this.foods]
					.sort((a, b) => b.lastLogged.localeCompare(a.lastLogged))
					.slice(0, 6);
			} else {
				matches = this.foods
					.filter((f) => f.key.includes(q) && f.key !== q)
					.slice(0, 6);
			}
			for (const f of matches) {
				const chip = suggestions.createEl("button", { cls: "arfid-chip arfid-suggestion" });
				chip.createSpan({ cls: `arfid-status-dot arfid-status-${f.currentStatus}` });
				chip.createSpan({ text: f.name });
				chip.addEventListener("click", () => {
					foodInput.value = f.name;
					this.foodName = f.name;
					if (!this.statusTouched) this.setStatus(f.currentStatus, false);
					renderSuggestions();
					this.updateReasonVisibility();
				});
			}
		};
		foodInput.addEventListener("input", () => {
			this.foodName = foodInput.value;
			// if the typed name is a known food, follow its current status
			const known = this.foods.find((f) => f.key === normalizeFoodKey(foodInput.value));
			if (known && !this.statusTouched) this.setStatus(known.currentStatus, false);
			renderSuggestions();
			this.updateReasonVisibility();
		});
		renderSuggestions();

		// --- meal type ---
		contentEl.createDiv({ cls: "arfid-field-label", text: "Meal" });
		buildChoiceRow<Exclude<MealType, "">>(
			contentEl,
			MEAL_TYPES.map((m) => ({ value: m, label: MEAL_LABELS[m] })),
			this.meal === "" ? "" : this.meal,
			(v) => (this.meal = v),
			true
		);

		// --- status ---
		contentEl.createDiv({ cls: "arfid-field-label", text: "Status" });
		this.statusSetter = buildChoiceRow<FoodStatus>(
			contentEl,
			FOOD_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s], dotClass: `arfid-status-${s}` })),
			this.status,
			(v) => {
				if (v !== "") this.setStatus(v, true);
			}
		);

		// --- status change reason (shown when a known food's status changes) ---
		this.reasonSection = contentEl.createDiv();
		this.reasonSection.createDiv({ cls: "arfid-field-label", text: "What changed? (why is this food moving?)" });
		const reason = this.reasonSection.createEl("textarea", {
			cls: "arfid-textarea",
			attr: { rows: "2", placeholder: "The specific thought or moment behind the change — future you will want this." },
		});
		reason.addEventListener("input", () => (this.statusReason = reason.value));
		this.updateReasonVisibility();

		// --- outcome ---
		contentEl.createDiv({ cls: "arfid-field-label", text: "Outcome" });
		buildChoiceRow<Outcome>(
			contentEl,
			OUTCOMES.map((o) => ({ value: o, label: OUTCOME_LABELS[o] })),
			this.outcome,
			(v) => (this.outcome = v),
			true
		);

		// --- details disclosure ---
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

		buildChipPicker(details, "Strategies used", this.plugin.settings.knownStrategies, this.strategies, () =>
			this.updateWorkedVisibility()
		);
		this.workedSection = details.createDiv();
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

		// --- save ---
		const save = contentEl.createEl("button", { cls: "arfid-save-btn", text: "Save entry" });
		save.addEventListener("click", () => void this.save());
		this.scope.register(["Mod"], "Enter", () => {
			void this.save();
			return false;
		});

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
		const known = this.foods.find((f) => f.key === normalizeFoodKey(this.foodName));
		if (known && known.currentStatus !== this.status) this.reasonSection.show();
		else this.reasonSection.hide();
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
		const known = this.foods.find((f) => f.key === normalizeFoodKey(food));
		const isShift = !!known && known.currentStatus !== this.status;

		const note = buildEntryNote({
			date,
			time,
			food,
			meal: this.meal,
			status: this.status,
			outcome: this.outcome,
			exposure: false,
			exposureStep: "" as ExposureStep,
			statusReason: isShift ? this.statusReason.trim() : "",
			textureNotes: this.textureNotes.trim(),
			context: [...this.contexts],
			strategies,
			strategyWorked: strategies.length > 0 ? this.strategyWorked : "n/a",
			tags: this.tagsText
				.split(",")
				.map((t) => t.trim())
				.filter((t) => t.length > 0),
		});

		const file = await createEntryFile(this.app, this.plugin, date, time, food, note);
		await this.plugin.saveSettings(); // persist any auto-grown chip lists

		if (this.plugin.settings.dailyNoteLinking) {
			const mealPrefix = this.meal ? `${this.meal}: ` : "";
			const label = `${mealPrefix}${food} — ${STATUS_LABELS[this.status].toLowerCase()}${this.outcome ? ", " + this.outcome : ""}`;
			try {
				await linkIntoDailyNote(this.app, this.plugin.settings, date, time, file.basename, label);
			} catch (e) {
				console.error("ARFID Tracker: daily note linking failed", e);
			}
		}

		new Notice(`Logged ${food}`);
		this.close();
		this.plugin.notifyDataChanged();
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

export async function createEntryFile(
	app: App,
	plugin: ArfidTrackerPlugin,
	date: string,
	time: string,
	food: string,
	content: string
) {
	const folder = plugin.settings.entriesFolder.trim().replace(/\/+$/, "");
	if (folder && !(app.vault.getAbstractFileByPath(normalizePath(folder)) instanceof TFolder)) {
		await app.vault.createFolder(normalizePath(folder)).catch(() => {});
	}
	const base = sanitizeForFilename(
		plugin.settings.filenameTemplate
			.replace(/{{\s*date\s*}}/gi, date)
			.replace(/{{\s*time\s*}}/gi, time.replace(":", "."))
			.replace(/{{\s*food\s*}}/gi, food)
	) || `${date} ${time.replace(":", ".")} ${sanitizeForFilename(food)}`;

	let path = normalizePath((folder ? folder + "/" : "") + base + ".md");
	let n = 1;
	while (app.vault.getAbstractFileByPath(path)) {
		path = normalizePath((folder ? folder + "/" : "") + `${base} ${++n}` + ".md");
	}
	return app.vault.create(path, content);
}
