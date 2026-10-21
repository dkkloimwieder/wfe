import { createSignal, onCleanup, untrack } from 'solid-js'
import { createForm } from '@wfe/form'
import { createTable } from '@wfe/components/table'
import { accessFailure } from './access-application'
import {
  createApplicationAccessClient,
  createApplicationAccessMock,
} from './application-access-provider'
import type {
  ApplicationScope,
  ApplicationUser,
  ApplicationAuthority,
  RolePermissions,
} from './application-access-provider'

export type ApplicationAccessTarget = ApplicationScope &
  (
    | { screen: 'app-users' | 'app-roles' }
    | { screen: 'app-user'; principal: string }
    | { screen: 'app-role'; role: string }
  )
export type AssignmentValues = { role: string; action: 'grant' | 'revoke' }
const sortText = (a: unknown, b: unknown) =>
  String(a ?? '').localeCompare(String(b ?? ''))
const sortBoolean = (a: unknown, b: unknown) => Number(a) - Number(b)
type State = { loading: boolean; error?: string }
const targetKey = (target: ApplicationAccessTarget) =>
  JSON.stringify([
    target.project,
    target.env,
    target.screen,
    'principal' in target ? target.principal : null,
    'role' in target ? target.role : null,
  ])
function unique<T>(rows: readonly T[], key: (row: T) => string): T[] {
  const ids = rows.map(key)
  if (ids.some((id) => !id) || new Set(ids).size !== ids.length)
    throw new Error('The reply contains missing or duplicate identities.')
  return [...rows]
}

