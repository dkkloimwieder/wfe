import { Icon } from './Icon'
import { Show } from 'solid-js'
import { formatDisplayValue } from '../utils/valueFormat'
import type { ValueFormat } from '../utils/valueFormat'

export type ValueDisplayProps = {
  value: unknown
  format: ValueFormat
  locale?: string
}

/** Shared read-only values for tables, forms and summaries. */
export function ValueDisplay(props: ValueDisplayProps) {
  return (
    <Show
      when={
        props.format === 'boolean-symbol' && typeof props.value === 'boolean'
      }
      fallback={formatDisplayValue(props.value, props.format, props.locale)}
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
