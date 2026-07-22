import { App, Modal, Notice, TFile } from "obsidian";
import { FoodEntry, FoodSummary, SymptomEntry } from "./types";
import { unlinkFromDailyNote } from "./dailynote";
import type ArfidTrackerPlugin from "./main";

/**
 * Deleting entries and foods. An entry is a single note file, so removing one
 * (or a food's whole history) means trashing those files — and, so nothing is
 * left dangling, pulling their links back out of the daily notes they were
 * logged into. Trashing goes through Obsidian's file manager, which honours the
 * user's "Deleted files" preference (system trash / .trash / permanent) rather
 * than hard-deleting behind their back.
 */

async function trashEntryFile(plugin: ArfidTrackerPlugin, entry: FoodEntry): Promise<void> {
	if (plugin.settings.dailyNoteLinking && entry.date) {
		try {
			await unlinkFromDailyNote(plugin.app, entry.date, entry.file.basename);
		} catch (e) {
			console.error("ARFID Tracker: could not unlink from the daily note", e);
		}
	}
	await plugin.app.fileManager.trashFile(entry.file);
}

/** Delete a single food log entry (one note file). */
export async function deleteEntry(plugin: ArfidTrackerPlugin, entry: FoodEntry): Promise<void> {
	await trashEntryFile(plugin, entry);
	new Notice(`Deleted “${entry.food}”.`);
	plugin.notifyDataChanged();
}

/** Delete a single symptom log entry (one note file), unlinking it from the
 * daily note the same way food entries are. */
export async function deleteSymptom(plugin: ArfidTrackerPlugin, entry: SymptomEntry): Promise<void> {
	if (plugin.settings.dailyNoteLinking && entry.date) {
		try {
			await unlinkFromDailyNote(plugin.app, entry.date, entry.file.basename);
		} catch (e) {
			console.error("ARFID Tracker: could not unlink from the daily note", e);
		}
	}
	await plugin.app.fileManager.trashFile(entry.file);
	new Notice("Deleted symptom entry.");
	plugin.notifyDataChanged();
}

/** Delete a food entirely: every entry in its history plus any ritual/order/
 * recipe notes attached to it. */
export async function deleteFood(plugin: ArfidTrackerPlugin, food: FoodSummary): Promise<void> {
	for (const entry of food.entries) {
		await trashEntryFile(plugin, entry);
	}
	const notes = plugin.store.getFoodNotesByKey().get(food.key) ?? [];
	for (const note of notes) {
		if (note.file instanceof TFile) await plugin.app.fileManager.trashFile(note.file);
	}
	const noteBit = notes.length > 0 ? ` and ${notes.length} note${notes.length === 1 ? "" : "s"}` : "";
	new Notice(`Deleted “${food.name}” — ${food.entries.length} entr${food.entries.length === 1 ? "y" : "ies"}${noteBit}.`);
	plugin.notifyDataChanged();
}

/** A small yes/no confirmation, so a destructive delete never fires from a
 * single stray tap. Runs `onConfirm` only when the user commits. */
export class ConfirmModal extends Modal {
	constructor(
		app: App,
		private opts: { title: string; body: string; confirmText: string; onConfirm: () => void | Promise<void> }
	) {
		super(app);
	}

	onOpen(): void {
		this.contentEl.addClass("arfid-plugin");
		this.titleEl.setText(this.opts.title);
		this.contentEl.createDiv({ cls: "arfid-hint", text: this.opts.body });
		const row = this.contentEl.createDiv({ cls: "arfid-chip-row arfid-confirm-row" });
		const cancel = row.createEl("button", { cls: "arfid-chip", text: "Cancel" });
		cancel.addEventListener("click", () => this.close());
		const confirm = row.createEl("button", { cls: "arfid-chip arfid-chip-danger", text: this.opts.confirmText });
		confirm.addEventListener("click", async () => {
			this.close();
			await this.opts.onConfirm();
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
