# Default theme

`Theme` applies the approved appearance from `v0.0.4`.
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

Nested themes can use different modes and accents.
DashboardShell inherits theme sizing unless you pass an explicit density.
Application CSS owns page height and available table space.
Use solid content panels over the dotted main canvas to keep text readable.

The package includes the Fira Code OFL license and Open Props attribution beside the shipped styles.
See [the public consumer example](../examples/theme/ThemeConsumer.tsx) for nested layouts, popups, and live mode changes.

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
Each defaults to 2 and accepts 0 through 8. Set one to 0 to disable only that axis.
The playground exposes these as Base rotation, Base taper X, and Base taper Y.

`rotationReduction` and `taperReduction` control reduction, not effect strength. Both accept values from 0 through 8.
The defaults are taper reduction 0.3 and rotation reduction 0.05.
Zero reduction keeps the selected base angle range at every size.
Higher values reduce the corresponding effect more as size grows. Values below 1 apply gentler reduction than 1.
The playground adjusts all numeric controls in steps of 0.05.

Rotation uses the longest side. Taper uses height for X-axis tilt and width for Y-axis tilt.
Each angle keeps its own independent random sample.
Linear mode multiplies the default angle by `1 / (1 + reduction × size / 100)`.
For a 100-pixel side, reduction 0 keeps the full effect, reduction 1 keeps half, and reduction 3 keeps one-quarter.

`scale` defaults to `"power"`, which raises that multiplier to `exponent`. Set `scale="linear"` to use the multiplier directly.
`exponent` defaults to 2 and accepts 0.1 through 4. The playground adjusts it in steps of 0.05.
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
