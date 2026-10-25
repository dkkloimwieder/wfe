import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { KanbanItem, KanbanColumn } from '../../packages/components/src/kanban'
import { createSortable } from '../../packages/components/src/sortable'
import type { SortableScope } from '../../packages/components/src/sortable'

beforeEach(() => {
  Object.defineProperty(document, 'elementFromPoint', {
    configurable: true,
    value: () => null,
  })
  Object.defineProperty(Element.prototype, 'getAnimations', {
    configurable: true,
    value: () => [],
  })
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value() {},
  })
  Object.defineProperty(document, 'getAnimations', {
    configurable: true,
    value: () => [],
  })
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }))
  class Observer {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
  vi.stubGlobal('ResizeObserver', Observer)
  vi.stubGlobal('IntersectionObserver', Observer)
})
afterEach(async () => {
  cleanup()
  await Promise.resolve()
  await Promise.resolve()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  Reflect.deleteProperty(document, 'getAnimations')
  Reflect.deleteProperty(document, 'elementFromPoint')
  Reflect.deleteProperty(Element.prototype, 'getAnimations')
  Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
})

function fixture() {
  const [surface, setSurface] = createSignal<'card' | 'handle'>('card')
  const [disabled, setDisabled] = createSignal(false)
  let scope!: SortableScope
  const view = render(() => {
    scope = createSortable({
      containers: [{ id: 'lane', items: ['item'] }],
      onMove: vi.fn(),
    })
    return (
      <KanbanColumn
        sortable={scope}
        id="lane"
        title="Stage"
        frameless
        headerDecoration="primary"
        headerDecorationAlways
      >
        <KanbanItem
          sortable={scope}
          id="item"
          label="Record"
          title="Record title"
          dragSurface={surface()}
          disabled={disabled()}
          instructionsId="drag-help"
          actions={<button type="button">Edit</button>}
        >
          <a href="#details">Details</a>
          <input aria-label="Note" />
          <span>Card content</span>
        </KanbanItem>
      </KanbanColumn>
    )
  })
  flush()
  return { scope, view, setSurface, setDisabled }
}
async function settle() {
  await Promise.resolve()
  await Promise.resolve()
  flush()
}
function key(element: Element) {
  element.dispatchEvent(
    new KeyboardEvent('keydown', {
      code: 'Space',
      key: ' ',
      bubbles: true,
      cancelable: true,
    }),
  )
}

test('whole-card keyboard surface keeps nested controls separate and title before actions', async () => {
  const { scope, view } = fixture()
  const card = view.getByRole('group', { name: 'Record' })
  expect(card.tabIndex).toBe(0)
  expect(card.getAttribute('aria-describedby')).toBe('drag-help')
  expect(view.queryByRole('button', { name: 'Move Record' })).toBeNull()
  const title = view.getByRole('heading', { name: 'Record title' })
  expect(
    title.compareDocumentPosition(view.getByRole('button', { name: 'Edit' })) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy()
  for (const control of [
    view.getByRole('button', { name: 'Edit' }),
    view.getByRole('link'),
    view.getByRole('textbox'),
  ]) {
    control.focus()
    key(control)
    await settle()
    expect(scope.dragDrop.operation()).toBeNull()
  }
  card.focus()
  key(card)
  await settle()
  expect(scope.dragDrop.operation()?.input).toBe('keyboard')
  scope.cancel()
  await settle()
})

test('changing drag surface preserves handle mode and disabled cards cannot start', async () => {
  const { scope, view, setSurface, setDisabled } = fixture()
  setSurface('handle')
  flush()
  const handle = view.getByRole('button', { name: 'Move Record' })
  handle.focus()
  key(handle)
  await settle()
  expect(scope.dragDrop.operation()?.input).toBe('keyboard')
  scope.cancel()
  await settle()
  setSurface('card')
  flush()
  const card = view.getByRole('group', { name: 'Record' })
  card.focus()
  key(card)
  await settle()
  expect(scope.dragDrop.operation()?.input).toBe('keyboard')
  scope.cancel()
  await settle()
  setDisabled(true)
  flush()
  key(card)
  await settle()
  expect(card.tabIndex).toBe(-1)
  expect(scope.dragDrop.operation()).toBeNull()
})

test('whole-card pointer dragging ignores nested buttons, links and inputs', async () => {
  class Pointer extends MouseEvent {
    readonly pointerId = 1
    readonly pointerType = 'mouse'
    readonly isPrimary = true
  }
  vi.stubGlobal('PointerEvent', Pointer)
  Object.defineProperty(document.body, 'setPointerCapture', {
    configurable: true,
    value() {},
  })
  const { scope, view } = fixture()
  try {
    for (const control of [
      view.getByRole('button', { name: 'Edit' }),
      view.getByRole('link'),
      view.getByRole('textbox'),
    ]) {
      control.dispatchEvent(
        new Pointer('pointerdown', {
          button: 0,
          clientX: 10,
          clientY: 10,
          bubbles: true,
          cancelable: true,
        }),
      )
      document.dispatchEvent(
        new Pointer('pointermove', {
          clientX: 40,
          clientY: 40,
          bubbles: true,
          cancelable: true,
        }),
      )
      await settle()
      expect(scope.dragDrop.operation()).toBeNull()
      document.dispatchEvent(
        new Pointer('pointerup', { bubbles: true, cancelable: true }),
      )
    }
    view.getByText('Card content').dispatchEvent(
      new Pointer('pointerdown', {
        button: 0,
        clientX: 10,
        clientY: 10,
        bubbles: true,
        cancelable: true,
      }),
    )
    document.dispatchEvent(
      new Pointer('pointermove', {
        clientX: 40,
        clientY: 40,
        bubbles: true,
        cancelable: true,
      }),
    )
    await settle()
    expect(scope.dragDrop.operation()?.input).toBe('pointer')
    scope.cancel()
    await settle()
  } finally {
    Reflect.deleteProperty(document.body, 'setPointerCapture')
  }
})
