import { createAccessApplication } from './access-application'
import { createSignal, onCleanup, untrack } from 'solid-js'
import { createForm } from '@wfe/form'
import { createTable } from '@wfe/components/table'
import {
  createPlatformClient,
  createPlatformMock,
  projectError,
} from './provider'
import type {
  Authority,
  EnvironmentStatus,
  PlatformScenario,
  ProjectValues,
} from './provider'
import type { Outcome } from './snapshot/runtime/wire'
import { refusedMember } from './snapshot/runtime/transport'
import type { PlatformRoute } from './route'

export type NameRow = { name: string }
type ReadState = { loading: boolean; error?: string }
export function outcomeMessage(
  outcome: Exclude<Outcome<unknown>, { status: 'completed' }>,
) {
  if (outcome.status === 'refused') {
    if (
      outcome.code === 'permission-denied' ||
      outcome.code === 'permission_denied'
    )
      return 'Access was refused for this operation.'
    return (
      outcome.text ??
      `The operation refused the request (${outcome.code ?? 'unknown reason'}).`
    )
  }
  return outcome.status === 'uncertain'
    ? outcome.reason
    : 'The operation returned a partial reply.'
}
function nameRows(names: readonly string[]): NameRow[] {
  if (new Set(names).size !== names.length || names.some((name) => !name))
    throw new Error('The reply contains missing or duplicate record names.')
  return names.map((name) => ({ name }))
}
function nameTable(rows: () => NameRow[]) {
  return createTable({
    source: {
      ids: () => rows().map((row) => row.name),
      get: (id) => rows().find((row) => row.name === id),
    },
    columns: [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Name',
        size: 320,
        sortFn: (a, b) => String(a).localeCompare(String(b)),
        filterFn: (value, filter) =>
          String(value).toLowerCase().includes(String(filter).toLowerCase()),
      },
      {
        id: 'actions',
        enableGlobalFilter: false,
        accessorKey: 'name',
        header: 'Actions',
        size: 150,
        enableHiding: false,
      },
    ],
  })
}
export function createPlatformApplication(
  initial: PlatformRoute,
  scenario: PlatformScenario = 'normal',
  mock = createPlatformMock(scenario),
) {
  const client = createPlatformClient(mock.transport)
  const [route, setRoute] = createSignal(initial)
  const [authority, setAuthority] = createSignal<Authority>()
  const [projects, setProjects] = createSignal<NameRow[]>([])
  const [environments, setEnvironments] = createSignal<NameRow[]>([])
  const [session, setSession] = createSignal<ReadState>({ loading: true })
  const [listing, setListing] = createSignal<ReadState>({ loading: false })
  const [detail, setDetail] = createSignal<ReadState>({ loading: false })
  const [status, setStatus] = createSignal<EnvironmentStatus>()
  const [notice, setNotice] = createSignal('')
  const [created, setCreated] = createSignal('')
  const [values, setValues] = createSignal<ProjectValues>({ project: '' })
  const projectsTable = nameTable(projects),
    environmentsTable = nameTable(environments)
  let alive = true,
    sessionSequence = 0,
    listSequence = 0,
    detailSequence = 0,
    createSequence = 0
  let listAbort: AbortController | undefined,
    detailAbort: AbortController | undefined,
    sessionAbort: AbortController | undefined
  const form = createForm<ProjectValues>({
    values,
    defaults: () => ({ project: '' }),
    onValuesChange: setValues,
    validate: (snapshot) => {
      const error = projectError(snapshot.project)
      return error ? { fields: { project: error } } : {}
    },
    async onSubmit(snapshot, context) {
      if (
        untrack(session).loading ||
        untrack(session).error ||
        !untrack(authority)?.orgAdmin
      )
        return {
          ok: false,
          errors: { form: 'Access was refused for this operation.' },
        }
      const sequence = ++createSequence
      const outcome = await client.create(
        snapshot,
        crypto.randomUUID(),
        context.signal,
      )
      if (!alive || context.signal.aborted || sequence !== createSequence)
        return {
          ok: false,
          errors: {
            form: 'The application stopped waiting. Refresh to read the current server result.',
          },
        }
      if (outcome.status !== 'completed') {
        if (
          outcome.status === 'refused' &&
          ['project', 'value.project'].includes(
            refusedMember(outcome.detail) ?? '',
          ) &&
          (outcome.code === 'project_exists' ||
            outcome.code === 'invalid_input')
        )
          return {
            ok: false,
            errors: { fields: { project: outcomeMessage(outcome) } },
          }
        return {
          ok: false,
          errors: {
            form:
              outcome.status === 'uncertain'
                ? `${outcomeMessage(outcome)} Refresh projects before submitting another command.`
                : outcomeMessage(outcome),
          },
        }
      }
      // A completed command establishes the new project before its link appears.
      listSequence++
      listAbort?.abort()
      const name = outcome.value.project
      setProjects((current) =>
        current.some((row) => row.name === name)
          ? current
          : [...current, { name }].sort((a, b) => a.name.localeCompare(b.name)),
      )
      setListing({ loading: false })
      setCreated(name)
      return { ok: true }
    },
  })
  const access = createAccessApplication(
    client,
    route,
    () => (!session().loading && !session().error ? authority() : undefined),
    projects,
    initialize,
  )
  async function loadProjects(access = untrack(authority)) {
    if (!alive || !access) return
    const sequence = ++listSequence
    listAbort?.abort()
    const abort = new AbortController()
    listAbort = abort
    setListing({ loading: true })
    const outcome = access.orgAdmin
      ? await client.projects(abort.signal)
      : {
          status: 'completed' as const,
          value: { projects: access.projects.map((row) => row.project) },
        }
    if (!alive || sequence !== listSequence || abort.signal.aborted) return
    if (outcome.status !== 'completed') {
      setListing({ loading: false, error: outcomeMessage(outcome) })
      return
    }
    try {
      setProjects(nameRows(outcome.value.projects))
      setListing({ loading: false })
    } catch (error) {
      setListing({ loading: false, error: String(error) })
    }
  }
  async function loadTarget(
    target: PlatformRoute,
    acceptedAuthority = untrack(authority),
  ) {
    const sequence = ++detailSequence
    detailAbort?.abort()
    setStatus(undefined)
    setDetail({ loading: false })
    if (['users', 'members', 'access'].includes(target.screen)) {
      await access.load(target, acceptedAuthority)
      return
    }
    if (!('project' in target)) return
    if (!untrack(projects).some((row) => row.name === target.project)) {
      setEnvironments([])
      setDetail({
        loading: false,
        error: 'This project is unavailable in the current scope.',
      })
      return
    }
    const abort = new AbortController()
    detailAbort = abort
    setDetail({ loading: true })
    const current = () => {
      const now = untrack(route)
      return (
        alive &&
        sequence === detailSequence &&
        !abort.signal.aborted &&
        now.screen === target.screen &&
        'project' in now &&
        now.project === target.project &&
        (!('env' in target) || ('env' in now && now.env === target.env))
      )
    }
    if (target.screen === 'project') {
      setEnvironments([])
      const outcome = await client.environments(target.project, abort.signal)
      if (!current()) return
      if (outcome.status !== 'completed') {
        setDetail({ loading: false, error: outcomeMessage(outcome) })
        return
      }
      try {
        setEnvironments(nameRows(outcome.value.environments))
        setDetail({ loading: false })
      } catch (error) {
        setDetail({ loading: false, error: String(error) })
      }
    } else if (target.screen === 'environment') {
      const outcome = await client.status(
        target.project,
        target.env,
        abort.signal,
      )
      if (!current()) return
      if (outcome.status !== 'completed') {
        setDetail({ loading: false, error: outcomeMessage(outcome) })
        return
      }
      setStatus(outcome.value)
      setDetail({ loading: false })
    }
  }
  async function initialize() {
    listSequence++
    detailSequence++
    listAbort?.abort()
    detailAbort?.abort()
    setAuthority(undefined)
    const sequence = ++sessionSequence
    sessionAbort?.abort()
    sessionAbort = new AbortController()
    setSession({ loading: true })
    const outcome = await client.mine(sessionAbort.signal)
    if (!alive || sequence !== sessionSequence) return
    if (outcome.status !== 'completed') {
      setSession({ loading: false, error: outcomeMessage(outcome) })
      return
    }
    setAuthority(outcome.value)
    await loadProjects(outcome.value)
    if (!alive || sequence !== sessionSequence) return
    const error = untrack(listing).error
    if (error) {
      setSession({ loading: false, error })
      return
    }
    setSession({ loading: false })
    await loadTarget(untrack(route), outcome.value)
  }
  function enter(next: PlatformRoute) {
    if (!alive) return
    const previous = untrack(route)
    if (
      previous.screen === 'access' &&
      access.form.pending &&
      (next.screen !== 'access' || next.principal !== previous.principal)
    )
      setNotice(
        'The application stopped waiting. The command can still complete. Refresh to read the current result.',
      )
    access.enter(previous, next)
    if (previous.screen === 'create' && next.screen !== 'create') {
      if (form.pending)
        setNotice(
          'The application stopped waiting. The command can still complete. Refresh to read the current result.',
        )
      createSequence++
      form.cancel()
    }
    if (next.screen === 'create' && previous.screen !== 'create') {
      form.reset()
      setCreated('')
    }
    setRoute(next)
    if (!untrack(session).loading && !untrack(session).error)
      void loadTarget(next)
  }
  async function refresh() {
    if (!alive) return
    setNotice('')
    const target = untrack(route)
    if (['users', 'members', 'access'].includes(target.screen))
      await initialize()
    else if (target.screen === 'projects') await loadProjects()
    else await loadTarget(target)
  }
  onCleanup(() => {
    alive = false
    sessionSequence++
    listSequence++
    detailSequence++
    createSequence++
    sessionAbort?.abort()
    listAbort?.abort()
    detailAbort?.abort()
    mock.dispose()
  })
  return {
    route,
    access,
    authority,
    projects,
    environments,
    session,
    listing,
    detail,
    status,
    notice,
    created,
    form,
    projectsTable,
    environmentsTable,
    initialize,
    refresh,
    enter,
    mock,
  }
}
