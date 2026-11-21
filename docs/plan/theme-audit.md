# Theme preset audit

This audit compares the three theme presets: Sketchy (`default`), Vanilla (`vanilla`) and Laser (`laser`).
It covers style sheets, theme code, and the gallery defaults.
It proposes one token base and an ordered cleanup plan.
The owner asked for the plan to be carried out. Part 6 records what the cleanup did.
Parts 1 to 5 describe the state before the cleanup, at commit 24aecd2.
Beads issue: wfe-w2y.71.

Paths start at `packages/components/src/` unless they start with `examples/` or `docs/`.
Line numbers in parts 1 to 5 refer to commit 24aecd2 on the branch `feat/theme-audit`.
The theme explorer example (`examples/theme-explorer`) confirmed the measured values in this audit.
The measurements come from Chromium at 1440 by 900 pixels.

## Summary

| Measure                                                | Count          |
| ------------------------------------------------------ | -------------- |
| Style sheets in `styles/`                              | 37             |
| Preset-scoped rules (all presets)                      | 178            |
| Sketchy-only rules                                     | 88             |
| Rules shared by Vanilla and Laser (`plain-theme.css`)  | 38             |
| Vanilla-only rules                                     | 4              |
| Laser-only rules                                       | 48             |
| Component classes named by preset rules                | 98             |
| Distinct `--ui-*` tokens that theme code writes inline | 133            |
| Tokens that Sketchy writes on each Theme root          | 115            |
| Vanilla tokens that rewrite a Sketchy token            | 60 of 60       |
| Laser tokens that rewrite a Vanilla token              | 20 of 52       |
| `var(--x, fallback)` uses in `styles/`                 | 1057           |
| Tokens with more than one literal fallback             | 21             |
| Raw pixel values outside fallbacks (not 0 or 1 px)     | 224            |
| Copies of the dot pattern gradient                     | 10             |
| `!important` declarations                              | 1              |
| Tokens that code sets but never reads                  | 5              |
| Components that change markup by preset                | 3              |
| Gallery entries reviewed                               | 47 in 7 groups |

The most important findings:

1. Theme writes every token as an inline style on the Theme root (`theme/Theme.tsx:244`). Consumer style sheets cannot override a preset token without the `style` prop. The CSS sheets hold no token defaults for a Theme scope.
2. Presets restyle components with 178 selector rules. Tokens alone do not describe a preset.
3. Laser sits on top of Vanilla in two layers. `theme/laser.ts:47` calls `vanillaStyle`, and `styles/plain-theme.css:2` serves both. Vanilla then undoes parts of the shared plain layer (`styles/plain-theme.css:192`).
4. The three presets give different focus, hover, selection and disabled behavior. Sketchy disabled buttons look the same as enabled buttons.
5. Seven surface tokens, three hover tokens, and three focus tokens overlap in meaning. `--ui-muted-surface` means a content surface in Sketchy and a hover tint in Vanilla and Laser.

## How the presets relate

- `Theme` builds the token set in TypeScript and writes it inline (`theme/Theme.tsx:91`, `theme/Theme.tsx:244`).
- All presets start from `resolveThemeSizing` and `appearanceStyle` (`theme/Theme.tsx:110`, `theme/Theme.tsx:111`). That is the Sketchy token set.
- Vanilla then spreads `vanillaStyle` over it (`theme/Theme.tsx:160`). Vanilla rewrites 60 tokens.
- `Theme.tsx` then rewrites the three Vanilla surfaces a second time (`theme/Theme.tsx:171`).
- Laser spreads `laserStyle` over the Sketchy set (`theme/Theme.tsx:189`). `laserStyle` first calls `vanillaStyle` (`theme/laser.ts:47`) and then rewrites 20 of those Vanilla tokens (`theme/laser.ts:53`).
- `styles/default-theme.css:5` scopes Sketchy rules. It also matches a `.ui-theme` without a preset attribute.
- `styles/plain-theme.css:2` scopes rules for both Vanilla and Laser. This is the "plain" layer. It is not a separate preset.
- `styles/plain-theme.css:192` scopes Vanilla-only rules.
- `styles/laser-theme.css:2` and `styles/laser-theme.css:535` scope Laser-only rules.
- Three more sheets hold preset scopes: `styles/choice-selection.css:30`, `styles/choice-selection.css:44`, `styles/choice-selection.css:102`, `styles/tree.css:58`, `styles/tree.css:67` and `styles/disclosure.css:42`.
- Three components render different markup by preset: `components/Icon.tsx:53`, `components/DisclosureIndicator.tsx:24` and `gantt/Gantt.tsx:97`.
- Only Sketchy starts the decoration controller (`theme/Theme.tsx:214`).

## Part 1. Component comparison

### 1.1 Measured geometry

The theme explorer measured these values. Each preset used its gallery defaults.

| Component      | Property         | Sketchy | Vanilla | Laser   | Mechanism                                                                     |
| -------------- | ---------------- | ------- | ------- | ------- | ----------------------------------------------------------------------------- |
| Button         | height           | 32      | 32      | 32      | shared token                                                                  |
| Button         | padding-x        | 10      | 8       | 8       | token (`theme/sizing.ts:21`, `theme/vanilla.ts:83`)                           |
| Button         | radius           | 0       | 6       | 999     | token                                                                         |
| Input          | padding-x        | 10      | 8       | 12      | token plus a Laser-only selector (`styles/laser-theme.css:137`)               |
| Select trigger | padding-x        | 10      | 8       | 8       | token                                                                         |
| Textarea       | height           | 42      | 46      | 46      | line-height token (`theme/sizing.ts:12`, `theme/vanilla.ts:30`)               |
| Textarea       | radius           | 0       | 6       | 20      | Laser selector (`styles/laser-theme.css:147`)                                 |
| Checkbox       | radius           | 0       | 6       | 6       | token (`theme/laser.ts:85`)                                                   |
| Switch         | radius           | 0       | 999     | 999     | token (`theme/vanilla.ts:45`)                                                 |
| Field group    | radius           | 0       | 8       | 20      | plain selector (`styles/plain-theme.css:37`)                                  |
| Field group    | padding          | 16      | 12      | 12      | token (`theme/vanilla.ts:86`)                                                 |
| Table header   | font weight      | 500     | 600     | 600     | token (`theme/vanilla.ts:34`)                                                 |
| Table row      | height           | 32      | 32      | 32      | shared token                                                                  |
| Label          | font weight      | 400     | 500     | 500     | token (`theme/sizing.ts:14`, `theme/vanilla.ts:33`)                           |
| Focus outline  | width and offset | 1 and 0 | 2 and 2 | 1 and 2 | token (`theme/appearance.ts:157`, `theme/vanilla.ts:75`, `theme/laser.ts:87`) |

