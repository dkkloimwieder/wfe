import {
  createEffect,
  createMemo,
  createSignal,
  For,
  Show,
  untrack,
} from 'solid-js'
import {
  AlertDialog,
  Button,
  CheckboxField,
  Dialog,
  Field,
  FieldGroup,
  FormActions,
  FormGrid,
  InlineAlert,
  Input,
  Label,
  SelectField,
  SwitchField,
  Tabs,
  ToggleGroup,
} from '@wfe/components'
import type { CalendarRange } from '@wfe/components'
import {
  DashboardGrid,
  DashboardHeaderActions,
  DashboardPanel,
} from '@wfe/components/layout'
import { nativeEvents } from '@wfe/components/events'
import {
  blockCellText,
  BlockDate,
  BlockDateRange,
  BlockNavigation,
  BlockNotice,
  BlockShell,
  BlockStatus,
  BlockTable,
  BlockTenantSwitcher,
  createApplicationAccess,
  createBlockTable,
} from './blocksParts'
import {
  applications,
  auditByTenant,
  choicesFor,
  defaultPermissions,
  inDateRange,
  keysByTenant,
  keyScopes,
  membersByTenant,
  permissionActions,
  permissionKey,
  roles,
  tabNames,
  tenants,
} from './blocksData'
import type { ApiKey, AuditEvent, Member, Tenant } from './blocksData'

export const tenantTableSections = ['Members', 'Roles', 'API keys', 'Audit log']
const roleChoices = choicesFor(roles)
const roleFilters = [{ value: 'all', label: 'All roles' }, ...roleChoices]
const memberPageSizes = [10, 25, 50]

function RolesPanel(props: {
  permissions: Record<string, string[]>
  onSave: (role: string, permissions: string[]) => void
}) {
  const [role, setRole] = createSignal('Administrator')
  // Seed the role draft when this tenant's panel mounts.
  const [draft, setDraft] = createSignal(
    untrack(() => props.permissions[role()] ?? []),
  )
  const matrix = createBlockTable(
    () => applications.map((app) => ({ ...app, id: app.name })),
    [
      { id: 'name', header: 'Application', accessorKey: 'name' },
      ...permissionActions.map((action) => ({ id: action, header: action })),
    ],
  )
  return (
    <>
      <DashboardHeaderActions>
        <ToggleGroup
          aria-label="Roles"
          items={roleChoices}
          value={role()}
          allowEmpty={false}
          onValueChange={(next) => {
            if (!next) return
            setRole(next)
            setDraft(props.permissions[next] ?? [])
          }}
        />
        <Button tone="primary" onClick={() => props.onSave(role(), draft())}>
          Save permissions
        </Button>
        <Button onClick={() => setDraft(props.permissions[role()] ?? [])}>
          Cancel
        </Button>
      </DashboardHeaderActions>
      <BlockTable
        class="blocks-permission-table"
        table={matrix}
        title="Role permissions"
        minWidth="24rem"
        columnWidths={{ name: '8.5rem' }}
        pageSizes={false}
        controls={{
          filtering: false,
          columnVisibility: false,
          alignment: false,
          columnReordering: false,
        }}
        renderCell={(cell) => {
          if (cell.column.id === 'name') return cell.row.id
          const key = permissionKey(cell.row.id, cell.column.id)
          return (
            <CheckboxField
              aria-label={`${cell.column.id} ${cell.row.id}`}
              checked={draft().includes(key)}
              onCheckedChange={(checked) =>
                setDraft((values) =>
                  checked
                    ? [...values, key]
                    : values.filter((value) => value !== key),
                )
              }
            />
          )
        }}
      />
    </>
  )
}

type Confirmation =
  { kind: 'member'; item: Member } | { kind: 'key'; item: ApiKey }

