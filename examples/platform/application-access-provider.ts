import * as z from 'zod/mini'
import * as user from './snapshot/application/client/user'
import * as role from './snapshot/application/client/role'
import * as permission from './snapshot/application/client/permission'
import * as userRole from './snapshot/application/client/user_role'
import { createCheckedOperation } from './checked-operation'
import { classify } from './snapshot/runtime/transport'
import type { HttpReply } from './snapshot/runtime/transport'
import type { JsonValue, Transport, WireRequest } from './snapshot/runtime/wire'

export type ApplicationScope = Readonly<{ project: string; env: string }>
export type ApplicationUser = user.UserListResultUsers
export type ApplicationAuthority = permission.PermissionMineResult
export type RolePermissions = permission.PermissionListResult
export type PermissionRow = permission.PermissionListResultOperations
const uuid = z
  .string()
  .check(
    z.regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  )
const usersSchema = z.object({
  users: z.array(
    z.object({
      id: uuid,
      email: z.string(),
      displayName: z.nullable(z.string()),
      roles: z.array(z.string()),
      adminCovered: z.boolean(),
    }),
  ),
})
const mineSchema = z.object({
  admin: z.boolean(),
  permissions: z.array(z.string()),
})
const operationSchema = z.object({
  operation: z.string(),
  served: z.boolean(),
  grantable: z.boolean(),
  adminOnly: z.boolean(),
  selected: z.boolean(),
})

export function createApplicationAccessClient(transport: Transport) {
  const call = createCheckedOperation(transport)
  return {
    mine: (signal?: AbortSignal) =>
      call((t) => permission.mine(t, [{}]), mineSchema, signal),
    users: (signal?: AbortSignal) =>
      call((t) => user.list(t, [{}]), usersSchema, signal),
    roles: (signal?: AbortSignal) =>
      call(
        (t) => role.list(t, [{}]),
        z.object({ roles: z.array(z.string()) }),
        signal,
      ),
    permissions: (name: string, signal?: AbortSignal) =>
      call(
        (t) => permission.list(t, [{ role: name }]),
        z.object({
          role: z.literal(name),
          admin: z.boolean(),
          operations: z.array(operationSchema),
        }),
        signal,
      ),
    assign: (
      action: 'grant' | 'revoke',
      userId: string,
      name: string,
      requestId: string,
      signal?: AbortSignal,
    ) =>
      action === 'grant'
        ? call(
            (t) =>
              userRole.grant(t, [{ requestId, value: { userId, role: name } }]),
            z.object({ granted: z.boolean() }),
            signal,
          )
        : call(
            (t) =>
              userRole.revoke(t, [
                { requestId, value: { userId, role: name } },
              ]),
            z.object({ revoked: z.boolean() }),
            signal,
          ),
    changePermission: (
      action: 'grant' | 'revoke',
      name: string,
      operation: string,
      requestId: string,
      signal?: AbortSignal,
    ) =>
      action === 'grant'
        ? call(
            (t) =>
              permission.grant(t, [
                { requestId, value: { role: name, operation } },
              ]),
            z.object({ rowsAdded: z.int32() }),
            signal,
          )
        : call(
            (t) =>
              permission.revoke(t, [
                { requestId, value: { role: name, operation } },
              ]),
            z.strictObject({}),
            signal,
          ),
  }
}

