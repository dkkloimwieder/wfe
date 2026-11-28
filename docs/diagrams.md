# Diagrams

`Diagram` shows a read-only graph of nodes and connections.

Import `Diagram` and `layoutDiagram` from `@wfe/components/diagram`.

## Example

```jsx
import { Diagram } from '@wfe/components/diagram'

;<Diagram
  label="Request workflow"
  layout="auto"
  nodes={[
    { id: 'request', label: 'Request', width: 160, height: 64, data: null },
    { id: 'review', label: 'Review', width: 160, height: 64, data: null },
  ]}
  edges={[
    {
      id: 'send',
      label: 'Send for review',
      source: { node: 'request' },
      target: { node: 'review' },
      data: null,
    },
  ]}
/>
```

## Behavior and options

Manual layout uses node `x` and `y` coordinates. Automatic layout arranges connected nodes in columns. Set `layout={{ nodeGap: 48, rankGap: 120 }}` to change spacing. `layoutDiagram` returns positioned copies in input order.

Edges connect node IDs and optional named ports. Edge types are `straight`, `bezier`, and `step`. Use `showEdgeLabels={false}` to hide visible labels while keeping accessible relationship descriptions. Named ports specify a side and offset. Use `showLabel` to show a port label inside its node.

The canvas supports pan, zoom, fit, and keyboard navigation. A disclosure lists nodes and edges as text. An application can provide `selection` and accept or reject `onSelectionChange` requests. A request to clear selection passes `null`.

`renderNode` receives a reactive positioned node through `context.node`. A stable renderer retains its content when the node ID survives an update. Set `fitContent: true` to measure content height in the browser. Use `initialWidth` and matching node dimensions for server rendering and hydration.

## Application ownership

Supply stable IDs, labels, dimensions, records, and relationship endpoints. Accept selections in application state. Automatic layout positions the display. Applications handle graph editing, routing, and workflow execution.

## Gallery

Open `?gallery=workflow` for workflow stages or `?gallery=erd` for a diagram of entities and their relationships.
