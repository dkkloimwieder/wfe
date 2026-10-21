import { expect, test } from 'vitest'
import { createRoot, flush } from 'solid-js'
import { createApplicationAccessApplication } from '../../examples/platform/application-access-application'
import {
  createApplicationAccessClient,
  createApplicationAccessMock,
  APPLICATION_MEMBER,
  APPLICATION_COVERED,
  APPLICATION_ACTOR,
  READ_OPERATION,
  WRITE_OPERATION,
  RETIRED_OPERATION,
} from '../../examples/platform/application-access-provider'
const scope = { project: 'billing', env: 'dev' }
function mount() {
  let app!: ReturnType<typeof createApplicationAccessApplication>
  const stop = createRoot((dispose) => {
    app = createApplicationAccessApplication()
    return dispose
  })
  return { app, stop }
}
const settle = async () => {
  for (let i = 0; i < 16; i++) {
    await Promise.resolve()
    flush()
  }
}
async function load(
  app: ReturnType<typeof createApplicationAccessApplication>,
  target: Parameters<typeof app.load>[0],
) {
  const pending = app.load(target)
  flush()
  await pending
  await settle()
}
async function changePermission(
  app: ReturnType<typeof createApplicationAccessApplication>,
  ...args: Parameters<typeof app.changePermission>
) {
  const pending = app.changePermission(...args)
  flush()
  await pending
  await settle()
}

const edit = async (
  app: ReturnType<typeof createApplicationAccessApplication>,
  role: string,
  action: 'grant' | 'revoke' = 'grant',
) => {
  app.assignment.setValue('role', role)
  flush()
  app.assignment.setValue('action', action)
  flush()
  await app.assignment.submit()
  await settle()
}

test('scoped clients keep audience outside wire inputs and preserve role encoding', async () => {
  const mock = createApplicationAccessMock()
  const mutable = {
      ...scope,
      screen: 'app-user',
      principal: APPLICATION_MEMBER,
    },
    client = createApplicationAccessClient(mock.transport(mutable))
  mutable.env = 'prod'
  const outcome = await client.assign(
    'grant',
    APPLICATION_MEMBER,
    'Team / reviewer',
    'request-1',
  )
  expect(outcome).toEqual({ status: 'completed', value: { granted: true } })
  expect(mock.sent()[0]).toMatchObject({
    scope,
    request: {
      items: [
        {
          request_id: 'request-1',
          value: { user_id: APPLICATION_MEMBER, role: 'Team / reviewer' },
        },
      ],
    },
  })
  const other = createApplicationAccessClient(
    mock.transport({ ...scope, env: 'prod' }),
  )
  expect(await other.mine()).toMatchObject({
    status: 'completed',
    value: { admin: false },
  })
  expect(await other.users()).toMatchObject({ status: 'refused' })
  mock.dispose()
})

test('reads nullable names and stored roles independently from administrator coverage', async () => {
  const { app, stop } = mount()
  await load(app, { ...scope, screen: 'app-users' })
  expect(app.state()).toEqual({ loading: false })
  expect(
    app.users().find((row) => row.id === APPLICATION_MEMBER),
  ).toMatchObject({ displayName: null, roles: ['reader'], adminCovered: false })
  expect(
    app.users().find((row) => row.id === APPLICATION_COVERED),
  ).toMatchObject({ roles: ['admin'], adminCovered: true })

  stop()
})

test('role assignment refreshes actual users and retains arbitrary listed role names', async () => {
  const { app, stop } = mount()
  await load(app, {
    ...scope,
    screen: 'app-user',
    principal: APPLICATION_MEMBER,
  })
  await edit(app, 'Team / reviewer')
  expect(app.selectedUser()?.roles).toContain('Team / reviewer')
  expect(app.completed()).toBe('Role grant completed.')
  await edit(app, 'Team / reviewer', 'revoke')
  expect(app.selectedUser()?.roles).not.toContain('Team / reviewer')
  expect(app.completed()).toBe('Role revoke completed.')
  stop()
})

test('covered administrator revocation is refused without changing stored roles', async () => {
  const { app, stop } = mount()
  await load(app, {
    ...scope,
    screen: 'app-user',
    principal: APPLICATION_COVERED,
  })
  const before = app.mock.sent().length
  await edit(app, 'admin', 'revoke')
  expect(app.mock.sent()).toHaveLength(before)
  expect(app.assignment.errors.form).toContain('covered')
  expect(app.selectedUser()?.roles).toContain('admin')
  const client = createApplicationAccessClient(app.mock.transport(scope))
  expect(
    await client.assign('revoke', APPLICATION_COVERED, 'admin', 'covered'),
  ).toMatchObject({ status: 'refused', code: 'admin_covered' })
  stop()
})

