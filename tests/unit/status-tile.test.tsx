import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { createSignal, Errored, flush } from 'solid-js'
import { StatusTile, TileRow } from '@wfe/components'
import type {
  StatusTileProps,
  StatusTileState,
  ValueFormat,
} from '@wfe/components'
afterEach(cleanup)
async function settle() {
  flush()
  await Promise.resolve()
  flush()
}

test.each([
  ['ok', 'OK', 'success'],
  ['warning', 'Warning', 'warning'],
  ['unknown', 'Unknown', 'neutral'],
] as const)(
  'state %s uses existing badge semantics and visible state text',
  (state, text, tone) => {
    const h = render(() => (
      <StatusTile
        label="Capacity"
        value={1200}
        detail="Available records"
        state={state}
      />
    ))
    const tile = h.getByRole('group', { name: 'Capacity' })
    expect(tile.getAttribute('data-state')).toBe(state)
    expect(h.getByText(text).getAttribute('data-tone')).toBe(tone)
    expect(h.getByText('1200')).toBeTruthy()
    expect(h.getByText('Available records').getAttribute('data-ui-text')).toBe(
      'prose',
    )
  },
)
test('missing detail renders no empty paragraph and nullish values stay empty', () => {
  const h = render(() => (
    <StatusTile label="Capacity" value={undefined} state="unknown" />
  ))
  expect(h.container.querySelector('.ui-status-tile-detail')).toBeNull()
  expect(h.container.querySelector('.ui-status-tile-value')?.textContent).toBe(
    '',
  )
})
test('full detail and label remain available when visual text is truncated', () => {
  const detail =
    'A long detail that remains available to assistive technology and pointer users.'
  const label = 'A long capacity label'
  const h = render(() => (
    <StatusTile label={label} value={0} detail={detail} state="ok" />
  ))
  expect(h.getByRole('group', { name: label })).toBeTruthy()
  expect(h.getByText(detail).getAttribute('title')).toBe(detail)
  expect(h.getByText(label).getAttribute('title')).toBe(label)
  expect(h.getByText('0')).toBeTruthy()
})
test('controlled values, labels, state, detail and format preserve the tile node', async () => {
  const [label, setLabel] = createSignal('Capacity')
  const [value, setValue] = createSignal<unknown>(1200)
  const [state, setState] = createSignal<StatusTileState>('unknown')
  const [detail, setDetail] = createSignal<string | undefined>()
  const [format, setFormat] = createSignal<ValueFormat | undefined>(
    'number-grouped',
  )
  const h = render(() => (
    <StatusTile
      label={label()}
      value={value()}
      state={state()}
      detail={detail()}
      format={format()}
    />
  ))
  const tile = h.getByRole('group', { name: 'Capacity' })
  expect(h.getByText('1,200')).toBeTruthy()
  setLabel('Ready')
  setState('ok')
  setDetail('Current records')
  setValue(1500)
  await settle()
  expect(h.getByRole('group', { name: 'Ready' })).toBe(tile)
  expect(h.getByText('1,500')).toBeTruthy()
  expect(h.getByText('OK')).toBeTruthy()
  setFormat('boolean-symbol')
  setValue(false)
  await settle()
  expect(h.getByRole('img', { name: 'No' })).toBeTruthy()
  expect(h.getByText('OK')).toBeTruthy()
  setFormat(undefined)
  setValue('Plain value')
  setDetail(undefined)
  await settle()
  expect(h.getByText('Plain value')).toBeTruthy()
  expect(h.container.querySelector('.ui-status-tile-detail')).toBeNull()
})
test('date formatting delegates to the shared formatter without altering the raw value', () => {
  const value = '2026-10-19'
  const h = render(() => (
    <StatusTile
      label="Snapshot"
      value={value}
      format="date"
      dateFormat="dd/MM/yyyy"
      state="ok"
    />
  ))
  expect(h.getByText('19/10/2026')).toBeTruthy()
})
test('native attributes, reactive classes, events and refs follow Card', async () => {
  const [active, setActive] = createSignal(false)
  let ref: HTMLDivElement | undefined
  const click = vi.fn()
  const h = render(() => (
    <StatusTile
      id="capacity"
      class={{ active: active() }}
      label="Capacity"
      value={2}
      state="ok"
      tabindex={0}
      onClick={click}
      ref={(node) => {
        ref = node
      }}
    />
  ))
  const tile = h.getByRole('group', { name: 'Capacity' })
  expect(ref).toBe(tile)
  expect(tile.id).toBe('capacity')
  setActive(true)
  await settle()
  expect(tile.classList.contains('active')).toBe(true)
  expect(tile.classList.contains('ui-card')).toBe(true)
  expect(tile.classList.contains('ui-status-tile')).toBe(true)
  fireEvent.click(tile)
  expect(click).toHaveBeenCalledTimes(1)
  h.unmount()
  fireEvent.click(tile)
  expect(click).toHaveBeenCalledTimes(1)
})
test('caller accessible names override generated names', () => {
  const h = render(() => (
    <StatusTile
      label="Capacity"
      aria-label="Application capacity"
      value={1}
      state="ok"
    />
  ))
  expect(h.getByRole('group', { name: 'Application capacity' })).toBeTruthy()
})
test('separate instances use distinct label associations', () => {
  const h = render(() => (
    <TileRow>
      <StatusTile label="Capacity" value={1} state="ok" />
      <StatusTile label="Capacity" value={2} state="warning" />
    </TileRow>
  ))
  const refs = h
    .getAllByRole('group')
    .map((node) => node.getAttribute('aria-labelledby')!)
  expect(new Set(refs).size).toBe(2)
  for (const id of refs)
    expect(document.getElementById(id)?.textContent).toBe('Capacity')
})
test.each([
  ['state', { label: 'Capacity', value: 1, state: 'failed' }],
  ['label', { label: ' ', value: 1, state: 'ok' }],
])('reports an invalid %s', (_name, props) => {
  const h = render(() => (
    <Errored fallback={(error) => <p role="alert">{String(error())}</p>}>
      <StatusTile {...(props as StatusTileProps)} />
    </Errored>
  ))
  expect(h.getByRole('alert').textContent).toContain('StatusTile:')
})
