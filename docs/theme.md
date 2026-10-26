# Themes

`Theme` preserves the approved default appearance from `v0.0.4`.
Set `preset="vanilla"` for plain neutral styling inspired by base shadcn and Zaidan.
Omitting `preset` is equivalent to `preset="default"`.
The theme lives in `@wfe/components`, including its CSS, fonts, and decorative behavior.
The gallery uses this implementation too.

Import the styles once in your application entry.
Wrap your interface in `Theme`:

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

The Default theme uses light mode, a blue accent, outline buttons, and flat surfaces without shadows.
Default outline buttons use shared border colors and text in the accent color.
The base canvas uses surface 1 with subtle dots. Panes use surface 3, and content uses surface 2.
Controls use Fira Code at 12px, with a 32px height.
Forms use a 30rem field limit. Table controls retain compact sizing.
Content panels, cards, dialogs, popovers, and tab content share `--ui-layout-inset` (16px in Default).
Sidebar groups use equal outer insets. Table cells retain compact vertical padding, including grouped rows and expansion controls.
Action decorations use random tilted outlines. Each Theme owns their event handlers and cleanup.
Reduced-motion preference keeps the decorative backing without tilt or taper.

## Application configuration

Pass `mode="dark"` or `mode="monochrome"` to change the surface scheme.
Pass `accent="violet"` or another `ThemeAccent` value to change the primary accent.
Pass `secondaryAccent="yellow"` to set the secondary accent.
The application owns these values, persistence, and any system preference detection.
Use the same initial values on the server and client for hydration.

`depth` remains accepted for compatibility. The Default theme renders all depths without shadows.
`layers`, `dividers`, and `decorations` accept partial overrides.
Pass values from the exported TypeScript types. Opacity percentages use the range 0 to 100.
Omitted or undefined values retain their defaults.
Button and sidebar-link faces are opaque by default, including during hover and selection.
The dotted decoration remains visible outside their borders.
Set `decorations={{ inside: 100 }}` to show all decoration dots through the faces.
Layer numbers are zero-based: `0` selects surface 1.
The default layers are `{ canvas: 0, pane: 2, content: 1 }`.
The `style` prop overrides individual CSS variables last.
Import the public types and `themeStyle` from `@wfe/components/theme`.
`themeStyle` returns CSS variables only. Use `Theme` to include decoration behavior and popup ownership.

Nested themes can use different presets, modes, and accents.
Each scope owns its CSS and automatic popup portals. Ancestor preset rules stop at nested Theme boundaries.
DashboardShell inherits theme sizing unless you pass an explicit density.

`Theme.density` accepts `"default"`, `"compact"`, and `"comfortable"`.
Omitting it preserves the approved Default profile, including its 32px controls
and compact table rows. This profile now reports `data-ui-density="default"`.
Previously it reported compact despite applying different control sizes.
Update selectors that used that old metadata to identify the Default theme.
Explicit densities use the same sizing records as `uiScope` and `uiDensity`,
including controls inside table cells. Supply the matching `uiDensity` row height
to fixed-row virtual tables. `themeStyle` accepts the same density option.
An omitted DashboardShell density inherits its parent without declaring a new profile.
Nested Theme instances start with their own default profile.

Bare `uiScope()` still defaults to compact. Its optional `"dark"` argument and
raw `data-ui-theme="dark"` attribute retain the legacy palette for compatibility.
They do not enable the approved Theme appearance or decoration behavior.
Use Theme for new interfaces. Migrate legacy wrappers explicitly so applications
can review that appearance change. Both palettes have one data owner in
`theme/palette.ts`; legacy CSS is generated and checked for drift.
Application CSS owns page height and available table space.
Use solid content panels over the dotted main canvas to keep text readable.

The package includes the Fira Code OFL license and Open Props attribution beside the shipped styles.
See [the public consumer example](../examples/shared/appearance/ThemeConsumer.tsx) for nested layouts, popups, and live mode changes.

## Input decoration

Inputs show a dotted backing on hover and focus. Radios are square, and switches are rectangular.
The backing uses the same random geometry and opacity controls as buttons.
It adds no focus stops and leaves native validation and form submission unchanged.
Disabled and read-only controls omit the backing. Forced-color mode retains the standard focus outline.

Set `Theme.inputDecoration` to `false`, `"neutral"`, `"primary"`, or `"secondary"`.
The default is `"neutral"`. A nested Theme starts with its own default.
Set `decoration` on a `Field` to change its controls, or on an individual control to override that field.
Use this prop on `Input`, `Textarea`, `NumberInput`, `InputGroup`, `NativeSelect`, `SelectField`, `DatePicker`, `DateTimePicker`, and `FileInput`.
For compound APIs, use `Checkbox`, `Switch`, `RadioGroup`, `Select.Trigger`, or `Combobox.Control`.
A date picker or combobox draws one backing around its complete control.

