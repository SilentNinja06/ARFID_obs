import { App, Modal } from "obsidian";
import type ArfidTrackerPlugin from "./main";

/** Base for the plugin's modals: shared classes, title, save-button wiring
 * (button + Mod+Enter), on-screen-keyboard handling, and cleanup.
 * Subclasses implement buildContent(). */
export abstract class ArfidModal extends Modal {
	protected plugin: ArfidTrackerPlugin;
	private detachKeyboardHandling: (() => void) | null = null;

	constructor(app: App, plugin: ArfidTrackerPlugin, private title: string) {
		super(app);
		this.plugin = plugin;
	}

	onOpen(): void {
		this.contentEl.addClass("arfid-plugin", "arfid-quicklog");
		this.titleEl.setText(this.title);
		this.buildContent();
		this.enableKeyboardHandling();
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

	/** On phones the on-screen keyboard overlays the lower half of the modal
	 * without resizing it, hiding whatever is being typed and the save button.
	 * Track the visual viewport: pad the content by the keyboard's height so
	 * everything can still be scrolled above it, and keep the focused field
	 * scrolled into view while typing. */
	private enableKeyboardHandling(): void {
		const vv = window.visualViewport;
		if (!vv) return;

		const update = () => {
			const covered = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
			this.contentEl.style.paddingBottom = covered > 0 ? `${covered + 16}px` : "";
			// keyboard geometry changed — keep whatever is being typed visible
			if (covered > 0) window.setTimeout(() => this.scrollFocusedIntoView(), 50);
		};
		const onFocusIn = () => {
			// wait out the keyboard's opening animation before scrolling
			window.setTimeout(() => this.scrollFocusedIntoView(), 250);
		};

		vv.addEventListener("resize", update);
		vv.addEventListener("scroll", update);
		this.contentEl.addEventListener("focusin", onFocusIn);
		this.detachKeyboardHandling = () => {
			vv.removeEventListener("resize", update);
			vv.removeEventListener("scroll", update);
			this.contentEl.removeEventListener("focusin", onFocusIn);
		};
		update();
	}

	private scrollFocusedIntoView(): void {
		const active = document.activeElement;
		if (
			(active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) &&
			this.contentEl.contains(active)
		) {
			active.scrollIntoView({ block: "center", behavior: "smooth" });
		}
	}

	onClose(): void {
		this.detachKeyboardHandling?.();
		this.detachKeyboardHandling = null;
		this.contentEl.empty();
	}
}
