import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { createSignal, Errored, flush, onCleanup } from 'solid-js'
import { Button } from '@wfe/components'
import { createTable } from '@wfe/components/table'
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

test('generated toolbar mounts once and retains its owner through bindings and controls updates', () => {
  const [version, setVersion] = createSignal(1)
  const [disabled, setDisabled] = createSignal(false)
  const [collapsed, setCollapsed] = createSignal(true)
  const calls: number[] = []
  let mounts = 0,
    disposals = 0
  function Toolbar() {
    mounts++
    onCleanup(() => {
      disposals++
    })
    return (
      <Button disabled={disabled()} onClick={() => calls.push(version())}>
        Create {version()}
      </Button>
    )
  }
  const mounted = render(() => {
    const table = createTable({
      source: { ids: () => ['a'], get: () => ({ name: 'Ada' }) },
      columns: [{ id: 'name', accessorKey: 'name' }],
    })
    return (
      <TableView
        description={{
          id: 'toolbar-records',
          columns: { name: {} },
          actions: [{ id: 'configure', label: 'Configure' }],
        }}
        bindings={{
          table,
          toolbarActions: Toolbar,
          width: 400 + version(),
          status: () => ({ loading: false }),
          controlsCollapsed: collapsed(),
          onControlsCollapsedChange: setCollapsed,
          actions: { configure: { run: () => {} } },
        }}
      />
    )
  })
  const button = mounted.getByRole('button', {
    name: 'Create 1',
  }) as HTMLButtonElement
  expect(mounts).toBe(1)
  expect(button.closest('.table-workspace-header')).not.toBeNull()
  expect(
    mounted
      .getByRole('button', { name: 'Configure' })
      .closest('.table-workspace-controls'),
  ).not.toBeNull()
  button.focus()
  setVersion(2)
  setCollapsed(false)
  flush()
  expect(mounted.getByRole('button', { name: 'Create 2' })).toBe(button)
  expect(document.activeElement).toBe(button)
  expect(mounts).toBe(1)
  fireEvent.click(button)
  expect(calls).toEqual([2])
  setDisabled(true)
  flush()
  expect(button.disabled).toBe(true)
  setDisabled(false)
  setCollapsed(true)
  setVersion(3)
  flush()
  fireEvent.click(button)
  expect(calls).toEqual([2, 3])
  mounted.unmount()
  expect(disposals).toBe(1)
  fireEvent.click(button)
  expect(calls).toEqual([2, 3])
})

for (const mode of ['replace', 'add', 'remove'] as const) {
  test(`toolbar factory ${mode} requires a remount`, () => {
    const [changed, setChanged] = createSignal(false)
    const First = () => <Button>First</Button>
    const Second = () => <Button>Second</Button>
    const toolbar = () =>
      changed()
        ? mode === 'remove'
          ? undefined
          : Second
        : mode === 'add'
          ? undefined
          : First
    const mounted = render(() => {
      const table = createTable({
        source: { ids: () => [], get: () => undefined },
        columns: [{ id: 'name' }],
      })
      return (
        <Errored fallback={(error) => <p role="alert">{String(error())}</p>}>
          <TableView
            description={{ id: 'factory', columns: { name: {} } }}
            bindings={{ table, toolbarActions: toolbar() }}
          />
        </Errored>
      )
    })
    setChanged(true)
    flush()
    expect(mounted.getByRole('alert').textContent).toContain(
      'remount the table view to replace its toolbar action component',
    )
  })
}
