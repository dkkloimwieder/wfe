import '@wfe/components/styles.css'
import { createSignal, onCleanup } from 'solid-js'
import {
  Button,
  Checkbox,
  Dialog,
  Field,
  HelpText,
  Input,
  Label,
} from '@wfe/components'
import { DashboardShell } from '@wfe/components/layout'
import {
  createTable as createNativeTable,
  ReadOnlyTable,
} from '@wfe/components/table'

export const lifecycle = {
  reads: 0,
  cleanups: 0,
  changes: 0,
  rename: (_value: string) => {},
  configure: (_value: {
    name?: string
    checked?: boolean
    open?: boolean
  }) => {},
}

export default function App() {
  const [name, setName] = createSignal('Ada')
  const [navigationDraft, setNavigationDraft] = createSignal('Persistent draft')
  const [checked, setChecked] = createSignal(true)
  const [open, setOpen] = createSignal(false)
  lifecycle.rename = setName
  lifecycle.configure = (value) => {
    if (value.name !== undefined) setName(value.name)
    if (value.checked !== undefined) setChecked(value.checked)
    if (value.open !== undefined) setOpen(value.open)
  }
  onCleanup(() => lifecycle.cleanups++)
  const record = {
    get name() {
      lifecycle.reads++
      return name()
    },
  }
  const table = createNativeTable({
    source: { ids: () => ['a'], get: () => record },
    columns: [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Name',
        sortFn: (a, b) => String(a).localeCompare(String(b)),
      },
    ],
  })
  const view = table.createRowView('a')
  return (
    <DashboardShell
      header={<h1 id="adopt-layout-header">Workspace</h1>}
      navigation={() => (
        <Input
          id="adopt-layout-draft"
          aria-label="Navigation draft"
          value={navigationDraft()}
          onInput={(event) => setNavigationDraft(event.currentTarget.value)}
        />
      )}
    >
      <Checkbox
        id="adopt-check"
        checked={checked()}
        onChange={(value) => {
          lifecycle.changes++
          setChecked(value)
        }}
      >
        <Checkbox.Input id="adopt-check-input" />
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        <Checkbox.Label>Include record</Checkbox.Label>
      </Checkbox>
      <Field controlId="adopt-name">
        <Label>Record name</Label>
        <Input
          id="adopt-name"
          value={name()}
          onInput={(event) => {
            lifecycle.changes++
            setName(event.currentTarget.value)
          }}
        />
        <HelpText id="adopt-help">The application owns this value.</HelpText>
      </Field>
      <table aria-label="Native cell">
        <tbody>
          <tr>
            <td id="name">{view.getVisibleCells()[0]?.getValue()}</td>
          </tr>
        </tbody>
      </table>
      <section id="adopt-table">
        <ReadOnlyTable
          table={table}
          title="Hydrated records"
          controls={{
            filtering: false,
            search: false,
            grouping: false,
            columnReordering: false,
          }}
        />
      </section>
      <Button id="rename" type="button" onClick={() => setName('Grace')}>
        Rename
      </Button>
      <Dialog id="adopt-dialog" open={open()} onOpenChange={setOpen}>
        <Dialog.Trigger as={Button} id="adopt-trigger">
          View record
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content>
            <Dialog.Title>Record preview</Dialog.Title>
            <Dialog.Description>
              The current application value is {name()}.
            </Dialog.Description>
            <Dialog.CloseButton as={Button}>Close preview</Dialog.CloseButton>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </DashboardShell>
  )
}