Within Laser itself, inputs use 12 px padding and select triggers use 8 px. The cause is `--ui-input-min-padding-x` (`theme/laser.ts:86`). Only `.ui-input` and `.choice-input` read it (`styles/laser-theme.css:137`).

### 1.2 Per component family

| Gallery family           | Sketchy                                                                                               | Vanilla                                                                                                   | Laser                                                                                                                        |
| ------------------------ | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Buttons and icon buttons | Dotted backing on hover and selection (`styles/default-theme.css:59`, `styles/default-theme.css:100`) | Highlight fill on selection (`styles/plain-theme.css:23`)                                                 | Glow, tint and transparent border (`styles/laser-theme.css:240`). Icon buttons lose their box (`styles/laser-theme.css:372`) |
| Inputs, select, textarea | Decoration backing (`styles/default-theme.css:472`)                                                   | Base hover only                                                                                           | Outer frame glow and tint (`styles/laser-theme.css:297`)                                                                     |
| Checkbox, radio, switch  | Base paint (`styles/states.css:85`)                                                                   | Accent fill (`styles/plain-theme.css:48`)                                                                 | Accent fill plus glow (`styles/laser-theme.css:223`)                                                                         |
| Choice options and tree  | Transparent fill with decoration (`styles/choice-selection.css:44`)                                   | Highlight fill, no outline (`styles/choice-selection.css:30`)                                             | Tint plus glow, no outline (`styles/choice-selection.css:102`)                                                               |
| Tabs                     | Selected border in accent (`styles/tabs.css:15`) plus backing                                         | Highlight fill (`styles/plain-theme.css:23`)                                                              | Transparent border, tint and glow (measured)                                                                                 |
| Popups, dialogs, menus   | No shadow (`theme/appearance.ts:179`)                                                                 | Soft shadow (`theme/vanilla.ts:80`)                                                                       | Glow shadow (`styles/laser-theme.css:106`)                                                                                   |
| Menu items               | Inset focus ring (`styles/components.css:519`)                                                        | Same                                                                                                      | No ring. Text color and text glow only (`styles/laser-theme.css:498`)                                                        |
| Table header actions     | Muted color remap (`styles/default-theme.css:325`)                                                    | Borders removed (`styles/plain-theme.css:195`)                                                            | Glyph-only paint (`styles/laser-theme.css:372`)                                                                              |
| Sub-table toggle         | Transparent full-width box (`styles/table.css:372`)                                                   | Plain adds a border (`styles/plain-theme.css:70`), then Vanilla removes it (`styles/plain-theme.css:195`) | Bordered 24 px square (`styles/plain-theme.css:75`)                                                                          |
| Calendar days            | Dotted range fill (`styles/default-theme.css:648`)                                                    | Borderless days (`styles/plain-theme.css:204`)                                                            | Text glow, no outline (`styles/laser-theme.css:446`)                                                                         |
| Sidebar and navigation   | Token remap and flyout padding (`styles/default-theme.css:171`, `styles/default-theme.css:175`)       | Flat rows (`styles/plain-theme.css:98`)                                                                   | Flat rows plus text glow (`styles/laser-theme.css:203`, `styles/laser-theme.css:466`)                                        |
| Dashboard panes          | Pane surface (`styles/default-theme.css:15`)                                                          | Same rule again (`styles/plain-theme.css:3`)                                                              | Same as Vanilla                                                                                                              |
| Cards and field groups   | Base (`styles/components.css:535`)                                                                    | Radius rule (`styles/plain-theme.css:37`)                                                                 | Radius, border and shadow rules (`styles/laser-theme.css:121`, `styles/laser-theme.css:131`)                                 |
| Gantt                    | Dotted progress (`styles/default-theme.css:635`, `gantt/Gantt.tsx:97`)                                | Flat progress (`styles/plain-theme.css:179`)                                                              | Flat progress, pill bars (`styles/laser-theme.css:521`)                                                                      |
| Disclosure arrows        | 10.5 by 15.75 px (`styles/default-theme.css:356`)                                                     | 12 by 16 px chevron (`styles/plain-theme.css:86`)                                                         | Same as Vanilla                                                                                                              |
| Kanban                   | Base                                                                                                  | Base                                                                                                      | Glow on hover (`styles/laser-theme.css:134`)                                                                                 |

### 1.3 Selector overrides that a token could replace

These 18 rules set a value with a preset selector. A token in the base rule would do the same job.

1. Dashboard pane and main surfaces repeat in two presets (`styles/default-theme.css:10`, `styles/default-theme.css:15`, `styles/plain-theme.css:3`, `styles/plain-theme.css:13`). No base rule sets them.
2. Panel shadow on dashboard panels is Sketchy only (`styles/default-theme.css:25`). Laser sets it on cards and field groups (`styles/laser-theme.css:121`). The base reads `--ui-panel-shadow` in only four places (`styles/diagrams.css:82`, `styles/status-tiles.css:6`, `styles/table-workspace.css:16`, `styles/table-workspace.css:466`).
3. Outline button color for the default tone (`styles/plain-theme.css:19`). `theme/Theme.tsx:139` and `theme/laser.ts:78` set `--ui-button-color` to the accent. The selector then forces text color. Token and selector disagree.
4. Selected paint for buttons, menu links and tabs (`styles/plain-theme.css:23`, `styles/laser-theme.css:189`).
5. Card, field group and entry panel radius (`styles/plain-theme.css:37`). `styles/components.css:538` already reads `--ui-panel-radius` for cards.
6. Tab and menu link radius (`styles/plain-theme.css:16`). Tab triggers already carry `ui-button` (`components/Tabs.tsx:76`), which reads the control radius (`styles/buttons.css:11`).
7. Checked checkbox and switch fill (`styles/plain-theme.css:48`, `styles/plain-theme.css:56`, `styles/plain-theme.css:59`).
8. Radio checked color (`styles/plain-theme.css:62`).
9. Sub-table toggle and page action box (`styles/plain-theme.css:70`).
10. Disclosure indicator size (`styles/default-theme.css:356`, `styles/plain-theme.css:86`).
11. Field group border in Laser (`styles/laser-theme.css:131`).
12. Input padding in Laser (`styles/laser-theme.css:137`).
13. Field frame radius in Laser (`styles/laser-theme.css:143`). The base already reads `--ui-control-radius` (`styles/fields.css:140`).
14. Textarea radius in Laser (`styles/laser-theme.css:147`).
15. Checkbox radius in Laser (`styles/laser-theme.css:518`). `styles/components.css:325` already reads `--ui-checkbox-radius`.
16. Gantt bar radius (`styles/plain-theme.css:183`, `styles/laser-theme.css:521`).
17. Listbox padding and option margin in Sketchy (`styles/choice-selection.css:49`, `styles/choice-selection.css:74`).
18. Sidebar flyout padding in Sketchy (`styles/default-theme.css:171`).

