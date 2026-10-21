import { expect, test } from 'vitest'
import { createRoot, flush } from 'solid-js'
import { createPlatformApplication } from '../../examples/platform/application'
import { platformRoute, platformUrl } from '../../examples/platform/route'
const settle = async () => {
  for (let i = 0; i < 16; i++) {
    await Promise.resolve()
    flush()
  }
}
function mount(query: string) {
  let app!: ReturnType<typeof createPlatformApplication>
  const stop = createRoot((dispose) => {
    app = createPlatformApplication(platformRoute(query))
    return dispose
  })
  return { app, stop }
}
test('application routes preserve separate scope, selected user and arbitrary role identity', () => {
  const role = {
    screen: 'app-role',
    project: 'billing',
    env: 'dev',
    role: 'Team / reviewer',
  } as const
  expect(
    platformRoute(
      platformUrl('https://example.test/?screen=access&principal=old', role)
        .href,
    ),
  ).toEqual(role)
  expect(
    platformUrl(
      'https://example.test/?screen=app-role&project=billing&env=dev&role=reader',
      { screen: 'users' },
    ).search,
  ).toBe('?screen=users')
  expect(
    platformRoute(
      '?screen=app-user&project=billing&env=dev&principal=00000000-0000-4000-8000-000000000002',
    ),
  ).toEqual({
    screen: 'app-user',
    project: 'billing',
    env: 'dev',
    principal: '00000000-0000-4000-8000-000000000002',
  })
})
test.each([
  '?screen=app-users',
  '?screen=app-roles&project=billing',
  '?screen=app-user&project=billing&env=dev',
  '?screen=app-user&project=billing&env=dev&principal=bad',
  '?screen=app-role&project=billing&env=dev',
  '?screen=app-role&project=billing&env=dev&role=reader&principal=wrong',
  '?screen=projects&role=reader',
])('rejects incomplete or mixed route %s', (query) => {
  expect(platformRoute(query)).toEqual({ screen: 'missing' })
})
test('direct links load the application audience and do not equate control administration with application administration', async () => {
  const { app, stop } = mount('?screen=app-users&project=billing&env=prod')
  await app.initialize()
  await settle()
  expect(app.authority()?.orgAdmin).toBe(true)
  expect(app.applicationAccess.authority()?.admin).toBe(false)
  expect(app.applicationAccess.state().error).toContain('not available')
  expect(app.applicationAccess.users()).toEqual([])
  stop()
})
test('an unavailable environment never dispatches application-host requests', async () => {
  const { app, stop } = mount('?screen=app-users&project=billing&env=unknown')
  await app.initialize()
  await settle()
  expect(app.detail().error).toContain('environment is unavailable')
  expect(app.applicationAccess.mock.sent()).toEqual([])
  stop()
})
test('table owners retain widths when navigation leaves and returns to application access', async () => {
  const { app, stop } = mount('?screen=app-users&project=billing&env=dev')
  await app.initialize()
  await settle()
  const table = app.applicationAccess.usersTable
  table.getColumn('email')!.setSize(420)
  flush()
  app.enter({ screen: 'projects' })
  await settle()
  app.enter({ screen: 'app-users', project: 'billing', env: 'dev' })
  await settle()
  expect(app.applicationAccess.usersTable).toBe(table)
  expect(table.getColumn('email')!.getSize()).toBe(420)
  stop()
})

test('failed environment discovery clears previously loaded application authority and rows', async () => {
  const { app, stop } = mount('?screen=app-users&project=billing&env=dev')
  try {
    await app.initialize()
    await settle()
    expect(app.applicationAccess.authority()?.admin).toBe(true)
    expect(app.applicationAccess.users().length).toBeGreaterThan(0)
    const sent = app.applicationAccess.mock.sent().length
    app.mock.replyNext({
      status: 200,
      body: JSON.stringify([{ value: { environments: 'invalid' } }]),
    })
    await app.refresh()
    await settle()
    expect(app.detail().error).toBeTruthy()
    expect(app.applicationAccess.authority()).toBeUndefined()
    expect(app.applicationAccess.users()).toEqual([])
    expect(app.applicationAccess.mock.sent()).toHaveLength(sent)
  } finally {
    stop()
  }
})
