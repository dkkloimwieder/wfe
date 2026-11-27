import { For, Show, onCleanup } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { Checkbox } from '../components/Checkbox'
import { DropdownMenu } from '../components/DropdownMenu'
import { Icon } from '../components/Icon'
import { iconEllipsis } from '../icons'
import type { NativeRow } from './engine'
import type { TableMessages } from './messages'

export type TableLeadingColumn<T> = {
  label: string
  /** Numeric pixel width or a CSS length. */
  width?: number | string
  header?: JSX.Element
  cell: (row: NativeRow<T>) => JSX.Element
}

export type TableRowSelection = {
  selected: Readonly<Record<string, boolean>>
  onChange: (selected: Record<string, boolean>) => void
  selectAll?: 'page'
}

export type TableRowAction = {
  label: string
  onSelect: () => void
  disabled?: boolean
}

export type TableRowActionContext = {
  /** Read the connected trigger when an action needs to return focus. */
  getMenuTrigger: () => HTMLButtonElement | undefined
}

export const tableRowControlWidth =
  'calc(var(--ui-table-control-height, 26px) + 2 * var(--ui-cell-padding-x, 8px))'

export function isTableRowSelected(selection: TableRowSelection, id: string) {
  return (
    Object.hasOwn(selection.selected, id) && selection.selected[id] === true
  )
}

export function changeTableRowSelection(
  selection: TableRowSelection,
  ids: readonly string[],
  checked: boolean,
) {
  const selected = { ...selection.selected }
  if (checked) {
    selection.onChange({
      ...selected,
      ...Object.fromEntries(ids.map((id) => [id, true])),
    })
  } else {
    for (const id of ids) delete selected[id]
    selection.onChange(selected)
  }
}

export function TableRowCheckbox(props: {
  label: string
  checked: boolean
  indeterminate?: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <Checkbox
      checked={props.checked}
      indeterminate={props.indeterminate}
      disabled={props.disabled}
      onChange={props.onChange}
    >
      <Checkbox.Input
        aria-label={props.label}
        aria-checked={props.indeterminate ? 'mixed' : undefined}
      />
      <Checkbox.Control>
        <Checkbox.Indicator />
      </Checkbox.Control>
    </Checkbox>
  )
}

export function TableRowActionMenu(props: {
  rowId: string
  messages: Readonly<Required<TableMessages>>
  actions: readonly TableRowAction[] | undefined
  triggerRef: (node: HTMLButtonElement | undefined) => void
}) {
  function Menu() {
    onCleanup(() => props.triggerRef(undefined))
    return (
      <DropdownMenu>
        <DropdownMenu.Trigger
          variant="ghost"
          class="table-row-menu-trigger"
          aria-label={props.messages.rowActions(props.rowId)}
          ref={props.triggerRef}
        >
          <Icon glyph={iconEllipsis} />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content>
            <For each={props.actions}>
              {(action) => (
                <DropdownMenu.Item
                  disabled={action.disabled}
                  onSelect={action.onSelect}
                >
                  {action.label}
                </DropdownMenu.Item>
              )}
            </For>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu>
    )
  }
  return (
    <Show when={props.actions?.length}>
      <Menu />
    </Show>
  )
}
