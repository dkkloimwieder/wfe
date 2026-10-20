import * as z from 'zod/mini'
import * as user from './snapshot/client/user'
import * as member from './snapshot/client/member'
import * as orgAdminClient from './snapshot/client/org_admin'
import * as projectAdminClient from './snapshot/client/project_admin'
import * as control from './snapshot/client/control'
import * as project from './snapshot/client/project'
import * as environment from './snapshot/client/environment'
import { classify } from './snapshot/runtime/transport'
import type { HttpReply } from './snapshot/runtime/transport'
import type {
  JsonValue,
  Outcome,
  Transport,
  WireRequest,
} from './snapshot/runtime/wire'

export type PlatformUser = user.UserListResultUsers
export type PlatformMember = member.MemberListResultMembers
export type AccessValues = {
  kind: string
  action: string
  project: string
  env: string
}
export type AccessTarget = { principalId: string; project: string; env: string }
export const MOCK_ACTOR = '00000000-0000-4000-8000-000000000001'
export type EnvironmentStatus = environment.EnvironmentStatusResult
export type Authority = control.ControlMineResult
export type ProjectValues = { project: string }
const scopeBytes = new TextEncoder()
/** Rust str::trim uses Unicode White_Space, which differs from JS trim. */
export const canonicalProject = (value: string) =>
  value.replace(/^\p{White_Space}+|\p{White_Space}+$/gu, '')
export function projectError(value: string): string | undefined {
  const length = scopeBytes.encode(canonicalProject(value)).length
  return length >= 1 && length <= 40
    ? undefined
    : 'Use 1 to 40 UTF-8 bytes for the project name.'
}
const principal = z
  .string()
  .check(
    z.regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  )
const userSchema = z.object({
  users: z.array(
    z.object({
      principalId: principal,
      email: z.string(),
      displayName: z.string(),
      status: z.string(),
      orgAdmin: z.boolean(),
    }),
  ),
})
const invitationWireSchema = z.object({
  display_name: z.string(),
  email: z.string(),
  org_admin: z.nullable(z.boolean()),
  memberships: z.array(z.object({ project: z.string(), env: z.string() })),
  project_admins: z.array(z.string()),
})
const memberSchema = z.object({
  members: z.array(
    z.object({
      principalId: principal,
      email: z.string(),
      displayName: z.string(),
      orgAdmin: z.boolean(),
      projectAdmin: z.boolean(),
      environments: z.array(z.string()),
    }),
  ),
})
const count = z.int32()
const statusSchema = z.object({
  digest: z.nullable(z.string()),
  rollout: z.object({
    replicas: count,
    updatedReplicas: count,
    readyReplicas: count,
    availableReplicas: count,
  }),
  workloads: z.array(
    z.object({
      name: z.string(),
      conditions: z.array(z.object({ type: z.string(), status: z.string() })),
    }),
  ),
  live: z.array(z.object({ digest: z.string(), pods: count })),
})
const names = (key: 'projects' | 'environments') =>
  z.object({ [key]: z.array(z.string()) })
const mineSchema = z.object({
  orgAdmin: z.boolean(),
  projects: z.array(
    z.object({ project: z.string(), projectAdmin: z.boolean() }),
  ),
})
const uncertain = (reason: string): Outcome<never> => ({
  status: 'uncertain',
  reason,
  retryRefusal: null,
})

