import type { JSX } from '@solidjs/web'
import type { ClassValue } from '../internal/classes'

export type DiagramPort = Readonly<{
  id: string
  label: string
  side: 'left' | 'right' | 'top' | 'bottom'
  /** Distance from the top or left edge, in graph units. */
  offset: number
  /** Show the port label inside the node beside its connection point. */
  showLabel?: boolean
}>
export type DiagramNode<T = unknown> = Readonly<{
  id: string
  label: string
  x: number
  y: number
  width: number
  height: number
  /** Use intrinsic content height; height remains the server-rendering fallback. */
  fitContent?: boolean
  ports?: readonly DiagramPort[]
  data: T
}>
export type DiagramLayoutOptions = Readonly<{
  /** Space between nodes in the same column, in graph units. Default: 48. */
  nodeGap?: number
  /** Space between columns, in graph units. Default: 120. */
  rankGap?: number
}>
/** Input coordinates can be omitted when automatic layout is enabled. */
export type DiagramInputNode<T = unknown> = Omit<DiagramNode<T>, 'x' | 'y'> &
  Readonly<{ x?: number; y?: number }>
export type DiagramEndpoint = Readonly<{ node: string; port?: string }>
export type DiagramEdge<T = unknown> = Readonly<{
  id: string
  label: string
  source: DiagramEndpoint
  target: DiagramEndpoint
  type?: 'bezier' | 'straight' | 'step'
  data: T
}>
export type DiagramSelection = Readonly<{
  kind: 'node' | 'edge'
  id: string
}>
export type DiagramViewport = Readonly<{ x: number; y: number; zoom: number }>
export type DiagramNodeContext<N = unknown> = { readonly node: DiagramNode<N> }
export type DiagramProps<N = unknown, E = unknown> = {
  label: string
  nodes: readonly DiagramInputNode<N>[]
  edges: readonly DiagramEdge<E>[]
  /** Manual placement is the default. Automatic layout never changes source records. */
  layout?: 'manual' | 'auto' | DiagramLayoutOptions
  /** Accepted selection. The application can accept or reject each request. */
  selection?: DiagramSelection | null
  onSelectionChange?: (selection: DiagramSelection | null) => void
  /** Hide visible connection labels while preserving accessible descriptions. */
  showEdgeLabels?: boolean
  renderNode?: (context: DiagramNodeContext<N>) => JSX.Element
  height?: number
  /** Initial viewport width for server rendering, before browser measurement. */
  initialWidth?: number
  class?: ClassValue
}
