# wfe audit: cohesiveness, code quality, modularity

Date: October 22, 2026. Repository: `/home/kaalin/dev/wfe` at commit `71a99f6` on `main`. This audit changed no files.

## 1. Scope and method

The audit covers the full tracked tree of 1,250 files. Six independent Opus review agents each read one area in parallel. I read the contributing guide, the Beads context, and the prior audit in `docs/consistency-audit.md` first. I then spot-checked every High finding against the source before I accepted it.

The six areas were:

1. The owned core of `packages/components`: controls, internal helpers, utilities, theme, and styles.
2. Table, virtual rows, layout, and chart inside `packages/components`.
3. The `@wfe/form`, `@wfe/generator`, and `@wfe/shell` packages.
4. The 24 example directories and the shared fixtures.
5. Scripts, tests, CI, and documentation.
6. The six vendored subsets and the guards that protect them.

Each agent ran read-only commands only. No build, unit suite, qualification stage, or browser case ran during this audit. Line numbers refer to the current commit.

## 2. Summary

The owned source is clean at the mechanical level. The 121 owned TypeScript files hold 15,346 lines. They contain zero `any`, zero `as unknown as`, zero lint suppressions, and zero TODO comments. They contain zero `console` calls and four non-null assertions. There are no import cycles in any package. Every listener and observer the reviewers traced has a matching removal. Vendor provenance is exact: 303 of 303 recorded hashes match the files on disk.

The weaknesses are structural, not local. The same concept is often implemented more than once in different styles. The shared stylesheet carries Table rules and example rules. The commit gate skips the unit suite, and nothing type-checks the tests. Several documents describe an earlier state of the repository.

| Area                          | Cohesiveness | Code quality | Modularity |
| ----------------------------- | ------------ | ------------ | ---------- |
| Components core and styles    | 3            | 4            | 3          |
| Table, virtual, layout, chart | 3            | 4            | 4          |
| Form, generator, shell        | 3            | 4            | 4          |
| Examples                      | 3            | 3            | 3          |
| Scripts, tests, CI, docs      | 3            | 3            | 2          |
| Vendor boundary               | 2            | 4            | 3          |

Scores run from 1 (poor) to 5 (excellent). The pattern is consistent: quality of individual files is high, and cohesion across files is middling.

## 3. Cross-cutting themes

These ten themes appear in more than one area. They are the findings that matter most.

### T1. The shared stylesheet is a catch-all

`packages/components/src/styles/components.css` has 1,512 lines and 257 leaf rules. 118 rules (597 lines) style Table classes, even though `table-workspace.css` exists for that purpose. Eleven classes styled there appear only in example markup and nowhere in package source. I checked this list: `notice`, `after-table`, `global-search`, `result-count`, `empty-state`, `child-dataset`, `child-drafts`, `editing-lock`, `edited-marker`, `hidden-draft`, and `muted`. The rule at `components.css:408` turns every `<aside>` inside a UI scope into a warning box. `TableWorkspace` then undoes it at `table-workspace.css:41-46`.

This conflicts with two written rules. AGENTS.md says "Do not move application rules into components." `styles/README.md:6` says fixture page styles stay outside the package. A dead breakpoint also exists: `components.css:533` is overridden by the later rule at `:931`.

### T2. Two public prop dialects

Owned controls use `value`, `onValueChange`, `readonly`, and a boolean `invalid`. Wrappers over the vendored Kobalte primitives pass through `checked`, `onChange`, `readOnly`, and `validationState`. `SelectField` translates between the two at `Select.tsx:227-230`. The `onValueChange` signature also varies between `(value, event)` and `(value)`.

The `components/README.md:35-36` contract says `Field` supplies required, disabled, read-only, and invalid states to controls. Only nine controls read `FieldContext`. Combobox, Checkbox, Switch, RadioGroup, and raw `Select` never do, so `<Field disabled>` does not disable them.

Seven public subpaths re-export whole vendor type barrels with `export type *`. The `./select` subpath exposes 97 names, including bare `Root` and `useSelectContext`. The exported props types lack wrapper-only props such as `decoration`. Checkbox, Switch, and RadioGroup export no props types at all. The generator then copies runtime lists of variants, tones, and format keys from these types (`generator/src/shared.tsx:57,88,92`).

### T3. Two filter value models in Table

