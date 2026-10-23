import { resolveTableMessages, type TableMessages } from './messages'
import { For, createUniqueId } from 'solid-js'
import { SelectField } from '../components/Select'
import type { ValueFormat } from '../utils/valueFormat'

const choices = (
  messages: Readonly<TableMessages>,
): Record<
  'boolean' | 'date' | 'datetime' | 'number',
  ReadonlyArray<{ value: ValueFormat; label: string }>
> => ({
  boolean: [
    { value: 'boolean-symbol', label: messages.formatBooleanSymbol },
    { value: 'boolean-text', label: messages.formatBooleanText },
  ],
  datetime: [
    { value: 'datetime', label: messages.formatDatetime },
    { value: 'datetime-iso', label: messages.formatDatetimeIso },
  ],
  date: [
    { value: 'date-iso', label: messages.formatDateIso },
    { value: 'date', label: messages.formatDate },
    { value: 'date-short', label: messages.formatDateShort },
    { value: 'date-long', label: messages.formatDateLong },
  ],
  number: [
    { value: 'number-plain', label: messages.formatNumberPlain },
    { value: 'number-grouped', label: messages.formatNumberGrouped },
    { value: 'number-decimal', label: messages.formatNumberDecimal },
  ],
})
export type TableFormattingProps = {
  messages?: Partial<TableMessages>
  columns: ReadonlyArray<{
    id: string
    label: string
    kind: 'boolean' | 'date' | 'datetime' | 'number'
  }>
  value: Readonly<Record<string, ValueFormat | undefined>>
  onValueChange: (columnId: string, format: ValueFormat) => void
  disabled?: boolean
}

/** Controlled display choices. The application applies the selected format. */
export function TableFormatting(props: TableFormattingProps) {
  const messages = resolveTableMessages(() => props.messages)
  return (
    <div class="table-formatting">
      <For each={props.columns}>
        {(column) => {
          const id = createUniqueId()
          return (
            <div class="table-filter">
              <label for={id} class="ui-label">
                {column.label}
              </label>
              <SelectField
                id={id}
                label={column.label}
                choices={choices(messages)[column.kind]}
                value={
                  props.value[column.id] ??
                  choices(messages)[column.kind][0]!.value
                }
                disabled={props.disabled}
                data-ui-text="system"
                onValueChange={(value) => {
                  const choice = choices(messages)[column.kind].find(
                    (choice) => choice.value === value,
                  )
                  if (choice) props.onValueChange(column.id, choice.value)
                }}
              />
            </div>
          )
        }}
      </For>
    </div>
  )
}
