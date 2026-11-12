// Generated from built declarations by tests/consumers/generate.mjs.
// Resolve only public package exports through the workspace node_modules links.
import type {
  Diagram,
  DiagramEdge,
  DiagramEndpoint,
  DiagramInputNode,
  DiagramLayoutOptions,
  DiagramNode,
  DiagramNodeContext,
  DiagramPort,
  DiagramProps,
  DiagramSelection,
  DiagramViewport,
  layoutDiagram,
} from '@wfe/components/diagram'
import type { AllTyped, Assert } from '../assertions.js'

export type ExportedTypes = Assert<
  AllTyped<{
    Diagram: typeof Diagram
    DiagramEdge: DiagramEdge
    DiagramEndpoint: DiagramEndpoint
    DiagramInputNode: DiagramInputNode
    DiagramLayoutOptions: DiagramLayoutOptions
    DiagramNode: DiagramNode
    DiagramNodeContext: DiagramNodeContext
    DiagramPort: DiagramPort
    DiagramProps: DiagramProps
    DiagramSelection: DiagramSelection
    DiagramViewport: DiagramViewport
    layoutDiagram: typeof layoutDiagram
  }>
>
