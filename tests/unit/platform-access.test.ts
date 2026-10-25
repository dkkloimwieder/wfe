import { expect, test } from 'vitest'
import { accessFailure } from '../../examples/platform/access-application'
import { createRoot, flush } from 'solid-js'
import { createPlatformApplication } from '../../examples/platform/application'
import {
  createPlatformClient,
  createPlatformMock,
  MOCK_ACTOR,
} from '../../examples/platform/provider'
import { platformRoute, platformUrl } from '../../examples/platform/route'
const ANN = '00000000-0000-4000-8000-000000000002',
  INACTIVE = '00000000-0000-4000-8000-000000000003'
const target = (principalId = ANN, project = 'billing', env = 'dev') => ({
  principalId,
  project,
  env,
})
const settle = async () => {
  for (let i = 0; i < 80; i++) {
    await Promise.resolve()
    flush()
  }
}
function mount(
  url = '?screen=users',
  scenario: 'normal' | 'project-admin' | 'no-access' = 'normal',
) {
  let app!: ReturnType<typeof createPlatformApplication>
  const stop = createRoot((dispose) => {
    app = createPlatformApplication(platformRoute(url), scenario)
    return dispose
  })
  return { app, stop }
}
test('access routes retain identities and remove unrelated coordinates', () => {
  expect(platformRoute(`?screen=access&principal=${ANN}`)).toEqual({
    screen: 'access',
    principal: ANN,
  })
  expect(platformRoute('?screen=access&principal=bad')).toEqual({
    screen: 'missing',
  })
  expect(platformRoute(`?screen=users&principal=${ANN}`)).toEqual({
    screen: 'missing',
  })
  expect(platformRoute('?screen=members&project=billing')).toEqual({
    screen: 'members',
    project: 'billing',
  })
  const url = platformUrl(
    `https://demo.test/?screen=access&principal=${ANN}&scenario=normal#part`,
    { screen: 'members', project: 'billing' },
  )
  expect(url.searchParams.has('principal')).toBe(false)
  expect(url.hash).toBe('#part')
})
test('generated access clients use exact nested request keys and validate returned identities', async () => {
  const mock = createPlatformMock(),
    client = createPlatformClient(mock.transport)
  const result = await client.access(
    'environment',
    'grant',
    target(),
    'request-one',
  )
  expect(result).toMatchObject({
    status: 'completed',
    value: { principalId: ANN, project: 'billing', env: 'dev', member: true },
  })
  expect(mock.sent().at(-1)?.items).toEqual([
    {
      request_id: 'request-one',
      value: { principal_id: ANN, project: 'billing', env: 'dev' },
    },
  ])
  mock.replyNext({
    status: 200,
    body: JSON.stringify([
      {
        request_id: 'request-two',
        value: {
          principal_id: MOCK_ACTOR,
          project: 'billing',
          env: 'dev',
          member: true,
        },
      },
    ]),
  })
  expect(
    await client.access('environment', 'grant', target(), 'request-two'),
  ).toMatchObject({ status: 'uncertain' })
  mock.dispose()
})
test('materialized project grants preserve membership after revoke and refuse covered revokes', async () => {
  const mock = createPlatformMock(),
    client = createPlatformClient(mock.transport)
  expect(
    await client.access('project', 'grant', target(), 'one'),
  ).toMatchObject({ status: 'completed', value: { projectAdmin: true } })
  expect(
    await client.access('environment', 'revoke', target(), 'two'),
  ).toMatchObject({ status: 'refused', code: 'admin_covered' })
  expect(
    await client.access('project', 'revoke', target(), 'three'),
  ).toMatchObject({ status: 'completed', value: { projectAdmin: false } })
  const read = await client.members('billing')
  expect(read).toMatchObject({
    status: 'completed',
    value: {
      members: expect.arrayContaining([
        expect.objectContaining({
          principalId: ANN,
          projectAdmin: false,
          environments: ['dev', 'prod'],
        }),
      ]),
    },
  })
  expect(
    await client.access('environment', 'revoke', target(), 'four'),
  ).toMatchObject({ status: 'completed', value: { member: false } })
  expect(
    await client.access('environment', 'revoke', target(), 'five'),
  ).toMatchObject({ status: 'completed', value: { member: false } })
  mock.dispose()
})
test('org grant materializes all projects and revoke removes administrators but preserves membership', async () => {
  const mock = createPlatformMock(),
    client = createPlatformClient(mock.transport)
  await client.access('organization', 'grant', target(), 'one')
  await client.create({ project: 'new-project' }, 'two')
  expect(await client.members('new-project')).toMatchObject({
    status: 'completed',
    value: {
      members: expect.arrayContaining([
        expect.objectContaining({ principalId: ANN, projectAdmin: true }),
      ]),
    },
  })
  await client.access('organization', 'revoke', target(), 'three')
  expect(await client.members('billing')).toMatchObject({
    status: 'completed',
    value: {
      members: expect.arrayContaining([
        expect.objectContaining({
          principalId: ANN,
          orgAdmin: false,
          projectAdmin: false,
          environments: ['dev', 'prod'],
        }),
      ]),
    },
  })
  expect(await client.members('shop')).toMatchObject({
    status: 'completed',
    value: {
      members: expect.arrayContaining([
        expect.objectContaining({
          principalId: ANN,
          projectAdmin: false,
          environments: ['dev'],
        }),
      ]),
    },
  })
  mock.dispose()
})
test('project administrators read users but cannot write org grants or other projects', async () => {
  const mock = createPlatformMock('project-admin'),
    client = createPlatformClient(mock.transport)
  expect(await client.users()).toMatchObject({ status: 'completed' })
  expect(
    await client.access('organization', 'grant', target(), 'one'),
  ).toMatchObject({ status: 'refused' })
  expect(
    await client.access('project', 'grant', target(ANN, 'shop'), 'two'),
  ).toMatchObject({ status: 'refused' })
  expect(
    await client.access('environment', 'grant', target(INACTIVE), 'three'),
  ).toMatchObject({ status: 'refused', code: 'user_not_active' })
  expect(
    await client.access('environment', 'grant', target(ANN, 'missing'), 'four'),
  ).toMatchObject({ status: 'refused' })
  mock.dispose()
})
test('operation-specific missing target checks never invent undeclared revoke refusals', async () => {
  const mock = createPlatformMock(),
    client = createPlatformClient(mock.transport)
  const missing = target(
    '00000000-0000-4000-8000-000000000099',
    'missing',
    'missing',
  )
  for (const kind of ['organization', 'project', 'environment'])
    expect(await client.access(kind, 'revoke', missing, kind)).toMatchObject({
      status: 'completed',
    })
  expect(
    await client.access('environment', 'grant', target(ANN, 'missing'), 'one'),
  ).toMatchObject({ status: 'refused', code: 'environment_not_found' })
  expect(
    await client.access('project', 'grant', target(ANN, 'missing'), 'two'),
  ).toMatchObject({ status: 'refused', code: 'project_not_found' })
  mock.dispose()
})
test('access model validates actual choices and does not send invalid commands', async () => {
  const { app, stop } = mount(`?screen=access&principal=${ANN}`)
  await app.initialize()
  await settle()
  await app.access.form.submit()
  await settle()
  expect(app.access.form.errors.fields?.project).toBeTruthy()
  expect(app.mock.sent().filter((row) => row.method === 'POST')).toHaveLength(0)
  app.access.form.setValue('project', 'billing')
  flush()
  await settle()
  expect(app.access.environments()).toEqual(['dev', 'prod'])
  const reads = app.mock.sent().length
  app.access.form.setValue('env', 'dev')
  flush()
  expect(app.mock.sent()).toHaveLength(reads)
  await app.access.form.submit()
  await settle()
  expect(app.access.completed()).toContain('completed')
  expect(app.access.form.errors.form).toBeUndefined()
  stop()
})
test('self revoke refreshes authority and removes previously privileged screens', async () => {
  const { app, stop } = mount(`?screen=access&principal=${MOCK_ACTOR}`)
  await app.initialize()
  await settle()
  app.access.form.setValue('kind', 'organization')
  flush()
  app.access.form.setValue('action', 'revoke')
  flush()
  await app.access.form.submit()
  await settle()
  expect(app.authority()?.orgAdmin).toBe(false)
  expect(app.authority()?.projects).toEqual([])
  expect(app.access.state().error).toContain('refused')
  expect(app.access.completed()).toContain('completed')
  stop()
})
test('late member reads and canceled commands cannot replace another route', async () => {
  const { app, stop } = mount()
  await app.initialize()
  await settle()
  const release = app.mock.holdNext()
  app.enter({ screen: 'members', project: 'billing' })
  flush()
  app.enter({ screen: 'members', project: 'shop' })
  flush()
  await settle()
  expect(app.access.members().some((row) => row.principalId === ANN)).toBe(
    false,
  )
  release()
  await settle()
  expect(app.access.members().some((row) => row.principalId === ANN)).toBe(
    false,
  )
  app.enter({ screen: 'access', principal: ANN })
  flush()
  await settle()
  app.access.form.setValue('kind', 'organization')
  flush()
  const releaseCommand = app.mock.holdNext(),
    save = app.access.form.submit()
  await settle()
  app.enter({ screen: 'users' })
  flush()
  await settle()
  releaseCommand()
  await save
  await settle()
  expect(app.access.completed()).toBe('')
  expect(app.notice()).toContain('command can still complete')
  await app.refresh()
  await settle()
  expect(
    app.access.users().find((row) => row.principalId === ANN)?.orgAdmin,
  ).toBe(true)
  stop()
})
test('access failures preserve partial-write recovery detail and disposed work remains inert', async () => {
  const { app, stop } = mount(`?screen=access&principal=${ANN}`)
  await app.initialize()
  await settle()
  app.access.form.setValue('kind', 'organization')
  flush()
  const message = accessFailure({
    status: 'refused',
    code: 'application_write_incomplete',
    text: 'The application rows stopped at this environment.',
    detail: { environment: 'billing/prod', completed: ['billing/dev'] },
  })
  expect(message).toContain('billing/prod')
  expect(message).toContain('billing/dev')
  const release = app.mock.holdNext(),
    save = app.access.form.submit()
  await settle()
  stop()
  flush()
  release()
  await save
  await settle()
  expect(app.access.completed()).toBe('')
})

