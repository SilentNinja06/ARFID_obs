import { App, Notice, TFile, TFolder, normalizePath } from "obsidian";
import { EntryStore, isoDate } from "./store";
import { ArfidSettings, FOOD_STATUSES, FoodEntry, STATUS_LABELS, StatusShift } from "./types";

function csvCell(value: string): string {
	if (/[",\n]/.test(value)) return '"' + value.replace(/"/g, '""') + '"';
	return value;
}

export function buildCsv(entries: FoodEntry[]): string {
	const header = [
		"date",
		"time",
		"food",
		"status",
		"outcome",
		"texture_notes",
		"context",
		"strategy_used",
		"strategy_worked",
		"tags",
		"file",
	];
	const rows = entries.map((e) =>
		[
			e.date,
			e.time,
			e.food,
			e.status,
			e.outcome,
			e.textureNotes.replace(/\r?\n/g, " "),
			e.context.join(", "),
			e.strategies.join(", "),
			String(e.strategyWorked),
			e.tags.join(", "),
			e.file.path,
		]
			.map(csvCell)
			.join(",")
	);
	return [header.join(","), ...rows].join("\n") + "\n";
}

export function buildMarkdownSummary(store: EntryStore): string {
	const entries = store.getEntries();
	const foods = store.getFoods(entries);
	const shifts = store.getStatusShifts(foods);
	const strategies = store.getStrategyStats(entries);
	const today = isoDate(new Date());

	const lines: string[] = [];
	lines.push(`# Food log summary`);
	lines.push("");
	lines.push(`Generated ${today}.`);
	if (entries.length > 0) {
		lines.push(`Covers ${entries.length} entries from ${entries[0].date} to ${entries[entries.length - 1].date}, across ${foods.length} foods.`);
	} else {
		lines.push("No entries logged yet.");
	}
	lines.push("");

	// current food counts by status
	lines.push(`## Foods by current status`);
	lines.push("");
	lines.push(`| Status | Foods |`);
	lines.push(`| --- | ---: |`);
	for (const s of FOOD_STATUSES) {
		lines.push(`| ${STATUS_LABELS[s]} | ${foods.filter((f) => f.currentStatus === s).length} |`);
	}
	lines.push("");
	for (const s of FOOD_STATUSES) {
		const group = foods.filter((f) => f.currentStatus === s);
		if (group.length === 0) continue;
		lines.push(`### ${STATUS_LABELS[s]}`);
		lines.push("");
		lines.push(`| Food | Times logged | First logged | Last logged |`);
		lines.push(`| --- | ---: | --- | --- |`);
		for (const f of group) {
			lines.push(`| ${f.name} | ${f.entries.length} | ${f.firstLogged} | ${f.lastLogged} |`);
		}
		lines.push("");
	}

	lines.push(`## Status changes`);
	lines.push("");
	if (shifts.length === 0) {
		lines.push("No status changes recorded yet.");
	} else {
		lines.push(`| Date | Food | Change |`);
		lines.push(`| --- | --- | --- |`);
		for (const sh of [...shifts].reverse()) {
			lines.push(`| ${sh.date} | ${sh.food} | ${STATUS_LABELS[sh.from]} → ${STATUS_LABELS[sh.to]} |`);
		}
	}
	lines.push("");

	lines.push(`## Strategies`);
	lines.push("");
	if (strategies.length === 0) {
		lines.push("No strategies recorded yet.");
	} else {
		lines.push(`| Strategy | Uses | Helped | Didn't help | Helped rate |`);
		lines.push(`| --- | ---: | ---: | ---: | ---: |`);
		for (const s of strategies) {
			const rated = s.worked + s.failed;
			const rate = rated > 0 ? `${Math.round((s.worked / rated) * 100)}%` : "—";
			lines.push(`| ${s.name} | ${s.uses} | ${s.worked} | ${s.failed} | ${rate} |`);
		}
	}
	lines.push("");

	lines.push(`## Entries per month`);
	lines.push("");
	const byMonth = new Map<string, number>();
	for (const e of entries) {
		const key = e.date.slice(0, 7);
		byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
	}
	if (byMonth.size === 0) {
		lines.push("No entries yet.");
	} else {
		lines.push(`| Month | Entries |`);
		lines.push(`| --- | ---: |`);
		for (const [month, count] of [...byMonth.entries()].sort()) {
			lines.push(`| ${month} | ${count} |`);
		}
	}
	lines.push("");

	lines.push(`## Appendix: all entries`);
	lines.push("");
	if (entries.length === 0) {
		lines.push("No entries yet.");
	} else {
		lines.push(`| Date | Time | Food | Status | Outcome | Strategies | Context |`);
		lines.push(`| --- | --- | --- | --- | --- | --- | --- |`);
		for (const e of entries) {
			lines.push(
				`| ${e.date} | ${e.time} | ${e.food} | ${STATUS_LABELS[e.status]} | ${e.outcome || "—"} | ${e.strategies.join(", ") || "—"} | ${e.context.join(", ") || "—"} |`
			);
		}
	}
	lines.push("");
	return lines.join("\n");
}

async function writeExport(app: App, settings: ArfidSettings, filename: string, content: string): Promise<TFile> {
	const folder = settings.exportsFolder.trim().replace(/\/+$/, "");
	if (folder && !(app.vault.getAbstractFileByPath(normalizePath(folder)) instanceof TFolder)) {
		await app.vault.createFolder(normalizePath(folder)).catch(() => {});
	}
	const path = normalizePath((folder ? folder + "/" : "") + filename);
	const existing = app.vault.getAbstractFileByPath(path);
	if (existing instanceof TFile) {
		await app.vault.modify(existing, content);
		return existing;
	}
	return app.vault.create(path, content);
}

export async function exportCsv(app: App, settings: ArfidSettings, store: EntryStore): Promise<void> {
	const entries = store.getEntries();
	const file = await writeExport(app, settings, `arfid-entries-${isoDate(new Date())}.csv`, buildCsv(entries));
	new Notice(`Exported ${entries.length} entries to ${file.path}`);
}

export async function exportSummary(app: App, settings: ArfidSettings, store: EntryStore): Promise<void> {
	const file = await writeExport(app, settings, `arfid-summary-${isoDate(new Date())}.md`, buildMarkdownSummary(store));
	new Notice(`Summary written to ${file.path}`);
	await app.workspace.getLeaf(true).openFile(file);
}
