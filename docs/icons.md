# Icons

WFE owns the icon API and presentation. The expanded catalog contains pinned Lucide SVG artwork.
The renderer uses WFE color and stroke roles. Geometry remains editable in the owned catalog.
The existing WFE icons and disclosure triangles keep their current artwork.

## Selective imports

```tsx
import { Icon, IconButton } from '@wfe/components'
import { iconSearch } from '@wfe/components/icons'

;<IconButton aria-label="Search">
  <Icon glyph={iconSearch} />
</IconButton>
```

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

## Gallery and maintenance

The gallery at `?gallery=icons` supports search, selection, and incremental results.
The gallery intentionally imports the full collection. It loads that page in a separate chunk.

Upstream inputs, licenses, and hashes live in `packages/components/src/vendor/icons`.
Run `node scripts/icons.mjs` to regenerate definitions from those pinned inputs.
Run `node scripts/icons.mjs --check` to compare generated definitions and provenance.
The importer accepts only basic SVG geometry. It rejects scripts, external references, and unsupported content.
Run `node scripts/test-icon-bundle.mjs` after `pnpm build` to test selective imports from source and built packages.
