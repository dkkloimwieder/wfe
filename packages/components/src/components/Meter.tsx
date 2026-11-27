import { createMemo, createUniqueId, omit, Show } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { styledClasses } from '../internal/classes'
import { nativeEventProps, ownedElementEvents } from '../internal/events'
import { resolveMessages } from '../internal/messages'
import { numberFormatter } from '../utils/intlFormat'
import { Badge, type DisplayTone } from './Display'

export type MeterThreshold = Readonly<{
  /** A value on the same scale as value and max. */
  at: number
  tone: DisplayTone
  label: string
}>
export interface MeterMessages {
  valueOfMaximum: (value: string, max: string) => string
}
export const meterMessages: Readonly<MeterMessages> = {
  valueOfMaximum: (value, max) => `${value} of ${max}`,
}
export type MeterProps = Omit<
  JSX.HTMLAttributes<HTMLDivElement>,
  'children'
> & {
  label: string
  value: number
  max: number
  /** The highest threshold reached determines the tone and status label. */
  thresholds?: readonly MeterThreshold[]
  locale?: string
  messages?: Partial<MeterMessages>
}

/** A measurement against a known limit. The rail stops at max. */
export function Meter(props: MeterProps) {
  const attributes = omit(
    props,
    'label',
    'value',
    'max',
    'thresholds',
    'locale',
    'messages',
    'ref',
    ...nativeEventProps,
  )
  const events = ownedElementEvents(props)
  const messages = resolveMessages(meterMessages, () => props.messages)
  const labelId = `meter-label-${createUniqueId()}`
  const max = () =>
    Number.isFinite(props.max) && props.max > 0 ? props.max : 1
  const value = () =>
    Number.isFinite(props.value) ? Math.max(0, props.value) : 0
  const boundedValue = () => Math.min(value(), max())
  const threshold = createMemo(() => {
    let reached: MeterThreshold | undefined
    for (const entry of props.thresholds ?? []) {
      if (
        Number.isFinite(entry.at) &&
        entry.at <= value() &&
        (reached === undefined || entry.at >= reached.at)
      )
        reached = entry
    }
    return reached
  })
  const valueText = createMemo(() => {
    const formatter = numberFormatter(props.locale ?? 'en-US', {
      maximumSignificantDigits: 21,
    })
    return messages.valueOfMaximum(
      formatter.format(value()),
      formatter.format(max()),
    )
  })
  return (
    <div
      {...attributes}
      data-ui=""
      data-tone={threshold()?.tone ?? 'neutral'}
      class={styledClasses('ui-meter', props.class)}
      ref={[props.ref, events]}
    >
      <div class="ui-meter-heading">
        <span id={labelId} data-ui-text="system">
          {props.label}
        </span>
        <span aria-hidden="true" data-ui-text="value">
          {valueText()}
        </span>
      </div>
      <div
        class="ui-progress ui-meter-rail"
        role="meter"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={max()}
        aria-valuenow={boundedValue()}
        aria-valuetext={[valueText(), threshold()?.label]
          .filter(Boolean)
          .join('. ')}
      >
        <div
          class="ui-meter-fill"
          aria-hidden="true"
          style={{ 'inline-size': `${(boundedValue() / max()) * 100}%` }}
        />
      </div>
      <Show when={threshold()?.label}>
        <Badge tone={threshold()?.tone} aria-hidden="true">
          {threshold()?.label}
        </Badge>
      </Show>
    </div>
  )
}
