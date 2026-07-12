import { App, Modal, Notice, TFolder, normalizePath } from "obsidian";
import {
	FOOD_STATUSES,
	FoodStatus,
	FoodSummary,
	OUTCOME_LABELS,
	OUTCOMES,
	Outcome,
	STATUS_LABELS,
	StrategyWorked,
	normalizeFoodKey,
} from "./types";
import { isoDate, isoTime } from "./store";
import { buildEntryNote, sanitizeForFilename } from "./serialize";
import { linkIntoDailyNote } from "./dailynote";
import type ArfidTrackerPlugin from "./main";

/** Quick-log modal: food name with autocomplete, status + outcome chips,
 * everything else behind an "Add details" disclosure. Designed for
 * one-handed use — every control is a ≥44px tap target. */
export class QuickLogModal extends Modal {
	private plugin: ArfidTrackerPlugin;
	private foods: FoodSummary[] = [];

	private foodName = "";
	private status: FoodStatus = "trying";
	private statusTouched = false;
	private outcome: Outcome | "" = "full";
	private textureNotes = "";
	private contexts = new Set<string>();
	private strategies = new Set<string>();
	private strategyWorked: StrategyWorked = "n/a";
	private tagsText = "";

	private statusRow!: HTMLElement;
	private workedSection!: HTMLElement;

