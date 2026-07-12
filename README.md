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
- **Export** — CSV of all entries and a clinician-ready markdown summary
  (foods by status, status changes, strategy table, entries per month, full
  appendix), written into a configurable exports folder.

## Data storage

One markdown note per entry in a configurable folder (default `Food Log/`):

```yaml
---
type: food-entry
date: 2026-07-11
time: "18:30"
food: "scrambled eggs"
status: trying            # safe | trying | fear | recently-expanded
outcome: partial          # full | partial | refused | avoided
texture_notes: ""
context: "home, family meal"
strategy_used: "small portion first"
strategy_worked: true     # true | false | "n/a"
tags: []
---
```

Entries are discovered by their `type: food-entry` frontmatter, **not** by
folder path, so notes can be reorganized freely. Data stays portable,
greppable, and Dataview-queryable even without the plugin.

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
