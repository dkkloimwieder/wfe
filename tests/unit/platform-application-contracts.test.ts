import { readFile } from 'node:fs/promises'
import { expect, test } from 'vitest'
import * as user from '../../examples/platform/snapshot/application/client/user'
import * as role from '../../examples/platform/snapshot/application/client/role'
import * as permission from '../../examples/platform/snapshot/application/client/permission'
import * as userRole from '../../examples/platform/snapshot/application/client/user_role'
import * as controlUser from '../../examples/platform/snapshot/client/user'
import type {
  FieldMap,
  Transport,
} from '../../examples/platform/snapshot/runtime/wire'

const operations = [
  [
    'user/list',
    user.USER_LIST_ROUTE,
    user.USER_LIST_REQUEST_FIELDS,
    user.USER_LIST_RESULT_FIELDS,
  ],
  [
    'role/list',
    role.ROLE_LIST_ROUTE,
    role.ROLE_LIST_REQUEST_FIELDS,
    role.ROLE_LIST_RESULT_FIELDS,
  ],
  [
    'permission/mine',
    permission.PERMISSION_MINE_ROUTE,
    permission.PERMISSION_MINE_REQUEST_FIELDS,
    permission.PERMISSION_MINE_RESULT_FIELDS,
  ],
  [
    'permission/list',
    permission.PERMISSION_LIST_ROUTE,
    permission.PERMISSION_LIST_REQUEST_FIELDS,
    permission.PERMISSION_LIST_RESULT_FIELDS,
  ],
  [
    'permission/grant',
    permission.PERMISSION_GRANT_ROUTE,
    permission.PERMISSION_GRANT_REQUEST_FIELDS,
    permission.PERMISSION_GRANT_RESULT_FIELDS,
  ],
  [
    'permission/revoke',
    permission.PERMISSION_REVOKE_ROUTE,
    permission.PERMISSION_REVOKE_REQUEST_FIELDS,
    permission.PERMISSION_REVOKE_RESULT_FIELDS,
  ],
  [
    'user_role/grant',
    userRole.USER_ROLE_GRANT_ROUTE,
    userRole.USER_ROLE_GRANT_REQUEST_FIELDS,
    userRole.USER_ROLE_GRANT_RESULT_FIELDS,
  ],
  [
    'user_role/revoke',
    userRole.USER_ROLE_REVOKE_ROUTE,
    userRole.USER_ROLE_REVOKE_REQUEST_FIELDS,
    userRole.USER_ROLE_REVOKE_RESULT_FIELDS,
  ],
] as const
function paths(fields: FieldMap, prefix = ''): string[] {
  return Object.entries(fields).flatMap(([wire, entry]) => {
    const path = `${prefix}${wire}`
    return typeof entry === 'string' ? [path] : paths(entry.fields, `${path}.`)
  })
}
const metadata = async (path: string, kind: string) =>
  JSON.parse(
    await readFile(
      `examples/platform/snapshot/application/metadata/${path}.${kind}.json`,
      'utf8',
    ),
  )

test.each(operations)(
  '%s captured operation, errors and field paths match the generated client',
  async (path, route, input, result) => {
    const operation = await metadata(path, 'operation')
    expect(operation.operation).toBe(route.operation)
    expect(operation.type).toBe(route.contract.type)
    expect(operation.result).toBe(route.contract.resultClass)
    const errors = await metadata(path, 'errors')
    expect(
      errors.cases.map((entry: { literal: string }) => entry.literal).sort(),
    ).toEqual(route.contract.errors.map((entry) => entry.literal).sort())
    for (const [kind, fields] of [
      ['input', input],
      ['result', result],
    ] as const) {
      const shape = await metadata(path, kind)
      expect(
        shape.fields
          .map((field: { path: string }) => field.path.replaceAll('[]', ''))
          .sort(),
      ).toEqual(paths(fields).sort())
    }
  },
)

test('overlapping user operation IDs retain separate host contracts', () => {
  expect(user.USER_LIST_ROUTE.operation).toBe(
    controlUser.USER_LIST_ROUTE.operation,
  )
  expect(user.USER_LIST_RESULT_FIELDS).not.toEqual(
    controlUser.USER_LIST_RESULT_FIELDS,
  )
  expect(paths(user.USER_LIST_RESULT_FIELDS)).toContain('users.admin_covered')
  expect(paths(controlUser.USER_LIST_RESULT_FIELDS)).toContain(
    'users.org_admin',
  )
})

test('application clients preserve stored roles and coverage separately', async () => {
  const transport: Transport = {
    invoke: async () => ({
      status: 'completed',
      value: {
        users: [
          {
            id: '00000000-0000-4000-8000-000000000001',
            email: 'sample@example.test',
            display_name: null,
            roles: ['admin', 'Team / reviewer'],
            admin_covered: true,
          },
        ],
      },
    }),
  }
  const outcome = await user.list(transport, [{}])
  expect(outcome).toEqual({
    status: 'completed',
    value: {
      users: [
        {
          id: '00000000-0000-4000-8000-000000000001',
          email: 'sample@example.test',
          displayName: null,
          roles: ['admin', 'Team / reviewer'],
          adminCovered: true,
        },
      ],
    },
  })
})

test('permission clients preserve stored selection and served flags independently', async () => {
  const transport: Transport = {
    invoke: async () => ({
      status: 'completed',
      value: {
        role: 'Team / reviewer',
        admin: false,
        operations: [
          {
            operation: 'sample:records/read@1.0.0',
            served: false,
            grantable: false,
            admin_only: false,
            selected: true,
          },
        ],
      },
    }),
  }
  expect(
    await permission.list(transport, [{ role: 'Team / reviewer' }]),
  ).toEqual({
    status: 'completed',
    value: {
      role: 'Team / reviewer',
      admin: false,
      operations: [
        {
          operation: 'sample:records/read@1.0.0',
          served: false,
          grantable: false,
          adminOnly: false,
          selected: true,
        },
      ],
    },
  })
})
