import { resolveTableMessages, type TableMessages } from './messages'
import { type ClassValue } from '../internal/classes'
import { Button } from '../components/NativeFields'
import { nativeEvents } from '../utils/nativeEvents'

export function TableSort(props: {
  messages?: Partial<TableMessages>
  label: string
  sorted: 'asc' | 'desc' | false
  onSort: (multi: boolean) => void
  disabled?: boolean
  class?: ClassValue
  accessibleLabel?: string
  unsortedMark?: string
}) {
  const messages = resolveTableMessages(() => props.messages)
  return (
    <Button
      tone="neutral"
      type="button"
      class={props.class ?? 'column-sort'}
      aria-label={props.accessibleLabel ?? messages.sortBy(props.label)}
      disabled={props.disabled}
      ref={nativeEvents<HTMLElement>({
        click: (event) => props.onSort(event.shiftKey),
      })}
    >
      <span class="column-sort-label">{props.label}</span>
      <span aria-hidden="true">
        {props.sorted === 'asc'
          ? '↑'
          : props.sorted === 'desc'
            ? '↓'
            : (props.unsortedMark ?? '↕')}
      </span>
    </Button>
  )
}
