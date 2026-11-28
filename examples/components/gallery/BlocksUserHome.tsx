import { createMemo, createSignal, Show } from 'solid-js'
import { Sheet, SummaryList } from '@wfe/components'
import { ActivityList, DashboardPanel } from '@wfe/components/layout'
import type { TableRowActionContext } from '@wfe/components/table'
import {
  applicationAccessByTenant,
  applications,
  memberActivity,
  memberAnnouncements,
  memberAppAccess,
  memberTasks,
  tenants,
} from './blocksData'
import {
  blockCellText,
  BlockDate,
  BlockNavigation,
  BlockShell,
  BlockTable,
  createBlockTable,
} from './blocksParts'
import { displayTime, homeSections, userPageHref } from './blocksUserData'
import type { UserPageProps } from './blocksUserData'

const [
  applicationsSection,
  activitySection,
  announcementsSection,
  tasksSection,
] = homeSections
const applicationRows = applications.map((app) => ({ ...app, id: app.name }))

export function BlocksUserHome(
  props: UserPageProps & {
    section?: string
    availableApps?: readonly string[]
    onSupport?: () => void
  } = {},
) {
  const tenant = () => props.tenant ?? tenants[0]
  const [selected, setSelected] = createSignal<string>(applicationsSection)
  const section = () => props.section ?? selected()
  const [openApp, setOpenApp] = createSignal<(typeof applicationRows)[number]>()
  let restoreFocus: TableRowActionContext['getMenuTrigger'] | undefined

  const apps = createMemo(() => {
    const id = tenant().id
    const installed = props.availableApps ?? applicationAccessByTenant[id] ?? []
    const assigned = memberAppAccess[id] ?? []
    return applicationRows.filter(
      ({ name }) => installed.includes(name) && assigned.includes(name),
    )
  })
  const activity = createMemo(() =>
    memberActivity
      .filter(({ actor }) => apps().some(({ name }) => name === actor))
      .map((entry) => ({ ...entry, id: entry.time })),
  )
  const tasks = createMemo(() =>
    memberTasks.filter(({ application }) =>
      apps().some(({ name }) => name === application),
    ),
  )
  const appsTable = createBlockTable(apps, [
    { id: 'name', header: 'Application', accessorKey: 'name' },
    { id: 'description', header: 'Description', accessorKey: 'description' },
  ])
  const activityTable = createBlockTable(activity, [
    { id: 'text', header: 'Activity', accessorKey: 'text' },
    { id: 'actor', header: 'Application', accessorKey: 'actor' },
    { id: 'time', header: 'Time (UTC)', accessorKey: 'time' },
  ])
  const announcementsTable = createBlockTable(
    () => memberAnnouncements,
    [
      { id: 'title', header: 'Announcement', accessorKey: 'title' },
      { id: 'text', header: 'Message', accessorKey: 'text' },
      { id: 'author', header: 'Posted by', accessorKey: 'author' },
      { id: 'time', header: 'Time (UTC)', accessorKey: 'time' },
    ],
  )
  const tasksTable = createBlockTable(tasks, [
    { id: 'title', header: 'Task', accessorKey: 'title' },
    { id: 'application', header: 'Application', accessorKey: 'application' },
    { id: 'due', header: 'Due', accessorKey: 'due' },
  ])

  return (
    <BlockShell
      title="Member home"
      fillTable
      contentOnly={props.contentOnly}
      visible={props.visible}
      navigationLabel="Member home navigation"
      navigation={(controls) => (
        <BlockNavigation
          title="Member home"
          icon="grid"
          sections={homeSections}
          value={section()}
          onChange={setSelected}
          controls={controls}
        />
      )}
    >
      <Show when={section() === applicationsSection}>
        <BlockTable
          table={appsTable}
          title={applicationsSection}
          minWidth="24rem"
          filterMode="live"
          search={{ label: 'Search applications' }}
          messages={{
            noRecords: 'No applications are available.',
            rowActions: (id) => `Actions for ${id}`,
          }}
          rowActions={(row, context) => {
            const app = row.original
            if (!app) return
            return [
              {
                label: 'Open',
                onSelect: () => {
                  if (app.name === 'Support') {
                    if (props.onSupport) props.onSupport()
                    else window.location.assign(userPageHref('support'))
                  } else {
                    restoreFocus = context.getMenuTrigger
                    setOpenApp(app)
                  }
                },
              },
            ]
          }}
        />
      </Show>
      <Show when={section() === activitySection}>
        <BlockTable
          table={activityTable}
          title={activitySection}
          minWidth="28rem"
          filterMode="live"
          search={{ label: 'Search recent activity' }}
          messages={{ noRecords: 'No recent activity.' }}
          formatValue={(value, column) =>
            column.id === 'time' ? (
              <BlockDate value={blockCellText(value)} time />
            ) : undefined
          }
        />
      </Show>
      <Show when={section() === announcementsSection}>
        <BlockTable
          table={announcementsTable}
          title={announcementsSection}
          filterMode="live"
          search={{ label: 'Search announcements' }}
          formatValue={(value, column) =>
            column.id === 'time' ? (
              <BlockDate value={blockCellText(value)} time />
            ) : undefined
          }
        />
      </Show>
      <Show when={section() === tasksSection}>
        <BlockTable
          table={tasksTable}
          title={tasksSection}
          minWidth="28rem"
          filterMode="live"
          search={{ label: 'Search assigned tasks' }}
          messages={{ noRecords: 'No tasks assigned.' }}
          formatValue={(value, column) =>
            column.id === 'due' ? (
              <BlockDate value={blockCellText(value)} />
            ) : undefined
          }
        />
      </Show>
      <Sheet
        open={Boolean(openApp())}
        onOpenChange={(open) => {
          if (!open) setOpenApp(undefined)
        }}
      >
        <Sheet.Portal>
          <Sheet.Overlay />
          <Show when={openApp()} keyed>
            {(app) => (
              <Sheet.Content size="wide" restoreFocus={() => restoreFocus?.()}>
                <Sheet.Title>{app.name}</Sheet.Title>
                <Sheet.Description>{app.description}</Sheet.Description>
                <DashboardPanel title="Assigned tasks" titleAs="h3">
                  <SummaryList
                    items={tasks()
                      .filter(({ application }) => application === app.name)
                      .map(({ title, due }) => ({
                        label: title,
                        value: <BlockDate value={due} />,
                      }))}
                  />
                </DashboardPanel>
                <DashboardPanel title="Recent activity" titleAs="h3">
                  <ActivityList
                    items={activity()
                      .filter(({ actor }) => actor === app.name)
                      .map(({ actor, text, time }) => ({
                        actor,
                        text,
                        time: displayTime(time),
                        dateTime: time,
                      }))}
                  />
                </DashboardPanel>
                <Sheet.CloseButton aria-label="Close">Close</Sheet.CloseButton>
              </Sheet.Content>
            )}
          </Show>
        </Sheet.Portal>
      </Sheet>
    </BlockShell>
  )
}