`TableFilter` takes a raw string value with a `kind` hint and injects an "All" choice (`TableFilter.tsx:10-24,138`). `TableColumnFilter` takes a structured `TableColumnFilterValue` object (`TableColumnFilter.tsx:16-23`). `TableHeaderFilter` accepts only the string model (`TableHeaderFilter.tsx:14-15`). When the filter is in the header, a column's `filterFn` receives a string. When the same filter is in the panel, the function receives an object. The editing example shows this at `examples/table-editing/Table.tsx:426`. Text filtering exists twice with different input-method handling. `ReadOnlyTable.tsx:309-385` chooses among three filter controls and two configuration callbacks.

### T4. Hard-coded English text

Components take `locale` props but fix their messages in English. The table layer is the largest case. `TableWorkspace` exposes `controlsLabel`, `toggleLabel`, and `closeLabel`, and `docs/table-workspace.md:152` says applications can localize them. `ReadOnlyTable` forwards only the title (`ReadOnlyTable.tsx:244`) and fixes about twenty other strings. `Table`, `TableFilter`, `TableGrouping`, and `TablePagination` do the same. In the core, `FileInput`, `Calendar`, `DatePicker`, `DateTimePicker`, `NumberInput`, `Toast`, `AlertDialog`, `StatusTile`, and `ValueDisplay` all contain fixed text. The generator and shell fix seven more strings. Layout is the exception. Almost every string there is a prop. Both the generator (`DeleteDescription.*Label`) and the layout show the pattern to follow.

### T5. Duplication by copy

Many helpers were copied instead of shared. The counts below come from the agents' greps.

| What                           | Copies     | Where                                                                                                                                                |
| ------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Event binding helper           | 3 styles   | `utils/nativeEvents.ts` and `internal/ownedEvents.ts:70-101` have the same body. JSX handlers also appear. `SidebarGroup.tsx` uses two of the three. |
| Popup Portal and Root wrappers | 3 each     | `Popover.tsx:11,91`, `DropdownMenu.tsx:12,175`, `Tooltip.tsx:11,55` are identical after renaming.                                                    |
| Select and Combobox content    | 2          | `Select.tsx:68-117` and `Combobox.tsx:61-110` are identical, 50 lines each.                                                                          |
| Column drag lifecycle          | 2          | `TableColumnMove.tsx:58-85,124-178` and `TableColumnResize.tsx:42-68,97-142`.                                                                        |
| Date range and year checks     | 4          | `Calendar.tsx:49-59`, `DatePicker.tsx:120-127`, `date.ts:7`, `dateTime.ts:39,46`.                                                                    |
| Generator validation helpers   | 3          | `gridModel.ts:4-28`, `chart/ChartView.tsx:20-43`, `shell/model.ts:9-30`.                                                                             |
| Columns and span validation    | 3          | `FormView.tsx:78-86`, `repeatedField.tsx:70-99`, `DetailView.tsx:34-49`.                                                                             |
| Browser runner setup           | 21 to 24   | 21 hand-written static servers, 22 console filters, 22 settle helpers across `examples/*/run*.mjs`.                                                  |
| Disposal workaround            | 39         | `action(function* () { dispose() })` in 20 example files. `components/main.tsx` alone holds 19.                                                      |
| Modified-click detection       | 5          | `Gallery.tsx:219`, `RecordsWorkflow.tsx:96`, `PlatformApp.tsx:171`, `ContextControls.tsx:93`, `SidebarControls.tsx:14`.                              |
| SHA-256 hashing                | 10 scripts | Each provenance guard hashes on its own.                                                                                                             |
| Recursive file walkers         | 9 scripts  | Same.                                                                                                                                                |
| Import parsing                 | 4 scripts  | Two use the TypeScript scanner, two use regular expressions.                                                                                         |
| Hydration Vite configuration   | 9 files    | Each differs from `grid/vite.hydration.config.ts` by two lines.                                                                                      |

The copied runner setups already drifted. Report entries are plain strings in six runners and `{name, status}` objects in five. The case filter variable is `BENCH_CASE` in one runner, `BENCH_CASE_PATTERN` in three, and absent elsewhere. Nine launchers ignore `BENCH_EXECUTABLE_PATH`. Only `generator/run.mjs` checks for path traversal in its static server. `generator/run.mjs` already exports a reusable `run()` that `wamn-generator` consumes. That is the pattern to extend.

The disposal workaround matters for Beads issue `wfe-0dj.4`. Retiring the workaround currently means 39 edits.

### T6. Hand-maintained lists and six manifest shapes

