/*
ARFID Tracker — an Obsidian plugin.
This is a bundled build. Source: https://github.com/SilentNinja06/ARFID_obs
*/

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => ArfidTrackerPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian6 = require("obsidian");

// src/types.ts
var FOOD_STATUSES = ["safe", "trying", "fear", "recently-expanded"];
var STATUS_LABELS = {
  safe: "Safe",
  trying: "Trying",
  fear: "Fear",
  "recently-expanded": "Recently expanded"
};
var OUTCOMES = ["full", "partial", "refused", "avoided"];
var OUTCOME_LABELS = {
  full: "Full",
  partial: "Partial",
  refused: "Refused",
  avoided: "Avoided"
};
var DEFAULT_SETTINGS = {
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
    "modified texture (plainer / crispier)"
  ],
  knownContexts: [
    "home",
    "restaurant",
    "school / work",
    "family meal",
    "alone",
    "with a friend",
    "rushed",
    "calm"
  ],
  dailyNoteLinking: false,
  dailyNoteMarker: "%% arfid-log %%",
  dailyNoteHeading: "Food log"
};
function splitList(value) {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter((v) => v.length > 0);
  }
  if (typeof value !== "string") return [];
  return value.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
}
function normalizeFoodKey(name) {
  return name.trim().toLowerCase();
}

