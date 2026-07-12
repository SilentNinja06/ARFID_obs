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
	status: string;
	outcome: string;
	textureNotes: string;
	context: string[];
	strategies: string[];
	strategyWorked: true | false | "n/a";
	tags: string[];
}

export function buildEntryNote(f: EntryFields): string {
	const worked =
		f.strategyWorked === true ? "true" : f.strategyWorked === false ? "false" : '"n/a"';
	const lines = [
		"---",
		"type: food-entry",
		`date: ${f.date}`,
		`time: "${f.time}"`,
		`food: ${yamlString(f.food)}`,
		`status: ${f.status}`,
		`outcome: ${f.outcome ? f.outcome : '""'}`,
		`texture_notes: ${yamlString(f.textureNotes)}`,
		`context: ${yamlString(f.context.join(", "))}`,
		`strategy_used: ${yamlString(f.strategies.join(", "))}`,
		`strategy_worked: ${worked}`,
		`tags: ${yamlList(f.tags)}`,
		"---",
		"",
	];
	return lines.join("\n");
}

/** Make a food name safe for use inside a filename. */
export function sanitizeForFilename(s: string): string {
	return s
		.replace(/[\\/:*?"<>|#^\[\]]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}