test('permissions preserve unserved stored rows and allow their revocation', async () => {
  const { app, stop } = mount()
  await load(app, { ...scope, screen: 'app-role', role: 'editor' })
  expect(
    app
      .permissions()
      ?.operations.find((row) => row.operation === RETIRED_OPERATION),
  ).toMatchObject({ selected: true, served: false, grantable: false })
  await changePermission(app, 'revoke', RETIRED_OPERATION)
  expect(
    app
      .permissions()
      ?.operations.some((row) => row.operation === RETIRED_OPERATION),
  ).toBe(false)
  await changePermission(app, 'revoke', WRITE_OPERATION)
  expect(
    app
      .permissions()
      ?.operations.find((row) => row.operation === WRITE_OPERATION)?.selected,
  ).toBe(false)
  await changePermission(app, 'grant', WRITE_OPERATION)
  expect(
    app
      .permissions()
      ?.operations.find((row) => row.operation === WRITE_OPERATION)?.selected,
  ).toBe(true)
  stop()
})

test('built-in admin stays separate from stored permission selection', async () => {
  const { app, stop } = mount()
  await load(app, { ...scope, screen: 'app-role', role: 'admin' })
  expect(app.permissions()?.admin).toBe(true)
  expect(app.permissions()?.operations.every((row) => !row.selected)).toBe(true)
  const before = app.mock.sent().length
  await changePermission(app, 'grant', READ_OPERATION)
  expect(app.mock.sent()).toHaveLength(before)
  stop()
})

test('a held old-scope read cannot replace the new application scope', async () => {
  const { app, stop } = mount(),
    release = app.mock.holdNext()
  const previous = app.load({ ...scope, screen: 'app-users' })
  await load(app, { ...scope, env: 'prod', screen: 'app-users' })
  release()
  await previous
  await settle()
  expect(app.target()?.env).toBe('prod')
  expect(app.authority()?.admin).toBe(false)
  expect(app.users()).toEqual([])
  expect(app.state().error).toContain('not available')
  stop()
})

test('late old-role permission replies cannot replace the selected role', async () => {
  const { app, stop } = mount()
  await load(app, { ...scope, screen: 'app-role', role: 'reader' })
  // Hold the selected permission read, after authority and role list complete.
  const transport = app.mock.transport.bind(app.mock)
  let release: (() => void) | undefined
  app.mock.transport = (selected) => {
    const base = transport(selected)
    return {
      invoke: async (request) => {
        if (request.template.endsWith('/permission/list') && !release)
          release = app.mock.holdNext()
        return base.invoke(request)
      },
    }
  }
  const previous = app.refresh()
  await settle()
  expect(release).toBeTypeOf('function')
  await load(app, { ...scope, screen: 'app-role', role: 'editor' })
  release!()
  await previous
  await settle()
  expect(app.permissions()?.role).toBe('editor')
  stop()
})

test('a held role command can complete on the server without publishing into another scope', async () => {
  const { app, stop } = mount()
  await load(app, {
    ...scope,
    screen: 'app-user',
    principal: APPLICATION_MEMBER,
  })
  app.assignment.setValue('role', 'editor')
  flush()
  const release = app.mock.holdNext(),
    save = app.assignment.submit()
  await settle()
  await load(app, {
    project: 'shop',
    env: 'dev',
    screen: 'app-user',
    principal: APPLICATION_MEMBER,
  })
  release()
  await save
  await settle()
  expect(app.target()?.project).toBe('shop')
  expect(app.selectedUser()?.roles).toEqual(['reader'])
  expect(app.completed()).toBe('')
  await load(app, {
    ...scope,
    screen: 'app-user',
    principal: APPLICATION_MEMBER,
  })
  expect(app.selectedUser()?.roles).toContain('editor')
  stop()
})

test('self-admin removal refreshes caller authority before further actions', async () => {
  const { app, stop } = mount()
  await load(app, {
    ...scope,
    screen: 'app-user',
    principal: APPLICATION_ACTOR,
  })
  await edit(app, 'admin', 'revoke')
  expect(app.authority()?.admin).toBe(false)
  expect(app.state().error).toContain('not available')
  expect(app.completed()).toBe('Role revoke completed.')
  expect(app.users()).toEqual([])
  stop()
})

test('malformed and duplicate results remain errors instead of editable rows', async () => {
  const { app, stop } = mount()
  const transport = app.mock.transport.bind(app.mock)
  app.mock.transport = (selected) => ({
    invoke: async (request) =>
      request.template.endsWith('/user/list')
        ? {
            status: 'completed',
            value: {
              users: [
                {
                  id: APPLICATION_MEMBER,
                  email: 'x',
                  display_name: null,
                  roles: [],
                  admin_covered: false,
                },
                {
                  id: APPLICATION_MEMBER,
                  email: 'x',
                  display_name: null,
                  roles: [],
                  admin_covered: false,
                },
              ],
            },
          }
        : transport(selected).invoke(request),
  })
  await load(app, { ...scope, screen: 'app-users' })
  expect(app.state().error).toContain('duplicate')
  expect(app.users()).toEqual([])
  const client = createApplicationAccessClient({
    invoke: async () => ({
      status: 'completed',
      value: { users: [{ id: APPLICATION_MEMBER, roles: [] }] },
    }),
  })
  expect(await client.users()).toMatchObject({ status: 'uncertain' })
  stop()
})

