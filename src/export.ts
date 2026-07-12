import { App, Notice, TFile, TFolder, normalizePath } from "obsidian";
import { EntryStore, isoDate } from "./store";
import {
	ArfidSettings,
	EXPOSURE_STEP_LABELS,
	EXPOSURE_STEPS,
	ExposureStep,
	FOOD_STATUSES,
	FoodEntry,
	MEAL_LABELS,
	MEAL_TYPES,
	NOTE_KIND_LABELS,
	STATUS_LABELS,
	SymptomEntry,
} from "./types";

function csvCell(value: string): string {
	if (/[",\n]/.test(value)) return '"' + value.replace(/"/g, '""') + '"';
	return value;
}

export function buildCsv(entries: FoodEntry[]): string {
	const header = [
		"date",
		"time",
		"food",
		"meal",
		"status",
		"outcome",
		"exposure",
		"exposure_step",
		"status_reason",
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
			e.meal,
			e.status,
			e.outcome,
			e.exposure ? "true" : "false",
			e.exposureStep,
			e.statusReason.replace(/\r?\n/g, " "),
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

export function buildSymptomCsv(entries: SymptomEntry[]): string {
	const header = ["date", "time", "symptoms", "file"];
	const rows = entries.map((e) => [e.date, e.time, e.symptoms.join(", "), e.file.path].map(csvCell).join(","));
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
		lines.push(`| Date | Food | Change | Why |`);
		lines.push(`| --- | --- | --- | --- |`);
		for (const sh of [...shifts].reverse()) {
			lines.push(
				`| ${sh.date} | ${sh.food} | ${STATUS_LABELS[sh.from]} → ${STATUS_LABELS[sh.to]} | ${sh.reason.replace(/\r?\n/g, " ") || "—"} |`
			);
		}
	}
	lines.push("");

	lines.push(`## Exposure practice`);
	lines.push("");
	const exposures = entries.filter((e) => e.exposure);
	if (exposures.length === 0) {
		lines.push("No exposures logged yet.");
	} else {
		const cutoff30 = isoDate(new Date(Date.now() - 30 * 86400_000));
		lines.push(`${exposures.length} exposures logged, ${exposures.filter((e) => e.date >= cutoff30).length} in the last 30 days.`);
		lines.push("");
		lines.push(`| Step reached | Count |`);
		lines.push(`| --- | ---: |`);
		for (const step of EXPOSURE_STEPS) {
			const count = exposures.filter((e) => e.exposureStep === step).length;
			if (count > 0) lines.push(`| ${EXPOSURE_STEP_LABELS[step]} | ${count} |`);
		}
		const unstepped = exposures.filter((e) => !e.exposureStep).length;
		if (unstepped > 0) lines.push(`| (step not recorded) | ${unstepped} |`);
	}
	lines.push("");

	lines.push(`## Symptoms`);
	lines.push("");
	const symptomEntries = store.getSymptomEntries();
	const symptomStats = store.getSymptomStats(symptomEntries);
	if (symptomStats.length === 0) {
		lines.push("No symptoms logged yet.");
	} else {
		lines.push(`${symptomEntries.length} symptom logs.`);
		lines.push("");
		lines.push(`| Symptom | Times logged |`);
		lines.push(`| --- | ---: |`);
		for (const s of symptomStats) lines.push(`| ${s.name} | ${s.count} |`);
	}
	lines.push("");

	lines.push(`## Meals by type`);
	lines.push("");
	const withMeal = entries.filter((e) => e.meal);
	if (withMeal.length === 0) {
		lines.push("No entries with a meal type yet.");
	} else {
		lines.push(`| Meal | Entries |`);
		lines.push(`| --- | ---: |`);
		for (const m of MEAL_TYPES) {
			const count = withMeal.filter((e) => e.meal === m).length;
			if (count > 0) lines.push(`| ${MEAL_LABELS[m]} | ${count} |`);
		}
	}
	lines.push("");

	lines.push(`## Rituals, orders, and recipes`);
	lines.push("");
	const foodNotes = store.getFoodNotes();
	if (foodNotes.length === 0) {
		lines.push("None recorded yet.");
	} else {
		lines.push(`| Food | Kind | Note |`);
		lines.push(`| --- | --- | --- |`);
		for (const n of foodNotes) {
			lines.push(`| ${n.food} | ${NOTE_KIND_LABELS[n.kind]} | [[${n.file.basename}]] |`);
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
		lines.push(`| Date | Time | Food | Kind | Status | Outcome | Strategies | Context |`);
		lines.push(`| --- | --- | --- | --- | --- | --- | --- | --- |`);
		for (const e of entries) {
			const kind = e.exposure
				? `exposure${e.exposureStep ? ` (${EXPOSURE_STEP_LABELS[e.exposureStep as Exclude<ExposureStep, "">].toLowerCase()})` : ""}`
				: e.tags.includes("status-change")
					? "status change"
					: e.meal || "—";
			lines.push(
				`| ${e.date} | ${e.time} | ${e.food} | ${kind} | ${STATUS_LABELS[e.status]} | ${e.outcome || "—"} | ${e.strategies.join(", ") || "—"} | ${e.context.join(", ") || "—"} |`
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
	const symptoms = store.getSymptomEntries();
	if (symptoms.length > 0) {
		await writeExport(app, settings, `arfid-symptoms-${isoDate(new Date())}.csv`, buildSymptomCsv(symptoms));
	}
	new Notice(
		`Exported ${entries.length} entries${symptoms.length > 0 ? ` and ${symptoms.length} symptom logs` : ""} to ${file.parent?.path ?? file.path}`
	);
}

export async function exportSummary(app: App, settings: ArfidSettings, store: EntryStore): Promise<void> {
	const file = await writeExport(app, settings, `arfid-summary-${isoDate(new Date())}.md`, buildMarkdownSummary(store));
	new Notice(`Summary written to ${file.path}`);
	await app.workspace.getLeaf(true).openFile(file);
}
