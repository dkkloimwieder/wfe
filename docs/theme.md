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
Content uses surface 1. The main canvas uses surface 2 with subtle dots.
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
The `style` prop overrides individual CSS variables last.
Import the public types and `themeStyle` from `@wfe/components/theme`.
`themeStyle` returns CSS variables only. Use `Theme` to include decoration behavior and popup ownership.

Nested themes can use different modes and accents.
DashboardShell inherits theme sizing unless you pass an explicit density.
Application CSS owns page height and available table space.
Use solid content panels over the dotted main canvas to keep text readable.

The package includes the Fira Code OFL license and Open Props attribution beside the shipped styles.
See [the public consumer example](../examples/theme/ThemeConsumer.tsx) for nested layouts, popups, and live mode changes.

## Consumer tests

From the repository root, run `pnpm build` first.
Run `node examples/theme/run.mjs` to test source imports in a browser.
Run `BENCH_DISTRIBUTION=1 node examples/theme/run.mjs` to test the built package.
These tests require Playwright Chromium.
The hydration suite also includes this consumer and makes sure that its server nodes remain in place.