### 1.4 Values defined in more than one place

There are 14 cases.

1. Theme writes 115 tokens inline for Sketchy. Then the gallery passes `appearanceStyle` again as `style` (`examples/components/gallery/Gallery.tsx:140`, `examples/components/gallery/Preview.tsx:315`). That writes 64 tokens twice.
2. Six sizing tokens come from both `uiScope` and `themeSizing` (`styles/density.ts:41`, `theme/sizing.ts:19`). Examples are `--ui-gap` and `--ui-control-height`.
3. Vanilla surfaces 2 to 4 come from `theme/vanilla.ts:21` and again from `theme/Theme.tsx:171`.
4. Laser writes 20 tokens that Vanilla wrote one step earlier (`theme/laser.ts:47`, `theme/laser.ts:53`).
5. Gallery layer defaults copy the preset defaults. Compare `examples/shared/appearance/galleryConfig.ts:22` with `theme/vanilla.ts:46` and `theme/laser.ts:47`.
6. The Laser dark default lives in four places: `theme/Theme.tsx:92`, `examples/components/gallery/catalog.ts:303`, `examples/components/gallery/catalog.ts:328` and `examples/components/gallery/Gallery.tsx:303`.
7. Dashboard pane surfaces (`styles/default-theme.css:15`, `styles/plain-theme.css:3`).
8. The decoration engine selector (`theme/decorations.ts:13`) repeats the CSS selector list in `styles/default-theme.css:407`.
9. The dot pattern gradient exists 10 times (`theme/appearance.ts:166` and nine copies in `styles/default-theme.css`, starting at line 196).
10. Three visually hidden rules: `styles/components.css:171`, `styles/dnd.css:1` and `styles/file-input.css:11`. One uses `clip`, the other two use `clip-path`.
11. Laser repeats its disabled guard list three times (`styles/laser-theme.css:159`, `styles/laser-theme.css:258`, `styles/laser-theme.css:305`).
12. Laser repeats its glyph button list twice with different members (`styles/laser-theme.css:372`, `styles/laser-theme.css:423`). The first list excludes `.choice-toggle` and the second does not.
13. Vanilla repeats its embedded action list twice (`styles/plain-theme.css:195`, `styles/plain-theme.css:213`).
14. Sketchy repeats its action exclusion list three times (`styles/default-theme.css:39`, `styles/default-theme.css:64`, `styles/default-theme.css:134`). `styles/buttons.css:122` holds a fourth, shorter list.

### 1.5 Fallbacks that disagree

`styles/` has 1057 `var(--x, fallback)` uses across 169 tokens.
21 tokens have more than one literal fallback. The worst cases:

| Token                    | Fallbacks                            | Example locations                                                                                                                  |
| ------------------------ | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `--ui-gap`               | 6px (97), 8px (17), 5px (7)          | `styles/calendar.css:3`, `styles/clock.css:3`, `styles/components.css:491`                                                         |
| `--ui-border`            | #ccc (18), #bbb (19), #888 (1)       | `styles/surfaces.css:8`, `styles/surfaces.css:14`, `styles/dnd.css:14`                                                             |
| `--ui-control-height`    | 26px (20), 32px (10)                 | `styles/buttons.css:123`, `styles/layout.css:418`                                                                                  |
| `--ui-icon-stroke-width` | 1.5, 1px, 2, 1.25, 1.2               | `styles/components.css:2`, `styles/components.css:15`, `styles/components.css:346`, `styles/fields.css:80`, `styles/table.css:458` |
| `--ui-text`              | currentColor, #000, #191919, #262626 | `styles/breadcrumbs.css:25`, `styles/buttons.css:39`, `styles/collapsible.css:28`, `styles/table.css:669`                          |
| `--ui-heading-weight`    | 500 (11), 600 (7), 650 (2)           | `styles/default-theme.css:353`, `styles/components.css:498`, `styles/components.css:426`                                           |
| `--ui-muted-surface`     | #f2f2f2, #eee, #f0f0f0               | `styles/components.css:552`, `styles/components.css:599`, `styles/states.css:74`                                                   |
| `--ui-muted-text`        | currentColor, #666, #555             | `styles/breadcrumbs.css:28`, `styles/calendar.css:33`, `styles/components.css:265`                                                 |
| `--ui-accent`            | currentColor, #1971c2, #1c7ed6       | `styles/file-input.css:54`, `styles/components.css:712`, `styles/table.css:676`                                                    |
| `--ui-disabled-opacity`  | 1 (3), 0.5 (3)                       | `styles/states.css:57`, `styles/laser-theme.css:404`, `styles/tree.css:22`                                                         |
| `--ui-focus`             | #1657a8 (12), Highlight (1)          | `styles/states.css:23`, `styles/charts.css:53`                                                                                     |
| `--ui-focus-width`       | 1px (14), 2px (3)                    | `styles/states.css:22`, `styles/clock.css:31`, `styles/diagrams.css:138`                                                           |
| `--ui-surface`           | white (34), #fff (5)                 | `styles/buttons.css:9`, `styles/buttons.css:40`                                                                                    |

