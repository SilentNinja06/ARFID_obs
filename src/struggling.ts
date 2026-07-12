import { App, Modal } from "obsidian";
import { FoodNote, FoodSummary, guessMealType } from "./types";
import { buildChecklist, pickRandom } from "./chips";
import { QuickLogModal } from "./quicklog";
import type ArfidTrackerPlugin from "./main";

/** "I'm struggling to eat" support screen: a kindness reminder, a few
 * low-pressure safe-food options (tap one to log it), and an environment
 * checklist. Deliberately zero-obligation — closing it is always fine. */
export class StrugglingModal extends Modal {
	private plugin: ArfidTrackerPlugin;
	private safeFoods: FoodSummary[] = [];
	private notesByFood = new Map<string, FoodNote[]>();
	private optionsEl!: HTMLElement;

	constructor(app: App, plugin: ArfidTrackerPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen(): void {
		const foods = this.plugin.store.getFoods();
		this.safeFoods = foods.filter((f) => f.currentStatus === "safe" || f.currentStatus === "recently-expanded");
		this.notesByFood.clear();
		for (const n of this.plugin.store.getFoodNotes()) {
			const list = this.notesByFood.get(n.key) ?? [];
			list.push(n);
			this.notesByFood.set(n.key, list);
		}

		const { contentEl } = this;
		contentEl.addClass("arfid-plugin", "arfid-quicklog", "arfid-struggling");
		this.titleEl.setText("It's okay. Let's keep this easy.");

		const reminders = this.plugin.settings.kindnessReminders;
		if (reminders.length > 0) {
			contentEl.createDiv({ cls: "arfid-kindness", text: pickRandom(reminders, 1)[0] });
		}

		contentEl.createDiv({ cls: "arfid-field-label", text: "Low-pressure options" });
		this.optionsEl = contentEl.createDiv();
		this.renderOptions();

		if (this.safeFoods.length > 0) {
			const shuffle = contentEl.createEl("button", {
				cls: "arfid-details-toggle",
				text: "Show different options",
			});
			shuffle.addEventListener("click", () => this.renderOptions());
		}

		buildChecklist(contentEl, "Make it easier on yourself", this.plugin.settings.environmentChecklist);

		contentEl.createDiv({
			cls: "arfid-hint arfid-soft-footer",
			text: "Anything you eat counts. Closing this without logging is fine too.",
		});
	}

	private renderOptions(): void {
		this.optionsEl.empty();
		if (this.safeFoods.length === 0) {
			this.optionsEl.createDiv({
				cls: "arfid-empty",
				text: "No safe foods logged yet. Once some foods are marked safe, a few easy options will appear here.",
			});
			return;
		}
		// weight toward foods that have gone down well before
		const weighted = this.safeFoods.flatMap((f) => {
			const fullCount = f.entries.filter((e) => e.outcome === "full").length;
			return Array(1 + Math.min(fullCount, 5)).fill(f) as FoodSummary[];
		});
		const chosen: FoodSummary[] = [];
		for (const f of pickRandom(weighted, weighted.length)) {
			if (!chosen.includes(f)) chosen.push(f);
			if (chosen.length === 3) break;
		}
		for (const f of chosen) {
			const btn = this.optionsEl.createEl("button", { cls: "arfid-option-btn" });
			btn.createSpan({ cls: `arfid-status-dot arfid-status-${f.currentStatus}` });
			const text = btn.createSpan({ cls: "arfid-option-text" });
			text.createSpan({ cls: "arfid-option-name", text: f.name });
			text.createSpan({ cls: "arfid-option-meta", text: `last had ${f.lastLogged}` });
			btn.addEventListener("click", () => {
				this.close();
				new QuickLogModal(this.app, this.plugin, {
					food: f.name,
					status: f.currentStatus,
					meal: guessMealType(new Date()),
				}).open();
			});
			// if this food has a ritual/order/recipe, offer it right here —
			// the exact known-good way to eat it matters most on hard days
			const notes = this.notesByFood.get(f.key) ?? [];
			if (notes.length > 0) {
				const noteBtn = this.optionsEl.createEl("button", {
					cls: "arfid-chip arfid-ritual-link",
					text: `Open ${notes[0].kind === "recipe" ? "recipe" : notes[0].kind === "order" ? "the order that works" : "your ritual"}`,
				});
				noteBtn.addEventListener("click", () => {
					this.close();
					void this.app.workspace.getLeaf(false).openFile(notes[0].file);
				});
			}
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