test('completed self-revocation remains complete when authority refresh fails', async () => {
  const { app, stop } = mount(`?screen=access&principal=${MOCK_ACTOR}`)
  await app.initialize()
  await settle()
  const original = app.mock.transport.invoke.bind(app.mock.transport)
  let wrote = false
  app.mock.transport.invoke = async (request) => {
    if (wrote && request.operation.includes(':control/mine'))
      return {
        status: 'uncertain',
        reason: 'Scope read failed.',
        retryRefusal: null,
      }
    const outcome = await original(request)
    if (request.method === 'POST') wrote = true
    return outcome
  }
  app.access.form.setValue('kind', 'organization')
  flush()
  app.access.form.setValue('action', 'revoke')
  flush()
  await app.access.form.submit()
  await settle()
  expect(app.access.completed()).toBe('The command completed.')
  expect(app.session().error).toBe('Scope read failed.')
  expect(app.authority()).toBeUndefined()
  expect(app.access.allowed('organization', '')).toBe(false)
  const sent = app.mock.sent().length
  app.enter({ screen: 'create' })
  flush()
  app.form.setValue('project', 'forbidden')
  flush()
  await app.form.submit()
  await settle()
  expect(app.mock.sent()).toHaveLength(sent)
  app.mock.transport.invoke = original
  await app.initialize()
  await settle()
  expect(app.authority()?.orgAdmin).toBe(false)
  stop()
})
test('late environment choices cannot cross projects or refetch for unrelated values', async () => {
  const { app, stop } = mount(`?screen=access&principal=${ANN}`)
  await app.initialize()
  await settle()
  const release = app.mock.holdNext()
  app.access.form.setValue('project', 'billing')
  flush()
  await settle()
  app.access.form.setValue('project', 'shop')
  flush()
  await settle()
  expect(app.access.environments()).toEqual(['dev'])
  release()
  await settle()
  expect(app.access.environments()).toEqual(['dev'])
  app.access.form.setValue('env', 'prod')
  flush()
  await app.access.form.submit()
  await settle()
  expect(app.access.form.errors.fields?.env).toBeTruthy()
  expect(app.mock.sent().filter((row) => row.method === 'POST')).toHaveLength(0)
  stop()
})
test('access reply validation rejects malformed nested members and duplicate identities', async () => {
  const mock = createPlatformMock(),
    client = createPlatformClient(mock.transport)
  mock.replyNext({
    status: 200,
    body: JSON.stringify([
      {
        value: {
          next_cursor: null,
          total: null,
          members: [
            {
              principal_id: ANN,
              display_name: 'Ann',
              email: 'ann@example.test',
              org_admin: false,
              project_admin: false,
              environments: [42],
            },
          ],
        },
      },
    ]),
  })
  expect(await client.members('billing')).toMatchObject({ status: 'uncertain' })
  mock.dispose()
  const { app, stop } = mount()
  await app.initialize()
  await settle()
  const row = {
    principal_id: ANN,
    display_name: 'Ann',
    email: 'ann@example.test',
    org_admin: false,
    status: 'future-status',
  }
  app.mock.replyNext({
    status: 200,
    body: JSON.stringify([
      { value: { users: [row, row], next_cursor: null, total: 2 } },
    ]),
  })
  await app.access.load({ screen: 'users' })
  await settle()
  expect(app.access.state().error).toContain('duplicate')
  stop()
})
test('captured access route metadata matches every used generated operation', async () => {
  const { readFile } = await import('node:fs/promises')
  const user = await import('../../examples/platform/snapshot/client/user')
  const member = await import('../../examples/platform/snapshot/client/member')
  const org = await import('../../examples/platform/snapshot/client/org_admin')
  const project =
    await import('../../examples/platform/snapshot/client/project_admin')
  for (const [path, route] of [
    ['user/list', user.USER_LIST_ROUTE],
    ['member/list', member.MEMBER_LIST_ROUTE],
    ['member/grant', member.MEMBER_GRANT_ROUTE],
    ['member/revoke', member.MEMBER_REVOKE_ROUTE],
    ['org_admin/grant', org.ORG_ADMIN_GRANT_ROUTE],
    ['org_admin/revoke', org.ORG_ADMIN_REVOKE_ROUTE],
    ['project_admin/grant', project.PROJECT_ADMIN_GRANT_ROUTE],
    ['project_admin/revoke', project.PROJECT_ADMIN_REVOKE_ROUTE],
  ] as const) {
    const metadata = JSON.parse(
      await readFile(
        `examples/platform/snapshot/metadata/${path}.operation.json`,
        'utf8',
      ),
    )
    expect(metadata.operation).toBe(route.operation)
    expect(metadata.type).toBe(route.contract.type)
    const errors = JSON.parse(
      await readFile(
        `examples/platform/snapshot/metadata/${path}.errors.json`,
        'utf8',
      ),
    )
    expect(
      errors.cases.map((error: { literal: string }) => error.literal).sort(),
    ).toEqual(route.contract.errors.map((error) => error.literal).sort())
  }
})