Many fallbacks never apply. `styles/legacy-palette.css:3` defines 12 tokens on `:root`, including `--ui-border`, `--ui-text` and `--ui-surface`. Any page that imports `styles.css` therefore skips those 37 `--ui-border` fallbacks.

The fallbacks also disagree with the Theme values. The `--ui-focus` fallback is `#1657a8`, but Sketchy blue is `#1971c2` (`theme/palette.ts:43`). The `--ui-control-height` fallback is 26px, but Theme uses 32px (`theme/sizing.ts:19`).

### 1.6 Geometry that only one preset changes

1. Laser inputs get 12 px padding (`theme/laser.ts:86`, `styles/laser-theme.css:137`).
2. Laser textareas use the panel radius (`styles/laser-theme.css:147`).
3. Laser field groups and field sets add a border (`styles/laser-theme.css:131`).
4. Sketchy flyouts add 12 px padding (`styles/default-theme.css:171`).
5. Sketchy option rows add 2 px margins and the listbox gets 6 px padding (`styles/choice-selection.css:49`, `styles/choice-selection.css:74`).
6. Sketchy disclosure arrows are 10.5 by 15.75 px with a 4/7 scale (`styles/default-theme.css:356`, `styles/default-theme.css:364`). Plain arrows are 12 by 16 px (`styles/plain-theme.css:86`).
7. Plain sidebar groups add padding, a rail margin and an indent (`styles/plain-theme.css:99`, `styles/plain-theme.css:129`).
8. Plain sub-table toggles become 24 px squares (`styles/plain-theme.css:75`). The base toggle fills the cell (`styles/table.css:372`).
9. Vanilla and Laser change five spacing tokens, but only at the default density (`theme/vanilla.ts:81`). Compact and comfortable densities keep the Sketchy spacing.
10. Sketchy fieldset decoration adds 8 px (`styles/default-theme.css:552`).

## Part 2. Hacks

### 2.1 Counts

| Kind                                                     | Count | Examples                                                                                                                        |
| -------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------- |
| `!important`                                             | 1     | `styles/choice-selection.css:132`                                                                                               |
| Raw pixel values outside fallbacks                       | 224   | 56 in `styles/components.css`, 55 in `styles/table.css`, 22 in `styles/default-theme.css`                                       |
| Negative insets that place decoration                    | 4     | `styles/default-theme.css:78`, `styles/default-theme.css:485`, `styles/default-theme.css:614`, `styles/choice-selection.css:67` |
| Negative offsets that compensate for layout              | 4     | `styles/layout.css:535`, `styles/layout.css:560`, `styles/table.css:401`, `examples/shared/appearance/style.css:30`             |
| Negative outline offsets (-1 to -3 px)                   | 16    | `styles/states.css:37`, `styles/diagrams.css:140`, `styles/choice-selection.css:22`                                             |
| Tokens reset to `initial` to work around inline tokens   | 13    | `styles/theme.css:43`, `theme/laser.ts:98`, `theme/laser.ts:113`                                                                |
| Token remaps that swap meaning inside a component        | 3     | `styles/default-theme.css:193`, `styles/default-theme.css:194`, `styles/default-theme.css:195`                                  |
| Universal selector in a preset                           | 1     | `styles/laser-theme.css:528`                                                                                                    |
| Duplicate preset scope that exists only to restore focus | 1     | `styles/laser-theme.css:535`                                                                                                    |

### 2.2 Brittle selectors

1. Laser hover paint uses a selector with nested `:not(:has(...))` guards for invalid and disabled states (`styles/laser-theme.css:240`, `styles/laser-theme.css:297`). It spans 128 lines.
2. Laser selected paint sets an accent border (`styles/laser-theme.css:200`). The later hover rule makes the same border transparent (`styles/laser-theme.css:287`). The measurement confirms a transparent border on the selected tab. The first rule is dead for buttons and tabs.
3. Sketchy uses `:has(> .ui-button)` to isolate every parent of a button (`styles/default-theme.css:49`).
4. Sketchy decoration targets the popper positioner with `:has(> .ui-menu[data-ui-section-decoration])` (`styles/default-theme.css:479`).
5. Exclusion lists name table classes inside theme files: `column-sort`, `column-move`, `header-rename`, `sub-table-toggle` (`styles/default-theme.css:39`, `styles/buttons.css:122`, `styles/plain-theme.css:195`, `styles/laser-theme.css:372`).
6. The Sketchy tree scope omits the `:not([data-ui-preset])` branch that every other Sketchy scope has (`styles/tree.css:58`).

### 2.3 Magic numbers

1. Dot size 0.75 px in 10 gradient copies (`styles/default-theme.css:196`).
2. Pattern size 0.3em in tokens (`theme/appearance.ts:167`) but 0.35em in one fallback (`styles/default-theme.css:646`).
3. Divider toggle offsets of -17 px and -11 px (`styles/layout.css:535`, `styles/layout.css:560`).
4. Choice toggle padding uses a 17 px constant (`styles/fields.css:94`).
5. Disclosure scale of 4/7 and 0.8 (`styles/default-theme.css:364`, `styles/default-theme.css:426`).
6. Decoration perspective of 240 px (`styles/default-theme.css:419`).
7. Laser glow multipliers 0.6 and 0.4 (`styles/laser-theme.css:59`, `styles/laser-theme.css:72`).
8. Laser hover tint of 12 percent in four places (`styles/laser-theme.css:268`, `styles/laser-theme.css:321`, `styles/choice-selection.css:107`, `theme/laser.ts:88`).

### 2.4 Dead code

1. `--ui-theme-shadow-1`, `--ui-theme-shadow-2` and `--ui-theme-shadow-3` are never read (`styles/theme-shadows.css:13`). Their six strength helpers and `--ui-theme-shadow-color` only feed them (`theme/appearance.ts:180`).
2. `--ui-shadow-overflow` is never read (`theme/appearance.ts:177`).
3. `--ui-handle-border` is never read (`theme/appearance.ts:168`, `theme/vanilla.ts:53`, `styles/legacy-palette.css:13`).
4. `ThemeOptions.depth` has no effect. `appearanceStyle` ignores `_depth` (`theme/appearance.ts:74`).
5. The Laser selected border rule is overridden for buttons and tabs (`styles/laser-theme.css:200`).
6. Plain adds sub-table toggle borders that Vanilla removes again (`styles/plain-theme.css:70`, `styles/plain-theme.css:209`).
7. Removed in this branch: Sketchy repeated `min-width` and `background` on the Theme root. `styles/theme.css:36` already sets both for every preset.

