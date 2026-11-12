import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { Toggle, ToggleGroup } from '@wfe/components/toggle'
import { Field, Label, HelpText } from '@wfe/components/fields'
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
const items = [
  { value: 'list', label: 'List' },
  { value: 'disabled', label: 'Disabled', disabled: true },
  { value: 'board', label: 'Board' },
]

test('a toggle delegates button behavior, acceptance and form values without submitting', () => {
  const [pressed, setPressed] = createSignal(false)
  const submit = vi.fn()
  const h = render(() => (
    <form onSubmit={submit}>
      <Toggle
        pressed={pressed()}
        onPressedChange={setPressed}
        name="format"
        value="bold"
      >
        Bold
      </Toggle>
    </form>
  ))
  flush()
  const button = h.getByRole('button', { name: 'Bold' })
  button.focus()
  fireEvent.click(button)
  flush()
  expect(button.getAttribute('aria-pressed')).toBe('true')
  expect(new FormData(h.container.querySelector('form')!).get('format')).toBe(
    'bold',
  )
  expect(document.activeElement).toBe(button)
  expect(submit).not.toHaveBeenCalled()
  fireEvent.click(button)
  flush()
  expect(button.getAttribute('aria-pressed')).toBe('false')
  expect(new FormData(h.container.querySelector('form')!).has('format')).toBe(
    false,
  )
})

test('controlled rejection and caller prevention preserve the accepted pressed state', () => {
  const change = vi.fn(),
    prevent = vi.fn((event: MouseEvent) => event.preventDefault())
  const [block, setBlock] = createSignal(false)
  const h = render(() => (
    <Toggle
      pressed
      onPressedChange={change}
      onClick={(event) => {
        if (block()) prevent(event)
      }}
    >
      Pin
    </Toggle>
  ))
  flush()
  const button = h.getByRole('button')
  fireEvent.click(button)
  flush()
  expect(change.mock.calls[0]![0]).toBe(false)
  expect(button.getAttribute('aria-pressed')).toBe('true')
  setBlock(true)
  flush()
  change.mockClear()
  fireEvent.click(button)
  expect(change).not.toHaveBeenCalled()
})

test.each(['readonly', 'disabled'] as const)(
  '%s toggles block activation and preserve accessible state',
  (kind) => {
    const change = vi.fn()
    const h = render(() => (
      <Toggle
        pressed
        onPressedChange={change}
        readonly={kind === 'readonly'}
        disabled={kind === 'disabled'}
      >
        Locked
      </Toggle>
    ))
    flush()
    const button = h.getByRole('button')
    fireEvent.click(button)
    expect(change).not.toHaveBeenCalled()
    expect(button.getAttribute('aria-pressed')).toBe('true')
    if (kind === 'readonly')
      expect(button.getAttribute('aria-disabled')).toBe('true')
    else expect((button as HTMLButtonElement).disabled).toBe(true)
  },
)

test('single groups navigate enabled buttons without changing values until activation', () => {
  const [value, setValue] = createSignal<string | undefined>('list')
  const h = render(() => (
    <ToggleGroup
      aria-label="View"
      items={items}
      value={value()}
      onValueChange={setValue}
      allowEmpty={false}
    />
  ))
  flush()
  const list = h.getByRole('button', { name: 'List' }),
    board = h.getByRole('button', { name: 'Board' })
  expect(list.getAttribute('tabindex')).toBe('0')
  expect(board.getAttribute('tabindex')).toBe('-1')
  list.focus()
  fireEvent.keyDown(list, { key: 'ArrowRight' })
  flush()
  expect(document.activeElement).toBe(board)
  expect(value()).toBe('list')
  fireEvent.click(board)
  flush()
  expect(value()).toBe('board')
  expect(h.getByRole('button', { name: 'Board' })).toBe(board)
  expect(document.activeElement).toBe(board)
  fireEvent.click(board)
  flush()
  expect(value()).toBe('board')
  fireEvent.keyDown(board, { key: 'ArrowRight' })
  flush()
  expect(document.activeElement).toBe(list)
  fireEvent.keyDown(list, { key: 'End' })
  flush()
  expect(document.activeElement).toBe(board)
})

