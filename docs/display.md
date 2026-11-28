# Display

These components present values and status. They share styling and accessibility conventions across views.

Contents

- [Status tiles](#status-tiles)
- [Status and display messages](#status-and-display-messages)

## Status tiles

StatusTile presents a labeled value and an explicit status.

### Import

Import `StatusTile` and `TileRow` from `@wfe/components`.

### Example

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

### Behavior and options

The supported states are `ok`, `warning`, and `unknown`.

TileRow uses the existing DashboardGrid implementation.
Its columns wrap as the available width decreases.
The existing `--ui-panel-min-width` variable controls the minimum preferred width.
Children retain their natural content height and share each grid row's height.

StatusTile composes the existing Card, Badge, and ValueDisplay.
It uses Card's border, padding, radius, and surface.
It reads the existing `--ui-panel-shadow` role, with no shadow when that role is absent.
Badge supplies the existing success, warning, and neutral tones.
Visible state text preserves meaning when colors are unavailable.
No new palette belongs to these components.

#### Values and text

Without a format, StatusTile renders the value as text.
Null, undefined, and empty strings use `messages.emptyValue`, which defaults to empty text. Zero and false remain values.
The optional format uses the existing ValueDisplay contract.
Locale, date pattern, time pattern, and timezone use its existing properties.
Read [display formatting](tables.md#shared-value-formatting) and [date formats](inputs.md#date-and-time-inputs) for those contracts.
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

The [example](../examples/README.md#status-tiles) covers all states, formats, missing detail, long text, shared themes, and narrow layouts.

### Application ownership

Supply the value, state, and optional detail. Own thresholds, requests, polling, persistence, and any live announcements.

### Gallery

Open `?gallery=dashboard-layout` for tiles in a responsive row.

## Status and display messages

Display message overrides replace owned labels and status text.

### Import

Import `Toast`, `AlertDialog`, `ValueDisplay`, and `StatusTile` from `@wfe/components`.

### Example

```jsx
import { ValueDisplay } from '@wfe/components'

export function ActiveStatus() {
  return (
    <ValueDisplay
      value={true}
      format="boolean-symbol"
      messages={{ yes: 'Active', no: 'Inactive' }}
    />
  )
}
```

### Behavior and options

| Component    | Message type and defaults                      | Keys                                                   |
| ------------ | ---------------------------------------------- | ------------------------------------------------------ |
| Toast        | `ToastMessages`, `toastMessages`               | `regionLabel`, `dismissLabel`, `close`                 |
| AlertDialog  | `AlertDialogMessages`, `alertDialogMessages`   | `cancel`                                               |
| ValueDisplay | `ValueDisplayMessages`, `valueDisplayMessages` | `yes`, `no`, `emptyValue`                              |
| StatusTile   | `StatusTileMessages`, `statusTileMessages`     | `ok`, `warning`, `unknown`, plus the ValueDisplay keys |

These exports are available from `@wfe/components`. AlertDialog also exports its contract from `@wfe/components/alert-dialog`.

Toast.Region supplies messages to its contained Toast roots. A root can override those messages for its own notification. Toast.CloseButton can override them again. Explicit `aria-label` and button children take precedence. Notification titles, descriptions, and other caller content are unchanged. Live-region priority, dismissal, keyboard handling, and timer behavior remain the same.

AlertDialog supplies its cancel message to AlertDialog.Cancel. The trigger and outside pointer input leave an open alert dialog in place. Escape targets Cancel, or the close button when Cancel is absent. It activates the target only if the button is enabled. The cancel part also accepts a partial messages override. Explicit cancel children and `aria-label` keep their existing precedence. The application supplies the alert title, description, and action text. Generic Dialog.CloseButton has no default label to translate.

ValueDisplay uses `yes` and `no` for boolean text and the accessible name of a boolean symbol. `emptyValue` replaces null, undefined, or empty-string values. It defaults to an empty string. StatusTile forwards these messages to formatted values and uses `emptyValue` for an empty unformatted value. Unformatted nonempty values remain caller content.

Messages do not select number or date formats. Continue to supply `locale`, date/time formats, and timezone separately. The low-level `formatDisplayValue` helper returns English boolean text. Use ValueDisplay to translate that text.

### Application ownership

Supply message overrides and application content. Choose formatting locale and time zone separately from the message language. Own notification titles and alert actions.

### Gallery

Open `?gallery=display` for display controls and notifications. Open `?gallery=dialogs` for AlertDialog.
