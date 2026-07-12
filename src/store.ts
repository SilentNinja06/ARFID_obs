import { App, TFile } from "obsidian";
import {
	EXPOSURE_STEPS,
	ExposureStep,
	FOOD_STATUSES,
	FoodEntry,
	FoodNote,
	FoodStatus,
	FoodSummary,
	MEAL_TYPES,
	MealType,
	NOTE_KINDS,
	NoteKind,
	SymptomEntry,
	Outcome,
	OUTCOMES,
	StatusShift,
	StrategyStat,
	StrategyWorked,
	normalizeFoodKey,
	splitList,
} from "./types";

/** Reads food entries from the vault. Entries are discovered by
 * `type: food-entry` frontmatter, never by folder path, so notes can be
 * reorganized freely. */
export class EntryStore {
	constructor(private app: App) {}

	getEntries(): FoodEntry[] {
		const entries: FoodEntry[] = [];
		for (const file of this.app.vault.getMarkdownFiles()) {
			const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
			if (!fm || fm.type !== "food-entry") continue;
			const entry = this.parseEntry(file, fm);
			if (entry) entries.push(entry);
		}
		entries.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
		return entries;
	}

	private parseEntry(file: TFile, fm: Record<string, unknown>): FoodEntry | null {
		const food = String(fm.food ?? "").trim();
		if (!food) return null;
		return {
			file,
			date: normalizeDate(fm.date),
			time: normalizeTime(fm.time),
			food,
			meal: normalizeMeal(fm.meal),
			status: normalizeStatus(fm.status),
			outcome: normalizeOutcome(fm.outcome),
			exposure: fm.exposure === true || fm.exposure === "true",
			exposureStep: normalizeExposureStep(fm.exposure_step),
			statusReason: String(fm.status_reason ?? "").trim(),
			textureNotes: String(fm.texture_notes ?? ""),
			context: splitList(fm.context),
			strategies: splitList(fm.strategy_used),
			strategyWorked: normalizeWorked(fm.strategy_worked),
			tags: splitList(fm.tags),
		};
	}

	/** All foods ever logged, keyed by normalized name, chronological entries. */
	getFoods(entries?: FoodEntry[]): FoodSummary[] {
		const byKey = new Map<string, FoodSummary>();
		for (const e of entries ?? this.getEntries()) {
			const key = normalizeFoodKey(e.food);
			let f = byKey.get(key);
			if (!f) {
				f = {
					name: e.food.trim(),
					key,
					entries: [],
					currentStatus: e.status,
					firstLogged: e.date,
					lastLogged: e.date,
				};
				byKey.set(key, f);
			}
			f.entries.push(e);
			f.currentStatus = e.status; // entries arrive chronologically
			f.lastLogged = e.date;
		}
		return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
	}

	/** Status changes per food, in chronological order across all foods. */
	getStatusShifts(foods?: FoodSummary[]): StatusShift[] {
		const shifts: StatusShift[] = [];
		for (const food of foods ?? this.getFoods()) {
			let prev: FoodStatus | null = null;
			for (const e of food.entries) {
				if (prev !== null && e.status !== prev) {
					shifts.push({ food: food.name, from: prev, to: e.status, date: e.date, reason: e.statusReason });
				}
				prev = e.status;
			}
		}
		shifts.sort((a, b) => a.date.localeCompare(b.date));
		return shifts;
	}

	/** Standalone symptom logs (`type: symptom-entry`), chronological. */
	getSymptomEntries(): SymptomEntry[] {
		const out: SymptomEntry[] = [];
		for (const file of this.app.vault.getMarkdownFiles()) {
			const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
			if (!fm || fm.type !== "symptom-entry") continue;
			out.push({
				file,
				date: normalizeDate(fm.date),
				time: normalizeTime(fm.time),
				symptoms: splitList(fm.symptoms),
			});
		}
		out.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
		return out;
	}

