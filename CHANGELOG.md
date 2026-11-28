# Changelog

## v0.0.13 (2026-11-27)

- The package APIs are the same as in v0.0.12.
- The user Blocks and Integrations in the [gallery](examples/README.md#components) use the Admin application layout: a page header with one primary action, a section sidebar, one main table per section, and details in the wide Sheet.
- The documentation has 53 files, down from 133. Component guides merge by type, release notes live in this file, and the [documentation index](docs/README.md) links each guide once.

Checks for `37efce7`: every stage of `pnpm check` passed. The release skipped the qualification browser stages.

## v0.0.12 (2026-11-27)

- Save [table views](docs/tables.md#pagination-and-saved-views) through application storage and keep system views read-only.
- Use TimeClock, Meter, StepList, SummaryList, ActivityList, SidebarLink, and custom Tree toggle glyphs. Explore user and admin Blocks in the [gallery](examples/README.md#components).
- Use the AlertDialog buttons or Escape to close it. Laser icon-only buttons glow on the icon, and Sketchy tree toggles use the dot-filled glyph.
- The workspace pins the Solid runtime to 2.0.4 and the compilers to 2.0.3.

Checks for implementation `09abbc5`: `pnpm check` and focused source, vendor, and browser checks passed with fixes included in the tag. The release skipped the qualification browser stages.

## v0.0.11 (2026-11-18)

- Use stable Solid 2 with the components package. Diagrams keep their read-only renderer and use `@xyflow/system` 1.0.0.
- Sync handles the new collection `crashed` status and reports it as `error` through `syncStatus`. Table filters, overlay focus, and keyboard drag targets received fixes.
- Development moved to TypeScript 7.0.2, Vitest 5.1.0, Vite 8.3.8, tsdown 0.23.5, Rolldown 1.2.19, and Oxlint 1.94.0.

Checks for `3b553b1`: `pnpm check` and all 152 qualification stages passed.

## v0.0.10 (2026-11-11)

- Use read-only workflow and ERD diagrams, Tree, calendar ranges, sliders, toggles, and context menus.
- Charts gained layered, polar, transformed, financial, statistical, and time-series examples. Themes share configurable choice roles.
- Forms serialize same-turn edits before submission. Sync cancels confirmation waits with `AbortError` on disposal and keeps durable outbox entries for replay.
- The workspace moved the Solid runtime and compilers to `2.0.0-rc.21`.

Checks for `a643231`: `pnpm check` passed. Focused builds and 86 gallery cases per mode passed after the final CSS guards.

## v0.0.9 (2026-10-27)

- Use drag and drop, sortable controls, Kanban boards, and a controlled Gantt view.
- Use command lists, a command palette, keyboard shortcuts, date and time fields, and a color picker.
- Sketchy, Vanilla, and Laser share theme variables and appearance controls. Package exports provide declarations, preserved JSX, compiled code, and server code where applicable.
- The release includes Sync and pins the Solid runtime and compilers to `2.0.0-rc.18`.

Checks recorded at tag commit `a2e038e`: all `pnpm check` stages passed across the initial run and focused reruns. Ten focused browser cases passed against the package build.

## v0.0.8 (2026-10-22)

- Override the ShellView header and navigation, or hide the navigation pane and toggle.
- Decorate inputs and form sections by color role. Import individual icons through the icons subpath.
- Explore decoration geometry, form actions, and row actions in the gallery.

Checks for runtime `7c75de6`: focused lint, types, unit, browser, and hydration checks passed. The `pnpm check` pass preceded the final lifecycle fix.

## v0.0.7 (2026-10-21)

- FormView and FormActions share a final row with buttons at their natural widths. Generated forms can disable submission separately and use accessible icon-only actions.
- Set sorting and filtering separately for each table column. Manual sorting delegates row order to the application.

Checks for `0a0d130`: `pnpm check` and focused source and package browser and hydration checks passed.

## v0.0.6 (2026-10-21)

SidebarContextSwitcher adds searchable context choices, an optional parent action, and compact navigation.

Checks for `87a5ebc`: `pnpm check` and focused browser and hydration checks passed.

## v0.0.5 (2026-10-21)

- Tables support application-owned pagination and header actions. Applications can hide table chrome and load child rows on expansion.
- EntryPanel centers forms. The examples demonstrate shared Combobox matching and text-only sidebar groups.
- The workspace moved the Solid runtime and compilers to `2.0.0-rc.16`.

Checks for the Solid upgrade in `04ce711`: unit checks and serial browser and hydration runs passed after repairs. The record has no tag-wide pass.

## v0.0.4 (2026-10-20)

The shared theme refined borders, dots, icons, and spacing, and removed surface shadows. The gallery renders examples directly. Nested tables use a left inset and show Apply for pending filters.

Testing for tag commit `1f3718d`: the qualification guide records no release result.

## v0.0.3 (2026-10-20)

Consumers and the gallery share the Default theme.

Testing for tag commit `afa1e63`: the qualification guide records no release result.

## v0.0.2 (2026-10-19)

This release includes the approved default appearance, consistent component styles, sidebar navigation, and appearance controls.

Testing for tag commit `264f926`: the qualification guide records no release result.

## v0.0.1 (2026-10-19)

Use described shells, controlled boolean grids, status tiles, default field labels, and shared display formats. Generated forms support repeated scalar groups. Generated record views show details and confirm deletion.

Checks for `b88fb46`: Beads records a passing `pnpm check` for the release documentation and focused source, package, browser, and server checks for the implementation.
