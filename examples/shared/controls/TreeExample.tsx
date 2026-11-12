import { createSignal, Show } from 'solid-js'
import { Button, Checkbox, Collapsible, Select } from '@wfe/components'
import { Tree, type TreeNode } from '@wfe/components/tree'
const records: readonly TreeNode[] = [
  {
    id: 'projects',
    label: 'Projects',
    children: [
      {
        id: 'alpha',
        label: 'Alpha',
        children: [
          { id: 'notes', label: 'Notes' },
          { id: 'tasks', label: 'Tasks' },
        ],
      },
      { id: 'beta', label: 'Beta' },
      { id: 'archive', label: 'Archive', disabled: true },
    ],
  },
  {
    id: 'shared',
    label: 'Shared files',
    children: [{ id: 'guide', label: 'Guide' }],
  },
  { id: 'settings', label: 'Settings' },
]
export function TreeExample(props: { comparisons?: boolean }) {
  const [singleChoice, setSingleChoice] = createSignal<string | null>('Beta')
  const [multiChoice, setMultiChoice] = createSignal<string[]>([
    'Alpha',
    'Beta',
  ])
  const [selected, setSelected] = createSignal<readonly string[]>(['beta'])
  const [expanded, setExpanded] = createSignal<readonly string[]>(['projects'])
  const [nodes, setNodes] = createSignal(records)
  const [reject, setReject] = createSignal(false)
  const [multiple, setMultiple] = createSignal(false)
  const [rtl, setRtl] = createSignal(false)
  const [request, setRequest] = createSignal('None')
  return (
    <section style={{ padding: '12px', 'max-width': '720px', margin: 'auto' }}>
      <h2>Tree navigation</h2>
      <p>
        Use the arrow keys to move and expand. Press Enter or Space to select.
        Type a name to find it.
      </p>
      <div
        style={{
          display: 'flex',
          gap: '4px',
          'flex-wrap': 'wrap',
          'margin-bottom': '12px',
        }}
      >
        <Checkbox checked={reject()} onChange={setReject}>
          <Checkbox.Input />
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Label>Reject changes</Checkbox.Label>
        </Checkbox>
        <Checkbox checked={multiple()} onChange={setMultiple}>
          <Checkbox.Input />
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Label>Multiple selection</Checkbox.Label>
        </Checkbox>
        <Checkbox checked={rtl()} onChange={setRtl}>
          <Checkbox.Input />
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Label>Right to left</Checkbox.Label>
        </Checkbox>
        <Button onClick={() => setNodes((value) => structuredClone(value))}>
          Refresh records
        </Button>
        <Button
          onClick={() => {
            setNodes(records)
            setExpanded(['projects'])
            setSelected(['beta'])
          }}
        >
          Reset tree
        </Button>
        <Button onClick={() => setNodes([])}>Empty tree</Button>
        <Button onClick={() => setExpanded([])}>Collapse all</Button>
      </div>
      <Tree
        label="Files"
        nodes={nodes()}
        selected={selected()}
        expanded={expanded()}
        multiple={multiple()}
        dir={rtl() ? 'rtl' : 'ltr'}
        onSelectionChange={(ids) => {
          setRequest(`Select ${ids.join(', ')}`)
          if (!reject()) setSelected(ids)
        }}
        onExpandedChange={(ids) => {
          setRequest(`Expand ${ids.join(', ')}`)
          if (!reject()) setExpanded(ids)
        }}
      />
      <p>
        Selected:{' '}
        <output aria-label="Selected IDs">
          {selected().join(', ') || 'None'}
        </output>
      </p>
      <p>
        Last request: <output aria-label="Last request">{request()}</output>
      </p>
      <Show when={props.comparisons}>
        <Button>After tree</Button>
        <div style={{ display: 'grid', gap: '8px', 'margin-block': '12px' }}>
          <Select<string>
            options={['Alpha', 'Beta', 'Shared files', 'Settings']}
            value={singleChoice()}
            onValueChange={setSingleChoice}
            itemComponent={(item) => (
              <Select.Item item={item.item}>
                <Select.ItemLabel>{item.item.rawValue}</Select.ItemLabel>
                <Select.ItemIndicator />
              </Select.Item>
            )}
          >
            <Select.Label>Single select</Select.Label>
            <Select.Trigger aria-label="Single select">
              <Select.Value<string>>
                {(state) => state.selectedOption()}
              </Select.Value>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content>
                <Select.Listbox />
              </Select.Content>
            </Select.Portal>
          </Select>
          <Select<string>
            multiple
            options={['Alpha', 'Beta', 'Shared files', 'Settings']}
            value={multiChoice()}
            onValueChange={setMultiChoice}
            itemComponent={(item) => (
              <Select.Item item={item.item}>
                <Select.ItemLabel>{item.item.rawValue}</Select.ItemLabel>
                <Select.ItemIndicator />
              </Select.Item>
            )}
          >
            <Select.Label>Multiselect</Select.Label>
            <Select.Trigger aria-label="Multiselect">
              <Select.Value<string>>
                {(state) => state.selectedOptions().join(', ')}
              </Select.Value>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content>
                <Select.Listbox />
              </Select.Content>
            </Select.Portal>
          </Select>
        </div>
        <Collapsible summary="Theme comparison">
          <p>Shared controls under the same theme as the tree.</p>
          <Button>Reference button</Button>{' '}
          <Button disabled>Disabled reference</Button>{' '}
          <Button aria-pressed="true">Selected reference</Button>
          <Collapsible summary="Reference disclosure">
            Reference content
          </Collapsible>
        </Collapsible>
      </Show>
    </section>
  )
}
