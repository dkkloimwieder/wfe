# Table selection

`createTableSelection` adds an optional rectangular selection to the shared Table.
Pass the same controller to `Table`, `ReadOnlyTable`, or a generated TableView through `bindings.selection`.
Tables without a controller retain their current text selection behavior.

The application supplies row IDs in displayed order, selectable column IDs, and synchronous copy text.
Exclude action columns and unloaded server records.
For grouped tables, use the displayed record keys and omit group headings.
The controller does not fetch records or call the server.
Server export remains a separate application action.

```tsx
const selection = createTableSelection({
  rows: () =>
    table.getDisplayKeys().flatMap((key) => {
      const item = table.getDisplayItem(key)
      return item.kind === 'row' ? [item.id] : []
    }),
  columns: () =>
    table
      .getVisibleColumns()
      .filter((column) => column.id !== 'actions')
      .map((column) => column.id),
  getText: ({ row, column }) => String(table.getValue(row, column) ?? ''),
})
return <ReadOnlyTable table={table} selection={selection} />
```

Drag across data cells to select a rectangle. Shift-click extends the rectangle.
Use arrow keys to move the active cell. Shift and an arrow key extend the selection.
Shift+Space selects whole rows. Control+Space selects whole columns.
Control+A selects all available cells. Escape clears the selection.
Use Command instead of Control on macOS.
Touch gestures retain scrolling and native text selection.
Inputs, links, buttons, and editable content retain their normal interaction.
Use `data-table-selection-ignore` on a custom interactive region to exclude it from selection gestures.
Header sorting, movement, renaming, and resizing keep their existing controls.

Control+C uses the normal copy event to copy tab-separated values.
The controller quotes values that contain tabs, line breaks, or quotes.
The application controls value formatting through `getText`.
For mounted cells, a native DOM range supports the browser Copy command.
Cell shading replaces the range's text highlight.
The copied rectangle comes from logical IDs, including available rows outside the virtual window.
Native editor selections and text selections outside the table retain their normal copy behavior.
If copy text is unavailable, the handler leaves the clipboard unchanged.

Pass `value` and `onChange` for application-controlled selection.
Keep each accepted range object immutable and return a new object to accept a request.
Without `value`, commands update the local selection immediately and also report through `onChange`.
The public controller provides `select`, `move`, `selectRow`, `selectColumn`, `selectAll`, `clear`, and `copyText`.

A row or column order change clears the range.
Filtering, hiding columns, and collapsing groups also clear it when the supplied ID sequences change.
Equivalent ID sequences, width changes, and record value changes preserve the range.
If a controlled application rejects clearing, the component still hides the obsolete range and prevents copying it.
The application can supply `onReveal` to scroll a virtual row into view after the accepted focus changes.
The controller paints only mounted cells and creates no extra row or cell owners.

## Record actions and cell copying

The engine also exposes `state.rowSelection`, `setRowSelection`, and each row's `getIsSelected` and `toggleSelected` methods.
This model records selected IDs. The table does not automatically render checkboxes or execute bulk actions for it.
An application can render a selection checkbox and use accepted IDs for its own command.
The application decides whether hidden, filtered, or unloaded records remain eligible for that command.

For example, selecting record B for an application action can coexist with a copied cell range from record A.
Clearing the copied range leaves B selected. Clearing `rowSelection` leaves A's copied range intact.
`createTableSelection.selectRow()` selects cells for copying. It does not call a row's `toggleSelected()` method.

The read-only table example demonstrates rectangular copying.
The editing example demonstrates application-supplied record actions.
These examples do not infer bulk-action eligibility from the copied rectangle.
See [engine capabilities](table-engine.md) for state ownership and processing policies.