/** The application checks returned shapes; generated field maps only rename them. */
export function createPlatformClient(transport: Transport) {
  async function call<T>(
    invoke: (checked: Transport) => Promise<Outcome<T>>,
    schema: { safeParse: (value: unknown) => { success: boolean } },
    signal?: AbortSignal,
  ): Promise<Outcome<T>> {
    if (signal?.aborted)
      return uncertain('The application stopped waiting for this request.')
    let abort: (() => void) | undefined
    const stopped = new Promise<Outcome<T>>((resolve) => {
      abort = () =>
        resolve(
          uncertain(
            'The application stopped waiting. The operation can still complete.',
          ),
        )
      signal?.addEventListener('abort', abort, { once: true })
    })
    const operation = (async () => {
      try {
        const outcome = await invoke(transport)
        if (outcome.status === 'completed') {
          if (!schema.safeParse(outcome.value).success)
            return uncertain('The reply does not match the operation result.')
        } else if (outcome.status === 'partiallyCompleted') {
          return uncertain('This screen cannot apply a partial reply.')
        }
        return outcome
      } catch {
        return uncertain('The request did not establish completion.')
      }
    })()
    try {
      return await Promise.race([operation, stopped])
    } finally {
      if (abort) signal?.removeEventListener('abort', abort)
    }
  }
  return {
    invite: (
      value: user.UserInviteRequestValue,
      requestId: string,
      signal?: AbortSignal,
    ) =>
      call(
        (t) => user.invite(t, [{ requestId, value }]),
        z.object({
          principalId: principal,
          invited: z.boolean(),
          enrolled: z.boolean(),
        }),
        signal,
      ),
    lifecycle: (
      command: 'activate' | 'deactivate',
      principalId: string,
      requestId: string,
      signal?: AbortSignal,
    ) =>
      call(
        (t) => user[command](t, [{ requestId, value: { principalId } }]),
        z.object({ principalId: z.literal(principalId), status: z.string() }),
        signal,
      ),
    users: (signal?: AbortSignal) =>
      call((t) => user.list(t, [{}]), userSchema, signal),
    members: (name: string, signal?: AbortSignal) =>
      call((t) => member.list(t, [{ project: name }]), memberSchema, signal),
    access: (
      kind: string,
      action: string,
      target: AccessTarget,
      requestId: string,
      signal?: AbortSignal,
    ) => {
      const grant = action === 'grant'
      const item = { requestId, value: target }
      const identity = z.literal(target.principalId)
      if (kind === 'organization')
        return call(
          (t) =>
            orgAdminClient[grant ? 'grant' : 'revoke'](t, [
              { requestId, value: { principalId: target.principalId } },
            ]),
          z.object({ principalId: identity, orgAdmin: z.boolean() }),
          signal,
        )
      if (kind === 'project')
        return call(
          (t) =>
            projectAdminClient[grant ? 'grant' : 'revoke'](t, [
              {
                requestId,
                value: {
                  principalId: target.principalId,
                  project: target.project,
                },
              },
            ]),
          z.object({
            principalId: identity,
            project: z.literal(target.project),
            projectAdmin: z.boolean(),
          }),
          signal,
        )
      return call(
        (t) => member[grant ? 'grant' : 'revoke'](t, [item]),
        z.object({
          principalId: identity,
          project: z.literal(target.project),
          env: z.literal(target.env),
          member: z.boolean(),
        }),
        signal,
      )
    },
    mine: (signal?: AbortSignal) =>
      call((t) => control.mine(t, [{}]), mineSchema, signal),
    projects: (signal?: AbortSignal) =>
      call((t) => project.list(t, [{}]), names('projects'), signal),
    environments: (name: string, signal?: AbortSignal) =>
      call(
        (t) => environment.list(t, [{ project: name }]),
        names('environments'),
        signal,
      ),
    status: (name: string, env: string, signal?: AbortSignal) =>
      call(
        (t) => environment.status(t, [{ project: name, env }]),
        statusSchema,
        signal,
      ),
    create: (values: ProjectValues, requestId: string, signal?: AbortSignal) =>
      call(
        (t) =>
          project.create(t, [
            { requestId, value: { project: values.project } },
          ]),
        z.object({ project: z.literal(canonicalProject(values.project)) }),
        signal,
      ),
  }
}

export type PlatformScenario =
  'normal' | 'project-admin' | 'no-access' | 'empty'
