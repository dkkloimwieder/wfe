# Shared styles

Applications explicitly import `@wfe/components/styles.css`.
All selectors stay inside a `data-ui` scope. The stylesheet leaves unrelated content unchanged.
Table editors and standalone controls share fonts, spacing, borders, colors, focus, and disabled states.
Application fixture page styles stay outside this package.
Generic dashboard styles live in `layout.css`.
Rectangular surfaces use square corners by default.
Dashboard panels use one inset and remove default margins from direct headings and paragraphs.
Grouping controls use a grid that keeps ordering fields and action groups aligned.
Source consumers load source styles through the `wfe-source` condition.

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