test('selected user access reflects project reads and refreshes after commands', async () => {
  const { app, stop } = mount(`?screen=access&principal=${ANN}`)
  await app.initialize()
  await settle()
  expect(app.access.grantsState()).toEqual({ loading: false })
  expect(app.access.grants().map((row) => row.project)).toEqual([
    'archive',
    'billing',
    'shop',
  ])
  expect(
    app.access.grants().find((row) => row.project === 'billing')?.member,
  ).toMatchObject({
    principalId: ANN,
    projectAdmin: false,
    environments: ['dev'],
  })
  expect(
    app.access.grants().find((row) => row.project === 'shop')?.member,
  ).toBeUndefined()
  app.access.form.setValue('kind', 'project')
  flush()
  app.access.form.setValue('project', 'billing')
  flush()
  await app.access.form.submit()
  await settle()
  expect(
    app.access.grants().find((row) => row.project === 'billing')?.member,
  ).toMatchObject({
    projectAdmin: true,
    environments: ['dev', 'prod'],
  })
  stop()
})
test('selected user access reads only administrable projects and retains unknown failures', async () => {
  const { app, stop } = mount(
    `?screen=access&principal=${ANN}`,
    'project-admin',
  )
  await app.initialize()
  await settle()
  expect(app.access.grants().map((row) => row.project)).toEqual(['billing'])
  const original = app.mock.transport.invoke.bind(app.mock.transport)
  app.mock.transport.invoke = async (request) =>
    request.operation.includes(':member/list')
      ? {
          status: 'uncertain',
          reason: 'Membership read unavailable.',
          retryRefusal: null,
        }
      : original(request)
  await app.refresh()
  await settle()
  expect(app.access.grants()).toEqual([
    {
      project: 'billing',
      error: expect.stringContaining('Membership read unavailable.'),
    },
  ])
  expect(app.access.state().error).toBeUndefined()
  stop()
})
test('late selected user summaries cannot cross principals or disposal', async () => {
  const { app, stop } = mount(`?screen=access&principal=${ANN}`)
  await app.initialize()
  await settle()
  const original = app.mock.transport.invoke.bind(app.mock.transport)
  let release!: () => void
  let held = false
  app.mock.transport.invoke = async (request) => {
    if (!held && request.operation.includes(':member/list')) {
      held = true
      await new Promise<void>((resolve) => {
        release = resolve
      })
    }
    return original(request)
  }
  const old = app.refresh()
  await settle()
  expect(held).toBe(true)
  app.enter({ screen: 'access', principal: MOCK_ACTOR })
  flush()
  await settle()
  expect(
    app.access.grants().find((row) => row.project === 'billing')?.member
      ?.principalId,
  ).toBe(MOCK_ACTOR)
  release()
  await old
  await settle()
  expect(
    app.access
      .grants()
      .every((row) => !row.member || row.member.principalId === MOCK_ACTOR),
  ).toBe(true)
  held = false
  const disposed = app.refresh()
  await settle()
  stop()
  flush()
  const before = app.access.grants()
  release()
  await disposed
  await settle()
  expect(app.access.grants()).toBe(before)
})

