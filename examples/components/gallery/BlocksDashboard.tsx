import { createEffect, createMemo, createSignal, For, Show } from 'solid-js'
import {
  Button,
  EmptyState,
  FormActions,
  FormGrid,
  Icon,
  InlineAlert,
  SelectField,
  Sheet,
  StatusTile,
  SummaryList,
  TileRow,
} from '@wfe/components'
import type { CalendarRange } from '@wfe/components'
import { DashboardGrid, DashboardPanel } from '@wfe/components/layout'
import {
  barY,
  Chart,
  ChartLegend,
  defineChart,
  groupBy,
  lineY,
  scaleBand,
  scaleLinear,
  scaleUtc,
  tooltip,
  tooltipPortal,
} from '@wfe/components/chart'
import {
  blockCellText,
  BlockDate,
  BlockDateRange,
  BlockNotice,
  BlockShell,
  BlockStatus,
  BlockTable,
  createBlockTable,
} from './blocksParts'
import {
  applications,
  attention,
  choicesFor,
  deployments,
  inDateRange,
  monthlyUsers,
  operationsUsage,
  tenants,
  usageDays,
} from './blocksData'
import type { AttentionItem, Tenant } from './blocksData'

export const dashboardTableSections = ['Deployments', 'Incidents']

const tenantChoices = choicesFor([
  'All tenants',
  ...tenants.map(({ name }) => name),
])
const applicationChoices = choicesFor([
  'All applications',
  ...applications.map(({ name }) => name),
])
const seriesColors = ['var(--ui-primary)', 'var(--ui-accent)', 'var(--ui-text)']
const lineStyles = ['solid', 'dashed', 'dotted'] as const
const dashPatterns = [undefined, '5 3', '2 3']
const chartTooltip = { use: tooltip, portal: tooltipPortal }
const shortDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})
const compact = new Intl.NumberFormat('en-US', { notation: 'compact' })
const percent = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 2,
})
const signed = new Intl.NumberFormat('en-US', {
  signDisplay: 'exceptZero',
  maximumFractionDigits: 2,
})
const total = <T,>(rows: readonly T[], value: (row: T) => number) =>
  rows.reduce((sum, row) => sum + value(row), 0)

export function BlocksDashboard() {
  return (
    <BlockShell title="Platform dashboard">
      <DashboardContent />
    </BlockShell>
  )
}

