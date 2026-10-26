# Theme source audit

This inventory records the baseline for wfe-w2y.41.1. It does not declare the migration complete.

## Theme ownership

[Theme](../packages/components/src/theme/Theme.tsx) always starts decorateActions today.
[Default CSS](../packages/components/src/styles/default-theme.css) uses broad descendant selectors that cross nested theme boundaries.
[Style entry](../packages/components/src/styles/styles.css) imports all presets through the default stylesheet.
Separate preset ownership before changing colors. Retain compatible imports while coordinating asset exports with the active packaging work.

## Controls

[Buttons](../packages/components/src/styles/buttons.css) and [fields](../packages/components/src/styles/fields.css) fix square corners and one-pixel borders.
[Components](../packages/components/src/styles/components.css) contains additional square radio and switch rules.
Move these choices to visual roles. Keep compound-control layout, native inputs, labeling, and event ownership.
[DisclosureIndicator](../packages/components/src/components/DisclosureIndicator.tsx) mounts decorative pattern SVG for every glyph.
Choose plain or decorative presentation without replacing the surrounding control.

## Text and forms

[System text](../packages/components/src/styles/system-text.css) forces uppercase, including placeholders.
[Theme sizing](../packages/components/src/styles/theme-sizing.css) centers forms and limits their width.
[Form layout](../packages/components/src/styles/form-layout.css) mixes visual spacing with structural grids and container breakpoints.
Keep grid flow and full-span semantics. Expose casing, typography, spacing, and width through shared roles.
[FormLayout](../packages/components/src/components/FormLayout.tsx) already exposes useful decoration state hooks without extra decorative markup.

## Navigation and surfaces

[Layout](../packages/components/src/styles/layout.css) embeds EntryPanel dots and divider triangles.
Keep viewport sizing, centering, overflow, compact navigation, and equal-width EntryPanel actions structural.
Move decorative backing to the default preset. Add plain disclosure shapes for vanilla.
[Surfaces](../packages/components/src/styles/surfaces.css) already shares popup colors and radius but fixes border width.
[Portal mount](../packages/components/src/internal/portalMount.ts) prioritizes dialog ancestors over theme roots.
A theme nested inside a dialog needs a nearest-owner decision, not an unconditional dialog-first lookup.

## Data views

[Table](../packages/components/src/styles/table.css) and [workspace](../packages/components/src/styles/table-workspace.css) mix visual borders and padding with sticky geometry.
Keep resize handles, selection hit areas, virtual spacers, and scrolling structural.
[Chart theme](../packages/components/src/chart/theme.ts) shares colors; preserve caller-supplied series colors.
[Chart styles](../packages/components/src/styles/charts.css) fix tooltip radii and border width.
[Gantt](../packages/components/src/gantt/Gantt.tsx) mounts dotted milestone patterns directly.
[Gantt styles](../packages/components/src/styles/gantt.css) embed progress dots and fixed stroke widths.
Provide plain progress and milestones without changing dates, editing rules, or row measurements.
[Kanban](../packages/components/src/styles/kanban.css) forces uppercase stage labels. Use the shared system-text role.

## Baseline review

Capture the existing everything form, table controls, and Gantt at the running gallery before migration.
The remaining full-gallery comparison belongs to wfe-w2y.44.1.
Review narrow layouts, dark mode, floating surfaces, and nested theme scopes during implementation.