test('a refused command marks an interrupted summary stale until explicit refresh', async () => {
  const { app, stop } = mount(`?screen=access&principal=${ANN}`)
  await app.initialize()
  await settle()
  app.access.form.setValue('kind', 'organization')
  flush()
  const original = app.mock.transport.invoke.bind(app.mock.transport)
  let release!: () => void
  let held = false
  app.mock.transport.invoke = async (request) => {
    if (
      !held &&
      request.operation.includes(':member/list') &&
      typeof request.items[0] === 'object' &&
      request.items[0] !== null &&
      'project' in request.items[0] &&
      request.items[0].project === 'billing'
    ) {
      held = true
      await new Promise<void>((resolve) => {
        release = resolve
      })
    }
    if (request.method === 'POST')
      return {
        status: 'uncertain',
        reason: 'Command reply unavailable.',
        retryRefusal: null,
      }
    return original(request)
  }
  const old = app.access.load({ screen: 'access', principal: ANN })
  await settle()
  expect(held).toBe(true)
  expect(app.access.grants().map((row) => row.project)).toEqual(['archive'])
  await app.access.form.submit()
  await settle()
  expect(app.access.grantsState()).toEqual({
    loading: false,
    error: 'Refresh to read current project access.',
  })
  expect(app.access.grants()).toEqual([])
  release()
  await old
  await settle()
  expect(app.access.grantsState().error).toContain('Refresh')
  app.mock.transport.invoke = original
  await app.refresh()
  await settle()
  expect(app.access.grantsState()).toEqual({ loading: false })
  expect(app.access.grants()).toHaveLength(3)
  stop()
})