export function DashboardContent(props: {
  section?: string
  tenant?: Tenant
  visible?: boolean
}) {
  const defaultTenant = () => props.tenant?.name ?? 'All tenants'
  const [tenantFilter, setTenant] = createSignal<string>()
  const tenant = () => tenantFilter() ?? defaultTenant()
  createEffect(
    () => props.tenant?.name,
    () => {
      setTenant(undefined)
    },
    { defer: true },
  )
  const [application, setApplication] = createSignal('All applications')
  const fullRange: CalendarRange = {
    start: usageDays[0]!,
    end: usageDays.at(-1)!,
  }
  const [range, setRange] = createSignal<CalendarRange | undefined>(fullRange)
  const [revision, setRevision] = createSignal(0)
  const [hidden, setHidden] = createSignal<string[]>([])
  const [review, setReview] = createSignal<AttentionItem>()
  let reviewTrigger: HTMLButtonElement | undefined
  let resolveButton: HTMLButtonElement | undefined
  const [resolved, setResolved] = createSignal<string[]>([])
  const [message, setMessage] = createSignal('')
  const tablePage = () => dashboardTableSections.includes(props.section ?? '')

  const inScope = (item: { tenant: string; application: string }) =>
    (tenant() === 'All tenants' || item.tenant === tenant()) &&
    (application() === 'All applications' || item.application === application())
  const usage = createMemo(() =>
    operationsUsage.filter(
      (item) => inScope(item) && inDateRange(item.day, range()),
    ),
  )
  const refreshedUsage = createMemo(() =>
    usage().map((item) =>
      item.day === usageDays.at(-1) && revision()
        ? {
            ...item,
            requests: item.requests + revision() * 33,
            errors: item.errors + revision(),
          }
        : item,
    ),
  )
  const reportedIssues = createMemo(() =>
    attention.filter(
      (item) => inScope(item) && inDateRange(item.date, range()),
    ),
  )
  const incidents = createMemo(() =>
    reportedIssues().filter((item) => !resolved().includes(item.id)),
  )
  const recent = createMemo(() =>
    deployments.filter(
      (item) => inScope(item) && inDateRange(item.time, range()),
    ),
  )
  const userCounts = createMemo(() =>
    monthlyUsers.filter(
      (item) => inScope(item) && item.application === application(),
    ),
  )
  const activeTenants = () => new Set(usage().map((item) => item.tenant)).size
  const previousActiveTenants = () =>
    new Set(
      usage()
        .filter((item) => item.previousRequests > 0)
        .map((item) => item.tenant),
    ).size
  const errorRate = () =>
    total(refreshedUsage(), (row) => row.errors) /
    (total(refreshedUsage(), (row) => row.requests) || 1)
  const previousRequestCount = () =>
    total(usage(), (row) => row.previousRequests)
  const previousErrorRate = () =>
    total(usage(), (row) => row.previousErrors) / previousRequestCount()
  const series = createMemo(() =>
    applications.flatMap(({ name }, index) =>
      application() === 'All applications' || application() === name
        ? [
            {
              id: name,
              label: name,
              color: seriesColors[index]!,
              lineStyle: lineStyles[index]!,
              dash: dashPatterns[index],
              visible: !hidden().includes(name),
            },
          ]
        : [],
    ),
  )
  const dailyRequests = createMemo(() =>
    groupBy(refreshedUsage(), {
      by: { day: 'day', application: 'application' },
      outputs: { requests: { value: 'requests', reduce: 'sum' } },
    }).map((row) => ({ ...row, date: new Date(row.day + 'T00:00:00Z') })),
  )
  const trend = createMemo(() =>
    defineChart({
      marks: series()
        .filter((item) => item.visible)
        .map((item) =>
          lineY(
            dailyRequests().filter((row) => row.application === item.id),
            {
              id: item.id,
              key: 'day',
              x: 'date',
              y: 'requests',
              stroke: item.color,
              strokeDasharray: item.dash,
              points: true,
            },
          ),
        ),
      scales: {
        x: {
          scale: scaleUtc,
          axis: {
            ticks: { count: 4, format: (date: Date) => shortDate.format(date) },
            tickLabels: { thin: true },
          },
        },
        y: {
          scale: scaleLinear,
          axis: {
            ticks: {
              count: 4,
              format: (value: number) => compact.format(value),
            },
          },
          grid: true,
        },
      },
      tooltip: chartTooltip,
    }),
  )
  const totalsByTenant = createMemo(() =>
    groupBy(refreshedUsage(), {
      by: { tenant: 'tenant' },
      outputs: { requests: { value: 'requests', reduce: 'sum' } },
    }),
  )
  const usageBars = createMemo(() =>
    defineChart({
      marks: [
        barY(totalsByTenant(), {
          id: 'tenant-usage',
          key: 'tenant',
          x: 'tenant',
          y: 'requests',
          fill: 'var(--ui-primary)',
        }),
      ],
      scales: {
        x: { scale: () => scaleBand().padding(0.22) },
        y: {
          scale: scaleLinear,
          axis: {
            ticks: {
              count: 4,
              format: (value: number) => compact.format(value),
            },
          },
          grid: true,
        },
      },
      tooltip: chartTooltip,
    }),
  )

  const attentionTable = createBlockTable(incidents, [
    { id: 'tenant', header: 'Tenant', accessorKey: 'tenant' },
    { id: 'plan', header: 'Plan', accessorKey: 'plan' },
    { id: 'issue', header: 'Issue', accessorKey: 'issue' },
    { id: 'owner', header: 'Owner', accessorKey: 'owner' },
  ])
  const deploymentTable = createBlockTable(recent, [
    { id: 'application', header: 'Application', accessorKey: 'application' },
    { id: 'version', header: 'Version', accessorKey: 'version' },
    { id: 'environment', header: 'Environment', accessorKey: 'environment' },
    { id: 'status', header: 'Status', accessorKey: 'status' },
    { id: 'time', header: 'Time (UTC)', accessorKey: 'time' },
  ])

  function clearDashboardFilters() {
    setTenant(undefined)
    setApplication('All applications')
    setRange(fullRange)
    setHidden([])
  }

  const filtersActive = () =>
    tenant() !== defaultTenant() ||
    application() !== 'All applications' ||
    range()?.start !== fullRange.start ||
    range()?.end !== fullRange.end

  function OperationsTableFilters() {
    return (
      <FormGrid role="group" aria-label="Dashboard filters">
        <DashboardFilters />
      </FormGrid>
    )
  }

  function DashboardFilters() {
    return (
      <>
        <SelectField
          label="Dashboard tenant"
          choices={tenantChoices}
          value={tenant()}
          onValueChange={setTenant}
        />
        <SelectField
          label="Dashboard application"
          choices={applicationChoices}
          value={application()}
          onValueChange={(value) => {
            setApplication(value)
            setHidden([])
          }}
        />
        <BlockDateRange
          label="Dates"
          value={range()}
          onValueChange={setRange}
        />
        <Button
          onClick={() => {
            setRevision((count) => count + 1)
            setMessage(
              `Refreshed operations data at ${new Date().toLocaleTimeString()}.`,
            )
          }}
        >
          <Icon name="refresh" /> Refresh
        </Button>
      </>
    )
  }

  function Metrics() {
    return (
      <TileRow
        columns={{ narrow: 1, medium: 2, wide: 4 }}
        gap="layout"
        role="group"
        aria-label="Key metrics"
      >
        <StatusTile
          label="Active tenants"
          value={activeTenants()}
          state={activeTenants() ? 'ok' : 'unknown'}
          detail={`${signed.format(activeTenants() - previousActiveTenants())} vs prior period`}
        />
        <StatusTile
          label="Monthly active users"
          value={total(userCounts(), (row) => row.current)}
          format="number-grouped"
          state="ok"
          detail={`${signed.format(total(userCounts(), (row) => row.current - row.previous))} vs last month`}
        />
        <StatusTile
          label="Error rate"
          value={usage().length ? percent.format(errorRate()) : '—'}
          state={
            !usage().length ? 'unknown' : errorRate() > 0.004 ? 'warning' : 'ok'
          }
          detail={
            !usage().length
              ? 'No requests in this range'
              : previousRequestCount()
                ? `${signed.format((errorRate() - previousErrorRate()) * 100)} pp vs prior period`
                : 'No prior requests'
          }
        />
        <StatusTile
          label="Open incidents"
          value={incidents().length}
          state={incidents().length ? 'warning' : 'ok'}
          detail={`${signed.format(incidents().length - reportedIssues().length)} since start of review`}
        />
      </TileRow>
    )
  }

  function UsageCharts() {
    return (
      <DashboardGrid minPanelWidth="22rem" gap="layout">
        <DashboardPanel title="Requests per application" titleAs="h3">
          <Show
            when={usage().length && series().some((item) => item.visible)}
            fallback={<EmptyState>No request series to display.</EmptyState>}
          >
            <Chart
              definition={trend()}
              ariaLabel="Daily requests per application"
              height={220}
              initialWidth={280}
            />
          </Show>
          <ChartLegend
            label="Request series"
            items={series()}
            onVisibilityChange={(id, visible) =>
              setHidden((items) =>
                visible ? items.filter((item) => item !== id) : [...items, id],
              )
            }
          />
        </DashboardPanel>
        <DashboardPanel title="Usage by tenant" titleAs="h3">
          <Show
            when={usage().length}
            fallback={<EmptyState>No usage in this date range.</EmptyState>}
          >
            <Chart
              definition={usageBars()}
              ariaLabel="Total requests by tenant"
              height={220}
              initialWidth={280}
            />
          </Show>
        </DashboardPanel>
      </DashboardGrid>
    )
  }

  function IncidentsTable() {
    return (
      <BlockTable
        class="blocks-attention-table"
        table={attentionTable}
        layout={tablePage() ? 'main' : 'panel'}
        minWidth="32rem"
        pageScope={[tenant(), application(), range()]}
        filterMode={tablePage() ? 'live' : 'staged'}
        search={tablePage() ? { label: 'Search incidents' } : undefined}
        filtersActive={filtersActive()}
        controls={tablePage() ? { filtering: false } : undefined}
        extraFilters={tablePage() ? <OperationsTableFilters /> : undefined}
        onClearFilters={tablePage() ? clearDashboardFilters : undefined}
        title="Tenants needing attention"
        messages={{
          noMatches: 'No tenants need attention for these filters.',
          noRecords: 'No tenants need attention for these filters.',
        }}
        renderRowActions={(row) => (
          <Button
            onClick={(event) => {
              reviewTrigger = event.currentTarget
              setReview(row.original)
            }}
          >
            Review
          </Button>
        )}
      />
    )
  }

  function DeploymentsTable() {
    return (
      <BlockTable
        class="blocks-deployments-table"
        table={deploymentTable}
        layout={tablePage() ? 'main' : 'panel'}
        minWidth="32rem"
        pageScope={[tenant(), application(), range()]}
        filterMode={tablePage() ? 'live' : 'staged'}
        search={tablePage() ? { label: 'Search deployments' } : undefined}
        filtersActive={filtersActive()}
        controls={tablePage() ? { filtering: false } : undefined}
        extraFilters={tablePage() ? <OperationsTableFilters /> : undefined}
        onClearFilters={tablePage() ? clearDashboardFilters : undefined}
        columnWidths={{
          application: '7.75rem',
          environment: '7.5rem',
          status: '6.75rem',
          version: '5.75rem',
        }}
        title="Recent deployments"
        messages={{
          noMatches: 'No deployments match these filters.',
          noRecords: 'No deployments match these filters.',
        }}
        formatValue={(value, column) => {
          if (column.id === 'status')
            return <BlockStatus value={blockCellText(value)} />
          if (column.id === 'time')
            return <BlockDate value={blockCellText(value)} time />
          return undefined
        }}
      />
    )
  }

  function Alerts() {
    return (
      <DashboardPanel title="Operational alerts" titleAs="h3" role="group">
        <Show
          when={incidents().length}
          fallback={
            <InlineAlert tone="success">
              No open incidents for these filters.
            </InlineAlert>
          }
        >
          <Show
            when={props.section === 'Alerts'}
            fallback={
              <InlineAlert tone="warning">
                {incidents().length === 1
                  ? '1 incident needs'
                  : `${incidents().length} incidents need`}{' '}
                review.
              </InlineAlert>
            }
          >
            <For each={incidents()}>
              {(incident) => (
                <InlineAlert tone="warning">
                  {incident.tenant} · {incident.application} · {incident.issue}
                </InlineAlert>
              )}
            </For>
          </Show>
        </Show>
        <Show
          when={recent().some(
            ({ environment, status }) =>
              environment === 'Production' && status === 'Rolled back',
          )}
        >
          <InlineAlert tone="warning">
            A production deployment was rolled back. Review recent deployments
            for details.
          </InlineAlert>
        </Show>
      </DashboardPanel>
    )
  }

  return (
    <BlockShell
      contentOnly
      title={props.section ?? 'Platform dashboard'}
      visible={props.visible}
      header={
        <Show when={tablePage()}>
          <BlockNotice message={message()} />
        </Show>
      }
    >
      <Show when={!tablePage()}>
        <DashboardPanel role="group" aria-label="Dashboard filters">
          <FormActions class="blocks-dashboard-filters">
            <DashboardFilters />
          </FormActions>
        </DashboardPanel>
        <BlockNotice message={message()} />
      </Show>
      <Show when={!props.section || props.section === 'Platform overview'}>
        <Metrics />
      </Show>
      <Show when={!props.section || props.section === 'Usage'}>
        <UsageCharts />
      </Show>
      <Show when={!props.section}>
        <DashboardGrid minPanelWidth="32rem" gap="layout">
          <IncidentsTable />
          <DeploymentsTable />
        </DashboardGrid>
      </Show>
      <Show when={props.section === 'Incidents'}>
        <IncidentsTable />
      </Show>
      <Show when={props.section === 'Deployments'}>
        <DeploymentsTable />
      </Show>
      <Show
        when={
          !props.section ||
          props.section === 'Platform overview' ||
          props.section === 'Alerts'
        }
      >
        <Alerts />
      </Show>
      <Sheet
        open={Boolean(review())}
        onOpenChange={(open) => {
          if (!open) setReview(undefined)
        }}
      >
        <Sheet.Portal>
          <Sheet.Overlay />
          <Sheet.Content
            initialFocus={() => resolveButton}
            restoreFocus={() => reviewTrigger}
          >
            <Sheet.Title>Review tenant issue</Sheet.Title>
            <Sheet.Description>
              {review()?.tenant} / {review()?.application}
            </Sheet.Description>
            <Show when={review()}>
              {(item) => (
                <SummaryList
                  items={[
                    { label: 'Issue', value: item().issue },
                    { label: 'Owner', value: item().owner },
                    {
                      label: 'Reported',
                      value: <BlockDate value={item().date} />,
                    },
                  ]}
                />
              )}
            </Show>
            <FormActions>
              <Button
                tone="primary"
                ref={(node) => {
                  resolveButton = node
                }}
                onClick={() => {
                  const item = review()
                  if (!item) return
                  setResolved((ids) => [...ids, item.id])
                  setReview(undefined)
                  setMessage(`Resolved the issue for ${item.tenant}.`)
                }}
              >
                Resolve issue
              </Button>
              <Sheet.CloseButton aria-label="Close">Close</Sheet.CloseButton>
            </FormActions>
          </Sheet.Content>
        </Sheet.Portal>
      </Sheet>
    </BlockShell>
  )
}