/** A deterministic transport fixture, not an authorization implementation. */
export function createPlatformMock(scenario: PlatformScenario = 'normal') {
  const projects = new Map<string, string[]>(
    scenario === 'empty'
      ? []
      : [
          ['billing', ['dev', 'prod']],
          ['shop', ['dev']],
          ['archive', []],
        ],
  )
  let orgAdmin = scenario === 'normal' || scenario === 'empty'
  const users = new Map<string, PlatformUser>([
    [
      MOCK_ACTOR,
      {
        principalId: MOCK_ACTOR,
        email: 'admin@example.test',
        displayName: 'Alex Admin',
        status: 'active',
        orgAdmin,
      },
    ],
    [
      '00000000-0000-4000-8000-000000000002',
      {
        principalId: '00000000-0000-4000-8000-000000000002',
        email: 'ann@example.test',
        displayName: 'Ann Example',
        status: 'active',
        orgAdmin: false,
      },
    ],
    [
      '00000000-0000-4000-8000-000000000003',
      {
        principalId: '00000000-0000-4000-8000-000000000003',
        email: 'inactive@example.test',
        displayName: 'Inactive Example',
        status: 'inactive',
        orgAdmin: false,
      },
    ],
  ])
  const projectAdmins = new Map<string, Set<string>>(
    [...projects.keys()].map((name) => [
      name,
      new Set(
        orgAdmin || (scenario === 'project-admin' && name === 'billing')
          ? [MOCK_ACTOR]
          : [],
      ),
    ]),
  )
  const memberships = new Map<string, Set<string>>([
    ['billing/dev', new Set(['00000000-0000-4000-8000-000000000002'])],
  ])
  function materialize(principalId: string, name: string) {
    const admins = projectAdmins.get(name) ?? new Set<string>()
    admins.add(principalId)
    projectAdmins.set(name, admins)
    for (const env of projects.get(name) ?? []) {
      const key = `${name}/${env}`,
        grants = memberships.get(key) ?? new Set<string>()
      grants.add(principalId)
      memberships.set(key, grants)
    }
  }
  for (const name of projects.keys())
    if (projectAdmins.get(name)?.has(MOCK_ACTOR)) materialize(MOCK_ACTOR, name)
  const accessible = () =>
    orgAdmin
      ? [...projects.keys()]
      : [...projects.keys()].filter((name) =>
          projectAdmins.get(name)?.has(MOCK_ACTOR),
        )
  const sent: WireRequest[] = []
  let override: HttpReply | undefined
  let held: Promise<void> | undefined
  const releases = new Set<() => void>()
  let disposed = false
  function answer(request: WireRequest): HttpReply {
    const item = request.items[0] as Record<string, JsonValue> | undefined
    const id = typeof item?.request_id === 'string' ? item.request_id : null
    const envelope = (data: object): HttpReply => ({
      status: 200,
      body: JSON.stringify([
        { ...(id === null ? {} : { request_id: id }), ...data },
      ]),
    })
    const complete = (value: object) => envelope({ value })
    const refuse = (code: string, field: string) =>
      envelope({ error: { code, detail: { field } } })
    const denied = (): HttpReply => ({
      status: 403,
      body: JSON.stringify({
        error: { code: 'permission-denied', operation: request.operation },
      }),
    })
    if (!item || request.items.length !== 1)
      return { status: 400, body: 'Invalid mock request.' }
    // These outcomes are mockup choices, not application lifecycle or grant policy.
    if (request.operation === user.USER_INVITE_ROUTE.operation) {
      if (!orgAdmin && !accessible().length) return denied()
      const parsed = invitationWireSchema.safeParse(item.value)
      if (!id || !parsed.success) return refuse('invalid_input', 'value')
      const value = parsed.data
      const principalId = crypto.randomUUID()
      users.set(principalId, {
        principalId,
        displayName: value.display_name,
        email: value.email,
        orgAdmin: value.org_admin === true,
        status: 'invited',
      })
      for (const entry of value.memberships) {
        const target = entry
        const key = `${target.project}/${target.env}`
        const rows = memberships.get(key) ?? new Set<string>()
        rows.add(principalId)
        memberships.set(key, rows)
      }
      for (const project of value.project_admins) {
        const rows = projectAdmins.get(String(project)) ?? new Set<string>()
        rows.add(principalId)
        projectAdmins.set(String(project), rows)
      }
      return complete({
        principal_id: principalId,
        invited: true,
        enrolled: false,
      })
    }
    if (
      request.operation === user.USER_ACTIVATE_ROUTE.operation ||
      request.operation === user.USER_DEACTIVATE_ROUTE.operation
    ) {
      if (!orgAdmin) return denied()
      const value = item.value as Record<string, JsonValue> | undefined
      if (!id || typeof value?.principal_id !== 'string')
        return refuse('invalid_input', 'principal_id')
      const row = users.get(value.principal_id)
      if (!row) return refuse('user_not_found', 'principal_id')
      const status =
        request.operation === user.USER_ACTIVATE_ROUTE.operation
          ? 'active'
          : 'inactive'
      users.set(row.principalId, { ...row, status })
      return complete({ principal_id: row.principalId, status })
    }
    if (request.operation === user.USER_LIST_ROUTE.operation) {
      if (!orgAdmin && !accessible().length) return denied()
      return complete({
        users: [...users.values()].map((row) => ({
          principal_id: row.principalId,
          email: row.email,
          display_name: row.displayName,
          status: row.status,
          org_admin: row.orgAdmin,
        })),
      })
    }
    if (request.operation === member.MEMBER_LIST_ROUTE.operation) {
      const name = String(item.project)
      if (!orgAdmin && !projectAdmins.get(name)?.has(MOCK_ACTOR))
        return denied()
      return complete({
        members: [...users.values()]
          .filter(
            (row) =>
              projectAdmins.get(name)?.has(row.principalId) ||
              (projects.get(name) ?? []).some((env) =>
                memberships.get(`${name}/${env}`)?.has(row.principalId),
              ),
          )
          .map((row) => ({
            principal_id: row.principalId,
            email: row.email,
            display_name: row.displayName,
            org_admin: row.orgAdmin,
            project_admin: Boolean(
              projectAdmins.get(name)?.has(row.principalId),
            ),
            environments: (projects.get(name) ?? []).filter((env) =>
              memberships.get(`${name}/${env}`)?.has(row.principalId),
            ),
          })),
      })
    }
    const accessRoutes = [
      orgAdminClient.ORG_ADMIN_GRANT_ROUTE,
      orgAdminClient.ORG_ADMIN_REVOKE_ROUTE,
      projectAdminClient.PROJECT_ADMIN_GRANT_ROUTE,
      projectAdminClient.PROJECT_ADMIN_REVOKE_ROUTE,
      member.MEMBER_GRANT_ROUTE,
      member.MEMBER_REVOKE_ROUTE,
    ]
    if (accessRoutes.some((route) => route.operation === request.operation)) {
      const value = item.value as Record<string, JsonValue> | undefined
      const name = String(value?.project ?? ''),
        env = String(value?.env ?? ''),
        principalId = String(value?.principal_id ?? '')
      const organization = request.operation.includes(':org-admin/'),
        projectAdmin = request.operation.includes(':project-admin/'),
        grant = request.operation.includes('/grant@')
      if (
        organization
          ? !orgAdmin
          : !orgAdmin && !projectAdmins.get(name)?.has(MOCK_ACTOR)
      )
        return denied()
      if (!id) return refuse('invalid_input', 'request_id')
      const row = users.get(principalId)
      if (grant && !row) return refuse('user_not_found', 'principal_id')
      if (grant && row?.status !== 'active')
        return refuse('user_not_active', 'principal_id')
      if (organization) {
        if (row) users.set(principalId, { ...row, orgAdmin: grant })
        for (const name of projects.keys()) {
          if (grant) materialize(principalId, name)
          else projectAdmins.get(name)?.delete(principalId)
        }
        if (principalId === MOCK_ACTOR) orgAdmin = grant
        return complete({ principal_id: principalId, org_admin: grant })
      }
      if (grant && projectAdmin && !projects.has(name))
        return refuse('project_not_found', 'project')
      if (
        !grant &&
        (row?.orgAdmin ||
          (!projectAdmin && projectAdmins.get(name)?.has(principalId)))
      )
        return refuse('admin_covered', 'principal_id')
      if (projectAdmin) {
        const admins = projectAdmins.get(name) ?? new Set<string>()
        if (grant) admins.add(principalId)
        else admins.delete(principalId)
        projectAdmins.set(name, admins)
        if (grant)
          for (const environment of projects.get(name) ?? []) {
            const key = `${name}/${environment}`,
              grants = memberships.get(key) ?? new Set<string>()
            grants.add(principalId)
            memberships.set(key, grants)
          }
        return complete({
          principal_id: principalId,
          project: name,
          project_admin: grant,
        })
      }
      if (grant && !projects.get(name)?.includes(env))
        return refuse('environment_not_found', 'env')
      const key = `${name}/${env}`,
        grants = memberships.get(key) ?? new Set<string>()
      if (grant) grants.add(principalId)
      else grants.delete(principalId)
      memberships.set(key, grants)
      return complete({
        principal_id: principalId,
        project: name,
        env,
        member: grant,
      })
    }
    switch (request.operation) {
      case control.CONTROL_MINE_ROUTE.operation:
        return complete({
          org_admin: orgAdmin,
          projects: accessible().map((name) => ({
            project: name,
            project_admin:
              orgAdmin || Boolean(projectAdmins.get(name)?.has(MOCK_ACTOR)),
          })),
        })
      case project.PROJECT_LIST_ROUTE.operation:
        return orgAdmin
          ? complete({ projects: [...projects.keys()].sort() })
          : denied()
      case project.PROJECT_CREATE_ROUTE.operation: {
        if (!orgAdmin) return denied()
        const value = item.value as Record<string, JsonValue> | undefined
        const name = typeof value?.project === 'string' ? value.project : ''
        if (projectError(name) || !id) return refuse('invalid_input', 'project')
        const canonical = canonicalProject(name)
        if (projects.has(canonical)) return refuse('project_exists', 'project')
        projects.set(canonical, [])
        for (const user of users.values())
          if (user.orgAdmin) materialize(user.principalId, canonical)
        return complete({ project: canonical })
      }
      case environment.ENVIRONMENT_LIST_ROUTE.operation:
        if (!accessible().includes(String(item.project))) return denied()
        return complete({
          environments: projects.get(String(item.project)) ?? [],
        })
      case environment.ENVIRONMENT_STATUS_ROUTE.operation: {
        const name = String(item.project),
          env = String(item.env)
        if (!orgAdmin && !projectAdmins.get(name)?.has(MOCK_ACTOR))
          return denied()
        if (!projects.get(name)?.includes(env))
          return refuse('environment_not_found', 'env')
        const digest = `sha256:${(name === 'billing' ? 'a' : 'b').repeat(64)}`
        return complete({
          digest,
          rollout: {
            replicas: 2,
            updated_replicas: 2,
            ready_replicas: 2,
            available_replicas: 2,
          },
          workloads: [
            {
              name: `${name}-${env}-http`,
              conditions: [{ type: 'Ready', status: 'True' }],
            },
          ],
          live: [{ digest, pods: 2 }],
        })
      }
      default:
        return {
          status: 404,
          body: 'The mock does not implement this operation.',
        }
    }
  }
  const transport: Transport = {
    async invoke(request) {
      if (disposed) return uncertain('The mock transport is disposed.')
      sent.push(structuredClone(request))
      const reply = override ?? answer(request)
      override = undefined
      const waiting = held
      held = undefined
      if (waiting) await waiting
      if (disposed) return uncertain('The mock transport is disposed.')
      const item = request.items[0] as Record<string, JsonValue> | undefined
      return classify(
        request.contract,
        typeof item?.request_id === 'string' ? item.request_id : null,
        reply,
      )
    },
  }
  return {
    transport,
    sent: () => sent.slice(),
    replyNext(reply: HttpReply) {
      override = reply
    },
    holdNext() {
      if (held) throw new Error('The next mock request is already held.')
      let done!: () => void
      held = new Promise<void>((resolve) => {
        done = resolve
      })
      const release = () => {
        releases.delete(release)
        done()
      }
      releases.add(release)
      return release
    },
    dispose() {
      disposed = true
      for (const release of [...releases]) release()
    },
  }
}
