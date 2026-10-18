import { Show, createSignal } from 'solid-js'
import { Button, InlineAlert, ValueDisplay } from '@wfe/components'
import { DashboardPanel } from '@wfe/components/layout'
import { TableColumnResize } from '@wfe/components/table'
import type { NativeColumn } from '@wfe/components/table'
import { FormView, TableView } from '@wfe/generator'
import type { CustomCellProps, FormDescription } from '@wfe/generator'
import type { createPlatformApplication } from './application'
import type { AccessValues, PlatformUser, PlatformMember } from './provider'
import type { PlatformRoute } from './route'

type Person = PlatformUser | PlatformMember
export function AccessViews(props: {
  app: ReturnType<typeof createPlatformApplication>
  navigate: (route: PlatformRoute) => void
}) {
  const access = props.app.access
  const [usersCollapsed, setUsersCollapsed] = createSignal(true)
  const [membersCollapsed, setMembersCollapsed] = createSignal(true)
  const routeProject = () => {
    const route = props.app.route()
    return 'project' in route ? route.project : ''
  }
  const currentUser = () => {
    const route = props.app.route()
    return route.screen === 'access'
      ? access.users().find((user) => user.principalId === route.principal)
      : undefined
  }
  const Manage = <T extends Person>(cell: CustomCellProps<T, unknown>) => (
    <Button
      aria-label={`Manage access for ${cell.row.original?.displayName ?? cell.row.id}`}
      onClick={() =>
        props.navigate({ screen: 'access', principal: cell.row.id })
      }
    >
      Manage access
    </Button>
  )
  const BooleanCell = <T extends Person>(cell: CustomCellProps<T, unknown>) => (
    <ValueDisplay value={cell.value} format="boolean-symbol" />
  )
  const Environments = <T extends Person>(
    cell: CustomCellProps<T, unknown>,
  ) => <>{Array.isArray(cell.value) ? cell.value.join(', ') : ''}</>
  const resize = <T extends Person>(column: NativeColumn<T, unknown>) => (
    <TableColumnResize
      size={column.getSize()}
      min={40}
      max={4000}
      onSizeChange={column.setSize}
      label={
        typeof column.columnDef?.header === 'string'
          ? column.columnDef.header
          : column.id
      }
    />
  )
  const controls = {
    filtering: false,
    grouping: false,
    columnReordering: false,
  } as const
  const usersDescription = {
    id: 'platform-users',
    title: 'Users',
    controls,
    columns: {
      displayName: { label: 'Name' },
      email: { label: 'Email' },
      status: { label: 'Status' },
      orgAdmin: { label: 'Organization administrator', renderer: 'boolean' },
      actions: { label: 'Actions', renderer: 'manage' },
    },
  } as const
  const memberDescription = () =>
    ({
      id: 'platform-members',
      title: `Members · ${routeProject()}`,
      controls,
      columns: {
        displayName: { label: 'Name' },
        email: { label: 'Email' },
        orgAdmin: { label: 'Organization administrator', renderer: 'boolean' },
        projectAdmin: { label: 'Project administrator', renderer: 'boolean' },
        environments: { label: 'Environments', renderer: 'environments' },
        actions: { label: 'Actions', renderer: 'manage' },
      },
    }) as const
  const formDescription = {
    id: 'platform-access',
    fields: [
      {
        field: 'kind',
        label: 'Access scope',
        control: 'select',
        required: true,
      },
      { field: 'action', label: 'Command', control: 'select', required: true },
      { field: 'project', label: 'Project', control: 'select' },
      { field: 'env', label: 'Environment', control: 'select' },
    ],
    submit: { id: 'apply-access', label: 'Apply access command' },
  } as const satisfies FormDescription<AccessValues>
  const choices = {
    kind: () => [
      {
        value: 'organization',
        label: 'Organization administrator',
        disabled: !props.app.authority()?.orgAdmin,
      },
      { value: 'project', label: 'Project administrator' },
      { value: 'environment', label: 'Environment member' },
    ],
    action: () => [
      { value: 'grant', label: 'Grant' },
      { value: 'revoke', label: 'Revoke' },
    ],
    project: () =>
      props.app
        .projects()
        .filter((row) => access.allowed('project', row.name))
        .map((row) => ({ value: row.name, label: row.name })),
    env: () =>
      access.environments().map((name) => ({ value: name, label: name })),
  }
  const visible = () =>
    !props.app.session().loading && !props.app.session().error
  return (
    <>
      <Show when={props.app.route().screen === 'access' && access.completed()}>
        <InlineAlert announce="polite">{access.completed()}</InlineAlert>
      </Show>
      <div
        class="platform-table-screen"
        hidden={props.app.route().screen !== 'users' || !visible()}
      >
        <TableView
          description={usersDescription}
          bindings={{
            table: access.usersTable,
            width: access.usersTable
              .getVisibleColumns()
              .reduce((sum, col) => sum + col.getSize(), 0),
            status: access.state,
            controlsCollapsed: usersCollapsed(),
            onControlsCollapsedChange: setUsersCollapsed,
            cells: { manage: Manage, boolean: BooleanCell },
            headerEnd: resize,
            onApplyFilters: (criteria) => {
              access.usersTable.setGlobalFilter(criteria.globalFilter)
              access.usersTable.setColumnFilters(criteria.columnFilters)
              void props.app.refresh()
            },
          }}
        />
      </div>
      <div
        class="platform-table-screen"
        hidden={props.app.route().screen !== 'members' || !visible()}
      >
        <TableView
          description={memberDescription()}
          bindings={{
            table: access.membersTable,
            width: access.membersTable
              .getVisibleColumns()
              .reduce((sum, col) => sum + col.getSize(), 0),
            status: access.state,
            controlsCollapsed: membersCollapsed(),
            onControlsCollapsedChange: setMembersCollapsed,
            cells: {
              manage: Manage,
              boolean: BooleanCell,
              environments: Environments,
            },
            headerEnd: resize,
            onApplyFilters: (criteria) => {
              access.membersTable.setGlobalFilter(criteria.globalFilter)
              access.membersTable.setColumnFilters(criteria.columnFilters)
              void props.app.refresh()
            },
          }}
        />
      </div>
      <Show when={props.app.route().screen === 'access' && visible()}>
        <DashboardPanel class="platform-details">
          <h2 data-ui-text="system">Manage access</h2>

          <Show when={access.state().loading}>
            <p role="status">Loading user</p>
          </Show>
          <Show when={access.state().error}>
            <InlineAlert tone="error" announce="assertive">
              {access.state().error}
            </InlineAlert>
          </Show>
          <Show when={currentUser() && !access.state().error}>
            <p>
              {currentUser()?.displayName} · {currentUser()?.email}
            </p>
            <p>
              Grant or revoke one scope at a time. Higher-level grants can cover
              lower-level access. The server decides each command.
            </p>
            <Show when={access.choicesState().loading}>
              <p role="status">Loading environments</p>
            </Show>
            <Show when={access.choicesState().error}>
              <InlineAlert tone="error" announce="assertive">
                {access.choicesState().error}
              </InlineAlert>
            </Show>
            <FormView
              description={formDescription}
              bindings={{
                form: access.form,
                choices,
                disabled: (field) =>
                  field === 'project'
                    ? access.form.values.kind === 'organization'
                    : field === 'env'
                      ? access.form.values.kind !== 'environment' ||
                        access.choicesState().loading
                      : false,
              }}
            />
          </Show>
          <div class="platform-inline-actions">
            <Button onClick={() => void props.app.refresh()}>
              Refresh access
            </Button>
            <Button onClick={() => props.navigate({ screen: 'users' })}>
              {access.form.pending ? 'Stop waiting' : 'Back to users'}
            </Button>
          </div>
        </DashboardPanel>
      </Show>
    </>
  )
}
