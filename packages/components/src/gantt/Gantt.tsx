import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  untrack,
  For,
  Show,
} from 'solid-js'
import type { Accessor } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { Button, IconButton } from '../components/NativeFields'
import { Icon } from '../components/Icon'
import { Tooltip } from '../components/Tooltip'
import { GanttBarTrigger } from './GanttBarTrigger'
import { iconLock, iconZoomIn, iconZoomOut } from '../icons'
import { DragDropFeedback } from '../dnd/DragDropFeedback'
import { createGanttInteraction } from './interaction'
import { DisclosureIndicator } from '../components/DisclosureIndicator'
import { styledClasses, type ClassValue } from '../internal/classes'
import { createTableVirtualizer } from '../virtual/createVirtualizer'
import { VirtualRows } from '../virtual/VirtualRows'
import {
  createGanttIntervalIndex,
  createGanttDependencyIndex,
  flattenGanttRows,
  ganttIntervalGeometry,
  ganttDependencyPath,
  packGanttIntervals,
} from './geometry'
import type {
  GanttRow,
  GanttInterval,
  GanttDependency,
  GanttRange,
  GanttChange,
} from './types'

export interface GanttProps {
  rows: readonly GanttRow[]
  intervals: readonly GanttInterval[]
  dependencies?: readonly GanttDependency[]
  range: GanttRange
  expandedIds?: readonly string[]
  onExpandedChange?: (ids: string[]) => void
  selectedIds?: readonly string[]
  onSelectionChange?: (ids: string[]) => void
  onActivate?: (interval: GanttInterval) => void
  onChange?: (change: GanttChange) => void
  keyboardStep?: number
  onRangeChange?: (range: GanttRange) => void
  timeZone?: string
  locale?: string
  rowHeight?: number
  labelWidth?: number
  height?: number | string
  label?: string
  loading?: boolean
  class?: ClassValue
  style?: JSX.CSSProperties
  toolbar?: JSX.Element
  renderRow?: (row: GanttRow) => JSX.Element
  renderInterval?: (interval: GanttInterval) => JSX.Element
}

function describeInterval(
  interval: GanttInterval,
  format: Intl.DateTimeFormat,
) {
  const parts = [
    `${interval.label}, ${format.format(interval.start)} to ${format.format(interval.end)}`,
  ]
  if (interval.progress !== undefined)
    parts.push(
      `${Math.round(Math.max(0, Math.min(1, interval.progress)) * 100)} percent complete`,
    )
  if (interval.baseline)
    parts.push(
      `baseline ${format.format(interval.baseline.start)} to ${format.format(interval.baseline.end)}`,
    )
  return parts.join(', ')
}

