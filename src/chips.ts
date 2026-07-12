/** Shared chip UI helpers used by the quick-log, exposure, and support modals. */

import { FOOD_STATUSES, FoodStatus, FoodSummary, STATUS_LABELS, StrategyWorked, normalizeFoodKey } from "./types";

export interface ChoiceOption<T extends string> {
	value: T;
	label: string;
	dotClass?: string;
}

/** Single-select chip row. Returns a setter so callers can change the
 * selection programmatically (e.g. autocomplete pre-filling a status). */
export function buildChoiceRow<T extends string>(
	parent: HTMLElement,
	options: ChoiceOption<T>[],
	initial: T | "",
	onChoose: (value: T | "") => void,
	allowDeselect = false
): { set: (value: T | "") => void } {
	const row = parent.createDiv({ cls: "arfid-chip-row" });
	let current: T | "" = initial;
	const update = () => {
		row.querySelectorAll(".arfid-choice").forEach((c) => {
			c.toggleClass("is-selected", c.getAttribute("data-value") === current);
		});
	};
	for (const opt of options) {
		const chip = row.createEl("button", {
			cls: "arfid-chip arfid-choice",
			attr: { "data-value": opt.value },
		});
		if (opt.dotClass) chip.createSpan({ cls: `arfid-status-dot ${opt.dotClass}` });
		chip.createSpan({ text: opt.label });
		chip.addEventListener("click", () => {
			current = allowDeselect && current === opt.value ? "" : opt.value;
			update();
			onChoose(current);
		});
	}
	update();
	return {
		set: (value: T | "") => {
			current = value;
			update();
		},
	};
}

/** The food-status choice row every entry-writing modal shows. */
export function buildStatusRow(
	parent: HTMLElement,
	initial: FoodStatus | "",
	onChoose: (value: FoodStatus | "") => void
): { set: (value: FoodStatus | "") => void } {
	return buildChoiceRow<FoodStatus>(
		parent,
		FOOD_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s], dotClass: `arfid-status-${s}` })),
		initial,
		onChoose
	);
}

/** Multi-select chip picker backed by a persisted known-items list: one-tap
 * toggles plus an input that adds (and remembers) new items. */
export function buildChipPicker(
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
		return chip;
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
		selected.add(v);
		const existing = known.find((k) => k.toLowerCase() === v.toLowerCase());
		if (existing) {
			selected.delete(v);
			selected.add(existing);
			row.querySelectorAll(".arfid-choice").forEach((c) => {
				if (c.textContent === existing) c.addClass("is-selected");
			});
		} else {
			known.push(v);
			addChip(v);
		}
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

export interface FoodPickerOptions {
	placeholder: string;
	initial?: string;
	/** Order candidates once at build time (e.g. fear foods first). Defaults
	 * to most recently logged first. */
	sort?: (a: FoodSummary, b: FoodSummary) => number;
	/** Called whenever the value changes, by typing or by tapping a chip. */
	onChange: (name: string) => void;
}

/** Food-name input with tap-to-fill suggestion chips (status dot + name).
 * With an empty query it offers the top candidates so common foods need no
 * typing at all. */
export function buildFoodPicker(
	parent: HTMLElement,
	foods: FoodSummary[],
	opts: FoodPickerOptions
): { input: HTMLInputElement } {
	const sorted = [...foods].sort(
		opts.sort ?? ((a, b) => b.lastLogged.localeCompare(a.lastLogged))
	);
	const input = parent.createEl("input", {
		cls: "arfid-input",
		attr: { type: "text", placeholder: opts.placeholder, enterkeyhint: "done" },
	});
	if (opts.initial) input.value = opts.initial;
	const suggestions = parent.createDiv({ cls: "arfid-suggestions" });

	const render = () => {
		suggestions.empty();
		const q = normalizeFoodKey(input.value);
		const matches = sorted.filter((f) => (!q || f.key.includes(q)) && f.key !== q).slice(0, 6);
		for (const f of matches) {
			const chip = suggestions.createEl("button", { cls: "arfid-chip arfid-suggestion" });
			chip.createSpan({ cls: `arfid-status-dot arfid-status-${f.currentStatus}` });
			chip.createSpan({ text: f.name });
			chip.addEventListener("click", () => {
				input.value = f.name;
				render();
				opts.onChange(f.name);
			});
		}
	};
	input.addEventListener("input", () => {
		render();
		opts.onChange(input.value);
	});
	render();
	return { input };
}

/** Strategy chips plus the "Did the strategy help?" row, which only shows
 * once at least one strategy is selected. */
export function buildStrategySection(
	parent: HTMLElement,
	knownStrategies: string[],
	selected: Set<string>,
	setWorked: (worked: StrategyWorked) => void
): void {
	let workedSection: HTMLElement;
	const updateVisibility = () => {
		if (selected.size > 0) workedSection.show();
		else workedSection.hide();
	};
	buildChipPicker(parent, "Strategies used", knownStrategies, selected, updateVisibility);
	workedSection = parent.createDiv();
	workedSection.createDiv({ cls: "arfid-field-label", text: "Did the strategy help?" });
	buildChoiceRow<"true" | "false" | "n/a">(
		workedSection,
		[
			{ value: "true", label: "Helped" },
			{ value: "false", label: "Didn't help" },
			{ value: "n/a", label: "Not sure" },
		],
		"n/a",
		(v) => setWorked(v === "true" ? true : v === "false" ? false : "n/a")
	);
	updateVisibility();
}

/** In-the-moment checklist: tappable checkboxes, nothing persisted. */
export function buildChecklist(parent: HTMLElement, label: string, items: string[]): void {
	if (items.length === 0) return;
	const box = parent.createDiv({ cls: "arfid-checklist" });
	box.createDiv({ cls: "arfid-field-label", text: label });
	for (const item of items) {
		const row = box.createEl("label", { cls: "arfid-checklist-row" });
		row.createEl("input", { attr: { type: "checkbox" } });
		row.createSpan({ text: item });
	}
}

export function pickRandom<T>(items: T[], count: number): T[] {
	const pool = [...items];
	for (let i = pool.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[pool[i], pool[j]] = [pool[j], pool[i]];
	}
	return pool.slice(0, count);
}
