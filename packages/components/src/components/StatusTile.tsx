import { createMemo, createUniqueId, omit, Show } from 'solid-js'
import { Badge, Card } from './Display'
import type { CardProps } from './Display'
import { ValueDisplay } from './ValueDisplay'
import { DashboardGrid } from '../layout/Dashboard'
import type { DashboardGridProps } from '../layout/Dashboard'
import { styledClasses } from '../internal/classes'
import type { ValueFormat, ValueFormatOptions } from '../utils/valueFormat'

export type StatusTileState = 'ok' | 'warning' | 'unknown'
export type StatusTileProps = Omit<CardProps, 'children'> &
  ValueFormatOptions & {
    label: string
    value: unknown
    detail?: string
    state: StatusTileState
    format?: ValueFormat
  }
export type TileRowProps = DashboardGridProps
/** The existing responsive grid, named for a row of status tiles. */
export const TileRow = DashboardGrid
const states = {
  ok: { label: 'OK', tone: 'success' },
  warning: { label: 'Warning', tone: 'warning' },
  unknown: { label: 'Unknown', tone: 'neutral' },
} as const

/** Read-only presentation. The application supplies each state and raw value. */
export function StatusTile(props: StatusTileProps) {
  const labelId = `status-tile-label-${createUniqueId()}`
  const state = createMemo(() => {
    if (!Object.hasOwn(states, props.state))
      throw new Error('StatusTile: invalid state')
    return states[props.state]
  })
  const label = createMemo(() => {
    if (typeof props.label !== 'string' || !props.label.trim())
      throw new Error('StatusTile: a label is required')
    return props.label
  })
  const rest = omit(
    props,
    'label',
    'value',
    'detail',
    'state',
    'format',
    'locale',
    'dateFormat',
    'timeFormat',
    'timeZone',
    'class',
    'role',
    'aria-labelledby',
  )
  return (
    <Card
      {...rest}
      class={styledClasses('ui-status-tile', props.class)}
      role={props.role ?? 'group'}
      aria-labelledby={
        props['aria-labelledby'] ?? (props['aria-label'] ? undefined : labelId)
      }
      data-state={props.state}
    >
      <div class="ui-status-tile-header">
        <span
          id={labelId}
          class="ui-status-tile-label"
          title={label()}
          data-ui-text="system"
        >
          {label()}
        </span>
        <Badge tone={state().tone} data-ui-text="system">
          {state().label}
        </Badge>
      </div>
      <div class="ui-status-tile-value" data-ui-text="value">
        <Show when={props.format} keyed fallback={String(props.value ?? '')}>
          {(format) => (
            <ValueDisplay
              value={props.value}
              format={format}
              locale={props.locale}
              dateFormat={props.dateFormat}
              timeFormat={props.timeFormat}
              timeZone={props.timeZone}
            />
          )}
        </Show>
      </div>
      <Show when={props.detail}>
        <p
          class="ui-status-tile-detail"
          title={props.detail}
          data-ui-text="prose"
        >
          {props.detail}
        </p>
      </Show>
    </Card>
  )
}
