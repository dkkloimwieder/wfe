# Shared styles

Applications explicitly import `@wfe/components/styles.css`.
All selectors stay inside a `data-ui` scope. The stylesheet leaves unrelated content unchanged.
Table editors and standalone controls share fonts, spacing, borders, colors, focus, and disabled states.
Application fixture page styles stay outside this package.
Generic dashboard styles live in `layout.css`.
Rectangular surfaces use square corners by default.
Dashboard panels use one inset and remove default margins from direct headings and paragraphs.
Grouping controls use a grid that keeps ordering fields and action groups aligned.
Example builds explicitly select source or distribution CSS.
Each build records its actual CSS inputs and rejects stale or mixed copies.

## Scope and density

Use `uiScope()` on a wrapper that contains the controls.
Compact density remains the default. Comfortable density increases spacing and row height.

```tsx
import { uiDensity, uiScope } from '@wfe/components'
import '@wfe/components/styles.css'

const density = 'compact'
const rowHeight = uiDensity(density).rowHeight

<div {...uiScope(density)}>
  <button type="button">Export</button>
</div>
```

Pass the same density to fixed row geometry and its UI scope.
`UI_DENSITIES` provides both CSS values and virtual row height.
Compact rows use 32 pixels. Comfortable rows use 40 pixels.
Do not override `--ui-row-height` independently of the virtual row configuration.
Measured rows keep their existing measurement behavior.

## Themes and portals

Use `uiScope(density, 'dark')` for the optional dark theme.
Applications can override `--ui-*` variables inside a scope.
Theme variables change colors without changing geometry.
Each wrapper owns its density and theme.
Nested scopes inherit theme variables unless the application overrides them.

Mount popup portals inside the owning UI scope and outside the table scroller.
The fixture marks this wrapper with `data-ui-portal-root` and passes it to `Portal.mount`.
Popups inherit live theme values without copying styles or adding observers.

## Browser evidence

The isolated fixture in `../../../../examples/styles` tests scope isolation, independent themes, row sizes, and visible focus.
Analytics tests compare CSS row height with virtual geometry after density changes.
Popup tests keep popup size and placement stable through a live theme change.
The standard qualification command runs these tests with the existing fixture suites.

## System text

Buttons, labels, headings, table headers, and other system text use uppercase visual text.
Input values, record cells, selected record choices, grouping values, and prose keep their original case.
The stylesheet changes presentation and does not rewrite application strings.
Placeholders and grouping configuration choices use uppercase.

Use `data-ui-text="system"` for custom system labels or configuration choices.
Use `data-ui-text="value"` for record text inside an action or heading.
Use `data-ui-text="prose"` for custom prose inside a system label.

## Style ownership

`theme.css` owns library colors, scope typography, and box sizing.
`buttons.css` owns button variants and tones.
`fields.css` owns common field borders and surfaces.
`components.css` owns component layout, shapes, and selection states.
`surfaces.css` owns floating borders, backgrounds, text, and shadows.
`states.css` owns common focus, invalid, disabled, read-only, and field hover rules.
The remaining files own layout, table workspace, calendar, and text presentation.

## Library defaults and application overrides

The library default is black text on white surfaces.
Its optional dark theme uses surface `#171d27` and focus `#88baff`.
The review examples supply their own approved palette through the shared appearance switcher.
For example, the review dark Surface 1 uses `#171717`.
Those application overrides do not change the library defaults.

Buttons without an explicit tone inherit `--ui-button-color` and `--ui-button-on-color`.
These roles apply to internal icon actions and delegated overlay buttons too.
Unset roles retain the existing neutral appearance.
Explicit `tone="neutral"` uses the text and surface roles.
Explicit `tone="accent"` uses the accent roles.

Floating components share `--ui-popup-surface`, `--ui-popup-text`, `--ui-popup-border`, and `--ui-popup-shadow`.
Unset surface and text roles inherit `--ui-surface` and `--ui-text`.
Choices and table header menus inherit `--ui-control-border`.
Dialogs, popovers, menus, tooltips, and toasts inherit `--ui-border`.
An explicit popup border role overrides both defaults.

Choices, dialogs, and table header menus retain their existing hard shadow default.
Popovers, action menus, tooltips, and toasts retain their existing soft shadow default.
Set `--ui-popup-shadow: none` to remove shadows from all those components, including Toast.
Sheet retains its edge placement and no shadow.
Floating components share square corners by default and accept `--ui-radius`.
Their dimensions, padding, positioning, and modal layers remain specific to each component.
Roles resolve on each component so nested scopes and live application overrides work.

Fields share `--ui-control-hover` with the existing `--ui-highlight` fallback.
Disabled and read-only fields use `--ui-muted-surface` and suppress editable hover feedback.
A selected Switch retains its highlight and thumb position in these states.
`--ui-disabled-opacity` applies once to each visible control or toggle group.
The default opacity is 1, so disabled actions do not acquire a gray fill.
Unavailable choice options retain opacity 0.65 and muted text.
Unavailable action menu items retain opacity 0.5.
Choice selection uses `--ui-selection` and `--ui-on-selection`.
Action menu focus retains the hover surface and inset focus border.
All visible field focus uses `--ui-focus-ring` with the `--ui-focus` fallback.
Compound filter focus surrounds the complete field and suppresses the inner input outline.

Real component browser cases cover both library themes, both densities, state transitions, surface overrides, and forced colors.
Consumer suites cover the approved application palettes and table/form composition.

## Nested floating content

Choices, popovers, menus, and tooltips share the same popup layer.
Dialogs use the next layer, and notifications remain above dialogs.
A child portal stays inside the closest native popover or dialog portal.
This keeps choices above their parent without clipping them to the dialog content scroller.
Modal focus, dismissal, and accessibility rules remain with the dialog primitives.

The component matrix opens nested content with real pointer and keyboard input.
It tests Escape, focus return, application acceptance, composition, and disposal.

Native popover hosts need visible overflow for child portals.
Keep scrolling inside a separate content element.
TableHeaderFilter provides this structure through its internal content wrapper.

`form-layout.css` owns responsive form grids, field groups, and column spans.
The generator and direct component consumers share these rules.

## Status tiles

`status-tiles.css` owns the compact StatusTile layout, truncated labels/detail, and wrapping values.
Card owns its border, padding, surface, and square corners. Badge owns state tones.
The tile reads the existing `--ui-panel-shadow` role and introduces no palette.
TileRow aliases DashboardGrid and uses its existing responsive columns and gap.

## Form presentation roles

`--ui-control-surface` supplies the editable field fill.
`--ui-control-line-height`, `--ui-label-line-height`, and `--ui-label-weight` control shared typography.
`--ui-focus-width` and `--ui-focus-offset` control the focus outline.
`--ui-field-focus-border` supplies an optional border color for focused editable fields.
`--ui-field-gap` supplies form section spacing. Action rows retain `--ui-gap`.
