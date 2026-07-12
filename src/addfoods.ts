import { App, Modal, Notice } from "obsidian";
import { FOOD_STATUSES, FoodStatus, STATUS_LABELS, normalizeFoodKey } from "./types";
import { isoDate, isoTime } from "./store";
import { buildEntryNote } from "./serialize";
import { createEntryFile } from "./quicklog";
import type ArfidTrackerPlugin from "./main";

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
				await createEntryFile(this.app, this.plugin, date, time, food, note);
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
