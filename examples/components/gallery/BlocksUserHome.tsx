import { createMemo, createSignal, For, Show } from 'solid-js'
import {
  Button,
  ButtonLink,
  EmptyState,
  Sheet,
  SummaryList,
} from '@wfe/components'
import {
  ActivityList,
  DashboardGrid,
  DashboardPanel,
} from '@wfe/components/layout'
import {
  applicationAccessByTenant,
  applications,
  memberActivity,
  memberAnnouncements,
  memberAppAccess,
  memberTasks,
  tenants,
  userMember,
} from './blocksData'
import { BlockDate, BlockShell } from './blocksParts'
import { displayTime, userPageHref } from './blocksUserData'
import type { UserPageProps } from './blocksUserData'

export function BlocksUserHome(
  props: UserPageProps & {
    availableApps?: readonly string[]
    onSupport?: () => void
  } = {},
) {
  const tenant = () => props.tenant ?? tenants[0]
  const [openApp, setOpenApp] = createSignal<(typeof applications)[number]>()
  const apps = createMemo(() => {
    const id = tenant().id
    const installed = props.availableApps ?? applicationAccessByTenant[id] ?? []
    const assigned = memberAppAccess[id] ?? []
    return applications.filter(
      ({ name }) => installed.includes(name) && assigned.includes(name),
    )
  })
  const activity = createMemo(() =>
    memberActivity.filter((entry) =>
      apps().some(({ name }) => name === entry.actor),
    ),
  )
  const tasks = createMemo(() =>
    memberTasks.filter((task) =>
      apps().some(({ name }) => name === task.application),
    ),
  )
  const asActivity = (rows: typeof memberActivity) =>
    rows.map(({ time, ...entry }) => ({
      ...entry,
      time: displayTime(time),
      dateTime: time,
    }))

  return (
    <BlockShell
      title="Member home"
      contentOnly={props.contentOnly}
      visible={props.visible}
    >
      <DashboardPanel
        title={`Welcome, ${userMember.name}`}
        titleAs="h3"
        description={tenant().name}
      />
      <DashboardPanel title="Your applications" titleAs="h3">
        <Show
          when={apps().length}
          fallback={<EmptyState>No applications are available.</EmptyState>}
        >
          <DashboardGrid gap="layout" minPanelWidth="13rem">
            <For each={apps()}>
              {(app) => (
                <DashboardPanel
                  title={app.name}
                  titleAs="h4"
                  description={app.description}
                  footer={
                    <Show
                      when={app.name === 'Support'}
                      fallback={
                        <Button onClick={() => setOpenApp(app)}>
                          Open {app.name}
                        </Button>
                      }
                    >
                      <ButtonLink
                        href={userPageHref('support')}
                        onClick={(event) => {
                          if (
                            !props.onSupport ||
                            event.metaKey ||
                            event.ctrlKey ||
                            event.shiftKey ||
                            event.altKey
                          )
                            return
                          event.preventDefault()
                          props.onSupport()
                        }}
                      >
                        Open Support
                      </ButtonLink>
                    </Show>
                  }
                />
              )}
            </For>
          </DashboardGrid>
        </Show>
      </DashboardPanel>
      <DashboardGrid gap="layout" minPanelWidth="17rem">
        <DashboardPanel title="Recent activity" titleAs="h3">
          <Show
            when={activity().length}
            fallback={<EmptyState>No recent activity.</EmptyState>}
          >
            <ActivityList items={asActivity(activity())} />
          </Show>
        </DashboardPanel>
        <DashboardPanel title="Tenant announcements" titleAs="h3">
          <ActivityList
            items={memberAnnouncements.map(({ title, author, time, text }) => ({
              actor: author,
              time: displayTime(time),
              dateTime: time,
              text: (
                <>
                  <strong>{title}</strong>
                  <br />
                  {text}
                </>
              ),
            }))}
          />
        </DashboardPanel>
        <DashboardPanel title="Assigned tasks" titleAs="h3">
          <Show
            when={tasks().length}
            fallback={<EmptyState>No tasks assigned.</EmptyState>}
          >
            <SummaryList
              items={tasks().map(({ title, due }) => ({
                label: title,
                value: (
                  <>
                    Due <BlockDate value={due} />
                  </>
                ),
              }))}
            />
          </Show>
        </DashboardPanel>
      </DashboardGrid>
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
              <Sheet.Content>
                <Sheet.Title>{app.name}</Sheet.Title>
                <Sheet.Description>{app.description}</Sheet.Description>
                <DashboardPanel
                  title={`Your ${app.name.toLowerCase()} tasks`}
                  titleAs="h3"
                >
                  <SummaryList
                    items={tasks()
                      .filter(({ application }) => application === app.name)
                      .map(({ title, due }) => ({
                        label: title,
                        value: (
                          <>
                            Due <BlockDate value={due} />
                          </>
                        ),
                      }))}
                  />
                </DashboardPanel>
                <DashboardPanel title="Recent activity" titleAs="h3">
                  <ActivityList
                    items={asActivity(
                      activity().filter(({ actor }) => actor === app.name),
                    )}
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
