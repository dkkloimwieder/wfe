# Buttons and icons

Buttons start actions, and icons label them. Button, IconButton, and ButtonLink share variants and tones, and Icon draws glyphs from the owned catalog.

Contents

- [Buttons](#buttons)
- [Icons](#icons)

## Buttons

Button, IconButton, and ButtonLink share action styles.

### Import

Import `Button`, `IconButton`, and `ButtonLink` from `@wfe/components` or `@wfe/components/fields`.

### Example

```jsx
import { Button, ButtonLink } from '@wfe/components'

export function RecordActions() {
  return (
    <>
      <Button type="submit" variant="filled" tone="primary">
        Save
      </Button>
      <ButtonLink href="/records" variant="ghost">
        Records
      </ButtonLink>
    </>
  )
}
```

### Behavior and options

`Button` and `IconButton` accept `variant="outline"`, `"filled"`, `"inverted"`, or `"ghost"`.
Set `tone` to `"neutral"`, `"primary"`, `"secondary"`, or `"accent"` to choose a color independently of the variant.
Outline is the default variant. Omitting `tone` uses the theme's button color roles, including `--ui-button-color` and `--ui-button-on-color`.
This differs from explicit `tone="neutral"`, which uses the neutral text and surface roles.
The internal `data-tone="default"` marker represents the omitted-tone behavior. `"default"` is not a supported `ButtonTone` prop value.
Variants share dimensions, theme radii, focus, disabled behavior, events, and the default `type="button"`.

Neutral outline uses the existing surface, text, and button border.
Colored outlines use their selected role for text and borders at rest.
Filled uses the selected tone as its background, with a contrasting foreground.
Neutral filled uses the text and surface colors. A filled color role uses its matching foreground.
Set the color and foreground properties together when you choose custom colors.
If those properties are absent, colored tones fall back to the existing text and surface colors.
Inverted swaps the selected filled button's foreground and background.
A primary filled button with a blue background and white text becomes white with blue text when inverted.
Ghost uses a transparent border and background, with text in the selected tone. Its border still reserves space.
Outline and ghost use the existing highlight surface on hover.
Filled changes its fill on hover. Inverted changes its fill and text on hover. Buttons add no underline.
`--ui-primary-hover` and `--ui-primary-inverted-hover` let the application supply primary hover colors.
`--ui-button-filled-hover` and `--ui-button-inverted-hover` provide neutral hover colors.
The defaults mix existing colors. Custom themes must preserve readable contrast in both states.
All variants retain the shared focus outline. Forced colors use system button colors and a visible border.

`ButtonLink` renders a native anchor with the same appearance as `Button`.
Supply `href` and use the same `variant`, `tone`, and structured `class` properties.
Native anchor attributes, events, and refs remain available, including `target`, `rel`, and `download`.
The browser handles navigation, modified clicks, keyboard activation, and history.
`ButtonLink` has no `disabled` property. An anchor does not support native disabled behavior.
If navigation is unavailable, render text or omit the action.
`aria-disabled` alone does not prevent navigation.
Use `Button` for submission and local actions.

### Application ownership

Choose the button type, variant, tone, and callback. Name icon-only buttons with `aria-label`. The application owns routing, permissions, submission, and confirmation.

### Gallery

Open `?gallery=buttons` for button variants and states.

## Icons

Icon renders a catalog glyph or application-supplied geometry with shared styles.

### Import

Import `Icon` from `@wfe/components`. Import individual glyphs from `@wfe/components/icons`.

### Example

```tsx
import { Icon, IconButton } from '@wfe/components'
import { iconSearch } from '@wfe/components/icons'

;<IconButton aria-label="Search">
  <Icon glyph={iconSearch} />
</IconButton>
```

### Behavior and options

Each named definition is a static export. Production bundlers with tree shaking can remove unused definitions.
Tree shaking means that a bundler removes unused exports.
The renderer does not import the expanded catalog.
A namespace lookup by a runtime string can retain the entire collection. Import the required definitions by name instead.
Build tools must enable tree shaking. Native browser module loading does not remove exports.

Existing `Icon name="refresh"` calls remain supported.
The shared renderer retains the 17 legacy definitions for compatibility, including when callers pass `glyph`.
Selective imports remove unused definitions from the expanded catalog.
Use `glyph` or `name`, never both. `IconDefinition` also accepts application-owned geometry.
Icons are decorative and cannot receive focus. Put an accessible name on the surrounding button or link.
The shared theme controls stroke width. Non-scaling strokes preserve that width when 24-unit artwork renders at 16 pixels.

Upstream inputs, licenses, and hashes live in `packages/components/src/vendor/icons`.
Run `node scripts/icons.mjs` to regenerate definitions from those pinned inputs.
Run `node scripts/icons.mjs --check` to compare generated definitions and provenance.
The importer accepts only basic SVG geometry. It rejects scripts, external references, and unsupported content.
Run `node scripts/test-icon-bundle.mjs` after `pnpm build` to test selective imports from source and built packages.

### Application ownership

Choose a glyph and provide an accessible name on its surrounding control. Own any custom icon geometry.

### Gallery

Open `?gallery=icons` to search the catalog. The gallery loads this page and the full catalog on demand.