### 2.5 Legacy palette

1. `styles/legacy-palette.css:3` sets 12 tokens on `:root` for every page. It hides the component fallbacks.
2. `styles/legacy-palette.css:18` defines a second dark palette for `uiScope(density, 'dark')` (`styles/density.ts:33`). `DashboardShell` exposes it too (`layout/Dashboard.tsx:49`).
3. Four example files still use the legacy dark scope.
4. `theme/palette.ts:69` owns the frozen data. `scripts/theme-palette.mjs` generates the CSS.

## Part 3. Behavior differences and overlapping tokens

### 3.1 Behavior by preset

| State              | Sketchy                                                                               | Vanilla                                                           | Laser                                                         |
| ------------------ | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------- |
| Focus ring         | 1 px gray `#a3a3a3`, offset 0 (`theme/appearance.ts:157`, `theme/palette.ts:62`)      | 2 px muted text, offset 2 (`theme/vanilla.ts:73`)                 | 1 px accent, offset 2, plus glow (`theme/laser.ts:83`)        |
| Focus in options   | Outline (`styles/choice-selection.css:19`)                                            | No outline (`styles/choice-selection.css:41`)                     | No outline (`styles/choice-selection.css:118`)                |
| Focus in menus     | Inset ring (`styles/components.css:519`)                                              | Inset ring                                                        | No ring (`styles/laser-theme.css:504`)                        |
| Focus in calendars | Outline                                                                               | Outline                                                           | No outline (`styles/laser-theme.css:459`)                     |
| Hover on actions   | Dotted backing (`styles/default-theme.css:100`)                                       | Highlight fill (`styles/buttons.css:33`)                          | Tint, glow, transparent border (`styles/laser-theme.css:240`) |
| Hover on fields    | Decoration only. Control hover equals the control surface (`theme/appearance.ts:156`) | Highlight fill (`theme/vanilla.ts:56`)                            | Tint and glow (`styles/laser-theme.css:297`)                  |
| Selected action    | Dotted backing (`styles/default-theme.css:87`)                                        | Highlight fill (`styles/plain-theme.css:23`)                      | Glow, transparent border                                      |
| Checked toggle     | Surface with mark                                                                     | Accent fill (`styles/plain-theme.css:48`)                         | Accent fill and glow                                          |
| Disabled           | Opacity 1. No visible cue on buttons (`theme/Theme.tsx:155`)                          | Opacity 0.5 (`theme/vanilla.ts:40`)                               | Opacity 0.5 plus text mix (`styles/laser-theme.css:393`)      |
| Readonly fields    | Muted surface equals content surface (`theme/appearance.ts:140`)                      | Highlight fill (`theme/vanilla.ts:51`)                            | Highlight tint (`theme/laser.ts:91`)                          |
| Density            | Theme sizing (`theme/sizing.ts:7`)                                                    | Overrides spacing at default density only (`theme/vanilla.ts:81`) | Same as Vanilla, plus input padding                           |
| Font               | Fira Code (`theme/sizing.ts:10`)                                                      | System sans (`theme/vanilla.ts:28`)                               | System sans                                                   |
| Icons              | Sketchy glyphs                                                                        | Vanilla glyph set (`components/Icon.tsx:56`)                      | Vanilla glyph set                                             |

### 3.2 Tokens that mean the same thing

| Role                      | Tokens                                                                                                                                            | Notes                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Content surface           | `--ui-surface`, `--ui-popup-surface`, `--ui-control-surface`, `--ui-muted-surface`                                                                | Sketchy sets all four to the content layer (`theme/appearance.ts:139`)                                  |
| Layer surfaces            | `--ui-canvas-surface`, `--ui-pane-surface`, `--ui-surface-1` to `--ui-surface-4`                                                                  | Layers point at numbered surfaces (`theme/appearance.ts:81`)                                            |
| Muted or disabled surface | `--ui-muted-surface`, `--ui-skeleton-surface`                                                                                                     | Means content in Sketchy and hover in Vanilla and Laser (`theme/vanilla.ts:51`, `theme/laser.ts:91`)    |
| Hover                     | `--ui-hover`, `--ui-highlight`, `--ui-control-hover`                                                                                              | All equal in Vanilla and Laser (`theme/vanilla.ts:54`)                                                  |
| Focus                     | `--ui-focus`, `--ui-focus-ring`, `--ui-field-focus-border`                                                                                        | Focus equals accent in all presets. The ring differs (`theme/appearance.ts:169`)                        |
| Accent                    | `--ui-accent`, `--ui-button-color`, `--ui-selection`, `--ui-sidebar-accent`                                                                       | All resolve to the accent (`theme/Theme.tsx:139`, `theme/appearance.ts:130`)                            |
| On accent                 | `--ui-on-accent`, `--ui-on-selection`, `--ui-button-on-color`                                                                                     | All resolve to the on-accent color                                                                      |
| Border                    | `--ui-border`, `--ui-divider`, `--ui-control-border`, `--ui-button-border`, `--ui-handle-border`, `--ui-neutral-button-border`                    | `--ui-divider` and `--ui-control-border` equal `--ui-border` in all presets (`theme/appearance.ts:151`) |
| Muted text                | `--ui-muted-text`, `--ui-subtle-text`                                                                                                             | Equal in all presets (`theme/appearance.ts:149`)                                                        |
| Text                      | `--ui-text`, `--ui-sidebar-neutral`, `--ui-heading-color`                                                                                         | Sidebar neutral equals text (`theme/appearance.ts:131`)                                                 |
| Radius                    | `--ui-radius`, `--ui-control-radius`, `--ui-panel-radius`, `--ui-popup-radius`, `--ui-checkbox-radius`, `--ui-radio-radius`, `--ui-switch-radius` | Seven tokens for four shapes                                                                            |

That is 11 clusters with 43 tokens.

## Part 4. Proposed clean base

### 4.1 Principles

