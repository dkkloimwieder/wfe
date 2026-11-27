import { createMemo, createSignal, For, omit, Show, untrack } from 'solid-js'
import type { JSX } from '@solidjs/web'
import {
  Badge,
  DateRangePicker,
  Icon,
  InlineAlert,
  ValueDisplay,
  formatDisplayValue,
} from '@wfe/components'
import type { CalendarRange, IconName } from '@wfe/components'
import {
  DashboardHeaderActions,
  DashboardPanel,
  DashboardShell,
  SidebarContextSwitcher,
  SidebarGroup,
  SidebarLink,
} from '@wfe/components/layout'
import type {
  DashboardNavigation,
  DashboardShellProps,
} from '@wfe/components/layout'
import {
  createTable,
  ReadOnlyTable,
  tableMessages,
} from '@wfe/components/table'
import type { NativeColumnDef, TableViewValue } from '@wfe/components/table'
import { applicationAccessByTenant, sortText, tenants } from './blocksData'
import type { Tenant } from './blocksData'

export function BlockShell(props: {
  title: string
  children?: JSX.Element
  header?: JSX.Element
  navigation?: DashboardShellProps['navigation']
  navigationLabel?: string
  contentOnly?: boolean
  visible?: boolean
  fillTable?: boolean
}) {
  const [collapsed, setCollapsed] = createSignal(false)
  return (
    <Show when={props.visible !== false}>
      <Show
        when={!props.contentOnly}
        fallback={
          <>
            <Show when={props.header !== undefined}>
              <DashboardHeaderActions>{props.header}</DashboardHeaderActions>
            </Show>
            {props.children}
          </>
        }
      >
        <div class="gallery-example-fill">
          <DashboardShell
            class="blocks-page"
            title={props.title}
            titleAs="h2"
            headerActions={props.header}
            mainAs="section"
            mainLabel={props.title}
            scroll={props.fillTable ? 'content' : 'main'}
            mainPadding={props.fillTable ? 'none' : undefined}
            navigation={props.navigation}
            navigationCollapsed={collapsed()}
            onNavigationCollapsedChange={setCollapsed}
            navigationLabel={props.navigationLabel}
            toggleLabel={props.navigationLabel}
            closeLabel="Close sidebar"
          >
            {props.children}
          </DashboardShell>
        </div>
      </Show>
    </Show>
  )
}

export function BlockNotice(props: { message?: string }) {
  return (
    <Show when={props.message}>
      <InlineAlert tone="success" announce="polite">
        {props.message}
      </InlineAlert>
    </Show>
  )
}

export function BlockTenantSwitcher(props: {
  tenant: Tenant
  onChange: (tenant: Tenant) => void
  compact?: boolean
}) {
  return (
    <SidebarContextSwitcher
      label="Change tenant"
      value={props.tenant}
      options={tenants}
      icon={<Icon name="layout" />}
      compact={props.compact}
      onValueChange={(value) => {
        const tenant = tenants.find(({ id }) => id === value.id)
        if (tenant) props.onChange(tenant)
      }}
    />
  )
}

export function BlockStatus(props: { value: string }) {
  const tone = () => {
    const value = props.value
    if (
      [
        'Active',
        'Applied',
        'Enabled',
        'In stock',
        'Installed',
        'Met',
        'Paid',
        'Received',
        'Resolved',
        'Settled',
        'Solved',
        'Succeeded',
        '200 OK',
      ].includes(value)
    )
      return 'success'
    if (
      [
        'Backordered',
        'Due soon',
        'High',
        'Invited',
        'Overdue',
        'On hold',
        'Pending',
        'Pending customer',
        'Rolled back',
        'Waiting',
        'Warning',
      ].includes(value)
    )
      return 'warning'
    if (
      ['Breached', 'Error', 'Failed', 'Urgent', '503 Unavailable'].includes(
        value,
      )
    )
      return 'error'
    return 'neutral'
  }
  return <Badge tone={tone()}>{props.value}</Badge>
}

