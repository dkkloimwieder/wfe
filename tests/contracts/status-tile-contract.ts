import { StatusTile, TileRow } from '@wfe/components'
import type {
  StatusTileProps,
  StatusTileState,
  TileRowProps,
} from '@wfe/components'
const state: StatusTileState = 'ok'
const props: StatusTileProps = {
  label: 'Capacity',
  value: 1500,
  format: 'number-grouped',
  state,
  detail: 'Available records',
  class: { compact: true },
  tabindex: 0,
  onClick: () => {},
}
const row: TileRowProps = { 'aria-label': 'Summary', class: 'summary' }
StatusTile(props)
TileRow(row)
// @ts-expect-error Application state names do not extend the display states.
const badState: StatusTileState = 'offline'
void badState
// @ts-expect-error A tile requires an explicit state from the application.
const missing: StatusTileProps = { label: 'Capacity', value: 1500 }
void missing
