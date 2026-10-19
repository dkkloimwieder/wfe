# Status tiles

StatusTile presents a label, raw value, optional detail, and explicit state.
The supported states are `ok`, `warning`, and `unknown`.
The application supplies each state. The component never infers health from a value.
It performs no requests, polling, threshold comparisons, or persistence.

TileRow uses the existing DashboardGrid implementation.
Its columns wrap as the available width decreases.
The existing `--ui-panel-min-width` variable controls the minimum preferred width.
Children retain their natural content height and share each grid row's height.

## Composition

Use the public component stylesheet and a UI scope around these components.
Applications can use the same density, surfaces, accent, and shadow roles as other controls.

```tsx
import { StatusTile, TileRow, uiScope } from '@wfe/components'
import '@wfe/components/styles.css'

export function Summary() {
  return (
    <section {...uiScope()}>
      <TileRow>
        <StatusTile
          label="Available records"
          value={1250}
          format="number-grouped"
          detail="Current snapshot"
          state="ok"
        />
        <StatusTile label="Queue" value={12} state="warning" />
        <StatusTile label="Snapshot" value={undefined} state="unknown" />
      </TileRow>
    </section>
  )
}
```

StatusTile composes the existing Card, Badge, and ValueDisplay.
It uses Card's border, padding, square corners, and surface.
It reads the existing `--ui-panel-shadow` role, with no shadow when that role is absent.
Badge supplies the existing success, warning, and neutral tones.
Visible state text preserves meaning when colors are unavailable.
No new palette belongs to these components.

## Values and text

Without a format, StatusTile renders the value as text.
Null and undefined render empty text. Zero and false remain values.
The optional format uses the existing ValueDisplay contract.
Locale, date pattern, time pattern, and timezone use its existing properties.
Read [display formatting](table-formatting.md) and [date formats](date-inputs.md) for those contracts.
Formatting does not change the raw value.

Long values wrap inside the card.
Labels and detail occupy one visual line with an ellipsis when space is insufficient.
Their full text remains in the DOM and native title attributes.
Omitted or empty detail renders no paragraph.
System labels and state text use the shared uppercase style. Values and detail preserve their normal text.

Each tile is a named group by default.
The label supplies its accessible name through a generated DOM association.
Native Card properties preserve caller roles, accessible naming, IDs, classes, events, styles, and refs.
The application decides whether to add live announcements.
TileRow supplies layout only. When naming the row, also supply an appropriate native role.

The [example](../examples/status-tiles/README.md) covers all states, formats, missing detail, long text, shared themes, and narrow layouts.
