import { ContainerLayoutReview } from '../ContainerLayoutReview'
import { createSignal } from 'solid-js'
import type { ThemeDensity, ThemePreset } from '@wfe/components/theme'
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
  const [preset, setPreset] = createSignal<ThemePreset>('default')
  const [density, setDensity] = createSignal<ThemeDensity>('default')
  const [mode, setMode] = createSignal<'light' | 'dark'>('light')
  const [choice, setChoice] = createSignal<string | undefined>('first')
  const table = createTable({
    source: { ids: () => ['a'], get: () => ({ name: 'Record' }) },
    columns: [{ id: 'name', accessorKey: 'name', header: 'Name' }],
  })
  return (
    <Theme
      id="theme-consumer"
      preset={preset()}
      mode={mode()}
      density={density()}
    >
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
            <Button
              id="theme-preset"
              onClick={() =>
                setPreset(preset() === 'default' ? 'vanilla' : 'default')
              }
            >
              Change preset
            </Button>
            <Button
              id="theme-density"
              onClick={() =>
                setDensity(
                  density() === 'default'
                    ? 'comfortable'
                    : density() === 'comfortable'
                      ? 'compact'
                      : 'default',
                )
              }
            >
              Change density
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
      <Theme id="vanilla-theme" preset="vanilla" mode="light">
        <DashboardPanel>
          <Input
            id="vanilla-theme-draft"
            aria-label="Vanilla draft"
            defaultValue="Plain consumer record"
          />
          <Popover>
            <Popover.Trigger id="vanilla-theme-trigger">
              Vanilla popup
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content id="vanilla-theme-popup">
                <Popover.Title>Vanilla details</Popover.Title>
                <Input aria-label="Vanilla popup draft" />
              </Popover.Content>
            </Popover.Portal>
          </Popover>
          <Theme id="vanilla-nested-default" preset="default" mode="dark">
            <Input
              id="vanilla-nested-draft"
              aria-label="Nested default draft"
              defaultValue="Nested consumer record"
            />
            <Popover>
              <Popover.Trigger id="vanilla-nested-trigger">
                Nested default popup
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content id="vanilla-nested-popup">
                  <Popover.Title>Nested default details</Popover.Title>
                  <Input aria-label="Nested default popup draft" />
                </Popover.Content>
              </Popover.Portal>
            </Popover>
          </Theme>
        </DashboardPanel>
      </Theme>
      <ContainerLayoutReview />
    </Theme>
  )
}
