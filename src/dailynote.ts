import { App, TFile, TFolder, moment, normalizePath } from "obsidian";
import { ArfidSettings } from "./types";

/** Only lines the plugin itself wrote are treated as log lines when keeping
 * chronological order — template list items are never touched. */
const PLUGIN_LINE = /^- \d{2}:\d{2} \[\[/;

interface DailyNotesOptions {
	folder?: string;
	format?: string;
	template?: string;
}

function getDailyNotesOptions(app: App): DailyNotesOptions {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const dn = (app as any).internalPlugins?.getPluginById?.("daily-notes");
	return dn?.instance?.options ?? {};
}

/** Insert a log line into today's daily note, honoring the placement marker,
 * then the configured heading, then a heading appended at the end as the
 * last resort. Creates the daily note from the Daily Notes core template if
 * it doesn't exist yet. */
export async function linkIntoDailyNote(
	app: App,
	settings: ArfidSettings,
	date: string,
	time: string,
	noteBasename: string,
	label: string
): Promise<void> {
	const opts = getDailyNotesOptions(app);
	const format = opts.format || "YYYY-MM-DD";
	const folder = (opts.folder ?? "").trim().replace(/\/+$/, "");
	const dailyName = moment(date, "YYYY-MM-DD").format(format);
	const path = normalizePath((folder ? folder + "/" : "") + dailyName + ".md");

	let file = app.vault.getAbstractFileByPath(path);
	if (!file) {
		await ensureParentFolder(app, path);
		const body = await renderDailyTemplate(app, opts, path, date);
		file = await app.vault.create(path, body);
	}
	if (!(file instanceof TFile)) return;

	const line = `- ${time} [[${noteBasename}|${label}]]`;
	await app.vault.process(file, (content) => insertLogLine(content, line, settings, time));
}

async function ensureParentFolder(app: App, path: string): Promise<void> {
	const dir = path.split("/").slice(0, -1).join("/");
	if (!dir) return;
	const existing = app.vault.getAbstractFileByPath(dir);
	if (existing instanceof TFolder) return;
	await app.vault.createFolder(dir).catch(() => {});
}

/** Seed a new daily note from the Daily Notes core plugin's template,
 * substituting the core {{title}} / {{date}} / {{time}} placeholders. */
async function renderDailyTemplate(
	app: App,
	opts: DailyNotesOptions,
	dailyPath: string,
	date: string
): Promise<string> {
	const templateSetting = (opts.template ?? "").trim();
	if (!templateSetting) return "";
	const templatePath = normalizePath(
		templateSetting.endsWith(".md") ? templateSetting : templateSetting + ".md"
	);
	const tFile = app.vault.getAbstractFileByPath(templatePath);
	if (!(tFile instanceof TFile)) return "";
	const raw = await app.vault.cachedRead(tFile);
	const basename = dailyPath.split("/").pop()?.replace(/\.md$/, "") ?? "";
	const m = moment(date, "YYYY-MM-DD");
	const now = moment();
	return raw
		.replace(/{{\s*title\s*}}/gi, basename)
		.replace(/{{\s*date(?::([^}]+))?\s*}}/gi, (_, fmt) => m.format(fmt || "YYYY-MM-DD"))
		.replace(/{{\s*time(?::([^}]+))?\s*}}/gi, (_, fmt) => now.format(fmt || "HH:mm"));
}

/** Remove the plugin's own log line(s) that link to `noteBasename` from today's
 * (or any day's) daily note, so deleting an entry doesn't leave a dangling link.
 * Best-effort: if the daily note or the line is gone, it simply does nothing. */
export async function unlinkFromDailyNote(
	app: App,
	date: string,
	noteBasename: string
): Promise<void> {
	const opts = getDailyNotesOptions(app);
	const format = opts.format || "YYYY-MM-DD";
	const folder = (opts.folder ?? "").trim().replace(/\/+$/, "");
	const dailyName = moment(date, "YYYY-MM-DD").format(format);
	const path = normalizePath((folder ? folder + "/" : "") + dailyName + ".md");
	const file = app.vault.getAbstractFileByPath(path);
	if (!(file instanceof TFile)) return;
	await app.vault.process(file, (content) => removeLogLine(content, noteBasename));
}

/** Drop the plugin's log line(s) whose wikilink targets `noteBasename`. Only
 * plugin-written lines (`- HH:mm [[…]]`) are considered, so template content is
 * never touched. Pure, for unit testing. */
export function removeLogLine(content: string, noteBasename: string): string {
	const target = noteBasename.trim();
	const lines = content.split("\n");
	const kept = lines.filter((l) => {
		if (!PLUGIN_LINE.test(l)) return true;
		const m = l.match(/\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/);
		return !(m && m[1].trim() === target);
	});
	return kept.join("\n");
}

export function insertLogLine(
	content: string,
	line: string,
	settings: ArfidSettings,
	time: string
): string {
	const lines = content.split("\n");
	if (lines.some((l) => l.trim() === line.trim())) return content;

	const marker = settings.dailyNoteMarker.trim();
	let anchor = -1;
	if (marker) {
		anchor = lines.findIndex((l) => l.includes(marker));
	}
	if (anchor === -1) {
		const heading = settings.dailyNoteHeading.trim().toLowerCase().replace(/:$/, "");
		if (heading) {
			anchor = lines.findIndex((l) => {
				const m = l.match(/^#{1,6}\s+(.*?)\s*$/);
				return !!m && m[1].trim().toLowerCase().replace(/:$/, "") === heading;
			});
		}
	}
	if (anchor === -1) {
		// last resort: append a heading (and the line) at the end
		const heading = settings.dailyNoteHeading.trim() || "Food log";
		const trimmed = content.replace(/\n+$/, "");
		return (trimmed ? trimmed + "\n\n" : "") + `## ${heading}\n${line}\n`;
	}

	// Keep chronological order among the plugin's own log lines directly
	// under the anchor; anything else belongs to the template and is left alone.
	let insertAt = anchor + 1;
	while (insertAt < lines.length && PLUGIN_LINE.test(lines[insertAt])) {
		const existingTime = lines[insertAt].slice(2, 7);
		if (existingTime > time) break;
		insertAt++;
	}
	lines.splice(insertAt, 0, line);
	return lines.join("\n");
}
