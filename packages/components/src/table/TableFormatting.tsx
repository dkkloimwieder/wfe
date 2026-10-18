import { For, createUniqueId } from 'solid-js'
import { SelectField } from '../components/Select'
import type { ValueFormat } from '../utils/valueFormat'

const choices: Record<
  'boolean' | 'date' | 'datetime' | 'number',
  ReadonlyArray<{ value: ValueFormat; label: string }>
> = {
  boolean: [
    { value: 'boolean-symbol', label: 'Check / cross' },
    { value: 'boolean-text', label: 'Yes / No' },
  ],
  datetime: [
    { value: 'datetime', label: 'Date and time' },
    { value: 'datetime-iso', label: 'UTC ISO timestamp' },
  ],
  date: [
    { value: 'date-iso', label: 'YYYY-MM-DD' },
    { value: 'date', label: 'Configured date' },
    { value: 'date-short', label: 'Short date' },
    { value: 'date-long', label: 'Long date' },
  ],
  number: [
    { value: 'number-plain', label: 'Plain number' },
    { value: 'number-grouped', label: 'Grouped number' },
    { value: 'number-decimal', label: 'Two decimal places' },
  ],
}
export type TableFormattingProps = {
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
  return (
    <div class="table-formatting">
      <For each={props.columns}>
        {(column) => {
          const id = createUniqueId()
          return (
            <div class="table-filter">
              <label for={id}>{column.label}</label>
              <SelectField
                id={id}
                label={column.label}
                choices={choices[column.kind]}
                value={props.value[column.id] ?? choices[column.kind][0]!.value}
                disabled={props.disabled}
                data-ui-text="system"
                onValueChange={(value) => {
                  const choice = choices[column.kind].find(
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
