import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  For,
  onSettled,
  Show,
} from 'solid-js'
import { Collapsible } from '../components/Collapsible'
import { Button } from '../components/NativeFields'
import { styledClasses } from '../internal/classes'
import { layoutDiagram } from './layout'
import { diagramGraph, fitDiagram, zoomDiagram } from './geometry'
import type {
  DiagramNode,
  DiagramProps,
  DiagramSelection,
  DiagramViewport,
} from './types'

/** Read-only graph presentation. Navigation never changes application records. */
export function Diagram<N, E>(props: DiagramProps<N, E>) {
  const id = createUniqueId()
  let surface: HTMLDivElement | undefined
  let radiusProbe: HTMLSpanElement | undefined
  const [cornerRadius, setCornerRadius] = createSignal(0)
  const [width, setWidth] = createSignal<number>()
  const [manualView, setManualView] = createSignal<DiagramViewport>()
  createEffect(
    () => props.layout,
    () => {
      setManualView(undefined)
    },
    { defer: true },
  )
  const [nodeHeights, setNodeHeights] = createSignal<
    ReadonlyMap<string, number>
  >(new Map())
  const measuredNodes = createMemo(() =>
    props.nodes.map((node) =>
      node.fitContent && nodeHeights().has(node.id)
        ? { ...node, height: nodeHeights().get(node.id)! }
        : node,
    ),
  )
  const positionedNodes = createMemo(() =>
    props.layout && props.layout !== 'manual'
      ? layoutDiagram(
          measuredNodes(),
          props.edges,
          props.layout === 'auto' ? {} : props.layout,
        )
      : measuredNodes(),
  )
  const graph = createMemo(() =>
    diagramGraph(positionedNodes(), props.edges, cornerRadius()),
  )
  const measureNode = (id: string, height: number) => {
    if (height > 0 && nodeHeights().get(id) !== height)
      setNodeHeights((previous) => new Map(previous).set(id, height))
  }
  const height = () => Math.max(160, props.height ?? 420)
  const measuredWidth = () =>
    width() ?? Math.max(160, props.initialWidth ?? 640)
  const view = createMemo(
    () => manualView() ?? fitDiagram(graph().bounds, measuredWidth(), height()),
  )
  const selected = (kind: DiagramSelection['kind'], key: string) =>
    props.selection?.kind === kind && props.selection.id === key
  const select = (kind: DiagramSelection['kind'], key: string) =>
    props.onSelectionChange?.({ kind, id: key })
  const zoom = (factor: number) =>
    setManualView(
      zoomDiagram(
        view(),
        view().zoom * factor,
        measuredWidth() / 2,
        height() / 2,
      ),
    )
  const pan = (x: number, y: number) =>
    setManualView({ ...view(), x: view().x + x, y: view().y + y })
  const reveal = (x: number, y: number, w: number, h: number) => {
    const current = view()
    const left = x * current.zoom + current.x
    const top = y * current.zoom + current.y
    const right = left + w * current.zoom
    const bottom = top + h * current.zoom
    const dx =
      left < 8
        ? 8 - left
        : right > measuredWidth() - 8
          ? measuredWidth() - 8 - right
          : 0
    const dy =
      top < 8 ? 8 - top : bottom > height() - 8 ? height() - 8 - bottom : 0
    if (dx || dy)
      setManualView({ ...current, x: current.x + dx, y: current.y + dy })
  }
  let drag:
    { id: number; x: number; y: number; view: DiagramViewport } | undefined
  onSettled(() => {
    if (!surface) return
    const element = surface
    const measure = () => {
      if (element.clientWidth > 0) setWidth(element.clientWidth)
      if (radiusProbe)
        setCornerRadius(radiusProbe.getBoundingClientRect().width)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    if (radiusProbe) observer.observe(radiusProbe)
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      const bounds = element.getBoundingClientRect()
      setManualView(
        zoomDiagram(
          view(),
          view().zoom * Math.exp(-event.deltaY * 0.002),
          event.clientX - bounds.left,
          event.clientY - bounds.top,
        ),
      )
    }
    element.addEventListener('wheel', wheel, { passive: false })
    return () => {
      observer.disconnect()
      element.removeEventListener('wheel', wheel)
      if (drag && element.hasPointerCapture?.(drag.id))
        element.releasePointerCapture(drag.id)
      drag = undefined
    }
  })
  return (
    <section
      data-ui=""
      class={styledClasses('ui-diagram', props.class)}
      aria-label={props.label}
    >
      <div
        class="ui-diagram-controls"
        role="group"
        aria-label={`${props.label} navigation`}
      >
        <Button onClick={() => zoom(1.25)} aria-label="Zoom in">
          +
        </Button>
        <Button onClick={() => zoom(0.8)} aria-label="Zoom out">
          −
        </Button>
        <Button onClick={() => setManualView(undefined)}>Fit diagram</Button>
        <Button onClick={() => pan(60, 0)} aria-label="Pan left">
          ←
        </Button>
        <Button onClick={() => pan(-60, 0)} aria-label="Pan right">
          →
        </Button>
        <Button onClick={() => pan(0, 60)} aria-label="Pan up">
          ↑
        </Button>
        <Button onClick={() => pan(0, -60)} aria-label="Pan down">
          ↓
        </Button>
        <output aria-label="Diagram zoom">
          {Math.round(view().zoom * 100)}%
        </output>
      </div>
      <p id={`${id}-help`} class="ui-diagram-help">
        Drag the background to pan. Use Ctrl + wheel to zoom. Focus the canvas
        and use arrow keys to pan, + or − to zoom, and Home to fit.
      </p>
      <div
        ref={(element) => {
          surface = element
        }}
        class="ui-diagram-surface"
        role="group"
        aria-label={`${props.label} canvas`}
        aria-describedby={`${id}-help`}
        tabindex={0}
        style={{ height: `${height()}px` }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            props.onSelectionChange?.(null)
            return
          }
          if (event.target !== event.currentTarget) return
          const directions: Record<string, [number, number]> = {
            ArrowLeft: [60, 0],
            ArrowRight: [-60, 0],
            ArrowUp: [0, 60],
            ArrowDown: [0, -60],
          }
          const move = directions[event.key]
          if (move) {
            event.preventDefault()
            pan(...move)
          } else if (event.key === '+' || event.key === '=') {
            event.preventDefault()
            zoom(1.25)
          } else if (event.key === '-') {
            event.preventDefault()
            zoom(0.8)
          } else if (event.key === 'Home') {
            event.preventDefault()
            setManualView(undefined)
          }
        }}
        onPointerDown={(event) => {
          if (
            event.button !== 0 ||
            (event.target as Element).closest(
              '[data-diagram-node], [data-diagram-edge]',
            )
          )
            return
          drag = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            view: view(),
          }
          event.currentTarget.setPointerCapture(event.pointerId)
          event.currentTarget.focus()
        }}
        onPointerMove={(event) => {
          if (!drag || drag.id !== event.pointerId) return
          setManualView({
            ...drag.view,
            x: drag.view.x + event.clientX - drag.x,
            y: drag.view.y + event.clientY - drag.y,
          })
        }}
        onPointerUp={(event) => {
          if (drag?.id !== event.pointerId) return
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId)
          drag = undefined
        }}
        onPointerCancel={() => {
          drag = undefined
        }}
        onLostPointerCapture={() => {
          drag = undefined
        }}
      >
        <span
          class="ui-diagram-radius-probe"
          aria-hidden="true"
          ref={(element) => {
            radiusProbe = element
          }}
        />
        <Show
          when={props.nodes.length}
          fallback={<p class="ui-diagram-empty">No diagram records</p>}
        >
          <div
            class="ui-diagram-world"
            style={{
              transform: `translate(${view().x}px, ${view().y}px) scale(${view().zoom})`,
            }}
          >
            <svg
              class="ui-diagram-edges ui-diagram-definitions"
              aria-hidden="true"
            >
              <defs>
                <marker
                  id={`${id}-arrow`}
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerUnits="userSpaceOnUse"
                  markerWidth="10"
                  markerHeight="10"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
                </marker>
              </defs>
            </svg>
            <For each={graph().paths} keyed={(row) => row.edge.id}>
              {(row) => (
                <svg
                  class="ui-diagram-edges"
                  data-diagram-edge={row().edge.id}
                  data-selected={
                    selected('edge', row().edge.id) ? '' : undefined
                  }
                  role="button"
                  onFocus={() =>
                    reveal(row().labelX - 60, row().labelY - 20, 120, 40)
                  }
                  tabindex={0}
                  aria-label={row().description}
                  aria-pressed={
                    selected('edge', row().edge.id) ? 'true' : 'false'
                  }
                  onClick={() => select('edge', row().edge.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      select('edge', row().edge.id)
                    }
                  }}
                >
                  <path class="ui-diagram-edge-hit" d={row().path} />
                  <Show when={selected('edge', row().edge.id)}>
                    <path
                      class="ui-diagram-edge-halo ui-diagram-edge-halo-blur"
                      d={row().path}
                      marker-end={`url(#${id}-arrow)`}
                      aria-hidden="true"
                    />
                    <path
                      class="ui-diagram-edge-halo ui-diagram-edge-halo-core"
                      d={row().path}
                      marker-end={`url(#${id}-arrow)`}
                      aria-hidden="true"
                    />
                  </Show>
                  <path
                    class="ui-diagram-edge-line"
                    d={row().path}
                    marker-end={`url(#${id}-arrow)`}
                  />
                  <Show when={props.showEdgeLabels !== false}>
                    <rect
                      class="ui-diagram-edge-label-background"
                      x={row().labelX - (row().edge.label.length * 7 + 12) / 2}
                      y={row().labelY - 22}
                      width={row().edge.label.length * 7 + 12}
                      height={20}
                    />
                    <text
                      class="ui-diagram-edge-label"
                      x={row().labelX}
                      y={row().labelY - 8}
                      text-anchor="middle"
                    >
                      {row().edge.label}
                    </text>
                  </Show>
                </svg>
              )}
            </For>
            <For each={props.nodes} keyed={(node) => node.id}>
              {(node) => (
                <div
                  class="ui-diagram-node"
                  data-diagram-node={node().id}
                  data-fit-content={node().fitContent ? '' : undefined}
                  data-selected={selected('node', node().id) ? '' : undefined}
                  style={{
                    left: `${graph().byId.get(node().id)!.x}px`,
                    top: `${graph().byId.get(node().id)!.y}px`,
                    width: `${node().width}px`,
                    height: node().fitContent ? 'auto' : `${node().height}px`,
                  }}
                >
                  <Button
                    class="ui-diagram-node-title"
                    onFocus={() =>
                      reveal(
                        graph().byId.get(node().id)!.x,
                        graph().byId.get(node().id)!.y,
                        node().width,
                        graph().byId.get(node().id)!.height,
                      )
                    }
                    variant="ghost"
                    aria-label={`Inspect ${node().label}`}
                    aria-pressed={
                      selected('node', node().id) ? 'true' : 'false'
                    }
                    onClick={() => select('node', node().id)}
                  >
                    {node().label}
                  </Button>
                  <DiagramNodeBody
                    node={graph().byId.get(node().id)!}
                    render={props.renderNode}
                    onHeight={measureNode}
                  />
                  <For each={node().ports ?? []}>
                    {(port) => (
                      <>
                        <Show when={port.showLabel}>
                          <span
                            class="ui-diagram-port-label"
                            data-diagram-port-label={port.id}
                            data-side={port.side}
                            style={{
                              left:
                                port.side === 'left'
                                  ? '12px'
                                  : port.side === 'right'
                                    ? undefined
                                    : `${port.offset}px`,
                              right: port.side === 'right' ? '12px' : undefined,
                              top:
                                port.side === 'top'
                                  ? '8px'
                                  : port.side === 'bottom'
                                    ? undefined
                                    : `${port.offset}px`,
                              bottom:
                                port.side === 'bottom' ? '8px' : undefined,
                            }}
                          >
                            {port.label}
                          </span>
                        </Show>
                        <span
                          class="ui-diagram-port"
                          aria-hidden="true"
                          title={port.label}
                          style={{
                            left:
                              port.side === 'left'
                                ? '0'
                                : port.side === 'right'
                                  ? '100%'
                                  : `${port.offset}px`,
                            top:
                              port.side === 'top'
                                ? '0'
                                : port.side === 'bottom'
                                  ? '100%'
                                  : `${port.offset}px`,
                          }}
                        />
                      </>
                    )}
                  </For>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
      <Collapsible
        class="ui-diagram-description"
        summary="Diagram records and relationships"
      >
        <ul>
          <For each={props.nodes} keyed={(node) => node.id}>
            {(node) => (
              <li>
                <Button
                  variant="ghost"
                  aria-pressed={selected('node', node().id) ? 'true' : 'false'}
                  onClick={() => select('node', node().id)}
                >
                  {node().label}
                </Button>
                <Show when={node().ports?.length}>
                  <span>
                    Connection points:{' '}
                    {node()
                      .ports?.map((port) => port.label)
                      .join(', ')}
                  </span>
                </Show>
              </li>
            )}
          </For>
        </ul>
        <ul>
          <For each={graph().paths} keyed={(row) => row.edge.id}>
            {(row) => (
              <li>
                <Button
                  variant="ghost"
                  aria-pressed={
                    selected('edge', row().edge.id) ? 'true' : 'false'
                  }
                  onClick={() => select('edge', row().edge.id)}
                >
                  {row().description}
                </Button>
              </li>
            )}
          </For>
        </ul>
      </Collapsible>
    </section>
  )
}

function DiagramNodeBody<N>(props: {
  node: DiagramNode<N>
  render: DiagramProps<N>['renderNode']
  onHeight: (id: string, height: number) => void
}) {
  let content: HTMLDivElement | undefined
  onSettled(() => {
    const element = content?.parentElement
    if (!element) return
    const measure = () => {
      if (props.node.fitContent)
        props.onHeight(props.node.id, element.offsetHeight)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  })
  return (
    <div
      class="ui-diagram-node-content"
      ref={(element) => {
        content = element
      }}
    >
      <Show when={props.render} keyed>
        {(render) =>
          render({
            get node() {
              return props.node
            },
          })
        }
      </Show>
    </div>
  )
}
