import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, within } from '@solidjs/testing-library'
import { createSignal, flush, onCleanup } from 'solid-js'
import { Input } from '@wfe/components'
import { ReadOnlyTable, createTable } from '@wfe/components/table'
import { TableView } from '@wfe/generator'

beforeEach(() =>
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  })),
)
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
const rows = [
  { id: 'a"/b', name: 'First', kind: 'Group' },
  { id: 'empty', name: 'Empty', kind: 'Group' },
]
function model() {
  return createTable({
    source: {
      ids: () => rows.map((r) => r.id),
      get: (id) => rows.find((r) => r.id === id),
    },
    columns: [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Name',
        sortFn: (a, b) => String(a).localeCompare(String(b)),
      },
      { id: 'kind', accessorKey: 'kind', header: 'Kind' },
    ],
  })
}
test('generated details honor accepted expansion and retain owners through sort, hide and binding updates', () => {
  let table!: ReturnType<typeof model>
  const [expanded, setExpanded] = createSignal(false)
  const [version, setVersion] = createSignal(0)
  let accept = false,
    mounts = 0,
    disposals = 0
  const requested = vi.fn((_: string, next: boolean) => {
    if (accept) setExpanded(next)
  })
  const content = () => {
    mounts++
    onCleanup(() => disposals++)
    return <Input aria-label="Child draft" defaultValue="Retained" />
  }
  const view = render(() => {
    table = model()
    return (
      <TableView
        description={{
          id: 'parents',
          title: 'Parents',
          columns: { name: {}, kind: {} },
        }}
        bindings={{
          table,
          rowDetails: {
            expanded: () => expanded(),
            onExpandedChange: requested,
            canExpand: (id) => id !== 'empty',
            render: content,
            label: (_, open) => `${open ? 'Close' : 'Open'} child ${version()}`,
          },
        }}
      />
    )
  })
  const toggle = view.getByRole('button', { name: 'Open child 0' })
  expect(mounts).toBe(0)
  fireEvent.click(toggle)
  flush()
  expect(requested).toHaveBeenCalledWith('a"/b', true)
  expect(mounts).toBe(0)
  accept = true
  fireEvent.click(toggle)
  flush()
  const input = view.getByRole('textbox', {
    name: 'Child draft',
  }) as HTMLInputElement
  expect(mounts).toBe(1)
  input.value = 'Local draft'
  table.setSorting([{ id: 'name', desc: true }])
  flush()
  table.setColumnVisibility({ kind: false })
  flush()
  setVersion(1)
  flush()
  expect(view.getByRole('textbox', { name: 'Child draft' })).toBe(input)
  expect(input.value).toBe('Local draft')
  expect(input.closest('td')?.colSpan).toBe(2)
  expect(mounts).toBe(1)
  const controlled = view.getByRole('button', { name: 'Close child 1' })
  expect(controlled.getAttribute('aria-controls')).toBe(input.closest('tr')?.id)
  accept = false
  fireEvent.click(controlled)
  flush()
  expect(disposals).toBe(0)
  expect(view.getByRole('textbox', { name: 'Child draft' })).toBe(input)
  accept = true
  fireEvent.click(controlled)
  flush()
  expect(view.queryByRole('textbox', { name: 'Child draft' })).toBeNull()
  expect(disposals).toBe(1)
})
test('detail IDs are unique between tables and programmatic collapse restores owned focus', async () => {
  const [expanded, setExpanded] = createSignal(true)
  const details = {
    expanded: () => expanded(),
    onExpandedChange: (_: string, next: boolean) => setExpanded(next),
    canExpand: (id: string) => id !== 'empty',
    render: () => <Input aria-label="Child" />,
  }
  const view = render(() => (
    <>
      <ReadOnlyTable table={model()} rowDetails={details} />
      <ReadOnlyTable table={model()} rowDetails={details} />
    </>
  ))
  const inputs = view.getAllByRole('textbox', { name: 'Child' })
  expect(new Set(inputs.map((input) => input.closest('tr')?.id)).size).toBe(2)
  inputs[0]!.focus()
  setExpanded(false)
  flush()
  await Promise.resolve()
  expect(document.activeElement).toBe(
    view.getAllByRole('button', { name: 'Expand details for row a"/b' })[0],
  )
})
test.each(['disabled', 'hidden', 'css-hidden', 'outside', 'disposed'] as const)(
  'collapse does not restore focus to an ineligible target: %s',
  async (mode) => {
    const [expanded, setExpanded] = createSignal(true)
    const [disabled, setDisabled] = createSignal(false)
    const [hidden, setHidden] = createSignal(false)
    const view = render(() => (
      <div
        hidden={hidden()}
        style={
          mode === 'css-hidden' && !expanded() ? { display: 'none' } : undefined
        }
      >
        <button type="button">Outside</button>
        <ReadOnlyTable
          table={model()}
          rowDetails={{
            expanded: () => expanded(),
            onExpandedChange: (_, next) => setExpanded(next),
            canExpand: (id) => id !== 'empty',
            disabled: () => disabled(),
            render: () => <Input aria-label="Owned input" />,
          }}
        />
      </div>
    ))
    const toggle = view.getByRole('button', {
      name: 'Collapse details for row a"/b',
    })
    view.getByRole('textbox', { name: 'Owned input' }).focus()
    const outside = view.getByRole('button', { name: 'Outside' })
    if (mode === 'outside') outside.focus()
    if (mode === 'disabled') setDisabled(true)
    if (mode === 'hidden') setHidden(true)
    if (mode === 'disposed') view.unmount()
    else setExpanded(false)
    flush()
    await Promise.resolve()
    expect(document.activeElement).not.toBe(toggle)
    if (mode === 'outside') expect(document.activeElement).toBe(outside)
  },
)

