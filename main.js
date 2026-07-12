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
var import_obsidian12 = require("obsidian");

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
var MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack", "drink"];
var MEAL_LABELS = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
  drink: "Drink"
};
var EXPOSURE_STEPS = ["looked", "smelled", "touched", "tasted", "bite", "portion"];
var EXPOSURE_STEP_LABELS = {
  looked: "Looked at it",
  smelled: "Smelled it",
  touched: "Touched it",
  tasted: "Tasted it",
  bite: "Took a bite",
  portion: "Ate a portion"
};
var NOTE_KINDS = ["ritual", "order", "recipe"];
var NOTE_KIND_LABELS = {
  ritual: "Ritual",
  order: "Order that works",
  recipe: "Recipe"
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
    "weakness"
  ],
  kindnessReminders: [
    "Eating anything is better than eating nothing.",
    "A hard eating day doesn't undo your progress.",
    "You're allowed to eat the same safe food again. That's what it's for.",
    "Safe foods are tools, not failures.",
    "Be as kind to yourself as you'd be to a friend struggling with this.",
    "Your body deserves fuel even on days it feels hard to give it."
  ],
  environmentChecklist: [
    "Soften the lighting",
    "Reduce noise \u2014 quiet room or headphones",
    "Sit somewhere comfortable",
    "Put on a familiar show or video",
    "Have water or a safe drink within reach",
    "Remove time pressure \u2014 nothing else needs to happen right now"
  ],
  exposureChecklist: [
    "Pick one small step \u2014 looking, smelling, or touching counts",
    "Keep a safe food on the plate too",
    "You can stop at any time \u2014 stopping is not failure",
    "Tasting and spitting out still counts as progress",
    "Rate how it went after, not during",
    "Note your next step while it's fresh"
  ],
  dailyNoteLinking: true,
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
function guessMealType(d) {
  const h = d.getHours();
  if (h >= 5 && h < 11) return "breakfast";
  if (h >= 11 && h < 15) return "lunch";
  if (h >= 17 && h < 22) return "dinner";
  return "snack";
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
    new import_obsidian.Setting(containerEl).setName("Known symptoms").setDesc("One per line. New symptoms typed during logging are added here automatically.").addTextArea((t) => {
      t.setValue(this.plugin.settings.knownSymptoms.join("\n")).onChange(async (v) => {
        this.plugin.settings.knownSymptoms = v.split("\n").map((s) => s.trim()).filter((s) => s.length > 0);
        await this.plugin.saveSettings();
      });
      t.inputEl.rows = 6;
    });
    new import_obsidian.Setting(containerEl).setName("Support & reminders").setHeading();
    new import_obsidian.Setting(containerEl).setName("Kindness reminders").setDesc("One per line. A random one is shown on the \u201CI'm struggling\u201D screen.").addTextArea((t) => {
      t.setValue(this.plugin.settings.kindnessReminders.join("\n")).onChange(async (v) => {
        this.plugin.settings.kindnessReminders = v.split("\n").map((s) => s.trim()).filter((s) => s.length > 0);
        await this.plugin.saveSettings();
      });
      t.inputEl.rows = 6;
    });
    new import_obsidian.Setting(containerEl).setName("Environment checklist").setDesc("One per line. Shown on the \u201CI'm struggling\u201D screen \u2014 things that make eating easier.").addTextArea((t) => {
      t.setValue(this.plugin.settings.environmentChecklist.join("\n")).onChange(async (v) => {
        this.plugin.settings.environmentChecklist = v.split("\n").map((s) => s.trim()).filter((s) => s.length > 0);
        await this.plugin.saveSettings();
      });
      t.inputEl.rows = 6;
    });
    new import_obsidian.Setting(containerEl).setName("Exposure checklist").setDesc("One per line. Shown at the top of the exposure logging screen \u2014 the critical things to remember during an exposure.").addTextArea((t) => {
      t.setValue(this.plugin.settings.exposureChecklist.join("\n")).onChange(async (v) => {
        this.plugin.settings.exposureChecklist = v.split("\n").map((s) => s.trim()).filter((s) => s.length > 0);
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
    var _a, _b, _c;
    const food = String((_a = fm.food) != null ? _a : "").trim();
    if (!food) return null;
    return {
      file,
      date: normalizeDate(fm.date),
      time: normalizeTime(fm.time),
      food,
      meal: normalizeMeal(fm.meal),
      status: normalizeStatus(fm.status),
      outcome: normalizeOutcome(fm.outcome),
      exposure: fm.exposure === true || fm.exposure === "true",
      exposureStep: normalizeExposureStep(fm.exposure_step),
      statusReason: String((_b = fm.status_reason) != null ? _b : "").trim(),
      textureNotes: String((_c = fm.texture_notes) != null ? _c : ""),
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
          shifts.push({ food: food.name, from: prev, to: e.status, date: e.date, reason: e.statusReason });
        }
        prev = e.status;
      }
    }
    shifts.sort((a, b) => a.date.localeCompare(b.date));
    return shifts;
  }
  /** Standalone symptom logs (`type: symptom-entry`), chronological. */
  getSymptomEntries() {
    var _a;
    const out = [];
    for (const file of this.app.vault.getMarkdownFiles()) {
      const fm = (_a = this.app.metadataCache.getFileCache(file)) == null ? void 0 : _a.frontmatter;
      if (!fm || fm.type !== "symptom-entry") continue;
      out.push({
        file,
        date: normalizeDate(fm.date),
        time: normalizeTime(fm.time),
        symptoms: splitList(fm.symptoms)
      });
    }
    out.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    return out;
  }
  getSymptomStats(entries) {
    const byName = /* @__PURE__ */ new Map();
    for (const e of entries != null ? entries : this.getSymptomEntries()) {
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
  /** Per-food companion notes (`type: food-note`): rituals, orders, recipes. */
  getFoodNotes() {
    var _a, _b, _c;
    const out = [];
    for (const file of this.app.vault.getMarkdownFiles()) {
      const fm = (_a = this.app.metadataCache.getFileCache(file)) == null ? void 0 : _a.frontmatter;
      if (!fm || fm.type !== "food-note") continue;
      const food = String((_b = fm.food) != null ? _b : "").trim();
      if (!food) continue;
      const kind = String((_c = fm.note_kind) != null ? _c : "").trim().toLowerCase();
      out.push({
        file,
        food,
        key: normalizeFoodKey(food),
        kind: NOTE_KINDS.includes(kind) ? kind : "ritual",
        date: normalizeDate(fm.date)
      });
    }
    out.sort((a, b) => a.key.localeCompare(b.key) || a.date.localeCompare(b.date));
    return out;
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
function normalizeMeal(value) {
  const s = String(value != null ? value : "").trim().toLowerCase();
  return MEAL_TYPES.includes(s) ? s : "";
}
function normalizeExposureStep(value) {
  const s = String(value != null ? value : "").trim().toLowerCase();
  return EXPOSURE_STEPS.includes(s) ? s : "";
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
  var _a;
  const worked = f.strategyWorked === true ? "true" : f.strategyWorked === false ? "false" : '"n/a"';
  const lines = [
    "---",
    "type: food-entry",
    `date: ${f.date}`,
    `time: "${f.time}"`,
    `food: ${yamlString(f.food)}`,
    `meal: ${f.meal ? f.meal : '""'}`,
    `status: ${f.status}`,
    `outcome: ${f.outcome ? f.outcome : '""'}`,
    `exposure: ${f.exposure ? "true" : "false"}`,
    `exposure_step: ${f.exposureStep ? f.exposureStep : '""'}`,
    `status_reason: ${yamlString(f.statusReason)}`,
    `texture_notes: ${yamlString(f.textureNotes)}`,
    `context: ${yamlString(f.context.join(", "))}`,
    `strategy_used: ${yamlString(f.strategies.join(", "))}`,
    `strategy_worked: ${worked}`,
    `tags: ${yamlList(f.tags)}`,
    "---",
    ""
  ];
  const body = ((_a = f.body) != null ? _a : "").trim();
  return lines.join("\n") + (body ? "\n" + body + "\n" : "");
}
function buildSymptomNote(date, time, symptoms, body) {
  const lines = [
    "---",
    "type: symptom-entry",
    `date: ${date}`,
    `time: "${time}"`,
    `symptoms: ${yamlString(symptoms.join(", "))}`,
    "---",
    ""
  ];
  const b = body.trim();
  return lines.join("\n") + (b ? "\n" + b + "\n" : "");
}
function buildFoodNote(date, food, kind, body) {
  const lines = [
    "---",
    "type: food-note",
    `date: ${date}`,
    `food: ${yamlString(food)}`,
    `note_kind: ${kind}`,
    "---",
    ""
  ];
  const b = body.trim();
  return lines.join("\n") + (b ? "\n" + b + "\n" : "");
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

// src/chips.ts
function buildChoiceRow(parent, options, initial, onChoose, allowDeselect = false) {
  const row = parent.createDiv({ cls: "arfid-chip-row" });
  let current = initial;
  const update = () => {
    row.querySelectorAll(".arfid-choice").forEach((c) => {
      c.toggleClass("is-selected", c.getAttribute("data-value") === current);
    });
  };
  for (const opt of options) {
    const chip = row.createEl("button", {
      cls: "arfid-chip arfid-choice",
      attr: { "data-value": opt.value }
    });
    if (opt.dotClass) chip.createSpan({ cls: `arfid-status-dot ${opt.dotClass}` });
    chip.createSpan({ text: opt.label });
    chip.addEventListener("click", () => {
      current = allowDeselect && current === opt.value ? "" : opt.value;
      update();
      onChoose(current);
    });
  }
  update();
  return {
    set: (value) => {
      current = value;
      update();
    }
  };
}
function buildChipPicker(parent, label, known, selected, onChange) {
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
function buildChecklist(parent, label, items) {
  if (items.length === 0) return;
  const box = parent.createDiv({ cls: "arfid-checklist" });
  box.createDiv({ cls: "arfid-field-label", text: label });
  for (const item of items) {
    const row = box.createEl("label", { cls: "arfid-checklist-row" });
    row.createEl("input", { attr: { type: "checkbox" } });
    row.createSpan({ text: item });
  }
}
function pickRandom(items, count) {
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

// src/quicklog.ts
var QuickLogModal = class extends import_obsidian3.Modal {
  constructor(app, plugin, prefill = {}) {
    super(app);
    this.foods = [];
    this.foodName = "";
    this.meal = "";
    this.status = "trying";
    this.statusTouched = false;
    this.outcome = "full";
    this.statusReason = "";
    this.textureNotes = "";
    this.contexts = /* @__PURE__ */ new Set();
    this.strategies = /* @__PURE__ */ new Set();
    this.strategyWorked = "n/a";
    this.tagsText = "";
    this.statusSetter = null;
    this.plugin = plugin;
    this.prefill = prefill;
  }
  onOpen() {
    var _a, _b;
    this.foods = this.plugin.store.getFoods();
    this.foodName = (_a = this.prefill.food) != null ? _a : "";
    this.meal = (_b = this.prefill.meal) != null ? _b : guessMealType(/* @__PURE__ */ new Date());
    if (this.prefill.status) {
      this.status = this.prefill.status;
      this.statusTouched = true;
    }
    const { contentEl } = this;
    contentEl.addClass("arfid-plugin", "arfid-quicklog");
    this.titleEl.setText("Log a food");
    const foodInput = contentEl.createEl("input", {
      cls: "arfid-input",
      attr: { type: "text", placeholder: "Food (e.g. scrambled eggs)", enterkeyhint: "done" }
    });
    foodInput.value = this.foodName;
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
          this.updateReasonVisibility();
        });
      }
    };
    foodInput.addEventListener("input", () => {
      this.foodName = foodInput.value;
      const known = this.foods.find((f) => f.key === normalizeFoodKey(foodInput.value));
      if (known && !this.statusTouched) this.setStatus(known.currentStatus, false);
      renderSuggestions();
      this.updateReasonVisibility();
    });
    renderSuggestions();
    contentEl.createDiv({ cls: "arfid-field-label", text: "Meal" });
    buildChoiceRow(
      contentEl,
      MEAL_TYPES.map((m) => ({ value: m, label: MEAL_LABELS[m] })),
      this.meal === "" ? "" : this.meal,
      (v) => this.meal = v,
      true
    );
    contentEl.createDiv({ cls: "arfid-field-label", text: "Status" });
    this.statusSetter = buildChoiceRow(
      contentEl,
      FOOD_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s], dotClass: `arfid-status-${s}` })),
      this.status,
      (v) => {
        if (v !== "") this.setStatus(v, true);
      }
    );
    this.reasonSection = contentEl.createDiv();
    this.reasonSection.createDiv({ cls: "arfid-field-label", text: "What changed? (why is this food moving?)" });
    const reason = this.reasonSection.createEl("textarea", {
      cls: "arfid-textarea",
      attr: { rows: "2", placeholder: "The specific thought or moment behind the change \u2014 future you will want this." }
    });
    reason.addEventListener("input", () => this.statusReason = reason.value);
    this.updateReasonVisibility();
    contentEl.createDiv({ cls: "arfid-field-label", text: "Outcome" });
    buildChoiceRow(
      contentEl,
      OUTCOMES.map((o) => ({ value: o, label: OUTCOME_LABELS[o] })),
      this.outcome,
      (v) => this.outcome = v,
      true
    );
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
    buildChipPicker(
      details,
      "Strategies used",
      this.plugin.settings.knownStrategies,
      this.strategies,
      () => this.updateWorkedVisibility()
    );
    this.workedSection = details.createDiv();
    this.workedSection.createDiv({ cls: "arfid-field-label", text: "Did the strategy help?" });
    buildChoiceRow(
      this.workedSection,
      [
        { value: "true", label: "Helped" },
        { value: "false", label: "Didn't help" },
        { value: "n/a", label: "Not sure" }
      ],
      "n/a",
      (v) => this.strategyWorked = v === "true" ? true : v === "false" ? false : "n/a"
    );
    this.updateWorkedVisibility();
    buildChipPicker(details, "Context", this.plugin.settings.knownContexts, this.contexts);
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
    if (!this.foodName) window.setTimeout(() => foodInput.focus(), 50);
  }
  setStatus(s, touched) {
    var _a;
    this.status = s;
    if (touched) this.statusTouched = true;
    (_a = this.statusSetter) == null ? void 0 : _a.set(s);
    this.updateReasonVisibility();
  }
  /** Ask "what changed?" only when this entry moves a known food to a new status. */
  updateReasonVisibility() {
    if (!this.reasonSection) return;
    const known = this.foods.find((f) => f.key === normalizeFoodKey(this.foodName));
    if (known && known.currentStatus !== this.status) this.reasonSection.show();
    else this.reasonSection.hide();
  }
  updateWorkedVisibility() {
    if (this.strategies.size > 0) this.workedSection.show();
    else this.workedSection.hide();
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
    const known = this.foods.find((f) => f.key === normalizeFoodKey(food));
    const isShift = !!known && known.currentStatus !== this.status;
    const note = buildEntryNote({
      date,
      time,
      food,
      meal: this.meal,
      status: this.status,
      outcome: this.outcome,
      exposure: false,
      exposureStep: "",
      statusReason: isShift ? this.statusReason.trim() : "",
      textureNotes: this.textureNotes.trim(),
      context: [...this.contexts],
      strategies,
      strategyWorked: strategies.length > 0 ? this.strategyWorked : "n/a",
      tags: this.tagsText.split(",").map((t) => t.trim()).filter((t) => t.length > 0)
    });
    const file = await createEntryFile(this.app, this.plugin, date, time, food, note);
    await this.plugin.saveSettings();
    if (this.plugin.settings.dailyNoteLinking) {
      const mealPrefix = this.meal ? `${this.meal}: ` : "";
      const label = `${mealPrefix}${food} \u2014 ${STATUS_LABELS[this.status].toLowerCase()}${this.outcome ? ", " + this.outcome : ""}`;
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
  onClose() {
    this.contentEl.empty();
  }
};
async function createEntryFile(app, plugin, date, time, food, content) {
  const folder = plugin.settings.entriesFolder.trim().replace(/\/+$/, "");
  if (folder && !(app.vault.getAbstractFileByPath((0, import_obsidian3.normalizePath)(folder)) instanceof import_obsidian3.TFolder)) {
    await app.vault.createFolder((0, import_obsidian3.normalizePath)(folder)).catch(() => {
    });
  }
  const base = sanitizeForFilename(
    plugin.settings.filenameTemplate.replace(/{{\s*date\s*}}/gi, date).replace(/{{\s*time\s*}}/gi, time.replace(":", ".")).replace(/{{\s*food\s*}}/gi, food)
  ) || `${date} ${time.replace(":", ".")} ${sanitizeForFilename(food)}`;
  let path = (0, import_obsidian3.normalizePath)((folder ? folder + "/" : "") + base + ".md");
  let n = 1;
  while (app.vault.getAbstractFileByPath(path)) {
    path = (0, import_obsidian3.normalizePath)((folder ? folder + "/" : "") + `${base} ${++n}.md`);
  }
  return app.vault.create(path, content);
}

// src/exposure.ts
var import_obsidian4 = require("obsidian");
var ExposureModal = class extends import_obsidian4.Modal {
  constructor(app, plugin, prefillFood) {
    super(app);
    this.foods = [];
    this.foodName = "";
    this.status = "fear";
    this.statusTouched = false;
    this.step = "";
    this.contexts = /* @__PURE__ */ new Set();
    this.strategies = /* @__PURE__ */ new Set();
    this.strategyWorked = "n/a";
    this.thoughts = "";
    this.statusSetter = null;
    this.plugin = plugin;
    if (prefillFood) this.foodName = prefillFood;
  }
  onOpen() {
    this.foods = this.plugin.store.getFoods();
    const { contentEl } = this;
    contentEl.addClass("arfid-plugin", "arfid-quicklog", "arfid-exposure");
    this.titleEl.setText("Log an exposure");
    buildChecklist(contentEl, "During the exposure", this.plugin.settings.exposureChecklist);
    contentEl.createDiv({ cls: "arfid-field-label", text: "Food" });
    const foodInput = contentEl.createEl("input", {
      cls: "arfid-input",
      attr: { type: "text", placeholder: "Which food?", enterkeyhint: "done" }
    });
    foodInput.value = this.foodName;
    const suggestions = contentEl.createDiv({ cls: "arfid-suggestions" });
    const candidates = () => {
      const q = normalizeFoodKey(foodInput.value);
      const pool = [...this.foods].sort((a, b) => {
        const rank = (f) => f.currentStatus === "fear" ? 0 : f.currentStatus === "trying" ? 1 : 2;
        return rank(a) - rank(b) || b.lastLogged.localeCompare(a.lastLogged);
      });
      return pool.filter((f) => (!q || f.key.includes(q)) && f.key !== q).slice(0, 6);
    };
    const syncStatusToKnown = () => {
      var _a;
      const known = this.foods.find((f) => f.key === normalizeFoodKey(foodInput.value));
      if (known && !this.statusTouched) {
        this.status = known.currentStatus;
        (_a = this.statusSetter) == null ? void 0 : _a.set(known.currentStatus);
      }
    };
    const renderSuggestions = () => {
      suggestions.empty();
      for (const f of candidates()) {
        const chip = suggestions.createEl("button", { cls: "arfid-chip arfid-suggestion" });
        chip.createSpan({ cls: `arfid-status-dot arfid-status-${f.currentStatus}` });
        chip.createSpan({ text: f.name });
        chip.addEventListener("click", () => {
          foodInput.value = f.name;
          this.foodName = f.name;
          syncStatusToKnown();
          renderSuggestions();
        });
      }
    };
    foodInput.addEventListener("input", () => {
      this.foodName = foodInput.value;
      syncStatusToKnown();
      renderSuggestions();
    });
    renderSuggestions();
    contentEl.createDiv({ cls: "arfid-field-label", text: "How far did it go? (any step counts)" });
    buildChoiceRow(
      contentEl,
      EXPOSURE_STEPS.map((s) => ({ value: s, label: EXPOSURE_STEP_LABELS[s] })),
      "",
      (v) => this.step = v,
      true
    );
    contentEl.createDiv({ cls: "arfid-field-label", text: "Status" });
    this.statusSetter = buildChoiceRow(
      contentEl,
      FOOD_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s], dotClass: `arfid-status-${s}` })),
      this.status,
      (v) => {
        if (v !== "") {
          this.status = v;
          this.statusTouched = true;
        }
      }
    );
    syncStatusToKnown();
    buildChipPicker(contentEl, "Environment & context", this.plugin.settings.knownContexts, this.contexts);
    buildChipPicker(
      contentEl,
      "Strategies used",
      this.plugin.settings.knownStrategies,
      this.strategies,
      () => this.updateWorkedVisibility()
    );
    this.workedSection = contentEl.createDiv();
    this.workedSection.createDiv({ cls: "arfid-field-label", text: "Did the strategy help?" });
    buildChoiceRow(
      this.workedSection,
      [
        { value: "true", label: "Helped" },
        { value: "false", label: "Didn't help" },
        { value: "n/a", label: "Not sure" }
      ],
      "n/a",
      (v) => this.strategyWorked = v === "true" ? true : v === "false" ? false : "n/a"
    );
    this.updateWorkedVisibility();
    contentEl.createDiv({ cls: "arfid-field-label", text: "How did it go? (saved into the note)" });
    const thoughts = contentEl.createEl("textarea", {
      cls: "arfid-textarea",
      attr: { rows: "3", placeholder: "What happened, what it felt like, what the next step could be\u2026" }
    });
    thoughts.addEventListener("input", () => this.thoughts = thoughts.value);
    const save = contentEl.createEl("button", { cls: "arfid-save-btn", text: "Save exposure" });
    save.addEventListener("click", () => void this.save());
    this.scope.register(["Mod"], "Enter", () => {
      void this.save();
      return false;
    });
    if (!this.foodName) window.setTimeout(() => foodInput.focus(), 50);
  }
  updateWorkedVisibility() {
    if (this.strategies.size > 0) this.workedSection.show();
    else this.workedSection.hide();
  }
  async save() {
    const food = this.foodName.trim();
    if (!food) {
      new import_obsidian4.Notice("Add a food name first.");
      return;
    }
    const now = /* @__PURE__ */ new Date();
    const date = isoDate(now);
    const time = isoTime(now);
    const strategies = [...this.strategies];
    const outcome = this.step === "portion" ? "full" : this.step === "bite" || this.step === "tasted" ? "partial" : "";
    const note = buildEntryNote({
      date,
      time,
      food,
      meal: "",
      status: this.status,
      outcome,
      exposure: true,
      exposureStep: this.step,
      statusReason: "",
      textureNotes: "",
      context: [...this.contexts],
      strategies,
      strategyWorked: strategies.length > 0 ? this.strategyWorked : "n/a",
      tags: [],
      body: this.thoughts.trim()
    });
    const file = await createEntryFile(this.app, this.plugin, date, time, food, note);
    await this.plugin.saveSettings();
    if (this.plugin.settings.dailyNoteLinking) {
      const stepLabel = this.step ? EXPOSURE_STEP_LABELS[this.step].toLowerCase() : "exposure";
      const label = `exposure: ${food} \u2014 ${stepLabel}`;
      try {
        await linkIntoDailyNote(this.app, this.plugin.settings, date, time, file.basename, label);
      } catch (e) {
        console.error("ARFID Tracker: daily note linking failed", e);
      }
    }
    new import_obsidian4.Notice(`Exposure logged \u2014 nice work with ${food}.`);
    this.close();
    this.plugin.notifyDataChanged();
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/struggling.ts
var import_obsidian5 = require("obsidian");
var StrugglingModal = class extends import_obsidian5.Modal {
  constructor(app, plugin) {
    super(app);
    this.safeFoods = [];
    this.notesByFood = /* @__PURE__ */ new Map();
    this.plugin = plugin;
  }
  onOpen() {
    var _a;
    const foods = this.plugin.store.getFoods();
    this.safeFoods = foods.filter((f) => f.currentStatus === "safe" || f.currentStatus === "recently-expanded");
    this.notesByFood.clear();
    for (const n of this.plugin.store.getFoodNotes()) {
      const list = (_a = this.notesByFood.get(n.key)) != null ? _a : [];
      list.push(n);
      this.notesByFood.set(n.key, list);
    }
    const { contentEl } = this;
    contentEl.addClass("arfid-plugin", "arfid-quicklog", "arfid-struggling");
    this.titleEl.setText("It's okay. Let's keep this easy.");
    const reminders = this.plugin.settings.kindnessReminders;
    if (reminders.length > 0) {
      contentEl.createDiv({ cls: "arfid-kindness", text: pickRandom(reminders, 1)[0] });
    }
    contentEl.createDiv({ cls: "arfid-field-label", text: "Low-pressure options" });
    this.optionsEl = contentEl.createDiv();
    this.renderOptions();
    if (this.safeFoods.length > 0) {
      const shuffle = contentEl.createEl("button", {
        cls: "arfid-details-toggle",
        text: "Show different options"
      });
      shuffle.addEventListener("click", () => this.renderOptions());
    }
    buildChecklist(contentEl, "Make it easier on yourself", this.plugin.settings.environmentChecklist);
    contentEl.createDiv({
      cls: "arfid-hint arfid-soft-footer",
      text: "Anything you eat counts. Closing this without logging is fine too."
    });
  }
  renderOptions() {
    var _a;
    this.optionsEl.empty();
    if (this.safeFoods.length === 0) {
      this.optionsEl.createDiv({
        cls: "arfid-empty",
        text: "No safe foods logged yet. Once some foods are marked safe, a few easy options will appear here."
      });
      return;
    }
    const weighted = this.safeFoods.flatMap((f) => {
      const fullCount = f.entries.filter((e) => e.outcome === "full").length;
      return Array(1 + Math.min(fullCount, 5)).fill(f);
    });
    const chosen = [];
    for (const f of pickRandom(weighted, weighted.length)) {
      if (!chosen.includes(f)) chosen.push(f);
      if (chosen.length === 3) break;
    }
    for (const f of chosen) {
      const btn = this.optionsEl.createEl("button", { cls: "arfid-option-btn" });
      btn.createSpan({ cls: `arfid-status-dot arfid-status-${f.currentStatus}` });
      const text = btn.createSpan({ cls: "arfid-option-text" });
      text.createSpan({ cls: "arfid-option-name", text: f.name });
      text.createSpan({ cls: "arfid-option-meta", text: `last had ${f.lastLogged}` });
      btn.addEventListener("click", () => {
        this.close();
        new QuickLogModal(this.app, this.plugin, {
          food: f.name,
          status: f.currentStatus,
          meal: guessMealType(/* @__PURE__ */ new Date())
        }).open();
      });
      const notes = (_a = this.notesByFood.get(f.key)) != null ? _a : [];
      if (notes.length > 0) {
        const noteBtn = this.optionsEl.createEl("button", {
          cls: "arfid-chip arfid-ritual-link",
          text: `Open ${notes[0].kind === "recipe" ? "recipe" : notes[0].kind === "order" ? "the order that works" : "your ritual"}`
        });
        noteBtn.addEventListener("click", () => {
          this.close();
          void this.app.workspace.getLeaf(false).openFile(notes[0].file);
        });
      }
    }
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/symptoms.ts
var import_obsidian6 = require("obsidian");
var SymptomModal = class extends import_obsidian6.Modal {
  constructor(app, plugin) {
    super(app);
    this.symptoms = /* @__PURE__ */ new Set();
    this.notes = "";
    this.plugin = plugin;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("arfid-plugin", "arfid-quicklog");
    this.titleEl.setText("Log symptoms");
    contentEl.createDiv({
      cls: "arfid-hint",
      text: "Body signals worth tracking \u2014 they often connect back to how eating has gone."
    });
    buildChipPicker(contentEl, "Symptoms", this.plugin.settings.knownSymptoms, this.symptoms);
    contentEl.createDiv({ cls: "arfid-field-label", text: "Notes (optional)" });
    const notes = contentEl.createEl("textarea", {
      cls: "arfid-textarea",
      attr: { rows: "2", placeholder: "Anything else \u2014 when it started, what you'd eaten so far today\u2026" }
    });
    notes.addEventListener("input", () => this.notes = notes.value);
    const save = contentEl.createEl("button", { cls: "arfid-save-btn", text: "Save symptoms" });
    save.addEventListener("click", () => void this.save());
    this.scope.register(["Mod"], "Enter", () => {
      void this.save();
      return false;
    });
  }
  async save() {
    if (this.symptoms.size === 0) {
      new import_obsidian6.Notice("Pick at least one symptom.");
      return;
    }
    const now = /* @__PURE__ */ new Date();
    const date = isoDate(now);
    const time = isoTime(now);
    const symptoms = [...this.symptoms];
    const note = buildSymptomNote(date, time, symptoms, this.notes);
    const file = await createEntryFile(this.app, this.plugin, date, time, "symptoms", note);
    await this.plugin.saveSettings();
    if (this.plugin.settings.dailyNoteLinking) {
      try {
        await linkIntoDailyNote(this.app, this.plugin.settings, date, time, file.basename, `symptoms: ${symptoms.join(", ")}`);
      } catch (e) {
        console.error("ARFID Tracker: daily note linking failed", e);
      }
    }
    new import_obsidian6.Notice("Symptoms logged.");
    this.close();
    this.plugin.notifyDataChanged();
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/foodnote.ts
var import_obsidian7 = require("obsidian");
var FoodNoteModal = class extends import_obsidian7.Modal {
  constructor(app, plugin, prefillFood, prefillKind) {
    super(app);
    this.foods = [];
    this.foodName = "";
    this.kind = "ritual";
    this.body = "";
    this.plugin = plugin;
    if (prefillFood) this.foodName = prefillFood;
    if (prefillKind) this.kind = prefillKind;
  }
  onOpen() {
    this.foods = this.plugin.store.getFoods();
    const { contentEl } = this;
    contentEl.addClass("arfid-plugin", "arfid-quicklog");
    this.titleEl.setText("Add a ritual, order, or recipe");
    contentEl.createDiv({ cls: "arfid-field-label", text: "Food" });
    const foodInput = contentEl.createEl("input", {
      cls: "arfid-input",
      attr: { type: "text", placeholder: "Which food is this about?" }
    });
    foodInput.value = this.foodName;
    const suggestions = contentEl.createDiv({ cls: "arfid-suggestions" });
    const renderSuggestions = () => {
      suggestions.empty();
      const q = normalizeFoodKey(foodInput.value);
      const matches = this.foods.filter((f) => (!q || f.key.includes(q)) && f.key !== q).slice(0, 6);
      for (const f of matches) {
        const chip = suggestions.createEl("button", { cls: "arfid-chip arfid-suggestion" });
        chip.createSpan({ cls: `arfid-status-dot arfid-status-${f.currentStatus}` });
        chip.createSpan({ text: f.name });
        chip.addEventListener("click", () => {
          foodInput.value = f.name;
          this.foodName = f.name;
          renderSuggestions();
        });
      }
    };
    foodInput.addEventListener("input", () => {
      this.foodName = foodInput.value;
      renderSuggestions();
    });
    renderSuggestions();
    contentEl.createDiv({ cls: "arfid-field-label", text: "Kind" });
    buildChoiceRow(
      contentEl,
      NOTE_KINDS.map((k) => ({ value: k, label: NOTE_KIND_LABELS[k] })),
      this.kind,
      (v) => {
        if (v !== "") this.kind = v;
      }
    );
    contentEl.createDiv({ cls: "arfid-field-label", text: "The details" });
    const body = contentEl.createEl("textarea", {
      cls: "arfid-textarea",
      attr: {
        rows: "6",
        placeholder: "Exactly how it works for you \u2014 the precise order, substitutions, eating sequence, prep steps. The more specific, the more repeatable."
      }
    });
    body.addEventListener("input", () => this.body = body.value);
    const save = contentEl.createEl("button", { cls: "arfid-save-btn", text: "Save note" });
    save.addEventListener("click", () => void this.save());
  }
  async save() {
    const food = this.foodName.trim();
    if (!food) {
      new import_obsidian7.Notice("Add a food name first.");
      return;
    }
    if (!this.body.trim()) {
      new import_obsidian7.Notice("Write the details first \u2014 that's the part future you needs.");
      return;
    }
    const date = isoDate(/* @__PURE__ */ new Date());
    const content = buildFoodNote(date, food, this.kind, this.body);
    const folder = this.plugin.settings.entriesFolder.trim().replace(/\/+$/, "");
    if (folder && !(this.app.vault.getAbstractFileByPath((0, import_obsidian7.normalizePath)(folder)) instanceof import_obsidian7.TFolder)) {
      await this.app.vault.createFolder((0, import_obsidian7.normalizePath)(folder)).catch(() => {
      });
    }
    const base = sanitizeForFilename(`${food} \u2014 ${NOTE_KIND_LABELS[this.kind].toLowerCase()}`);
    let path = (0, import_obsidian7.normalizePath)((folder ? folder + "/" : "") + base + ".md");
    let n = 1;
    while (this.app.vault.getAbstractFileByPath(path)) {
      path = (0, import_obsidian7.normalizePath)((folder ? folder + "/" : "") + `${base} ${++n}.md`);
    }
    await this.app.vault.create(path, content);
    new import_obsidian7.Notice(`Saved ${NOTE_KIND_LABELS[this.kind].toLowerCase()} for ${food}.`);
    this.close();
    this.plugin.notifyDataChanged();
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/statuschange.ts
var import_obsidian8 = require("obsidian");
var StatusChangeModal = class extends import_obsidian8.Modal {
  constructor(app, plugin, prefillFood) {
    super(app);
    this.foods = [];
    this.foodName = "";
    this.status = "";
    this.reason = "";
    this.statusSetter = null;
    this.plugin = plugin;
    if (prefillFood) this.foodName = prefillFood;
  }
  onOpen() {
    this.foods = this.plugin.store.getFoods();
    const { contentEl } = this;
    contentEl.addClass("arfid-plugin", "arfid-quicklog");
    this.titleEl.setText("Change a food's status");
    contentEl.createDiv({ cls: "arfid-field-label", text: "Food" });
    const foodInput = contentEl.createEl("input", {
      cls: "arfid-input",
      attr: { type: "text", placeholder: "Which food?" }
    });
    foodInput.value = this.foodName;
    const suggestions = contentEl.createDiv({ cls: "arfid-suggestions" });
    this.currentLine = contentEl.createDiv({ cls: "arfid-hint" });
    const updateCurrent = () => {
      const known = this.known();
      this.currentLine.setText(
        known ? `Currently: ${STATUS_LABELS[known.currentStatus]} (since ${known.lastLogged})` : ""
      );
    };
    const renderSuggestions = () => {
      suggestions.empty();
      const q = normalizeFoodKey(foodInput.value);
      const matches = this.foods.filter((f) => (!q || f.key.includes(q)) && f.key !== q).slice(0, 6);
      for (const f of matches) {
        const chip = suggestions.createEl("button", { cls: "arfid-chip arfid-suggestion" });
        chip.createSpan({ cls: `arfid-status-dot arfid-status-${f.currentStatus}` });
        chip.createSpan({ text: f.name });
        chip.addEventListener("click", () => {
          foodInput.value = f.name;
          this.foodName = f.name;
          renderSuggestions();
          updateCurrent();
        });
      }
    };
    foodInput.addEventListener("input", () => {
      this.foodName = foodInput.value;
      renderSuggestions();
      updateCurrent();
    });
    renderSuggestions();
    updateCurrent();
    contentEl.createDiv({ cls: "arfid-field-label", text: "New status" });
    this.statusSetter = buildChoiceRow(
      contentEl,
      FOOD_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s], dotClass: `arfid-status-${s}` })),
      "",
      (v) => this.status = v
    );
    contentEl.createDiv({ cls: "arfid-field-label", text: "What changed?" });
    const reason = contentEl.createEl("textarea", {
      cls: "arfid-textarea",
      attr: {
        rows: "3",
        placeholder: "The specific thought or moment behind this \u2014 why was it gained or lost?"
      }
    });
    reason.addEventListener("input", () => this.reason = reason.value);
    const save = contentEl.createEl("button", { cls: "arfid-save-btn", text: "Save status change" });
    save.addEventListener("click", () => void this.save());
  }
  known() {
    return this.foods.find((f) => f.key === normalizeFoodKey(this.foodName));
  }
  async save() {
    const food = this.foodName.trim();
    if (!food) {
      new import_obsidian8.Notice("Add a food name first.");
      return;
    }
    if (!this.status) {
      new import_obsidian8.Notice("Pick the new status.");
      return;
    }
    const known = this.known();
    if (known && known.currentStatus === this.status) {
      new import_obsidian8.Notice(`${food} is already marked ${STATUS_LABELS[this.status].toLowerCase()}.`);
      return;
    }
    const now = /* @__PURE__ */ new Date();
    const date = isoDate(now);
    const time = isoTime(now);
    const note = buildEntryNote({
      date,
      time,
      food,
      meal: "",
      status: this.status,
      outcome: "",
      exposure: false,
      exposureStep: "",
      statusReason: this.reason.trim(),
      textureNotes: "",
      context: [],
      strategies: [],
      strategyWorked: "n/a",
      tags: ["status-change"]
    });
    const file = await createEntryFile(this.app, this.plugin, date, time, food, note);
    if (this.plugin.settings.dailyNoteLinking) {
      const fromLabel = known ? `${STATUS_LABELS[known.currentStatus].toLowerCase()} \u2192 ` : "";
      const label = `status: ${food} \u2014 ${fromLabel}${STATUS_LABELS[this.status].toLowerCase()}`;
      try {
        await linkIntoDailyNote(this.app, this.plugin.settings, date, time, file.basename, label);
      } catch (e) {
        console.error("ARFID Tracker: daily note linking failed", e);
      }
    }
    new import_obsidian8.Notice(`${food} \u2192 ${STATUS_LABELS[this.status].toLowerCase()}`);
    this.close();
    this.plugin.notifyDataChanged();
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/addfoods.ts
var import_obsidian9 = require("obsidian");
async function createBaselineEntry(app, plugin, date, time, food, status) {
  const note = buildEntryNote({
    date,
    time,
    food,
    meal: "",
    status,
    outcome: "",
    exposure: false,
    exposureStep: "",
    statusReason: "",
    textureNotes: "",
    context: [],
    strategies: [],
    strategyWorked: "n/a",
    tags: ["baseline"]
  });
  await createEntryFile(app, plugin, date, time, food, note);
}
var AddFoodModal = class extends import_obsidian9.Modal {
  constructor(app, plugin) {
    super(app);
    this.foods = [];
    this.foodName = "";
    this.status = "";
    this.plugin = plugin;
  }
  onOpen() {
    this.foods = this.plugin.store.getFoods();
    const { contentEl } = this;
    contentEl.addClass("arfid-plugin", "arfid-quicklog");
    this.titleEl.setText("Add a food to your library");
    contentEl.createDiv({
      cls: "arfid-hint",
      text: "Nothing is logged as eaten \u2014 this just adds the food with a status."
    });
    const foodInput = contentEl.createEl("input", {
      cls: "arfid-input",
      attr: { type: "text", placeholder: "Food name", enterkeyhint: "done" }
    });
    this.hintEl = contentEl.createDiv({ cls: "arfid-hint" });
    foodInput.addEventListener("input", () => {
      this.foodName = foodInput.value;
      this.updateExistingHint();
    });
    contentEl.createDiv({ cls: "arfid-field-label", text: "Status" });
    buildChoiceRow(
      contentEl,
      FOOD_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s], dotClass: `arfid-status-${s}` })),
      "",
      (v) => this.status = v
    );
    this.saveBtn = contentEl.createEl("button", { cls: "arfid-save-btn", text: "Add food" });
    this.saveBtn.addEventListener("click", () => void this.save());
    this.scope.register(["Mod"], "Enter", () => {
      void this.save();
      return false;
    });
    const bulkLink = contentEl.createEl("button", {
      cls: "arfid-details-toggle",
      text: "Add many at once instead"
    });
    bulkLink.addEventListener("click", () => {
      this.close();
      new AddFoodsModal(this.app, this.plugin).open();
    });
    window.setTimeout(() => foodInput.focus(), 50);
  }
  known() {
    return this.foods.find((f) => f.key === normalizeFoodKey(this.foodName));
  }
  updateExistingHint() {
    const known = this.known();
    if (known) {
      this.hintEl.setText(
        `${known.name} is already tracked as ${STATUS_LABELS[known.currentStatus].toLowerCase()} \u2014 saving will open the status change screen instead.`
      );
      this.saveBtn.setText("Change its status\u2026");
    } else {
      this.hintEl.setText("");
      this.saveBtn.setText("Add food");
    }
  }
  async save() {
    const food = this.foodName.trim();
    if (!food) {
      new import_obsidian9.Notice("Add a food name first.");
      return;
    }
    const known = this.known();
    if (known) {
      this.close();
      new StatusChangeModal(this.app, this.plugin, known.name).open();
      return;
    }
    if (!this.status) {
      new import_obsidian9.Notice("Pick a status for it.");
      return;
    }
    const now = /* @__PURE__ */ new Date();
    await createBaselineEntry(this.app, this.plugin, isoDate(now), isoTime(now), food, this.status);
    new import_obsidian9.Notice(`Added ${food} as ${STATUS_LABELS[this.status].toLowerCase()}.`);
    this.close();
    this.plugin.notifyDataChanged();
  }
  onClose() {
    this.contentEl.empty();
  }
};
var AddFoodsModal = class extends import_obsidian9.Modal {
  constructor(app, plugin) {
    super(app);
    this.inputs = /* @__PURE__ */ new Map();
    this.plugin = plugin;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("arfid-plugin", "arfid-quicklog");
    this.titleEl.setText("Add foods to your library");
    contentEl.createDiv({
      cls: "arfid-hint",
      text: "Enter the foods you already know, one per line (commas work too). Nothing here is logged as eaten \u2014 it just puts your existing lists into the system."
    });
    for (const status of FOOD_STATUSES) {
      const label = contentEl.createDiv({ cls: "arfid-field-label arfid-status-field-label" });
      label.createSpan({ cls: `arfid-status-dot arfid-status-${status}` });
      label.createSpan({ text: ` ${STATUS_LABELS[status]} foods` });
      const ta = contentEl.createEl("textarea", {
        cls: "arfid-textarea",
        attr: { rows: "3", placeholder: `e.g. ${placeholderFor(status)}` }
      });
      this.inputs.set(status, ta);
    }
    const save = contentEl.createEl("button", { cls: "arfid-save-btn", text: "Add foods" });
    save.addEventListener("click", () => void this.save());
  }
  async save() {
    var _a, _b;
    const knownKeys = new Set(this.plugin.store.getFoods().map((f) => f.key));
    const now = /* @__PURE__ */ new Date();
    const date = isoDate(now);
    const time = isoTime(now);
    let added = 0;
    const skipped = [];
    const seen = /* @__PURE__ */ new Set();
    for (const status of FOOD_STATUSES) {
      const raw = (_b = (_a = this.inputs.get(status)) == null ? void 0 : _a.value) != null ? _b : "";
      const foods = raw.split(/[\n,]/).map((s) => s.trim()).filter((s) => s.length > 0);
      for (const food of foods) {
        const key = normalizeFoodKey(food);
        if (seen.has(key)) continue;
        seen.add(key);
        if (knownKeys.has(key)) {
          skipped.push(food);
          continue;
        }
        await createBaselineEntry(this.app, this.plugin, date, time, food, status);
        added++;
      }
    }
    if (added === 0 && skipped.length === 0) {
      new import_obsidian9.Notice("Nothing to add \u2014 enter some foods first.");
      return;
    }
    let msg = `Added ${added} food${added === 1 ? "" : "s"} to your library.`;
    if (skipped.length > 0) {
      msg += ` Already tracked (unchanged): ${skipped.join(", ")} \u2014 use \u201CChange a food's status\u201D to move them.`;
    }
    new import_obsidian9.Notice(msg, skipped.length > 0 ? 8e3 : 4e3);
    this.close();
    this.plugin.notifyDataChanged();
  }
  onClose() {
    this.contentEl.empty();
  }
};
function placeholderFor(status) {
  switch (status) {
    case "safe":
      return "chicken nuggets, white rice, pretzels";
    case "trying":
      return "cheese curds";
    case "fear":
      return "mixed casseroles, mushy vegetables";
    case "recently-expanded":
      return "scrambled eggs";
  }
}

// src/dashboard.ts
var import_obsidian11 = require("obsidian");

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
var import_obsidian10 = require("obsidian");
function csvCell(value) {
  if (/[",\n]/.test(value)) return '"' + value.replace(/"/g, '""') + '"';
  return value;
}
function buildCsv(entries) {
  const header = [
    "date",
    "time",
    "food",
    "meal",
    "status",
    "outcome",
    "exposure",
    "exposure_step",
    "status_reason",
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
      e.meal,
      e.status,
      e.outcome,
      e.exposure ? "true" : "false",
      e.exposureStep,
      e.statusReason.replace(/\r?\n/g, " "),
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
function buildSymptomCsv(entries) {
  const header = ["date", "time", "symptoms", "file"];
  const rows = entries.map((e) => [e.date, e.time, e.symptoms.join(", "), e.file.path].map(csvCell).join(","));
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
    lines.push(`| Date | Food | Change | Why |`);
    lines.push(`| --- | --- | --- | --- |`);
    for (const sh of [...shifts].reverse()) {
      lines.push(
        `| ${sh.date} | ${sh.food} | ${STATUS_LABELS[sh.from]} \u2192 ${STATUS_LABELS[sh.to]} | ${sh.reason.replace(/\r?\n/g, " ") || "\u2014"} |`
      );
    }
  }
  lines.push("");
  lines.push(`## Exposure practice`);
  lines.push("");
  const exposures = entries.filter((e) => e.exposure);
  if (exposures.length === 0) {
    lines.push("No exposures logged yet.");
  } else {
    const cutoff30 = isoDate(new Date(Date.now() - 30 * 864e5));
    lines.push(`${exposures.length} exposures logged, ${exposures.filter((e) => e.date >= cutoff30).length} in the last 30 days.`);
    lines.push("");
    lines.push(`| Step reached | Count |`);
    lines.push(`| --- | ---: |`);
    for (const step of EXPOSURE_STEPS) {
      const count = exposures.filter((e) => e.exposureStep === step).length;
      if (count > 0) lines.push(`| ${EXPOSURE_STEP_LABELS[step]} | ${count} |`);
    }
    const unstepped = exposures.filter((e) => !e.exposureStep).length;
    if (unstepped > 0) lines.push(`| (step not recorded) | ${unstepped} |`);
  }
  lines.push("");
  lines.push(`## Symptoms`);
  lines.push("");
  const symptomEntries = store.getSymptomEntries();
  const symptomStats = store.getSymptomStats(symptomEntries);
  if (symptomStats.length === 0) {
    lines.push("No symptoms logged yet.");
  } else {
    lines.push(`${symptomEntries.length} symptom logs.`);
    lines.push("");
    lines.push(`| Symptom | Times logged |`);
    lines.push(`| --- | ---: |`);
    for (const s of symptomStats) lines.push(`| ${s.name} | ${s.count} |`);
  }
  lines.push("");
  lines.push(`## Meals by type`);
  lines.push("");
  const withMeal = entries.filter((e) => e.meal);
  if (withMeal.length === 0) {
    lines.push("No entries with a meal type yet.");
  } else {
    lines.push(`| Meal | Entries |`);
    lines.push(`| --- | ---: |`);
    for (const m of MEAL_TYPES) {
      const count = withMeal.filter((e) => e.meal === m).length;
      if (count > 0) lines.push(`| ${MEAL_LABELS[m]} | ${count} |`);
    }
  }
  lines.push("");
  lines.push(`## Rituals, orders, and recipes`);
  lines.push("");
  const foodNotes = store.getFoodNotes();
  if (foodNotes.length === 0) {
    lines.push("None recorded yet.");
  } else {
    lines.push(`| Food | Kind | Note |`);
    lines.push(`| --- | --- | --- |`);
    for (const n of foodNotes) {
      lines.push(`| ${n.food} | ${NOTE_KIND_LABELS[n.kind]} | [[${n.file.basename}]] |`);
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
    lines.push(`| Date | Time | Food | Kind | Status | Outcome | Strategies | Context |`);
    lines.push(`| --- | --- | --- | --- | --- | --- | --- | --- |`);
    for (const e of entries) {
      const kind = e.exposure ? `exposure${e.exposureStep ? ` (${EXPOSURE_STEP_LABELS[e.exposureStep].toLowerCase()})` : ""}` : e.tags.includes("status-change") ? "status change" : e.tags.includes("baseline") ? "baseline" : e.meal || "\u2014";
      lines.push(
        `| ${e.date} | ${e.time} | ${e.food} | ${kind} | ${STATUS_LABELS[e.status]} | ${e.outcome || "\u2014"} | ${e.strategies.join(", ") || "\u2014"} | ${e.context.join(", ") || "\u2014"} |`
      );
    }
  }
  lines.push("");
  return lines.join("\n");
}
async function writeExport(app, settings, filename, content) {
  const folder = settings.exportsFolder.trim().replace(/\/+$/, "");
  if (folder && !(app.vault.getAbstractFileByPath((0, import_obsidian10.normalizePath)(folder)) instanceof import_obsidian10.TFolder)) {
    await app.vault.createFolder((0, import_obsidian10.normalizePath)(folder)).catch(() => {
    });
  }
  const path = (0, import_obsidian10.normalizePath)((folder ? folder + "/" : "") + filename);
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing instanceof import_obsidian10.TFile) {
    await app.vault.modify(existing, content);
    return existing;
  }
  return app.vault.create(path, content);
}
async function exportCsv(app, settings, store) {
  var _a, _b;
  const entries = store.getEntries();
  const file = await writeExport(app, settings, `arfid-entries-${isoDate(/* @__PURE__ */ new Date())}.csv`, buildCsv(entries));
  const symptoms = store.getSymptomEntries();
  if (symptoms.length > 0) {
    await writeExport(app, settings, `arfid-symptoms-${isoDate(/* @__PURE__ */ new Date())}.csv`, buildSymptomCsv(symptoms));
  }
  new import_obsidian10.Notice(
    `Exported ${entries.length} entries${symptoms.length > 0 ? ` and ${symptoms.length} symptom logs` : ""} to ${(_b = (_a = file.parent) == null ? void 0 : _a.path) != null ? _b : file.path}`
  );
}
async function exportSummary(app, settings, store) {
  const file = await writeExport(app, settings, `arfid-summary-${isoDate(/* @__PURE__ */ new Date())}.md`, buildMarkdownSummary(store));
  new import_obsidian10.Notice(`Summary written to ${file.path}`);
  await app.workspace.getLeaf(true).openFile(file);
}

// src/dashboard.ts
var VIEW_TYPE_ARFID = "arfid-dashboard";
var ArfidDashboardView = class extends import_obsidian11.ItemView {
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
      ["strategies", "Patterns"]
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
    const recentExposures = entries.filter((e) => e.exposure && e.date >= cutoff30).length;
    const actions = body.createDiv({ cls: "arfid-quick-actions" });
    const struggling = actions.createEl("button", { cls: "arfid-chip arfid-action-chip", text: "I'm struggling" });
    struggling.addEventListener("click", () => new StrugglingModal(this.app, this.plugin).open());
    const exposure = actions.createEl("button", { cls: "arfid-chip arfid-action-chip", text: "Log an exposure" });
    exposure.addEventListener("click", () => new ExposureModal(this.app, this.plugin).open());
    const symptoms = actions.createEl("button", { cls: "arfid-chip arfid-action-chip", text: "Log symptoms" });
    symptoms.addEventListener("click", () => new SymptomModal(this.app, this.plugin).open());
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
    card("Exposures \xB7 30d", recentExposures);
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
    const consumed = entries.filter((e) => e.meal || e.outcome || e.exposure);
    renderLineChart(
      trendSection,
      this.trendMode === "day" ? trendPerDay(consumed, 30) : trendPerWeek(consumed, 12),
      { singular: "entry", plural: "entries" }
    );
    const shiftSection = body.createDiv({ cls: "arfid-section" });
    shiftSection.createEl("h3", { text: "Status changes" });
    if (shifts.length === 0) {
      shiftSection.createDiv({ cls: "arfid-empty", text: "No status changes yet \u2014 they'll show up here as foods move between fear, trying, and safe." });
    } else {
      const list = shiftSection.createDiv({ cls: "arfid-shift-list" });
      for (const sh of [...shifts].reverse().slice(0, 15)) {
        const item = list.createDiv({ cls: "arfid-shift-item" });
        const row2 = item.createDiv({ cls: "arfid-shift-row" });
        row2.createSpan({ cls: "arfid-shift-date", text: sh.date });
        row2.createSpan({ cls: "arfid-shift-food", text: sh.food });
        const change = row2.createSpan({ cls: "arfid-shift-change" });
        change.createSpan({ cls: `arfid-status-dot arfid-status-${sh.from}` });
        change.createSpan({ text: `${STATUS_LABELS[sh.from]} \u2192 ` });
        change.createSpan({ cls: `arfid-status-dot arfid-status-${sh.to}` });
        change.createSpan({ text: STATUS_LABELS[sh.to] });
        if (sh.reason) {
          item.createDiv({ cls: "arfid-shift-reason", text: `\u201C${sh.reason}\u201D` });
        }
      }
    }
    const recentSection = body.createDiv({ cls: "arfid-section" });
    recentSection.createEl("h3", { text: "Recently logged" });
    const recent = [...entries].reverse().filter((e) => !e.tags.includes("baseline")).slice(0, 10);
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
    var _a;
    const notesByFood = /* @__PURE__ */ new Map();
    for (const n of this.plugin.store.getFoodNotes()) {
      const list = (_a = notesByFood.get(n.key)) != null ? _a : [];
      list.push(n);
      notesByFood.set(n.key, list);
    }
    const topRow = body.createDiv({ cls: "arfid-foods-toolbar" });
    const search = topRow.createEl("input", {
      cls: "arfid-input arfid-search",
      attr: { type: "search", placeholder: "Search foods\u2026" }
    });
    search.value = this.foodSearch;
    const addBtn = topRow.createEl("button", { cls: "arfid-chip", text: "+ Add food" });
    addBtn.addEventListener("click", () => new AddFoodModal(this.app, this.plugin).open());
    const groups = body.createDiv();
    search.addEventListener("input", () => {
      this.foodSearch = search.value;
      renderGroups();
    });
    const renderGroups = () => {
      var _a2;
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
          const notes = (_a2 = notesByFood.get(f.key)) != null ? _a2 : [];
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
            text: `${f.entries.length}\xD7 \xB7 last ${f.lastLogged}`
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
    const symptomStats = this.plugin.store.getSymptomStats();
    const symptomSection = body.createDiv({ cls: "arfid-section" });
    symptomSection.createEl("h3", { text: "Symptoms" });
    symptomSection.createDiv({
      cls: "arfid-hint",
      text: "How often each symptom has been logged, all time."
    });
    renderBars(
      symptomSection,
      symptomStats.map((s) => ({ label: s.name, value: s.count })),
      "No symptoms logged yet \u2014 use \u201CLog symptoms\u201D on the Overview tab when they show up."
    );
  }
  // ------------------------------------------------------------- shared
  renderEntryRow(parent, e, showFood) {
    const row = parent.createDiv({ cls: "arfid-entry-row" });
    row.createSpan({ cls: "arfid-entry-when", text: `${e.date} ${e.time}`.trim() });
    const main = row.createSpan({ cls: "arfid-entry-main" });
    main.createSpan({ cls: `arfid-status-dot arfid-status-${e.status}` });
    main.createSpan({ text: showFood ? e.food : STATUS_LABELS[e.status] });
    if (e.exposure) {
      const step = e.exposureStep ? EXPOSURE_STEP_LABELS[e.exposureStep].toLowerCase() : "";
      row.createSpan({ cls: "arfid-entry-outcome", text: step ? `exposure \xB7 ${step}` : "exposure" });
    } else {
      const bits = [e.meal, e.outcome].filter((b) => b);
      if (bits.length > 0) row.createSpan({ cls: "arfid-entry-outcome", text: bits.join(" \xB7 ") });
    }
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
var ArfidTrackerPlugin = class extends import_obsidian12.Plugin {
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
    this.addRibbonIcon(
      "heart-handshake",
      "I'm struggling to eat",
      () => new StrugglingModal(this.app, this).open()
    );
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
      id: "struggling",
      name: "I'm struggling \u2014 show safe options",
      callback: () => new StrugglingModal(this.app, this).open()
    });
    this.addCommand({
      id: "log-exposure",
      name: "Log an exposure",
      callback: () => new ExposureModal(this.app, this).open()
    });
    this.addCommand({
      id: "log-symptoms",
      name: "Log symptoms",
      callback: () => new SymptomModal(this.app, this).open()
    });
    this.addCommand({
      id: "change-food-status",
      name: "Change a food's status",
      callback: () => new StatusChangeModal(this.app, this).open()
    });
    this.addCommand({
      id: "add-food-note",
      name: "Add a ritual, order, or recipe for a food",
      callback: () => new FoodNoteModal(this.app, this).open()
    });
    this.addCommand({
      id: "add-food",
      name: "Add a food to library (without logging a meal)",
      callback: () => new AddFoodModal(this.app, this).open()
    });
    this.addCommand({
      id: "add-foods",
      name: "Add foods to library in bulk (without logging a meal)",
      callback: () => new AddFoodsModal(this.app, this).open()
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
    if ((fm == null ? void 0 : fm.type) === "food-entry" || (fm == null ? void 0 : fm.type) === "symptom-entry" || (fm == null ? void 0 : fm.type) === "food-note") {
      this.scheduleRefresh();
    }
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
