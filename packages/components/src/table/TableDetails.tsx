import { resolveTableMessages, type TableMessages } from './messages'
import { Show, createContext, useContext, onCleanup, untrack } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { Button } from '../components/NativeFields'
import { DisclosureIndicator } from '../components/DisclosureIndicator'
import { ownsFocus } from '../internal/ownedFocus'

const TableDetailContext = createContext(false)
export const useTableDetail = () => useContext(TableDetailContext)

/** Applications own expansion, child records, loading, and content lifetimes. */
export type TableRowDetails = {
  expanded: (id: string) => boolean
  onExpandedChange: (id: string, expanded: boolean) => void
  render: (id: string) => JSX.Element
  canExpand?: (id: string) => boolean
  disabled?: (id: string) => boolean
  label?: (id: string, expanded: boolean) => string
}

export function TableDetailToggle(props: {
  messages?: Partial<TableMessages>
  rowId: string
  contentId: string
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  label?: string
  disabled?: boolean
  describedBy?: string
  children?: JSX.Element
  ref?: (element: HTMLButtonElement) => void
}) {
  const messages = resolveTableMessages(() => props.messages)
  return (
    <Button
      class="sub-table-toggle ui-disclosure-trigger"
      data-subtable-toggle={props.rowId}
      aria-label={
        props.label ?? messages.rowDetails(props.rowId, props.expanded)
      }
      aria-describedby={props.describedBy}
      aria-expanded={props.expanded ? 'true' : 'false'}
      aria-controls={props.expanded ? props.contentId : undefined}
      disabled={props.disabled}
      ref={props.ref}
      onClick={(event) => {
        event.currentTarget.focus({ preventScroll: true })
        props.onExpandedChange(!props.expanded)
      }}
    >
      <span class="ui-icon-text-slot">
        <DisclosureIndicator />
      </span>
      {props.children}
    </Button>
  )
}

/** Mount detail content only for accepted expansion. No child data is retained here. */
export function TableDetailRow(props: {
  id: string
  rowId: string
  expanded: boolean
  columnSpan: number
  children: JSX.Element
  ref?: (element: HTMLTableRowElement) => void
  restoreFocus?: () => HTMLElement | undefined
}) {
  function Content() {
    let element: HTMLTableRowElement | undefined
    onCleanup(() => {
      const row = element
      const document = row?.ownerDocument
      const active = document?.activeElement
      if (!row || !document || !active || !ownsFocus(row, active)) return
      queueMicrotask(() => {
        if (
          document.activeElement === document.body ||
          document.activeElement === active
        ) {
          const target = untrack(() => props.restoreFocus?.())
          if (
            target?.isConnected &&
            !target.matches(':disabled') &&
            !target.closest('[hidden], [inert], [aria-hidden="true"]')
          ) {
            for (
              let ancestor: Element | null = target;
              ancestor;
              ancestor = ancestor.parentElement
            ) {
              const style = document.defaultView?.getComputedStyle(ancestor)
              if (
                style?.display === 'none' ||
                style?.visibility === 'hidden' ||
                style?.visibility === 'collapse'
              )
                return
            }
            target.focus({ preventScroll: true })
          }
        }
      })
    })
    return (
      <tr
        id={props.id}
        class="sub-table-row"
        data-child-row={props.rowId}
        ref={(node) => {
          element = node
          props.ref?.(node)
        }}
      >
        <td colspan={props.columnSpan}>
          <TableDetailContext value={true}>{props.children}</TableDetailContext>
        </td>
      </tr>
    )
  }
  return (
    <Show when={props.expanded}>
      <Content />
    </Show>
  )
}
