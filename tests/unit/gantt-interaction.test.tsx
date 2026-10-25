import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render } from '@solidjs/testing-library'
import { createSignal, createStore, flush } from 'solid-js'
import { createGanttInteraction } from '../../packages/components/src/gantt/interaction'
import type { GanttInteraction } from '../../packages/components/src/gantt/interaction'
import type {
  GanttChange,
  GanttInterval,
} from '../../packages/components/src/gantt/types'

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
  overrides: Partial<GanttInterval> = {},
  timeZone = 'UTC',
  getDropBounds?: () => {
    left: number
    right: number
    top: number
    bottom: number
  },
) {
  const original: GanttInterval = {
    id: 'a',
    rowId: 'row',
    label: 'Task',
    start: new Date(200),
    end: new Date(400),
    ...overrides,
  }
  const [intervals, setIntervals] = createSignal<readonly GanttInterval[]>([
    original,
  ])
  const [width, setWidth] = createSignal(1000)
  const [revision, setRevision] = createSignal(0)
  const onChange = vi.fn<(change: GanttChange) => void>()
  let interaction!: GanttInteraction
  const view = render(() => {
    interaction = createGanttInteraction({
      get intervals() {
        return intervals()
      },
      range: { start: new Date(0), end: new Date(1000) },
      get width() {
        return width()
      },
      get revision() {
        return revision()
      },
      keyboardStep: 50,
      timeZone,
      getDropBounds,
      onChange,
    })
    const move = interaction.register(() => intervals()[0], 'move')
    const start = interaction.register(() => intervals()[0], 'resize-start')
    const end = interaction.register(() => intervals()[0], 'resize-end')
    const bind =
      (registration: typeof move, x: number) => (node: HTMLButtonElement) => {
        node.style.overflow = 'visible'
        vi.spyOn(node, 'getBoundingClientRect').mockReturnValue(
          new DOMRect(x, 20, 20, 30),
        )
        registration.ref(node)
        registration.handleRef(node)
      }
    return (
      <div
        style={{ overflow: 'visible' }}
        ref={(node) => {
          vi.spyOn(node, 'getBoundingClientRect').mockReturnValue(
            new DOMRect(0, 0, 1000, 200),
          )
          interaction.timelineRef(node)
        }}
      >
        <button ref={bind(move, 200)}>Move</button>
        <button ref={bind(start, 200)}>Start</button>
        <button ref={bind(end, 400)}>End</button>
      </div>
    )
  })
  view.container.style.overflow = 'visible'
  document.body.style.overflow = 'visible'
  flush()
  return {
    original,
    interaction,
    view,
    intervals,
    setIntervals,
    setWidth,
    setRevision,
    onChange,
  }
}
async function settle() {
  await Promise.resolve()
  await Promise.resolve()
  flush()
  await Promise.resolve()
  flush()
}
async function key(node: HTMLElement, code: string) {
  node.focus()
  node.dispatchEvent(
    new KeyboardEvent('keydown', {
      code,
      key: code === 'Space' ? ' ' : code,
      bubbles: true,
      cancelable: true,
    }),
  )
  await settle()
}

test.each(['move', 'resize-start', 'resize-end'] as const)(
  'keyboard %s previews and emits one proposal without mutating accepted dates',
  async (kind) => {
    const f = fixture()
    const button = f.view.getByRole('button', {
      name:
        kind === 'move' ? 'Move' : kind === 'resize-start' ? 'Start' : 'End',
    })
    await key(button, 'Space')
    await key(button, 'ArrowRight')
    const expected = {
      intervalId: 'a',
      kind,
      start: new Date(kind === 'resize-end' ? 200 : 250),
      end: new Date(kind === 'resize-start' ? 400 : 450),
      input: 'keyboard',
    }
    expect(f.interaction.preview()).toEqual(expected)
    expect(f.onChange).not.toHaveBeenCalled()
    expect(f.original.start.getTime()).toBe(200)
    expect(f.original.end.getTime()).toBe(400)
    await key(button, 'Space')
    expect(f.onChange).toHaveBeenCalledExactlyOnceWith(expected)
    expect(f.interaction.preview()).toBeNull()
  },
)

test.each([
  'escape',
  'data',
  'layout',
  'width',
  'readonly',
  'unmount',
] as const)('%s cancels a gesture without a proposal', async (reason) => {
  const f = fixture()
  const button = f.view.getByRole('button', { name: 'Move' })
  await key(button, 'Space')
  await key(button, 'ArrowRight')
  expect(f.interaction.preview()).not.toBeNull()
  if (reason === 'escape') await key(button, 'Escape')
  if (reason === 'data')
    f.setIntervals([{ ...f.original, start: new Date(250) }])
  if (reason === 'layout') f.setRevision(1)
  if (reason === 'width') f.setWidth(800)
  if (reason === 'readonly') f.setIntervals([{ ...f.original, readOnly: true }])
  if (reason === 'unmount') f.view.unmount()
  await settle()
  expect(f.interaction.preview()).toBeNull()
  expect(f.onChange).not.toHaveBeenCalled()
})

test('resize cannot invert an interval and independent instances do not share previews', async () => {
  const a = fixture(),
    b = fixture()
  const button = a.view.container.querySelectorAll('button')[1]!
  await key(button, 'Space')
  for (let i = 0; i < 5; i++) await key(button, 'ArrowRight')
  expect(a.interaction.preview()?.start.getTime()).toBe(400)
  expect(a.interaction.preview()?.end.getTime()).toBe(400)
  expect(b.interaction.preview()).toBeNull()
  expect(b.onChange).not.toHaveBeenCalled()
  await key(button, 'Escape')
})

