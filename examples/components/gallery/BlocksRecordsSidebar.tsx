import { createMemo, createSignal, For, Show, untrack } from 'solid-js'
import { Button, EmptyState, ValueDisplay } from '@wfe/components'
import type { CalendarRange } from '@wfe/components'
import { InvoiceWorkspace, RecordFilters } from './BlocksRecords'
import {
  blockCellText,
  BlockDate,
  BlockNavigation,
  BlockShell,
  BlockStatus,
  BlockTable,
  createBlockTable,
  viewChoice,
  viewFields,
  viewRange,
} from './blocksParts'
import { choicesFor, inDateRange, recordSamples } from './blocksData'
import type { NativeColumnDef, TableViewValue } from '@wfe/components/table'
import { localTableViews } from '../../shared/controls/tableViewStorage'

export const recordGroups = [
  {
    title: 'Billing',
    icon: 'form',
    sections: ['Invoices', 'Payments', 'Credit notes'],
  },
  { title: 'Inventory', icon: 'grid', sections: ['Products', 'Stock moves'] },
  { title: 'Support', icon: 'people', sections: ['Tickets'] },
] as const

export function BlocksRecordsSidebar() {
  const [section, setSection] = createSignal('Invoices')
  return (
    <BlockShell
      title={section()}
      fillTable
      navigationLabel="Record tables"
      navigation={(controls) => (
        <For each={recordGroups}>
          {(group) => (
            <BlockNavigation
              title={group.title}
              icon={group.icon}
              sections={group.sections}
              value={section()}
              onChange={setSection}
              controls={controls}
            />
          )}
        </For>
      )}
    >
      <RecordsContent section={section()} />
    </BlockShell>
  )
}

export function RecordsContent(props: { section?: string; visible?: boolean }) {
  const sample = () => recordSamples[props.section ?? 'Invoices']
  return (
    <>
      <InvoiceWorkspace
        contentOnly
        visible={props.visible !== false && !sample()}
      />
      <Show when={props.visible !== false && sample()} keyed>
        {(entry) => <SampleWorkspace title={props.section!} sample={entry} />}
      </Show>
    </>
  )
}

function SampleWorkspace(props: {
  title: string
  sample: NonNullable<(typeof recordSamples)[string]>
}) {
  // RecordsContent remounts this workspace when it switches sample tables.
  const { rows, detailLabel, dateLabel, openStatus, amountLabel } = untrack(
    () => props.sample,
  )
  const views = localTableViews(
    untrack(() => `records-${props.title}`),
    {
      initialViewId: 'records-all',
      systemViews: [
        { id: 'records-all', name: 'All records', state: { version: 1 } },
        {
          id: 'records-open',
          name: openStatus + ' records',
          state: { version: 1, extraFilters: { status: openStatus } },
        },
      ],
    },
  )
  const [status, setStatus] = createSignal('all')
  const [customer, setCustomer] = createSignal('all')
  const [range, setRange] = createSignal<CalendarRange>()
  const filtered = createMemo(() =>
    rows.filter(
      (row) =>
        (status() === 'all' || row.status === status()) &&
        (customer() === 'all' || row.customer === customer()) &&
        inDateRange(row.date, range()),
    ),
  )
  const columns: NativeColumnDef<(typeof rows)[number]>[] = [
    { id: 'id', header: 'Record', accessorKey: 'id' },
    { id: 'detail', header: detailLabel, accessorKey: 'detail' },
    { id: 'customer', header: 'Customer', accessorKey: 'customer' },
  ]
  if (amountLabel)
    columns.push({
      id: 'amount',
      header: amountLabel,
      accessorKey: 'amount',
      sortFn: (a, b) => Number(a) - Number(b),
    })
  columns.push(
    { id: 'status', header: 'Status', accessorKey: 'status' },
    { id: 'date', header: dateLabel, accessorKey: 'date' },
  )
  const table = createBlockTable(filtered, columns)
  const statuses = choicesFor([...new Set(rows.map((row) => row.status))])
  const customers = choicesFor([...new Set(rows.map((row) => row.customer))])
  function sampleFilters(value: TableViewValue) {
    const stored = viewFields(value)
    return {
      status:
        viewChoice(
          stored.status,
          statuses.map(({ value }) => value),
        ) ?? 'all',
      customer:
        viewChoice(
          stored.customer,
          customers.map(({ value }) => value),
        ) ?? 'all',
      range: viewRange(stored.range),
    }
  }
  return (
    <BlockTable
      class="blocks-records-workspace"
      table={table}
      title={props.title}
      minWidth="51rem"
      columnWidths={{ customer: '8rem' }}
      columnAlignment={amountLabel ? { amount: 'right' } : undefined}
      controls={{ filtering: false, grouping: true }}
      filterMode="live"
      search={{ label: 'Search ' + props.title.toLowerCase() }}
      views={{
        ...views,
        extraFilters: {
          capture: () => ({
            status: status(),
            customer: customer(),
            range: range(),
          }),
          normalize: sampleFilters,
          restore: (value) => {
            const next = sampleFilters(value)
            setStatus(next.status)
            setCustomer(next.customer)
            setRange(next.range)
          },
        },
      }}
      filtersActive={
        status() !== 'all' || customer() !== 'all' || Boolean(range())
      }
      pageScope={[status(), customer(), range()]}
      onClearFilters={() => {
        setStatus('all')
        setCustomer('all')
        setRange(undefined)
      }}
      emptyResults={({ filtered, clearFilters }) => (
        <EmptyState>
          <div role="status">No records match these filters.</div>
          <Show when={filtered}>
            <Button onClick={clearFilters}>Clear filters</Button>
          </Show>
        </EmptyState>
      )}
      formatValue={(value, column) => {
        if (column.id === 'status')
          return <BlockStatus value={blockCellText(value)} />
        if (column.id === 'date')
          return <BlockDate value={blockCellText(value)} />
        if (column.id === 'amount' && typeof value === 'number')
          return <ValueDisplay format="currency" currency="USD" value={value} />
        return undefined
      }}
      extraFilters={
        <RecordFilters
          statuses={[{ value: 'all', label: 'All statuses' }, ...statuses]}
          status={status()}
          onStatus={setStatus}
          customers={[{ value: 'all', label: 'All customers' }, ...customers]}
          customer={customer()}
          onCustomer={setCustomer}
          dateLabel={dateLabel}
          range={range()}
          onRange={setRange}
        />
      }
    />
  )
}
