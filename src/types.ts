import { TFile } from "obsidian";

/** A food's category: the acceptance spectrum (safe → like → neutral →
 * dislike → fear) plus the process states trying and recently-expanded.
 * Category is a property of the food — set when adding it or through the
 * dedicated change flow — never re-asserted by ordinary logging. Foods that
 * were never categorized (water, incidental drinks…) are neutral. */
export const FOOD_STATUSES = [
	"safe",
	"like",
	"neutral",
	"dislike",
	"fear",
	"trying",
	"recently-expanded",
] as const;
export type FoodStatus = (typeof FOOD_STATUSES)[number];

export const DEFAULT_STATUS: FoodStatus = "neutral";

export const STATUS_LABELS: Record<FoodStatus, string> = {
	safe: "Safe",
	like: "Like",
	neutral: "Neutral",
	dislike: "Dislike",
	fear: "Fear",
	trying: "Trying",
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

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack", "drink"] as const;
export type MealType = (typeof MEAL_TYPES)[number] | "";

export const MEAL_LABELS: Record<Exclude<MealType, "">, string> = {
	breakfast: "Breakfast",
	lunch: "Lunch",
	dinner: "Dinner",
	snack: "Snack",
	drink: "Drink",
};

/** Exposure ladder: any step counts, in roughly increasing order. */
export const EXPOSURE_STEPS = ["looked", "smelled", "touched", "tasted", "bite", "portion"] as const;
export type ExposureStep = (typeof EXPOSURE_STEPS)[number] | "";

export const EXPOSURE_STEP_LABELS: Record<Exclude<ExposureStep, "">, string> = {
	looked: "Looked at it",
	smelled: "Smelled it",
	touched: "Touched it",
	tasted: "Tasted it",
	bite: "Took a bite",
	portion: "Ate a portion",
};

export type StrategyWorked = true | false | "n/a";

/** What a food-entry note records. Derived once at parse time — exposures
 * carry `exposure: true`; baseline library imports and status changes are
 * marked by the reserved tags the plugin writes (`baseline`,
 * `status-change`); everything else is an eaten/attempted meal. */
export type EntryKind = "meal" | "exposure" | "baseline" | "status-change";

export function deriveEntryKind(exposure: boolean, tags: string[]): EntryKind {
	if (exposure) return "exposure";
	if (tags.includes("status-change")) return "status-change";
	if (tags.includes("baseline")) return "baseline";
	return "meal";
}

/** Short badge label for each entry kind, so the log can tell an eaten meal from
 * a status change or a library add at a glance. Symptom entries aren't food
 * entries and carry their own "Symptoms" label at the call site. */
export const ENTRY_KIND_LABELS: Record<EntryKind, string> = {
	meal: "Meal",
	exposure: "Exposure",
	baseline: "Library",
	"status-change": "Status change",
};

/** Entries where something was actually consumed or attempted — the only
 * ones that count toward "meals logged" trends. */
export function isConsumed(e: FoodEntry): boolean {
	return e.exposure || e.meal !== "" || e.outcome !== "";
}

/** The dot CSS class for a status, treating uncategorized as neutral. */
export function statusDotClass(status: FoodStatus | ""): string {
	return `arfid-status-${status || DEFAULT_STATUS}`;
}

/** The outcome an exposure step implies, so meal stats stay coherent. */
export function outcomeForStep(step: ExposureStep): Outcome | "" {
	if (step === "portion") return "full";
	if (step === "bite" || step === "tasted") return "partial";
	return "";
}

/** How accepted a food is, for ordering and expansion detection. Process
 * states sit mid-scale: trying is movement, not yet acceptance. */
const ACCEPTANCE_RANK: Record<FoodStatus, number> = {
	fear: 0,
	dislike: 1,
	trying: 2,
	neutral: 2,
	like: 3,
	safe: 4,
	"recently-expanded": 4,
};

export function acceptanceRank(status: FoodStatus): number {
	return ACCEPTANCE_RANK[status];
}

/** A shift that counts as food expansion: movement up the acceptance scale,
 * or anything newly marked recently-expanded. */
export function isExpansionShift(s: StatusShift): boolean {
	return acceptanceRank(s.to) > acceptanceRank(s.from) || s.to === "recently-expanded";
}

export function findFood(foods: FoodSummary[], name: string): FoodSummary | undefined {
	const key = normalizeFoodKey(name);
	return foods.find((f) => f.key === key);
}

/** Per-food companion notes: eating rituals, orders that work, recipes. */
export const NOTE_KINDS = ["ritual", "order", "recipe"] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];

export const NOTE_KIND_LABELS: Record<NoteKind, string> = {
	ritual: "Ritual",
	order: "Order that works",
	recipe: "Recipe",
};

export interface FoodEntry {
	file: TFile;
	date: string; // YYYY-MM-DD
	time: string; // HH:mm
	food: string;
	meal: MealType;
	/** Explicit category assertion, or "" for ordinary logs that leave the
	 * food's category untouched. */
	status: FoodStatus | "";
	outcome: Outcome | "";
	kind: EntryKind;
	exposure: boolean;
	exposureStep: ExposureStep;
	statusReason: string;
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

export interface SymptomEntry {
	file: TFile;
	date: string;
	time: string;
	symptoms: string[];
}

export interface FoodNote {
	file: TFile;
	food: string;
	key: string; // normalized food name
	kind: NoteKind;
	date: string;
}

export interface StatusShift {
	food: string;
	from: FoodStatus;
	to: FoodStatus;
	date: string;
	reason: string;
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
	knownSymptoms: string[];
	kindnessReminders: string[];
	environmentChecklist: string[];
	exposureChecklist: string[];
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
	knownSymptoms: [
		"brain fog",
		"jitters / shakiness",
		"lightheaded / dizzy",
		"headache",
		"nausea",
		"fatigue / low energy",
		"irritability",
		"trouble focusing",
		"stomach pain",
		"weakness",
	],
	kindnessReminders: [
		"Eating anything is better than eating nothing.",
		"A hard eating day doesn't undo your progress.",
		"You're allowed to eat the same safe food again. That's what it's for.",
		"Safe foods are tools, not failures.",
		"Be as kind to yourself as you'd be to a friend struggling with this.",
		"Your body deserves fuel even on days it feels hard to give it.",
	],
	environmentChecklist: [
		"Soften the lighting",
		"Reduce noise — quiet room or headphones",
		"Sit somewhere comfortable",
		"Put on a familiar show or video",
		"Have water or a safe drink within reach",
		"Remove time pressure — nothing else needs to happen right now",
	],
	exposureChecklist: [
		"Pick one small step — looking, smelling, or touching counts",
		"Keep a safe food on the plate too",
		"You can stop at any time — stopping is not failure",
		"Tasting and spitting out still counts as progress",
		"Rate how it went after, not during",
		"Note your next step while it's fresh",
	],
	dailyNoteLinking: true,
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

/** Guess the meal type from the time of day, so quick logging needs one less tap. */
export function guessMealType(d: Date): MealType {
	const h = d.getHours();
	if (h >= 5 && h < 11) return "breakfast";
	if (h >= 11 && h < 15) return "lunch";
	if (h >= 17 && h < 22) return "dinner";
	return "snack";
}
