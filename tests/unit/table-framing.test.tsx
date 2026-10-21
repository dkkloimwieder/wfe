import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { createSignal, flush, onCleanup } from 'solid-js'
import { SelectField } from '@wfe/components'
import { createTable, TableWorkspace } from '@wfe/components/table'
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

test('disabled workspace framing does not construct slots and retains result owners', () => {
  const [enabled, setEnabled] = createSignal(false)
  const mounted: string[] = []
  const disposed: string[] = []
  const Content = (props: { name: string }) => {
    mounted.push(props.name)
    onCleanup(() => disposed.push(props.name))
    return <button>{props.name}</button>
  }
  const h = render(() => (
    <TableWorkspace
      headerEnabled={enabled()}
      footerEnabled={enabled()}
      controls={<Content name="Controls" />}
      controlsHeader={<Content name="Header action" />}
      resultsHeader={<Content name="Title" />}
      footer={<Content name="Summary" />}
      footerActions={<Content name="Page action" />}
    >
      <Content name="Result" />
    </TableWorkspace>
  ))
  const result = h.getByRole('button', { name: 'Result' })
  expect(mounted).toEqual(['Result'])
  for (let count = 1; count <= 2; count++) {
    setEnabled(true)
    flush()
    for (const name of [
      'Controls',
      'Header action',
      'Title',
      'Summary',
      'Page action',
    ]) {
      expect(h.getByRole('button', { name })).toBeTruthy()
      expect(mounted.filter((entry) => entry === name)).toHaveLength(count)
    }
    setEnabled(false)
    flush()
    for (const name of [
      'Controls',
      'Header action',
      'Title',
      'Summary',
      'Page action',
    ]) {
      expect(h.queryByRole('button', { name })).toBeNull()
      expect(disposed.filter((entry) => entry === name)).toHaveLength(count)
    }
    expect(h.getByRole('button', { name: 'Result' }) === result).toBe(true)
  }
  expect(mounted.filter((entry) => entry === 'Result')).toHaveLength(1)
  expect(disposed).not.toContain('Result')
  h.unmount()
  expect(disposed.filter((entry) => entry === 'Result')).toHaveLength(1)
})

test.each(['header', 'footer'] as const)(
  'removing the %s restores owned focus and preserves external focus',
  async (region) => {
    const [enabled, setEnabled] = createSignal(true)
    const h = render(() => (
      <>
        <button>Outside</button>
        <TableWorkspace
          headerEnabled={region === 'header' ? enabled() : true}
          footerEnabled={region === 'footer' ? enabled() : true}
          controls={null}
          controlsHeader={<button>Header action</button>}
          footerActions={<button>Footer action</button>}
        >
          <button>Result</button>
        </TableWorkspace>
      </>
    ))
    h.getByRole('button', {
      name: region === 'header' ? 'Header action' : 'Footer action',
    }).focus()
    setEnabled(false)
    flush()
    await Promise.resolve()
    expect(
      document.activeElement ===
        h.getByRole('region', { name: 'Table workspace' }),
    ).toBe(true)
    setEnabled(true)
    flush()
    const outside = h.getByRole('button', { name: 'Outside' })
    outside.focus()
    setEnabled(false)
    flush()
    await Promise.resolve()
    expect(document.activeElement === outside).toBe(true)
  },
)

