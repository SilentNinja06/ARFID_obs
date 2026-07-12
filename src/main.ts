import { Plugin, WorkspaceLeaf } from "obsidian";
import { ArfidSettings, DEFAULT_SETTINGS } from "./types";
import { ArfidSettingTab } from "./settings";
import { EntryStore } from "./store";
import { QuickLogModal } from "./quicklog";
import { ExposureModal } from "./exposure";
import { StrugglingModal } from "./struggling";
import { SymptomModal } from "./symptoms";
import { FoodNoteModal } from "./foodnote";
import { StatusChangeModal } from "./statuschange";
import { ArfidDashboardView, VIEW_TYPE_ARFID } from "./dashboard";
import { exportCsv, exportSummary } from "./export";

export default class ArfidTrackerPlugin extends Plugin {
	settings: ArfidSettings = DEFAULT_SETTINGS;
	store!: EntryStore;
	private refreshTimer: number | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.store = new EntryStore(this.app);

		this.registerView(VIEW_TYPE_ARFID, (leaf) => new ArfidDashboardView(leaf, this));

		this.addRibbonIcon("utensils", "Log a food", () => this.openQuickLog());
		this.addRibbonIcon("apple", "Open ARFID dashboard", () => void this.openDashboard());
		this.addRibbonIcon("heart-handshake", "I'm struggling to eat", () =>
			new StrugglingModal(this.app, this).open()
		);

		this.addCommand({
			id: "quick-log",
			name: "Log a food",
			callback: () => this.openQuickLog(),
		});
		this.addCommand({
			id: "open-dashboard",
			name: "Open dashboard",
			callback: () => void this.openDashboard(),
		});
		this.addCommand({
			id: "struggling",
			name: "I'm struggling — show safe options",
			callback: () => new StrugglingModal(this.app, this).open(),
		});
		this.addCommand({
			id: "log-exposure",
			name: "Log an exposure",
			callback: () => new ExposureModal(this.app, this).open(),
		});
		this.addCommand({
			id: "log-symptoms",
			name: "Log symptoms",
			callback: () => new SymptomModal(this.app, this).open(),
		});
		this.addCommand({
			id: "change-food-status",
			name: "Change a food's status",
			callback: () => new StatusChangeModal(this.app, this).open(),
		});
		this.addCommand({
			id: "add-food-note",
			name: "Add a ritual, order, or recipe for a food",
			callback: () => new FoodNoteModal(this.app, this).open(),
		});
		this.addCommand({
			id: "export-csv",
			name: "Export entries to CSV",
			callback: () => void exportCsv(this.app, this.settings, this.store),
		});
		this.addCommand({
			id: "export-summary",
			name: "Export markdown summary",
			callback: () => void exportSummary(this.app, this.settings, this.store),
		});

		this.addSettingTab(new ArfidSettingTab(this.app, this));

		// keep open dashboards fresh when entry notes change on disk
		this.registerEvent(this.app.metadataCache.on("changed", (file) => this.maybeRefresh(file.path)));
		this.registerEvent(this.app.vault.on("delete", () => this.scheduleRefresh()));
		this.registerEvent(this.app.vault.on("rename", () => this.scheduleRefresh()));
	}

	openQuickLog(): void {
		new QuickLogModal(this.app, this).open();
	}

	async openDashboard(): Promise<void> {
		const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_ARFID);
		let leaf: WorkspaceLeaf;
		if (existing.length > 0) {
			leaf = existing[0];
		} else {
			leaf = this.app.workspace.getLeaf(true);
			await leaf.setViewState({ type: VIEW_TYPE_ARFID, active: true });
		}
		this.app.workspace.revealLeaf(leaf);
	}

	notifyDataChanged(): void {
		this.scheduleRefresh();
	}

	private maybeRefresh(path: string): void {
		const fm = this.app.metadataCache.getCache(path)?.frontmatter;
		if (fm?.type === "food-entry" || fm?.type === "symptom-entry" || fm?.type === "food-note") {
			this.scheduleRefresh();
		}
	}

	private scheduleRefresh(): void {
		if (this.refreshTimer !== null) window.clearTimeout(this.refreshTimer);
		this.refreshTimer = window.setTimeout(() => {
			this.refreshTimer = null;
			for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_ARFID)) {
				const view = leaf.view;
				if (view instanceof ArfidDashboardView) view.render();
			}
		}, 400);
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
