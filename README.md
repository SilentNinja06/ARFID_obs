# ARFID Tracker

An Obsidian plugin for tracking safe/fear foods, exposures, and meals — built to
see trends over time and support gradual food expansion. Mobile-first, designed
for fast one-handed logging, and deliberately calm: neutral status colors, no
diet-app framing, no judgment colors.

Companion plugin to the [Spiral & Shutdown Logger](https://github.com/SilentNinja06/AHeatmap_obs)
and shares its conventions: plain-markdown storage, chip pickers, marker-based
daily-note linking, inline SVG charts, and the same release setup.

## Features

- **Quick-log modal** — reachable from the ribbon, command palette, or a mobile
  toolbar button. Food name with autocomplete from previously logged foods
  (recent foods are offered before you type anything), one-tap status and
  outcome chips, and everything else behind an "Add details" disclosure:
  strategies, context, texture notes, tags. All tap targets are ≥44px.
- **Food library** — every food ever logged, grouped by current status
  (safe / trying / fear / recently expanded), searchable, tap a food to see its
  full history inline.
- **Bulk import your known foods** — "+ Add foods" in the library (or the
  command palette) takes your existing safe/trying/fear/expanded lists, one
  food per line, and adds them as baseline entries without logging anything
  as eaten. Baselines never count as meals in trends or the recent list.
- **Dashboard** — summary cards (safe / trying / fear counts, expansions in the
  last 30 days), a meals-logged trend chart (30 days or 12 weeks), a status
  shift tracker showing foods that moved between fear → trying → safe with
  dates, and the last 10 entries.
- **Strategy tracker** — every strategy used across entries with its use count
  and how often it was rated as helping, so patterns in what works are visible.
- **Chip lists that learn** — strategies and contexts are one-tap chips backed
  by a list in settings, seeded with sensible defaults and grown automatically
  when you type something new during logging.
- **Daily-note linking** (optional) — inserts a link into that day's daily note
  when an entry is logged. Placement is marker-based (`%% arfid-log %%`,
  configurable, invisible in reading view), falling back to a configured
  heading, and only appending at the end as a last resort. Missing daily notes
  are seeded from the Daily Notes core plugin's template. Structured templates
  are never disturbed — only the plugin's own log lines are reordered.
- **"I'm struggling" support screen** (ribbon heart icon / command) — for the
  moments when eating anything feels hard: a kindness reminder, three
  low-pressure safe-food options weighted toward what has gone down well
  before (tap one to log it, with its ritual one tap away if it has one), and
  an environment checklist. Closing it without logging is always fine.
- **Exposure logging** — a dedicated flow for fear-food exposures: your
  critical-reminders checklist on screen during the exposure, an exposure
  ladder (looked → smelled → touched → tasted → bite → portion; any step
  counts), environment/context chips, strategies, and a freeform "how did it
  go" saved into the note body.
- **Status changes with reasons** — change a food's status in two taps (from
  the food library, a command, or just by logging), with a "what changed?"
  prompt so the specific thought behind every gained or lost food is
  documented. Reasons appear in the status shift tracker and exports.
- **Symptom tracking** — log ARFID-related symptoms (brain fog, jitters,
  lightheadedness, headaches…) as one-tap chips backed by an auto-growing
  list. Frequency bars on the Patterns tab, own CSV, and a summary section.
- **Rituals, orders, and recipes** — attach companion notes to any food: the
  exact eating ritual that makes it work, the precise restaurant order, or a
  recipe that earned its way into the safe list. Shown in the food library,
  offered on the struggling screen, and listed in the summary export.
- **Meal types** — entries carry breakfast/lunch/dinner/snack/drink (guessed
  from the time of day, one tap to change), so the daily note reads as a real
  food diary and the summary can break meals down by type.
- **Export** — CSV of all entries (plus a symptoms CSV) and a clinician-ready
  markdown summary (foods by status, status changes with reasons, exposure
  practice, symptoms, strategy table, meals by type, rituals/orders/recipes,
  entries per month, full appendix), written into a configurable exports
  folder.

## Data storage

One markdown note per entry in a configurable folder (default `Food Log/`):

```yaml
---
type: food-entry
date: 2026-07-11
time: "18:30"
food: "scrambled eggs"
meal: dinner              # breakfast | lunch | dinner | snack | drink | ""
status: trying            # safe | trying | fear | recently-expanded
outcome: partial          # full | partial | refused | avoided | ""
exposure: false           # true when logged through the exposure flow
exposure_step: ""         # looked | smelled | touched | tasted | bite | portion
status_reason: ""         # why this food's status changed, when it did
texture_notes: ""
context: "home, family meal"
strategy_used: "small portion first"
strategy_worked: true     # true | false | "n/a"
tags: []
---
```

Symptom logs are their own notes (`type: symptom-entry` with a `symptoms:`
list), and rituals/orders/recipes are per-food companion notes
(`type: food-note` with `note_kind: ritual | order | recipe`, details in the
body).

All notes are discovered by their `type` frontmatter, **not** by folder path,
so they can be reorganized freely. Data stays portable, greppable, and
Dataview-queryable even without the plugin.

## Install

### Via BRAT (recommended)

1. Install the [BRAT](https://github.com/TfTHacker/obsidian42-brat) community plugin.
2. In BRAT settings, choose **Add beta plugin** and enter `SilentNinja06/ARFID_obs`.
3. Enable **ARFID Tracker** in Community plugins.

### Manual

Download `main.js`, `manifest.json`, and `styles.css` from the
[latest release](https://github.com/SilentNinja06/ARFID_obs/releases) into
`<vault>/.obsidian/plugins/arfid-tracker/` and enable the plugin.

## Development

```bash
npm install
npm run dev     # watch build
npm run build   # typecheck + production build (main.js at repo root)
```

Releases are cut by the GitHub Actions workflow on tag push, or manually via
**Run workflow** (it reads the version from `manifest.json` and creates the tag
itself). Keep `manifest.json`, `package.json`, and `versions.json` in sync.

## License

MIT
