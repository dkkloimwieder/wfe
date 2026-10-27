import { GanttControls } from '../shared/controls/GanttControls'
import { DragBoardControls } from '../shared/controls/DragBoardControls'
import {
  CompoundFieldControls,
  compoundFieldLifecycle,
} from '../shared/controls/CompoundFieldControls'
import { iconSearch } from '@wfe/components/icons'
import { ContextControls } from '../shared/controls/ContextControls'
import {
  PagedRecords,
  paginationLifecycle,
} from '../shared/controls/PagedRecords'
import { MatchingCombobox } from '../shared/controls/MatchingCombobox'
import { ThemeConsumer } from '../shared/appearance/ThemeConsumer'
import { ButtonLinkControls } from '../shared/controls/ButtonLinkControls'
import { FileControls, fileLifecycle } from '../shared/controls/FileControls'
import {
  ResizableControls,
  resizableLifecycle,
} from '../shared/controls/ResizableControls'
import {
  AccordionControls,
  accordionLifecycle,
} from '../shared/controls/AccordionControls'
import {
  BreadcrumbControls,
  breadcrumbLifecycle,
} from '../shared/controls/BreadcrumbControls'
import { TabsControls, tabsLifecycle } from '../shared/controls/TabsControls'
import {
  NumberControls,
  numberLifecycle,
} from '../shared/controls/NumberControls'
import {
  CollapsibleControls,
  collapsibleLifecycle,
} from '../shared/controls/CollapsibleControls'
import { StructuredClasses } from '../shared/controls/StructuredClasses'
import '@wfe/components/styles.css'
import { createSignal, onCleanup } from 'solid-js'
import {
  Button,
  Command,
  CommandPalette,
  Toast,
  StatusTile,
  Checkbox,
  Dialog,
  Field,
  HelpText,
  Icon,
  Input,
  Label,
  ValueDisplay,
} from '@wfe/components'
import type { ValueFormat } from '@wfe/components'
import {
  EntryPanel,
  EntryPanelActions,
  DashboardShell,
} from '@wfe/components/layout'
import {
  createTable as createNativeTable,
  ReadOnlyTable,
  TableFilter,
  TableDateFilter,
  TableColumnFilter,
  TableFormatting,
} from '@wfe/components/table'
import type {
  TableColumnFilterValue,
  TableDateRange,
  NativeTableState,
} from '@wfe/components/table'

export const lifecycle = {
  commandSelections: 0,
  commandOpenRequests: 0,
  compound: compoundFieldLifecycle,
  pagination: paginationLifecycle,
  files: fileLifecycle,
  resizable: resizableLifecycle,
  accordion: accordionLifecycle,
  breadcrumb: breadcrumbLifecycle,
  tabs: tabsLifecycle,
  number: numberLifecycle,
  collapsible: collapsibleLifecycle,
  reads: 0,
  cleanups: 0,
  changes: 0,
  filterChanges: 0,
  formatChanges: 0,
  applyChanges: 0,
  rename: (_value: string) => {},
  configure: (_value: {
    name?: string
    checked?: boolean
    open?: boolean
  }) => {},
}