The same inventory lives in several places, and nothing checks the copies against each other.

- Integrity guards are listed in `package.json:19` (eight), in `audit-vendor.mjs:58-64` (five, re-run inside qualification), and as two extra stages in `qualify.mjs:37-42`.
- Example lists appear in `typecheck-examples.mjs` (20), `qualify.mjs:58-75` (16), `audit-vendor.mjs:407-414` (6), `run-previews.mjs` (4), and `examples/README.md:22` (8).
- `test-contracts.mjs:9-41` names 17 documents. Six documents with TypeScript fences are never compiled.
- `examples/theme`, `examples/accessor-profile`, and `examples/editing-overhead` have runners that no automated stage calls.

The six vendor subsets use six different `provenance.json` shapes. Kobalte records `revision` and `sources`. Charts records `revision`, `files`, and a separate `repairs` map. Calendar and match-sorter record `commit` and `sources` with upstream paths. Virtual-core records two flat hash maps. Icons records `tag`, `commit`, and per-icon hashes. Each guard enforces different rules. `check-charts.mjs` checks inventory, import closure, unreachable files, and a labelled repair per changed file. `check-virtual.mjs:15-20` checks a hard-coded list of four files and nothing else. A new file in `virtual-core` passes every guard.

### T7. Gaps in the quality gate

`pnpm check` runs `scripts/check.mjs`, which calls format, lint, integrity, build, types, example types, and the Node test runner. It does not run `test:unit`, `test:ssr`, or `test:contracts`. CONTRIBUTING.md:12 and README.md:34 present `pnpm check` as the commit gate that runs "the current tests". Only CI qualification runs Vitest.

No TypeScript project includes `tests/`. The root `tsconfig.json:24` includes only `packages/**`. The 83 unit files, about 19,170 lines and 551 test declarations, are never type-checked. Vitest strips types without checking them.

`pnpm test` runs `node --test` without `--test-concurrency=1`. Node runs test files in parallel by default. That suite includes real Vite builds (`tests/tooling/css-provenance.test.mjs:33`). This conflicts with the rule to run heavy checks serially. Vitest itself is correctly serial.

Three cosmetic assertions conflict with the CONTRIBUTING rule against asserting exact sizes: `tests/unit/chart.test.tsx:145` (`320px`), `scripts/test-ssr.mjs:750` (`--ui-control-height:32px`), and `examples/components/choice-cases.mjs:150-151` (a 16 by 16 marker). The rest of the corpus respects the rule. Zero color, font, or shadow assertions exist in `tests/` or the 45 case files.

### T8. Boundary blur

The package boundaries are clean. No example, generator, shell, or form file imports package `src`, `dist`, or `vendor`. The packages contain zero WAMN references. The blur is inside the layers.

- Examples import each other's source. `components/gallery/Preview.tsx:3` imports from `generator/`, and `generator/applications.tsx:3` imports from `components/gallery/`. That is a two-way dependency. `components/main.tsx:37-38`, `editing-overhead/main.tsx:5-10`, and `hydration/App.tsx:7-8` import `table-editing`, `components`, and `theme` source.
- The static import of the editing fixture pulls `table-editing/style.css` into the gallery build. That file imports `fixture-page.css`, which sets a global font, color, background, and `color-scheme: light` on `:root`. I checked that the DejaVu Sans Mono rule is present in `examples/components/.dist/assets/style-*.css`. The gallery therefore carries a second visual baseline. Whether the theme overrides it in the browser was not tested.
- `examples/platform` is a second application. It holds 5,214 lines of TypeScript, 2,108 lines of runners, a 9,798-line WAMN snapshot, and about 2,995 lines of tests. Its directory name is generic, but its title, README, and operation IDs are WAMN throughout. Unlike `wamn/` and `wamn-generator/`, it runs in the required gates. `PlatformApp.tsx:64-974` is one 910-line component that hand-writes navigation and heading focus that `ShellView` now provides.
- `components/StatusTile.tsx:5` imports `layout/Dashboard`, and `layout/` imports `components/` eleven times. That is a mutual directory dependency with no file cycle.
- Sixteen Kobalte vendor files import four owned helpers under `internal/`. `check-kobalte.mjs:54-56` permits this. Charts, by contrast, receives owned behavior through an option. The Kobalte dependency makes an upstream re-sync depend on owned code.
- `Tabs.tsx:10-13` and `Breadcrumbs.tsx:3-5` import vendor files directly. The other ten controls go through `internal/controls/*`.
- `theme/decorations.ts:13` hard-codes layout selectors. `buttons.css:121` and `surfaces.css:3` name Table classes. `DatePicker.tsx:156,202` uses Table filter class names.

