import { createEffect, createMemo, createSignal, For, Show } from 'solid-js'
import { Button, EmptyState, Meter, SelectField, Sheet } from '@wfe/components'
import type { CalendarRange } from '@wfe/components'
import { DashboardGrid, DashboardPanel } from '@wfe/components/layout'
import type { NativeColumnDef, TableViewValue } from '@wfe/components/table'
import { localTableViews } from '../../shared/controls/tableViewStorage'
import {
  blockCellText,
  BlockDate,
  BlockDateRange,
  BlockNavigation,
  BlockShell,
  BlockStatus,
  BlockTable,
  createBlockTable,
  viewChoice,
  viewFields,
  viewRange,
} from './blocksParts'
import {
  choicesFor,
  inDateRange,
  initialTickets,
  tenants,
  ticketAgent,
  ticketAssignees,
  ticketChannels,
  ticketIsResolved,
  ticketPriorities,
  ticketSlaState,
  ticketSnapshot,
  ticketStatuses,
} from './blocksData'
import type { Ticket } from './blocksData'
import { TicketActions, TicketSheet } from './BlocksIssueTrackerDetail'
import type {
  TicketActivityChange,
  TicketPatch,
} from './BlocksIssueTrackerDetail'

export const supportSections = ['Tickets', 'Feedback'] as const
const queueViews = localTableViews('ticket-queue', {
  initialViewId: 'queue-all',
  systemViews: [
    { id: 'queue-all', name: 'All', state: { version: 1 } },
    {
      id: 'queue-my-open',
      name: 'My open',
      state: {
        version: 1,
        extraFilters: { filters: { status: 'Open', assignee: ticketAgent } },
      },
    },
    {
      id: 'queue-unassigned',
      name: 'Unassigned',
      state: {
        version: 1,
        extraFilters: {
          scope: 'Active tickets',
          filters: { assignee: 'Unassigned' },
        },
      },
    },
    {
      id: 'queue-risk',
      name: 'SLA at risk',
      state: { version: 1, extraFilters: { scope: 'SLA at risk' } },
    },
    {
      id: 'queue-waiting',
      name: 'Waiting on customer',
      state: {
        version: 1,
        extraFilters: { filters: { status: 'Pending customer' } },
      },
    },
  ],
})
const queueScopes = ['All tickets', 'Active tickets', 'SLA at risk'] as const
const queueFilters = [
  {
    key: 'status',
    label: 'Status',
    choices: ['All statuses', ...ticketStatuses],
  },
  {
    key: 'priority',
    label: 'Priority',
    choices: ['All priorities', ...ticketPriorities],
  },
  {
    key: 'channel',
    label: 'Channel',
    choices: ['All channels', ...ticketChannels],
  },
  {
    key: 'assignee',
    label: 'Assignee',
    choices: ['All assignees', ...ticketAssignees],
  },
  {
    key: 'tenant',
    label: 'Tenant',
    choices: ['All tenants', ...tenants.map(({ name }) => name)],
  },
] as const
type QueueFilter = (typeof queueFilters)[number]['key']

const ticketColumns: readonly NativeColumnDef<Ticket>[] = [
  { id: 'id', header: 'ID', accessorKey: 'id', enableHiding: false },
  { id: 'subject', header: 'Subject', accessorKey: 'subject' },
  {
    id: 'customer',
    header: 'Customer',
    accessorFn: ({ customer, contact }) => `${customer} / ${contact}`,
  },
  { id: 'tenant', header: 'Tenant', accessorKey: 'tenant' },
  { id: 'status', header: 'Status', accessorKey: 'status' },
  { id: 'priority', header: 'Priority', accessorKey: 'priority' },
  { id: 'slaDue', header: 'SLA due', accessorKey: 'slaDue' },
  { id: 'channel', header: 'Channel', accessorKey: 'channel' },
  { id: 'assignee', header: 'Assignee', accessorKey: 'assignee' },
  { id: 'lastResponse', header: 'Last response', accessorKey: 'lastResponse' },
  { id: 'updated', header: 'Updated', accessorKey: 'updated' },
]
const ticketColumnWidths = {
  id: '6rem',
  subject: '13rem',
  customer: '9rem',
  tenant: '7.5rem',
  status: '9.5rem',
  priority: '7.5rem',
  slaDue: '8.5rem',
  channel: '7.5rem',
  assignee: '8rem',
  lastResponse: '10rem',
  updated: '8.5rem',
}

