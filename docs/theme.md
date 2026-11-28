# Theme and appearance

Theme supplies visual defaults and sets a scope for controls and popups. The examples show how those defaults work in different hosts.

Contents

- [Themes](#themes)
- [Theme contract](#theme-contract)
- [Themes in examples](#themes-in-examples)

## Themes

Theme owns shared styles, decoration, and popup placement for a subtree.

### Import

Import `Theme` from `@wfe/components`. Load `@wfe/components/styles.css` once.

### Example

```tsx
import { Theme, Button, Input } from '@wfe/components'
import '@wfe/components/styles.css'

export function App() {
  return (
    <Theme>
      <Input aria-label="Name" />
      <Button>Save</Button>
    </Theme>
  )
}
```

### Behavior and options

Use `preset="default"` for Sketchy, `preset="vanilla"` for plain styling, or `preset="laser"` for square controls and glow. Omission selects Sketchy. Laser starts in dark mode. The other presets start in light mode.

#### Application configuration

Pass `mode="dark"` or `mode="monochrome"` to change the surface scheme.
Pass `primary="violet"` or another `ThemePrimary` value to change the primary color.
Pass `secondary="yellow"` to set the secondary color and `accent="violet"` to set the accent color.
Each choice uses the existing palette and changes with the mode and preset.
Neutral uses the preset's text, border, and surface colors.

Primary supplies the default color for links, selection, checked controls, and filled buttons.
Secondary remains available for decoration dots and borders, field decoration, and drag feedback.
Accent applies where a component or decoration choice explicitly selects it.
Keyboard focus rings use neutral colors in every preset.
The application owns these values, persistence, and any system preference detection.
Use the same initial values on the server and client for hydration.

`layers`, `dividers`, and `decorations` accept partial overrides.
Pass values from the exported TypeScript types. Opacity percentages use the range 0 to 100.
Omitted values use the chosen preset defaults.
Button and sidebar-link faces are opaque by default, including during hover and selection.
The dotted decoration remains visible outside their borders.
Set `decorations={{ inside: 100 }}` to show all decoration dots through the faces.
Layer numbers are zero-based: `0` selects surface 1.
Sketchy defaults to `{ canvas: 0, pane: 2, content: 1 }`.
The `style` prop overrides individual CSS variables last.

#### Color roles

Each palette role has `--ui-<role>`, `--ui-<role>-light`, and `--ui-<role>-dark`. Its foreground uses `--ui-on-<role>` and the corresponding light and dark forms. Primary supplies the default action color. Secondary and accent configure additional roles.

#### Token base

`styles/tokens.css` holds the generated theme defaults and choice blocks.
`scripts/theme-tokens.mjs` generates it from `theme/tokens.ts`, and the integrity gate checks it.
The first block holds the Sketchy light defaults. Later blocks change token values for one mode, density, preset, or application choice.
Later blocks win, and every block has zero specificity.
Theme writes the choices as data attributes on its root: `data-ui-preset`, `data-ui-mode`, `data-ui-density`, `data-ui-primary`, `data-ui-secondary`, and `data-ui-accent`. Theme also writes the layer, divider, and decoration choices.
It writes only the decoration percentages inline.
A consumer class or inline style on the root therefore overrides any token.
`themeTokens(options)` returns the declared token values that the style sheet applies for those options.
`resolveThemeTokens(options)` also replaces `var()` references, which helps samples and tests.
`themeAttributes(options)` returns the root attributes for a scope without Theme.
Use `Theme` to include decoration behavior and popup ownership.

`decoration` turns the dotted decoration layer on or off. Sketchy turns it on by default and the other presets turn it off.
Theme then writes `data-ui-decoration` on its root, `styles/decoration.css` applies, and the randomized geometry controller starts.
`glow` turns the neon glow layer in `styles/glow.css` on or off. Laser turns it on by default.
Themes without decoration use `styles/plain.css`, where embedded table, calendar and navigation actions are frameless.
Preset names select token blocks and default choices. The component styles read shared roles and the decoration or glow choice.
Components that draw decorative SVG read the same choice. Decorated surfaces share a dot pattern and select their dot color.

Nested themes can use different presets, modes, and palettes.
Each scope owns its CSS and automatic popup portals. Ancestor preset rules stop at nested Theme boundaries.
DashboardShell inherits theme sizing unless you pass an explicit density.

`Theme.density` accepts `"default"`, `"compact"`, and `"comfortable"`.
Omitting it preserves the approved Sketchy profile, including its 32px controls
and compact table rows. This profile now reports `data-ui-density="default"`.
Previously it reported compact despite applying different control sizes.
Update selectors that used that old metadata to identify the Sketchy theme.
Explicit densities use the same sizing records as `uiScope` and `uiDensity`,
including controls inside table cells. Supply the matching `uiDensity` row height
to fixed-row virtual tables. `themeTokens` accepts the same density option.
An omitted DashboardShell density inherits its parent without declaring a new profile.
Nested Theme instances start with their own default profile.

A bare `uiScope()` defaults to compact.
`uiScope(density, mode)` with a mode makes the scope a token root: it writes
`data-ui-tokens` and `data-ui-mode`, so the scope receives the Sketchy token base
in that mode without decoration behavior. A scope without a mode inherits tokens
from its nearest root. Outside any root, the CSS fallbacks use Sketchy light values. Use Theme for new interfaces.
Application CSS owns page height and available table space.
Use solid content panels over the dotted main canvas to keep text readable.

The package includes the Fira Code OFL license and Open Props attribution beside the shipped styles.
See [the public consumer example](../examples/shared/appearance/ThemeConsumer.tsx) for nested layouts, popups, and live mode changes.

#### Input decoration

Inputs show a dotted backing on hover and focus. Radios are square, and switches are rectangular.
The backing uses the same random geometry and opacity controls as buttons.
It adds no focus stops and leaves native validation and form submission unchanged.
Disabled and read-only controls omit the backing. Forced-color mode retains the standard focus outline.

Set `Theme.inputDecoration` to `false`, `"neutral"`, `"primary"`, `"secondary"`, or `"accent"`.
The default is `"neutral"`. A nested Theme starts with its own default.
Set `decoration` on a `Field` to change its controls, or on an individual control to override that field.
Use this prop on `Input`, `Textarea`, `NumberInput`, `InputGroup`, `NativeSelect`, `SelectField`, `DatePicker`, `TimePicker`, `DateTimePicker`, and `FileInput`.
For compound APIs, use `Checkbox`, `Switch`, `RadioGroup`, `Select.Trigger`, or `Combobox.Control`.
A date picker or combobox draws one backing around its complete control.

Native text inputs, textareas, and selects have a presentation wrapper.
Their `ref`, `id`, `name`, event handlers, and validation attributes still target the native element.
The wrapper follows the shared field width limit and adds no tab stop.
Use `frameStyle` or `frameClass` to set a standalone native control's outer width.
The native control fills that wrapper. Keep text and native attributes on `style` and `class`.
In a compound control, set outer sizing on the compound control instead.
`Input`, `Textarea`, `NumberInput`, and `NativeSelect` accept these wrapper props.

#### Form section decoration

`FieldGroup` is a native fieldset. Its decoration is off by default.
Set `decoration={true}` for primary decoration, or choose `"neutral"`, `"primary"`, `"secondary"`, or `"accent"`.
Set `decoration={false}` to remove it.

`decorationHover` and `decorationFocusWithin` default to `true`.
Set either to `false` to disable that trigger.
Focus within means that a control inside the section holds keyboard focus.
The section adds no focus stop and keeps native fieldset behavior.
Disabled sections and forced-color mode suppress the decoration.

Enabled sections use primary decoration by default, while inputs keep their neutral default.
Section colors do not change input colors. Both remain independently configurable.

#### Decoration geometry

`Theme.decorationGeometry` controls rotation and perspective taper across buttons, inputs, navigation links, entry panels, and form sections.
`rotation`, `taperX`, and `taperY` set the base angle limits in degrees before randomization and size reduction.
Base rotation defaults to 4.75 degrees. Both taper axes default to 1.75 degrees.
Each accepts 0 through 8. Set one to 0 to disable only that axis.
The playground exposes these as Base rotation, Base taper X, and Base taper Y.

`rotationReduction` and `taperReduction` control reduction, not effect strength. Both accept values from 0 through 8.
The defaults are taper reduction 0.3 and rotation reduction 0.2.
Zero reduction keeps the selected base angle range at every size.
Higher values reduce the corresponding effect more as size grows. Values below 1 apply gentler reduction than 1.
The playground adjusts all numeric controls in steps of 0.05.

Rotation uses the longest side. Taper uses height for X-axis tilt and width for Y-axis tilt.
Each angle keeps its own independent random sample.
Linear mode multiplies the default angle by `1 / (1 + reduction × size / 100)`.
For a 100-pixel side, reduction 0 keeps the full effect, reduction 1 keeps half, and reduction 3 keeps one-quarter.

`scale` defaults to `"power"`, which raises that multiplier to `exponent`. Set `scale="linear"` to use the multiplier directly.
`exponent` defaults to 2.75 and accepts 0.1 through 4. The playground adjusts it in steps of 0.05.
At exponent 1, both modes match. A higher exponent increases reduction. A lower exponent softens it.
Linear mode ignores the exponent. Zero reduction always keeps the full selected base effect in both modes.

`randomizeOnHover` defaults to `true`. Set it to `false` to hold the random samples while comparing geometry.

Decorated themes share one resize observer per document. Size and configuration changes reuse the current samples. Each theme releases its observations and pointer listener on disposal.
Without ResizeObserver, the theme measures nodes on attachment and pointer entry.
`themeAttributes` alone does not install measurement or randomization.

#### Vanilla preset

Vanilla uses system sans-serif text, ordinary borders, rounded controls, round radios, and pill switches.
Its default primary color is neutral. Set `primary` to choose a different color.
Light, dark, and black/white modes use the same component structure and behavior.
Black/white uses black neutral text and borders over white content surfaces.
Subtle state fills retain visible hover and selection feedback.
Vanilla defaults to decoration and glow off. Set `decoration` to enable decoration for the theme. Per-field choices apply when their owning theme enables decoration.
Switching presets preserves input values, focus, selection, and open overlays.

Mode, palette, density, class, and style remain independent of preset selection.
All presets support the four color roles and surface layers.
Vanilla defaults to Surface 2 for the canvas and Surface 1 for panes and content.
All presets accept divider levels and decoration choices.
Use semantic CSS variables to customize vanilla borders and shadows.
All presets capitalize system labels while preserving record values and prose.
Vanilla navigation uses flat groups, indented child links, and a neutral selected-row fill.
Opening a group does not paint the whole group as selected. Keyboard focus keeps a separate visible outline.
Presets own these presentation choices. Shared palette and surface controls do not require identical navigation borders or group backgrounds.
All presets use 12px body text, 14px headings, and 32px controls by default.
Vanilla uses a 6px control gap and a 12px layout inset. The main field gap uses that inset.
Attached input buttons share one outer shape, with square internal corners.
Explicit density profiles still use shared geometry records.
Caller-supplied virtual row heights remain authoritative.

#### Custom appearance

Start with a preset and set CSS variables through the Theme style prop or an application stylesheet.
Generated theme choices use zero-specificity selectors. A class or inline style can override their tokens. Decoration percentages set by props use inline values.
Use the style prop for variable overrides. Use scoped application classes for component rules and state treatments.
Keep application rules after the WFE stylesheet, and stop them at nested Theme boundaries.

Shared roles include `--ui-border-width`, `--ui-control-border-width`, `--ui-divider-width`, and `--ui-radius`.
Specific shape roles include `--ui-control-radius`, `--ui-panel-radius`, `--ui-popup-radius`, `--ui-radio-radius`, and `--ui-switch-radius`.
Existing color, spacing, typography, focus, icon, and surface variables remain available.
Use `--ui-system-text-transform` for labels and headings. Record values and prose retain their original casing.
Set both the background and its foreground when replacing a primary or selected color.

Component classes and public data/ARIA states provide styling hooks without copying behavior.
Use hover, focus-visible, checked, selected, expanded, readonly, and invalid states where the component supports them.
Keep visible keyboard focus, disabled behavior, and readable contrast in each state.
See [the theme contract](#theme-contract) for ownership and compatibility rules.

The CSS uses `@scope` to isolate nested themes. Consumers need a browser with CSS scope support.
If you supply a portal mount, place it inside the intended theme scope.
The shared stylesheet includes all presets. Decoration code runs when the owning theme enables it.

#### Laser

Laser uses square inputs, buttons, panels, and popups with soft glow.
Light mode adds a soft white elevation layer. Dark mode adds no dark shadow. A tighter primary glow marks hovered, focused, and selected controls.
Compound inputs keep one outer shape and one glow. Hover and focus soften resting native borders without changing their width or layout. Invalid controls retain their error borders, and disabled or read-only fields do not acquire an active glow. Their internal button corners stay square.
Form sections share the cards’ border and resting shadow. Board headers use the same shadow.
Issue cards add a primary glow on hover and keyboard focus.
Sidebar groups omit the enclosing hover glow. Their headings, child links, and context navigation use text or glyph feedback rather than a glowing container. Keyboard focus remains visible independently of those effects.
Standalone icon actions keep transparent borders. Hover illuminates the glyph with a small shadow. Keyboard focus adds a separate outline in the neutral focus color, including monochrome mode and configurations with glow disabled. The outline appears only for keyboard focus. Hover and selection use soft glow.
Icons inside compound inputs retain the shared input outline.
Laser defaults to decoration off.

Use `<Theme preset="laser">` for the dark first-pass presentation.
Pass `mode="light"` for darker role colors and weaker glow on light surfaces.
Laser uses the same palette choices as the other presets.
Use `layers` to choose the canvas, pane, and content surfaces from the Laser scale.
Laser defaults to `{ canvas: 0, pane: 1, content: 1 }`.

`--ui-laser-elevation` overrides the resting panel shadow.
Set it to `none` to remove that shadow without disabling hover glow.
Laser resolves its glow at each control so a local primary color also colors the glow.
`--ui-laser-glow`, `--ui-laser-text-glow`, and `--ui-laser-icon-shadow` accept complete effect overrides.
Their default is CSS `initial`, which selects the stylesheet fallback.
The stylesheet computes that effect from its inputs.
The shared radius variables control pills, panels, and popups independently.
Forced-color mode removes the shadows and retains the native focus outline.

The `--ui-surface-1` through `--ui-surface-4` variables expose the active surface palette.
The canvas, pane, and content roles reference that palette.
Override palette variables on the `Theme` element through its `style` prop to update the linked roles.
An explicit role override, such as `--ui-control-border`, takes precedence over its default link.

#### Shared roles and component overrides

All presets define success, warning, error, and overlay colors.
Warning uses `--ui-warning-surface`, `--ui-warning-text`, and `--ui-warning-border`.
Success uses `--ui-success`. Error uses `--ui-error`. Modal backdrops use `--ui-overlay`.
Gantt dependencies and baselines use `--ui-muted-text`.
Charts use the same popup surface, border, text, radius, and shadow roles as other popups.

Selection and default button colors follow `--ui-primary` on the theme owner.
When you supply a custom primary color, also supply a suitable `--ui-on-primary` foreground.
Use a nested `Theme` for a complete local theme. A local accent alone does not replace every inherited semantic role.
Laser computes its default control, text, and icon glows at the consumer, so they follow a local primary color.

`--ui-divider-1` through `--ui-divider-4` define the selectable divider scale.
Sketchy retains its separate divider palette. Vanilla and Laser link the scale to their surface palettes.
The `dividers` prop selects a level for rows and columns in every preset.
Without that prop, Vanilla and Laser use their shared border color.
Disabled controls keep opaque surfaces. Shared disabled tokens dim the text, accent, and border toward the surface.

Shared headings use `--ui-heading-font-size` and `--ui-heading-weight`.
Optional `--ui-dialog-title-font-size`, `--ui-dialog-title-weight`, `--ui-popup-title-font-size`, and `--ui-popup-title-weight` distinguish popup titles.
`--ui-chart-tooltip-title-weight`, `--ui-toast-title-weight`, and `--ui-kanban-heading-weight` override their respective headings.
Status tiles expose `--ui-status-tile-label-weight`, `--ui-status-tile-value-font-size`, `--ui-status-tile-value-weight`, and `--ui-status-tile-value-line-height`.

`--ui-sidebar-control-height` changes sidebar row geometry without changing form controls.
`--ui-sidebar-heading-weight`, `--ui-sidebar-group-padding-y`, `--ui-sidebar-content-margin-y`, and `--ui-navigation-gap` control sidebar presentation.
Vanilla and Laser retain weight 500 for sidebar and Kanban headings through their dedicated roles.
`--ui-subtable-toggle-size` and `--ui-subtable-heading-font-size` distinguish compact child tables.
`--ui-checkbox-radius` controls checkbox corners. Laser uses the square base radius.
`--ui-menu-padding`, `--ui-menu-separator-margin-y`, and `--ui-badge-padding-x` expose compact component spacing.

Laser exposes glow geometry through `--ui-laser-glow-width` and `--ui-laser-glow-blur`.
`--ui-laser-glow-ring-opacity` and `--ui-laser-glow-opacity` control its strength.
Text uses `--ui-laser-text-glow-blur` and `--ui-laser-text-glow-opacity`.
Icons use `--ui-laser-icon-elevation`, `--ui-laser-icon-glow-blur`, and `--ui-laser-icon-glow-opacity`.
`--ui-input-min-padding-x` controls Laser's minimum input padding.
Explicit `--ui-popup-shadow` or complete Laser effect overrides replace these computed defaults.

`--ui-laser-shadow-y`, `--ui-laser-shadow-blur`, `--ui-laser-shadow-spread`, and `--ui-laser-shadow-color` supply the shared elevation geometry.
These inputs feed both resting shadows and the broad layer behind glow.
Set the shadow color to `transparent` to remove that layer from both effects.

Custom Tree, Select, and Combobox choices share `--ui-choice-selection-surface` and `--ui-choice-selection-text`.
These roles override selected and highlighted paint in every preset. Their defaults remain decorated Sketchy, neutral Vanilla, and translucent primary Laser.
Sketchy also accepts `--ui-choice-decoration-color`, `--ui-choice-decoration-opacity`, and `--ui-choice-decoration-surface` for the dotted backing and its inner mask.
The compatibility native picker uses `--ui-primary` and `--ui-on-primary`. Use the choice roles to override custom choice paint.
Preset choice defaults resolve at each choice, so a local primary color colors Laser glow and translucent selection without replacing the owning Theme.

`--ui-tree-row-min-height`, `--ui-tree-toggle-size`, `--ui-tree-symbol-size`, and `--ui-tree-indent` control Tree geometry.
The default profile preserves the compact Tree presentation. Explicit compact and comfortable densities derive these defaults from shared row and control dimensions.
Diagram surfaces and nodes use `--ui-border-width`, headers use `--ui-divider-width`, and keyboard edge focus uses `--ui-focus-ring` with the usual focus-color fallback. Edge hit areas remain independent of these visual widths.

`--ui-laser-glow-strength` scales every control-glow layer and the text and icon glows.
`--ui-laser-text-glow-strength` and `--ui-laser-icon-glow-strength` optionally override that scale for text and icons.
Elevation remains separate from glow strength. Complete effect overrides still replace the computed effect.
Keyboard focus remains visible when glow strength is zero or all effect overrides are `none`.

Optional choice paint, choice decoration, Laser action-surface, and Laser strength overrides belong to their nearest Theme owner. A nested Theme resets those overrides to its own preset defaults. Apply a consumer class or inline style to the nested Theme to customize it independently. Descendants and automatic portals inherit their owning Theme's overrides.

### Application ownership

Choose the preset, colors, density, and mode. Own preference detection, persistence, application CSS, and page height. Supply the same initial theme values on the server and client.

### Gallery

Open `?gallery=themes` for nested themes, `?gallery=input-decoration` for field and section decoration, or `?gallery=decoration-geometry` for size and angle controls.

## Theme contract

Theme owns visual defaults for shared controls.

### Behavior and options

#### Scope and inheritance

`Theme` defines the nearest owner for styles and automatic popup placement. Nested themes choose their own tokens and decoration. Popup placement also respects a containing top-layer dialog or popover. If you supply a portal mount, place it within the intended theme.

Use the same initial preset and mode on the server and client. Preset updates retain the component tree and its accepted values. Read the [theme guide](#themes) for options and overrides.

#### Token and style ownership

A token is a named CSS value. The theme supplies token values for color, spacing, typography, borders, radii, shadows, and motion. Component CSS handles sizing rules, hit areas, and overflow. Use the same row measurements for a table and its virtual renderer.

The generated `tokens.css` owns preset selectors. Component styles use shared roles and state attributes. The additive decoration, plain, and glow rules follow theme choices. The strict theme script checks preset isolation and consistent token fallbacks. Preserve documented class hooks and token aliases when changing the cascade.

Disabled controls retain opaque surfaces and use shared disabled colors. Keyboard focus uses a separate outline. Tree, Select, and Combobox share choice selection colors through `--ui-choice-selection-surface` and `--ui-choice-selection-text`.

#### Decoration lifecycle

Sketchy enables decoration by default. Vanilla and Laser leave it off by default. An explicit `decoration` choice controls it in every preset. Decorated themes share one resize observer per document and release their own listeners and observations on disposal.

The Sketchy action ring draws over the button face and below its content. Controls at a clipping edge draw the ring inside their frame or available padding. The decoration takes no pointer input.

#### Validation

Test behavior, focus, scope, retained state, and cleanup. Review cosmetic details in the gallery. Use the [qualification guide](qualification.md) for test commands.

### Application ownership

Components own semantics, focus, geometry, and interaction. Applications own data, permissions, routing, requests, and persistence.

## Themes in examples

Normal example hosts use the public Theme component.

### Behavior and options

DefaultAppearance delegates to that component. The gallery supplies one owner for its embedded examples. Standalone examples supply their own owners.

Theme controls typography, color, decoration, and default sizing. Example CSS owns the page frame and application-specific regions. Popups inherit the nearest owning theme.

#### Deliberate exceptions

The raw interoperability and shared-styles fixtures cover scopes without Theme. ThemeConsumer covers nested owners. The accessor, editing overhead, virtualization, and heap diagnostics retain the scopes that their workloads measure.

### Application ownership

Applications own appearance controls and saved preferences.

### Gallery

#### Browser checks

Host runners cover theme scope, retained interaction, focus, and cleanup. Inspect cosmetic details in the [gallery](../examples/README.md#components) or [theme explorer](../examples/README.md#theme-explorer). The [qualification guide](qualification.md) lists run commands.
