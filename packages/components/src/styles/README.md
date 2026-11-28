# Shared styles

Import `@wfe/components/styles.css` once. Use Theme for a scoped theme and popup owner. Use `uiScope()` for a low-level scope when no Theme owner is needed.

## Scope and density

```tsx
import { uiDensity, uiScope } from '@wfe/components'
import '@wfe/components/styles.css'

const density = 'compact'
export const rowHeight = uiDensity(density).rowHeight

;<div {...uiScope(density)}>
  <button type="button">Export</button>
</div>
```

Match fixed row heights to the same density as the UI. Use `uiScope(density, 'dark')` for a raw Sketchy dark token scope. A scope without a mode inherits its nearest theme tokens.

## Style ownership

| Source                                        | Responsibility                                             |
| --------------------------------------------- | ---------------------------------------------------------- |
| `tokens.css`                                  | Generated values for presets, density, modes, and choices. |
| `theme.css` and `presentation.css`            | Scoped typography and shared paint.                        |
| `buttons.css`, `fields.css`, and `states.css` | Shared action, field, and interaction styles.              |
| `layout.css` and `form-layout.css`            | Shell regions, panel sizing, form grids, and gaps.         |
| `table.css` and `table-workspace.css`         | Table cells, column controls, and workspace geometry.      |
| `decoration.css`, `plain.css`, and `glow.css` | Additive appearance rules selected by Theme choices.       |

`--ui-layout-inset` sets the main panel inset and gap. `--ui-region-gap` supplies compact side-region spacing. Keep page layout and business-specific styles in the application.

Regenerate tokens with `node scripts/theme-tokens.mjs`. The integrity gate compares those tokens with their source. See the [theme guide](../../../../docs/theme.md#themes) for overrides and the [style fixture](../../../../examples/README.md#styles) for scope tests.
