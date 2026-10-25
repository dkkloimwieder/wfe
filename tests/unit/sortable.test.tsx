import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render } from '@solidjs/testing-library'
import { createSignal, flush, For } from 'solid-js'
import {
  createSortable,
  createSortableContainer,
  createSortableItem,
  moveSortableItem,
} from '../../packages/components/src/sortable'
import type {
  SortableContainer,
  SortableId,
  SortableMove,
  SortableScope,
} from '../../packages/components/src/sortable'
import { getDragDropInternal } from '../../packages/components/src/dnd/internal'
import { sortableKey } from '../../packages/components/src/sortable/internal'

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

function fixture(
  initial: ReadonlyArray<SortableContainer> = [
    { id: 'one', items: ['a', 'b', 'c'] },
    { id: 'two', items: [] },
  ],
  orientation: 'vertical' | 'horizontal' = 'vertical',
  canMove?: (move: SortableMove) => boolean,
) {
  const [containers, setContainers] = createSignal(initial)
  const [allowed, setAllowed] = createSignal(true)
  const [disabled, setDisabled] = createSignal(false)
  const onMove = vi.fn<(move: SortableMove) => void>()
  let scope!: SortableScope
  const items = new Map<SortableId, HTMLElement>()
  const view = render(() => {
    scope = createSortable({
      get containers() {
        return containers()
      },
      get disabled() {
        return disabled()
      },
      orientation,
      canMove: (move) => allowed() && (canMove?.(move) ?? true),
      onMove,
    })
    return (
      <>
        {initial.map((container, column) => {
          const lane = createSortableContainer(scope, {
            id: container.id,
            label: String(container.id),
          })
          return (
            <section ref={lane.ref}>
              {container.items.map((id, index) => {
                const item = createSortableItem(scope, {
                  id,
                  label: String(id),
                })
                return (
                  <button
                    ref={(node) => {
                      item.ref(node)
                      items.set(id, node)
                      vi.spyOn(node, 'getBoundingClientRect').mockReturnValue(
                        new DOMRect(column * 200, index * 50, 100, 40),
                      )
                    }}
                    data-active={item.dragging()}
                  >
                    {typeof id}:{String(id)}
                  </button>
                )
              })}
            </section>
          )
        })}
      </>
    )
  })
  flush()
  return {
    scope,
    view,
    items,
    onMove,
    containers,
    setContainers,
    setAllowed,
    setDisabled,
  }
}

async function start(
  scope: SortableScope,
  item: SortableId,
  input: 'pointer' | 'keyboard' = 'pointer',
) {
  const engine = getDragDropInternal(scope.dragDrop).manager()!
  engine.collisionObserver.disable()
  engine.actions.start({
    source: sortableKey('item', item),
    coordinates: { x: 0, y: 0 },
    event:
      input === 'keyboard'
        ? new KeyboardEvent('keydown', { key: ' ' })
        : new MouseEvent('pointerdown'),
  })
  await engine.renderer.rendering
  flush()
  return engine
}

test('menu requests remain controlled until the application accepts them', () => {
  const { scope, containers, setContainers, onMove } = fixture()
  const accepted = containers()
  expect(scope.requestMove('b', { containerId: 'two', beforeId: null })).toBe(
    true,
  )
  expect(onMove).toHaveBeenCalledTimes(1)
  expect(containers()).toBe(accepted)
  expect(scope.preview()).toBeNull()
  // Delayed acceptance uses the same request; no local reorder or persistence side effect.
  const move = onMove.mock.calls[0]![0]
  setContainers(moveSortableItem(containers(), move))
  flush()
  expect(containers()[0]!.items).toEqual(['a', 'c'])
  expect(containers()[1]!.items).toEqual(['b'])
  expect(accepted[0]!.items).toEqual(['a', 'b', 'c'])
})

test('rejects no-op, stale, forbidden and disabled moves', () => {
  const { scope, onMove, setAllowed, setDisabled } = fixture()
  expect(scope.requestMove('b', { containerId: 'one', beforeId: 'c' })).toBe(
    false,
  )
  expect(scope.requestMove('b', { containerId: 'one', beforeId: 'b' })).toBe(
    false,
  )
  expect(
    scope.requestMove('missing', { containerId: 'two', beforeId: null }),
  ).toBe(false)
  expect(
    scope.requestMove('b', { containerId: 'missing', beforeId: null }),
  ).toBe(false)
  setAllowed(false)
  flush()
  expect(scope.requestMove('b', { containerId: 'two', beforeId: null })).toBe(
    false,
  )
  setAllowed(true)
  setDisabled(true)
  flush()
  expect(scope.requestMove('b', { containerId: 'two', beforeId: null })).toBe(
    false,
  )
  expect(onMove).not.toHaveBeenCalled()
})

