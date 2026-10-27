import type {
  DatePickerMessages,
  DateTimePickerMessages,
  TimePickerMessages,
  NumberInputMessages,
  ValueDisplayMessages,
} from '@wfe/components'

/** UI text for standard child controls; descriptions and application errors remain unchanged. */
export interface GeneratorControlMessages {
  datePicker?: Partial<DatePickerMessages>
  dateTimePicker?: Partial<DateTimePickerMessages>
  timePicker?: Partial<TimePickerMessages>
  numberInput?: Partial<NumberInputMessages>
  valueDisplay?: Partial<ValueDisplayMessages>
}
export type GeneratorControlMessageProps = {
  controlMessages?: GeneratorControlMessages
}