function queueViewFilters(value: TableViewValue) {
  const stored = viewFields(value)
  const filters = viewFields(stored.filters ?? null)
  return {
    scope: viewChoice(stored.scope, queueScopes) ?? queueScopes[0],
    filters: Object.fromEntries(
      queueFilters.flatMap(({ key, choices }) => {
        const choice = viewChoice(filters[key], choices.slice(1))
        return choice ? [[key, choice]] : []
      }),
    ),
    range: viewRange(stored.range),
  }
}

export function BlocksIssueTracker(props: {
  contentOnly?: boolean
  visible?: boolean
  section?: string
}) {
  const [section, setSection] = createSignal<string>(supportSections[0])
  const activeSection = () => props.section ?? section()
  const feedback = () => activeSection() === 'Feedback'
  const [data, setData] = createSignal({
    tickets: initialTickets,
    activity: new Map<string, TicketActivityChange>(),
    now: ticketSnapshot,
  })
  const [scope, setScope] = createSignal<string>(queueScopes[0])
  const [filters, setFilters] = createSignal<
    Partial<Record<QueueFilter, string>>
  >({})
  const [range, setRange] = createSignal<CalendarRange>()
  const [openId, setOpenId] = createSignal<string>()
  const [detailOpen, setDetailOpen] = createSignal(false)
  const started = Date.now()
  const sampleTime = Date.parse(ticketSnapshot)
  let ticketTrigger: HTMLButtonElement | undefined
  let ticketTable: HTMLElement | null | undefined

  const filtered = createMemo(() =>
    data().tickets.filter(
      (ticket) =>
        (scope() === 'All tickets' ||
          (!ticketIsResolved(ticket.status) &&
            (scope() === 'Active tickets' ||
              ticketSlaState(ticket, data().now) !== 'On track'))) &&
        queueFilters.every(
          ({ key }) => !filters()[key] || filters()[key] === ticket[key],
        ) &&
        inDateRange(ticket.updated, range()),
    ),
  )
  const table = createBlockTable(filtered, ticketColumns, {
    globalFilterScope: 'all',
  })
  const selectedIds = () =>
    table.getRowIds().filter((id) => table.state.rowSelection[id])
  const clearSelection = () => table.setRowSelection({})
  createEffect(() => table.state.globalFilter, clearSelection, { defer: true })

  function clearFilters() {
    setScope(queueScopes[0])
    setFilters({})
    setRange(undefined)
    clearSelection()
  }

  function updateTickets(
    ids: readonly string[],
    patch: TicketPatch,
    makeActivity?: (time: string) => TicketActivityChange,
  ) {
    const selected = new Set(ids)
    const time = new Date(sampleTime + Date.now() - started).toISOString()
    const addition = makeActivity?.(time)
    setData((current) => {
      const activity = new Map(current.activity)
      const tickets = current.tickets.map((ticket) => {
        if (!selected.has(ticket.id)) return ticket
        const history = (['status', 'priority', 'assignee'] as const).flatMap(
          (key) => {
            const value = patch[key]
            return value && value !== ticket[key]
              ? [
                  {
                    author: ticketAgent,
                    time,
                    text:
                      key === 'assignee'
                        ? `Assigned to ${value}.`
                        : `Changed ${key} to ${value}.`,
                  },
                ]
              : []
          },
        )
        if (!history.length && !addition) return ticket
        const previous = activity.get(ticket.id)
        activity.set(ticket.id, {
          messages: [
            ...(previous?.messages ?? []),
            ...(addition?.messages ?? []),
          ],
          notes: [...(previous?.notes ?? []), ...(addition?.notes ?? [])],
          attachments: [
            ...(previous?.attachments ?? []),
            ...(addition?.attachments ?? []),
          ],
          history: [...(previous?.history ?? []), ...history],
        })
        const status = patch.status ?? ticket.status
        const replied = Boolean(addition?.messages?.length)
        return {
          ...ticket,
          ...patch,
          resolvedAt: ticketIsResolved(status)
            ? (ticket.resolvedAt ?? time)
            : undefined,
          firstResponse: ticket.firstResponse || (replied ? time : ''),
          lastResponse: replied ? time : ticket.lastResponse,
          updated: time,
        }
      })
      return { tickets, activity, now: time }
    })
  }

  const ticketButton = (id: string) => (
    <Button
      variant="ghost"
      aria-label={`Open ${id}`}
      onClick={(event) => {
        ticketTrigger = event.currentTarget
        ticketTable = ticketTrigger.closest('.ui-table')
        setOpenId(id)
        setDetailOpen(true)
      }}
    >
      {id}
    </Button>
  )

  const resolved = createMemo(() =>
    data().tickets.filter(({ status }) => ticketIsResolved(status)),
  )
  const ratings = createMemo(() =>
    data()
      .tickets.flatMap((ticket) =>
        ticket.feedback
          ? [
              {
                id: ticket.id,
                customer: ticket.customer,
                ...ticket.feedback,
              },
            ]
          : [],
      )
      .sort((a, b) => b.date.localeCompare(a.date)),
  )
  const feedbackTable = createBlockTable(ratings, [
    { id: 'id', header: 'Ticket', accessorKey: 'id', enableHiding: false },
    { id: 'customer', header: 'Customer', accessorKey: 'customer' },
    {
      id: 'rating',
      header: 'Rating',
      accessorKey: 'rating',
      sortFn: (a, b) => Number(a) - Number(b),
    },
    { id: 'comment', header: 'Comment', accessorKey: 'comment' },
    { id: 'date', header: 'Date', accessorKey: 'date' },
  ])
  const percent = (count: number) =>
    Math.round((count / (resolved().length || 1)) * 100)

  return (
    <BlockShell
      title={activeSection()}
      fillTable={!feedback()}
      contentOnly={props.contentOnly}
      visible={props.visible}
      navigationLabel="Support navigation"
      navigation={(controls) => (
        <BlockNavigation
          title="Support"
          icon="people"
          sections={supportSections}
          value={activeSection()}
          onChange={setSection}
          controls={controls}
        />
      )}
    >
      <Show when={!feedback()}>
        <BlockTable
          table={table}
          title="Ticket queue"
          minWidth="94rem"
          columnWidths={ticketColumnWidths}
          controls={{ filtering: false, grouping: true }}
          search={{ label: 'Search tickets' }}
          filterMode="live"
          views={{
            ...queueViews,
            extraFilters: {
              capture: () => ({
                scope: scope(),
                filters: filters(),
                range: range(),
              }),
              normalize: queueViewFilters,
              restore: (value) => {
                const next = queueViewFilters(value)
                setScope(next.scope)
                setFilters(next.filters)
                setRange(next.range)
                clearSelection()
              },
            },
          }}
          pageScope={[scope(), filters(), range()]}
          filtersActive={
            scope() !== queueScopes[0] ||
            Object.values(filters()).some(Boolean) ||
            Boolean(range())
          }
          onClearFilters={clearFilters}
          extraFilters={
            <>
              <SelectField
                label="Queue scope"
                value={scope()}
                choices={choicesFor(queueScopes)}
                onValueChange={(value) => {
                  setScope(value)
                  clearSelection()
                }}
              />
              <For each={queueFilters}>
                {({ key, label, choices }) => (
                  <SelectField
                    label={label}
                    value={filters()[key] ?? choices[0]}
                    choices={choicesFor(choices)}
                    onValueChange={(value) => {
                      setFilters((current) => ({
                        ...current,
                        [key]: value === choices[0] ? undefined : value,
                      }))
                      clearSelection()
                    }}
                  />
                )}
              </For>
              <BlockDateRange
                label="Updated"
                value={range()}
                onValueChange={(next) => {
                  setRange(next)
                  clearSelection()
                }}
              />
            </>
          }
          emptyResults={({ filtered, clearFilters }) => (
            <EmptyState>
              <div role="status">No tickets match these filters.</div>
              <Show when={filtered}>
                <Button onClick={clearFilters}>Clear filters</Button>
              </Show>
            </EmptyState>
          )}
          rowSelection={{
            selected: table.state.rowSelection,
            onChange: (next) => table.setRowSelection(next),
            selectAll: 'page',
          }}
          bulkActions={
            <TicketActions
              label={`Bulk actions (${selectedIds().length})`}
              onChange={(patch) => {
                updateTickets(selectedIds(), patch)
                clearSelection()
              }}
              clearSelection={clearSelection}
            />
          }
          messages={{
            pageRecordCount: (count) =>
              `${count} of ${data().tickets.length} tickets`,
            selectPageRows: 'Select tickets on this page',
            selectRow: (id) => `Select ${id}`,
          }}
          renderCell={(cell) => {
            const value = () => blockCellText(cell.getValue())
            const ticket = () => cell.row.original
            switch (cell.column.id) {
              case 'id':
                return ticketButton(cell.row.id)
              case 'customer':
                return (
                  <>
                    {ticket()?.customer}
                    <br />
                    {ticket()?.contact}
                  </>
                )
              case 'status':
              case 'priority':
                return <BlockStatus value={value()} />
              case 'slaDue':
                return (
                  <Show when={ticket()}>
                    {(item) => (
                      <>
                        <BlockDate value={value()} time />
                        <br />
                        <BlockStatus
                          value={ticketSlaState(item(), data().now)}
                        />
                      </>
                    )}
                  </Show>
                )
              case 'lastResponse':
              case 'updated':
                return <BlockDate value={value()} time />
              default:
                return <>{value()}</>
            }
          }}
        />
      </Show>
      <Show when={feedback()}>
        <DashboardPanel title="Customer satisfaction" titleAs="h3">
          <DashboardGrid minPanelWidth="11rem">
            <Meter
              label="Average rating"
              value={Number(
                (
                  ratings().reduce((sum, row) => sum + row.rating, 0) /
                  (ratings().length || 1)
                ).toFixed(1),
              )}
              max={5}
            />
            <Meter
              label="Response rate"
              value={percent(
                resolved().filter(({ feedback }) => feedback).length,
              )}
              max={100}
              messages={{ valueOfMaximum: (value) => `${value}%` }}
            />
            <Meter
              label="Solved in SLA"
              value={percent(
                resolved().filter(
                  (ticket) => ticketSlaState(ticket, data().now) === 'Met',
                ).length,
              )}
              max={100}
              messages={{ valueOfMaximum: (value) => `${value}%` }}
            />
          </DashboardGrid>
        </DashboardPanel>
        <BlockTable
          table={feedbackTable}
          title="Ticket feedback"
          layout="panel"
          minWidth="40rem"
          columnWidths={{
            id: '6rem',
            customer: '10rem',
            rating: '5rem',
            date: '7rem',
          }}
          renderCell={(cell) => {
            const value = blockCellText(cell.getValue())
            if (cell.column.id === 'id') return ticketButton(cell.row.id)
            if (cell.column.id === 'date') return <BlockDate value={value} />
            if (cell.column.id === 'rating') return `${value} / 5`
            return value
          }}
        />
      </Show>
      <Sheet open={detailOpen()} onOpenChange={setDetailOpen}>
        <Sheet.Portal>
          <Sheet.Overlay />
          <Show when={openId()} keyed>
            {(id) => (
              <TicketSheet
                original={initialTickets.find((ticket) => ticket.id === id)!}
                ticket={data().tickets.find((ticket) => ticket.id === id)!}
                changes={data().activity.get(id)}
                now={data().now}
                onChange={(patch, activity) =>
                  updateTickets([id], patch, activity)
                }
                restoreFocus={() =>
                  ticketTrigger?.isConnected
                    ? ticketTrigger
                    : (ticketTable ?? undefined)
                }
              />
            )}
          </Show>
        </Sheet.Portal>
      </Sheet>
    </BlockShell>
  )
}