test('namespace keys distinguish numeric IDs, strings and containers', () => {
  const { scope, onMove } = fixture([
    { id: 0, items: [0, '0'] },
    { id: '0', items: [] },
  ])
  expect(scope.requestMove(0, { containerId: '0', beforeId: null })).toBe(true)
  expect(onMove.mock.calls[0]![0]).toEqual({
    itemId: 0,
    source: { containerId: 0, index: 0 },
    destination: { containerId: '0', beforeId: null },
  })
})

test('pointer position previews before or after a variable-sized target without mutation', async () => {
  const { scope, containers, onMove } = fixture()
  const accepted = containers()
  const engine = await start(scope, 'a')
  await engine.actions.setDropTarget(sortableKey('item', 'c'))
  engine.dragOperation.position.current = { x: 10, y: 105 }
  flush()
  expect(scope.preview()?.destination).toEqual({
    containerId: 'one',
    beforeId: 'c',
  })
  engine.dragOperation.position.current = { x: 10, y: 139 }
  flush()
  expect(scope.preview()?.destination).toEqual({
    containerId: 'one',
    beforeId: null,
  })
  expect(containers()).toBe(accepted)
  expect(onMove).not.toHaveBeenCalled()
  engine.actions.stop()
  flush()
  expect(onMove).toHaveBeenCalledTimes(1)
  expect(onMove.mock.calls[0]![0].destination.beforeId).toBeNull()
  expect(containers()).toBe(accepted)
})

test('membership changes cancel a drag and stale final callbacks cannot move an item', async () => {
  const { scope, setContainers, onMove } = fixture()
  const engine = await start(scope, 'b')
  await engine.actions.setDropTarget(sortableKey('container', 'two'))
  flush()
  expect(scope.preview()?.destination.containerId).toBe('two')
  setContainers([
    { id: 'one', items: ['a', 'c'] },
    { id: 'two', items: [] },
  ])
  flush()
  expect(scope.dragDrop.operation()).toBeNull()
  expect(scope.preview()).toBeNull()
  engine.actions.stop()
  expect(onMove).not.toHaveBeenCalled()
})

test.each(['vertical', 'horizontal'] as const)(
  'keyboard sorts along the %s axis and reaches an empty adjacent container',
  async (orientation) => {
    const { scope, items, onMove } = fixture(undefined, orientation)
    const source = items.get('b')!
    source.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'Space',
        key: ' ',
        bubbles: true,
        cancelable: true,
      }),
    )
    const engine = getDragDropInternal(scope.dragDrop).manager()!
    await engine.renderer.rendering
    flush()
    expect(scope.dragDrop.operation()?.input).toBe('keyboard')
    const along = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight'
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: along,
        key: along,
        bubbles: true,
        cancelable: true,
      }),
    )
    await engine.renderer.rendering
    flush()
    expect(scope.preview()?.destination).toEqual({
      containerId: 'one',
      beforeId: null,
    })
    const across = orientation === 'vertical' ? 'ArrowRight' : 'ArrowDown'
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: across,
        key: across,
        bubbles: true,
        cancelable: true,
      }),
    )
    await engine.renderer.rendering
    flush()
    expect(scope.preview()?.destination).toEqual({
      containerId: 'two',
      beforeId: null,
    })
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'Space',
        key: ' ',
        bubbles: true,
        cancelable: true,
      }),
    )
    expect(onMove).toHaveBeenCalledTimes(1)
    expect(onMove.mock.calls[0]![0].destination).toEqual({
      containerId: 'two',
      beforeId: null,
    })
  },
)

