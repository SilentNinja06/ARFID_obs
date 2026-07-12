import { TFile } from "obsidian";

export const FOOD_STATUSES = ["safe", "trying", "fear", "recently-expanded"] as const;
export type FoodStatus = (typeof FOOD_STATUSES)[number];

export const STATUS_LABELS: Record<FoodStatus, string> = {
	safe: "Safe",
	trying: "Trying",
	fear: "Fear",
	"recently-expanded": "Recently expanded",
};

export const OUTCOMES = ["full", "partial", "refused", "avoided"] as const;
export type Outcome = (typeof OUTCOMES)[number];

export const OUTCOME_LABELS: Record<Outcome, string> = {
	full: "Full",
	partial: "Partial",
	refused: "Refused",
	avoided: "Avoided",
};

export type StrategyWorked = true | false | "n/a";

export interface FoodEntry {
	file: TFile;
	date: string; // YYYY-MM-DD
	time: string; // HH:mm
	food: string;
	status: FoodStatus;
	outcome: Outcome | "";
	textureNotes: string;
	context: string[]; // comma-separated in frontmatter
	strategies: string[]; // comma-separated in frontmatter (strategy_used)
	strategyWorked: StrategyWorked;
	tags: string[];
}

export interface FoodSummary {
	name: string; // display name (as first logged)
	key: string; // lowercased trimmed name
	entries: FoodEntry[]; // chronological
	currentStatus: FoodStatus;
	firstLogged: string;
	lastLogged: string;
}

export interface StatusShift {
	food: string;
	from: FoodStatus;
	to: FoodStatus;
	date: string;
}

export interface StrategyStat {
	name: string;
	uses: number;
	worked: number;
	failed: number;
}

export interface ArfidSettings {
	entriesFolder: string;
	filenameTemplate: string;
	exportsFolder: string;
	knownStrategies: string[];
	knownContexts: string[];
	dailyNoteLinking: boolean;
	dailyNoteMarker: string;
	dailyNoteHeading: string;
}

export const DEFAULT_SETTINGS: ArfidSettings = {
	entriesFolder: "Food Log",
	filenameTemplate: "{{date}} {{time}} {{food}}",
	exportsFolder: "Exports",
	knownStrategies: [
		"small portion first",
		"paired with a safe food",
		"same brand as usual",
		"foods kept separate on plate",
		"distraction (show / screen)",
		"chose it myself",
		"someone else eating it too",
		"tried at home first",
		"no pressure, opt-out allowed",
		"modified texture (plainer / crispier)",
	],
	knownContexts: [
		"home",
		"restaurant",
		"school / work",
		"family meal",
		"alone",
		"with a friend",
		"rushed",
		"calm",
	],
	dailyNoteLinking: false,
	dailyNoteMarker: "%% arfid-log %%",
	dailyNoteHeading: "Food log",
};

/** Split a comma-separated frontmatter string into trimmed, non-empty items. */
export function splitList(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value.map((v) => String(v).trim()).filter((v) => v.length > 0);
	}
	if (typeof value !== "string") return [];
	return value
		.split(",")
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

export function normalizeFoodKey(name: string): string {
	return name.trim().toLowerCase();
}
