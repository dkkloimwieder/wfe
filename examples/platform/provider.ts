import * as z from 'zod/mini'
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
  const orgAdmin = scenario === 'normal' || scenario === 'empty'
  const accessible = () =>
    orgAdmin
      ? [...projects.keys()]
      : scenario === 'project-admin'
        ? ['billing']
        : []
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
    switch (request.operation) {
      case control.CONTROL_MINE_ROUTE.operation:
        return complete({
          org_admin: orgAdmin,
          projects: accessible().map((name) => ({
            project: name,
            project_admin: true,
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
        if (!accessible().includes(name)) return denied()
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
