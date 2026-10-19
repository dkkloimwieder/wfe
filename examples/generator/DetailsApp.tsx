import { exampleSizing } from '../shared/appearance/sizing'
import { createSignal, Show, untrack } from 'solid-js'
import { Button } from '@wfe/components'
import { DetailView, DeleteView, LayoutView } from '@wfe/generator'
import type { DetailDescription, LayoutDescription } from '@wfe/generator'
type RecordValue = {
  id: string
  name: string
  active: boolean
  created: string
}
const initial: RecordValue = {
  id: '0123456789abcdef',
  name: 'Example record',
  active: true,
  created: '2024-02-29',
}
export function createDetailsApplication() {
  const [record, setRecord] = createSignal<RecordValue | undefined>(initial)
  const [visible, setVisible] = createSignal(true)
  let confirmations = 0,
    actions = 0
  const description = {
    id: 'record-detail',
    title: 'Record',
    columns: 2,
    fields: [
      {
        field: 'id',
        format: 'short-hash',
        help: 'Full key available in the title',
      },
      { field: 'name' },
      { field: 'active', format: 'boolean-symbol' },
      {
        field: 'created',
        format: 'date',
        formatOptions: { dateFormat: 'dd/MM/yyyy' },
      },
    ],
    actions: [{ id: 'toggle', label: 'Toggle active' }],
  } as const satisfies DetailDescription<RecordValue>
  return {
    kind: 'details' as const,
    record,
    visible,
    description,
    toggle() {
      actions++
      setRecord((old) => (old ? { ...old, active: !old.active } : old))
    },
    confirm(key: string) {
      confirmations++
      if (record()?.id === key) setRecord(undefined)
    },
    restore: () => setRecord(initial),
    revise: () =>
      setRecord((old) =>
        old ? { ...old, id: 'abcdef0123456789', name: 'Other record' } : old,
      ),
    remove: () => setVisible(false),
    snapshot: () =>
      untrack(() => ({ record: record(), confirmations, actions })),
  }
}
export function DetailsApp(props: {
  ready?: (app: ReturnType<typeof createDetailsApplication>) => void
}) {
  const app = createDetailsApplication()
  props.ready?.(app)
  const Record = () => (
    <Show
      when={app.record()}
      fallback={
        <>
          <p data-ui-text="system">No record</p>
          <Button onClick={app.restore}>Restore example</Button>
        </>
      }
    >
      <DetailView
        description={app.description}
        bindings={{
          record: () => app.record()!,
          actions: { toggle: { run: app.toggle } },
        }}
      />
      <DeleteView
        description={{
          id: 'record-delete',
          title: 'Delete record?',
          confirmation: 'Delete this example record from memory?',
          triggerLabel: 'Delete record',
          confirmLabel: 'Confirm deletion',
        }}
        bindings={{ recordKey: () => app.record()!.id, onConfirm: app.confirm }}
      />
    </Show>
  )
  return (
    <Show when={app.visible()}>
      <div class="generated-details">
        <LayoutView
          style={exampleSizing}
          description={
            {
              id: 'detail-layout',
              title: 'Detail and delete',
              columns: 1,
              panels: [{ id: 'record', view: 'record', fill: true }],
              footer: [],
            } as const satisfies LayoutDescription<'record'>
          }
          bindings={{ views: { record: Record } }}
        />
      </div>
    </Show>
  )
}