test('completed commands retain their notice when the following read fails', async () => {
  const { app, stop } = mount()
  await load(app, {
    ...scope,
    screen: 'app-user',
    principal: APPLICATION_MEMBER,
  })
  const transport = app.mock.transport.bind(app.mock)
  app.mock.transport = (selected) => ({
    invoke: async (request) => {
      const outcome = await transport(selected).invoke(request)
      if (request.template.endsWith('/user_role/grant'))
        app.mock.replyNext({ status: 503, body: 'Unavailable' })
      return outcome
    },
  })
  await edit(app, 'editor')
  expect(app.completed()).toBe('Role grant completed.')
  expect(app.state().error).toBeTruthy()
  expect(app.users()).toEqual([])
  stop()
})

test('disposal cancels waiting and stops further requests', async () => {
  const { app, stop } = mount(),
    release = app.mock.holdNext()
  const pending = app.load({ ...scope, screen: 'app-users' })
  const before = app.mock.sent().length
  stop()
  release()
  await pending
  await load(app, { ...scope, screen: 'app-roles' })
  await app.refresh()
  expect(app.mock.sent()).toHaveLength(before)
})

test('absent stored permission revocation keeps the declared refusal', async () => {
  const mock = createApplicationAccessMock()
  const client = createApplicationAccessClient(mock.transport(scope))
  expect(
    await client.changePermission(
      'revoke',
      'reader',
      WRITE_OPERATION,
      'missing',
    ),
  ).toMatchObject({ status: 'refused', code: 'permission_not_held' })
  expect(await client.mine()).toMatchObject({
    status: 'completed',
    value: {
      admin: true,
      permissions: expect.arrayContaining([READ_OPERATION, WRITE_OPERATION]),
    },
  })
  mock.dispose()
})

test('disposal stops a pending permission command without another refresh', async () => {
  const { app, stop } = mount()
  await load(app, { ...scope, screen: 'app-role', role: 'reader' })
  const release = app.mock.holdNext()
  const pending = app.changePermission('grant', WRITE_OPERATION)
  await settle()
  const before = app.mock.sent().length
  stop()
  release()
  await pending
  await app.changePermission('revoke', READ_OPERATION)
  expect(app.mock.sent()).toHaveLength(before)
})

test('failed authority reload after self-admin removal never retains old authority', async () => {
  const { app, stop } = mount()
  await load(app, {
    ...scope,
    screen: 'app-user',
    principal: APPLICATION_ACTOR,
  })
  const transport = app.mock.transport.bind(app.mock)
  app.mock.transport = (selected) => ({
    invoke: async (request) => {
      const outcome = await transport(selected).invoke(request)
      if (request.template.endsWith('/user_role/revoke'))
        app.mock.replyNext({ status: 503, body: 'Unavailable' })
      return outcome
    },
  })
  await edit(app, 'admin', 'revoke')
  expect(app.authority()).toBeUndefined()
  expect(app.state().error).toBeTruthy()
  expect(app.completed()).toBe('Role revoke completed.')
  stop()
})

test('admin served catalog matches permission rows while absent admin revokes stay declared', async () => {
  const mock = createApplicationAccessMock()
  const client = createApplicationAccessClient(mock.transport(scope))
  const mine = await client.mine(),
    list = await client.permissions('admin')
  expect(mine.status).toBe('completed')
  expect(list.status).toBe('completed')
  if (mine.status === 'completed' && list.status === 'completed') {
    expect([...mine.value.permissions].sort()).toEqual(
      list.value.operations
        .filter((row) => row.served)
        .map((row) => row.operation)
        .sort(),
    )
  }
  expect(
    await client.changePermission(
      'revoke',
      'admin',
      READ_OPERATION,
      'admin-revoke',
    ),
  ).toMatchObject({ status: 'refused', code: 'permission_not_held' })
  mock.dispose()
})

test('commands cannot overlap or start while authority refresh is pending in the same turn', async () => {
  const { app, stop } = mount()
  await load(app, { ...scope, screen: 'app-role', role: 'reader' })
  const releaseRead = app.mock.holdNext()
  const read = app.refresh()
  const before = app.mock.sent().length
  await app.changePermission('grant', WRITE_OPERATION)
  expect(app.mock.sent()).toHaveLength(before)
  releaseRead()
  await read
  await settle()
  const releaseWrite = app.mock.holdNext()
  const first = app.changePermission('grant', WRITE_OPERATION)
  const sent = app.mock.sent().length
  await app.changePermission('grant', WRITE_OPERATION)
  expect(app.mock.sent()).toHaveLength(sent)
  releaseWrite()
  await first
  await settle()
  expect(
    app
      .permissions()
      ?.operations.find((row) => row.operation === WRITE_OPERATION)?.selected,
  ).toBe(true)
  stop()
})