### T9. Documentation drift

The documents are accurate at the link and name level. All 242 relative links and 61 repository paths resolve. 45 export names spot-checked from `docs/features.md` and 22 from `docs/generator-contract.md` matched the source. The drift is in statements about the state of the project.

- README.md:14 says "Use Git tag v0.0.7". Tag `v0.0.8` exists at `e4f8a6a`, and `docs/adoption.md:3-5` says to use it. `docs/qualification.md` has no v0.0.8 section, and its release sections are out of order.
- README.md:44 says the acceptance run "passes 47 stages". The current plan has 133 stages, or 152 with WAMN.
- `docs/qualification.md:28` says tile cases cover shadows. Those assertions were removed in `588b338`.
- `docs/consistency-audit.md:139-143,180,222` says the WAMN fixture still lays out its own virtual window and that `wfe-w2y.18` remains open. Beads shows it closed, and `examples/wamn/App.tsx:297` uses `VirtualRows`.
- `docs/README.md` omits four documents: the two investigation notes, `icons.md`, and `theme.md`.
- Vendor READMEs describe the old two-package layout (`kobalte/README.md:161,196,216-217`, `virtual-core/README.md:37`). README.md:59 and `docs/features.md:146` list four vendor subsets and omit match-sorter and icons.
- `examples/README.md:22` lists eight generic examples and omits five. Eight of 22 example directories have no README. `examples/components/index.html:6` still has the title "Table popup editing".
- `nativeEvents.ts:9` cites an rc.13 workaround while the pin is rc.16.
- Durable evidence for open issues points at `/tmp`: 18 references in the native-tab note, 4 in the action-disposal note, 3 in `qualification.md:68-70`, and 91 in `bench/heap-findings.md`.
- A 12-line block about StatusTile and TileRow appears verbatim in four documents.

### T10. Two theme systems

`uiScope(density, 'dark')` in `density.ts:33` activates the `data-ui-theme` palette in `theme.css:35-55`. `<Theme mode="dark">` uses `appearance.ts` and `default-theme.css`, which `styles.css:24` always imports. `styles/README.md:79-81` calls the first palette the library default. `docs/theme.md:3-5` calls `Theme` the default. These conflict.

`Theme.tsx:127` calls `uiScope()`, which defaults to compact density and marks the element `data-ui-density="compact"`. `Theme.tsx:158` then spreads `themeStyle(props)` after `scope.style`. `sizing.ts:16,20` sets `--ui-control-height: 32px` and `--ui-gap: 8px`, so the compact values are silently overridden while the attribute still says compact. `Theme` has no density prop.

## 4. Concrete defects

These are behaviors that look wrong today, independent of style. No running test checked them in this audit.

1. `TableColumnMove.tsx:141` reads `header.closest('.table-scroll')!` and `:154` adds a listener to it. A custom `Table` header outside that class throws on pointer down. `TableColumnResize.tsx:110,125` handles the same lookup safely.
2. `TableGrouping.tsx:190,247,251` label summary options with `String(column.columnDef?.header)` instead of `props.label(id)`. A column without a header shows "undefined summary". Caller labels are ignored.
3. `Theme` overrides compact density tokens while reporting compact density (see T10).
4. `Table.tsx:180-184` disables sorting under manual processing. `ReadOnlyTable.tsx:588-592` enables it. Manual filtering requires `onApplyFilters` (`ReadOnlyTable.tsx:197-199`), and grouping is disabled (`:413`). The two components disagree on one policy.
5. `scripts/audit-vendor.mjs:188-196` classifies all 74 chart vendor files as repository-owned with no upstream hash. Match-sorter is counted as owned UI in bundle grouping (`:352-358`). Only three of six subsets have replay flags.
6. `ShellView.tsx:274` uses the description ID as a raw DOM `id`. Two shells with the same description, or an ID with spaces, produce invalid or duplicate IDs. Every generator view uses `createUniqueId()` instead.
7. `components.css:408` styles every `<aside>` inside a UI scope as a warning box (see T1).
8. `scripts/build-source.mjs:69-74` copies only the icons license into `dist`. The other five vendor licenses are absent from the built trees. This is mitigated because `files` still packs `src` and the package is private.
9. `engine/filtering.ts:35` makes the global search depend on column visibility. Hiding a column changes which records match. `docs/table-filters.md` does not say so.
10. The Node floor is 22.12 (`package.json:7`), but `tests/source/source.test.mjs:3` imports `.ts` files directly, which needs type stripping. CI runs Node 24, so the floor is never tested.

