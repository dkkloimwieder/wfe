import { createMemo, createSignal, For, Show } from 'solid-js'
import { Button, Checkbox, Input, ToggleGroup } from '@wfe/components'
import { Diagram } from '@wfe/components/diagram'
import type {
  DiagramEdge,
  DiagramNode,
  DiagramSelection,
} from '@wfe/components/diagram'
import {
  largeWorkflow,
  largeWorkflowEdges,
  withWorkflowOutputs,
} from './workflow-data'
import './diagrams.css'

type RecordData = {
  description: string
  fields?: readonly { name: string; type: string }[]
  status?: string
}
const workflowStages: readonly DiagramNode<RecordData>[] = [
  {
    id: 'request',
    label: 'Request received',
    x: 0,
    y: 150,
    width: 200,
    height: 112,
    data: {
      description: 'Validate the submitted request.',
      status: 'Complete',
    },
  },
  {
    id: 'review',
    label: 'Review request',
    x: 320,
    y: 150,
    width: 200,
    height: 112,
    data: {
      description: 'Check eligibility and required evidence.',
      status: 'In progress',
    },
  },
  {
    id: 'approve',
    label: 'Approve request',
    x: 640,
    y: 30,
    width: 200,
    height: 112,
    data: { description: 'Record the approval decision.', status: 'Waiting' },
  },
  {
    id: 'revise',
    label: 'Request changes',
    x: 640,
    y: 300,
    width: 200,
    height: 112,
    data: {
      description: 'Ask the submitter for missing details.',
      status: 'Waiting',
    },
  },
  {
    id: 'complete',
    label: 'Complete request',
    x: 960,
    y: 30,
    width: 200,
    height: 112,
    data: {
      description: 'Publish the result and notify the submitter.',
      status: 'Waiting',
    },
  },
]
const workflowEdges: readonly DiagramEdge<string>[] = [
  {
    id: 'submitted',
    label: 'Submitted',
    source: { node: 'request' },
    target: { node: 'review' },
    data: 'A valid submission starts review.',
  },
  {
    id: 'accepted',
    label: 'Eligible',
    source: { node: 'review' },
    target: { node: 'approve' },
    data: 'The reviewer accepts the request.',
  },
  {
    id: 'changes',
    label: 'More evidence',
    source: { node: 'review' },
    target: { node: 'revise' },
    data: 'The reviewer requests supporting information.',
  },
  {
    id: 'approved',
    label: 'Approved',
    source: { node: 'approve' },
    target: { node: 'complete' },
    data: 'The approval permits completion.',
  },
]
const workflow = withWorkflowOutputs(workflowStages, workflowEdges)
const entity = (
  id: string,
  label: string,
  x: number,
  y: number,
  fields: readonly { name: string; type: string }[],
): DiagramNode<RecordData> => ({
  id,
  label,
  x,
  y,
  width: 230,
  height: 32 + fields.length * 24 + 10,
  fitContent: true,
  ports: fields.flatMap((field, index) =>
    (['left', 'right'] as const).map((side) => ({
      id: `${field.name}-${side}`,
      label: field.name,
      side,
      offset: 48 + index * 24,
    })),
  ),
  data: { description: `${label} records in the order service.`, fields },
})
const erd = [
  entity('accounts', 'Accounts', 0, 40, [
    { name: 'id', type: 'PK · UUID' },
    { name: 'name', type: 'text' },
    { name: 'email', type: 'text' },
  ]),
  entity('orders', 'Orders', 400, 40, [
    { name: 'id', type: 'PK · UUID' },
    { name: 'account_id', type: 'FK · UUID' },
    { name: 'placed_at', type: 'timestamp' },
  ]),
  entity('items', 'Order items', 800, 40, [
    { name: 'id', type: 'PK · UUID' },
    { name: 'order_id', type: 'FK · UUID' },
    { name: 'product_id', type: 'FK · UUID' },
    { name: 'quantity', type: 'integer' },
  ]),
  entity('products', 'Products', 400, 330, [
    { name: 'id', type: 'PK · UUID' },
    { name: 'name', type: 'text' },
    { name: 'price', type: 'decimal' },
  ]),
]
const erdEdges: readonly DiagramEdge<string>[] = [
  {
    id: 'account-orders',
    label: '1 → many',
    type: 'step',
    source: { node: 'accounts', port: 'id-right' },
    target: { node: 'orders', port: 'account_id-left' },
    data: 'An account can place many orders. Each order belongs to one account.',
  },
  {
    id: 'order-items',
    label: '1 → many',
    type: 'step',
    source: { node: 'orders', port: 'id-right' },
    target: { node: 'items', port: 'order_id-left' },
    data: 'An order contains order items. Each item belongs to one order.',
  },
  {
    id: 'product-items',
    label: '1 → many',
    type: 'step',
    source: { node: 'products', port: 'id-right' },
    target: { node: 'items', port: 'product_id-left' },
    data: 'A product can occur in many order items.',
  },
]
export function WorkflowExample() {
  return <DiagramExample kind="workflow" />
}
export function ErdExample() {
  return <DiagramExample kind="erd" />
}
function DiagramExample(props: { kind: 'workflow' | 'erd' }) {
  const [scenario, setScenario] = createSignal<'simple' | 'large'>('simple')
  const autoLayout = createMemo(() => ({
    nodeGap: scenario() === 'large' ? 64 : 48,
  }))
  const templates = (): readonly DiagramNode<RecordData>[] =>
    props.kind === 'workflow'
      ? scenario() === 'large'
        ? largeWorkflow
        : workflow
      : erd
  const relationships = () =>
    props.kind === 'workflow'
      ? scenario() === 'large'
        ? largeWorkflowEdges
        : workflowEdges
      : erdEdges
  const [selection, setSelection] = createSignal<DiagramSelection | null>(null)
  const [layout, setLayout] = createSignal<'auto' | 'manual'>('auto')
  const [locked, setLocked] = createSignal(false)
  const [empty, setEmpty] = createSignal(false)
  const [showLabels, setShowLabels] = createSignal(true)
  const [edgeType, setEdgeType] = createSignal<'bezier' | 'straight' | 'step'>(
    'step',
  )
  const [revision, setRevision] = createSignal(0)
  const [note, setNote] = createSignal('')
  const [request, setRequest] = createSignal('No selection requested')
  const title = () =>
    props.kind === 'workflow'
      ? scenario() === 'large'
        ? 'Order fulfillment workflow'
        : 'Request workflow'
      : 'Order entity relationships'
  const nodes = createMemo(() =>
    empty()
      ? []
      : templates().map((node) => ({
          ...node,
          x: layout() === 'auto' ? undefined : node.x,
          y: layout() === 'auto' ? undefined : node.y,
          data: {
            ...node.data,
            description: `${node.data.description} Revision ${revision() + 1}.`,
          },
        })),
  )
  const edges = createMemo(() =>
    empty()
      ? []
      : relationships().map((edge) => ({
          ...edge,
          type: edgeType(),
          source:
            props.kind === 'workflow'
              ? { ...edge.source, port: edge.id }
              : edge.source,
        })),
  )
  const detail = createMemo(() => {
    const value = selection()
    if (!value)
      return 'Select a node or relationship to inspect its source record.'
    if (value.kind === 'node')
      return (
        nodes().find((node) => node.id === value.id)?.data.description ??
        'The selected record is no longer present.'
      )
    return (
      edges().find((edge) => edge.id === value.id)?.data ??
      'The selected relationship is no longer present.'
    )
  })
  return (
    <section class="diagram-example" data-diagram-example={props.kind}>
      <h2>{title()}</h2>
      <p>
        {props.kind === 'workflow'
          ? 'Inspect the stages and decisions in a request process.'
          : 'Inspect entity fields and their named relationships. PK means primary key. FK means foreign key.'}
      </p>
      <Show when={props.kind === 'workflow'}>
        <ToggleGroup
          aria-label="Workflow example"
          value={scenario()}
          allowEmpty={false}
          items={[
            { value: 'simple', label: 'Simple workflow' },
            { value: 'large', label: 'Large workflow' },
          ]}
          onValueChange={(value) => {
            if (value !== 'simple' && value !== 'large') return
            setScenario(value)
            setLayout('auto')
            setSelection(null)
            setRequest('No selection requested')
          }}
        />
        <p data-workflow-summary>
          {templates().length} stages · {relationships().length} connections.{' '}
          {scenario() === 'large'
            ? 'Parallel checks, multi-arm decisions, joins, and retry loops. Zoom in or use the record list to inspect individual stages.'
            : 'A short request review process.'}
        </p>
      </Show>
      <div class="diagram-example-controls">
        <Button onClick={() => setRevision((value) => value + 1)}>
          Refresh diagram records
        </Button>
        <Checkbox checked={locked()} onCheckedChange={setLocked}>
          <Checkbox.Input />
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Label>Reject selection changes</Checkbox.Label>
        </Checkbox>
        <Checkbox checked={empty()} onCheckedChange={setEmpty}>
          <Checkbox.Input />
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Label>Empty diagram</Checkbox.Label>
        </Checkbox>
        <Show when={props.kind === 'erd'}>
          <Checkbox checked={showLabels()} onCheckedChange={setShowLabels}>
            <Checkbox.Input />
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Checkbox.Label>Show connection labels</Checkbox.Label>
          </Checkbox>
        </Show>
        <ToggleGroup
          aria-label="Node layout"
          value={layout()}
          allowEmpty={false}
          items={[
            { value: 'auto', label: 'Automatic layout' },
            { value: 'manual', label: 'Manual layout' },
          ]}
          onValueChange={(value) => {
            if (value === 'auto' || value === 'manual') setLayout(value)
          }}
        />
        <ToggleGroup
          aria-label="Connection style"
          value={edgeType()}
          allowEmpty={false}
          items={[
            { value: 'bezier', label: 'Curved' },
            { value: 'straight', label: 'Straight' },
            { value: 'step', label: 'Elbow' },
          ]}
          onValueChange={(value) => {
            if (value === 'bezier' || value === 'straight' || value === 'step')
              setEdgeType(value)
          }}
        />
        <Input
          aria-label="Diagram analysis note"
          value={note()}
          onInput={(event) => setNote(event.currentTarget.value)}
          placeholder="Analysis note"
        />
      </div>
      <Diagram
        label={title()}
        layout={layout() === 'auto' ? autoLayout() : 'manual'}
        height={props.kind === 'workflow' && scenario() === 'large' ? 640 : 420}
        nodes={nodes()}
        edges={edges()}
        showEdgeLabels={props.kind === 'erd' && showLabels()}
        selection={selection()}
        onSelectionChange={(value) => {
          setRequest(
            `${locked() ? 'Rejected' : 'Accepted'} ${value ? `${value.kind} ${value.id}` : 'clear selection'}`,
          )
          if (!locked()) setSelection(value)
        }}
        renderNode={(context) => (
          <>
            <For each={context.node.data.fields}>
              {(field) => (
                <div class="diagram-entity-field">
                  <span>{field.name}</span>
                  <span>{field.type}</span>
                </div>
              )}
            </For>
            {context.node.data.status ? (
              <>
                <p class="diagram-stage-status">{context.node.data.status}</p>
                <p>{context.node.data.description.split(' Revision')[0]}</p>
              </>
            ) : null}
          </>
        )}
      />
      <aside class="diagram-inspection" aria-label="Selected diagram record">
        <h3>Inspection</h3>
        <p data-diagram-detail>{detail()}</p>
        <p role="status">{request()}</p>
      </aside>
    </section>
  )
}
