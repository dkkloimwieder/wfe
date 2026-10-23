import { resolveTableMessages, type TableMessages } from './messages'
import { DatePicker } from '../components/DatePicker'

/** Date-only boundaries. Empty boundaries do not restrict the range. */
export type TableDateRange = { start?: string; end?: string }

export type TableDateFilterProps = {
  messages?: Partial<TableMessages>
  label: string
  startLabel?: string
  endLabel?: string
  clearStartLabel?: string
  clearEndLabel?: string
  value: TableDateRange | undefined
  onValueChange: (value: TableDateRange | undefined) => void
  disabled?: boolean
}

export function TableDateFilter(props: TableDateFilterProps) {
  const messages = resolveTableMessages(() => props.messages)
  function change(boundary: 'start' | 'end', value: string) {
    if (props.disabled) return
    const range = { ...props.value, [boundary]: value || undefined }
    props.onValueChange(range.start || range.end ? range : undefined)
  }
  return (
    <div class="table-filter" role="group" aria-label={props.label}>
      <DatePicker
        label={props.startLabel ?? messages.dateStart(props.label)}
        clearLabel={
          props.clearStartLabel ?? messages.clearDateStart(props.label)
        }
        value={props.value?.start}
        disabled={props.disabled}
        onValueChange={(value) => change('start', value ?? '')}
      />
      <DatePicker
        label={props.endLabel ?? messages.dateEnd(props.label)}
        clearLabel={props.clearEndLabel ?? messages.clearDateEnd(props.label)}
        value={props.value?.end}
        disabled={props.disabled}
        onValueChange={(value) => change('end', value ?? '')}
      />
    </div>
  )
}