- One style sheet holds every token with a documented default.
- The defaults equal the approved Sketchy values.
- A preset is a block of token overrides on `.ui-theme[data-ui-preset=...]`. It does not hold component selectors.
- Theme writes only the values that the application chooses at run time: mode, accent, layers and density. It writes them as data attributes where it can.
- Component rules read tokens. They do not test the preset.
- Decoration stays an additive layer. It reads tokens and only Sketchy turns it on.
- Each token has one meaning. Old names stay as aliases for one release.

### 4.2 Token set

These 52 tokens cover the current roles.

| Group             | Tokens                                                                                                                                                                                 | Sketchy default                                                                                    |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Surfaces          | `--ui-canvas`, `--ui-pane`, `--ui-surface`, `--ui-surface-raised`, `--ui-surface-sunken`, `--ui-hover-surface`, `--ui-selected-surface`, `--ui-overlay`                                | surface 1, surface 3, surface 2, surface 2, surface 2, surface 3, transparent, black at 40 percent |
| Text              | `--ui-text`, `--ui-text-muted`, `--ui-text-heading`, `--ui-on-accent`, `--ui-selected-text`                                                                                            | `#262626`, `#999999`, text mixed 80 percent, computed, text                                        |
| Accent and status | `--ui-accent`, `--ui-accent-2`, `--ui-error`, `--ui-warning`, `--ui-success`                                                                                                           | blue `#1971c2`, blue, `#9d251e`, `#765200`, `#37734c`                                              |
| Borders           | `--ui-border-width`, `--ui-border`, `--ui-border-strong`, `--ui-divider`, `--ui-selected-border`                                                                                       | 1px, surface 4, surface 4, surface 4, accent                                                       |
| Focus             | `--ui-focus-ring`, `--ui-focus-width`, `--ui-focus-offset`                                                                                                                             | `#a3a3a3`, 1px, 0px                                                                                |
| Typography        | `--ui-font-family`, `--ui-font-size`, `--ui-small-font-size`, `--ui-line-height`, `--ui-control-line-height`, `--ui-label-weight`, `--ui-heading-weight`, `--ui-system-text-transform` | Fira Code, 12px, 12px, 1.625, 16px, 400, 500, uppercase                                            |
| Sizing            | `--ui-control-height`, `--ui-table-control-height`, `--ui-row-height`, `--ui-icon-stroke-width`                                                                                        | 32px, 26px, 32px, 1                                                                                |
| Spacing           | `--ui-gap`, `--ui-field-gap`, `--ui-layout-inset`, `--ui-control-padding-x`, `--ui-control-padding-y`                                                                                  | 8px, 20px, 16px, 10px, 4px                                                                         |
| Radius            | `--ui-radius-control`, `--ui-radius-panel`, `--ui-radius-popup`, `--ui-radius-toggle`                                                                                                  | 0px for all four                                                                                   |
| Shadows           | `--ui-panel-shadow`, `--ui-popup-shadow`, `--ui-control-shadow-hover`, `--ui-control-shadow-selected`                                                                                  | none for all four                                                                                  |
| States            | `--ui-disabled-opacity`                                                                                                                                                                | 1, an open owner decision (see step 8)                                                             |

Decoration keeps its own small group: `--ui-decoration-display`, `--ui-dot-color`, `--ui-dot-opacity`, `--ui-decoration-border`, `--ui-pattern-size`.

### 4.3 Minimal preset overrides

Vanilla overrides 24 tokens:
`--ui-canvas`, `--ui-pane`, `--ui-surface-sunken`, `--ui-hover-surface`, `--ui-selected-surface`, `--ui-text`, `--ui-text-muted`, `--ui-text-heading`, `--ui-accent`, `--ui-on-accent`, `--ui-border`, `--ui-focus-ring`, `--ui-focus-width`, `--ui-focus-offset`, `--ui-font-family`, `--ui-line-height`, `--ui-control-line-height`, `--ui-label-weight`, `--ui-heading-weight`, `--ui-icon-stroke-width`, `--ui-radius-control`, `--ui-radius-panel`, `--ui-radius-toggle`, `--ui-popup-shadow`.
It also sets `--ui-decoration-display: none` and the four spacing values it uses today.

Laser overrides the same color, type and focus tokens with its own values.
It adds `--ui-radius-popup`, `--ui-panel-shadow`, `--ui-control-shadow-hover` and `--ui-control-shadow-selected`.
The glow becomes the value of the two control shadow tokens. The base hover and selected rules read them.
Laser stops calling `vanillaStyle`. It no longer needs `--ui-input-min-padding-x`.

## Part 5. Cleanup plan

Each step keeps the gallery and the browser suites green. Each step is one Beads child issue.

| Step | Work                                                                                                                                                                            | Risk           | Why                                                                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------ |
| 1    | Remove dead tokens: the theme shadow scale, `--ui-shadow-overflow`, `--ui-handle-border` and the unused `depth` argument. Keep the Open Props license note if any part remains. | Low            | No reader exists. The removal changes the `themeStyle` keys, so note it in the changelog.              |
| 2    | Add an integrity script that reports disagreeing fallbacks, `!important` and preset selectors outside the preset sheets. Start in report mode.                                  | Low            | It stops new drift before the larger steps.                                                            |
| 3    | Unify fallbacks to one value per token, taken from the new token table.                                                                                                         | Low            | Fallbacks only apply outside a Theme.                                                                  |
| 4    | Move the token defaults from TypeScript into one `tokens.css`. Move preset values into token blocks. Theme keeps writing only run-time choices.                                 | Medium         | It changes how nested Themes and consumer overrides win. Test nested scopes, portals and hydration.    |
| 5    | Collapse the 11 synonym clusters. Keep old names as aliases. Give `--ui-muted-surface` one meaning.                                                                             | Medium         | Sketchy readonly and disabled fields change from content color to a sunken color. Owner review needed. |
| 6    | Move shared structural rules into the base: dashboard surfaces, card and field group radius, toggle checked paint, tab radius.                                                  | Low to medium  | The rules already agree across presets.                                                                |
| 7    | Replace the 18 selector overrides from section 1.3 with tokens. This includes Laser input padding and textarea radius.                                                          | Medium         | Laser loses its 12 px input padding unless the owner wants it for every control.                       |
| 8    | Unify state behavior: one focus rule for all presets, focus rings in options and menus, a visible disabled cue in Sketchy, and the hover and selected model through tokens.     | Medium to high | It changes visible behavior in all presets. The owner decides the disabled cue.                        |
| 9    | Replace the class exclusion lists with one role attribute that components set, for example `data-ui-glyph` on icon-only actions.                                                | Medium         | It touches Table, Calendar and Sidebar components.                                                     |
| 10   | Rebuild Sketchy decoration as one additive sheet with one dot pattern token. Share the selector with `theme/decorations.ts`.                                                    | Medium         | Decoration geometry is approved. Compare screenshots before and after.                                 |
| 11   | Remove the Vanilla undo rules and make Laser independent of `vanillaStyle` and `plain-theme.css`.                                                                               | Medium         | After steps 4 to 9 most plain rules are base rules.                                                    |
| 12   | Export the preset defaults (layers, mode) from the theme and let the gallery read them. Stop passing `appearanceStyle` twice.                                                   | Low            | Example code only.                                                                                     |
| 13   | Deprecate the legacy palette and `uiScope(density, 'dark')`. Migrate the four example users. Remove it in a later release.                                                      | Medium to high | It is supported public behavior. It needs a deprecation notice.                                        |