export function BlockDate(props: {
  value: string
  time?: boolean
  empty?: string
}) {
  return (
    <ValueDisplay
      value={props.value}
      format={props.time ? 'datetime' : 'date-short'}
      dateFormat="MM/dd/yyyy"
      timeFormat="HH:mm"
      messages={{ emptyValue: props.empty ?? '—' }}
    />
  )
}

export function BlockDateRange(props: {
  label: string
  value?: CalendarRange
  onValueChange: (value: CalendarRange | undefined) => void
}) {
  return (
    <DateRangePicker
      {...props}
      numberOfMonths={1}
      initialMonth="2026-11-01"
      formatRange={({ start, end }, locale) => {
        const format = (value: string) =>
          formatDisplayValue(value, 'date-short', locale)
        if (!end) return `${format(start)}…`
        return start === end
          ? format(start)
          : `${format(start)} – ${format(end)}`
      }}
    />
  )
}

export function BlockNavigation(props: {
  title: string
  sections: readonly string[]
  value?: string
  onChange: (value: string) => void
  controls: DashboardNavigation
  defaultOpen?: boolean
  icon?: IconName
}) {
  const [open, setOpen] = createSignal(props.defaultOpen ?? true)
  return (
    <SidebarGroup
      label={props.title}
      icon={<Icon name={props.icon ?? 'navigation'} />}
      active={props.value !== undefined && props.sections.includes(props.value)}
      compact={props.controls.compact()}
      open={open()}
      onOpenChange={setOpen}
      onExpand={() => setOpen(true)}
    >
      {(close) => (
        <For each={props.sections}>
          {(section) => {
            let link: HTMLAnchorElement | undefined
            const shell = () => link?.closest('.blocks-page')
            return (
              <SidebarLink
                ref={(node) => {
                  link = node
                }}
                href={`#${(props.title + '-' + section).toLowerCase().replace(/\W+/g, '-')}`}
                active={section === props.value}
                onSelect={() => props.onChange(section)}
                closeGroup={close}
                closeNavigation={props.controls.close}
                scrollTarget={() =>
                  shell()?.querySelector<HTMLElement>(
                    ':scope > .ui-dashboard-main',
                  )
                }
                focusTarget={() =>
                  shell()?.querySelector<HTMLElement>(
                    ':scope > .ui-dashboard-header > .ui-dashboard-title',
                  )
                }
              >
                {section}
              </SidebarLink>
            )
          }}
        </For>
      )}
    </SidebarGroup>
  )
}

export function createApplicationAccess(initial = applicationAccessByTenant) {
  const [installed, setInstalled] = createSignal(initial)
  return {
    forTenant: (id: string) => installed()[id] ?? [],
    update(id: string, change: (names: string[]) => string[]) {
      setInstalled((all) => ({ ...all, [id]: change(all[id] ?? []) }))
    },
  }
}

export function blockCellText(value: unknown) {
  if (typeof value === 'string') return value
  return typeof value === 'number' || typeof value === 'boolean'
    ? String(value)
    : ''
}

export function createBlockTable<T extends { id: string }>(
  rows: () => readonly T[],
  columns: readonly NativeColumnDef<T>[],
  options?: Pick<
    Parameters<typeof createTable<T>>[0],
    'globalFilterScope' | 'initialState'
  >,
) {
  const records = createMemo(() => {
    const list = rows()
    return {
      ids: list.map(({ id }) => id),
      byId: new Map(list.map((row) => [row.id, row])),
    }
  })
  return createTable({
    ...options,
    source: {
      ids: () => records().ids,
      get: (id) => records().byId.get(id),
    },
    columns: columns.map((column) =>
      column.accessorKey || column.accessorFn
        ? {
            sortFn: sortText,
            filterFn: (value, filter) =>
              blockCellText(value)
                .toLowerCase()
                .includes(blockCellText(filter).toLowerCase()),
            ...column,
          }
        : column,
    ),
  })
}

