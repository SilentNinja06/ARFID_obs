import { App, Notice } from "obsidian";
import { FOOD_STATUSES, FoodStatus, STATUS_LABELS, findFood, normalizeFoodKey, splitList } from "./types";
import { nowStamp } from "./store";
import { buildEntryNote } from "./serialize";
import { saveEntryNote } from "./files";
import { buildFoodPicker, buildStatusRow } from "./chips";
import { ArfidModal } from "./modal";
import { StatusChangeModal } from "./statuschange";
import type ArfidTrackerPlugin from "./main";

/** Create one baseline library entry: no meal, no outcome, nothing eaten. */
async function createBaselineEntry(
	plugin: ArfidTrackerPlugin,
	date: string,
	time: string,
	food: string,
	status: FoodStatus,
	notice?: string
): Promise<void> {
	const note = buildEntryNote({
		date,
		time,
		food,
		meal: "",
		status,
		outcome: "",
		exposure: false,
		exposureStep: "",
		statusReason: "",
		textureNotes: "",
		context: [],
		strategies: [],
		strategyWorked: "n/a",
		tags: ["baseline"],
	});
	await saveEntryNote(plugin, date, time, food, note, { notice });
}

/** Add a single food to the library at any time — for the ones remembered
 * after the initial import. Detects foods that are already tracked and hands
 * off to the status-change flow instead of duplicating them. */
export class AddFoodModal extends ArfidModal {
	private foodName = "";
	private status: FoodStatus | "" = "";
	private hintEl!: HTMLElement;
	private saveBtn!: HTMLButtonElement;

	constructor(app: App, plugin: ArfidTrackerPlugin) {
		super(app, plugin, "Add a food to your library");
	}

	protected buildContent(): void {
		const foods = this.plugin.store.getFoods();
		const { contentEl } = this;
		contentEl.createDiv({
			cls: "arfid-hint",
			text: "Nothing is logged as eaten — this just adds the food with a category.",
		});

		const { input: foodInput } = buildFoodPicker(contentEl, foods, {
			placeholder: "Food name",
			onChange: (name) => {
				this.foodName = name;
				const known = findFood(foods, name);
				if (known) {
					this.hintEl.setText(
						`${known.name} is already tracked as ${STATUS_LABELS[known.currentStatus].toLowerCase()} — saving will open the status change screen instead.`
					);
					this.saveBtn.setText("Change its status…");
				} else {
					this.hintEl.setText("");
					this.saveBtn.setText("Add food");
				}
			},
		});
		this.hintEl = contentEl.createDiv({ cls: "arfid-hint" });

		contentEl.createDiv({ cls: "arfid-field-label", text: "Category" });
		buildStatusRow(contentEl, "", (v) => (this.status = v));

		this.saveBtn = this.addSaveButton("Add food", () => this.save());

		const bulkLink = contentEl.createEl("button", {
			cls: "arfid-details-toggle",
			text: "Add many at once instead",
		});
		bulkLink.addEventListener("click", () => {
			this.close();
			new AddFoodsModal(this.app, this.plugin).open();
		});

		window.setTimeout(() => foodInput.focus(), 50);
	}

	private async save(): Promise<void> {
		const food = this.foodName.trim();
		if (!food) {
			new Notice("Add a food name first.");
			return;
		}
		const known = findFood(this.plugin.store.getFoods(), food);
		if (known) {
			this.close();
			new StatusChangeModal(this.app, this.plugin, known.name).open();
			return;
		}
		if (!this.status) {
			new Notice("Pick a category for it.");
			return;
		}
		const { date, time } = nowStamp();
		await createBaselineEntry(this.plugin, date, time, food, this.status, `Added ${food} as ${STATUS_LABELS[this.status].toLowerCase()}.`);
		this.close();
	}
}

/** Seed the food library in bulk: paste known foods under each status and
 * save once. Creates minimal baseline entries — no meal, no outcome — so
 * nothing is recorded as eaten and trends are untouched. Foods already in
 * the library are skipped (use "Change a food's status" to move those, so
 * status changes always get their reason). */
export class AddFoodsModal extends ArfidModal {
	private inputs = new Map<FoodStatus, HTMLTextAreaElement>();

	constructor(app: App, plugin: ArfidTrackerPlugin) {
		super(app, plugin, "Add foods to your library");
	}

	protected buildContent(): void {
		const { contentEl } = this;
		contentEl.createDiv({
			cls: "arfid-hint",
			text: "Enter the foods you already know, one per line (commas work too). Nothing here is logged as eaten — it just puts your existing lists into the system.",
		});

		for (const status of FOOD_STATUSES) {
			const label = contentEl.createDiv({ cls: "arfid-field-label arfid-status-field-label" });
			label.createSpan({ cls: `arfid-status-dot arfid-status-${status}` });
			label.createSpan({ text: ` ${STATUS_LABELS[status]} foods` });
			const ta = contentEl.createEl("textarea", {
				cls: "arfid-textarea",
				attr: { rows: "3", placeholder: `e.g. ${placeholderFor(status)}` },
			});
			this.inputs.set(status, ta);
		}

		this.addSaveButton("Add foods", () => this.save());
	}

	private async save(): Promise<void> {
		const knownKeys = new Set(this.plugin.store.getFoods().map((f) => f.key));
		const { date, time } = nowStamp();

		let added = 0;
		const skipped: string[] = [];
		const seen = new Set<string>();

		for (const status of FOOD_STATUSES) {
			const raw = this.inputs.get(status)?.value ?? "";
			for (const food of splitList(raw.replace(/\n/g, ","))) {
				const key = normalizeFoodKey(food);
				if (seen.has(key)) continue;
				seen.add(key);
				if (knownKeys.has(key)) {
					skipped.push(food);
					continue;
				}
				await createBaselineEntry(this.plugin, date, time, food, status);
				added++;
			}
		}

		if (added === 0 && skipped.length === 0) {
			new Notice("Nothing to add — enter some foods first.");
			return;
		}
		let msg = `Added ${added} food${added === 1 ? "" : "s"} to your library.`;
		if (skipped.length > 0) {
			msg += ` Already tracked (unchanged): ${skipped.join(", ")} — use “Change a food's status” to move them.`;
		}
		new Notice(msg, skipped.length > 0 ? 8000 : 4000);
		this.close();
	}
}

function placeholderFor(status: FoodStatus): string {
	switch (status) {
		case "safe":
			return "chicken nuggets, white rice, pretzels";
		case "like":
			return "cheese pizza";
		case "neutral":
			return "water, plain crackers";
		case "dislike":
			return "overcooked pasta";
		case "fear":
			return "mixed casseroles, mushy vegetables";
		case "trying":
			return "cheese curds";
		case "recently-expanded":
			return "scrambled eggs";
	}
}