## Trivial fixes in this branch

1. `styles/default-theme.css` no longer repeats `min-width: 0` and `background: var(--ui-canvas-surface)` on the Theme root. `styles/theme.css:36` sets the same values for every Theme. The browser suites pass after the change.

## Theme explorer

`examples/theme-explorer` shows buttons, inputs, select, checkbox, switch, tabs, a dialog, a sheet, the gallery table and the full gallery form.
It uses the gallery defaults and the shared appearance code. It adds no component styles.
To share code without sibling imports, this branch moved `Recipes.tsx` and `EverythingForm.tsx` to `examples/shared/controls`.
It moved the preset defaults to `examples/shared/appearance/galleryConfig.ts` and the gallery layout rules to `examples/shared/appearance/gallery-layout.css`.
The token panel lists the token base from `styles/tokens.css`, grouped as in section 4.2.
Each token names the block that sets it, and a filter shows only the tokens that a block overrides.
You can edit a value, reset it, and copy the changes as a CSS rule.

## Part 6. Cleanup results

The cleanup ran in plan order, one commit per step. `pnpm check` passed before each commit.
Gallery screenshots of all 47 entries in four configurations (Sketchy light, Sketchy dark, Vanilla light, Laser light) and 26 entry states per configuration were compared after each step.
Every difference is either listed below as intended or was fixed before the commit.

### 6.1 Steps

| Step | Commit  | Result                                                                                                                                                                                                      |
| ---- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | aff9361 | Removed the dead shadow scale, `--ui-shadow-overflow`, `--ui-handle-border` and the `depth` option.                                                                                                         |
| 2    | 67675a3 | Added `scripts/check-theme.mjs` to the integrity gate. It started in report mode with 37 findings.                                                                                                          |
| 3    | 2573c08 | Rewrote 381 literal fallbacks so that each token has one fallback value.                                                                                                                                    |
| 4    | 6032b9e | Moved every token default into `styles/tokens.css`, generated from `theme/tokens.ts`. Theme now writes choice attributes, not inline tokens. A 201-case option matrix resolved to the same computed tokens. |
| 5    | 8cabeb0 | Collapsed seven synonym tokens into canonical names, with one alias block.                                                                                                                                  |
| 6    | 72ccc66 | Moved shared preset rules into `styles/presentation.css` with optional tokens.                                                                                                                              |
| 7    | b8a6547 | Replaced preset selector overrides with tokens, including a weight token for default-tone outline buttons.                                                                                                  |
| 8    | fb482f1 | One disabled cue and one focus structure for every preset.                                                                                                                                                  |
| 9    | 9e3af00 | Components mark embedded actions with `data-ui-action`. Theme lists select the role.                                                                                                                        |
| 10   | 9314ea7 | `default-theme.css` became `decoration.css`, gated by the new decoration choice. One dot pattern replaced ten gradient copies.                                                                              |
| 11   | 426e52c | `laser-theme.css` became `glow.css` and `plain-theme.css` became `plain.css`, gated by the glow and decoration choices. Components read the decoration choice.                                              |
| 12   | 2c46b13 | The gallery reads preset defaults from `presetDefaults`.                                                                                                                                                    |
| 13   | b52647d | Removed the legacy palette. `uiScope(density, mode)` makes a raw token root. The theme check is strict and reports 0 findings.                                                                              |

### 6.2 Resulting structure

- `theme/tokens.ts` holds 63 ordered token blocks with 150 distinct tokens. The base block holds 133 Sketchy light defaults.
- Presets write values only. The 13 preset blocks write 162 token values. The plain block for Vanilla and Laser writes 42, Vanilla 18, Laser 41.
- Theme writes choices as attributes: preset, mode, density, accent, secondary accent, layers, dividers, decoration colors, input decoration, decoration and glow. It writes only the decoration percentages inline.
- `presetDefaults` gives each preset its default mode, decoration, glow and layers.
- No style sheet or component tests the preset. `scripts/check-theme.mjs --strict` fails on any preset selector outside `tokens.css`, any component that reads the preset, any disagreeing fallback, and any `!important` outside forced colors.
- Three additive layers remain, each gated by a choice rather than the preset: `decoration.css` (70 rules), `plain.css` (24 rules) and `glow.css` (31 rules). `presentation.css` holds 24 shared rules that read tokens.

### 6.3 Intended visual changes

The pairs are in `test-results/theme-cleanup/` (241 entries with before, after and diff images: 137 gallery entries and 104 entry states, plus the explorer token rail in `explorer/`). `index.json` lists them.

