import { createSignal } from 'solid-js'
import {
  Theme,
  Button,
  Field,
  Label,
  Input,
  SelectField,
  Popover,
} from '@wfe/components'
import { DashboardShell, DashboardPanel } from '@wfe/components/layout'
import { createTable, Table } from '@wfe/components/table'
import '@wfe/components/styles.css'

/** A consumer owns state; all presentation comes from the public package. */
export function ThemeConsumer() {
  const [mode, setMode] = createSignal<'light' | 'dark'>('light')
  const [choice, setChoice] = createSignal<string | undefined>('first')
  const table = createTable({
    source: { ids: () => ['a'], get: () => ({ name: 'Record' }) },
    columns: [{ id: 'name', accessorKey: 'name', header: 'Name' }],
  })
  return (
    <Theme id="theme-consumer" mode={mode()}>
      <DashboardShell header="Public theme" style={{ height: '28rem' }}>
        <DashboardShell
          mainAs="section"
          header="Nested layout"
          style={{ height: '22rem' }}
        >
          <DashboardPanel>
            <Field>
              <Label>Name</Label>
              <Input id="theme-name" defaultValue="A consumer record" />
            </Field>
            <SelectField
              label="Theme choice"
              choices={[
                { value: 'first', label: 'First' },
                { value: 'second', label: 'Second' },
              ]}
              value={choice()}
              onValueChange={setChoice}
            />
            <Button
              id="theme-mode"
              onClick={() => setMode(mode() === 'light' ? 'dark' : 'light')}
            >
              Change mode
            </Button>
            <Popover>
              <Popover.Trigger>Theme popup</Popover.Trigger>
              <Popover.Portal>
                <Popover.Content id="theme-popup">
                  <Popover.Title>Themed popup</Popover.Title>
                  <Input aria-label="Popup name" />
                </Popover.Content>
              </Popover.Portal>
            </Popover>
            <Table
              table={table}
              renderCell={() => (
                <Button id="theme-row-action">View theme record</Button>
              )}
            />
            <Theme id="nested-theme" mode="dark" accent="orange">
              <Button id="nested-theme-action">Nested theme</Button>
            </Theme>
          </DashboardPanel>
        </DashboardShell>
      </DashboardShell>
    </Theme>
  )
}