test('nested tables retain their title and columns without controls, refresh or footer', () => {
  const load = vi.fn()
  const [expanded, setExpanded] = createSignal(false)
  const view = render(() => (
    <ReadOnlyTable
      table={model()}
      rowDetails={{
        expanded: (id) => id !== 'empty' && expanded(),
        onExpandedChange: (_, next) => {
          load(next)
          setExpanded(next)
        },
        canExpand: (id) => id !== 'empty',
        render: () => <ReadOnlyTable table={model()} title="Child records" />,
      }}
    />
  ))
  expect(load).not.toHaveBeenCalled()
  fireEvent.click(
    view.getByRole('button', { name: 'Expand details for row a"/b' }),
  )
  flush()
  expect(load).toHaveBeenCalledExactlyOnceWith(true)
  const child = view.container.querySelector('.sub-table-row') as HTMLElement
  const nested = within(child)
  expect(nested.getByText('Child records')).toBeTruthy()
  expect(nested.getByRole('columnheader', { name: /Name/ })).toBeTruthy()
  expect(nested.queryByRole('button', { name: 'Table controls' })).toBeNull()
  expect(nested.queryByRole('button', { name: 'Refresh results' })).toBeNull()
  expect(nested.queryByRole('button', { name: 'Apply filters' })).toBeNull()
  expect(child.querySelector('.table-workspace-controls')).toBeNull()
  expect(child.querySelector('.table-workspace-summary')).toBeNull()
  expect(nested.getAllByRole('row').length).toBeGreaterThan(1)
  expect(load).toHaveBeenCalledTimes(1)
})

test('nested tables can opt into controls, footer and application-owned refresh', () => {
  const refresh = vi.fn()
  const view = render(() => (
    <ReadOnlyTable
      table={model()}
      rowDetails={{
        expanded: (id) => id !== 'empty',
        onExpandedChange: () => {},
        render: () => (
          <ReadOnlyTable
            table={model()}
            controlsEnabled
            refreshEnabled
            footerEnabled
            onApplyFilters={refresh}
          />
        ),
      }}
    />
  ))
  const child = view.container.querySelector('.sub-table-row') as HTMLElement
  const nested = within(child)
  expect(nested.getByRole('button', { name: 'Table controls' })).toBeTruthy()
  expect(child.querySelector('.table-workspace-summary')).not.toBeNull()
  expect(refresh).not.toHaveBeenCalled()
  const button = nested.getByRole('button', { name: 'Refresh results' })
  fireEvent.click(button)
  flush()
  expect(refresh).toHaveBeenCalledTimes(1)
  fireEvent.input(
    nested.getByRole('searchbox', { name: 'Search all columns' }),
    {
      target: { value: 'First' },
    },
  )
  flush()
  expect(refresh).toHaveBeenCalledTimes(1)
  fireEvent.click(button)
  flush()
  expect(refresh).toHaveBeenCalledTimes(2)
  expect(refresh.mock.calls[1]?.[0].globalFilter).toBe('First')
  expect(nested.queryByRole('button', { name: 'Apply filters' })).toBeNull()
})