test('multiple groups submit accepted enabled values and reject changes without remounting', () => {
  const [accept, setAccept] = createSignal(true)
  const [value, setValue] = createSignal<string[]>(['list', 'disabled'])
  const h = render(() => (
    <form>
      <ToggleGroup
        multiple
        aria-label="Formats"
        items={items}
        value={value()}
        name="formats"
        onValueChange={(next) => {
          if (accept()) setValue(next)
        }}
      />
    </form>
  ))
  flush()
  const board = h.getByRole('button', { name: 'Board' })
  board.focus()
  fireEvent.click(board)
  flush()
  expect(value()).toEqual(['list', 'disabled', 'board'])
  expect(
    new FormData(h.container.querySelector('form')!).getAll('formats'),
  ).toEqual(['list', 'board'])
  setAccept(false)
  flush()
  fireEvent.click(board)
  flush()
  expect(board.getAttribute('aria-pressed')).toBe('true')
  expect(document.activeElement).toBe(board)
})

test('replacement and reordered item records retain keyed button nodes and focus', () => {
  const [options, setOptions] = createSignal(items)
  const h = render(() => (
    <ToggleGroup
      aria-label="Dynamic"
      items={options()}
      value="list"
      onValueChange={() => {}}
    />
  ))
  flush()
  const list = h.getByRole('button', { name: 'List' })
  list.focus()
  setOptions([
    { value: 'board', label: 'Board updated' },
    { value: 'list', label: 'List updated' },
    { value: 'disabled', label: 'Disabled', disabled: true },
  ])
  flush()
  expect(h.getByRole('button', { name: 'List updated' })).toBe(list)
  expect(document.activeElement).toBe(list)
  fireEvent.keyDown(list, { key: 'Home' })
  flush()
  expect(document.activeElement).toBe(
    h.getByRole('button', { name: 'Board updated' }),
  )
})

test('field state and readonly groups retain naming and prevent selection changes', () => {
  const change = vi.fn()
  const h = render(() => (
    <Field readonly>
      <Label>Presentation</Label>
      <ToggleGroup items={items} value="list" onValueChange={change} />
      <HelpText>Accepted presentation</HelpText>
    </Field>
  ))
  flush()
  expect(h.getByRole('group', { name: 'Presentation' })).toBeTruthy()
  const board = h.getByRole('button', { name: 'Board' })
  expect(board.getAttribute('aria-disabled')).toBe('true')
  expect(
    document.getElementById(board.getAttribute('aria-describedby')!)
      ?.textContent,
  ).toBe('Accepted presentation')
  fireEvent.click(board)
  expect(change).not.toHaveBeenCalled()
})

test('vertical navigation, RTL and caller prevention keep their focus contracts', () => {
  const [vertical, setVertical] = createSignal(true)
  const [prevent, setPrevent] = createSignal(false)
  const h = render(() => (
    <ToggleGroup
      aria-label="Directions"
      items={items}
      value="list"
      onValueChange={() => {}}
      orientation={vertical() ? 'vertical' : 'horizontal'}
      direction="rtl"
      loop={false}
      onKeyDown={(event) => {
        if (prevent()) event.preventDefault()
      }}
    />
  ))
  flush()
  const list = h.getByRole('button', { name: 'List' }),
    board = h.getByRole('button', { name: 'Board' })
  list.focus()
  fireEvent.keyDown(list, { key: 'ArrowDown' })
  flush()
  expect(document.activeElement).toBe(board)
  fireEvent.keyDown(board, { key: 'ArrowDown' })
  flush()
  expect(document.activeElement).toBe(board)
  setVertical(false)
  flush()
  fireEvent.keyDown(board, { key: 'ArrowRight' })
  flush()
  expect(document.activeElement).toBe(list)
  setPrevent(true)
  flush()
  fireEvent.keyDown(list, { key: 'End' })
  flush()
  expect(document.activeElement).toBe(list)
})

test('unmount releases click and group handlers even if callers retain the nodes', () => {
  const change = vi.fn()
  const h = render(() => (
    <ToggleGroup
      aria-label="Dispose"
      items={items}
      value="list"
      onValueChange={change}
    />
  ))
  flush()
  const board = h.getByRole('button', { name: 'Board' })
  h.unmount()
  flush()
  fireEvent.click(board)
  fireEvent.keyDown(board, { key: 'Home' })
  expect(change).not.toHaveBeenCalled()
})
