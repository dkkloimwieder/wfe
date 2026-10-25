import {
  createEffect,
  createMemo,
  createSignal,
  getOwner,
  onSettled,
  untrack,
} from 'solid-js'
import {
  Virtualizer,
  elementScroll,
  observeElementOffset,
  observeElementRect,
} from '../vendor/virtual-core/index'
import type { VirtualWindow } from './virtualWindow'
import type { VirtualItem } from '../vendor/virtual-core/index'

type CommonOptions = {
  getScrollElement: () => HTMLElement | null
  overscan?: number
  scrollMargin?: number
  scrollPaddingEnd?: number
  initialRect?: { width: number; height: number }
  observeElements?: () => ReadonlyArray<Element>
}

export type TableVirtualizerOptions<Key extends string | number> =
  CommonOptions &
    (
      | {
          mode: 'measured'
          readonly keys: ReadonlyArray<Key>
          estimateSize: (key: Key, index: number) => number
          measurementVersion?: unknown
        }
      | {
          mode: 'fixed'
          readonly count: number
          rowHeight: number
          getItemKey: (index: number) => Key
          getIndexForKey?: (key: Key) => number | undefined
        }
    )

/** One Solid binding to the vendored engine. Data stays with the caller. */
export function createTableVirtualizer<Key extends string | number>(
  options: TableVirtualizerOptions<Key>,
) {
  if (!getOwner())
    throw new Error('Create the virtualizer inside a Solid owner')
  let snapshotReady = false
  let mounted = false
  let disposed = false
  let cleanupQueued = false
  let pendingAnchor:
    { key: Key; within: number; offset: number; domOffset: number } | undefined
  const publish = () => {
    if (snapshotReady && !disposed)
      setWindow({
        items: instance.getVirtualItems(),
        total: instance.getTotalSize(),
      })
  }
  const count = createMemo(() =>
    options.mode === 'fixed' ? options.count : options.keys.length,
  )
  const keys = createMemo(() =>
    options.mode === 'measured' ? options.keys : undefined,
  )
  const [layoutRevision, setLayoutRevision] = createSignal(0, {
    ownedWrite: true,
  })
  const configuration = createMemo(() => {
    layoutRevision()
    const sequence = keys()
    const fixedSize = options.mode === 'fixed' ? options.rowHeight : undefined
    const estimateSize =
      options.mode === 'measured' ? options.estimateSize : undefined
    return {
      keys: sequence,
      version:
        options.mode === 'measured' ? options.measurementVersion : undefined,
      count: count(),
      getItemKey:
        options.mode === 'fixed'
          ? options.getItemKey
          : (index: number) => sequence![index]!,
      estimateSize: (index: number) =>
        fixedSize ?? estimateSize!(sequence![index]!, index),
      fixedItemSize: fixedSize,
      getScrollElement: options.getScrollElement,
      overscan: options.overscan ?? 5,
      scrollMargin: options.scrollMargin ?? 0,
      scrollPaddingStart: options.scrollMargin ?? 0,
      scrollPaddingEnd: options.scrollPaddingEnd ?? 0,
      initialRect: options.initialRect,
      observeElementRect,
      observeElementOffset,
      scrollToFn: ((offset, settings, current) => {
        // Detect independent movement before an engine write can overwrite
        // its evidence and make a stale anchor appear current again.
        if (
          pendingAnchor &&
          current.scrollElement &&
          Math.abs(current.scrollElement.scrollTop - pendingAnchor.domOffset) >=
            1.5
        )
          cancelAnchor()
        elementScroll(offset, settings, current)
        // Engine reconciliation may adjust the physical offset while a layout
        // anchor is pending. Only independent viewport movement invalidates it.
        if (pendingAnchor && current.scrollElement)
          pendingAnchor.domOffset = current.scrollElement.scrollTop
      }) satisfies typeof elementScroll,
      onChange: publish,
    }
  })
  const instance = new Virtualizer<HTMLElement, HTMLElement>(
    untrack(configuration),
  )
  // An explicit viewport provides the same bounded first window on server and
  // client. Constructor callbacks cannot publish before the signal exists.
  // Audited ownedWrite: virtual-core may publish during layout callbacks.
  const [window, setWindow] = createSignal<{
    items: Array<VirtualItem>
    total: number
  }>(
    untrack(() =>
      options.initialRect
        ? { items: instance.getVirtualItems(), total: instance.getTotalSize() }
        : { items: [], total: 0 },
    ),
    { ownedWrite: true },
  )
  snapshotReady = true
  // Keep the first unobscured row in place when a measured row above it
  // changes height. Include sticky sections and ignore prior scroll direction.
  instance.shouldAdjustScrollPositionOnItemSizeChange = (
    item,
    _delta,
    current,
  ) =>
    item.end <=
    (current.scrollOffset ?? 0) +
      current.scrollAdjustments +
      current.options.scrollMargin
  let previous = untrack(configuration)
  let anchorFrame: number | undefined
  function cancelAnchor() {
    if (anchorFrame !== undefined) cancelAnimationFrame(anchorFrame)
    anchorFrame = undefined
    pendingAnchor = undefined
  }
  function restoreAnchor() {
    anchorFrame = undefined
    const anchor = pendingAnchor
    pendingAnchor = undefined
    if (!anchor || disposed) return
    // Native scrolling can move the viewport after capture, even before its
    // scroll event reaches the engine. A queued layout repair must not undo it.
    if (
      instance.scrollElement &&
      Math.abs(instance.scrollElement.scrollTop - anchor.domOffset) >= 1.5
    )
      return
    const next = untrack(configuration)
    const index = next.keys?.indexOf(anchor.key) ?? -1
    if (index >= 0) {
      const offset = instance.getOffsetForIndex(index, 'start')?.[0]
      if (offset !== undefined)
        instance.scrollToOffset(Math.max(0, offset + anchor.within))
    } else {
      const maximum = Math.max(
        0,
        (instance.scrollElement?.scrollHeight ?? 0) -
          (instance.scrollRect?.height ?? 0),
      )
      instance.scrollToOffset(Math.min(anchor.offset, maximum))
    }
  }
  createEffect(configuration, (next) => {
    const changed = next.keys !== previous.keys
    const visibleStart = (instance.scrollOffset ?? 0) + previous.scrollMargin
    // A scroll command changes the DOM before its scroll event updates the
    // engine. Do not preserve a virtual window the viewport has already left.
    // Match virtual-core's tolerance for fractional scroll read-back.
    const offsetCurrent =
      !instance.scrollElement ||
      Math.abs(
        instance.scrollElement.scrollTop - (instance.scrollOffset ?? 0),
      ) < 1.5
    const anchor =
      offsetCurrent &&
      (changed ||
        next.version !== previous.version ||
        next.scrollMargin !== previous.scrollMargin)
        ? instance.getVirtualItems().find((item) => item.end > visibleStart)
        : undefined
    const offsetWithin = anchor ? visibleStart - anchor.start : 0
    instance.setOptions(next)
    if (next.version !== previous.version) instance.measure()
    if (changed && next.keys) {
      const current = new Set(next.keys)
      for (const key of instance.itemSizeCache.keys())
        if (!current.has(key as Key)) instance.itemSizeCache.delete(key)
    }
    if (mounted) {
      instance._willUpdate()
      if (anchor && !pendingAnchor) {
        pendingAnchor = {
          key: anchor.key as Key,
          within: offsetWithin,
          offset: instance.scrollOffset ?? 0,
          domOffset: instance.scrollElement?.scrollTop ?? 0,
        }
        // Restore after Solid commits the new spacer and ResizeObserver has
        // measured the layout. Otherwise the browser clamps to the old extent.
        anchorFrame = requestAnimationFrame(restoreAnchor)
      }
    }
    previous = next
    publish()
  })
  onSettled(() => {
    if (disposed) return
    mounted = true
    const cleanup = instance._didMount()
    instance._willUpdate()
    publish()
    const elements = options.observeElements?.() ?? []
    const observer = elements.length
      ? new ResizeObserver(() => setLayoutRevision((value) => value + 1))
      : undefined
    for (const element of elements) observer!.observe(element)
    return () => {
      observer?.disconnect()
      disposed = true
      mounted = false
      cleanup()
      cancelAnchor()
      instance.elementsCache.clear()
      instance.itemSizeCache.clear()
    }
  })
  const items = createMemo(() => window().items)
  const visibleKeys = createMemo(() => items().map((item) => item.key as Key), {
    equals: (a, b) =>
      a.length === b.length && a.every((key, index) => key === b[index]),
  })
  const lookup = createMemo(
    () => new Map(items().map((item) => [item.key as Key, item])),
  )
  function releaseElement() {
    if (cleanupQueued || disposed) return
    cleanupQueued = true
    queueMicrotask(() => {
      cleanupQueued = false
      if (!disposed) instance.measureElement(null)
    })
  }
  return {
    mode: options.mode,
    getEnd: () =>
      (items().at(-1)?.end ?? options.scrollMargin ?? 0) -
      (options.scrollMargin ?? 0),
    getKeys: visibleKeys,
    getItems: items,
    getItem: (key: Key) => lookup().get(key),
    getTotalSize: () => window().total,
    getStart: () =>
      (items()[0]?.start ?? options.scrollMargin ?? 0) -
      (options.scrollMargin ?? 0),
    /** Call in the visible row owner. Set data-index before measuring. */
    observeRow: (element: () => HTMLElement | undefined, key: Key) => {
      createEffect(
        () => lookup().get(key)?.index,
        (index) => {
          const node = element()
          if (node && index !== undefined) {
            node.dataset.index = String(index)
            instance.measureElement(node)
          }
        },
      )
      onSettled(() => releaseElement)
    },
    scrollToKey: (key: Key) => {
      const index =
        options.mode === 'measured'
          ? options.keys.indexOf(key)
          : (options.getIndexForKey?.(key) ?? lookup().get(key)?.index ?? -1)
      if (index >= 0) {
        cancelAnchor()
        instance.scrollToIndex(index, { align: 'auto' })
      }
      return index >= 0
    },
    scrollToIndex: (index: number) => {
      cancelAnchor()
      instance.scrollToIndex(index, { align: 'start' })
    },
    /** Exposed for geometry diagnostics, never used to store Table records. */
    instance,
  } satisfies VirtualWindow<Key> & {
    getItems: () => Array<VirtualItem>
    getItem: (key: Key) => VirtualItem | undefined
    observeRow: (element: () => HTMLElement | undefined, key: Key) => void
    scrollToKey: (key: Key) => boolean
    instance: Virtualizer<HTMLElement, HTMLElement>
  }
}