Native text inputs, textareas, and selects have a presentation wrapper.
Their `ref`, `id`, `name`, event handlers, and validation attributes still target the native element.
The wrapper follows the shared field width limit and adds no tab stop.
Use `frameStyle` or `frameClass` to set a standalone native control's outer width.
The native control fills that wrapper. Keep text and native attributes on `style` and `class`.
In a compound control, set outer sizing on the compound control instead.
`Input`, `Textarea`, `NumberInput`, and `NativeSelect` accept these wrapper props.

Review the choices in the gallery at `?gallery=input-decoration`.

## Consumer tests

From the repository root, run `pnpm build` first.
Run `node examples/theme/run.mjs` to test source imports in a browser.
Run `BENCH_DISTRIBUTION=1 node examples/theme/run.mjs` to test the built package.
These tests require Playwright Chromium.
The hydration suite also includes this consumer and makes sure that its server nodes remain in place.

## Form section decoration

`FieldGroup` is a native fieldset. Its decoration is off by default.
Set `decoration={true}` for primary decoration, or choose `"neutral"`, `"primary"`, or `"secondary"`.
Set `decoration={false}` to remove it.

`decorationHover` and `decorationFocusWithin` default to `true`.
Set either to `false` to disable that trigger.
Focus within means that a control inside the section holds keyboard focus.
The section adds no focus stop and keeps native fieldset behavior.
Disabled sections and forced-color mode suppress the decoration.

Enabled sections use primary decoration by default, while inputs keep their neutral default.
Section colors do not change input colors. Both remain independently configurable.
The gallery at `?gallery=input-decoration` includes section colors and both triggers.

## Decoration geometry

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
At exponent 1, both modes match. Higher exponents increase reduction; lower exponents soften it.
Linear mode ignores the exponent. Zero reduction always keeps the full selected base effect in both modes.

`randomizeOnHover` defaults to `true`. Set it to `false` to hold the random samples while comparing geometry.

Each Theme uses one resize observer. Size and configuration changes reuse the current samples.
Removed nodes stop observation. Theme disposal releases both observers and the pointer listener.
Without ResizeObserver, the theme measures nodes on attachment and pointer entry.
`themeStyle` alone does not install measurement or randomization.

The gallery page `?gallery=decoration-geometry` provides sliders, size presets, and a new-samples action.
Its nested Theme inherits the gallery appearance. Its geometry controls affect only the preview.

Wide input and select previews compare 480-pixel and 800-pixel controls, constrained to the available width.
Their decorations stay visible while tuning. Their entered values survive size changes and new random samples.

## Vanilla preset

Vanilla uses system sans-serif text, ordinary borders, rounded controls, round radios, and pill switches.
Its default accent is neutral. An explicit accent selects a colored primary action.
Light, dark, and black/white modes use the same component structure and behavior.
Black/white uses black neutral text and borders over white content surfaces.
Subtle state fills retain visible hover and selection feedback.
Vanilla does not start decoration observers or mount decorative SVG patterns.
Decoration props have no effect inside vanilla, including explicit per-field requests.
Switching presets preserves input values, focus, selection, and open overlays.

Mode, accent, density, class, and style remain independent of preset selection.
Both presets support primary and secondary accents and surface layers.
Vanilla defaults to Surface 2 for the canvas and Surface 1 for panes and content.
Dividers, depth, and decoration controls belong to the default preset.
Use semantic CSS variables to customize vanilla borders and shadows.
Both presets capitalize system labels while preserving record values and prose.
The default vanilla control height is 36px. Explicit density profiles still use shared geometry records.
Caller-supplied virtual row heights remain authoritative.

The gallery selector lives under Appearance. Direct links accept `preset=vanilla` and the existing `scheme` parameter.
The same examples run under either preset.

## Custom appearance

Start with a preset and set CSS variables through the Theme style prop or an application stylesheet.
Inline Theme defaults take precedence over ordinary class declarations for those same variables.
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
See [the theme contract](theme-contract.md) for ownership and compatibility rules.

The CSS uses `@scope` to isolate nested themes. Consumers need a browser with CSS scope support.
Explicit portal mount overrides retain consumer ownership; place that mount inside the desired theme scope.
The shared stylesheet includes both presets for compatibility. Vanilla avoids decoration execution, but the stylesheet still contains default-theme assets.

## Reference presentation

Vanilla takes its direction from the neutral examples in [shadcn theming](https://ui.shadcn.com/docs/theming) and [Zaidan](https://zaidan.carere.dev/).
These references were reviewed on October 25, 2026. Vanilla is an independent WFE implementation, not a copied upstream preset or pixel-identical port.
No component runtime or styling dependency was added.
Review nested presets and a custom extension at `?gallery=themes`.
