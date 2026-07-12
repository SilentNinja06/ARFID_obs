import { App, Notice, TFile, TFolder, normalizePath } from "obsidian";
import { sanitizeForFilename } from "./serialize";
import { linkIntoDailyNote } from "./dailynote";
import type ArfidTrackerPlugin from "./main";

/** Vault file plumbing shared by every flow that writes a note. */

export function normalizeFolder(folder: string): string {
	return folder.trim().replace(/\/+$/, "");
}

export async function ensureFolder(app: App, folder: string): Promise<void> {
	const f = normalizeFolder(folder);
	if (!f) return;
	if (app.vault.getAbstractFileByPath(normalizePath(f)) instanceof TFolder) return;
	await app.vault.createFolder(normalizePath(f)).catch(() => {});
}

/** Create `base.md` inside `folder`, suffixing " 2", " 3", … on collision. */
export async function createUniqueNote(
	app: App,
	folder: string,
	base: string,
	content: string
): Promise<TFile> {
	const f = normalizeFolder(folder);
	await ensureFolder(app, f);
	let path = normalizePath((f ? f + "/" : "") + base + ".md");
	let n = 1;
	while (app.vault.getAbstractFileByPath(path)) {
		path = normalizePath((f ? f + "/" : "") + `${base} ${++n}` + ".md");
	}
	return app.vault.create(path, content);
}

/** Create an entry note named by the user's filename template. */
export async function createEntryFile(
	app: App,
	plugin: ArfidTrackerPlugin,
	date: string,
	time: string,
	food: string,
	content: string
): Promise<TFile> {
	const base =
		sanitizeForFilename(
			plugin.settings.filenameTemplate
				.replace(/{{\s*date\s*}}/gi, date)
				.replace(/{{\s*time\s*}}/gi, time.replace(":", "."))
				.replace(/{{\s*food\s*}}/gi, food)
		) || `${date} ${time.replace(":", ".")} ${sanitizeForFilename(food)}`;
	return createUniqueNote(app, plugin.settings.entriesFolder, base, content);
}

export interface SaveEntryOptions {
	/** Daily-note link text; omit to skip daily-note linking entirely. */
	dailyLabel?: string;
	/** Notice text shown after saving; omit for silent saves (bulk import). */
	notice?: string;
}

/** The save tail every entry-writing flow shares: create the file, link it
 * into the daily note (when enabled and a label is given), notify, refresh. */
export async function saveEntryNote(
	plugin: ArfidTrackerPlugin,
	date: string,
	time: string,
	food: string,
	content: string,
	opts: SaveEntryOptions = {}
): Promise<TFile> {
	const file = await createEntryFile(plugin.app, plugin, date, time, food, content);
	if (opts.dailyLabel && plugin.settings.dailyNoteLinking) {
		try {
			await linkIntoDailyNote(plugin.app, plugin.settings, date, time, file.basename, opts.dailyLabel);
		} catch (e) {
			console.error("ARFID Tracker: daily note linking failed", e);
		}
	}
	if (opts.notice) new Notice(opts.notice);
	plugin.notifyDataChanged();
	return file;
}