export default function App() {
  const [appliedFilters, setAppliedFilters] = createSignal<
    NativeTableState['columnFilters']
  >([])
  const [formats, setFormats] = createSignal<Record<string, ValueFormat>>({
    active: 'boolean-symbol',
    created: 'date-iso',
    amount: 'number-plain',
  })
  const formatColumns = [
    { id: 'active', label: 'Hydrated boolean format', kind: 'boolean' },
    { id: 'created', label: 'Hydrated date format', kind: 'date' },
    { id: 'amount', label: 'Hydrated number format', kind: 'number' },
  ] as const
  const [textMatch, setTextMatch] = createSignal<
    TableColumnFilterValue | undefined
  >({ operator: 'contains', value: 'Ada' })
  const [statusMatch, setStatusMatch] = createSignal<
    TableColumnFilterValue | undefined
  >({ operator: 'in', values: ['Open'] })
  const [numberMatch, setNumberMatch] = createSignal<
    TableColumnFilterValue | undefined
  >({ operator: 'between', min: 0, max: 12.5 })
  const [booleanFilter, setBooleanFilter] = createSignal('false')
  const [dateFilter, setDateFilter] = createSignal<TableDateRange | undefined>({
    start: '2026-01-01',
    end: '2026-01-02',
  })
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
    manualFiltering: true,
    state: {
      get columnFilters() {
        return appliedFilters()
      },
    },
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
      <div style={{ height: '240px' }}>
        <EntryPanel size="container" id="adopt-entry-panel">
          <Input id="adopt-entry-input" aria-label="Entry draft" />
          <EntryPanelActions id="adopt-entry-actions">
            <Button>
              <Icon glyph={iconSearch} />
              Continue entry
            </Button>
            <Button>Cancel entry</Button>
          </EntryPanelActions>
        </EntryPanel>
      </div>
      <div id="adopt-matching">
        <MatchingCombobox mode="fuzzy" />
      </div>
      <ThemeConsumer />
      <DragBoardControls />
      <GanttControls />
      <CompoundFieldControls />
      <ButtonLinkControls />
      <FileControls />
      <ResizableControls />
      <ContextControls embedded />
      <PagedRecords />
      <AccordionControls />
      <section hidden>
        <StructuredClasses />
      </section>
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
          onApplyFilters={(criteria) => {
            lifecycle.applyChanges++
            setAppliedFilters(criteria.columnFilters)
          }}
          formatting={
            <section id="adopt-value-formats">
              <TableFormatting
                columns={formatColumns}
                value={formats()}
                onValueChange={(id, format) => {
                  lifecycle.formatChanges++
                  setFormats((old) => ({ ...old, [id]: format }))
                }}
              />
              <output id="adopt-formatted-boolean">
                <ValueDisplay value={false} format={formats().active!} />
              </output>
              <output id="adopt-formatted-date">
                <ValueDisplay value="2024-02-29" format={formats().created!} />
              </output>
              <output id="adopt-formatted-number">
                <ValueDisplay value={0} format={formats().amount!} />
              </output>
            </section>
          }
          controls={{
            filtering: true,
            search: false,
            grouping: false,
            columnReordering: false,
          }}
        />
      </section>
      <output id="applied-table-filters">
        {String(appliedFilters()[0]?.value ?? '')}
      </output>
      <section id="adopt-filters">
        <TableFilter
          kind="boolean"
          label="Active filter"
          clearLabel="Clear active filter"
          value={booleanFilter()}
          onValueChange={(value) => {
            lifecycle.filterChanges++
            setBooleanFilter(value)
          }}
        />
        <TableDateFilter
          label="Created range"
          startLabel="Created start"
          endLabel="Created end"
          clearStartLabel="Clear created start"
          clearEndLabel="Clear created end"
          value={dateFilter()}
          onValueChange={(value) => {
            lifecycle.filterChanges++
            setDateFilter(value)
          }}
        />
        <output id="filter-values">
          {booleanFilter()}|{dateFilter()?.start ?? ''}|
          {dateFilter()?.end ?? ''}
        </output>
      </section>
      <section id="adopt-extra-filters">
        <TableColumnFilter
          label="Hydrated text"
          clearLabel="Clear hydrated text"
          config={{ kind: 'text', empty: true }}
          value={textMatch()}
          onValueChange={(value) => {
            lifecycle.filterChanges++
            setTextMatch(value)
          }}
        />
        <TableColumnFilter
          label="Hydrated status"
          clearLabel="Clear hydrated status"
          config={{
            kind: 'multi-select',
            choices: [
              { value: 'Open', label: 'Open' },
              { value: 'Closed', label: 'Closed' },
            ],
          }}
          value={statusMatch()}
          onValueChange={(value) => {
            lifecycle.filterChanges++
            setStatusMatch(value)
          }}
        />
        <TableColumnFilter
          label="Hydrated amount"
          clearLabel="Clear hydrated amount"
          config={{ kind: 'number-range', empty: true }}
          value={numberMatch()}
          onValueChange={(value) => {
            lifecycle.filterChanges++
            setNumberMatch(value)
          }}
        />
        <output id="extra-filter-values">
          {JSON.stringify([textMatch(), statusMatch(), numberMatch()])}
        </output>
      </section>
      <DisplayMessagesReview />
      <CommandReview />
      <BreadcrumbControls />
      <TabsControls />
      <NumberControls />
      <CollapsibleControls />
      <Button
        id="rename"
        variant={name() === 'Ada' ? 'filled' : 'inverted'}
        tone={name() === 'Ada' ? 'accent' : 'neutral'}
        type="button"
        onClick={() => setName('Grace')}
      >
        Rename
      </Button>
      <Dialog id="adopt-dialog" open={open()} onOpenChange={setOpen}>
        <Dialog.Trigger
          as={Button}
          id="adopt-trigger"
          variant={name() === 'Ada' ? 'filled' : 'inverted'}
          tone="accent"
        >
          View record
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content>
            <Dialog.Title>Record preview</Dialog.Title>
            <Dialog.Description>
              The current application value is {name()}.
            </Dialog.Description>
            <Dialog.CloseButton as={Button} variant="ghost" tone="accent">
              Close preview
            </Dialog.CloseButton>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </DashboardShell>
  )
}

