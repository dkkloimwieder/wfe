import { createSignal, onCleanup } from 'solid-js'
import { DashboardShell, StatusTile, TileRow } from '@wfe/components'
import type { StatusTileState, ValueFormat } from '@wfe/components'
import { DefaultAppearance } from '../shared/appearance/DefaultAppearance'
import {
  accents,
  appearanceStyle,
  defaultLayers,
  schemes,
} from '../shared/appearance/appearance'
import './style.css'

export const longLabel =
  'Records waiting for an external acknowledgment with an intentionally long label'
export const longDetail =
  'The full explanation stays available when this one-line summary does not fit inside the tile.'
export const longValue = '1234567890'.repeat(8)
export type TileFixture = {
  update: () => void
  plain: () => void
  theme: (mode: 'light' | 'dark') => void
  value: () => number
}
export function App(props: { ready?: (api: TileFixture) => void }) {
  const [value, setValue] = createSignal(1250)
  const [state, setState] = createSignal<StatusTileState>('ok')
  const [label, setLabel] = createSignal('Capacity')
  const [format, setFormat] = createSignal<ValueFormat | undefined>(
    'number-grouped',
  )
  const [dark, setDark] = createSignal(false)
  let alive = true
  props.ready?.({
    value,
    update: () => {
      if (alive) {
        setValue(2500)
        setState('warning')
        setLabel('Available capacity')
      }
    },
    plain: () => {
      if (alive) setFormat(undefined)
    },
    theme: (mode) => {
      if (alive) setDark(mode === 'dark')
    },
  })
  onCleanup(() => {
    alive = false
  })
  return (
    <DefaultAppearance
      class="tiles-example"
      style={
        dark()
          ? appearanceStyle(
              schemes.find((entry) => entry.mode === 'dark')!,
              accents[1]!,
              2,
              defaultLayers,
            )
          : undefined
      }
    >
      <DashboardShell
        header={
          <h1 class="tiles-example-title" tabindex={-1} data-ui-text="system">
            Status tiles
          </h1>
        }
        footer={null}
      >
        <TileRow role="group" aria-label="Status summary">
          <StatusTile
            data-tile-id="capacity"
            label={label()}
            value={value()}
            format={format()}
            state={state()}
            detail="Current records"
          />
          <StatusTile
            data-tile-id="queue"
            label="Queue"
            value={12}
            state="warning"
            detail="Items wait for review."
          />
          <StatusTile
            data-tile-id="snapshot"
            label="Snapshot"
            value="2026-10-19"
            format="date"
            dateFormat="dd/MM/yyyy"
            state="unknown"
          />
          <StatusTile
            data-tile-id="enabled"
            label="Enabled"
            value={false}
            format="boolean-symbol"
            state="ok"
            detail="Current selection"
          />
          <StatusTile
            data-tile-id="reference"
            label={longLabel}
            value={longValue}
            state="unknown"
            detail={longDetail}
          />
          <StatusTile
            data-tile-id="notes"
            label="Notes"
            value="Ready"
            state="ok"
            detail="Awaiting the next snapshot."
          />
        </TileRow>
      </DashboardShell>
    </DefaultAppearance>
  )
}
