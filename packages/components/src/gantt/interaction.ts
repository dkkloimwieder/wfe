import { createMemo, createSignal, onCleanup, untrack } from 'solid-js'
import type { Accessor } from 'solid-js'
import { createDragDrop, createDraggable, createDroppable } from '../dnd'
import type {
  DragDropScope,
  DragOperation,
  DraggableRegistration,
} from '../dnd'
import { shiftGanttInterval } from './date'
import type { GanttChange, GanttInterval, GanttRange } from './types'

type Kind = GanttChange['kind']
type GestureData = { intervalId: string; kind: Kind } | null
type Pickup = {
  intervalId: string
  interval: GanttInterval
  timeZone: string
  kind: Kind
  start: number
  end: number
  x: number
  millisecondsPerPixel: number
}

export interface GanttInteractionOptions {
  intervals: readonly GanttInterval[]
  range: GanttRange
  width: number
  /** Additional accepted row/layout state that invalidates an active gesture. */
  revision?: unknown
  disabled?: boolean
  timeZone?: string
  /** Visible timeline bounds, excluding clipped content and sticky headers. */
  getDropBounds?: () =>
    { left: number; right: number; top: number; bottom: number } | undefined
  /** ArrowLeft/ArrowRight movement in milliseconds. */
  keyboardStep: number
  onChange(change: GanttChange): void
}
export interface GanttInteraction {
  readonly scope: DragDropScope<GestureData>
  readonly preview: Accessor<GanttChange | null>
  timelineRef(element: HTMLElement | undefined): void
  register(
    interval: Accessor<GanttInterval | undefined>,
    kind: Kind,
  ): DraggableRegistration
  cancel(): void
}

/** Transient UI geometry only; the caller owns all accepted dates. */
export function createGanttInteraction(
  options: GanttInteractionOptions,
): GanttInteraction {
  const timelineId = 'timeline'
  let alive = true
  onCleanup(() => {
    alive = false
    pickup = undefined
    timeline = undefined
  })
  let pickup: Pickup | undefined
  let timeline: HTMLElement | undefined
  let keyboardOffset = 0
  const [keyboardDelta, setKeyboardDelta] = createSignal(0)
  // Snapshot scalar values so same-ID store replacements and leaf edits invalidate
  // a gesture too. This never depends on pointer motion or transient preview state.
  const acceptedIntervals = createMemo(() => ({
    intervals: options.intervals,
    values: options.intervals.map((item) => [
      item.id,
      item.rowId,
      item.start.getTime(),
      item.end.getTime(),
      item.readOnly,
      item.dateOnly,
    ]),
  }))
  // Scale and layout changes cancel gestures without rescanning accepted data.
  const revision = createMemo(() => ({
    ...acceptedIntervals(),
    start: options.range.start.getTime(),
    end: options.range.end.getTime(),
    width: options.width,
    step: options.keyboardStep,
    timeZone: options.timeZone,
    layout: options.revision,
  }))
  const validScale = () =>
    Number.isFinite(options.width) &&
    options.width > 0 &&
    Number.isFinite(options.range.start.getTime()) &&
    Number.isFinite(options.range.end.getTime()) &&
    options.range.end > options.range.start &&
    Number.isFinite(options.keyboardStep) &&
    options.keyboardStep > 0

  function proposal(
    operation: DragOperation<GestureData>,
    keyboard: number,
  ): GanttChange | null {
    const original = pickup
    if (!original || !operation.source.data || operation.input === 'menu')
      return null
    const delta =
      operation.input === 'keyboard'
        ? keyboard
        : ((operation.point?.x ?? original.x) - original.x) *
          original.millisecondsPerPixel
    let shifted: GanttRange
    try {
      shifted = shiftGanttInterval(
        original.interval,
        original.kind,
        Math.round(delta),
        original.timeZone,
        operation.input === 'keyboard' && original.interval.dateOnly
          ? keyboard
          : undefined,
      )
    } catch (error) {
      if (error instanceof RangeError) return null
      throw error
    }
    return {
      intervalId: original.intervalId,
      kind: original.kind,
      start: shifted.start,
      end: shifted.end,
      input: operation.input,
    }
  }
  const scope = createDragDrop<GestureData>({
    autoScroll: false,
    get revision() {
      return revision()
    },
    get disabled() {
      return !!options.disabled || !validScale()
    },
    onStart(operation) {
      untrack(() => {
        const data = operation.source.data
        const interval =
          data && options.intervals.find((item) => item.id === data.intervalId)
        if (!data || !interval || interval.readOnly || !validScale()) {
          scope.cancel()
          return
        }
        pickup = {
          intervalId: interval.id,
          interval: {
            ...interval,
            start: new Date(interval.start),
            end: new Date(interval.end),
          },
          timeZone: options.timeZone ?? 'UTC',
          kind: data.kind,
          start: interval.start.getTime(),
          end: interval.end.getTime(),
          x: operation.point?.x ?? 0,
          millisecondsPerPixel:
            (options.range.end.getTime() - options.range.start.getTime()) /
            options.width,
        }
        keyboardOffset = 0
        setKeyboardDelta(0)
      })
    },
    navigate(request) {
      if (
        !pickup ||
        (request.direction !== 'left' && request.direction !== 'right')
      )
        return null
      keyboardOffset +=
        (request.direction === 'left' ? -1 : 1) *
        (pickup.interval.dateOnly ? 1 : untrack(() => options.keyboardStep))
      setKeyboardDelta(keyboardOffset)
      return timelineId
    },
    onDrop(operation) {
      const change = proposal(operation, keyboardOffset)
      const bounds = untrack(() =>
        options.getDropBounds
          ? options.getDropBounds()
          : timeline?.getBoundingClientRect(),
      )
      const point = operation.point
      const inside =
        operation.input === 'keyboard' ||
        !!(
          bounds &&
          point &&
          point.x >= bounds.left &&
          point.x <= bounds.right &&
          point.y >= bounds.top &&
          point.y <= bounds.bottom
        )
      const original = pickup
      pickup = undefined
      if (
        inside &&
        change &&
        original &&
        (change.start.getTime() !== original.start ||
          change.end.getTime() !== original.end)
      )
        untrack(() => options.onChange(change))
    },
    onCancel() {
      pickup = undefined
    },
  })
  const target = createDroppable(scope, {
    id: timelineId,
    label: 'Timeline',
    data: null,
  })
  const preview = createMemo(() => {
    const operation = scope.operation()
    return operation ? proposal(operation, keyboardDelta()) : null
  })
  return {
    scope,
    preview: () => (alive ? preview() : null),
    timelineRef(element) {
      if (!alive) return
      timeline = element
      target.ref(element)
    },
    cancel: scope.cancel,
    register(interval, kind) {
      return createDraggable(scope, {
        get id() {
          return JSON.stringify([interval()?.id ?? '', kind])
        },
        get label() {
          return interval()?.label ?? ''
        },
        get data() {
          const item = interval()
          return item ? { intervalId: item.id, kind } : null
        },
        get disabled() {
          const item = interval()
          return (
            !item ||
            !!item.readOnly ||
            !Number.isFinite(item.start.getTime()) ||
            !Number.isFinite(item.end.getTime()) ||
            item.end < item.start
          )
        },
      })
    },
  }
}