export const APPLICATION_ACTOR = '00000000-0000-4000-8000-000000000001'
export const APPLICATION_MEMBER = '00000000-0000-4000-8000-000000000002'
export const APPLICATION_COVERED = '00000000-0000-4000-8000-000000000003'
export const READ_OPERATION = 'example:records/read@1.0.0'
export const WRITE_OPERATION = 'example:records/write@1.0.0'
export const RETIRED_OPERATION = 'example:records/retired@0.1.0'
const hostOperations = [
  user.USER_LIST_ROUTE,
  role.ROLE_LIST_ROUTE,
  permission.PERMISSION_MINE_ROUTE,
  permission.PERMISSION_LIST_ROUTE,
  permission.PERMISSION_GRANT_ROUTE,
  permission.PERMISSION_REVOKE_ROUTE,
  userRole.USER_ROLE_GRANT_ROUTE,
  userRole.USER_ROLE_REVOKE_ROUTE,
].map((route) => ({
  operation: route.operation,
  adminOnly: route !== permission.PERMISSION_MINE_ROUTE,
}))
export const applicationScopeKey = (scope: ApplicationScope) =>
  JSON.stringify([scope.project, scope.env])

/** Sample records and outcomes only; this fixture is not an access-control implementation. */
export function createApplicationAccessMock() {
  type Records = { users: ApplicationUser[]; roles: Map<string, Set<string>> }
  const scopes = new Map<string, Records>()
  for (const [project, env, admin] of [
    ['billing', 'dev', true],
    ['billing', 'prod', false],
    ['shop', 'dev', true],
  ] as const) {
    scopes.set(applicationScopeKey({ project, env }), {
      users: [
        {
          id: APPLICATION_ACTOR,
          email: 'operator@example.test',
          displayName: 'Sample operator',
          roles: admin ? ['admin'] : ['reader'],
          adminCovered: false,
        },
        {
          id: APPLICATION_MEMBER,
          email: 'ann@example.test',
          displayName: null,
          roles: ['reader'],
          adminCovered: false,
        },
        {
          id: APPLICATION_COVERED,
          email: 'covered@example.test',
          displayName: 'Covered administrator',
          roles: ['admin'],
          adminCovered: true,
        },
      ],
      roles: new Map([
        ['admin', new Set<string>()],
        ['reader', new Set([READ_OPERATION])],
        [
          'editor',
          new Set([READ_OPERATION, WRITE_OPERATION, RETIRED_OPERATION]),
        ],
        ['Team / reviewer', new Set<string>()],
      ]),
    })
  }
  const sent: { scope: ApplicationScope; request: WireRequest }[] = []
  const releases = new Set<() => void>()
  let disposed = false,
    held: Promise<void> | undefined,
    override: HttpReply | undefined
  const uncertain = () => ({
    status: 'uncertain' as const,
    reason: 'The application mock is disposed.',
    retryRefusal: null,
  })
  function answer(scope: ApplicationScope, request: WireRequest): HttpReply {
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
    const records = scopes.get(applicationScopeKey(scope))
    if (!records) return denied()
    const actor = records.users.find((row) => row.id === APPLICATION_ACTOR)!
    const admin = actor.roles.includes('admin') || actor.adminCovered
    if (request.operation === permission.PERMISSION_MINE_ROUTE.operation)
      return complete({
        admin,
        permissions: admin
          ? [
              READ_OPERATION,
              WRITE_OPERATION,
              ...hostOperations.map((entry) => entry.operation),
            ]
          : [
              ...new Set(
                actor.roles.flatMap((name) => [
                  ...(records.roles.get(name) ?? []),
                ]),
              ),
            ],
      })
    if (!admin) return denied()
    if (!item || request.items.length !== 1)
      return { status: 400, body: 'Invalid mock request.' }
    if (request.operation === user.USER_LIST_ROUTE.operation)
      return complete({
        users: records.users.map((row) => ({
          id: row.id,
          email: row.email,
          display_name: row.displayName,
          roles: row.roles,
          admin_covered: row.adminCovered,
        })),
      })
    if (request.operation === role.ROLE_LIST_ROUTE.operation)
      return complete({ roles: [...records.roles.keys()] })
    const operations = (name: string): PermissionRow[] => [
      {
        operation: READ_OPERATION,
        served: true,
        grantable: true,
        adminOnly: false,
        selected: records.roles.get(name)?.has(READ_OPERATION) ?? false,
      },
      {
        operation: WRITE_OPERATION,
        served: true,
        grantable: true,
        adminOnly: false,
        selected: records.roles.get(name)?.has(WRITE_OPERATION) ?? false,
      },
      ...hostOperations.map((entry) => ({
        ...entry,
        served: true,
        grantable: false,
        selected: false,
      })),
      ...(records.roles.get(name)?.has(RETIRED_OPERATION)
        ? [
            {
              operation: RETIRED_OPERATION,
              served: false,
              grantable: false,
              adminOnly: false,
              selected: true,
            },
          ]
        : []),
    ]
    if (request.operation === permission.PERMISSION_LIST_ROUTE.operation) {
      const name = String(item.role)
      if (!records.roles.has(name)) return refuse('role_not_found', 'role')
      return complete({
        role: name,
        admin: name === 'admin',
        operations: operations(name).map(({ adminOnly, ...row }) => ({
          ...row,
          admin_only: adminOnly,
        })),
      })
    }
    const parsed = z
      .object({
        role: z.string(),
        user_id: z.optional(uuid),
        operation: z.optional(z.string()),
      })
      .safeParse(item.value)
    if (!id || !parsed.success) return refuse('invalid_input', 'value')
    const value = parsed.data,
      name = value.role
    const permissions = records.roles.get(name)
    if (!permissions) return refuse('role_not_found', 'role')
    if (
      [
        userRole.USER_ROLE_GRANT_ROUTE.operation,
        userRole.USER_ROLE_REVOKE_ROUTE.operation,
      ].includes(request.operation)
    ) {
      const index = records.users.findIndex((row) => row.id === value.user_id)
      const target = records.users[index]
      if (!target) return refuse('user_not_found', 'user_id')
      const grant =
        request.operation === userRole.USER_ROLE_GRANT_ROUTE.operation
      if (!grant && name === 'admin' && target.adminCovered)
        return refuse('admin_covered', 'user_id')
      const had = target.roles.includes(name)
      records.users[index] = {
        ...target,
        roles: grant
          ? [...new Set([...target.roles, name])]
          : target.roles.filter((entry) => entry !== name),
      }
      return complete(grant ? { granted: !had } : { revoked: had })
    }
    if (
      [
        permission.PERMISSION_GRANT_ROUTE.operation,
        permission.PERMISSION_REVOKE_ROUTE.operation,
      ].includes(request.operation)
    ) {
      if (
        name === 'admin' &&
        request.operation === permission.PERMISSION_GRANT_ROUTE.operation
      )
        return refuse('admin_fixed', 'role')
      const operation = value.operation
      if (!operation) return refuse('invalid_input', 'operation')
      if (request.operation === permission.PERMISSION_REVOKE_ROUTE.operation) {
        if (!permissions.delete(operation))
          return refuse('permission_not_held', 'operation')
        return complete({})
      }
      const available = operations(name).find(
        (row) => row.operation === operation,
      )
      if (!available?.served) return refuse('operation_not_served', 'operation')
      if (!available.grantable)
        return refuse('operation_not_grantable', 'operation')
      const had = permissions.has(operation)
      permissions.add(operation)
      return complete({ rows_added: had ? 0 : 1 })
    }
    return { status: 404, body: 'The mock does not implement this operation.' }
  }
  return {
    transport(scope: ApplicationScope): Transport {
      const bound = Object.freeze({ ...scope })
      return {
        async invoke(request) {
          if (disposed) return uncertain()
          sent.push({ scope: bound, request: structuredClone(request) })
          const reply = override ?? answer(bound, request)
          override = undefined
          const waiting = held
          held = undefined
          if (waiting) await waiting
          if (disposed) return uncertain()
          const item = request.items[0] as Record<string, JsonValue> | undefined
          return classify(
            request.contract,
            typeof item?.request_id === 'string' ? item.request_id : null,
            reply,
          )
        },
      }
    },
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