	constructor(app: App, plugin: ArfidTrackerPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen(): void {
		this.foods = this.plugin.store.getFoods();
		const { contentEl } = this;
		contentEl.addClass("arfid-plugin", "arfid-quicklog");
		this.titleEl.setText("Log a food");

		// --- food name + autocomplete ---
		const foodInput = contentEl.createEl("input", {
			cls: "arfid-input",
			attr: { type: "text", placeholder: "Food (e.g. scrambled eggs)", enterkeyhint: "done" },
		});
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
				});
			}
		};
		foodInput.addEventListener("input", () => {
			this.foodName = foodInput.value;
			// if the typed name is a known food, follow its current status
			const known = this.foods.find((f) => f.key === normalizeFoodKey(foodInput.value));
			if (known && !this.statusTouched) this.setStatus(known.currentStatus, false);
			renderSuggestions();
		});
		renderSuggestions();

		// --- status ---
		contentEl.createDiv({ cls: "arfid-field-label", text: "Status" });
		this.statusRow = contentEl.createDiv({ cls: "arfid-chip-row" });
		for (const s of FOOD_STATUSES) {
			const chip = this.statusRow.createEl("button", {
				cls: "arfid-chip arfid-choice",
				text: STATUS_LABELS[s],
				attr: { "data-value": s },
			});
			chip.createSpan({ cls: `arfid-status-dot arfid-status-${s}` }, (el) => chip.prepend(el));
			chip.addEventListener("click", () => this.setStatus(s, true));
		}
		this.setStatus(this.status, false);

		// --- outcome ---
		contentEl.createDiv({ cls: "arfid-field-label", text: "Outcome" });
		const outcomeRow = contentEl.createDiv({ cls: "arfid-chip-row" });
		for (const o of OUTCOMES) {
			const chip = outcomeRow.createEl("button", {
				cls: "arfid-chip arfid-choice",
				text: OUTCOME_LABELS[o],
				attr: { "data-value": o },
			});
			chip.addEventListener("click", () => {
				this.outcome = this.outcome === o ? "" : o;
				outcomeRow.querySelectorAll(".arfid-choice").forEach((c) => {
					c.toggleClass("is-selected", c.getAttribute("data-value") === this.outcome);
				});
			});
		}
		outcomeRow.querySelector(`[data-value="${this.outcome}"]`)?.addClass("is-selected");

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

		this.buildChipPicker(details, "Strategies used", this.plugin.settings.knownStrategies, this.strategies, () =>
			this.updateWorkedVisibility()
		);
		this.workedSection = details.createDiv();
		this.workedSection.createDiv({ cls: "arfid-field-label", text: "Did the strategy help?" });
		const workedRow = this.workedSection.createDiv({ cls: "arfid-chip-row" });
		const workedOptions: [StrategyWorked, string][] = [
			[true, "Helped"],
			[false, "Didn't help"],
			["n/a", "Not sure"],
		];
		for (const [value, label] of workedOptions) {
			const chip = workedRow.createEl("button", {
				cls: "arfid-chip arfid-choice",
				text: label,
				attr: { "data-value": String(value) },
			});
			chip.addEventListener("click", () => {
				this.strategyWorked = value;
				workedRow.querySelectorAll(".arfid-choice").forEach((c) => {
					c.toggleClass("is-selected", c.getAttribute("data-value") === String(value));
				});
			});
		}
		workedRow.querySelector(`[data-value="n/a"]`)?.addClass("is-selected");
		this.updateWorkedVisibility();

		this.buildChipPicker(details, "Context", this.plugin.settings.knownContexts, this.contexts);

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

		window.setTimeout(() => foodInput.focus(), 50);
	}

	private setStatus(s: FoodStatus, touched: boolean): void {
		this.status = s;
		if (touched) this.statusTouched = true;
		this.statusRow?.querySelectorAll(".arfid-choice").forEach((c) => {
			c.toggleClass("is-selected", c.getAttribute("data-value") === s);
		});
	}

	private updateWorkedVisibility(): void {
		if (this.strategies.size > 0) this.workedSection.show();
		else this.workedSection.hide();
	}

	/** Chip picker backed by a persisted known-items list: one-tap toggles,
	 * plus an input that adds (and remembers) new items. */
	private buildChipPicker(
		parent: HTMLElement,
		label: string,
		known: string[],
		selected: Set<string>,
		onChange?: () => void
	): void {
		parent.createDiv({ cls: "arfid-field-label", text: label });
		const row = parent.createDiv({ cls: "arfid-chip-row arfid-chip-wrap" });

		const addChip = (item: string) => {
			const chip = row.createEl("button", { cls: "arfid-chip arfid-choice", text: item });
			chip.toggleClass("is-selected", selected.has(item));
			chip.addEventListener("click", () => {
				if (selected.has(item)) selected.delete(item);
				else selected.add(item);
				chip.toggleClass("is-selected", selected.has(item));
				onChange?.();
			});
		};
		for (const item of known) addChip(item);

		const addRow = parent.createDiv({ cls: "arfid-add-row" });
		const input = addRow.createEl("input", {
			cls: "arfid-input",
			attr: { type: "text", placeholder: `Add ${label.toLowerCase()}…` },
		});
		const addBtn = addRow.createEl("button", { cls: "arfid-chip", text: "+ Add" });
		const commit = () => {
			const v = input.value.trim();
			if (!v) return;
			input.value = "";
			if (!known.some((k) => k.toLowerCase() === v.toLowerCase())) {
				known.push(v);
				addChip(v);
			}
			selected.add(v);
			row.querySelectorAll(".arfid-choice").forEach((c) => {
				if (c.textContent === v) c.addClass("is-selected");
			});
			onChange?.();
		};
		addBtn.addEventListener("click", commit);
		input.addEventListener("keydown", (ev) => {
			if (ev.key === "Enter") {
				ev.preventDefault();
				commit();
			}
		});
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

		const note = buildEntryNote({
			date,
			time,
			food,
			status: this.status,
			outcome: this.outcome,
			textureNotes: this.textureNotes.trim(),
			context: [...this.contexts],
			strategies,
			strategyWorked: strategies.length > 0 ? this.strategyWorked : "n/a",
			tags: this.tagsText
				.split(",")
				.map((t) => t.trim())
				.filter((t) => t.length > 0),
		});

		const file = await this.createEntryFile(date, time, food, note);
		await this.plugin.saveSettings(); // persist any auto-grown chip lists

		if (this.plugin.settings.dailyNoteLinking) {
			const label = `${food} — ${STATUS_LABELS[this.status].toLowerCase()}${this.outcome ? ", " + this.outcome : ""}`;
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

	private async createEntryFile(date: string, time: string, food: string, content: string) {
		const folder = this.plugin.settings.entriesFolder.trim().replace(/\/+$/, "");
		if (folder && !(this.app.vault.getAbstractFileByPath(normalizePath(folder)) instanceof TFolder)) {
			await this.app.vault.createFolder(normalizePath(folder)).catch(() => {});
		}
		const base = sanitizeForFilename(
			this.plugin.settings.filenameTemplate
				.replace(/{{\s*date\s*}}/gi, date)
				.replace(/{{\s*time\s*}}/gi, time.replace(":", "."))
				.replace(/{{\s*food\s*}}/gi, food)
		) || `${date} ${time.replace(":", ".")} ${sanitizeForFilename(food)}`;

		let path = normalizePath((folder ? folder + "/" : "") + base + ".md");
		let n = 1;
		while (this.app.vault.getAbstractFileByPath(path)) {
			path = normalizePath((folder ? folder + "/" : "") + `${base} ${++n}` + ".md");
		}
		return this.app.vault.create(path, content);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
