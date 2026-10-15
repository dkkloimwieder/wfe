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
        <svg class="ui-check-mark" viewBox="0 0 16 16" aria-hidden="true">
          <path d={props.value ? 'm2 8 4 4 8-9' : 'M3 3l10 10M13 3 3 13'} />
        </svg>
      </span>
    </Show>
  )
}