/** Owns this mock application's requests and commands, never shared UI policy. */
export function createApplicationAccessApplication(
  mock = createApplicationAccessMock(),
) {
  const [target, setTarget] = createSignal<ApplicationAccessTarget>()
  const [authority, setAuthority] = createSignal<ApplicationAuthority>()
  const [state, setState] = createSignal<State>({ loading: false })
  const [users, setUsers] = createSignal<ApplicationUser[]>([])
  const [roles, setRoles] = createSignal<string[]>([])
  const [permissions, setPermissions] = createSignal<RolePermissions>()
  const [completed, setCompleted] = createSignal('')
  const [command, setCommand] = createSignal<State>({ loading: false })
  const defaults = (): AssignmentValues => ({ role: '', action: 'grant' })
  const [values, setValues] = createSignal<AssignmentValues>(defaults())
  let alive = true,
    readSequence = 0,
    commandSequence = 0
  let activeTarget: ApplicationAccessTarget | undefined
  let acceptedAuthority: ApplicationAuthority | undefined
  let readReady = false
  let readAbort: AbortController | undefined,
    commandAbort: AbortController | undefined
  const client = (scope: ApplicationScope) =>
    createApplicationAccessClient(mock.transport(scope))
  const current = (snapshot: ApplicationAccessTarget) => {
    const now = activeTarget
    return alive && now !== undefined && targetKey(now) === targetKey(snapshot)
  }
  const allowed = () => readReady && Boolean(acceptedAuthority?.admin)
  const selectedUser = () => {
    const selected = target()
    return selected?.screen === 'app-user'
      ? users().find((row) => row.id === selected.principal)
      : undefined
  }
  const usersTable = createTable({
    source: {
      ids: () => users().map((row) => row.id),
      get: (id) => users().find((row) => row.id === id),
    },
    columns: [
      {
        id: 'actions',
        accessorKey: 'id',
        header: 'Actions',
        size: 48,
        enableHiding: false,
        enableGlobalFilter: false,
      },
      {
        id: 'name',
        accessorFn: (row) => row.displayName ?? row.email,
        header: 'Name',
        sortFn: sortText,
        size: 220,
      },
      {
        id: 'email',
        accessorKey: 'email',
        header: 'Email',
        sortFn: sortText,
        size: 260,
      },
      {
        id: 'roles',
        accessorFn: (row) => row.roles.join(', '),
        header: 'Assigned roles',
        sortFn: sortText,
        size: 220,
      },
      {
        id: 'adminCovered',
        accessorKey: 'adminCovered',
        header: 'Administrator coverage',
        sortFn: sortBoolean,
        size: 220,
      },
    ],
  })
  const rolesTable = createTable({
    source: {
      ids: roles,
      get: (id) => (roles().includes(id) ? { name: id } : undefined),
    },
    columns: [
      {
        id: 'actions',
        accessorKey: 'name',
        header: 'Actions',
        size: 48,
        enableHiding: false,
        enableGlobalFilter: false,
      },
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Role',
        sortFn: sortText,
        size: 300,
      },
    ],
  })
  const permissionRows = () => permissions()?.operations ?? []
  const permissionsTable = createTable({
    source: {
      ids: () => permissionRows().map((row) => row.operation),
      get: (id) => permissionRows().find((row) => row.operation === id),
    },
    columns: [
      {
        id: 'actions',
        accessorKey: 'operation',
        header: 'Actions',
        size: 48,
        enableHiding: false,
        enableGlobalFilter: false,
      },
      {
        id: 'operation',
        accessorKey: 'operation',
        header: 'Operation',
        sortFn: sortText,
        size: 420,
      },
      {
        id: 'selected',
        accessorKey: 'selected',
        header: 'Stored permission',
        sortFn: sortBoolean,
        size: 180,
      },
      {
        id: 'served',
        accessorKey: 'served',
        header: 'Served',
        sortFn: sortBoolean,
        size: 100,
      },
      {
        id: 'grantable',
        accessorKey: 'grantable',
        header: 'Grantable',
        sortFn: sortBoolean,
        size: 120,
      },
      {
        id: 'adminOnly',
        accessorKey: 'adminOnly',
        header: 'Administrator only',
        sortFn: sortBoolean,
        size: 200,
      },
    ],
  })
  const assignment = createForm<AssignmentValues>({
    values,
    defaults,
    onValuesChange: setValues,
    validate(snapshot) {
      const fields: Partial<Record<keyof AssignmentValues, string>> = {}
      if (!untrack(roles).includes(snapshot.role))
        fields.role = 'Select an available role.'
      if (!['grant', 'revoke'].includes(snapshot.action))
        fields.action = 'Select a command.'
      return { fields }
    },
    async onSubmit(snapshot, context) {
      const selected = activeTarget,
        person = untrack(selectedUser)
      if (
        !selected ||
        selected.screen !== 'app-user' ||
        !person ||
        person.id !== selected.principal ||
        !allowed()
      )
        return {
          ok: false,
          errors: { form: 'Application administration is unavailable.' },
        }
      if (
        snapshot.action === 'revoke' &&
        snapshot.role === 'admin' &&
        person.adminCovered
      )
        return {
          ok: false,
          errors: {
            form: 'This administrator role is covered by project administration.',
          },
        }
      const sequence = ++commandSequence
      setCompleted('')
      const outcome = await client(selected).assign(
        snapshot.action,
        person.id,
        snapshot.role,
        crypto.randomUUID(),
        context.signal,
      )
      if (
        !current(selected) ||
        context.signal.aborted ||
        sequence !== commandSequence
      )
        return {
          ok: false,
          errors: {
            form: 'The application stopped waiting. The command can still complete.',
          },
        }
      if (outcome.status !== 'completed')
        return { ok: false, errors: { form: accessFailure(outcome) } }
      setCompleted(
        `Role ${snapshot.action === 'grant' ? 'grant' : 'revoke'} completed.`,
      )
      await refresh()
      return { ok: true }
    },
  })
  function leave() {
    if (!alive) return
    readSequence++
    commandSequence++
    readAbort?.abort()
    commandAbort?.abort()
    commandAbort = undefined
    acceptedAuthority = undefined
    readReady = false
    assignment.cancel()
    activeTarget = undefined
    setTarget(undefined)
    setAuthority(undefined)
    setUsers([])
    setRoles([])
    setPermissions(undefined)
    setState({ loading: false })
    setCommand({ loading: false })
    setCompleted('')
  }
  async function load(next: ApplicationAccessTarget) {
    if (!alive) return
    const previous = activeTarget
    if (!previous || targetKey(previous) !== targetKey(next)) {
      leave()
      assignment.reset()
      activeTarget = Object.freeze({ ...next })
      setTarget(activeTarget)
    }
    await refresh()
  }
  async function refresh() {
    const selected = activeTarget
    if (!alive || !selected) return
    const sequence = ++readSequence
    readAbort?.abort()
    const abort = new AbortController()
    readAbort = abort
    acceptedAuthority = undefined
    readReady = false
    setAuthority(undefined)
    setState({ loading: true })
    const isCurrent = () =>
      current(selected) && sequence === readSequence && !abort.signal.aborted
    const api = client(selected)
    try {
      const caller = await api.mine(abort.signal)
      if (!isCurrent()) return
      if (caller.status !== 'completed') throw new Error(accessFailure(caller))
      acceptedAuthority = caller.value
      setAuthority(caller.value)
      if (!caller.value.admin)
        throw new Error(
          'Application administration is not available for this caller.',
        )
      const names = await api.roles(abort.signal)
      if (!isCurrent()) return
      if (names.status !== 'completed') throw new Error(accessFailure(names))
      const available = unique(names.value.roles, (name) => name)
      setRoles(available)
      if (selected.screen === 'app-users' || selected.screen === 'app-user') {
        const people = await api.users(abort.signal)
        if (!isCurrent()) return
        if (people.status !== 'completed')
          throw new Error(accessFailure(people))
        const accepted = unique(people.value.users, (row) => row.id)
        for (const person of accepted) unique(person.roles, (name) => name)
        if (
          selected.screen === 'app-user' &&
          !accepted.some((person) => person.id === selected.principal)
        )
          throw new Error('This user is unavailable in the application.')
        setUsers(accepted)
      } else if (selected.screen === 'app-role') {
        if (!available.includes(selected.role))
          throw new Error('This role is unavailable in the application.')
        const detail = await api.permissions(selected.role, abort.signal)
        if (!isCurrent()) return
        if (detail.status !== 'completed')
          throw new Error(accessFailure(detail))
        setPermissions({
          ...detail.value,
          operations: unique(detail.value.operations, (row) => row.operation),
        })
      }
      readReady = true
      setState({ loading: false })
    } catch (error) {
      if (!isCurrent()) return
      setUsers([])
      setRoles([])
      setPermissions(undefined)
      setState({ loading: false, error: String(error) })
    }
  }
  async function changePermission(
    action: 'grant' | 'revoke',
    operation: string,
  ) {
    if (!alive) return
    const selected = activeTarget,
      detail = untrack(permissions)
    const row = detail?.operations.find(
      (entry) => entry.operation === operation,
    )
    if (
      !selected ||
      selected.screen !== 'app-role' ||
      !allowed() ||
      commandAbort !== undefined ||
      !detail ||
      detail.role !== selected.role ||
      detail.admin ||
      !row ||
      (action === 'grant'
        ? row.selected || !row.served || !row.grantable
        : !row.selected)
    )
      return
    const sequence = ++commandSequence,
      abort = new AbortController()
    commandAbort = abort
    setCommand({ loading: true })
    setCompleted('')
    const outcome = await client(selected).changePermission(
      action,
      selected.role,
      operation,
      crypto.randomUUID(),
      abort.signal,
    )
    if (
      !current(selected) ||
      sequence !== commandSequence ||
      abort.signal.aborted
    )
      return
    if (outcome.status !== 'completed') {
      commandAbort = undefined
      setCommand({ loading: false, error: accessFailure(outcome) })
      return
    }
    setCompleted(
      `Permission ${action === 'grant' ? 'grant' : 'revoke'} completed.`,
    )
    await refresh()
    if (current(selected) && sequence === commandSequence) {
      commandAbort = undefined
      setCommand({ loading: false })
    }
  }
  onCleanup(() => {
    alive = false
    readSequence++
    commandSequence++
    readAbort?.abort()
    commandAbort?.abort()
    mock.dispose()
  })
  return {
    target,
    authority,
    state,
    users,
    roles,
    permissions,
    completed,
    command,
    assignment,
    selectedUser,
    usersTable,
    rolesTable,
    permissionsTable,
    load,
    refresh,
    leave,
    changePermission,
    mock,
  }
}
