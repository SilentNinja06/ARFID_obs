import { ItemView, WorkspaceLeaf } from "obsidian";
import {
	EXPOSURE_STEP_LABELS,
	ExposureStep,
	FOOD_STATUSES,
	FoodEntry,
	FoodNote,
	FoodSummary,
	NOTE_KIND_LABELS,
	NOTE_KINDS,
	STATUS_LABELS,
	StatusShift,
} from "./types";
import { renderBars, renderLineChart, SeriesPoint } from "./charts";
import { exportCsv, exportSummary } from "./export";
import { isoDate } from "./store";
import { QuickLogModal } from "./quicklog";
import { ExposureModal } from "./exposure";
import { StrugglingModal } from "./struggling";
import { SymptomModal } from "./symptoms";
import { FoodNoteModal } from "./foodnote";
import { StatusChangeModal } from "./statuschange";
import type ArfidTrackerPlugin from "./main";

export const VIEW_TYPE_ARFID = "arfid-dashboard";

type Tab = "overview" | "foods" | "strategies";

export class ArfidDashboardView extends ItemView {
	private plugin: ArfidTrackerPlugin;
	private tab: Tab = "overview";
	private trendMode: "day" | "week" = "week";
	private foodSearch = "";
	private expandedFood: string | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: ArfidTrackerPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_ARFID;
	}

	getDisplayText(): string {
		return "ARFID Tracker";
	}

	getIcon(): string {
		return "apple";
	}

	async onOpen(): Promise<void> {
		this.render();
	}

	render(): void {
		const root = this.contentEl;
		root.empty();
		root.addClass("arfid-plugin", "arfid-dashboard");

		const header = root.createDiv({ cls: "arfid-header" });
		const nav = header.createDiv({ cls: "arfid-tabs" });
		const tabs: [Tab, string][] = [
			["overview", "Overview"],
			["foods", "Foods"],
			["strategies", "Patterns"],
		];
		for (const [tab, label] of tabs) {
			const btn = nav.createEl("button", { cls: "arfid-tab", text: label });
			btn.toggleClass("is-active", this.tab === tab);
			btn.addEventListener("click", () => {
				this.tab = tab;
				this.render();
			});
		}
		const logBtn = header.createEl("button", { cls: "arfid-log-btn", text: "+ Log food" });
		logBtn.addEventListener("click", () => new QuickLogModal(this.app, this.plugin).open());

		const body = root.createDiv({ cls: "arfid-body" });
		const entries = this.plugin.store.getEntries();
		const foods = this.plugin.store.getFoods(entries);

		if (this.tab === "overview") this.renderOverview(body, entries, foods);
		else if (this.tab === "foods") this.renderFoods(body, foods);
		else this.renderStrategies(body, entries);
	}

	// ------------------------------------------------------------- overview

	private renderOverview(body: HTMLElement, entries: FoodEntry[], foods: FoodSummary[]): void {
		const shifts = this.plugin.store.getStatusShifts(foods);
		const cutoff30 = isoDate(new Date(Date.now() - 30 * 86400_000));
		const expansionShift = (s: StatusShift) =>
			(s.from === "fear" && (s.to === "trying" || s.to === "safe" || s.to === "recently-expanded")) ||
			(s.from === "trying" && (s.to === "safe" || s.to === "recently-expanded")) ||
			s.to === "recently-expanded";
		const recentExpansions = shifts.filter((s) => s.date >= cutoff30 && expansionShift(s)).length;
		const recentExposures = entries.filter((e) => e.exposure && e.date >= cutoff30).length;

		// quick actions for hard moments — reachable in two taps from anywhere
		const actions = body.createDiv({ cls: "arfid-quick-actions" });
		const struggling = actions.createEl("button", { cls: "arfid-chip arfid-action-chip", text: "I'm struggling" });
		struggling.addEventListener("click", () => new StrugglingModal(this.app, this.plugin).open());
		const exposure = actions.createEl("button", { cls: "arfid-chip arfid-action-chip", text: "Log an exposure" });
		exposure.addEventListener("click", () => new ExposureModal(this.app, this.plugin).open());
		const symptoms = actions.createEl("button", { cls: "arfid-chip arfid-action-chip", text: "Log symptoms" });
		symptoms.addEventListener("click", () => new SymptomModal(this.app, this.plugin).open());

		// summary cards
		const cards = body.createDiv({ cls: "arfid-cards" });
		const card = (label: string, value: number, statusClass?: string) => {
			const c = cards.createDiv({ cls: "arfid-card" });
			const v = c.createDiv({ cls: "arfid-card-value", text: String(value) });
			if (statusClass) v.addClass(statusClass);
			c.createDiv({ cls: "arfid-card-label", text: label });
		};
		card("Safe foods", foods.filter((f) => f.currentStatus === "safe").length, "arfid-text-safe");
		card("Trying", foods.filter((f) => f.currentStatus === "trying").length, "arfid-text-trying");
		card("Fear foods", foods.filter((f) => f.currentStatus === "fear").length, "arfid-text-fear");
		card("Expansions · 30d", recentExpansions, "arfid-text-expanded");
		card("Exposures · 30d", recentExposures);

		// trend chart
		const trendSection = body.createDiv({ cls: "arfid-section" });
		const trendHead = trendSection.createDiv({ cls: "arfid-section-head" });
		trendHead.createEl("h3", { text: "Meals logged" });
		const toggle = trendHead.createDiv({ cls: "arfid-toggle" });
		for (const mode of ["day", "week"] as const) {
			const b = toggle.createEl("button", {
				cls: "arfid-toggle-btn",
				text: mode === "day" ? "30 days" : "12 weeks",
			});
			b.toggleClass("is-active", this.trendMode === mode);
			b.addEventListener("click", () => {
				this.trendMode = mode;
				this.render();
			});
		}
		renderLineChart(
			trendSection,
			this.trendMode === "day" ? trendPerDay(entries, 30) : trendPerWeek(entries, 12),
			{ singular: "entry", plural: "entries" }
		);

		// status shift tracker
		const shiftSection = body.createDiv({ cls: "arfid-section" });
		shiftSection.createEl("h3", { text: "Status changes" });
		if (shifts.length === 0) {
			shiftSection.createDiv({ cls: "arfid-empty", text: "No status changes yet — they'll show up here as foods move between fear, trying, and safe." });
		} else {
			const list = shiftSection.createDiv({ cls: "arfid-shift-list" });
			for (const sh of [...shifts].reverse().slice(0, 15)) {
				const item = list.createDiv({ cls: "arfid-shift-item" });
				const row = item.createDiv({ cls: "arfid-shift-row" });
				row.createSpan({ cls: "arfid-shift-date", text: sh.date });
				row.createSpan({ cls: "arfid-shift-food", text: sh.food });
				const change = row.createSpan({ cls: "arfid-shift-change" });
				change.createSpan({ cls: `arfid-status-dot arfid-status-${sh.from}` });
				change.createSpan({ text: `${STATUS_LABELS[sh.from]} → ` });
				change.createSpan({ cls: `arfid-status-dot arfid-status-${sh.to}` });
				change.createSpan({ text: STATUS_LABELS[sh.to] });
				if (sh.reason) {
					item.createDiv({ cls: "arfid-shift-reason", text: `“${sh.reason}”` });
				}
			}
		}

		// recently logged
		const recentSection = body.createDiv({ cls: "arfid-section" });
		recentSection.createEl("h3", { text: "Recently logged" });
		const recent = [...entries].reverse().slice(0, 10);
		if (recent.length === 0) {
			recentSection.createDiv({ cls: "arfid-empty", text: "Nothing logged yet. Tap “+ Log food” to add your first entry." });
		} else {
			const list = recentSection.createDiv({ cls: "arfid-entry-list" });
			for (const e of recent) this.renderEntryRow(list, e, true);
		}

		// export
		const exportSection = body.createDiv({ cls: "arfid-section arfid-export" });
		exportSection.createEl("h3", { text: "Export" });
		const row = exportSection.createDiv({ cls: "arfid-chip-row" });
		const csvBtn = row.createEl("button", { cls: "arfid-chip", text: "Export CSV" });
		csvBtn.addEventListener("click", () => void exportCsv(this.app, this.plugin.settings, this.plugin.store));
		const mdBtn = row.createEl("button", { cls: "arfid-chip", text: "Export summary" });
		mdBtn.addEventListener("click", () => void exportSummary(this.app, this.plugin.settings, this.plugin.store));
	}

	// ---------------------------------------------------------------- foods

	private renderFoods(body: HTMLElement, foods: FoodSummary[]): void {
		const notesByFood = new Map<string, FoodNote[]>();
		for (const n of this.plugin.store.getFoodNotes()) {
			const list = notesByFood.get(n.key) ?? [];
			list.push(n);
			notesByFood.set(n.key, list);
		}
		const search = body.createEl("input", {
			cls: "arfid-input arfid-search",
			attr: { type: "search", placeholder: "Search foods…" },
		});
		search.value = this.foodSearch;
		const groups = body.createDiv();
		search.addEventListener("input", () => {
			this.foodSearch = search.value;
			renderGroups();
		});

		const renderGroups = () => {
			groups.empty();
			const q = this.foodSearch.trim().toLowerCase();
			const filtered = q ? foods.filter((f) => f.key.includes(q)) : foods;
			if (filtered.length === 0) {
				groups.createDiv({ cls: "arfid-empty", text: q ? "No foods match." : "No foods logged yet." });
				return;
			}
			for (const status of FOOD_STATUSES) {
				const group = filtered.filter((f) => f.currentStatus === status);
				if (group.length === 0) continue;
				const section = groups.createDiv({ cls: "arfid-section" });
				const head = section.createEl("h3");
				head.createSpan({ cls: `arfid-status-dot arfid-status-${status}` });
				head.createSpan({ text: ` ${STATUS_LABELS[status]} (${group.length})` });
				for (const f of group) {
					const row = section.createDiv({ cls: "arfid-food-row" });
					const main = row.createDiv({ cls: "arfid-food-main" });
					main.createSpan({ cls: "arfid-food-name", text: f.name });
					const notes = notesByFood.get(f.key) ?? [];
					if (notes.length > 0) {
						const badges = main.createSpan({ cls: "arfid-note-badges" });
						for (const kind of NOTE_KINDS) {
							if (notes.some((n) => n.kind === kind)) {
								badges.createSpan({ cls: "arfid-note-badge", text: NOTE_KIND_LABELS[kind].split(" ")[0].toLowerCase() });
							}
						}
					}
					main.createSpan({
						cls: "arfid-food-meta",
						text: `${f.entries.length}× · last ${f.lastLogged}`,
					});
					main.addEventListener("click", () => {
						this.expandedFood = this.expandedFood === f.key ? null : f.key;
						renderGroups();
					});
					if (this.expandedFood === f.key) {
						const detail = row.createDiv({ cls: "arfid-food-history" });
						const actionRow = detail.createDiv({ cls: "arfid-chip-row" });
						const changeBtn = actionRow.createEl("button", { cls: "arfid-chip", text: "Change status" });
						changeBtn.addEventListener("click", () => new StatusChangeModal(this.app, this.plugin, f.name).open());
						const noteBtn = actionRow.createEl("button", { cls: "arfid-chip", text: "+ Ritual / order / recipe" });
						noteBtn.addEventListener("click", () => new FoodNoteModal(this.app, this.plugin, f.name).open());
						for (const n of notes) {
							const noteRow = detail.createDiv({ cls: "arfid-entry-row" });
							noteRow.createSpan({ cls: "arfid-note-badge", text: NOTE_KIND_LABELS[n.kind].toLowerCase() });
							noteRow.createSpan({ cls: "arfid-entry-main", text: n.file.basename });
							noteRow.addEventListener("click", () => void this.app.workspace.getLeaf(false).openFile(n.file));
						}
						for (const e of [...f.entries].reverse()) this.renderEntryRow(detail, e, false);
					}
				}
			}
		};
		renderGroups();
	}

	// ----------------------------------------------------------- strategies

	private renderStrategies(body: HTMLElement, entries: FoodEntry[]): void {
		const stats = this.plugin.store.getStrategyStats(entries);
		const section = body.createDiv({ cls: "arfid-section" });
		section.createEl("h3", { text: "Strategies and how often they helped" });
		section.createDiv({
			cls: "arfid-hint",
			text: "Bar length is how often a strategy was used; the darker portion is the share of rated uses where it helped.",
		});
		renderBars(
			section,
			stats.map((s) => {
				const rated = s.worked + s.failed;
				return {
					label: s.name,
					value: s.uses,
					detail: rated > 0 ? `helped ${Math.round((s.worked / rated) * 100)}% of ${rated} rated` : "not rated yet",
					fraction: rated > 0 ? s.worked / rated : undefined,
				};
			}),
			"No strategies logged yet — add them from the quick-log form under “Add details”."
		);

		const symptomStats = this.plugin.store.getSymptomStats();
		const symptomSection = body.createDiv({ cls: "arfid-section" });
		symptomSection.createEl("h3", { text: "Symptoms" });
		symptomSection.createDiv({
			cls: "arfid-hint",
			text: "How often each symptom has been logged, all time.",
		});
		renderBars(
			symptomSection,
			symptomStats.map((s) => ({ label: s.name, value: s.count })),
			"No symptoms logged yet — use “Log symptoms” on the Overview tab when they show up."
		);
	}

	// ------------------------------------------------------------- shared

	private renderEntryRow(parent: HTMLElement, e: FoodEntry, showFood: boolean): void {
		const row = parent.createDiv({ cls: "arfid-entry-row" });
		row.createSpan({ cls: "arfid-entry-when", text: `${e.date} ${e.time}`.trim() });
		const main = row.createSpan({ cls: "arfid-entry-main" });
		main.createSpan({ cls: `arfid-status-dot arfid-status-${e.status}` });
		main.createSpan({ text: showFood ? e.food : STATUS_LABELS[e.status] });
		if (e.exposure) {
			const step = e.exposureStep ? EXPOSURE_STEP_LABELS[e.exposureStep as Exclude<ExposureStep, "">].toLowerCase() : "";
			row.createSpan({ cls: "arfid-entry-outcome", text: step ? `exposure · ${step}` : "exposure" });
		} else {
			const bits = [e.meal, e.outcome].filter((b) => b);
			if (bits.length > 0) row.createSpan({ cls: "arfid-entry-outcome", text: bits.join(" · ") });
		}
		row.addEventListener("click", () => void this.app.workspace.getLeaf(false).openFile(e.file));
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
	}
}

// ------------------------------------------------------------------ trends

function trendPerDay(entries: FoodEntry[], days: number): SeriesPoint[] {
	const counts = new Map<string, number>();
	for (const e of entries) counts.set(e.date, (counts.get(e.date) ?? 0) + 1);
	const points: SeriesPoint[] = [];
	for (let i = days - 1; i >= 0; i--) {
		const d = new Date(Date.now() - i * 86400_000);
		const key = isoDate(d);
		points.push({ label: key.slice(5), value: counts.get(key) ?? 0 });
	}
	return points;
}

function trendPerWeek(entries: FoodEntry[], weeks: number): SeriesPoint[] {
	const points: SeriesPoint[] = [];
	const now = new Date();
	// week starts on Monday
	const day = (now.getDay() + 6) % 7;
	const thisWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
	for (let i = weeks - 1; i >= 0; i--) {
		const start = new Date(thisWeekStart.getTime() - i * 7 * 86400_000);
		const end = new Date(start.getTime() + 7 * 86400_000);
		const startKey = isoDate(start);
		const endKey = isoDate(end);
		const count = entries.filter((e) => e.date >= startKey && e.date < endKey).length;
		points.push({ label: startKey.slice(5), value: count });
	}
	return points;
}