function DisplayMessagesReview() {
  const [french, setFrench] = createSignal(false)
  return (
    <section id="display-messages-review">
      <ValueDisplay
        value={true}
        format="boolean-symbol"
        messages={{ yes: french() ? 'Oui' : 'Sí' }}
      />
      <StatusTile
        label="Caller label"
        value={null}
        state="unknown"
        messages={{
          unknown: french() ? 'Inconnu' : 'Desconocido',
          emptyValue: french() ? 'Vide' : 'Vacío',
        }}
      />
      <Toast.Region
        messages={{
          regionLabel: french() ? 'Avis français' : 'Avisos',
          close: french() ? 'Fermer' : 'Cerrar',
          dismissLabel: french() ? 'Fermer avis' : 'Cerrar aviso',
        }}
      >
        <Toast defaultOpen persistent>
          <Toast.Title>Caller notification</Toast.Title>
          <Toast.CloseButton />
        </Toast>
      </Toast.Region>
      <Button onClick={() => setFrench(true)}>
        Translate display messages
      </Button>
    </section>
  )
}

function CommandReview() {
  const [query, setQuery] = createSignal('')
  const [open, setOpen] = createSignal(false)
  const [selection, setSelection] = createSignal('None')
  const items = [
    { id: 'report', label: 'Open hydrated report', group: 'Records' },
    {
      id: 'disabled',
      label: 'Disabled hydrated action',
      group: 'Records',
      disabled: true,
    },
    { id: 'create', label: 'Create hydrated record', group: 'Records' },
  ]
  return (
    <section id="command-hydration-review">
      <Command
        label="Hydrated commands"
        items={items}
        query={query()}
        onQueryChange={setQuery}
        onSelect={(item) => {
          lifecycle.commandSelections++
          setSelection(item.id)
        }}
      />
      <CommandPalette
        title="Hydrated command palette"
        label="Palette commands"
        items={items}
        trigger="Open hydrated commands"
        shortcut
        open={open()}
        onOpenChange={(value) => {
          lifecycle.commandOpenRequests++
          setOpen(value)
        }}
        onSelect={(item) => {
          lifecycle.commandSelections++
          setSelection(item.id)
        }}
      />
      <output id="command-hydration-selection">{selection()}</output>
    </section>
  )
}