test.each([false, true])(
  'restores cross-container accepted focus unless the user moves focus (moved=%s)',
  (moved) => {
    const [containers, setContainers] = createSignal<
      ReadonlyArray<SortableContainer>
    >([
      { id: 'one', items: ['a'] },
      { id: 'two', items: [] },
    ])
    let scope!: SortableScope
    let requested!: SortableMove
    const view = render(() => {
      scope = createSortable({
        get containers() {
          return containers()
        },
        onMove: (move) => {
          requested = move
        },
      })
      function Item(props: { id: SortableId }) {
        const item = createSortableItem(scope, {
          id: props.id,
          label: String(props.id),
        })
        return (
          <div ref={item.ref}>
            <button ref={item.handleRef}>Move {props.id}</button>
          </div>
        )
      }
      return (
        <>
          <button>Other</button>
          {['one', 'two'].map((id) => {
            const lane = createSortableContainer(scope, { id, label: id })
            return (
              <section ref={lane.ref}>
                <For
                  each={
                    containers().find((container) => container.id === id)!.items
                  }
                >
                  {(id) => <Item id={id} />}
                </For>
              </section>
            )
          })}
        </>
      )
    })
    flush()
    const oldHandle = view.getByText('Move a')
    oldHandle.focus()
    expect(scope.requestMove('a', { containerId: 'two', beforeId: null })).toBe(
      true,
    )
    if (moved) view.getByText('Other').focus()
    setContainers(moveSortableItem(containers(), requested))
    flush()
    const newHandle = view.getByText('Move a')
    expect(newHandle).not.toBe(oldHandle)
    expect(document.activeElement).toBe(
      moved ? view.getByText('Other') : newHandle,
    )
  },
)

test('a pointer candidate remains eligible when only its after side is permitted', async () => {
  const { scope, onMove } = fixture(
    undefined,
    'vertical',
    (move) => move.destination.beforeId !== 'c',
  )
  const engine = await start(scope, 'a')
  const internal = getDragDropInternal(scope.dragDrop)
  expect(
    internal.validate(sortableKey('item', 'a'), sortableKey('item', 'c')),
  ).toBe(true)
  await engine.actions.setDropTarget(sortableKey('item', 'c'))
  engine.dragOperation.position.current = { x: 10, y: 105 }
  flush()
  expect(scope.preview()).toBeNull()
  engine.dragOperation.position.current = { x: 10, y: 139 }
  flush()
  expect(scope.preview()?.destination.beforeId).toBeNull()
  engine.actions.stop()
  expect(onMove).toHaveBeenCalledTimes(1)
})

test('keyboard navigation skips an insertion slot rejected by canMove', async () => {
  const { scope } = fixture(
    [{ id: 'one', items: ['a', 'b', 'c', 'd'] }],
    'vertical',
    (move) => move.destination.beforeId !== 'c',
  )
  const engine = await start(scope, 'a', 'keyboard')
  engine.actions.move({
    by: { x: 0, y: 1 },
    event: new KeyboardEvent('keydown', { code: 'ArrowDown' }),
  })
  await engine.renderer.rendering
  flush()
  expect(scope.preview()?.destination.beforeId).toBe('d')
})

test('keyboard can return to the original slot and finish without a move', async () => {
  const { scope, onMove } = fixture()
  const engine = await start(scope, 'a', 'keyboard')
  engine.actions.move({
    by: { x: 0, y: 1 },
    event: new KeyboardEvent('keydown', { code: 'ArrowDown' }),
  })
  await engine.renderer.rendering
  flush()
  expect(scope.preview()?.destination.beforeId).toBe('c')
  engine.actions.move({
    by: { x: 0, y: -1 },
    event: new KeyboardEvent('keydown', { code: 'ArrowUp' }),
  })
  await engine.renderer.rendering
  flush()
  expect(scope.preview()).toBeNull()
  engine.actions.stop()
  expect(onMove).not.toHaveBeenCalled()
})

test('ignores item wrapper refs after their owner is disposed', () => {
  let item!: ReturnType<typeof createSortableItem>
  let scope!: SortableScope
  const view = render(() => {
    scope = createSortable({
      containers: [{ id: 'one', items: ['a'] }],
      onMove() {},
    })
    item = createSortableItem(scope, { id: 'a', label: 'A' })
    return <button ref={item.ref}>A</button>
  })
  flush()
  view.unmount()
  const warn = vi.spyOn(console, 'warn')
  expect(() => {
    item.ref(document.createElement('div'))
    item.handleRef(document.createElement('button'))
  }).not.toThrow()
  expect(warn).not.toHaveBeenCalled()
  expect(getDragDropInternal(scope.dragDrop).sources.size).toBe(0)
})
