/** Shared chip UI helpers used by the quick-log, exposure, and support modals. */

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
