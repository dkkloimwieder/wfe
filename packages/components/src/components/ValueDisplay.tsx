import { resolveMessages } from '../internal/messages'
import { Icon } from './Icon'
import { Show, createMemo } from 'solid-js'
import { formatDisplayValue } from '../utils/valueFormat'
import { createTimeZone } from '../internal/timeZone'
import type { ValueFormat, ValueFormatOptions } from '../utils/valueFormat'

export interface ValueDisplayMessages {
  yes: string
  no: string
  emptyValue: string
}
export const valueDisplayMessages: Readonly<ValueDisplayMessages> = {
  yes: 'Yes',
  no: 'No',
  emptyValue: '',
}

export type ValueDisplayProps = ValueFormatOptions & {
  value: unknown
  format: ValueFormat
  messages?: Partial<ValueDisplayMessages>
}

/** Shared read-only values for tables, forms and summaries. */
export function ValueDisplay(props: ValueDisplayProps) {
  const messages = resolveMessages(valueDisplayMessages, () => props.messages)
  const zone = createTimeZone(
    () => (props.format === 'datetime' ? props.timeZone : 'UTC'),
    'UTC',
  )
  const text = createMemo(() => {
    const timeZone = zone()
    if (props.format === 'datetime' && !timeZone) return ''
    if (typeof props.value === 'boolean' && props.format.startsWith('boolean-'))
      return props.value ? messages.yes : messages.no
    const formatted = formatDisplayValue(props.value, props.format, {
      locale: props.locale,
      dateFormat: props.dateFormat,
      timeFormat: props.timeFormat,
      timeZone,
    })
    return props.value == null || props.value === ''
      ? messages.emptyValue
      : formatted
  })
  return (
    <Show
      when={
        props.format === 'boolean-symbol' && typeof props.value === 'boolean'
      }
      fallback={
        <Show
          when={
            props.format === 'short-hash' &&
            typeof props.value === 'string' &&
            props.value.length > 0
          }
          fallback={text()}
        >
          <span
            role="img"
            title={String(props.value)}
            aria-label={String(props.value)}
            data-ui-text="value"
          >
            {text()}
          </span>
        </Show>
      }
    >
      <span
        class="ui-value-symbol"
        role="img"
        aria-label={props.value ? messages.yes : messages.no}
        data-ui-text="value"
      >
        <Icon class="ui-check-mark" name={props.value ? 'check' : 'cross'} />
      </span>
    </Show>
  )
}
