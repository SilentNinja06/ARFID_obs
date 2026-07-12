import { App, Modal } from "obsidian";
import type ArfidTrackerPlugin from "./main";

/** Base for the plugin's modals: shared classes, title, save-button wiring
 * (button + Mod+Enter), and cleanup. Subclasses implement buildContent(). */
export abstract class ArfidModal extends Modal {
	protected plugin: ArfidTrackerPlugin;

	constructor(app: App, plugin: ArfidTrackerPlugin, private title: string) {
		super(app);
		this.plugin = plugin;
	}

	onOpen(): void {
		this.contentEl.addClass("arfid-plugin", "arfid-quicklog");
		this.titleEl.setText(this.title);
		this.buildContent();
	}

	protected abstract buildContent(): void;

	protected addSaveButton(label: string, onSave: () => void | Promise<void>): HTMLButtonElement {
		const btn = this.contentEl.createEl("button", { cls: "arfid-save-btn", text: label });
		btn.addEventListener("click", () => void onSave());
		this.scope.register(["Mod"], "Enter", () => {
			void onSave();
			return false;
		});
		return btn;
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
