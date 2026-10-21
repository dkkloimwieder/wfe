import { Show, createSignal } from 'solid-js'
import {
  Button,
  IconButton,
  Icon,
  InlineAlert,
  ValueDisplay,
} from '@wfe/components'
import { DashboardPanel } from '@wfe/components/layout'
import { TableColumnResize } from '@wfe/components/table'
import type { NativeColumn } from '@wfe/components/table'
import { FormView, TableView } from '@wfe/generator'
import type { CustomCellProps, FormDescription } from '@wfe/generator'
import type { createPlatformApplication } from './application'
import type { AssignmentValues } from './application-access-application'
import type {
  ApplicationUser,
  PermissionRow,
} from './application-access-provider'
import { isApplicationAccessRoute } from './route'
import type { PlatformRoute } from './route'
import { createPlatformTableSelection } from './table-selection'

export function ApplicationAccessViews(props: {
  app: ReturnType<typeof createPlatformApplication>
  navigate: (route: PlatformRoute) => void
}) {
  const access = props.app.applicationAccess
  const usersSelection = createPlatformTableSelection(access.usersTable)
  const rolesSelection = createPlatformTableSelection(access.rolesTable)
  const permissionsSelection = createPlatformTableSelection(
    access.permissionsTable,
  )
  const [usersCollapsed, setUsersCollapsed] = createSignal(true)
  const [rolesCollapsed, setRolesCollapsed] = createSignal(true)
  const [permissionsCollapsed, setPermissionsCollapsed] = createSignal(true)
  const scope = () => {
    const route = props.app.route()
    return 'env' in route
      ? { project: route.project, env: route.env }
      : { project: '', env: '' }
  }
  const status = () => ({
    loading: props.app.detail().loading || access.state().loading,
    error: props.app.detail().error ?? access.state().error,
  })
  const unavailable = () =>
    status().loading || Boolean(status().error) || !access.authority()?.admin
  const go = (screen: 'app-users' | 'app-roles' | 'environment') =>
    props.navigate({ ...scope(), screen })
  const Toolbar = () => (
    <div class="platform-inline-actions">
      <IconButton
        aria-label="Application users"
        title="Application users"
        onClick={() => go('app-users')}
      >
        <Icon name="people" />
      </IconButton>
      <IconButton
        aria-label="Application roles"
        title="Application roles"
        onClick={() => go('app-roles')}
      >
        <Icon name="key" />
      </IconButton>
      <IconButton
        aria-label="Back to environment"
        title="Back to environment"
        onClick={() => go('environment')}
      >
        <Icon name="chevron-left" />
      </IconButton>
    </div>
  )
  const UserAction = (cell: CustomCellProps<ApplicationUser, unknown>) => (
    <IconButton
      aria-label={`Manage application roles for ${cell.row.original?.email ?? cell.row.id}`}
      title="Manage application roles"
      onClick={() =>
        props.navigate({
          ...scope(),
          screen: 'app-user',
          principal: cell.row.id,
        })
      }
    >
      <Icon name="key" />
    </IconButton>
  )
  const RoleAction = (cell: CustomCellProps<{ name: string }, unknown>) => (
    <IconButton
      aria-label={`View permissions for ${cell.row.id}`}
      title="View role permissions"
      onClick={() =>
        props.navigate({ ...scope(), screen: 'app-role', role: cell.row.id })
      }
    >
      <Icon name="view" />
    </IconButton>
  )
  const PermissionAction = (cell: CustomCellProps<PermissionRow, unknown>) => {
    const row = () => cell.row.original
    const enabled = () =>
      !access.permissions()?.admin &&
      Boolean(row()?.selected || (row()?.served && row()?.grantable))
    const label = () => `${row()?.selected ? 'Revoke' : 'Grant'} ${cell.row.id}`
    return (
      <Show when={enabled()}>
        <IconButton
          aria-label={label()}
          title={label()}
          disabled={unavailable() || access.command().loading}
          onClick={() =>
            void access.changePermission(
              row()?.selected ? 'revoke' : 'grant',
              cell.row.id,
            )
          }
        >
          <Icon name={row()?.selected ? 'cross' : 'check'} />
        </IconButton>
      </Show>
    )
  }
  const BooleanCell = <T extends object>(cell: CustomCellProps<T, unknown>) => (
    <ValueDisplay value={cell.value} format="boolean-symbol" />
  )
  const resize = <T extends object>(column: NativeColumn<T, unknown>) => (
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
  const assignmentDescription = {
    id: 'application-role-assignment',
    fields: [
      { field: 'role', label: 'Role', control: 'select', required: true },
      { field: 'action', label: 'Command', control: 'select', required: true },
    ],
    submit: { id: 'apply', label: 'Apply role command' },
  } as const satisfies FormDescription<AssignmentValues>
  return (
    <Show
      when={
        isApplicationAccessRoute(props.app.route()) &&
        !props.app.session().loading &&
        !props.app.session().error
      }
    >
      <Show when={access.completed()}>
        <InlineAlert announce="polite">{access.completed()}</InlineAlert>
      </Show>
      <Show when={access.command().error}>
        <InlineAlert tone="error" announce="assertive">
          {access.command().error}
        </InlineAlert>
      </Show>
      <div
        class="platform-table-screen"
        hidden={props.app.route().screen !== 'app-users'}
      >
        <TableView
          description={{
            id: 'application-users',
            title: 'Application users',
            columns: {
              actions: { label: 'Actions', renderer: 'manage' },
              name: { label: 'Name' },
              email: { label: 'Email' },
              roles: { label: 'Assigned roles' },
              adminCovered: {
                label: 'Administrator coverage',
                renderer: 'boolean',
              },
            },
            controls,
          }}
          bindings={{
            table: access.usersTable,
            selection: usersSelection,
            width: access.usersTable
              .getVisibleColumns()
              .reduce((sum, column) => sum + column.getSize(), 0),
            toolbarActions: Toolbar,
            status,
            controlsCollapsed: usersCollapsed(),
            onControlsCollapsedChange: setUsersCollapsed,
            cells: { manage: UserAction, boolean: BooleanCell },
            headerEnd: resize,
            onApplyFilters: () => void props.app.refresh(),
          }}
        />
      </div>
      <div
        class="platform-table-screen"
        hidden={props.app.route().screen !== 'app-roles'}
      >
        <TableView
          description={{
            id: 'application-roles',
            title: 'Application roles',
            columns: {
              actions: { label: 'Actions', renderer: 'view' },
              name: { label: 'Role' },
            },
            controls,
          }}
          bindings={{
            table: access.rolesTable,
            selection: rolesSelection,
            width: access.rolesTable
              .getVisibleColumns()
              .reduce((sum, column) => sum + column.getSize(), 0),
            toolbarActions: Toolbar,
            status,
            controlsCollapsed: rolesCollapsed(),
            onControlsCollapsedChange: setRolesCollapsed,
            cells: { view: RoleAction },
            headerEnd: resize,
            onApplyFilters: () => void props.app.refresh(),
          }}
        />
      </div>
      <Show
        when={
          props.app.route().screen === 'app-role' && access.permissions()?.admin
        }
      >
        <InlineAlert>
          Built-in administrator: all served operations. Stored permission rows
          do not enumerate this access.
        </InlineAlert>
      </Show>
      <div
        class="platform-table-screen"
        hidden={props.app.route().screen !== 'app-role'}
      >
        <TableView
          description={{
            id: 'application-role-permissions',
            title: 'Permissions',
            columns: {
              actions: { label: 'Actions', renderer: 'change' },
              operation: { label: 'Operation' },
              selected: { label: 'Stored permission', renderer: 'boolean' },
              served: { label: 'Served', renderer: 'boolean' },
              grantable: { label: 'Grantable', renderer: 'boolean' },
              adminOnly: { label: 'Administrator only', renderer: 'boolean' },
            },
            controls,
          }}
          bindings={{
            table: access.permissionsTable,
            selection: permissionsSelection,
            width: access.permissionsTable
              .getVisibleColumns()
              .reduce((sum, column) => sum + column.getSize(), 0),
            toolbarActions: Toolbar,
            status,
            controlsCollapsed: permissionsCollapsed(),
            onControlsCollapsedChange: setPermissionsCollapsed,
            cells: { change: PermissionAction, boolean: BooleanCell },
            headerEnd: resize,
            onApplyFilters: () => void props.app.refresh(),
          }}
        />
      </div>
      <Show when={props.app.route().screen === 'app-user'}>
        <DashboardPanel fill class="platform-details platform-form-page">
          <div class="platform-inline-actions">
            <Toolbar />
            <IconButton
              aria-label="Refresh application roles"
              title="Refresh application roles"
              onClick={() => void props.app.refresh()}
            >
              <Icon name="refresh" />
            </IconButton>
          </div>
          <h2 data-ui-text="system">Application role assignment</h2>
          <Show when={status().loading}>
            <p role="status" data-ui-text="system">
              Loading application access
            </p>
          </Show>
          <Show when={status().error}>
            <InlineAlert tone="error" announce="assertive">
              {status().error}
            </InlineAlert>
          </Show>
          <Show when={access.selectedUser() && !status().error}>
            <section
              class="platform-access-summary"
              aria-label="Current application roles"
            >
              <p>
                {access.selectedUser()?.displayName ??
                  access.selectedUser()?.email}
              </p>
              <dl>
                <dt data-ui-text="system">Assigned roles</dt>
                <dd>{access.selectedUser()?.roles.join(', ') || 'None'}</dd>
                <dt data-ui-text="system">Administrator coverage</dt>
                <dd>
                  <ValueDisplay
                    value={access.selectedUser()?.adminCovered}
                    format="boolean-symbol"
                  />
                </dd>
              </dl>
              <Show when={access.selectedUser()?.adminCovered}>
                <p>Project administration supplies this administrator role.</p>
              </Show>
            </section>
            <FormView
              description={assignmentDescription}
              bindings={{
                form: access.assignment,
                status,
                disabled: unavailable,
                choices: {
                  role: () =>
                    access.roles().map((value) => ({ value, label: value })),
                  action: () => [
                    { value: 'grant' as const, label: 'Grant' },
                    { value: 'revoke' as const, label: 'Revoke' },
                  ],
                },
              }}
            />
          </Show>
          <div class="platform-inline-actions">
            <Button onClick={() => go('app-users')}>
              {access.assignment.pending
                ? 'Stop waiting'
                : 'Back to application users'}
            </Button>
          </div>
        </DashboardPanel>
      </Show>
    </Show>
  )
}
