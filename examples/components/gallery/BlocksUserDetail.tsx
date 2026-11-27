import { createSignal, Show } from 'solid-js'
import {
  AlertDialog,
  Badge,
  Button,
  FormActions,
  SummaryList,
} from '@wfe/components'
import { DashboardGrid, DashboardPanel } from '@wfe/components/layout'
import {
  blockCellText,
  BlockDate,
  BlockNotice,
  BlockShell,
  BlockStatus,
  BlockTable,
  createBlockTable,
} from './blocksParts'
import {
  accessActivity,
  accessMemberships,
  accessProfile,
  accessSessions,
} from './blocksData'

export function BlocksUserDetail(props: {
  contentOnly?: boolean
  visible?: boolean
}) {
  const [sessions, setSessions] = createSignal(accessSessions)
  const [activity, setActivity] = createSignal(accessActivity)
  const [revoke, setRevoke] = createSignal<(typeof accessSessions)[number]>()
  const [message, setMessage] = createSignal('')
  const memberships = createBlockTable(
    () => accessMemberships,
    [
      { id: 'tenant', header: 'Tenant', accessorKey: 'tenant' },
      { id: 'billing', header: 'Billing', accessorKey: 'billing' },
      { id: 'inventory', header: 'Inventory', accessorKey: 'inventory' },
      { id: 'support', header: 'Support', accessorKey: 'support' },
    ],
  )
  const sessionTable = createBlockTable(sessions, [
    { id: 'device', header: 'Device', accessorKey: 'device' },
    { id: 'tenant', header: 'Tenant', accessorKey: 'tenant' },
    { id: 'active', header: 'Last active (UTC)', accessorKey: 'active' },
  ])
  const activityTable = createBlockTable(activity, [
    { id: 'action', header: 'Action', accessorKey: 'action' },
    { id: 'tenant', header: 'Tenant', accessorKey: 'tenant' },
    { id: 'time', header: 'Time (UTC)', accessorKey: 'time' },
  ])

  return (
    <BlockShell
      title="User access"
      contentOnly={props.contentOnly}
      visible={props.visible}
    >
      <DashboardPanel
        title={accessProfile.name}
        titleAs="h3"
        headerEnd={<BlockStatus value="Active" />}
      >
        <SummaryList
          items={[
            { label: 'Email', value: accessProfile.email },
            {
              label: 'Last active',
              value: <BlockDate value={accessProfile.lastActive} />,
            },
          ]}
        />
      </DashboardPanel>
      <BlockNotice message={message()} />
      <DashboardGrid minPanelWidth="27rem" gap="layout">
        <BlockTable
          table={memberships}
          title="Tenant memberships"
          layout="panel"
          minWidth="28rem"
          pageSizes={false}
        />
        <BlockTable
          table={sessionTable}
          title="Active sessions"
          layout="panel"
          minWidth="28rem"
          pageSizes={false}
          renderRowActions={(row) => (
            <Show when={row.original} keyed>
              {(item) =>
                item.current ? (
                  <Badge>Current session</Badge>
                ) : (
                  <Button
                    aria-label={`Revoke ${item.device}`}
                    onClick={() => setRevoke(item)}
                  >
                    Revoke
                  </Button>
                )
              }
            </Show>
          )}
          formatValue={(value, column) =>
            column.id === 'active' ? (
              <BlockDate value={blockCellText(value)} time />
            ) : undefined
          }
        />
        <BlockTable
          table={activityTable}
          title="Recent activity"
          layout="panel"
          minWidth="28rem"
          pageSizes={false}
          formatValue={(value, column) =>
            column.id === 'time' ? (
              <BlockDate value={blockCellText(value)} time />
            ) : undefined
          }
        />
      </DashboardGrid>
      <AlertDialog
        open={Boolean(revoke())}
        onOpenChange={(open) => {
          if (!open) setRevoke(undefined)
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay />
          <AlertDialog.Content>
            <AlertDialog.Title>Revoke session?</AlertDialog.Title>
            <AlertDialog.Description>
              {revoke()?.device} will be signed out from {revoke()?.tenant}.
            </AlertDialog.Description>
            <FormActions>
              <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
              <AlertDialog.Action
                onClick={() => {
                  const session = revoke()
                  if (!session) return
                  setSessions((rows) =>
                    rows.filter(({ id }) => id !== session.id),
                  )
                  setActivity((rows) => [
                    {
                      id: `revoked-${session.id}`,
                      tenant: session.tenant,
                      action: `Revoked ${session.device.toLowerCase()} session`,
                      time: new Date().toISOString(),
                    },
                    ...rows,
                  ])
                  setMessage(
                    `Revoked the ${session.device.toLowerCase()} session.`,
                  )
                  setRevoke(undefined)
                }}
              >
                Revoke session
              </AlertDialog.Action>
            </FormActions>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog>
    </BlockShell>
  )
}