One hypothesis is worth recording for open issue `wfe-47e`. `tableSelectionEvents.ts:209` scrolls the viewport directly. Only `scrollToKey` and `scrollToIndex` call `cancelAnchor()` in `createVirtualizer.ts:251,257`. A pending anchor restore queued at `:176` can therefore overwrite a keyboard reveal. A test that triggers a measurement change and then an arrow-key reveal will settle this.

## 5. Findings by area

Each area lists its High and Medium findings. Low findings are summarized in one paragraph. The theme tags refer to section 3.

### 5.1 Components core and styles

High:

- `components.css` carries Table, example, and bare element rules (T1).
- Prop vocabulary splits in two, and the `Field` contract holds for nine controls (T2).

Medium:

- Two theme systems and a density override in `Theme` (T10).
- `SelectContent` and `ComboboxContent` are identical. Three popup Portal and Root wrappers are identical. 71 `as Component<typeof props>` casts exist in `components/` (T5).
- Public types describe vendor primitives, not the styled wrappers. Seven files use `export type *` (T2).
- The export surface is uneven. `index.ts:59-60` re-exports `./table` and `./layout`, which duplicates the subpaths. The `./theme` subpath exposes 16 values including palette internals. Calendar, DatePicker, DateTimePicker, ValueDisplay, FormLayout, StatusTile, and `Icon` have no subpath. `./events` maps to `utils/nativeEvents` while `internal/events.ts` is a different helper with the same name.
- Date logic is duplicated, and `Calendar.tsx:61,68,245,268` builds `Intl.DateTimeFormat` directly instead of using the bounded cache in `utils/intlFormat.ts`. Today is taken in UTC at `DatePicker.tsx:151`.
- Hard-coded English text in nine controls (T4).
- Layering leaks between theme, CSS, Table, and layout (T8).
- Three event mechanisms (T5).

Low: `internal/index.ts` has no importers. `ownedSelectEvents` is unused. `--ui-theme-shadow-1/2/3`, `--ui-handle-border`, and `--ui-shadow-overflow` are never read. `ThemeOptions.depth` has no effect. `data-date-invalid` has no consumer. Fourteen custom properties have different literal fallbacks, for example `--ui-border` falls back to `#ccc` 18 times and `#bbb` 18 times. Thirteen owned classes lack the `ui-` prefix. `TabsTrigger` hard-codes `data-tone="default"`, which is not a `ButtonTone`. `DialogTrigger` lacks `data-ui`, so dialogs mount one scope higher. Six compound exports lack `/* @__PURE__ */`. `FileInput`, `Calendar`, and `ResizeHandle` are 300-line single functions. `@types/d3-scale` sits under `dependencies`.

### 5.2 Table, virtual, layout, chart

High:

- Two filter value models (T3).
- Hard-coded English and dropped label props in `ReadOnlyTable` (T4).

Medium:

- `TableColumnMove` crash outside `.table-scroll` (defect 1).
- `TableGrouping` ignores the label callback (defect 2).
- Manual processing policy differs between `Table` and `ReadOnlyTable` (defect 4).
- Three popup mechanisms. `TableHeaderFilter.tsx:29-39` hand-positions a native popover and repositions on every capture-phase scroll. `TableColumnMove.tsx:242-243` assumes menu sizes of 188 and 190 pixels. Close and clear buttons render text glyphs `×`, `✎`, and `↑↓↕` while `TableFilter` uses `Icon`. This contradicts the prior audit's statement that icons share one owner.
- The drag lifecycle is duplicated, and `onActivity` reports hard-coded listener counts (T5).
- Three event binding styles (T5).
- Two selection concepts. The engine keeps `rowSelection` (`engine/types.ts:65,135-136`), which no library component uses but two examples do. `createTableSelection` is a separate rectangular model. `docs/table-selection.md` never mentions `rowSelection`.
- `ReadOnlyTable` sections cannot be reused. The analytics example rebuilds the display-columns section with different wording (`examples/analytics/Table.tsx:256-272`), which contradicts `docs/table-workspace.md:165`.
- Table CSS lives in two files with unprefixed class names. The 48rem breakpoint is hard-coded in TypeScript (`TableWorkspace.tsx:301`, `Dashboard.tsx:117`) and repeated 13 times in CSS. These are viewport queries, so a workspace inside a narrow panel never switches to the drawer.
- The engine API is largely undocumented. `table/index.ts` exports every engine type. Nine engine options have JSDoc only. `engine/index.ts:1` exports the factory under two names, and the docs use both.
- The `wfe-47e` hypothesis (section 4).

