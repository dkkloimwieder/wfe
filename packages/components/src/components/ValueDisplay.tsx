import { Icon } from './Icon'
import { Show, createMemo } from 'solid-js'
import { formatDisplayValue } from '../utils/valueFormat'
import { createTimeZone } from '../internal/timeZone'
import type { ValueFormat, ValueFormatOptions } from '../utils/valueFormat'

export type ValueDisplayProps = ValueFormatOptions & {
  value: unknown
  format: ValueFormat
}

/** Shared read-only values for tables, forms and summaries. */
export function ValueDisplay(props: ValueDisplayProps) {
  const zone = createTimeZone(
    () => (props.format === 'datetime' ? props.timeZone : 'UTC'),
    'UTC',
  )
  const text = createMemo(() => {
    const timeZone = zone()
    if (props.format === 'datetime' && !timeZone) return ''
    return formatDisplayValue(props.value, props.format, {
      locale: props.locale,
      dateFormat: props.dateFormat,
      timeFormat: props.timeFormat,
      timeZone,
    })
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
        aria-label={props.value ? 'Yes' : 'No'}
        data-ui-text="value"
      >
        <Icon class="ui-check-mark" name={props.value ? 'check' : 'cross'} />
      </span>
    </Show>
  )
}