1. Laser uses 12px horizontal input padding for inputs and select triggers. Menus, popovers and cards that read the same token also use 12px (step 7).
2. Vanilla and Laser compound fields show the invalid border on their adornment buttons, as Sketchy does (step 7).
3. The nested decoration-geometry preview inherits the outer preset's outline button colors (step 7).
4. Every preset dims disabled controls the same way. A disabled control keeps its opaque background. Its text, accent and borders mix toward the surface at the `--ui-disabled-opacity` ratio through `--ui-disabled-text`, `--ui-disabled-accent` and `--ui-disabled-border`. No rule uses element opacity for disabled, so no dotted backing or other layer shows through a disabled control. This includes disabled table header sort buttons, the disabled buttons inside read-only date, select and calendar fields, and the reset buttons in the explorer. Disabled fields keep their full sunken surface instead of a half-transparent one (step 8 and the follow-up fix).
5. Laser and Vanilla use the same disabled mechanism. Laser no longer has its own disabled text mix (step 8).
6. Vanilla and Laser keep the focus outline on highlighted choice options and calendar days and the inset ring on menu items (step 8). Static screenshots do not show focus.
7. Laser sub-table toggles, Gantt group toggles, pagination actions and the calendar heading are frameless, as in Vanilla (step 11).
8. One dot pattern definition. `decoration.css` defines `--ui-dot-pattern` once, and `--ui-canvas-pattern` reads it. Only the dot color varies by role. The dot spacing is `calc(var(--ui-font-size) * 0.3)`, so it no longer depends on each surface's font size. The gallery entries keep their pixels except a faint 2px shadow edge in the Laser decoration-geometry preview. Themes without decoration have no canvas dots because the pattern is unset.
9. The explorer renders its table flush at the top of the stage, as the gallery does, so no canvas strip sits above the table title band.
10. Raw fixture pages without a Theme lose the legacy black text, `currentColor` borders and legacy dark palette (step 13). These pages are outside the gallery.
11. Spacing is uniform (Part 7). In the main area, the space between fields and between stacked panels equals the panel inset: 16px in Sketchy instead of 20px, and 12px in Vanilla and Laser instead of 16px. Every form entry and entry state is shorter for this reason.
12. Side regions are compact. The explorer token rail and the dashboard context rail use 8px (Sketchy) at the rail edge and between panels, instead of 16px at the edge. Panels in a rail use the 8px cell inset instead of 16px. The explorer pair is in `explorer/`.
13. The gallery appearance band no longer adds a second inset around the icon sidebar options, so they align with the other appearance controls.

### 6.4 Not finished

1. Hover and selected paint for actions still lives in the three layers. Moving it into `presentation.css` needs private resting variables in `buttons.css` and `fields.css`, so that an unset token can fall back to each variant's own paint. The layers already read only tokens for their values.
2. `decoration.css` still remaps `--ui-accent` and `--ui-text` inside sidebar and table header controls (finding 2.1, three token remaps).
3. The sub-table toggle, page action, calendar and sidebar rules in `plain.css` still name component classes. Only table header controls and field adornments carry `data-ui-action` roles.
4. The selectors in the three layers keep the specificity of the former preset rules, so the brittle selectors in section 2.2 remain inside the layers.

## Part 7. Spacing model

### 7.1 The table filter pane

The table filter pane is the reference for compact side regions.

- The pane has no padding and no gap (`styles/table-workspace.css:52`). Its scrolling body has no padding and no gap either (`styles/table-workspace.css:113`).
- Each filter section is a Collapsible that runs from edge to edge of the pane. A single bottom border separates two sections (`styles/collapsible.css:1`).
- Inside a section, the summary uses the compact cell inset: `--ui-cell-padding-y` and `--ui-cell-padding-x` (`styles/collapsible.css:8`). The content uses `--ui-gap` between controls and `--ui-cell-padding-x` at its sides (`styles/collapsible.css:20`).
- The result is one small spacing everywhere: 8px between controls and at the section edges, and no space between sections or at the pane edge.

### 7.2 What the library does now

- Side regions use one token, `--ui-region-gap` (default `var(--ui-gap)`), for the space at the region edge and between its panels. This covers the dashboard context rail, a navigation rail without sidebar groups, and sheets (`styles/layout.css` and `styles/components.css`). The region uses the token as its padding. Panels after the first take it as a top margin, so the rail stays a block box and the drawer display rules still apply. A sheet uses the token as its grid gap. A navigation rail with sidebar groups keeps its own row model.
- A navigation or context rail whose direct children are Collapsible sections has no padding, and its sections get no top margin (`styles/layout.css`). The sections run from edge to edge, as in `.table-workspace-controls`, and stacked sections share one border.
- Panels inside side regions (field sets, field groups and cards) use the compact cell inset as padding and `--ui-gap` between their fields, as the filter sections do.
- In the main area, the space between panels equals the space around them. `--ui-field-gap` now equals `--ui-layout-inset`, and the dashboard main area uses `--ui-layout-inset` as its gap as well as its padding.
- Example code adds no spacing on top of a region. `.gallery-sidebar-options` no longer repeats the region padding.
- The library has one section component, `CollapsibleSection`. It is a Collapsible with the outline action frame, an optional icon, a label, an optional count and an end indicator. The look rules moved from the sidebar group classes to generic classes: `.ui-section`, `.ui-section-control`, `.ui-section-icon`, `.ui-section-label` and `.ui-section-count`. The base rules are in `styles/collapsible.css`. The Sketchy, plain and Laser rules are in `decoration.css`, `plain.css` and `glow.css`.
- `SidebarGroup` renders a `CollapsibleSection` in its inline mode. It keeps only the sidebar parts: the inset margin, the link menu, the token swap that colors the links, the plain guide line under the group title, compact mode and focus retention. The gallery sidebar computed styles are the same as before for every element in Sketchy light and dark, Vanilla and Laser, at rest, on hover and in compact mode.
- `TableControlSection` renders a `CollapsibleSection` with its count, so the table control pane has the sidebar section look. Stacked sections share one border, and the pane keeps its edge-to-edge layout.
- The explorer token rail is the navigation region. It holds `CollapsibleSection` sections: Changes with an "N edited" count, then each token group with an "N tokens" count. The explorer adds no CSS of its own.
- The explorer suite checks, in every preset, that the rail sections touch the rail edges and each other, and that their content padding equals the filter pane section content padding.
- The first rail section starts at the same height as the table command bar in all three presets. In Sketchy, the section top border plus the 30px summary is 31px, the same as the command bar. In Vanilla and Laser, the summary is 32px, the sidebar control height, and the command bar is 31px. No existing rule ties the two heights, so the 1px difference remains.