Low: `engine/table.ts:53` scans `ids().includes(id)` on every missing-record read. `engine/grouping.ts:25` allocates an array per record. The `table` prop is captured once without a replacement guard. The virtualizer reaches into vendor internals and names a signal `window`. `TableSelection` is a `ReturnType`, so internals are public. Selection painting scans every mounted cell. `nativeSelectionMirror.ts:326-327` uses magic range constants. Callback parameter types mix IDs and columns in `ReadOnlyTable.tsx:89-97`. `chart/index.ts:3` re-exports two scales directly from d3 while the others come from the vendor copy. Ten table files and `DashboardShell` have no direct unit tests.

### 5.3 Form, generator, shell

High: none.

Medium:

- Raw description ID as DOM `id` in `ShellView` (defect 6).
- Generator and shell write component CSS class strings instead of using components. `repeatedField.tsx:281,297`, `DetailView.tsx:107`, and `DeleteView.tsx:104` write `ui-form-actions` while `FormView` uses `FormActions`. `LayoutView.tsx:110,166` uses classes that exist only in CSS. `LayoutView.tsx:177-186` recomputes the grid sizing from `layout.css:80`.
- Validation helpers copied three times (T5). Unknown keys are rejected by Grid, Chart, and Shell and accepted silently by Form, Table, Layout, Detail, and Delete.
- Runtime copies of component enumerations (T2).
- The description vocabulary is not uniform. Disabled and read-only are bindings in Form and metadata in Grid. Labels are optional in Form and required in Grid, Shell, Delete, and Chart. `TableView` accepts an empty column label. Chart formatters are typed as `Record<string, ...>` rather than derived from the description. Root data attributes differ per view. `ActionBinding.run` is the only callback not named `on*`. Only `ShellView` accepts a `class` prop.
- Seven fixed English strings (T4).

Low: `FormView.tsx:304,307` uses `<p role="alert">` while the same form uses `InlineAlert`. `scalarField.tsx:264-307` duplicates the Checkbox and Switch branches and has no exhaustiveness check. Two focus-eligibility rules exist in `repeatedField.tsx:135-159` and `reorderFocus.ts:40-50`. `FormView.tsx:210-234` rebuilds JSON keys for every row and field on each keystroke. Ten inline style objects exist. `createForm.cancel()` wipes settled feedback, an `onSubmit` that publishes values before resolving cancels its own attempt, and disposal has no `getOwner()` guard. `FormValues` is exported and used nowhere. Three description types used inside exported types are not exported. Twenty-four exports appear in no document. The generator and shell `tsdown` configurations omit `unbundle: true`, so they emit hashed shared chunks. The shell is a parallel model to `LayoutDescription` with a different view signature. The documents call this deliberate.

### 5.4 Examples

High:

- Cross-example source imports, a two-way pair, and the fixture stylesheet in the gallery bundle (T8).
- The runner setup is copied and drifted (T5).

Medium:

- `examples/platform` is a second application under a generic name (T8).
- Appearance is applied in three ways. Five hosts use the full `AppearanceReview`. Four use `DefaultAppearance` only. Nine use neither. Four hosts spread `uiScope()` by hand instead of using `<Theme>`. Default scheme, accent, depth, and layers differ per host and from `docs/component-gallery.md:42`.
- The disposal workaround is copied 39 times (T5).
- Nine near-identical hydration Vite configurations bypass the `examples/vite-config.ts` repository-escape guard. Hydration has three runner entry conventions and four client entry names.
- About 33 unconditional screenshots write to fixed `/tmp` paths on success. Source, package, and development runs overwrite each other. CI uploads only `test-results/qualification`.
- Documentation and list drift (T9).
- Very large units: `table-editing/Table.tsx:59-1195` is one component, `PlatformApp` is 910 lines, `table-editing/run.mjs` has 47 inline cases, and `wamn-generator/review.mjs` has one 678-line function.

