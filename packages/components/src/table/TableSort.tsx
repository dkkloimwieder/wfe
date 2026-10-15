import { Button } from '../components/NativeFields'
import { nativeEvents } from '../utils/nativeEvents'

export function TableSort(props: {
  label: string
  sorted: 'asc' | 'desc' | false
  onSort: (multi: boolean) => void
  disabled?: boolean
  class?: string
  accessibleLabel?: string
  unsortedMark?: string
}) {
  return (
    <Button
      type="button"
      class={props.class ?? 'column-sort'}
      aria-label={props.accessibleLabel ?? `Sort by ${props.label}`}
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