test('generated framing bindings retain columns and rows while omitting title, controls and pagination', () => {
  const [header, setHeader] = createSignal(false)
  const [footer, setFooter] = createSignal(false)
  const mounts = vi.fn()
  const dispose = vi.fn()
  const action = () => {
    mounts()
    onCleanup(dispose)
    return <button>Invite</button>
  }
  const h = render(() => {
    const table = createTable({
      source: { ids: () => ['a'], get: () => ({ name: 'First' }) },
      columns: [{ id: 'name', accessorKey: 'name', header: 'Name' }],
    })
    return (
      <TableView
        description={{ id: 'framed', title: 'Records', columns: { name: {} } }}
        bindings={{
          table,
          get headerEnabled() {
            return header()
          },
          get footerEnabled() {
            return footer()
          },
          toolbarActions: action,
          pagination: {
            hasPrevious: false,
            hasNext: false,
            onPrevious() {},
            onNext() {},
            totalRows: 1,
          },
        }}
      />
    )
  })
  const cell = h.getByRole('cell', { name: 'First' })
  expect(h.getByRole('columnheader', { name: /Name/ })).toBeTruthy()
  expect(h.queryByText('Records')).toBeNull()
  expect(h.queryByRole('button', { name: 'Table controls' })).toBeNull()
  expect(h.queryByRole('button', { name: 'Refresh results' })).toBeNull()
  expect(h.queryByRole('button', { name: 'Invite' })).toBeNull()
  expect(h.queryByRole('button', { name: 'Next page' })).toBeNull()
  expect(mounts).not.toHaveBeenCalled()
  setHeader(true)
  flush()
  expect(h.getByText('Records')).toBeTruthy()
  expect(h.getByRole('button', { name: 'Table controls' })).toBeTruthy()
  expect(h.getByRole('button', { name: 'Invite' })).toBeTruthy()
  expect(mounts).toHaveBeenCalledTimes(1)
  expect(h.queryByRole('button', { name: 'Next page' })).toBeNull()
  setFooter(true)
  flush()
  expect(h.getByRole('button', { name: 'Next page' })).toBeTruthy()
  setHeader(false)
  setFooter(false)
  flush()
  expect(dispose).toHaveBeenCalledTimes(1)
  expect(h.getByRole('cell', { name: 'First' }) === cell).toBe(true)
})

test('removing a footer with focus in its select popup closes the popup and restores workspace focus', async () => {
  const [enabled, setEnabled] = createSignal(true)
  const h = render(() => (
    <TableWorkspace
      footerEnabled={enabled()}
      controls={null}
      footerActions={
        <SelectField
          label="Page size"
          choices={[
            { value: '10', label: '10' },
            { value: '20', label: '20' },
          ]}
          value="10"
          onValueChange={() => {}}
        />
      }
    >
      <button>Result</button>
    </TableWorkspace>
  ))
  const trigger = h.getByRole('button', { name: /^Page size/ })
  trigger.focus()
  fireEvent.keyDown(trigger, { key: 'ArrowDown' })
  flush()
  const popup = await h.findByRole('listbox', {}, { timeout: 10_000 })
  popup.focus()
  expect(popup.contains(document.activeElement)).toBe(true)
  setEnabled(false)
  flush()
  await Promise.resolve()
  expect(h.queryByRole('listbox')).toBeNull()
  expect(
    document.activeElement ===
      h.getByRole('region', { name: 'Table workspace' }),
  ).toBe(true)
})

test('a measured header can unmount and remount without interrupting result rows', async () => {
  const [enabled, setEnabled] = createSignal(true)
  const measured = new Set<Element>()
  const original = HTMLElement.prototype.getBoundingClientRect
  const measurement = vi
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains('table-workspace-header')) {
        measured.add(this)
        return {
          x: 0,
          y: 0,
          top: 0,
          left: 0,
          right: 800,
          bottom: 42,
          width: 800,
          height: 42,
          toJSON() {},
        }
      }
      return original.call(this)
    })
  const h = render(() => (
    <TableWorkspace
      headerEnabled={enabled()}
      controls={null}
      resultsHeader="Records"
    >
      <table>
        <tbody>
          <tr>
            <td>Retained record</td>
          </tr>
        </tbody>
      </table>
    </TableWorkspace>
  ))
  try {
    flush()
    await Promise.resolve()
    flush()
    const firstHeader = h.container.querySelector('.table-workspace-header')!
    const row = h.getByRole('row')
    expect(measured.has(firstHeader)).toBe(true)
    setEnabled(false)
    flush()
    expect(h.queryByText('Records')).toBeNull()
    expect(h.getByRole('row') === row).toBe(true)
    setEnabled(true)
    flush()
    await Promise.resolve()
    flush()
    const nextHeader = h.container.querySelector('.table-workspace-header')!
    expect(nextHeader !== firstHeader).toBe(true)
    expect(measured.has(nextHeader)).toBe(true)
    expect(h.getByText('Records')).toBeTruthy()
    expect(h.getByRole('row') === row).toBe(true)
  } finally {
    h.unmount()
    measurement.mockRestore()
  }
})