Low: `analytics/fixed-window.ts` is unused. `components/prepare.mjs` is a stub. `components/KOBALTE_LICENSE.md` is referenced only by migration records. Alias shims such as `exampleSizing` hide the public API the examples exist to show. `check-controls.mjs` guards deep imports for components only, not form, generator, or shell. No guard rejects imports between examples. `shared/appearance/style.css:41-46`, `gallery.css:183-187`, and `generator/style.css:64-66` restyle shared controls, which `docs/component-gallery.md` says the gallery does not do. Mock services use five naming styles.

### 5.5 Scripts, tests, CI, docs

High:

- The unit suite is never type-checked (T7).
- `pnpm check` omits the unit suite while the docs present it as the gate (T7).

Medium:

- `pnpm test` runs in parallel (T7).
- Hand-maintained lists (T6).
- Provenance guards reimplement hashing, walking, and import parsing (T5, T6).
- `audit-vendor.mjs` has dead two-package scaffolding at `:32,45,145` and misclassifies charts (defect 5).
- `scripts/test-ssr.mjs` is one 809-line top-level sequence with 110 asserts, mid-file imports, four copies of a warning capture, and no case names. The first failure stops everything with no case name in the error.
- Twenty-four runners copy one setup and write 49 fixed `/tmp` paths in 27 files (T5).
- The Node floor conflicts with type stripping (defect 10).
- Stale release documents (T9).

Low: `qualify.mjs --affected` selects only `docs/contracts/` and depends on `NX_BASE` with no Nx in the repository. The qualification test fixture names a workflow file that does not exist. `qualify.mjs` duplicates its mode block and eight hydration stage blocks. Two unit tests use wall-clock waits. Seven of 83 unit files use camelCase names. There is no Vitest setup file, so 47 files re-declare `afterEach`. Twenty-one unit files test example applications alongside component tests. `migration/` is a historical record: only `inventory.json` is read, four planned destinations never existed, and `dependency-integrity.json` is referenced nowhere although it supports a `trustPolicyExclude` entry. `bench/heap-findings.md` is 1,843 lines from the original repository and references missing files. Three manual scripts are wired to nothing. `check.yml` has no timeout, no concurrency group, and no store cache. `@vitest/coverage-v8` and `publint` are pinned but unused by scripts. `test-results/` holds 83 MB in 136 directories and nothing prunes it.

### 5.6 Vendor boundary

High:

- `audit-vendor.mjs` labels 76 vendored files as repository-owned and can replay repairs for only three of six subsets (defect 5).

Medium:

- Six manifest shapes and five different guard rule sets (T6).
- Kobalte is reformatted with Prettier, so 215 of 215 sources differ from upstream and behavior repairs cannot be located from the manifest. Charts keeps upstream formatting, so 12 of 74 files differ and each carries an enforced repair label. No vendor file has an inline repair marker.
- Sixteen Kobalte files import four owned helpers, and the guard allows it (T8).
- The wrapper pattern is not uniform. Ten `internal/controls/*.ts` files are one-line re-exports that add nothing. Tabs and Breadcrumbs bypass them. Eleven components import `PolymorphicProps` from the vendor path directly. Seven subpaths export whole vendor type barrels. Nothing documents that vendor types are supported public API.
- Built output ships vendor code without five of the six licenses (defect 8).
- Vendor documentation describes the old two-package layout (T9).

Low: `audit-vendor.mjs` keeps `const core = ui` and similar leftovers. Kobalte `entryPoints` lists `tabs` and `breadcrumbs` beside real paths and is read by no script. Four chart scale barrel files are reachable from nothing, and one 201-character repair string is repeated nine times. Eight Kobalte symbols are dead, and `@internationalized/number` is a runtime dependency only because of one unused file. The scroll patch in `patches/README.md` records no hashes, and no script checks either patch beyond the lockfile. Three example runners hard-code Kobalte directory names in bundle probes. `check-kobalte.mjs:21-23` inventories only `.ts`, `.tsx`, and `.md` files.

## 6. Strengths to preserve

