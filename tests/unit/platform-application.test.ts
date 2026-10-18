import { expect, test, vi } from 'vitest'
import { createRoot, flush } from 'solid-js'
import { createPlatformApplication } from '../../examples/platform/application'
import { platformRoute, platformUrl } from '../../examples/platform/route'
import type { PlatformScenario } from '../../examples/platform/provider'
function mount(url = '/', scenario: PlatformScenario = 'normal') {
  let app!: ReturnType<typeof createPlatformApplication>
  const stop = createRoot((dispose) => {
    app = createPlatformApplication(platformRoute(url), scenario)
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
test('platform routes preserve scope and reject incomplete coordinates', () => {
  expect(platformRoute('/')).toEqual({ screen: 'projects' })
  expect(platformRoute('?screen=environment&project=billing&env=dev')).toEqual({
    screen: 'environment',
    project: 'billing',
    env: 'dev',
  })
  for (const url of [
    '?screen=project',
    '?screen=environment&project=billing',
    '?screen=create&project=billing',
    '?project=other',
  ])
    expect(platformRoute(url)).toEqual({ screen: 'missing' })
  const url = platformUrl(
    'https://demo.test/?scenario=project-admin&screen=environment&project=billing&env=dev',
    { screen: 'project', project: 'shop / one' },
  )
  expect(platformRoute(url.href)).toEqual({
    screen: 'project',
    project: 'shop / one',
  })
  expect(url.searchParams.get('scenario')).toBe('project-admin')
  expect(url.searchParams.has('env')).toBe(false)
})
test('initial direct links load scope before dependent environment reads', async () => {
  const { app, stop } = mount('?screen=environment&project=billing&env=dev')
  await app.initialize()
  await settle()
  expect(app.session()).toEqual({ loading: false })
  expect(app.projects().map((row) => row.name)).toEqual([
    'archive',
    'billing',
    'shop',
  ])
  expect(app.status()?.rollout.readyReplicas).toBe(2)
  expect(app.detail()).toEqual({ loading: false })
  stop()
})
test('late status replies cannot cross projects that share the same environment name', async () => {
  const { app, stop } = mount()
  await app.initialize()
  await settle()
  const release = app.mock.holdNext()
  app.enter({ screen: 'environment', project: 'billing', env: 'dev' })
  flush()
  app.enter({ screen: 'environment', project: 'shop', env: 'dev' })
  flush()
  await settle()
  expect(app.status()?.workloads[0]?.name).toBe('shop-dev-http')
  release()
  await settle()
  expect(app.status()?.workloads[0]?.name).toBe('shop-dev-http')
  stop()
})
test('refresh sequence keeps a newer project list when an older held read completes', async () => {
  const { app, stop } = mount()
  await app.initialize()
  await settle()
  const release = app.mock.holdNext()
  const old = app.refresh()
  app.enter({ screen: 'create' })
  flush()
  app.form.setValue('project', 'new-project')
  flush()
  const save = app.form.submit()
  await settle()
  await save
  flush()
  expect(app.projects().some((row) => row.name === 'new-project')).toBe(true)
  release()
  await old
  await settle()
  expect(app.projects().some((row) => row.name === 'new-project')).toBe(true)
  stop()
})
test('form validation and server field refusals remain application-owned', async () => {
  const { app, stop } = mount('?screen=create')
  await app.initialize()
  await settle()
  expect(await app.form.submit()).toEqual({ status: 'invalid' })
  flush()
  expect(app.form.errors.fields?.project).toContain('UTF-8')
  app.form.setValue('project', 'billing')
  flush()
  expect(await app.form.submit()).toEqual({ status: 'rejected' })
  flush()
  expect(app.form.errors.fields?.project).toContain('already')
  app.form.setValue('project', 'created')
  flush()
  expect(await app.form.submit()).toEqual({ status: 'success' })
  flush()
  expect(app.created()).toBe('created')
  expect(app.projects().some((row) => row.name === 'created')).toBe(true)
  stop()
})
test('leaving a held command cannot publish its old success into another screen', async () => {
  const { app, stop } = mount('?screen=create')
  await app.initialize()
  await settle()
  app.form.setValue('project', 'late-write')
  flush()
  const release = app.mock.holdNext()
  const save = app.form.submit()
  await settle()
  expect(app.form.pending).toBe(true)
  app.enter({ screen: 'project', project: 'shop' })
  flush()
  release()
  await save
  await settle()
  expect(app.route()).toEqual({ screen: 'project', project: 'shop' })
  expect(app.created()).toBe('')
  expect(app.notice()).toContain('command can still complete')
  app.enter({ screen: 'projects' })
  flush()
  await app.refresh()
  await settle()
  expect(app.projects().some((row) => row.name === 'late-write')).toBe(true)
  stop()
})
test('scoped access does not turn forbidden projects into empty tables', async () => {
  const { app, stop } = mount('?screen=project&project=shop', 'project-admin')
  await app.initialize()
  await settle()
  expect(app.projects().map((row) => row.name)).toEqual(['billing'])
  expect(app.detail().error).toContain('unavailable')
  expect(
    app.mock
      .sent()
      .some((request) => request.operation.includes('environment/list')),
  ).toBe(false)
  stop()
})
test('malformed replies surface as errors and disposal rejects late publication', async () => {
  const { app, stop } = mount()
  await app.initialize()
  await settle()
  app.mock.replyNext({
    status: 200,
    body: '[{"value":{"projects":["duplicate","duplicate"]}}]',
  })
  await app.refresh()
  await settle()
  expect(app.listing().error).toContain('duplicate')
  const release = app.mock.holdNext()
  app.enter({ screen: 'environment', project: 'billing', env: 'dev' })
  flush()
  const previous = app.status()
  stop()
  release()
  await settle()
  expect(app.status()).toBe(previous)
})

test('disposing a pending create releases ownership without publishing its late completion', async () => {
  const { app, stop } = mount('?screen=create')
  await app.initialize()
  await settle()
  app.form.setValue('project', 'disposed-command')
  flush()
  const previous = app.projects()
  const release = app.mock.holdNext()
  const request = app.form.submit()
  await settle()
  expect(app.form.pending).toBe(true)
  stop()
  release()
  expect(await request).toEqual({ status: 'disposed' })
  await settle()
  expect(app.created()).toBe('')
  expect(app.projects()).toBe(previous)
  expect(
    app.mock.sent().filter((item) => item.operation.includes('project/create')),
  ).toHaveLength(1)
})

test('backend identity errors do not mark the editable project field invalid', async () => {
  const { app, stop } = mount('?screen=create')
  await app.initialize()
  await settle()
  app.form.setValue('project', 'new-project')
  flush()
  const requestId = '00000000-0000-4000-8000-000000000001'
  const identity = vi.spyOn(crypto, 'randomUUID').mockReturnValue(requestId)
  try {
    app.mock.replyNext({
      status: 200,
      body: JSON.stringify([
        {
          request_id: requestId,
          error: { code: 'invalid_input', detail: { field: 'request_id' } },
        },
      ]),
    })
    expect(await app.form.submit()).toEqual({ status: 'rejected' })
    flush()
    expect(app.form.errors.fields?.project).toBeUndefined()
    expect(app.form.errors.form).toContain('invalid_input')
  } finally {
    identity.mockRestore()
    stop()
  }
})
