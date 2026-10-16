import { SelectField } from '../components/Select'

export type TableChoice = { value: string; label: string; disabled?: boolean }
export type TableChoiceEditorProps<Choice extends TableChoice = TableChoice> = {
  value: string
  disabled: boolean
  invalid: boolean
  label: string
  choices: ReadonlyArray<Choice>
  placeholder?: string
  editorId?: string
  ownerId?: string
  describedBy?: string
  onValueChange: (value: string) => void
  onFocus?: () => void
}
/** Presentation only. The application owns the edited value and its acceptance. */
export function TableChoiceEditor<Choice extends TableChoice = TableChoice>(
  props: TableChoiceEditorProps<Choice>,
) {
  return (
    <SelectField
      data-editor={props.editorId}
      label={props.label}
      placeholder={props.placeholder}
      choices={props.choices}
      contentProps={{ 'data-table-editor-owner': props.ownerId }}
      aria-describedby={props.describedBy}
      invalid={props.invalid}
      value={props.value}
      disabled={props.disabled}
      onFocus={() => props.onFocus?.()}
      onValueChange={props.onValueChange}
    />
  )
}
