# Theme contract

This contract tracks the implementation under Beads epics wfe-w2y.41 through wfe-w2y.44.
The Sketchy preset preserves the approved dotted appearance. The vanilla preset uses plain controls and neutral surfaces.
Theme identity, light or dark mode, and density are independent choices.
Applications keep the same component props, generated descriptions, data, and callbacks when themes change.

## Ownership

Shared components own semantics, keyboard behavior, focus, positioning, overflow, and measurement.
Themes own colors, typography, casing, surface paint, border widths, radii, shadows, motion, and optional decoration.
Fixed SVG view boxes, hit geometry, virtual offsets, and layout breakpoints are structural unless a documented role replaces them.
Themes do not own requests, permissions, routing, validation rules, or application state.

## Public selection

Theme accepts an additive preset property with default and vanilla values. Omission preserves default.
Existing mode, accent, secondaryAccent, density, style, class, and decoration options remain supported.
Both presets support primary and secondary accents and the shared surface scale.
Vanilla defaults to Surface 2 for the canvas and Surface 1 for panes and content.
Both presets capitalize system labels and preserve record values and prose.
Dividers, depth, and decoration controls configure the Sketchy preset.
Use semantic CSS variables to customize vanilla borders and shadows.
Vanilla suppresses decorative effects, including explicit decoration requests inside its scope.
An inner Theme owns its full presentation and can select either preset independently.
Switching a preset must preserve mounted content, values, focus, selection, and open overlays.
A consumer can extend a preset through class and style without copying component behavior.
No public export is removed or renamed.

## Shared variables

Existing --ui-* variables retain their names. Add roles instead of a variable for every declaration.
Background roles include canvas, pane, content, control, popup, muted, hover, and selection.
Foreground roles include text, muted text, heading, accent, on-accent, and on-selection.
A colored surface always has a matching foreground role. Error and disabled states remain distinguishable without color alone.
Border roles include shared width, control width, divider width, border color, and control border color.
Shape roles include control, panel, popup, radio, and switch radii, with --ui-radius as the shared fallback.
Typography roles include family, size, line height, weight, heading size, and system-text transformation.
Sizing roles retain current density records, control height, padding, field width, gap, and layout inset.
Focus roles retain width, offset, color, and visible keyboard focus behavior.
Icon stroke, panel shadow, popup shadow, and motion are separate visual roles.
Data geometry must use the same measurements as its virtual renderer. Explicit rowHeight remains authoritative.

## CSS boundaries

Shared structural CSS precedes preset rules. Consumer overrides come last.
Preset selectors stop at a nested Theme boundary. An ancestor preset must not style an inner preset.
Use stable ui-* classes and documented data/ARIA state attributes, not private vendor markup.
Common state hooks cover hover, focus-visible, pressed, selected, checked, expanded, invalid, readonly, and disabled.
Retain data-ui-text value/prose exclusions when a preset changes system text casing.
Component-specific preset rules are valid where variables alone cannot describe the presentation.

## Decoration lifecycle

Only the Sketchy preset starts randomized decoration observers and listeners.
Vanilla creates no decorative-only SVG or DOM. Structural wrappers remain stable during switching.
Switching away from decoration disposes its resources and removes its owned inline geometry values.
Reduced-motion and forced-color behavior remain usable in both presets.

## Floating content

Automatic portals remain inside the nearest owning Theme while respecting a containing top-layer dialog or popover.
A theme nested inside a dialog remains the owner of its own popup content.
Explicit consumer portal mounts retain their existing behavior; consumers must place them inside the desired theme.
Server markup and the first client render must use the same preset and mode.

## Validation

Test behavior, scope inheritance, resource cleanup, retained state, and virtual measurement consistency.
Review colors, radii, fonts, and decoration manually in the gallery. Do not assert cosmetic constants.
Run focused checks during implementation. Run full qualification once all theme epics reach completion.