	getSymptomStats(entries?: SymptomEntry[]): { name: string; count: number }[] {
		const byName = new Map<string, { name: string; count: number }>();
		for (const e of entries ?? this.getSymptomEntries()) {
			for (const raw of e.symptoms) {
				const key = raw.toLowerCase();
				let s = byName.get(key);
				if (!s) {
					s = { name: raw, count: 0 };
					byName.set(key, s);
				}
				s.count++;
			}
		}
		return [...byName.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
	}

	/** Per-food companion notes (`type: food-note`): rituals, orders, recipes. */
	getFoodNotes(): FoodNote[] {
		const out: FoodNote[] = [];
		for (const file of this.app.vault.getMarkdownFiles()) {
			const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
			if (!fm || fm.type !== "food-note") continue;
			const food = String(fm.food ?? "").trim();
			if (!food) continue;
			const kind = String(fm.note_kind ?? "").trim().toLowerCase();
			out.push({
				file,
				food,
				key: normalizeFoodKey(food),
				kind: (NOTE_KINDS as readonly string[]).includes(kind) ? (kind as NoteKind) : "ritual",
				date: normalizeDate(fm.date),
			});
		}
		out.sort((a, b) => a.key.localeCompare(b.key) || a.date.localeCompare(b.date));
		return out;
	}

	getStrategyStats(entries?: FoodEntry[]): StrategyStat[] {
		const byName = new Map<string, StrategyStat>();
		for (const e of entries ?? this.getEntries()) {
			for (const raw of e.strategies) {
				const name = raw.trim();
				if (!name) continue;
				const key = name.toLowerCase();
				let s = byName.get(key);
				if (!s) {
					s = { name, uses: 0, worked: 0, failed: 0 };
					byName.set(key, s);
				}
				s.uses++;
				if (e.strategyWorked === true) s.worked++;
				else if (e.strategyWorked === false) s.failed++;
			}
		}
		return [...byName.values()].sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name));
	}
}

function sortKey(e: FoodEntry): string {
	return `${e.date} ${e.time}`;
}

function normalizeDate(value: unknown): string {
	if (value instanceof Date) return isoDate(value);
	const s = String(value ?? "").trim();
	const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (m) return `${m[1]}-${m[2]}-${m[3]}`;
	const d = new Date(s);
	return isNaN(d.getTime()) ? "" : isoDate(d);
}

function normalizeTime(value: unknown): string {
	const s = String(value ?? "").trim();
	const m = s.match(/^(\d{1,2}):(\d{2})/);
	if (!m) return "";
	return `${m[1].padStart(2, "0")}:${m[2]}`;
}

function normalizeStatus(value: unknown): FoodStatus {
	const s = String(value ?? "").trim().toLowerCase();
	if ((FOOD_STATUSES as readonly string[]).includes(s)) return s as FoodStatus;
	// tolerate close variants in hand-edited notes
	if (s === "expanded" || s === "recently expanded") return "recently-expanded";
	return "trying";
}

function normalizeMeal(value: unknown): MealType {
	const s = String(value ?? "").trim().toLowerCase();
	return (MEAL_TYPES as readonly string[]).includes(s) ? (s as MealType) : "";
}

function normalizeExposureStep(value: unknown): ExposureStep {
	const s = String(value ?? "").trim().toLowerCase();
	return (EXPOSURE_STEPS as readonly string[]).includes(s) ? (s as ExposureStep) : "";
}

function normalizeOutcome(value: unknown): Outcome | "" {
	const s = String(value ?? "").trim().toLowerCase();
	return (OUTCOMES as readonly string[]).includes(s) ? (s as Outcome) : "";
}

function normalizeWorked(value: unknown): StrategyWorked {
	if (value === true || value === "true") return true;
	if (value === false || value === "false") return false;
	return "n/a";
}

export function isoDate(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

export function isoTime(d: Date): string {
	return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