- Type and runtime hygiene across all owned packages: zero `any`, zero cast escapes, zero suppressions, zero stray logging.
- No import cycles in any package, including across the vendor boundary.
- Complete listener, observer, timer, and frame cleanup, with `alive` and `disposed` guards applied consistently.
- The table engine: decorate-once stable sort, lazy memos with equality guards, group membership separate from aggregates, per-match filter value reuse, and store reconciliation that keeps unchanged entries.
- The `createForm` state machine: one active attempt with an increasing ID, re-synchronization before every publish, distinct disposed status, and frozen snapshots that never freeze application rows.
- Type-level binding derivation in the generator, backed by 74 negative `@ts-expect-error` contract cases.
- Clean ownership: no requests, caching, persistence, routing, permissions, or domain words in any package.
- Exact provenance: 303 of 303 hashes match, every license is byte-identical, and the 1,903 icons are reproducible from the generator with matching hashes.
- `check-charts.mjs` is the model guard: inventory, import closure, unreachable-file detection, and a labelled repair per changed file.
- The qualification runner: fail-fast, per-stage logs, incremental summary, and a tested first-failure path.
- Serial Vitest, pinned CI actions with read-only permissions, and consistent dependency pins.
- The cosmetics rule is respected almost everywhere: zero color, font, or shadow assertions in tests.
- Documentation links and names are accurate: 242 links, 61 paths, and 67 export names all resolve.
- Shared helpers that work and are widely used: `styledClasses`, `buttonAttributes`, `ControlFrame`, `FieldContext`, `portalMount`, `intlFormat`, and `temporary-source.mjs`.
- Example conventions that hold: 19 of 21 Vite configurations are the two-line `exampleConfig`, and 35 fixtures follow the `window.<name>Fixture` convention. Selectors favor roles, with 1,434 `getByRole` calls against 66 class locators.

## 7. Suggested order of work

This audit made no edits. The list below is a proposal for Beads issues, in dependency order. Each item is sized for one focused issue.

1. Close the gate gaps first. Add `test:unit` to `check.mjs`, add a `tests/tsconfig.json` to the types stage, and add `--test-concurrency=1` to `pnpm test`. Fix the three cosmetic assertions. This is small and protects every later change.
2. Correct the stale documents: README release tag and stage count, a v0.0.8 qualification record, the consistency audit's closed follow-up, the docs index, and the vendor READMEs.
3. Move example-only rules out of `components.css` into example CSS, and move Table rules into `table-workspace.css`. Replace the bare `aside` and `table` selectors with classes.
4. Fix the four behavior defects: `TableColumnMove` crash, `TableGrouping` label, `Theme` density override, and manual processing policy. Add a `Table` prop replacement guard at the same time.
5. Unify the Table filter contract around `TableColumnFilterValue`, with `TableHeaderFilter` hosting `TableColumnFilter`.
6. Add one `labels` or `messages` convention. Apply it to `ReadOnlyTable`, `Table`, `TableGrouping`, and `TablePagination`. Then apply it to the date controls, `FileInput`, and the generator views.
7. Collapse the duplicated helpers inside components: one event helper, one popup wrapper factory, shared choice parts, shared drag lifecycle, and shared date range checks.
8. Resolve the two prop dialects. Either adapt the Kobalte roots as `Tabs` does or document the split. Then write one props type per styled part and stop `export type *`. Add `Field` support to Combobox, Checkbox, Switch, and RadioGroup. Export `as const` enumerations so the generator can stop copying them.
9. Build a shared runner module in `examples/shared` from `generator/run.mjs`, then convert runners one at a time. Add `mountFixture()` so the disposal workaround has one home before `wfe-0dj.4` retires it. Add a guard against cross-example imports and break the components and generator pair.
10. Create `scripts/lib/` for hashing, walking, import parsing, and inventory checking. Normalize the six manifests to one shape with one checker modelled on `check-charts.mjs`. Fix `audit-vendor.mjs` classification and copy all vendor licenses into `dist`.
11. Decide the status of `examples/platform`. One option is to rename it beside the other WAMN directories and move it to the optional stages. The other option is to document why a WAMN-bound application is in the required gates. Split `PlatformApp` by screen and evaluate `ShellView` for its routing chrome.
12. Reduce the theme to one palette owner and give `Theme` a density prop.

## 8. Limits of this audit

No build, test suite, qualification stage, or browser case ran. All defects are read from source and are not reproduced. The gallery stylesheet leak is visible in the built CSS but not observed in a browser. The `wfe-47e` hypothesis is not tested. The agents' counts came from `git grep`, `command grep`, and small Node scripts. In this shell, plain `grep` is wrapped by ugrep and honors `.gitignore`, so one agent re-ran its counts with `command grep`. Helper scripts remain in the session scratchpad and touch no repository file.
