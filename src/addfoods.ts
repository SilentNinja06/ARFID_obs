import { App, Modal, Notice } from "obsidian";
import { FOOD_STATUSES, FoodStatus, FoodSummary, STATUS_LABELS, normalizeFoodKey } from "./types";
import { isoDate, isoTime } from "./store";
import { buildEntryNote } from "./serialize";
import { createEntryFile } from "./quicklog";
import { buildChoiceRow } from "./chips";
import { StatusChangeModal } from "./statuschange";
import type ArfidTrackerPlugin from "./main";

/** Create one baseline library entry: no meal, no outcome, nothing eaten. */
async function createBaselineEntry(
	app: App,
	plugin: ArfidTrackerPlugin,
	date: string,
	time: string,
	food: string,
	status: FoodStatus
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
	await createEntryFile(app, plugin, date, time, food, note);
}

/** Add a single food to the library at any time — for the ones remembered
 * after the initial import. Detects foods that are already tracked and hands
 * off to the status-change flow instead of duplicating them. */
export class AddFoodModal extends Modal {
	private plugin: ArfidTrackerPlugin;
	private foods: FoodSummary[] = [];
	private foodName = "";
	private status: FoodStatus | "" = "";
	private hintEl!: HTMLElement;
	private saveBtn!: HTMLButtonElement;

	constructor(app: App, plugin: ArfidTrackerPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen(): void {
		this.foods = this.plugin.store.getFoods();
		const { contentEl } = this;
		contentEl.addClass("arfid-plugin", "arfid-quicklog");
		this.titleEl.setText("Add a food to your library");
		contentEl.createDiv({
			cls: "arfid-hint",
			text: "Nothing is logged as eaten — this just adds the food with a status.",
		});

		const foodInput = contentEl.createEl("input", {
			cls: "arfid-input",
			attr: { type: "text", placeholder: "Food name", enterkeyhint: "done" },
		});
		this.hintEl = contentEl.createDiv({ cls: "arfid-hint" });
		foodInput.addEventListener("input", () => {
			this.foodName = foodInput.value;
			this.updateExistingHint();
		});

		contentEl.createDiv({ cls: "arfid-field-label", text: "Status" });
		buildChoiceRow<FoodStatus>(
			contentEl,
			FOOD_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s], dotClass: `arfid-status-${s}` })),
			"",
			(v) => (this.status = v)
		);

		this.saveBtn = contentEl.createEl("button", { cls: "arfid-save-btn", text: "Add food" });
		this.saveBtn.addEventListener("click", () => void this.save());
		this.scope.register(["Mod"], "Enter", () => {
			void this.save();
			return false;
		});

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

	private known(): FoodSummary | undefined {
		return this.foods.find((f) => f.key === normalizeFoodKey(this.foodName));
	}

	private updateExistingHint(): void {
		const known = this.known();
		if (known) {
			this.hintEl.setText(
				`${known.name} is already tracked as ${STATUS_LABELS[known.currentStatus].toLowerCase()} — saving will open the status change screen instead.`
			);
			this.saveBtn.setText("Change its status…");
		} else {
			this.hintEl.setText("");
			this.saveBtn.setText("Add food");
		}
	}

	private async save(): Promise<void> {
		const food = this.foodName.trim();
		if (!food) {
			new Notice("Add a food name first.");
			return;
		}
		const known = this.known();
		if (known) {
			this.close();
			new StatusChangeModal(this.app, this.plugin, known.name).open();
			return;
		}
		if (!this.status) {
			new Notice("Pick a status for it.");
			return;
		}
		const now = new Date();
		await createBaselineEntry(this.app, this.plugin, isoDate(now), isoTime(now), food, this.status);
		new Notice(`Added ${food} as ${STATUS_LABELS[this.status].toLowerCase()}.`);
		this.close();
		this.plugin.notifyDataChanged();
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

/** Seed the food library in bulk: paste known foods under each status and
 * save once. Creates minimal baseline entries — no meal, no outcome — so
 * nothing is recorded as eaten and trends are untouched. Foods already in
 * the library are skipped (use "Change a food's status" to move those, so
 * status changes always get their reason). */
export class AddFoodsModal extends Modal {
	private plugin: ArfidTrackerPlugin;
	private inputs = new Map<FoodStatus, HTMLTextAreaElement>();

	constructor(app: App, plugin: ArfidTrackerPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.addClass("arfid-plugin", "arfid-quicklog");
		this.titleEl.setText("Add foods to your library");
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

		const save = contentEl.createEl("button", { cls: "arfid-save-btn", text: "Add foods" });
		save.addEventListener("click", () => void this.save());
	}

	private async save(): Promise<void> {
		const knownKeys = new Set(this.plugin.store.getFoods().map((f) => f.key));
		const now = new Date();
		const date = isoDate(now);
		const time = isoTime(now);

		let added = 0;
		const skipped: string[] = [];
		const seen = new Set<string>();

		for (const status of FOOD_STATUSES) {
			const raw = this.inputs.get(status)?.value ?? "";
			const foods = raw
				.split(/[\n,]/)
				.map((s) => s.trim())
				.filter((s) => s.length > 0);
			for (const food of foods) {
				const key = normalizeFoodKey(food);
				if (seen.has(key)) continue;
				seen.add(key);
				if (knownKeys.has(key)) {
					skipped.push(food);
					continue;
				}
				await createBaselineEntry(this.app, this.plugin, date, time, food, status);
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
		this.plugin.notifyDataChanged();
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

function placeholderFor(status: FoodStatus): string {
	switch (status) {
		case "safe":
			return "chicken nuggets, white rice, pretzels";
		case "trying":
			return "cheese curds";
		case "fear":
			return "mixed casseroles, mushy vegetables";
		case "recently-expanded":
			return "scrambled eggs";
	}
}
