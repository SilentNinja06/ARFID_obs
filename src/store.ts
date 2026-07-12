import { App, TFile } from "obsidian";
import {
	DEFAULT_STATUS,
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
	Outcome,
	OUTCOMES,
	StatusShift,
	StrategyStat,
	StrategyWorked,
	SymptomEntry,
	deriveEntryKind,
	normalizeFoodKey,
	splitList,
} from "./types";

interface Index {
	entries: FoodEntry[];
	symptoms: SymptomEntry[];
	foodNotes: FoodNote[];
	paths: Set<string>;
}

/** Reads the plugin's notes from the vault. Notes are discovered by their
 * `type` frontmatter, never by folder path, so they can be reorganized
 * freely. The index is built in one vault pass and cached; the plugin
 * invalidates it from metadata/vault events. */
export class EntryStore {
	private index: Index | null = null;

	constructor(private app: App) {}

	/** Drop the cached index; the next read rebuilds it. */
	invalidate(): void {
		this.index = null;
	}

	/** Whether this path was indexed as one of the plugin's notes — used to
	 * catch edits that remove a note from the dataset. */
	contains(path: string): boolean {
		return this.index?.paths.has(path) ?? false;
	}

	private getIndex(): Index {
		if (this.index) return this.index;
		const entries: FoodEntry[] = [];
		const symptoms: SymptomEntry[] = [];
		const foodNotes: FoodNote[] = [];
		const paths = new Set<string>();
		for (const file of this.app.vault.getMarkdownFiles()) {
			const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
			if (!fm) continue;
			if (fm.type === "food-entry") {
				const entry = parseEntry(file, fm);
				if (entry) {
					entries.push(entry);
					paths.add(file.path);
				}
			} else if (fm.type === "symptom-entry") {
				symptoms.push({
					file,
					date: normalizeDate(fm.date),
					time: normalizeTime(fm.time),
					symptoms: splitList(fm.symptoms),
				});
				paths.add(file.path);
			} else if (fm.type === "food-note") {
				const note = parseFoodNote(file, fm);
				if (note) {
					foodNotes.push(note);
					paths.add(file.path);
				}
			}
		}
		entries.sort((a, b) => stampOf(a).localeCompare(stampOf(b)));
		symptoms.sort((a, b) => stampOf(a).localeCompare(stampOf(b)));
		foodNotes.sort((a, b) => a.key.localeCompare(b.key) || a.date.localeCompare(b.date));
		this.index = { entries, symptoms, foodNotes, paths };
		return this.index;
	}

	getEntries(): FoodEntry[] {
		return this.getIndex().entries;
	}

	/** Standalone symptom logs (`type: symptom-entry`), chronological. */
	getSymptomEntries(): SymptomEntry[] {
		return this.getIndex().symptoms;
	}

	/** Per-food companion notes (`type: food-note`): rituals, orders, recipes. */
	getFoodNotes(): FoodNote[] {
		return this.getIndex().foodNotes;
	}

	getFoodNotesByKey(): Map<string, FoodNote[]> {
		const byKey = new Map<string, FoodNote[]>();
		for (const n of this.getFoodNotes()) {
			const list = byKey.get(n.key) ?? [];
			list.push(n);
			byKey.set(n.key, list);
		}
		return byKey;
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
					currentStatus: DEFAULT_STATUS,
					firstLogged: e.date,
					lastLogged: e.date,
				};
				byKey.set(key, f);
			}
			f.entries.push(e);
			// only explicit category assertions move a food's category;
			// ordinary logs (status "") leave it untouched
			if (e.status) f.currentStatus = e.status; // entries arrive chronologically
			f.lastLogged = e.date;
		}
		return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
	}

	/** Category changes per food, in chronological order across all foods.
	 * Only explicit category assertions participate — ordinary logs can't
	 * create a shift. */
	getStatusShifts(foods?: FoodSummary[]): StatusShift[] {
		const shifts: StatusShift[] = [];
		for (const food of foods ?? this.getFoods()) {
			let prev: FoodStatus | null = null;
			for (const e of food.entries) {
				if (!e.status) continue;
				if (prev !== null && e.status !== prev) {
					shifts.push({ food: food.name, from: prev, to: e.status, date: e.date, reason: e.statusReason });
				}
				prev = e.status;
			}
		}
		shifts.sort((a, b) => a.date.localeCompare(b.date));
		return shifts;
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
}

// ---------------------------------------------------------------- parsing

function parseEntry(file: TFile, fm: Record<string, unknown>): FoodEntry | null {
	const food = String(fm.food ?? "").trim();
	if (!food) return null;
	const exposure = fm.exposure === true || fm.exposure === "true";
	const tags = splitList(fm.tags);
	return {
		file,
		date: normalizeDate(fm.date),
		time: normalizeTime(fm.time),
		food,
		meal: normalizeMeal(fm.meal),
		status: normalizeStatus(fm.status),
		outcome: normalizeOutcome(fm.outcome),
		kind: deriveEntryKind(exposure, tags),
		exposure,
		exposureStep: normalizeExposureStep(fm.exposure_step),
		statusReason: String(fm.status_reason ?? "").trim(),
		textureNotes: String(fm.texture_notes ?? ""),
		context: splitList(fm.context),
		strategies: splitList(fm.strategy_used),
		strategyWorked: normalizeWorked(fm.strategy_worked),
		tags,
	};
}

function parseFoodNote(file: TFile, fm: Record<string, unknown>): FoodNote | null {
	const food = String(fm.food ?? "").trim();
	if (!food) return null;
	const kind = String(fm.note_kind ?? "").trim().toLowerCase();
	return {
		file,
		food,
		key: normalizeFoodKey(food),
		kind: (NOTE_KINDS as readonly string[]).includes(kind) ? (kind as NoteKind) : "ritual",
		date: normalizeDate(fm.date),
	};
}

function stampOf(e: { date: string; time: string }): string {
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

function normalizeStatus(value: unknown): FoodStatus | "" {
	const s = String(value ?? "").trim().toLowerCase();
	if ((FOOD_STATUSES as readonly string[]).includes(s)) return s as FoodStatus;
	// tolerate close variants in hand-edited notes
	if (s === "expanded" || s === "recently expanded") return "recently-expanded";
	return "";
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

// ------------------------------------------------------------- date utils

export function isoDate(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

export function isoTime(d: Date): string {
	return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function nowStamp(): { date: string; time: string } {
	const now = new Date();
	return { date: isoDate(now), time: isoTime(now) };
}

export function daysAgoIso(days: number): string {
	return isoDate(new Date(Date.now() - days * 86400_000));
}