test('pointer release uses final coordinates and release outside the timeline cancels', async () => {
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
  const f = fixture({}, 'UTC', () => ({
    left: 0,
    right: 1000,
    top: 20,
    bottom: 100,
  }))
  const source = f.view.getByRole('button', { name: 'Move' })
  const event = (type: string, x: number, y = 30) =>
    new Pointer(type, {
      button: 0,
      clientX: x,
      clientY: y,
      bubbles: true,
      cancelable: true,
    })
  try {
    source.dispatchEvent(event('pointerdown', 210))
    await settle()
    document.dispatchEvent(event('pointermove', 250))
    await settle()
    document.dispatchEvent(event('pointerup', 280))
    await settle()
    expect(f.onChange).toHaveBeenCalledExactlyOnceWith({
      intervalId: 'a',
      kind: 'move',
      start: new Date(270),
      end: new Date(470),
      input: 'pointer',
    })
    source.dispatchEvent(event('pointerdown', 210))
    await settle()
    document.dispatchEvent(event('pointermove', 950))
    await settle()
    document.dispatchEvent(event('pointerup', 1010))
    await settle()
    expect(f.onChange).toHaveBeenCalledTimes(1)
    source.dispatchEvent(event('pointerdown', 210))
    await settle()
    document.dispatchEvent(event('pointermove', 250))
    await settle()
    // Still inside the full target's 200px height, but outside its visible viewport.
    document.dispatchEvent(event('pointerup', 280, 110))
    await settle()
    expect(f.onChange).toHaveBeenCalledTimes(1)
    expect(f.interaction.preview()).toBeNull()
  } finally {
    Reflect.deleteProperty(document.body, 'setPointerCapture')
  }
})

test('date-only keyboard movement uses calendar days through daylight saving time', async () => {
  const f = fixture(
    {
      dateOnly: true,
      start: new Date('2026-03-08T05:00:00Z'),
      end: new Date('2026-03-09T04:00:00Z'),
    },
    'America/New_York',
  )
  const button = f.view.getByRole('button', { name: 'Move' })
  await key(button, 'Space')
  await key(button, 'ArrowRight')
  expect(f.interaction.preview()).toMatchObject({
    start: new Date('2026-03-09T04:00:00Z'),
    end: new Date('2026-03-10T04:00:00Z'),
  })
  await key(button, 'Space')
  expect(f.onChange).toHaveBeenCalledExactlyOnceWith({
    intervalId: 'a',
    kind: 'move',
    input: 'keyboard',
    start: new Date('2026-03-09T04:00:00Z'),
    end: new Date('2026-03-10T04:00:00Z'),
  })
  expect(f.original.start.toISOString()).toBe('2026-03-08T05:00:00.000Z')
})

test('a proposal outside the Date range is rejected without halting the next gesture', async () => {
  const f = fixture({
    start: new Date(8640000000000000 - 25),
    end: new Date(8640000000000000),
  })
  const button = f.view.getByRole('button', { name: 'Move' })
  await key(button, 'Space')
  await key(button, 'ArrowRight')
  expect(f.interaction.preview()).toBeNull()
  await key(button, 'Space')
  expect(f.onChange).not.toHaveBeenCalled()
  await key(button, 'Space')
  await key(button, 'ArrowLeft')
  expect(f.interaction.preview()?.start.getTime()).toBe(8640000000000000 - 75)
  await key(button, 'Escape')
})

test('range and viewport revisions do not rescan unchanged interval scalar fields', async () => {
  const [range, setRange] = createSignal({
    start: new Date(0),
    end: new Date(1000),
  })
  const [width, setWidth] = createSignal(1000)
  const [revision, setRevision] = createSignal(0)
  const [step, setStep] = createSignal(50)
  const [zone, setZone] = createSignal('UTC')
  const [start, setStart] = createSignal(new Date(200))
  const readStart = vi.fn(() => start())
  const intervals: readonly GanttInterval[] = [
    {
      id: 'a',
      rowId: 'row',
      label: 'Task',
      get start() {
        return readStart()
      },
      end: new Date(400),
    },
  ]
  render(() => {
    createGanttInteraction({
      intervals,
      get range() {
        return range()
      },
      get width() {
        return width()
      },
      get revision() {
        return revision()
      },
      get keyboardStep() {
        return step()
      },
      get timeZone() {
        return zone()
      },
      onChange() {},
    })
    return <div />
  })
  await settle()
  const initialReads = readStart.mock.calls.length
  expect(initialReads).toBeGreaterThan(0)
  for (const update of [
    () => setRange({ start: new Date(100), end: new Date(1100) }),
    () => setWidth(800),
    () => setRevision(1),
    () => setStep(100),
    () => setZone('America/New_York'),
  ]) {
    update()
    await settle()
    expect(readStart).toHaveBeenCalledTimes(initialReads)
  }
  setStart(new Date(250))
  await settle()
  expect(readStart.mock.calls.length).toBeGreaterThan(initialReads)
})

test('same-array store leaf changes still cancel an active proposal', async () => {
  const f = fixture()
  const [records, setRecords] = createStore<GanttInterval[]>([
    { ...f.original },
  ])
  f.setIntervals(records)
  await settle()
  const button = f.view.getByRole('button', { name: 'Move' })
  await key(button, 'Space')
  await key(button, 'ArrowRight')
  expect(f.interaction.preview()).not.toBeNull()
  setRecords((draft) => {
    draft[0]!.start = new Date(250)
  })
  await settle()
  expect(f.interaction.preview()).toBeNull()
  expect(f.onChange).not.toHaveBeenCalled()
})
