/** Minimal YAML frontmatter writer for entry notes. Handles quoting and
 * multi-line block scalars so hand-editable notes stay valid. */

function needsQuotes(s: string): boolean {
	if (s === "") return true;
	return /[:#\[\]{}&*!|>'"%@`,]|^[\s-?]|\s$/.test(s) || /^(true|false|null|~|yes|no|on|off)$/i.test(s) || /^[\d.+-]/.test(s);
}

export function yamlString(value: string, indent = ""): string {
	if (value.includes("\n")) {
		const lines = value.replace(/\r\n/g, "\n").split("\n");
		return "|-\n" + lines.map((l) => `${indent}  ${l}`).join("\n");
	}
	if (needsQuotes(value)) return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
	return value;
}

export function yamlList(items: string[]): string {
	if (items.length === 0) return "[]";
	return "[" + items.map((s) => yamlString(s.replace(/\n/g, " "))).join(", ") + "]";
}

export interface EntryFields {
	date: string;
	time: string;
	food: string;
	meal: string;
	status: string;
	outcome: string;
	exposure: boolean;
	exposureStep: string;
	statusReason: string;
	textureNotes: string;
	context: string[];
	strategies: string[];
	strategyWorked: true | false | "n/a";
	tags: string[];
	/** Freeform thoughts, written as the note body below the frontmatter. */
	body?: string;
}

export function buildEntryNote(f: EntryFields): string {
	const worked =
		f.strategyWorked === true ? "true" : f.strategyWorked === false ? "false" : '"n/a"';
	// Unified schema (docs/frontmatter-schema.md): core keys flat; entry-specific
	// fields nested under `arfid:`. yamlString gets an extra indent so multi-line
	// block scalars stay valid one level deep.
	const nest = (v: string) => yamlString(v, "  ");
	const lines = [
		"---",
		"type: food-entry",
		`date: ${f.date}`,
		`time: "${f.time}"`,
		`food: ${yamlString(f.food)}`,
		`status: ${f.status ? f.status : '""'}`,
		`created: ${f.date}`,
		`updated: ${f.date}`,
		`tags: ${yamlList(f.tags)}`,
		"arfid:",
		`  meal: ${f.meal ? f.meal : '""'}`,
		`  outcome: ${f.outcome ? f.outcome : '""'}`,
		`  exposure: ${f.exposure ? "true" : "false"}`,
		`  exposure_step: ${f.exposureStep ? f.exposureStep : '""'}`,
		`  status_reason: ${nest(f.statusReason)}`,
		`  texture_notes: ${nest(f.textureNotes)}`,
		`  context: ${nest(f.context.join(", "))}`,
		`  strategy_used: ${nest(f.strategies.join(", "))}`,
		`  strategy_worked: ${worked}`,
		"---",
		"",
	];
	const body = (f.body ?? "").trim();
	return lines.join("\n") + (body ? "\n" + body + "\n" : "");
}

export function buildSymptomNote(date: string, time: string, symptoms: string[], body: string): string {
	const lines = [
		"---",
		"type: symptom-entry",
		`date: ${date}`,
		`time: "${time}"`,
		`symptoms: ${yamlString(symptoms.join(", "))}`,
		"---",
		"",
	];
	const b = body.trim();
	return lines.join("\n") + (b ? "\n" + b + "\n" : "");
}

export function buildFoodNote(date: string, food: string, kind: string, body: string): string {
	const lines = [
		"---",
		"type: food-note",
		`date: ${date}`,
		`food: ${yamlString(food)}`,
		`note_kind: ${kind}`,
		"---",
		"",
	];
	const b = body.trim();
	return lines.join("\n") + (b ? "\n" + b + "\n" : "");
}

/** Make a food name safe for use inside a filename. */
export function sanitizeForFilename(s: string): string {
	return s
		.replace(/[\\/:*?"<>|#^\[\]]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}