// src/settings.ts
var import_obsidian = require("obsidian");
var ArfidSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian.Setting(containerEl).setName("Entries folder").setDesc("Where new food entries are created. Existing entries are found by their frontmatter (type: food-entry), so moving notes later is fine.").addText(
      (t) => t.setPlaceholder("Food Log").setValue(this.plugin.settings.entriesFolder).onChange(async (v) => {
        this.plugin.settings.entriesFolder = v;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Filename template").setDesc("Tokens: {{date}}, {{time}}, {{food}}.").addText(
      (t) => t.setPlaceholder("{{date}} {{time}} {{food}}").setValue(this.plugin.settings.filenameTemplate).onChange(async (v) => {
        this.plugin.settings.filenameTemplate = v;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Exports folder").setDesc("Where CSV and summary exports are written.").addText(
      (t) => t.setPlaceholder("Exports").setValue(this.plugin.settings.exportsFolder).onChange(async (v) => {
        this.plugin.settings.exportsFolder = v;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Daily note linking").setHeading();
    new import_obsidian.Setting(containerEl).setName("Link entries into the daily note").setDesc("Insert a link into that day's daily note whenever an entry is logged. New daily notes are seeded from the Daily Notes core plugin's template.").addToggle(
      (t) => t.setValue(this.plugin.settings.dailyNoteLinking).onChange(async (v) => {
        this.plugin.settings.dailyNoteLinking = v;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Placement marker").setDesc("Links are inserted after this marker if the daily note contains it (invisible in reading view). Put it in your daily-note template where food links should appear.").addText(
      (t) => t.setPlaceholder("%% arfid-log %%").setValue(this.plugin.settings.dailyNoteMarker).onChange(async (v) => {
        this.plugin.settings.dailyNoteMarker = v;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Fallback heading").setDesc("If the marker isn't found, links go under this heading wherever it sits; a heading is appended at the end only as a last resort.").addText(
      (t) => t.setPlaceholder("Food log").setValue(this.plugin.settings.dailyNoteHeading).onChange(async (v) => {
        this.plugin.settings.dailyNoteHeading = v;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Quick-log chip lists").setHeading();
    new import_obsidian.Setting(containerEl).setName("Known strategies").setDesc("One per line. New strategies typed during logging are added here automatically.").addTextArea((t) => {
      t.setValue(this.plugin.settings.knownStrategies.join("\n")).onChange(async (v) => {
        this.plugin.settings.knownStrategies = v.split("\n").map((s) => s.trim()).filter((s) => s.length > 0);
        await this.plugin.saveSettings();
      });
      t.inputEl.rows = 8;
    });
    new import_obsidian.Setting(containerEl).setName("Known contexts").setDesc("One per line. New contexts typed during logging are added here automatically.").addTextArea((t) => {
      t.setValue(this.plugin.settings.knownContexts.join("\n")).onChange(async (v) => {
        this.plugin.settings.knownContexts = v.split("\n").map((s) => s.trim()).filter((s) => s.length > 0);
        await this.plugin.saveSettings();
      });
      t.inputEl.rows = 6;
    });
  }
};

// src/store.ts
var EntryStore = class {
  constructor(app) {
    this.app = app;
  }
  getEntries() {
    var _a;
    const entries = [];
    for (const file of this.app.vault.getMarkdownFiles()) {
      const fm = (_a = this.app.metadataCache.getFileCache(file)) == null ? void 0 : _a.frontmatter;
      if (!fm || fm.type !== "food-entry") continue;
      const entry = this.parseEntry(file, fm);
      if (entry) entries.push(entry);
    }
    entries.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
    return entries;
  }
  parseEntry(file, fm) {
    var _a, _b;
    const food = String((_a = fm.food) != null ? _a : "").trim();
    if (!food) return null;
    return {
      file,
      date: normalizeDate(fm.date),
      time: normalizeTime(fm.time),
      food,
      status: normalizeStatus(fm.status),
      outcome: normalizeOutcome(fm.outcome),
      textureNotes: String((_b = fm.texture_notes) != null ? _b : ""),
      context: splitList(fm.context),
      strategies: splitList(fm.strategy_used),
      strategyWorked: normalizeWorked(fm.strategy_worked),
      tags: splitList(fm.tags)
    };
  }
  /** All foods ever logged, keyed by normalized name, chronological entries. */
  getFoods(entries) {
    const byKey = /* @__PURE__ */ new Map();
    for (const e of entries != null ? entries : this.getEntries()) {
      const key = normalizeFoodKey(e.food);
      let f = byKey.get(key);
      if (!f) {
        f = {
          name: e.food.trim(),
          key,
          entries: [],
          currentStatus: e.status,
          firstLogged: e.date,
          lastLogged: e.date
        };
        byKey.set(key, f);
      }
      f.entries.push(e);
      f.currentStatus = e.status;
      f.lastLogged = e.date;
    }
    return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
  }
  /** Status changes per food, in chronological order across all foods. */
  getStatusShifts(foods) {
    const shifts = [];
    for (const food of foods != null ? foods : this.getFoods()) {
      let prev = null;
      for (const e of food.entries) {
        if (prev !== null && e.status !== prev) {
          shifts.push({ food: food.name, from: prev, to: e.status, date: e.date });
        }
        prev = e.status;
      }
    }
    shifts.sort((a, b) => a.date.localeCompare(b.date));
    return shifts;
  }
  getStrategyStats(entries) {
    const byName = /* @__PURE__ */ new Map();
    for (const e of entries != null ? entries : this.getEntries()) {
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
};
function sortKey(e) {
  return `${e.date} ${e.time}`;
}
function normalizeDate(value) {
  if (value instanceof Date) return isoDate(value);
  const s = String(value != null ? value : "").trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(s);
  return isNaN(d.getTime()) ? "" : isoDate(d);
}
function normalizeTime(value) {
  const s = String(value != null ? value : "").trim();
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "";
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}
function normalizeStatus(value) {
  const s = String(value != null ? value : "").trim().toLowerCase();
  if (FOOD_STATUSES.includes(s)) return s;
  if (s === "expanded" || s === "recently expanded") return "recently-expanded";
  return "trying";
}
function normalizeOutcome(value) {
  const s = String(value != null ? value : "").trim().toLowerCase();
  return OUTCOMES.includes(s) ? s : "";
}
function normalizeWorked(value) {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return "n/a";
}
function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function isoTime(d) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// src/quicklog.ts
var import_obsidian3 = require("obsidian");

// src/serialize.ts
function needsQuotes(s) {
  if (s === "") return true;
  return /[:#\[\]{}&*!|>'"%@`,]|^[\s-?]|\s$/.test(s) || /^(true|false|null|~|yes|no|on|off)$/i.test(s) || /^[\d.+-]/.test(s);
}
function yamlString(value, indent = "") {
  if (value.includes("\n")) {
    const lines = value.replace(/\r\n/g, "\n").split("\n");
    return "|-\n" + lines.map((l) => `${indent}  ${l}`).join("\n");
  }
  if (needsQuotes(value)) return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  return value;
}
function yamlList(items) {
  if (items.length === 0) return "[]";
  return "[" + items.map((s) => yamlString(s.replace(/\n/g, " "))).join(", ") + "]";
}
function buildEntryNote(f) {
  const worked = f.strategyWorked === true ? "true" : f.strategyWorked === false ? "false" : '"n/a"';
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
    ""
  ];
  return lines.join("\n");
}
function sanitizeForFilename(s) {
  return s.replace(/[\\/:*?"<>|#^\[\]]/g, " ").replace(/\s+/g, " ").trim();
}

// src/dailynote.ts
var import_obsidian2 = require("obsidian");
var PLUGIN_LINE = /^- \d{2}:\d{2} \[\[/;
function getDailyNotesOptions(app) {
  var _a, _b, _c, _d;
  const dn = (_b = (_a = app.internalPlugins) == null ? void 0 : _a.getPluginById) == null ? void 0 : _b.call(_a, "daily-notes");
  return (_d = (_c = dn == null ? void 0 : dn.instance) == null ? void 0 : _c.options) != null ? _d : {};
}
async function linkIntoDailyNote(app, settings, date, time, noteBasename, label) {
  var _a;
  const opts = getDailyNotesOptions(app);
  const format = opts.format || "YYYY-MM-DD";
  const folder = ((_a = opts.folder) != null ? _a : "").trim().replace(/\/+$/, "");
  const dailyName = (0, import_obsidian2.moment)(date, "YYYY-MM-DD").format(format);
  const path = (0, import_obsidian2.normalizePath)((folder ? folder + "/" : "") + dailyName + ".md");
  let file = app.vault.getAbstractFileByPath(path);
  if (!file) {
    await ensureParentFolder(app, path);
    const body = await renderDailyTemplate(app, opts, path, date);
    file = await app.vault.create(path, body);
  }
  if (!(file instanceof import_obsidian2.TFile)) return;
  const line = `- ${time} [[${noteBasename}|${label}]]`;
  await app.vault.process(file, (content) => insertLogLine(content, line, settings, time));
}
async function ensureParentFolder(app, path) {
  const dir = path.split("/").slice(0, -1).join("/");
  if (!dir) return;
  const existing = app.vault.getAbstractFileByPath(dir);
  if (existing instanceof import_obsidian2.TFolder) return;
  await app.vault.createFolder(dir).catch(() => {
  });
}
async function renderDailyTemplate(app, opts, dailyPath, date) {
  var _a, _b, _c;
  const templateSetting = ((_a = opts.template) != null ? _a : "").trim();
  if (!templateSetting) return "";
  const templatePath = (0, import_obsidian2.normalizePath)(
    templateSetting.endsWith(".md") ? templateSetting : templateSetting + ".md"
  );
  const tFile = app.vault.getAbstractFileByPath(templatePath);
  if (!(tFile instanceof import_obsidian2.TFile)) return "";
  const raw = await app.vault.cachedRead(tFile);
  const basename = (_c = (_b = dailyPath.split("/").pop()) == null ? void 0 : _b.replace(/\.md$/, "")) != null ? _c : "";
  const m = (0, import_obsidian2.moment)(date, "YYYY-MM-DD");
  const now = (0, import_obsidian2.moment)();
  return raw.replace(/{{\s*title\s*}}/gi, basename).replace(/{{\s*date(?::([^}]+))?\s*}}/gi, (_, fmt) => m.format(fmt || "YYYY-MM-DD")).replace(/{{\s*time(?::([^}]+))?\s*}}/gi, (_, fmt) => now.format(fmt || "HH:mm"));
}
function insertLogLine(content, line, settings, time) {
  const lines = content.split("\n");
  if (lines.some((l) => l.trim() === line.trim())) return content;
  const marker = settings.dailyNoteMarker.trim();
  let anchor = -1;
  if (marker) {
    anchor = lines.findIndex((l) => l.trim() === marker || l.includes(marker));
  }
  if (anchor === -1) {
    const heading = settings.dailyNoteHeading.trim().toLowerCase().replace(/:$/, "");
    if (heading) {
      anchor = lines.findIndex((l) => {
        const m = l.match(/^#{1,6}\s+(.*?)\s*$/);
        return !!m && m[1].trim().toLowerCase().replace(/:$/, "") === heading;
      });
    }
  }
  if (anchor === -1) {
    const heading = settings.dailyNoteHeading.trim() || "Food log";
    const trimmed = content.replace(/\n+$/, "");
    return (trimmed ? trimmed + "\n\n" : "") + `## ${heading}
${line}
`;
  }
  let insertAt = anchor + 1;
  while (insertAt < lines.length && PLUGIN_LINE.test(lines[insertAt])) {
    const existingTime = lines[insertAt].slice(2, 7);
    if (existingTime > time) break;
    insertAt++;
  }
  lines.splice(insertAt, 0, line);
  return lines.join("\n");
}

// src/quicklog.ts
var QuickLogModal = class extends import_obsidian3.Modal {
  constructor(app, plugin) {
    super(app);
    this.foods = [];
    this.foodName = "";
    this.status = "trying";
    this.statusTouched = false;
    this.outcome = "full";
    this.textureNotes = "";
    this.contexts = /* @__PURE__ */ new Set();
    this.strategies = /* @__PURE__ */ new Set();
    this.strategyWorked = "n/a";
    this.tagsText = "";
    this.plugin = plugin;
  }
  onOpen() {
    var _a, _b;
    this.foods = this.plugin.store.getFoods();
    const { contentEl } = this;
    contentEl.addClass("arfid-plugin", "arfid-quicklog");
    this.titleEl.setText("Log a food");
    const foodInput = contentEl.createEl("input", {
      cls: "arfid-input",
      attr: { type: "text", placeholder: "Food (e.g. scrambled eggs)", enterkeyhint: "done" }
    });
    const suggestions = contentEl.createDiv({ cls: "arfid-suggestions" });
    const renderSuggestions = () => {
      suggestions.empty();
      const q = normalizeFoodKey(foodInput.value);
      let matches;
      if (!q) {
        matches = [...this.foods].sort((a, b) => b.lastLogged.localeCompare(a.lastLogged)).slice(0, 6);
      } else {
        matches = this.foods.filter((f) => f.key.includes(q) && f.key !== q).slice(0, 6);
      }
      for (const f of matches) {
        const chip = suggestions.createEl("button", { cls: "arfid-chip arfid-suggestion" });
        chip.createSpan({ cls: `arfid-status-dot arfid-status-${f.currentStatus}` });
        chip.createSpan({ text: f.name });
        chip.addEventListener("click", () => {
          foodInput.value = f.name;
          this.foodName = f.name;
          if (!this.statusTouched) this.setStatus(f.currentStatus, false);
          renderSuggestions();
        });
      }
    };
    foodInput.addEventListener("input", () => {
      this.foodName = foodInput.value;
      const known = this.foods.find((f) => f.key === normalizeFoodKey(foodInput.value));
      if (known && !this.statusTouched) this.setStatus(known.currentStatus, false);
      renderSuggestions();
    });
    renderSuggestions();
    contentEl.createDiv({ cls: "arfid-field-label", text: "Status" });
    this.statusRow = contentEl.createDiv({ cls: "arfid-chip-row" });
    for (const s of FOOD_STATUSES) {
      const chip = this.statusRow.createEl("button", {
        cls: "arfid-chip arfid-choice",
        text: STATUS_LABELS[s],
        attr: { "data-value": s }
      });
      chip.createSpan({ cls: `arfid-status-dot arfid-status-${s}` }, (el) => chip.prepend(el));
      chip.addEventListener("click", () => this.setStatus(s, true));
    }
    this.setStatus(this.status, false);
    contentEl.createDiv({ cls: "arfid-field-label", text: "Outcome" });
    const outcomeRow = contentEl.createDiv({ cls: "arfid-chip-row" });
    for (const o of OUTCOMES) {
      const chip = outcomeRow.createEl("button", {
        cls: "arfid-chip arfid-choice",
        text: OUTCOME_LABELS[o],
        attr: { "data-value": o }
      });
      chip.addEventListener("click", () => {
        this.outcome = this.outcome === o ? "" : o;
        outcomeRow.querySelectorAll(".arfid-choice").forEach((c) => {
          c.toggleClass("is-selected", c.getAttribute("data-value") === this.outcome);
        });
      });
    }
    (_a = outcomeRow.querySelector(`[data-value="${this.outcome}"]`)) == null ? void 0 : _a.addClass("is-selected");
    const detailsToggle = contentEl.createEl("button", {
      cls: "arfid-details-toggle",
      text: "Add details"
    });
    const details = contentEl.createDiv({ cls: "arfid-details" });
    details.hide();
    detailsToggle.addEventListener("click", () => {
      const open = details.isShown();
      if (open) details.hide();
      else details.show();
      detailsToggle.setText(open ? "Add details" : "Hide details");
    });
    this.buildChipPicker(
      details,
      "Strategies used",
      this.plugin.settings.knownStrategies,
      this.strategies,
      () => this.updateWorkedVisibility()
    );
    this.workedSection = details.createDiv();
    this.workedSection.createDiv({ cls: "arfid-field-label", text: "Did the strategy help?" });
    const workedRow = this.workedSection.createDiv({ cls: "arfid-chip-row" });
    const workedOptions = [
      [true, "Helped"],
      [false, "Didn't help"],
      ["n/a", "Not sure"]
    ];
    for (const [value, label] of workedOptions) {
      const chip = workedRow.createEl("button", {
        cls: "arfid-chip arfid-choice",
        text: label,
        attr: { "data-value": String(value) }
      });
      chip.addEventListener("click", () => {
        this.strategyWorked = value;
        workedRow.querySelectorAll(".arfid-choice").forEach((c) => {
          c.toggleClass("is-selected", c.getAttribute("data-value") === String(value));
        });
      });
    }
    (_b = workedRow.querySelector(`[data-value="n/a"]`)) == null ? void 0 : _b.addClass("is-selected");
    this.updateWorkedVisibility();
    this.buildChipPicker(details, "Context", this.plugin.settings.knownContexts, this.contexts);
    details.createDiv({ cls: "arfid-field-label", text: "Texture notes" });
    const texture = details.createEl("textarea", {
      cls: "arfid-textarea",
      attr: { rows: "2", placeholder: "Texture, temperature, presentation\u2026" }
    });
    texture.addEventListener("input", () => this.textureNotes = texture.value);
    details.createDiv({ cls: "arfid-field-label", text: "Tags" });
    const tags = details.createEl("input", {
      cls: "arfid-input",
      attr: { type: "text", placeholder: "comma, separated" }
    });
    tags.addEventListener("input", () => this.tagsText = tags.value);
    const save = contentEl.createEl("button", { cls: "arfid-save-btn", text: "Save entry" });
    save.addEventListener("click", () => void this.save());
    this.scope.register(["Mod"], "Enter", () => {
      void this.save();
      return false;
    });
    window.setTimeout(() => foodInput.focus(), 50);
  }
  setStatus(s, touched) {
    var _a;
    this.status = s;
    if (touched) this.statusTouched = true;
    (_a = this.statusRow) == null ? void 0 : _a.querySelectorAll(".arfid-choice").forEach((c) => {
      c.toggleClass("is-selected", c.getAttribute("data-value") === s);
    });
  }
  updateWorkedVisibility() {
    if (this.strategies.size > 0) this.workedSection.show();
    else this.workedSection.hide();
  }
  /** Chip picker backed by a persisted known-items list: one-tap toggles,
   * plus an input that adds (and remembers) new items. */
  buildChipPicker(parent, label, known, selected, onChange) {
    parent.createDiv({ cls: "arfid-field-label", text: label });
    const row = parent.createDiv({ cls: "arfid-chip-row arfid-chip-wrap" });
    const addChip = (item) => {
      const chip = row.createEl("button", { cls: "arfid-chip arfid-choice", text: item });
      chip.toggleClass("is-selected", selected.has(item));
      chip.addEventListener("click", () => {
        if (selected.has(item)) selected.delete(item);
        else selected.add(item);
        chip.toggleClass("is-selected", selected.has(item));
        onChange == null ? void 0 : onChange();
      });
    };
    for (const item of known) addChip(item);
    const addRow = parent.createDiv({ cls: "arfid-add-row" });
    const input = addRow.createEl("input", {
      cls: "arfid-input",
      attr: { type: "text", placeholder: `Add ${label.toLowerCase()}\u2026` }
    });
    const addBtn = addRow.createEl("button", { cls: "arfid-chip", text: "+ Add" });
    const commit = () => {
      const v = input.value.trim();
      if (!v) return;
      input.value = "";
      if (!known.some((k) => k.toLowerCase() === v.toLowerCase())) {
        known.push(v);
        addChip(v);
      }
      selected.add(v);
      row.querySelectorAll(".arfid-choice").forEach((c) => {
        if (c.textContent === v) c.addClass("is-selected");
      });
      onChange == null ? void 0 : onChange();
    };
    addBtn.addEventListener("click", commit);
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        commit();
      }
    });
  }
  async save() {
    const food = this.foodName.trim();
    if (!food) {
      new import_obsidian3.Notice("Add a food name first.");
      return;
    }
    const now = /* @__PURE__ */ new Date();
    const date = isoDate(now);
    const time = isoTime(now);
    const strategies = [...this.strategies];
    const note = buildEntryNote({
      date,
      time,
      food,
      status: this.status,
      outcome: this.outcome,
      textureNotes: this.textureNotes.trim(),
      context: [...this.contexts],
      strategies,
      strategyWorked: strategies.length > 0 ? this.strategyWorked : "n/a",
      tags: this.tagsText.split(",").map((t) => t.trim()).filter((t) => t.length > 0)
    });
    const file = await this.createEntryFile(date, time, food, note);
    await this.plugin.saveSettings();
    if (this.plugin.settings.dailyNoteLinking) {
      const label = `${food} \u2014 ${STATUS_LABELS[this.status].toLowerCase()}${this.outcome ? ", " + this.outcome : ""}`;
      try {
        await linkIntoDailyNote(this.app, this.plugin.settings, date, time, file.basename, label);
      } catch (e) {
        console.error("ARFID Tracker: daily note linking failed", e);
      }
    }
    new import_obsidian3.Notice(`Logged ${food}`);
    this.close();
    this.plugin.notifyDataChanged();
  }
  async createEntryFile(date, time, food, content) {
    const folder = this.plugin.settings.entriesFolder.trim().replace(/\/+$/, "");
    if (folder && !(this.app.vault.getAbstractFileByPath((0, import_obsidian3.normalizePath)(folder)) instanceof import_obsidian3.TFolder)) {
      await this.app.vault.createFolder((0, import_obsidian3.normalizePath)(folder)).catch(() => {
      });
    }
    const base = sanitizeForFilename(
      this.plugin.settings.filenameTemplate.replace(/{{\s*date\s*}}/gi, date).replace(/{{\s*time\s*}}/gi, time.replace(":", ".")).replace(/{{\s*food\s*}}/gi, food)
    ) || `${date} ${time.replace(":", ".")} ${sanitizeForFilename(food)}`;
    let path = (0, import_obsidian3.normalizePath)((folder ? folder + "/" : "") + base + ".md");
    let n = 1;
    while (this.app.vault.getAbstractFileByPath(path)) {
      path = (0, import_obsidian3.normalizePath)((folder ? folder + "/" : "") + `${base} ${++n}.md`);
    }
    return this.app.vault.create(path, content);
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/dashboard.ts
var import_obsidian5 = require("obsidian");

// src/charts.ts
var SVG_NS = "http://www.w3.org/2000/svg";
function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}
function renderLineChart(parent, points, unit) {
  const unitLabel = unit.plural;
  const wrap = parent.createDiv({ cls: "arfid-chart-wrap" });
  if (points.length === 0) {
    wrap.createDiv({ cls: "arfid-empty", text: "No entries yet." });
    return;
  }
  const W = 640;
  const H = 200;
  const PAD = { top: 12, right: 12, bottom: 26, left: 30 };
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const max = Math.max(1, ...points.map((p) => p.value));
  const top = max <= 5 ? 5 : Math.ceil(max / 5) * 5;
  const x = (i) => PAD.left + (points.length === 1 ? iw / 2 : i / (points.length - 1) * iw);
  const y = (v) => PAD.top + ih - v / top * ih;
  const svg = svgEl("svg", {
    viewBox: `0 0 ${W} ${H}`,
    class: "arfid-linechart",
    role: "img"
  });
  svg.setAttr("aria-label", `${unitLabel} over time`);
  for (const v of [0, top / 2, top]) {
    const gy = y(v);
    svg.appendChild(
      svgEl("line", { x1: String(PAD.left), x2: String(W - PAD.right), y1: String(gy), y2: String(gy), class: "arfid-grid" })
    );
    const t = svgEl("text", { x: String(PAD.left - 6), y: String(gy + 3), class: "arfid-axis-label", "text-anchor": "end" });
    t.textContent = String(v % 1 === 0 ? v : v.toFixed(1));
    svg.appendChild(t);
  }
  const labelIdx = points.length <= 3 ? points.map((_, i) => i) : [0, Math.floor((points.length - 1) / 2), points.length - 1];
  for (const i of labelIdx) {
    const t = svgEl("text", {
      x: String(x(i)),
      y: String(H - 8),
      class: "arfid-axis-label",
      "text-anchor": i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"
    });
    t.textContent = points[i].label;
    svg.appendChild(t);
  }
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  svg.appendChild(svgEl("path", { d: path, class: "arfid-line" }));
  const dot = svgEl("circle", { r: "4.5", class: "arfid-dot", style: "display:none" });
  svg.appendChild(dot);
  wrap.appendChild(svg);
  const tooltip = wrap.createDiv({ cls: "arfid-tooltip" });
  tooltip.style.display = "none";
  const show = (clientX) => {
    const rect = svg.getBoundingClientRect();
    const relX = (clientX - rect.left) / rect.width * W;
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(x(i) - relX);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    const p = points[best];
    dot.setAttribute("cx", String(x(best)));
    dot.setAttribute("cy", String(y(p.value)));
    dot.style.display = "";
    tooltip.setText(`${p.label} \u2014 ${p.value} ${p.value === 1 ? unit.singular : unit.plural}`);
    tooltip.style.display = "";
    const px = x(best) / W * rect.width;
    tooltip.style.left = `${Math.min(Math.max(px, 50), rect.width - 50)}px`;
  };
  svg.addEventListener("pointermove", (ev) => show(ev.clientX));
  svg.addEventListener("pointerdown", (ev) => show(ev.clientX));
  svg.addEventListener("pointerleave", () => {
    dot.style.display = "none";
    tooltip.style.display = "none";
  });
}
function renderBars(parent, rows, emptyText) {
  const wrap = parent.createDiv({ cls: "arfid-bars" });
  if (rows.length === 0) {
    wrap.createDiv({ cls: "arfid-empty", text: emptyText });
    return;
  }
  const max = Math.max(1, ...rows.map((r) => r.value));
  for (const r of rows) {
    const row = wrap.createDiv({ cls: "arfid-bar-row" });
    const labelRow = row.createDiv({ cls: "arfid-bar-labels" });
    labelRow.createSpan({ cls: "arfid-bar-name", text: r.label });
    labelRow.createSpan({
      cls: "arfid-bar-value",
      text: r.detail ? `${r.value} \xB7 ${r.detail}` : String(r.value)
    });
    const track = row.createDiv({ cls: "arfid-bar-track" });
    const bar = track.createDiv({ cls: "arfid-bar-fill" });
    bar.style.width = `${Math.max(2, r.value / max * 100)}%`;
    if (r.fraction !== void 0) {
      const inner = bar.createDiv({ cls: "arfid-bar-fraction" });
      inner.style.width = `${Math.round(r.fraction * 100)}%`;
    }
  }
}

// src/export.ts
var import_obsidian4 = require("obsidian");
function csvCell(value) {
  if (/[",\n]/.test(value)) return '"' + value.replace(/"/g, '""') + '"';
  return value;
}
function buildCsv(entries) {
  const header = [
    "date",
    "time",
    "food",
    "status",
    "outcome",
    "texture_notes",
    "context",
    "strategy_used",
    "strategy_worked",
    "tags",
    "file"
  ];
  const rows = entries.map(
    (e) => [
      e.date,
      e.time,
      e.food,
      e.status,
      e.outcome,
      e.textureNotes.replace(/\r?\n/g, " "),
      e.context.join(", "),
      e.strategies.join(", "),
      String(e.strategyWorked),
      e.tags.join(", "),
      e.file.path
    ].map(csvCell).join(",")
  );
  return [header.join(","), ...rows].join("\n") + "\n";
}
function buildMarkdownSummary(store) {
  var _a;
  const entries = store.getEntries();
  const foods = store.getFoods(entries);
  const shifts = store.getStatusShifts(foods);
  const strategies = store.getStrategyStats(entries);
  const today = isoDate(/* @__PURE__ */ new Date());
  const lines = [];
  lines.push(`# Food log summary`);
  lines.push("");
  lines.push(`Generated ${today}.`);
  if (entries.length > 0) {
    lines.push(`Covers ${entries.length} entries from ${entries[0].date} to ${entries[entries.length - 1].date}, across ${foods.length} foods.`);
  } else {
    lines.push("No entries logged yet.");
  }
  lines.push("");
  lines.push(`## Foods by current status`);
  lines.push("");
  lines.push(`| Status | Foods |`);
  lines.push(`| --- | ---: |`);
  for (const s of FOOD_STATUSES) {
    lines.push(`| ${STATUS_LABELS[s]} | ${foods.filter((f) => f.currentStatus === s).length} |`);
  }
  lines.push("");
  for (const s of FOOD_STATUSES) {
    const group = foods.filter((f) => f.currentStatus === s);
    if (group.length === 0) continue;
    lines.push(`### ${STATUS_LABELS[s]}`);
    lines.push("");
    lines.push(`| Food | Times logged | First logged | Last logged |`);
    lines.push(`| --- | ---: | --- | --- |`);
    for (const f of group) {
      lines.push(`| ${f.name} | ${f.entries.length} | ${f.firstLogged} | ${f.lastLogged} |`);
    }
    lines.push("");
  }
  lines.push(`## Status changes`);
  lines.push("");
  if (shifts.length === 0) {
    lines.push("No status changes recorded yet.");
  } else {
    lines.push(`| Date | Food | Change |`);
    lines.push(`| --- | --- | --- |`);
    for (const sh of [...shifts].reverse()) {
      lines.push(`| ${sh.date} | ${sh.food} | ${STATUS_LABELS[sh.from]} \u2192 ${STATUS_LABELS[sh.to]} |`);
    }
  }
  lines.push("");
  lines.push(`## Strategies`);
  lines.push("");
  if (strategies.length === 0) {
    lines.push("No strategies recorded yet.");
  } else {
    lines.push(`| Strategy | Uses | Helped | Didn't help | Helped rate |`);
    lines.push(`| --- | ---: | ---: | ---: | ---: |`);
    for (const s of strategies) {
      const rated = s.worked + s.failed;
      const rate = rated > 0 ? `${Math.round(s.worked / rated * 100)}%` : "\u2014";
      lines.push(`| ${s.name} | ${s.uses} | ${s.worked} | ${s.failed} | ${rate} |`);
    }
  }
  lines.push("");
  lines.push(`## Entries per month`);
  lines.push("");
  const byMonth = /* @__PURE__ */ new Map();
  for (const e of entries) {
    const key = e.date.slice(0, 7);
    byMonth.set(key, ((_a = byMonth.get(key)) != null ? _a : 0) + 1);
  }
  if (byMonth.size === 0) {
    lines.push("No entries yet.");
  } else {
    lines.push(`| Month | Entries |`);
    lines.push(`| --- | ---: |`);
    for (const [month, count] of [...byMonth.entries()].sort()) {
      lines.push(`| ${month} | ${count} |`);
    }
  }
  lines.push("");
  lines.push(`## Appendix: all entries`);
  lines.push("");
  if (entries.length === 0) {
    lines.push("No entries yet.");
  } else {
    lines.push(`| Date | Time | Food | Status | Outcome | Strategies | Context |`);
    lines.push(`| --- | --- | --- | --- | --- | --- | --- |`);
    for (const e of entries) {
      lines.push(
        `| ${e.date} | ${e.time} | ${e.food} | ${STATUS_LABELS[e.status]} | ${e.outcome || "\u2014"} | ${e.strategies.join(", ") || "\u2014"} | ${e.context.join(", ") || "\u2014"} |`
      );
    }
  }
  lines.push("");
  return lines.join("\n");
}
async function writeExport(app, settings, filename, content) {
  const folder = settings.exportsFolder.trim().replace(/\/+$/, "");
  if (folder && !(app.vault.getAbstractFileByPath((0, import_obsidian4.normalizePath)(folder)) instanceof import_obsidian4.TFolder)) {
    await app.vault.createFolder((0, import_obsidian4.normalizePath)(folder)).catch(() => {
    });
  }
  const path = (0, import_obsidian4.normalizePath)((folder ? folder + "/" : "") + filename);
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing instanceof import_obsidian4.TFile) {
    await app.vault.modify(existing, content);
    return existing;
  }
  return app.vault.create(path, content);
}
async function exportCsv(app, settings, store) {
  const entries = store.getEntries();
  const file = await writeExport(app, settings, `arfid-entries-${isoDate(/* @__PURE__ */ new Date())}.csv`, buildCsv(entries));
  new import_obsidian4.Notice(`Exported ${entries.length} entries to ${file.path}`);
}
async function exportSummary(app, settings, store) {
  const file = await writeExport(app, settings, `arfid-summary-${isoDate(/* @__PURE__ */ new Date())}.md`, buildMarkdownSummary(store));
  new import_obsidian4.Notice(`Summary written to ${file.path}`);
  await app.workspace.getLeaf(true).openFile(file);
}

// src/dashboard.ts
var VIEW_TYPE_ARFID = "arfid-dashboard";
var ArfidDashboardView = class extends import_obsidian5.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.tab = "overview";
    this.trendMode = "week";
    this.foodSearch = "";
    this.expandedFood = null;
    this.plugin = plugin;
  }
  getViewType() {
    return VIEW_TYPE_ARFID;
  }
  getDisplayText() {
    return "ARFID Tracker";
  }
  getIcon() {
    return "apple";
  }
  async onOpen() {
    this.render();
  }
  render() {
    const root = this.contentEl;
    root.empty();
    root.addClass("arfid-plugin", "arfid-dashboard");
    const header = root.createDiv({ cls: "arfid-header" });
    const nav = header.createDiv({ cls: "arfid-tabs" });
    const tabs = [
      ["overview", "Overview"],
      ["foods", "Foods"],
      ["strategies", "Strategies"]
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
  renderOverview(body, entries, foods) {
    const shifts = this.plugin.store.getStatusShifts(foods);
    const cutoff30 = isoDate(new Date(Date.now() - 30 * 864e5));
    const expansionShift = (s) => s.from === "fear" && (s.to === "trying" || s.to === "safe" || s.to === "recently-expanded") || s.from === "trying" && (s.to === "safe" || s.to === "recently-expanded") || s.to === "recently-expanded";
    const recentExpansions = shifts.filter((s) => s.date >= cutoff30 && expansionShift(s)).length;
    const cards = body.createDiv({ cls: "arfid-cards" });
    const card = (label, value, statusClass) => {
      const c = cards.createDiv({ cls: "arfid-card" });
      const v = c.createDiv({ cls: "arfid-card-value", text: String(value) });
      if (statusClass) v.addClass(statusClass);
      c.createDiv({ cls: "arfid-card-label", text: label });
    };
    card("Safe foods", foods.filter((f) => f.currentStatus === "safe").length, "arfid-text-safe");
    card("Trying", foods.filter((f) => f.currentStatus === "trying").length, "arfid-text-trying");
    card("Fear foods", foods.filter((f) => f.currentStatus === "fear").length, "arfid-text-fear");
    card("Expansions \xB7 30d", recentExpansions, "arfid-text-expanded");
    const trendSection = body.createDiv({ cls: "arfid-section" });
    const trendHead = trendSection.createDiv({ cls: "arfid-section-head" });
    trendHead.createEl("h3", { text: "Meals logged" });
    const toggle = trendHead.createDiv({ cls: "arfid-toggle" });
    for (const mode of ["day", "week"]) {
      const b = toggle.createEl("button", {
        cls: "arfid-toggle-btn",
        text: mode === "day" ? "30 days" : "12 weeks"
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
    const shiftSection = body.createDiv({ cls: "arfid-section" });
    shiftSection.createEl("h3", { text: "Status changes" });
    if (shifts.length === 0) {
      shiftSection.createDiv({ cls: "arfid-empty", text: "No status changes yet \u2014 they'll show up here as foods move between fear, trying, and safe." });
    } else {
      const list = shiftSection.createDiv({ cls: "arfid-shift-list" });
      for (const sh of [...shifts].reverse().slice(0, 15)) {
        const row2 = list.createDiv({ cls: "arfid-shift-row" });
        row2.createSpan({ cls: "arfid-shift-date", text: sh.date });
        row2.createSpan({ cls: "arfid-shift-food", text: sh.food });
        const change = row2.createSpan({ cls: "arfid-shift-change" });
        change.createSpan({ cls: `arfid-status-dot arfid-status-${sh.from}` });
        change.createSpan({ text: `${STATUS_LABELS[sh.from]} \u2192 ` });
        change.createSpan({ cls: `arfid-status-dot arfid-status-${sh.to}` });
        change.createSpan({ text: STATUS_LABELS[sh.to] });
      }
    }
    const recentSection = body.createDiv({ cls: "arfid-section" });
    recentSection.createEl("h3", { text: "Recently logged" });
    const recent = [...entries].reverse().slice(0, 10);
    if (recent.length === 0) {
      recentSection.createDiv({ cls: "arfid-empty", text: "Nothing logged yet. Tap \u201C+ Log food\u201D to add your first entry." });
    } else {
      const list = recentSection.createDiv({ cls: "arfid-entry-list" });
      for (const e of recent) this.renderEntryRow(list, e, true);
    }
    const exportSection = body.createDiv({ cls: "arfid-section arfid-export" });
    exportSection.createEl("h3", { text: "Export" });
    const row = exportSection.createDiv({ cls: "arfid-chip-row" });
    const csvBtn = row.createEl("button", { cls: "arfid-chip", text: "Export CSV" });
    csvBtn.addEventListener("click", () => void exportCsv(this.app, this.plugin.settings, this.plugin.store));
    const mdBtn = row.createEl("button", { cls: "arfid-chip", text: "Export summary" });
    mdBtn.addEventListener("click", () => void exportSummary(this.app, this.plugin.settings, this.plugin.store));
  }
  // ---------------------------------------------------------------- foods
  renderFoods(body, foods) {
    const search = body.createEl("input", {
      cls: "arfid-input arfid-search",
      attr: { type: "search", placeholder: "Search foods\u2026" }
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
          main.createSpan({
            cls: "arfid-food-meta",
            text: `${f.entries.length}\xD7 \xB7 last ${f.lastLogged}`
          });
          main.addEventListener("click", () => {
            this.expandedFood = this.expandedFood === f.key ? null : f.key;
            renderGroups();
          });
          if (this.expandedFood === f.key) {
            const history = row.createDiv({ cls: "arfid-food-history" });
            for (const e of [...f.entries].reverse()) this.renderEntryRow(history, e, false);
          }
        }
      }
    };
    renderGroups();
  }
  // ----------------------------------------------------------- strategies
  renderStrategies(body, entries) {
    const stats = this.plugin.store.getStrategyStats(entries);
    const section = body.createDiv({ cls: "arfid-section" });
    section.createEl("h3", { text: "Strategies and how often they helped" });
    section.createDiv({
      cls: "arfid-hint",
      text: "Bar length is how often a strategy was used; the darker portion is the share of rated uses where it helped."
    });
    renderBars(
      section,
      stats.map((s) => {
        const rated = s.worked + s.failed;
        return {
          label: s.name,
          value: s.uses,
          detail: rated > 0 ? `helped ${Math.round(s.worked / rated * 100)}% of ${rated} rated` : "not rated yet",
          fraction: rated > 0 ? s.worked / rated : void 0
        };
      }),
      "No strategies logged yet \u2014 add them from the quick-log form under \u201CAdd details\u201D."
    );
  }
  // ------------------------------------------------------------- shared
  renderEntryRow(parent, e, showFood) {
    const row = parent.createDiv({ cls: "arfid-entry-row" });
    row.createSpan({ cls: "arfid-entry-when", text: `${e.date} ${e.time}`.trim() });
    const main = row.createSpan({ cls: "arfid-entry-main" });
    main.createSpan({ cls: `arfid-status-dot arfid-status-${e.status}` });
    main.createSpan({ text: showFood ? e.food : STATUS_LABELS[e.status] });
    if (e.outcome) row.createSpan({ cls: "arfid-entry-outcome", text: e.outcome });
    row.addEventListener("click", () => void this.app.workspace.getLeaf(false).openFile(e.file));
  }
  async onClose() {
    this.contentEl.empty();
  }
};
function trendPerDay(entries, days) {
  var _a, _b;
  const counts = /* @__PURE__ */ new Map();
  for (const e of entries) counts.set(e.date, ((_a = counts.get(e.date)) != null ? _a : 0) + 1);
  const points = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5);
    const key = isoDate(d);
    points.push({ label: key.slice(5), value: (_b = counts.get(key)) != null ? _b : 0 });
  }
  return points;
}
function trendPerWeek(entries, weeks) {
  const points = [];
  const now = /* @__PURE__ */ new Date();
  const day = (now.getDay() + 6) % 7;
  const thisWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(thisWeekStart.getTime() - i * 7 * 864e5);
    const end = new Date(start.getTime() + 7 * 864e5);
    const startKey = isoDate(start);
    const endKey = isoDate(end);
    const count = entries.filter((e) => e.date >= startKey && e.date < endKey).length;
    points.push({ label: startKey.slice(5), value: count });
  }
  return points;
}

// src/main.ts
var ArfidTrackerPlugin = class extends import_obsidian6.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
    this.refreshTimer = null;
  }
  async onload() {
    await this.loadSettings();
    this.store = new EntryStore(this.app);
    this.registerView(VIEW_TYPE_ARFID, (leaf) => new ArfidDashboardView(leaf, this));
    this.addRibbonIcon("utensils", "Log a food", () => this.openQuickLog());
    this.addRibbonIcon("apple", "Open ARFID dashboard", () => void this.openDashboard());
    this.addCommand({
      id: "quick-log",
      name: "Log a food",
      callback: () => this.openQuickLog()
    });
    this.addCommand({
      id: "open-dashboard",
      name: "Open dashboard",
      callback: () => void this.openDashboard()
    });
    this.addCommand({
      id: "export-csv",
      name: "Export entries to CSV",
      callback: () => void exportCsv(this.app, this.settings, this.store)
    });
    this.addCommand({
      id: "export-summary",
      name: "Export markdown summary",
      callback: () => void exportSummary(this.app, this.settings, this.store)
    });
    this.addSettingTab(new ArfidSettingTab(this.app, this));
    this.registerEvent(this.app.metadataCache.on("changed", (file) => this.maybeRefresh(file.path)));
    this.registerEvent(this.app.vault.on("delete", () => this.scheduleRefresh()));
    this.registerEvent(this.app.vault.on("rename", () => this.scheduleRefresh()));
  }
  openQuickLog() {
    new QuickLogModal(this.app, this).open();
  }
  async openDashboard() {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_ARFID);
    let leaf;
    if (existing.length > 0) {
      leaf = existing[0];
    } else {
      leaf = this.app.workspace.getLeaf(true);
      await leaf.setViewState({ type: VIEW_TYPE_ARFID, active: true });
    }
    this.app.workspace.revealLeaf(leaf);
  }
  notifyDataChanged() {
    this.scheduleRefresh();
  }
  maybeRefresh(path) {
    var _a;
    const fm = (_a = this.app.metadataCache.getCache(path)) == null ? void 0 : _a.frontmatter;
    if ((fm == null ? void 0 : fm.type) === "food-entry") this.scheduleRefresh();
  }
  scheduleRefresh() {
    if (this.refreshTimer !== null) window.clearTimeout(this.refreshTimer);
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = null;
      for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_ARFID)) {
        const view = leaf.view;
        if (view instanceof ArfidDashboardView) view.render();
      }
    }, 400);
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