export function BlocksTenantAdmin(props: {
  sidebar?: boolean
  contentOnly?: boolean
  section?: string
  tenant?: Tenant
  access?: ReturnType<typeof createApplicationAccess>
  visible?: boolean
}) {
  const [selectedTenant, setSelectedTenant] = createSignal<Tenant>(tenants[0])
  const tenant = () => props.tenant ?? selectedTenant()
  const [members, setMembers] = createSignal(membersByTenant)
  const access = props.access ?? createApplicationAccess()
  const [keys, setKeys] = createSignal(keysByTenant)
  const [events, setEvents] = createSignal(auditByTenant)
  const [permissions, setPermissions] = createSignal<
    Record<string, Record<string, string[]>>
  >({})
  const [selectedTab, setTab] = createSignal('Members')
  const tab = () => props.section ?? selectedTab()
  const [memberPage, setMemberPage] = createSignal<{
    tenantId: string
    page: number
  }>()
  const [memberPageSize, setMemberPageSize] = createSignal(memberPageSizes[0]!)
  const [range, setRange] = createSignal<CalendarRange>()
  const [inviteOpen, setInviteOpen] = createSignal(false)
  const [inviteRole, setInviteRole] = createSignal('Viewer')
  const [inviteError, setInviteError] = createSignal('')
  const [roleMember, setRoleMember] = createSignal<Member>()
  const [memberRole, setMemberRole] = createSignal('Viewer')
  const [keyOpen, setKeyOpen] = createSignal(false)
  const [confirmation, setConfirmation] = createSignal<Confirmation>()
  const [message, setMessage] = createSignal('')
  let sequence = 0
  let roleSelect: HTMLButtonElement | undefined
  let roleTrigger: HTMLButtonElement | undefined
  let roleWorkspace: HTMLElement | null | undefined

  const tenantMembers = () => members()[tenant().id] ?? []
  const tenantKeys = () => keys()[tenant().id] ?? []
  const tenantApps = () => access.forTenant(tenant().id)
  const tenantPermissions = () =>
    permissions()[tenant().id] ?? defaultPermissions
  const tenantEvents = createMemo(() =>
    (events()[tenant().id] ?? []).filter((event) =>
      inDateRange(event.time, range()),
    ),
  )
  function log(
    action: string,
    target: string,
    message: string,
    application = '—',
  ) {
    const event: AuditEvent = {
      id: `event-${++sequence}`,
      actor:
        tenantMembers().find((member) => member.role === 'Administrator')
          ?.name ?? 'Tenant admin',
      action,
      target,
      application,
      time: new Date().toISOString(),
    }
    setEvents((all) => ({
      ...all,
      [tenant().id]: [event, ...(all[tenant().id] ?? [])],
    }))
    setMessage(message)
  }

  const memberTable = createBlockTable(tenantMembers, [
    { id: 'name', header: 'Name', accessorKey: 'name' },
    { id: 'email', header: 'Email', accessorKey: 'email' },
    {
      id: 'role',
      header: 'Role',
      accessorKey: 'role',
      filterFn: (value, filter) => value === filter,
    },
    {
      id: 'applications',
      header: 'Applications',
      accessorFn: (member) => member.applications.join(', '),
    },
    { id: 'status', header: 'Status', accessorKey: 'status' },
    { id: 'lastActive', header: 'Last active', accessorKey: 'lastActive' },
  ])
  const keyTable = createBlockTable(tenantKeys, [
    { id: 'name', header: 'Name', accessorKey: 'name' },
    { id: 'prefix', header: 'Prefix', accessorKey: 'prefix' },
    { id: 'created', header: 'Created', accessorKey: 'created' },
    { id: 'lastUsed', header: 'Last used', accessorKey: 'lastUsed' },
    {
      id: 'scopes',
      header: 'Scopes',
      accessorFn: (key) => key.scopes.join(', '),
    },
  ])
  const auditTable = createBlockTable(tenantEvents, [
    { id: 'actor', header: 'Actor', accessorKey: 'actor' },
    { id: 'action', header: 'Action', accessorKey: 'action' },
    { id: 'target', header: 'Target', accessorKey: 'target' },
    { id: 'application', header: 'Application', accessorKey: 'application' },
    { id: 'time', header: 'Time (UTC)', accessorKey: 'time' },
  ])

  createEffect(tenant, () => {
    setMessage('')
    memberTable.setGlobalFilter('')
    memberTable.setColumnFilters([])
    setRange(undefined)
    auditTable.setGlobalFilter('')
    auditTable.setColumnFilters([])
    keyTable.setGlobalFilter('')
    keyTable.setColumnFilters([])
  })

  function InviteMember() {
    let firstField: HTMLInputElement | undefined
    let trigger: HTMLButtonElement | undefined
    return (
      <Dialog
        open={inviteOpen()}
        onOpenChange={(open) => {
          if (open) {
            setInviteRole('Viewer')
            setInviteError('')
          }
          setInviteOpen(open)
        }}
      >
        <Dialog.Trigger
          tone="primary"
          ref={(node) => {
            trigger = node
          }}
        >
          Invite member
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content
            initialFocus={() => firstField}
            restoreFocus={() => trigger}
          >
            <Dialog.Title>Invite member</Dialog.Title>
            <Dialog.Description>
              Choose a role and application access for {tenant().name}.
            </Dialog.Description>
            <FormGrid
              as="form"
              footer={
                <>
                  <Button type="submit" tone="primary">
                    Send invitation
                  </Button>
                  <Dialog.CloseButton aria-label="Cancel">
                    Cancel
                  </Dialog.CloseButton>
                </>
              }
              ref={nativeEvents<HTMLFormElement>({
                submit: (event) => {
                  event.preventDefault()
                  const form = new FormData(event.currentTarget)
                  const emailField = form.get('email')
                  if (typeof emailField !== 'string') return
                  const email = emailField.trim().toLowerCase()
                  if (
                    tenantMembers().some((member) => member.email === email)
                  ) {
                    setInviteError(
                      'This email already belongs to a member or invite.',
                    )
                    return
                  }
                  const access = form
                    .getAll('application')
                    .filter((value) => typeof value === 'string')
                  const invited: Member = {
                    id: email,
                    name: 'Pending member',
                    email,
                    role: inviteRole(),
                    applications: access,
                    status: 'Invited',
                    lastActive: '',
                  }
                  setMembers((all) => ({
                    ...all,
                    [tenant().id]: [...tenantMembers(), invited],
                  }))
                  setInviteOpen(false)
                  log(
                    'Invited member',
                    email,
                    `Invitation added for ${email}.`,
                    access.join(', ') || '—',
                  )
                },
              })}
            >
              <Field required>
                <Label>Email</Label>
                <Input
                  name="email"
                  ref={(node) => {
                    firstField = node
                  }}
                  type="email"
                  autocomplete="email"
                />
              </Field>
              <SelectField
                label="Role"
                value={inviteRole()}
                choices={roleChoices}
                onValueChange={setInviteRole}
              />
              <FieldGroup title="Application access">
                <For each={applications}>
                  {({ name }) => (
                    <CheckboxField
                      label={name}
                      name="application"
                      value={name}
                    />
                  )}
                </For>
              </FieldGroup>

              <Show when={inviteError()}>
                <InlineAlert tone="error" announce="polite">
                  {inviteError()}
                </InlineAlert>
              </Show>
            </FormGrid>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    )
  }

  function Members() {
    return (
      <BlockTable
        table={memberTable}
        title="Members"
        minWidth="59rem"
        columnWidths={{
          email: '15rem',
          applications: '11rem',
          lastActive: '8.5rem',
        }}
        clientPagination={{
          pageSizes: memberPageSizes,
          page: memberPage()?.tenantId === tenant().id ? memberPage()!.page : 0,
          pageSize: memberPageSize(),
          onPageChange: (page) =>
            setMemberPage({ tenantId: tenant().id, page }),
          onPageSizeChange: setMemberPageSize,
          resetKey: tenant().id,
        }}
        filterMode="live"
        search={{ label: 'Search members' }}
        controls={{ filtering: false }}
        messages={{
          noMatches: 'No members match your search and role filter.',
          rowActions: (id) =>
            `Actions for ${memberTable.getRow(id).original?.email ?? id}`,
        }}
        extraFilters={
          <SelectField
            label="Filter by role"
            choices={roleFilters}
            value={
              blockCellText(memberTable.getColumn('role')?.getFilterValue()) ||
              'all'
            }
            onValueChange={(value) =>
              memberTable
                .getColumn('role')
                ?.setFilterValue(value === 'all' ? undefined : value)
            }
          />
        }
        rowActions={(row, { getMenuTrigger }) => {
          const item = row.original
          if (!item) return
          return [
            {
              label: 'Change role',
              onSelect: () => {
                roleTrigger = getMenuTrigger()
                roleWorkspace =
                  roleTrigger?.closest<HTMLElement>('.table-workspace')
                setMemberRole(item.role)
                setRoleMember(item)
              },
            },
            {
              label: 'Resend invite',
              disabled: item.status !== 'Invited',
              onSelect: () =>
                log(
                  'Resent invitation',
                  item.email,
                  `Invitation resent to ${item.email}.`,
                ),
            },
            {
              label: 'Remove',
              onSelect: () => setConfirmation({ kind: 'member', item }),
            },
          ]
        }}
        formatValue={(value, column) => {
          if (column.id === 'status')
            return <BlockStatus value={blockCellText(value)} />
          if (column.id === 'lastActive')
            return <BlockDate value={blockCellText(value)} empty="Never" />
          return undefined
        }}
      />
    )
  }

  function Applications() {
    return (
      <DashboardGrid>
        <For each={applications}>
          {({ name, description }) => {
            const enabled = () => tenantApps().includes(name)
            return (
              <DashboardPanel
                title={name}
                titleAs="h3"
                description={description}
                headerEnd={
                  <BlockStatus value={enabled() ? 'Enabled' : 'Disabled'} />
                }
                footer={
                  <SwitchField
                    label={`Enable ${name}`}
                    checked={enabled()}
                    onCheckedChange={(checked) => {
                      access.update(tenant().id, (names) =>
                        checked
                          ? [...names, name]
                          : names.filter((app) => app !== name),
                      )
                      log(
                        checked
                          ? 'Enabled application'
                          : 'Disabled application',
                        name,
                        `${name} ${checked ? 'enabled' : 'disabled'} for ${tenant().name}.`,
                        name,
                      )
                    }}
                  />
                }
              />
            )
          }}
        </For>
      </DashboardGrid>
    )
  }

  function Roles() {
    return (
      <Show when={tenant().id} keyed>
        {(_tenantId) => (
          <RolesPanel
            permissions={tenantPermissions()}
            onSave={(role, draft) => {
              setPermissions((all) => ({
                ...all,
                [tenant().id]: { ...tenantPermissions(), [role]: draft },
              }))
              log(
                'Updated role permissions',
                role,
                `Saved permissions for ${role}.`,
              )
            }}
          />
        )}
      </Show>
    )
  }

  function CreateKey() {
    let firstField: HTMLInputElement | undefined
    let trigger: HTMLButtonElement | undefined
    return (
      <Dialog open={keyOpen()} onOpenChange={setKeyOpen}>
        <Dialog.Trigger
          tone="primary"
          ref={(node) => {
            trigger = node
          }}
        >
          Create key
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content
            initialFocus={() => firstField}
            restoreFocus={() => trigger}
          >
            <Dialog.Title>Create API key</Dialog.Title>
            <Dialog.Description>
              Set a name and scopes for this example key.
            </Dialog.Description>
            <FormGrid
              as="form"
              footer={
                <>
                  <Button type="submit" tone="primary">
                    Create key
                  </Button>
                  <Dialog.CloseButton aria-label="Cancel">
                    Cancel
                  </Dialog.CloseButton>
                </>
              }
              ref={nativeEvents<HTMLFormElement>({
                submit: (event) => {
                  event.preventDefault()
                  const form = new FormData(event.currentTarget)
                  const nameField = form.get('name')
                  if (typeof nameField !== 'string' || !nameField.trim()) return
                  const name = nameField.trim()
                  const key: ApiKey = {
                    id: `key-${++sequence}`,
                    prefix: `demo_${tenant().id.slice(0, 2)}${String(sequence).padStart(3, '0')}`,
                    name,
                    created: new Date().toISOString().slice(0, 10),
                    lastUsed: '',
                    scopes: form
                      .getAll('scope')
                      .filter((value) => typeof value === 'string'),
                  }
                  setKeys((all) => ({
                    ...all,
                    [tenant().id]: [...tenantKeys(), key],
                  }))
                  setKeyOpen(false)
                  log(
                    'Created API key',
                    name,
                    `Created example key ${key.prefix}.`,
                  )
                },
              })}
            >
              <Field required>
                <Label>Key name</Label>
                <Input
                  name="name"
                  ref={(node) => {
                    firstField = node
                  }}
                  pattern=".*\S.*"
                />
              </Field>
              <FieldGroup title="Scopes">
                <For each={keyScopes}>
                  {(scope) => (
                    <CheckboxField label={scope} name="scope" value={scope} />
                  )}
                </For>
              </FieldGroup>
            </FormGrid>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    )
  }

  function ApiKeys() {
    return (
      <BlockTable
        table={keyTable}
        title="API keys"
        pageSizes={[5, 10, 25]}
        pageScope={[tenant().id]}
        columnWidths={{ lastUsed: '8.5rem' }}
        renderRowActions={(row) => (
          <Button
            onClick={() => {
              const item = row.original
              if (item) setConfirmation({ kind: 'key', item })
            }}
          >
            Revoke
          </Button>
        )}
        messages={{ noRecords: 'No API keys. Create a key to add one.' }}
        formatValue={(value, column) =>
          column.id === 'lastUsed' || column.id === 'created' ? (
            <BlockDate value={blockCellText(value)} empty="Never" />
          ) : undefined
        }
      />
    )
  }

  function AuditLog() {
    return (
      <BlockTable
        table={auditTable}
        title="Audit log"
        pageScope={[tenant().id, range()]}
        controls={{ filtering: false }}
        filterMode="live"
        search={{ label: 'Search audit log' }}
        filtersActive={Boolean(range())}
        onClearFilters={() => setRange(undefined)}
        messages={{ noRecords: 'No activity in this date range.' }}
        extraFilters={
          <BlockDateRange
            label="Audit dates"
            value={range()}
            onValueChange={setRange}
          />
        }
        formatValue={(value, column) =>
          column.id === 'time' ? (
            <BlockDate value={blockCellText(value)} time />
          ) : undefined
        }
      />
    )
  }

  const sections = [Members, Applications, Roles, ApiKeys, AuditLog]

  return (
    <BlockShell
      title={props.sidebar ? tab() : 'Tenant administration'}
      contentOnly={props.contentOnly}
      visible={props.visible}
      fillTable={!props.sidebar || tenantTableSections.includes(tab())}
      header={
        <>
          <BlockNotice message={message()} />
          <Show when={!props.sidebar && !props.contentOnly}>
            <BlockTenantSwitcher
              tenant={tenant()}
              onChange={setSelectedTenant}
            />
          </Show>
          <Show when={tab() === 'Members'}>
            <InviteMember />
          </Show>
          <Show when={tab() === 'API keys'}>
            <CreateKey />
          </Show>
        </>
      }
      navigationLabel="Tenant navigation"
      navigation={
        props.sidebar
          ? (controls) => (
              <>
                <BlockTenantSwitcher
                  tenant={tenant()}
                  onChange={setSelectedTenant}
                  compact={controls.compact()}
                />
                <BlockNavigation
                  title="Tenant sections"
                  sections={tabNames}
                  value={tab()}
                  onChange={setTab}
                  controls={controls}
                />
              </>
            )
          : undefined
      }
    >
      <Show
        when={props.sidebar || props.contentOnly}
        fallback={
          <Tabs
            class="blocks-tabs"
            value={tab()}
            onValueChange={setTab}
            panelMount="active"
          >
            <Tabs.List aria-label="Tenant sections">
              <For each={tabNames}>
                {(name) => <Tabs.Trigger value={name}>{name}</Tabs.Trigger>}
              </For>
            </Tabs.List>
            <For each={sections}>
              {(Section, index) => (
                <Tabs.Content
                  value={tabNames[index()]!}
                  padding={
                    tabNames[index()] === 'Applications' ? undefined : 'none'
                  }
                >
                  <Section />
                </Tabs.Content>
              )}
            </For>
          </Tabs>
        }
      >
        <For each={sections}>
          {(Section, index) => (
            <Show when={tab() === tabNames[index()]}>
              <Section />
            </Show>
          )}
        </For>
      </Show>
      <Dialog
        open={Boolean(roleMember())}
        onOpenChange={(open) => {
          if (!open) setRoleMember(undefined)
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content
            initialFocus={() => roleSelect}
            restoreFocus={() =>
              roleTrigger?.isConnected ? roleTrigger : roleWorkspace
            }
          >
            <Dialog.Title>Change role</Dialog.Title>
            <Dialog.Description>
              Choose a role for {roleMember()?.email}.
            </Dialog.Description>
            <FormGrid
              as="form"
              footer={
                <>
                  <Button type="submit" tone="primary">
                    Save role
                  </Button>
                  <Dialog.CloseButton aria-label="Cancel">
                    Cancel
                  </Dialog.CloseButton>
                </>
              }
              ref={nativeEvents<HTMLFormElement>({
                submit: (event) => {
                  event.preventDefault()
                  const item = roleMember()
                  if (!item) return
                  setMembers((all) => ({
                    ...all,
                    [tenant().id]: tenantMembers().map((member) =>
                      member.id === item.id
                        ? { ...member, role: memberRole() }
                        : member,
                    ),
                  }))
                  setRoleMember(undefined)
                  log(
                    'Changed member role',
                    item.email,
                    `${item.name} now has the ${memberRole()} role.`,
                  )
                },
              })}
            >
              <SelectField
                label="New role"
                ref={(node) => {
                  roleSelect = node
                }}
                choices={roleChoices}
                value={memberRole()}
                onValueChange={setMemberRole}
              />
            </FormGrid>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
      <AlertDialog
        open={Boolean(confirmation())}
        onOpenChange={(open) => {
          if (!open) setConfirmation(undefined)
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay />
          <AlertDialog.Content>
            <AlertDialog.Title>
              {confirmation()?.kind === 'member'
                ? 'Remove member?'
                : 'Revoke API key?'}
            </AlertDialog.Title>
            <AlertDialog.Description>
              <Show when={confirmation()}>
                {(request) => {
                  const description = createMemo(() => {
                    const current = request()
                    return current.kind === 'member'
                      ? `Remove access for ${current.item.email} from ${tenant().name}.`
                      : `Revoke ${current.item.name} and remove it from the key list.`
                  })
                  return <>{description()}</>
                }}
              </Show>
            </AlertDialog.Description>
            <FormActions>
              <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
              <AlertDialog.Action
                onClick={() => {
                  const request = confirmation()
                  setConfirmation(undefined)
                  if (request?.kind === 'member') {
                    setMembers((all) => ({
                      ...all,
                      [tenant().id]: tenantMembers().filter(
                        ({ id }) => id !== request.item.id,
                      ),
                    }))
                    log(
                      'Removed member',
                      request.item.email,
                      `Removed ${request.item.email}.`,
                    )
                  } else if (request) {
                    setKeys((all) => ({
                      ...all,
                      [tenant().id]: tenantKeys().filter(
                        ({ id }) => id !== request.item.id,
                      ),
                    }))
                    log(
                      'Revoked API key',
                      request.item.name,
                      `Revoked ${request.item.name}.`,
                    )
                  }
                }}
              >
                {confirmation()?.kind === 'member' ? 'Remove' : 'Revoke'}
              </AlertDialog.Action>
            </FormActions>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog>
    </BlockShell>
  )
}
