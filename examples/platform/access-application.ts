import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  untrack,
} from 'solid-js'
import { createForm } from '@wfe/form'
import { createTable } from '@wfe/components/table'
import type { PlatformRoute } from './route'
import type {
  AccessValues,
  Authority,
  PlatformUser,
  PlatformMember,
  createPlatformClient,
} from './provider'
import type { Outcome } from './snapshot/runtime/wire'

export type UserProjectAccess = {
  project: string
  member?: PlatformMember
  error?: string
}
type State = { loading: boolean; error?: string }
export function accessFailure(
  outcome: Exclude<Outcome<unknown>, { status: 'completed' }>,
) {
  if (outcome.status === 'refused')
    return `${outcome.text ?? `The operation refused the request (${outcome.code}).`}${outcome.detail == null ? '' : ` Details: ${JSON.stringify(outcome.detail)}`}`
  if (outcome.status === 'uncertain')
    return `${outcome.reason} Refresh before submitting another command.`
  return 'The operation returned a partial reply. Refresh before submitting another command.'
}
function unique<T extends { principalId: string }>(rows: readonly T[]): T[] {
  if (new Set(rows.map((row) => row.principalId)).size !== rows.length)
    throw new Error('The reply contains duplicate user identities.')
  return [...rows]
}
function peopleTable<T extends PlatformUser | PlatformMember>(
  rows: () => T[],
  members: boolean,
) {
  return createTable({
    source: {
      ids: () => rows().map((row) => row.principalId),
      get: (id) => rows().find((row) => row.principalId === id),
    },
    columns: [
      {
        id: 'actions',
        accessorKey: 'principalId',
        header: 'Actions',
        size: members ? 80 : 140,
        enableGlobalFilter: false,
        enableHiding: false,
      },
      {
        id: 'displayName',
        accessorKey: 'displayName',
        header: 'Name',
        size: 210,
        sortFn: (a, b) => String(a).localeCompare(String(b)),
      },
      {
        id: 'email',
        accessorKey: 'email',
        header: 'Email',
        size: 260,
        sortFn: (a, b) => String(a).localeCompare(String(b)),
      },
      {
        id: 'orgAdmin',
        accessorKey: 'orgAdmin',
        header: 'Organization administrator',
        size: 190,
        sortFn: (a, b) => Number(a) - Number(b),
      },
      ...(members
        ? [
            {
              id: 'projectAdmin',
              accessorKey: 'projectAdmin' as keyof T,
              header: 'Project administrator',
              size: 180,
              sortFn: (a: unknown, b: unknown) => Number(a) - Number(b),
            },
            {
              id: 'environments',
              accessorKey: 'environments' as keyof T,
              header: 'Environments',
              size: 220,
              sortFn: (a: unknown, b: unknown) =>
                String(a).localeCompare(String(b)),
            },
          ]
        : [
            {
              id: 'status',
              accessorKey: 'status' as keyof T,
              header: 'Status',
              size: 120,
              sortFn: (a: unknown, b: unknown) =>
                String(a).localeCompare(String(b)),
            },
          ]),
    ],
  })
}
export function createAccessApplication(
  client: ReturnType<typeof createPlatformClient>,
  route: () => PlatformRoute,
  authority: () => Authority | undefined,
  projects: () => readonly { name: string }[],
  reload: () => Promise<void>,
) {
  const [users, setUsers] = createSignal<PlatformUser[]>([])
  const [grants, setGrants] = createSignal<UserProjectAccess[]>([])
  const [grantsState, setGrantsState] = createSignal<State>({ loading: false })
  const [members, setMembers] = createSignal<PlatformMember[]>([])
  const [state, setState] = createSignal<State>({ loading: false })
  const [environments, setEnvironments] = createSignal<string[]>([])
  const [choicesState, setChoicesState] = createSignal<State>({
    loading: false,
  })
  const [completed, setCompleted] = createSignal('')
  const [values, setValues] = createSignal<AccessValues>({
    kind: 'environment',
    action: 'grant',
    project: '',
    env: '',
  })
  const usersTable = peopleTable(users, false),
    membersTable = peopleTable(members, true)
  let alive = true,
    readSequence = 0,
    choiceSequence = 0,
    commandSequence = 0
  let environmentsProject = ''
  let readAbort: AbortController | undefined,
    choiceAbort: AbortController | undefined
  const allowed = (
    kind: string,
    project: string,
    access = untrack(authority),
  ) =>
    Boolean(
      access &&
      (kind === 'organization'
        ? access.orgAdmin
        : access.orgAdmin ||
          access.projects.some(
            (row) => row.project === project && row.projectAdmin,
          )),
    )
  const form = createForm<AccessValues>({
    values,
    defaults: () => ({
      kind: 'environment',
      action: 'grant',
      project: '',
      env: '',
    }),
    onValuesChange: setValues,
    validate(snapshot) {
      const fields: Partial<Record<keyof AccessValues, string>> = {}
      if (!['organization', 'project', 'environment'].includes(snapshot.kind))
        fields.kind = 'Select an access scope.'
      if (!['grant', 'revoke'].includes(snapshot.action))
        fields.action = 'Select a command.'
      if (
        snapshot.kind !== 'organization' &&
        !untrack(projects).some((row) => row.name === snapshot.project)
      )
        fields.project = 'Select an available project.'
      if (
        snapshot.kind === 'environment' &&
        (environmentsProject !== snapshot.project ||
          untrack(choicesState).loading ||
          untrack(choicesState).error ||
          !untrack(environments).includes(snapshot.env))
      )
        fields.env = 'Select an available environment.'
      return { fields }
    },
    async onSubmit(snapshot, context) {
      const current = untrack(route)
      if (
        current.screen !== 'access' ||
        !allowed(snapshot.kind, snapshot.project)
      )
        return {
          ok: false,
          errors: { form: 'Access was refused for this operation.' },
        }
      const sequence = ++commandSequence
      readSequence++
      readAbort?.abort()
      setGrants([])
      setGrantsState({
        loading: false,
        error: 'Refresh to read current project access.',
      })
      setCompleted('')
      const outcome = await client.access(
        snapshot.kind,
        snapshot.action,
        {
          principalId: current.principal,
          project: snapshot.project,
          env: snapshot.env,
        },
        crypto.randomUUID(),
        context.signal,
      )
      if (!alive || context.signal.aborted || sequence !== commandSequence)
        return {
          ok: false,
          errors: {
            form: 'The application stopped waiting. The command can still complete.',
          },
        }
      if (outcome.status !== 'completed')
        return { ok: false, errors: { form: accessFailure(outcome) } }
      setCompleted('The command completed.')
      await reload()
      if (!alive || context.signal.aborted || sequence !== commandSequence)
        return {
          ok: false,
          errors: {
            form: 'The command completed. Refresh to read the current access.',
          },
        }
      return { ok: true }
    },
  })
  const choiceTarget = createMemo(
    () => ({
      project: form.values.project,
      screen: route().screen,
      kind: form.values.kind,
      access: authority(),
    }),
    {
      equals: (a, b) =>
        a.project === b.project &&
        a.screen === b.screen &&
        a.kind === b.kind &&
        a.access === b.access,
    },
  )
  createEffect(choiceTarget, ({ project, screen, kind }) => {
    const sequence = ++choiceSequence
    choiceAbort?.abort()
    environmentsProject = ''
    setEnvironments([])
    setChoicesState({ loading: false })
    if (
      !alive ||
      screen !== 'access' ||
      kind !== 'environment' ||
      !project ||
      !allowed(kind, project)
    )
      return
    const abort = new AbortController()
    choiceAbort = abort
    setChoicesState({ loading: true })
    void client.environments(project, abort.signal).then((outcome) => {
      if (!alive || abort.signal.aborted || sequence !== choiceSequence) return
      if (outcome.status !== 'completed') {
        setChoicesState({ loading: false, error: accessFailure(outcome) })
        return
      }
      const names = outcome.value.environments
      if (names.some((name) => !name) || new Set(names).size !== names.length) {
        setChoicesState({
          loading: false,
          error: 'The reply contains missing or duplicate environment names.',
        })
        return
      }
      environmentsProject = project
      setEnvironments([...names])
      setChoicesState({ loading: false })
    })
  })
  function enter(previous: PlatformRoute, next: PlatformRoute) {
    readSequence++
    readAbort?.abort()
    if (
      previous.screen === 'access' &&
      (next.screen !== 'access' || next.principal !== previous.principal)
    ) {
      commandSequence++
      form.cancel()
    }
    if (
      next.screen === 'access' &&
      (previous.screen !== 'access' || next.principal !== previous.principal)
    ) {
      form.reset()
      setCompleted('')
    }
  }
  async function load(target: PlatformRoute, access = untrack(authority)) {
    const sequence = ++readSequence
    readAbort?.abort()
    setGrants([])
    setGrantsState({ loading: false })
    if (!['users', 'members', 'access'].includes(target.screen)) return
    setUsers([])
    setMembers([])
    if (
      !access ||
      (!access.orgAdmin && !access.projects.some((row) => row.projectAdmin)) ||
      (target.screen === 'members' &&
        !allowed('project', target.project, access))
    ) {
      setState({
        loading: false,
        error: 'Access was refused for this operation.',
      })
      return
    }
    const abort = new AbortController()
    readAbort = abort
    setState({ loading: true })
    const result =
      target.screen === 'members'
        ? await client.members(target.project, abort.signal)
        : await client.users(abort.signal)
    if (!alive || abort.signal.aborted || sequence !== readSequence) return
    if (result.status !== 'completed') {
      setState({ loading: false, error: accessFailure(result) })
      return
    }
    try {
      if ('users' in result.value) setUsers(unique(result.value.users))
      else setMembers(unique(result.value.members))
      if (
        target.screen === 'access' &&
        'users' in result.value &&
        !result.value.users.some((row) => row.principalId === target.principal)
      )
        throw new Error('This user is unavailable in the current scope.')
      setState({ loading: false })
      if (target.screen === 'access') {
        setGrantsState({ loading: true })
        // Only read projects that the current administrator can inspect.
        for (const project of untrack(projects).filter((row) =>
          allowed('project', row.name, access),
        )) {
          const outcome = await client.members(project.name, abort.signal)
          if (!alive || abort.signal.aborted || sequence !== readSequence)
            return
          let row: UserProjectAccess = { project: project.name }
          if (outcome.status !== 'completed') row.error = accessFailure(outcome)
          else {
            try {
              row.member = unique(outcome.value.members).find(
                (member) => member.principalId === target.principal,
              )
            } catch (error) {
              row.error = String(error)
            }
          }
          setGrants((previous) => [...previous, row])
        }
        setGrantsState({ loading: false })
      }
    } catch (error) {
      setState({ loading: false, error: String(error) })
    }
  }
  onCleanup(() => {
    alive = false
    readSequence++
    choiceSequence++
    commandSequence++
    readAbort?.abort()
    choiceAbort?.abort()
  })
  return {
    users,
    grants,
    grantsState,
    members,
    state,
    environments,
    choicesState,
    completed,
    form,
    usersTable,
    membersTable,
    allowed,
    enter,
    load,
  }
}