type TableProps<T> = Parameters<typeof ReadOnlyTable<T, unknown>>[0]

const defaultPageSizes = [10, 25, 50]

export function BlockTable<T>(
  props: Omit<TableProps<T>, 'title'> & {
    title: string
    layout?: 'main' | 'panel'
    pageSizes?: readonly number[] | false
    /** Changing application filters sends the current workspace back to page one. */
    pageScope?: readonly unknown[]
  },
) {
  // The app's initial alignment seeds the local column controls.
  const [alignment, setAlignment] = createSignal(
    untrack(() => props.columnAlignment ?? {}),
  )
  const hasPagination = () =>
    props.footerEnabled !== false &&
    (props.pagination ||
      (!props.renderBody &&
        (props.clientPagination || props.pageSizes !== false)))
  const workspace = () => (
    <ReadOnlyTable
      {...omit(props, 'class', 'layout', 'pageSizes', 'pageScope')}
      titleVisible={props.layout !== 'panel'}
      class={[
        'blocks-table',
        props.layout === 'panel' ? 'blocks-table-short' : 'blocks-table-main',
        props.class,
      ]}
      selection
      fill={props.layout !== 'panel'}
      toolbarLayout="wrap"
      minWidth={props.minWidth ?? '42rem'}
      cellWrap={props.cellWrap ?? 'normal'}
      defaultControlsCollapsed
      controls={{ grouping: false, ...props.controls }}
      sortable={(column) => Boolean(column.columnDef?.sortFn)}
      filterable={(column) => Boolean(column.columnDef?.filterFn)}
      refreshEnabled={
        props.refreshEnabled ??
        (props.filterMode !== 'live' &&
          (props.controls?.filtering !== false ||
            props.controls.search !== false))
      }
      messages={{
        ...props.messages,
        pageRecordCount: (count) =>
          (props.messages?.pageRecordCount ?? tableMessages.pageRecordCount)(
            count,
            props.table.getSourceIds().length,
          ),
        pageStatus: (page, pages) =>
          props.table.getRowIds().length
            ? (props.messages?.pageStatus ?? tableMessages.pageStatus)(
                page,
                pages,
              )
            : 'No pages',
      }}
      columnAlignment={alignment()}
      onColumnAlignmentChange={(id, value) =>
        setAlignment((current) => ({ ...current, [id]: value }))
      }
      clientPagination={
        props.clientPagination ??
        (props.pageSizes === false
          ? undefined
          : {
              pageSizes: props.pageSizes ?? defaultPageSizes,
              resetKey: props.pageScope,
            })
      }
    />
  )
  return (
    <Show when={props.layout === 'panel'} fallback={workspace()}>
      <DashboardPanel
        class="blocks-workspace-panel"
        data-block-pagination={hasPagination() ? '' : undefined}
        role="group"
        title={props.title}
        titleAs="h3"
      >
        {workspace()}
      </DashboardPanel>
    </Show>
  )
}

type ViewFields = { readonly [key: string]: TableViewValue | undefined }

export function viewFields(value: TableViewValue): ViewFields {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as ViewFields)
    : {}
}

export function viewChoice(
  value: TableViewValue | undefined,
  choices: readonly string[],
) {
  return typeof value === 'string' && choices.includes(value)
    ? value
    : undefined
}

function dateOnly(value: TableViewValue | undefined) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value.startsWith('0000')
  )
    return undefined
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
    ? value
    : undefined
}

export function viewRange(
  value: TableViewValue | undefined,
): CalendarRange | undefined {
  const range = viewFields(value ?? null)
  const start = dateOnly(range.start)
  const end = dateOnly(range.end)
  return start
    ? { start, end: end && end >= start ? end : undefined }
    : undefined
}