/** Controlled schedule view. Applications own accepted dates and scheduling policy. */
export function Gantt(props: GanttProps) {
  const [scrollElement, setScrollElement] = createSignal<HTMLDivElement>()
  const [width, setWidth] = createSignal(800)
  const headingId = createUniqueId()
  const instructionsId = createUniqueId()
  const [scrollTop, setScrollTop] = createSignal(0)
  const [viewportHeight, setViewportHeight] = createSignal(480)
  const viewport = createMemo(() => ({
    top: scrollTop(),
    height: viewportHeight(),
  }))
  const expanded = createMemo(() => new Set(props.expandedIds ?? []))
  const selected = createMemo(() => new Set(props.selectedIds ?? []))
  const acceptedRows = createMemo(() => props.rows)
  const rows = createMemo(() => flattenGanttRows(acceptedRows(), expanded()))
  const intervalIndex = createMemo(() =>
    createGanttIntervalIndex(props.intervals),
  )
  const rowHeight = createMemo(() => {
    const value = props.rowHeight ?? 36
    if (!Number.isFinite(value) || value <= 0)
      throw new RangeError('Gantt row height must be positive and finite')
    return Math.max(28, value)
  })
  const labelWidth = () =>
    Math.min(props.labelWidth ?? 200, Math.max(80, width() * 0.4))
  const timelineWidth = () => Math.max(1, width() - labelWidth())
  const layout = createMemo(() => {
    const heights = new Map<string, number>()
    const lanes = new Map<string, number>()
    const offsets = new Map<string, number>()
    const centers = new Map<string, number>()
    let offset = 0
    for (const entry of rows()) {
      offsets.set(entry.row.id, offset)
      const packed = packGanttIntervals(
        intervalIndex().byRow.get(entry.row.id) ?? [],
      )
      let count = 1
      for (const item of packed) {
        lanes.set(item.interval.id, item.lane)
        centers.set(item.interval.id, offset + (item.lane + 0.5) * rowHeight())
        count = Math.max(count, item.lane + 1)
      }
      heights.set(entry.row.id, count * rowHeight())
      offset += count * rowHeight()
    }
    return { heights, lanes, centers, offsets }
  })
  // Moving an interval need not invalidate virtual measurements when lane counts
  // stay unchanged. Row ordering is tracked separately through keys().
  const measurementHeights = createMemo(() => layout().heights, {
    equals: (previous, next) => {
      if (previous.size !== next.size) return false
      for (const [key, height] of previous)
        if (next.get(key) !== height) return false
      return true
    },
  })
  const laneIndex = createMemo(() =>
    createGanttIntervalIndex(props.intervals, (interval) =>
      JSON.stringify([interval.rowId, layout().lanes.get(interval.id) ?? 0]),
    ),
  )
  const keys = createMemo(() => rows().map((entry) => entry.row.id))
  const rowLookup = createMemo(
    () => new Map(rows().map((entry) => [entry.row.id, entry])),
  )
  const rowIndices = createMemo(
    () => new Map(rows().map((entry, index) => [entry.row.id, index])),
  )
  const virtual = createTableVirtualizer({
    mode: 'measured',
    get keys() {
      return keys()
    },
    get measurementVersion() {
      return measurementHeights()
    },
    get estimateSize() {
      const heights = measurementHeights()
      const fallback = rowHeight()
      return (key: string) => heights.get(key) ?? fallback
    },
    getScrollElement: () => untrack(scrollElement) ?? null,
    scrollMargin: 32,
    initialRect: { width: 800, height: 480 },
  })
  createEffect(scrollElement, (element) => {
    if (!element) return
    const measure = () => {
      setWidth(element.clientWidth || 800)
      setViewportHeight(element.clientHeight || 480)
      scroll()
    }
    const scroll = () => setScrollTop(Math.max(0, element.scrollTop))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    element.addEventListener('scroll', scroll, { passive: true })
    return () => {
      observer.disconnect()
      element.removeEventListener('scroll', scroll)
    }
  })
  const dependencies = createMemo(() =>
    createGanttDependencyIndex(
      props.dependencies ?? [],
      intervalIndex(),
      rows(),
      layout().centers,
    ),
  )
  const paths = createMemo(() => {
    return dependencies()
      .query(viewport().top, viewport().top + viewport().height)
      .flatMap((edge) => {
        const path = ganttDependencyPath(
          edge,
          intervalIndex(),
          rowIndices(),
          props.range,
          timelineWidth(),
          rowHeight(),
          {
            x: 0,
            y: viewport().top,
            width: timelineWidth(),
            height: viewport().height,
          },
          layout().centers,
        )
        return path ? [{ id: edge.id, path }] : []
      })
  })
  const showTime = createMemo(
    () =>
      props.range.end.getTime() - props.range.start.getTime() < 3 * 86400000,
  )
  const connectorViewport = createMemo(() => {
    const total = virtual.getTotalSize()
    const top = Math.min(viewport().top, total)
    return {
      top,
      height: Math.max(0, Math.min(viewport().height - 32, total - top)),
    }
  })
  const formatter = createMemo(
    () =>
      new Intl.DateTimeFormat(props.locale ?? 'en-US', {
        timeZone: props.timeZone ?? 'UTC',
        month: 'short',
        day: 'numeric',
        ...(showTime()
          ? { hour: 'numeric' as const, minute: '2-digit' as const }
          : {}),
      }),
  )
  const ticks = createMemo(() => {
    const start = props.range.start.getTime()
    const span = props.range.end.getTime() - start
    if (!Number.isFinite(span) || span <= 0)
      throw new Error('Gantt range must have a finite start before its end')
    const count = Math.max(2, Math.floor(timelineWidth() / 110))
    return Array.from({ length: count }, (_, index) => ({
      fraction: index / count,
      label: formatter().format(new Date(start + (span * index) / count)),
    }))
  })
  function navigate(shift: number, scale = 1) {
    const start = props.range.start.getTime()
    const duration = props.range.end.getTime() - start
    const nextDuration = Math.max(60000, duration * scale)
    const nextStart = start + duration * shift + (duration - nextDuration) / 2
    if (
      !Number.isFinite(new Date(nextStart).getTime()) ||
      !Number.isFinite(new Date(nextStart + nextDuration).getTime())
    )
      return
    props.onRangeChange?.({
      start: new Date(nextStart),
      end: new Date(nextStart + nextDuration),
    })
  }
  function toggleRow(id: string) {
    const next = new Set(expanded())
    if (next.has(id)) next.delete(id)
    else next.add(id)
    props.onExpandedChange?.([...next])
  }
  function select(interval: GanttInterval, additive: boolean) {
    const next = additive ? new Set(selected()) : new Set<string>()
    if (additive && next.has(interval.id)) next.delete(interval.id)
    else next.add(interval.id)
    props.onSelectionChange?.([...next])
  }
  const interaction = createGanttInteraction({
    getDropBounds() {
      const element = untrack(scrollElement)
      if (!element) return undefined
      const rect = element.getBoundingClientRect()
      return {
        left: rect.left + labelWidth(),
        right: rect.left + element.clientWidth,
        top: rect.top + 32,
        bottom: rect.top + element.clientHeight,
      }
    },
    get intervals() {
      return props.intervals
    },
    get range() {
      return props.range
    },
    get width() {
      return timelineWidth()
    },
    get revision() {
      return layout()
    },
    get disabled() {
      return !props.onChange
    },
    get timeZone() {
      return props.timeZone ?? 'UTC'
    },
    get keyboardStep() {
      return props.keyboardStep ?? 3600000
    },
    onChange: (change) => props.onChange?.(change),
  })
  const editing = createMemo(() => !!interaction.scope.operation())
  const detailFormatters = createMemo(() => ({
    date: new Intl.DateTimeFormat(props.locale ?? 'en-US', {
      timeZone: props.timeZone ?? 'UTC',
      dateStyle: 'medium',
    }),
    time: new Intl.DateTimeFormat(props.locale ?? 'en-US', {
      timeZone: props.timeZone ?? 'UTC',
      dateStyle: 'medium',
      timeStyle: 'short',
    }),
  }))
  function renderBar(interval: Accessor<GanttInterval>) {
    const readOnly = () => !props.onChange || !!interval().readOnly
    const [detailsOpen, setDetailsOpen] = createSignal(false)
    createEffect(editing, (active) => {
      if (active) setDetailsOpen(false)
    })
    const detailDate = (date: Date) =>
      (interval().dateOnly
        ? detailFormatters().date
        : detailFormatters().time
      ).format(date)
    const move = interaction.register(interval, 'move')
    const start = interaction.register(interval, 'resize-start')
    const end = interaction.register(interval, 'resize-end')
    const preview = createMemo(() => {
      const current = interaction.preview()
      return current?.intervalId === interval().id ? current : null
    })
    const geometry = createMemo(() =>
      ganttIntervalGeometry(
        preview() ?? interval(),
        props.range,
        timelineWidth(),
      ),
    )
    return (
      <Show when={geometry()}>
        {(box) => (
          <div
            class="ui-gantt-item"
            style={{
              left: `${box().x}px`,
              width: `${Math.max(box().width, 12)}px`,
              top: `${(layout().lanes.get(interval().id) ?? 0) * rowHeight() + 5}px`,
              height: `${rowHeight() - 12}px`,
            }}
          >
            <Tooltip.Root
              open={detailsOpen() && !editing()}
              disabled={editing()}
              onOpenChange={(open) => setDetailsOpen(open && !untrack(editing))}
            >
              <GanttBarTrigger
                hideDetails={editing()}
                type="button"
                class="ui-gantt-bar"
                data-readonly={readOnly() ? '' : undefined}
                data-interval={interval().id}
                ref={move.ref}
                aria-describedby={
                  props.onChange && !interval().readOnly
                    ? instructionsId
                    : undefined
                }
                data-milestone={box().milestone ? '' : undefined}
                data-critical={interval().critical ? '' : undefined}
                aria-keyshortcuts={
                  props.onSelectionChange ? 'S Shift+S F2' : 'F2'
                }
                aria-pressed={selected().has(interval().id) ? 'true' : 'false'}
                aria-label={`${describeInterval(interval(), formatter())}${readOnly() ? ', read only' : ''}`}
                onClick={(event) =>
                  select(interval(), event.ctrlKey || event.metaKey)
                }
                onDblClick={() => props.onActivate?.(interval())}
                onKeyDown={(event) => {
                  if (
                    event.key.toLowerCase() === 's' &&
                    !event.ctrlKey &&
                    !event.metaKey &&
                    !event.altKey
                  ) {
                    event.preventDefault()
                    select(interval(), event.shiftKey)
                    return
                  }
                  if (
                    event.key === 'F2' ||
                    (event.key === 'Enter' &&
                      (!props.onChange || interval().readOnly))
                  ) {
                    event.preventDefault()
                    props.onActivate?.(interval())
                  }
                }}
              >
                <Show when={interval().progress !== undefined}>
                  <span
                    class="ui-gantt-progress"
                    aria-hidden="true"
                    style={{
                      width: `${Math.max(0, Math.min(1, interval().progress ?? 0)) * 100}%`,
                    }}
                  />
                </Show>
                <Show when={readOnly() && !box().milestone}>
                  <Icon glyph={iconLock} class="ui-gantt-lock" />
                </Show>
                <span class="ui-gantt-bar-label" data-value>
                  {props.renderInterval?.(interval()) ?? interval().label}
                </span>
              </GanttBarTrigger>
              <Tooltip.Portal>
                <Tooltip.Content class="ui-gantt-details">
                  <strong>{interval().label}</strong>
                  <dl>
                    <dt>START</dt>
                    <dd>{detailDate(interval().start)}</dd>
                    <dt>END</dt>
                    <dd>{detailDate(interval().end)}</dd>
                    <dt>TIME ZONE</dt>
                    <dd>{props.timeZone ?? 'UTC'}</dd>
                    <Show when={interval().progress !== undefined}>
                      <dt>PROGRESS</dt>
                      <dd>
                        {Math.round(
                          Math.max(0, Math.min(1, interval().progress!)) * 100,
                        )}
                        %
                      </dd>
                    </Show>
                    <Show when={interval().baseline}>
                      {(baseline) => (
                        <>
                          <dt>BASELINE START</dt>
                          <dd>{detailDate(baseline().start)}</dd>
                          <dt>BASELINE END</dt>
                          <dd>{detailDate(baseline().end)}</dd>
                        </>
                      )}
                    </Show>
                    <dt>EDITING</dt>
                    <dd>
                      {readOnly()
                        ? 'READ ONLY'
                        : box().milestone
                          ? 'MOVABLE'
                          : 'MOVABLE AND RESIZABLE'}
                    </dd>
                    <Show when={interval().critical}>
                      <dt>CRITICAL</dt>
                      <dd>YES</dd>
                    </Show>
                  </dl>
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
            <Show
              when={props.onChange && !interval().readOnly && !box().milestone}
            >
              <button
                type="button"
                class="ui-gantt-resize ui-gantt-resize-start"
                aria-describedby={instructionsId}
                aria-label={`Resize start: ${interval().label}`}
                ref={[start.ref, start.handleRef]}
              />
              <button
                type="button"
                class="ui-gantt-resize ui-gantt-resize-end"
                aria-describedby={instructionsId}
                aria-label={`Resize end: ${interval().label}`}
                ref={[end.ref, end.handleRef]}
              />
            </Show>
          </div>
        )}
      </Show>
    )
  }
  function renderRow(key: string) {
    const entry = () => rowLookup().get(key)
    const visibleLanes = createMemo(
      () => {
        const offset = layout().offsets.get(key) ?? 0
        const count = (layout().heights.get(key) ?? rowHeight()) / rowHeight()
        const first = Math.max(
          0,
          Math.floor((viewport().top - offset) / rowHeight()) - 2,
        )
        const last = Math.min(
          count - 1,
          Math.ceil(
            (viewport().top + viewport().height - offset) / rowHeight(),
          ) + 2,
        )
        return { first, last }
      },
      { equals: (a, b) => a.first === b.first && a.last === b.last },
    )
    function queryVisible(baselines: boolean) {
      const { first, last } = visibleLanes()
      const result: GanttInterval[] = []
      for (let lane = first; lane <= last; lane++) {
        const query = baselines ? laneIndex().queryBaselines : laneIndex().query
        result.push(
          ...query(
            JSON.stringify([key, lane]),
            props.range.start,
            props.range.end,
          ),
        )
      }
      return result
    }
    const intervals = createMemo(() => queryVisible(false))
    const baselines = createMemo(() => queryVisible(true))
    return (
      <Show when={entry()}>
        {(current) => (
          <div
            role="row"
            class="ui-gantt-row"
            data-row={key}
            aria-rowindex={(rowIndices().get(key) ?? 0) + 2}
            style={{ height: `${layout().heights.get(key) ?? rowHeight()}px` }}
          >
            <div
              role="rowheader"
              class="ui-gantt-row-label"
              style={{
                'padding-inline-start': `${8 + current().depth * 16}px`,
              }}
            >
              <Show when={current().hasChildren}>
                <Button
                  class="sub-table-toggle"
                  aria-label={`${expanded().has(key) ? 'Collapse' : 'Expand'} ${current().row.label}`}
                  aria-expanded={expanded().has(key) ? 'true' : 'false'}
                  disabled={!props.onExpandedChange}
                  onClick={() => toggleRow(key)}
                >
                  <DisclosureIndicator />
                </Button>
              </Show>
              <span>
                {props.renderRow?.(current().row) ?? current().row.label}
              </span>
            </div>
            <div role="cell" class="ui-gantt-track">
              <For each={ticks()} keyed={(tick) => tick.fraction}>
                {(tick) => (
                  <span
                    class="ui-gantt-gridline"
                    aria-hidden="true"
                    style={{ left: `${tick().fraction * 100}%` }}
                  />
                )}
              </For>
              <For each={baselines()}>
                {(interval) => (
                  <Show
                    when={ganttIntervalGeometry(
                      interval.baseline!,
                      props.range,
                      timelineWidth(),
                    )}
                  >
                    {(box) => (
                      <span
                        class="ui-gantt-baseline"
                        role="img"
                        aria-label={`Baseline: ${interval.label}, ${formatter().format(interval.baseline!.start)} to ${formatter().format(interval.baseline!.end)}`}
                        style={{
                          left: `${box().x}px`,
                          width: `${Math.max(2, box().width)}px`,
                          top: `${((layout().lanes.get(interval.id) ?? 0) + 1) * rowHeight() - 5}px`,
                        }}
                      />
                    )}
                  </Show>
                )}
              </For>
              <For each={intervals()} keyed={(interval) => interval.id}>
                {renderBar}
              </For>
            </div>
          </div>
        )}
      </Show>
    )
  }
  return (
    <section
      data-ui=""
      class={styledClasses('ui-gantt', props.class)}
      aria-labelledby={headingId}
      aria-busy={props.loading ? 'true' : undefined}
      style={{
        height:
          typeof props.height === 'number'
            ? `${props.height}px`
            : (props.height ?? '480px'),
        '--ui-gantt-label-width': `${labelWidth()}px`,
        ...props.style,
      }}
    >
      <Show when={props.onChange}>
        <DragDropFeedback
          scope={interaction.scope}
          instructionsId={instructionsId}
          instructions="Press Space or Enter to pick up. Use Left or Right to change time. Press Space or Enter to request the change, or Escape to cancel. Press S to select, Shift+S to toggle selection, or F2 to open details."
        />
      </Show>
      <header
        class="ui-gantt-toolbar table-workspace-header"
        data-narrow={width() < 560 ? '' : undefined}
      >
        <div class="ui-gantt-actions table-workspace-header-actions">
          <Show when={props.onRangeChange}>
            <IconButton
              aria-label="Previous period"
              onClick={() => navigate(-1)}
            >
              <Icon name="chevron-left" />
            </IconButton>
            <IconButton aria-label="Next period" onClick={() => navigate(1)}>
              <Icon name="chevron-right" />
            </IconButton>
            <IconButton aria-label="Zoom in" onClick={() => navigate(0, 0.5)}>
              <Icon glyph={iconZoomIn} />
            </IconButton>
            <IconButton aria-label="Zoom out" onClick={() => navigate(0, 2)}>
              <Icon glyph={iconZoomOut} />
            </IconButton>
          </Show>
          {props.toolbar}
        </div>
        <div class="table-workspace-title">
          <div
            class="table-workspace-title-face ui-button"
            data-variant="outline"
            data-tone="neutral"
          >
            <div class="table-workspace-title-text">
              <h2 id={headingId}>{props.label ?? 'Schedule'}</h2>
            </div>
          </div>
        </div>
      </header>
      <div
        class="ui-gantt-scroll"
        ref={(element) => untrack(() => setScrollElement(element))}
      >
        <div
          role="table"
          aria-label={props.label ?? 'Schedule'}
          aria-rowcount={rows().length + 1}
          aria-colcount={2}
        >
          <div role="row" class="ui-gantt-axis" style={{ height: '32px' }}>
            <div role="columnheader" class="ui-gantt-row-label">
              ITEM
            </div>
            <div
              role="columnheader"
              class="ui-gantt-axis-track"
              aria-label={`Timeline, ${props.timeZone ?? 'UTC'}`}
            >
              <For each={ticks()} keyed={(tick) => tick.fraction}>
                {(tick) => (
                  <span style={{ left: `${tick().fraction * 100}%` }}>
                    {tick().label}
                  </span>
                )}
              </For>
            </div>
          </div>
          <div role="rowgroup" class="ui-gantt-body">
            <div
              aria-hidden="true"
              class="ui-gantt-dropzone"
              ref={interaction.timelineRef}
              style={{
                left: `${labelWidth()}px`,
                width: `${timelineWidth()}px`,
              }}
            />
            <VirtualRows
              window={virtual}
              layout="block"
              renderRow={renderRow}
            />
            <svg
              class="ui-gantt-dependencies"
              aria-hidden="true"
              viewBox={`0 ${connectorViewport().top} ${timelineWidth()} ${Math.max(1, connectorViewport().height)}`}
              style={{
                top: `${connectorViewport().top}px`,
                left: `${labelWidth()}px`,
                width: `${timelineWidth()}px`,
                height: `${connectorViewport().height}px`,
              }}
            >
              <For each={paths()} keyed={(edge) => edge.id}>
                {(edge) => <path d={edge().path} />}
              </For>
            </svg>
          </div>
        </div>
        <Show when={!rows().length}>
          <p class="ui-gantt-empty">NO ITEMS</p>
        </Show>
      </div>
    </section>
  )
}
