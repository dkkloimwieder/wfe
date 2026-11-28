import { createMemo, createSignal, Show } from 'solid-js'
import {
  Badge,
  Button,
  ButtonLink,
  EmptyState,
  Field,
  Label,
  SelectField,
  Sheet,
  SummaryList,
} from '@wfe/components'
import {
  choicesFor,
  memberAnnouncements,
  memberTasks,
  notificationTypes,
  tenants,
  userNotifications,
} from './blocksData'
import {
  blockCellText,
  BlockDate,
  BlockShell,
  BlockTable,
  blockRowOpener,
  createBlockTable,
} from './blocksParts'
import { userPageHref } from './blocksUserData'
import type { UserPageProps } from './blocksUserData'
import { useUserViews } from './BlocksUserState'

type Notification = ReturnType<typeof userNotifications>[number]
const typeChoices = choicesFor(['All types', ...notificationTypes])
const readKey = (tenantId: string) =>
  `wfe-gallery-read-notifications-${tenantId}`

function readNotifications(): Record<string, Set<string>> {
  try {
    return Object.fromEntries(
      tenants.map(({ id }) => [
        id,
        new Set(
          window.sessionStorage
            .getItem(readKey(id))
            ?.split(',')
            .filter(Boolean),
        ),
      ]),
    )
  } catch {
    return {}
  }
}

export function BlocksUserNotifications(
  props: UserPageProps & {
    onOpenTicket?: (id: string) => void
    onOpenSecurity?: () => void
  } = {},
) {
  const tenant = () => props.tenant ?? tenants[0]
  const seed = createMemo(() => userNotifications(tenant()))
  const [readIds, setReadIds] = createSignal(readNotifications())
  const [kind, setKind] = createSignal('All types')
  const [open, setOpen] = createSignal<Notification>()
  let notificationTrigger: ReturnType<typeof blockRowOpener> | undefined
  const views = useUserViews()
  const viewOptions = {
    storage: views.storage.Notifications,
    extraFilters: {
      capture: kind,
      restore(value: unknown) {
        if (
          typeof value === 'string' &&
          typeChoices.some((choice) => choice.value === value)
        )
          setKind(value)
      },
    },
  }
  const rows = createMemo(() => {
    const read = readIds()[tenant().id]
    return seed().map((row) =>
      read?.has(row.id) ? { ...row, read: true } : row,
    )
  })
  const unread = createMemo(() => rows().filter(({ read }) => !read).length)
  const filtered = createMemo(() =>
    rows().filter((row) => kind() === 'All types' || row.type === kind()),
  )
  const table = createBlockTable(filtered, [
    {
      id: 'title',
      header: 'Notification',
      accessorKey: 'title',
      enableHiding: false,
    },
    { id: 'type', header: 'Type', accessorKey: 'type' },
    {
      id: 'status',
      header: 'Status',
      accessorFn: (row) => (row.read ? 'Read' : 'Unread'),
    },
    { id: 'time', header: 'Received (UTC)', accessorKey: 'time' },
  ])

  function markRead(ids: readonly string[]) {
    const key = tenant().id
    const next = new Set([...(readIds()[key] ?? []), ...ids])
    setReadIds((current) => ({ ...current, [key]: next }))
    try {
      window.sessionStorage.setItem(readKey(key), [...next].join(','))
    } catch {
      // Keep the in-memory status when the browser blocks storage.
    }
  }

  function activate(event: MouseEvent, row: Notification) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    markRead([row.id])
    if (row.type === 'Support') {
      if (props.onOpenTicket) {
        event.preventDefault()
        props.onOpenTicket(row.target)
      }
      return
    }
    if (row.type === 'Security') {
      if (props.onOpenSecurity) {
        event.preventDefault()
        props.onOpenSecurity()
      }
      return
    }
    if (event.currentTarget instanceof HTMLButtonElement)
      notificationTrigger = blockRowOpener(event.currentTarget)
    setOpen(row)
  }

  return (
    <BlockShell
      title="Notifications inbox"
      fillTable
      contentOnly={props.contentOnly}
      visible={props.visible}
      header={
        <Button
          tone="primary"
          disabled={!unread()}
          onClick={() => markRead(rows().map(({ id }) => id))}
        >
          Mark all as read
        </Button>
      }
    >
      <BlockTable
        title="Notifications inbox"
        table={table}
        views={viewOptions}
        filterMode="live"
        filtersActive={kind() !== 'All types'}
        onClearFilters={() => setKind('All types')}
        pageScope={[kind()]}
        columnWidths={{ type: '10rem', status: '8rem', time: '11rem' }}
        controls={{ filtering: false }}
        search={{ label: 'Search notifications' }}
        extraFilters={
          <Field>
            <Label>Notification type</Label>
            <SelectField
              label="Notification type"
              choices={typeChoices}
              value={kind()}
              onValueChange={setKind}
            />
          </Field>
        }
        emptyResults={() => (
          <EmptyState>No notifications match your filters.</EmptyState>
        )}
        renderCell={(cell) => {
          const value = blockCellText(cell.getValue())
          if (cell.column.id === 'status')
            return (
              <Badge tone={value === 'Unread' ? 'warning' : 'neutral'}>
                {value}
              </Badge>
            )
          if (cell.column.id === 'time') return <BlockDate value={value} time />
          if (cell.column.id !== 'title') return value
          const row = cell.row.original
          if (!row) return value
          return (
            <Show
              when={row.type === 'Support' || row.type === 'Security'}
              fallback={
                <Button
                  variant="ghost"
                  data-block-row-opener=""
                  onClick={(event) => activate(event, row)}
                >
                  {value}
                </Button>
              }
            >
              <ButtonLink
                variant="ghost"
                href={
                  row.type === 'Support'
                    ? userPageHref('support', row.target)
                    : userPageHref('account', 'security')
                }
                onClick={(event) => activate(event, row)}
              >
                {value}
              </ButtonLink>
            </Show>
          )
        }}
      />
      <Sheet
        open={Boolean(open())}
        onOpenChange={(next) => {
          if (!next) setOpen(undefined)
        }}
      >
        <Sheet.Portal>
          <Sheet.Overlay />
          <Show when={open()} keyed>
            {(row) => {
              const task = memberTasks.find(({ id }) => id === row.target)
              const announcement = memberAnnouncements.find(
                ({ id }) => id === row.target,
              )
              return (
                <Sheet.Content
                  size="wide"
                  restoreFocus={() => notificationTrigger?.()}
                >
                  <Sheet.Title>{row.title}</Sheet.Title>
                  <Sheet.Description>{row.type}</Sheet.Description>
                  <Show when={task}>
                    {(entry) => (
                      <SummaryList
                        items={[
                          { label: 'Application', value: entry().application },
                          {
                            label: 'Due',
                            value: <BlockDate value={entry().due} />,
                          },
                        ]}
                      />
                    )}
                  </Show>
                  <Show when={announcement}>
                    {(entry) => (
                      <SummaryList
                        items={[
                          { label: 'Posted by', value: entry().author },
                          { label: 'Announcement', value: entry().text },
                        ]}
                      />
                    )}
                  </Show>
                  <Sheet.CloseButton aria-label="Close">
                    Close
                  </Sheet.CloseButton>
                </Sheet.Content>
              )
            }}
          </Show>
        </Sheet.Portal>
      </Sheet>
    </BlockShell>
  )
}
