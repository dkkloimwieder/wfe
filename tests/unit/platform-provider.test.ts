import { expect, test } from 'vitest'
import {
  createPlatformClient,
  createPlatformMock,
  projectError,
  canonicalProject,
} from '../../examples/platform/provider'
import { PROJECT_CREATE_ROUTE } from '../../examples/platform/snapshot/client/project'
import type { Transport } from '../../examples/platform/snapshot/runtime/wire'

test('platform reads use generated routes and revive nested wire member names', async () => {
  const mock = createPlatformMock(),
    client = createPlatformClient(mock.transport)
  expect(await client.mine()).toMatchObject({
    status: 'completed',
    value: {
      orgAdmin: true,
      projects: expect.arrayContaining([
        { project: 'billing', projectAdmin: true },
      ]),
    },
  })
  expect(await client.projects()).toEqual({
    status: 'completed',
    value: {
      projects: [
        { name: 'archive', state: 'inactive' },
        { name: 'billing', state: 'active' },
        { name: 'shop', state: 'active' },
      ],
    },
  })
  expect(await client.environments('billing')).toEqual({
    status: 'completed',
    value: {
      environments: [
        { name: 'dev', state: 'active' },
        { name: 'prod', state: 'inactive' },
      ],
    },
  })
  const status = await client.status('billing', 'dev')
  expect(status).toMatchObject({
    status: 'completed',
    value: {
      rollout: { updatedReplicas: 2, readyReplicas: 2 },
      workloads: [{ conditions: [{ type: 'Ready', status: 'True' }] }],
    },
  })
  expect(mock.sent().at(-1)).toMatchObject({
    operation: 'wamn-control:environment/status@0.9.0',
    method: 'GET',
    items: [{ project: 'billing', env: 'dev' }],
  })
})
test('project creation encodes the nested command with the application request identity', async () => {
  const mock = createPlatformMock(),
    client = createPlatformClient(mock.transport)
  expect(await client.create({ project: ' accounts ' }, 'intent-1')).toEqual({
    status: 'completed',
    value: { project: 'accounts' },
  })
  expect(mock.sent()[0]).toEqual({
    ...PROJECT_CREATE_ROUTE,
    items: [{ request_id: 'intent-1', value: { project: ' accounts ' } }],
  })
  expect(
    await client.create({ project: '\u0085trimmed\u0085' }, 'intent-trim'),
  ).toEqual({ status: 'completed', value: { project: 'trimmed' } })
  expect(await client.environments('accounts')).toEqual({
    status: 'completed',
    value: { environments: [] },
  })
  expect(
    await client.create({ project: 'accounts' }, 'intent-2'),
  ).toMatchObject({
    status: 'refused',
    code: 'project_exists',
    detail: { detail: { field: 'project' } },
    text: expect.any(String),
  })
})
test('UTF-8 validation follows the recorded server rule without inventing a slug rule', async () => {
  expect(projectError('  ')).toBeDefined()
  expect(projectError('é'.repeat(20))).toBeUndefined()
  expect(projectError('é'.repeat(21))).toBeDefined()
  expect(projectError('My project / 2')).toBeUndefined()
  expect(projectError('\u0085')).toBeDefined()
  expect(canonicalProject(' \u0085billing\u0085 ')).toBe('billing')
  expect(canonicalProject('\uFEFFbilling\uFEFF')).toBe('\uFEFFbilling\uFEFF')
  expect(projectError('\uFEFF')).toBeUndefined()
  const client = createPlatformClient(createPlatformMock().transport)
  expect(
    await client.create({ project: 'x'.repeat(41) }, 'too-long'),
  ).toMatchObject({ status: 'refused', code: 'invalid_input' })
})
test('authority refusal stays distinct from empty results and project-admin scope', async () => {
  const limited = createPlatformClient(
    createPlatformMock('project-admin').transport,
  )
  expect(await limited.mine()).toEqual({
    status: 'completed',
    value: {
      orgAdmin: false,
      projects: [{ project: 'billing', projectAdmin: true }],
    },
  })
  expect(await limited.projects()).toMatchObject({
    status: 'refused',
    code: 'permission-denied',
  })
  expect(await limited.environments('billing')).toMatchObject({
    status: 'completed',
  })
  expect(await limited.environments('shop')).toMatchObject({
    status: 'refused',
    code: 'permission-denied',
  })
  expect(await limited.create({ project: 'new' }, 'not-allowed')).toMatchObject(
    { status: 'refused', code: 'permission-denied' },
  )
  const empty = createPlatformClient(createPlatformMock('empty').transport)
  expect(await empty.projects()).toEqual({
    status: 'completed',
    value: { projects: [] },
  })
  expect(
    await createPlatformClient(
      createPlatformMock('no-access').transport,
    ).mine(),
  ).toEqual({ status: 'completed', value: { orgAdmin: false, projects: [] } })
})
test('invalid nested replies, malformed JSON, wrong command identity and unknown refusals establish no result', async () => {
  const mock = createPlatformMock(),
    client = createPlatformClient(mock.transport)
  mock.replyNext({
    status: 200,
    body: JSON.stringify([
      {
        value: {
          digest: null,
          rollout: { replicas: 'wrong' },
          workloads: [],
          live: [],
        },
      },
    ]),
  })
  expect(await client.status('billing', 'dev')).toMatchObject({
    status: 'uncertain',
  })
  mock.replyNext({ status: 200, body: '{broken' })
  expect(await client.projects()).toMatchObject({ status: 'uncertain' })
  mock.replyNext({
    status: 200,
    body: JSON.stringify([
      { request_id: 'other-intent', value: { project: 'wrong' } },
    ]),
  })
  expect(
    await client.create({ project: 'new' }, 'correct-intent'),
  ).toMatchObject({ status: 'uncertain' })
  mock.replyNext({
    status: 200,
    body: JSON.stringify([
      { error: { code: 'invented', detail: { field: 'project' } } },
    ]),
  })
  expect(await client.projects()).toMatchObject({ status: 'uncertain' })
})
test('application cancellation stops waiting but does not claim command rollback or retry', async () => {
  const mock = createPlatformMock(),
    client = createPlatformClient(mock.transport),
    abort = new AbortController()
  const release = mock.holdNext()
  const request = client.create(
    { project: 'late' },
    'intent-once',
    abort.signal,
  )
  abort.abort()
  expect(await request).toMatchObject({ status: 'uncertain' })
  release()
  expect(await client.projects()).toMatchObject({
    status: 'completed',
    value: {
      projects: expect.arrayContaining([{ name: 'late', state: 'inactive' }]),
    },
  })
  expect(
    mock.sent().filter((r) => r.operation === PROJECT_CREATE_ROUTE.operation),
  ).toHaveLength(1)
  mock.dispose()
})
test('disposal releases held mock requests and a pre-aborted call sends nothing', async () => {
  const mock = createPlatformMock(),
    client = createPlatformClient(mock.transport),
    abort = new AbortController()
  abort.abort()
  expect(await client.projects(abort.signal)).toMatchObject({
    status: 'uncertain',
  })
  expect(mock.sent()).toEqual([])
  mock.holdNext()
  const pending = client.projects()
  mock.dispose()
  expect(await pending).toMatchObject({ status: 'uncertain' })
})
test('partial results and thrown transports never become accepted project data', async () => {
  const partial: Transport = {
    invoke: async () => ({
      status: 'partiallyCompleted',
      committedResult: { project: 'new' },
      failedOutcome: null,
    }),
  }
  expect(
    await createPlatformClient(partial).create({ project: 'new' }, 'partial'),
  ).toMatchObject({ status: 'uncertain' })
  const failed: Transport = {
    invoke: async () => {
      throw new Error('offline')
    },
  }
  expect(await createPlatformClient(failed).projects()).toMatchObject({
    status: 'uncertain',
  })
})

test('the selected generated route contracts agree with the captured source operation metadata', async () => {
  const { readFile } = await import('node:fs/promises')
  const { resolve } = await import('node:path')
  const { CONTROL_MINE_ROUTE } =
    await import('../../examples/platform/snapshot/client/control')
  const { PROJECT_LIST_ROUTE } =
    await import('../../examples/platform/snapshot/client/project')
  const { ENVIRONMENT_LIST_ROUTE, ENVIRONMENT_STATUS_ROUTE } =
    await import('../../examples/platform/snapshot/client/environment')
  for (const route of [
    CONTROL_MINE_ROUTE,
    PROJECT_LIST_ROUTE,
    PROJECT_CREATE_ROUTE,
    ENVIRONMENT_LIST_ROUTE,
    ENVIRONMENT_STATUS_ROUTE,
  ]) {
    const path = route.operation.slice('wamn-control:'.length).split('@')[0]
    const root = resolve('examples/platform/snapshot/metadata')
    const metadata = JSON.parse(
      await readFile(resolve(root, `${path}.operation.json`), 'utf8'),
    )
    const errors = JSON.parse(
      await readFile(resolve(root, `${path}.errors.json`), 'utf8'),
    )
    expect(route.operation).toBe(metadata.operation)
    expect(route.contract.type).toBe(metadata.type)
    expect(route.contract.transaction).toBe(metadata.transaction)
    expect(route.contract.errors.map((e) => e.literal).sort()).toEqual(
      errors.cases.map((e: { literal: string }) => e.literal).sort(),
    )
  }
})

test('application result checks reject wrong types at every leaf declared by the captured status metadata', async () => {
  const { readFile } = await import('node:fs/promises')
  const { resolve } = await import('node:path')
  const { ENVIRONMENT_STATUS_ROUTE } =
    await import('../../examples/platform/snapshot/client/environment')
  const mock = createPlatformMock(),
    client = createPlatformClient(mock.transport)
  const raw = await mock.transport.invoke({
    ...ENVIRONMENT_STATUS_ROUTE,
    items: [{ project: 'billing', env: 'dev' }],
  })
  if (raw.status !== 'completed')
    throw new Error('The baseline status reply must complete')
  const metadata = JSON.parse(
    await readFile(
      resolve(
        'examples/platform/snapshot/metadata/environment/status.result.json',
      ),
      'utf8',
    ),
  )
  for (const field of metadata.fields as { path: string; type: string }[]) {
    const value = structuredClone(raw.value) as Record<string, unknown>
    const parts = field.path.replaceAll('[]', '.0').split('.')
    let object = value
    for (const part of parts.slice(0, -1)) {
      expect(object).toHaveProperty(part)
      object = object[part] as Record<string, unknown>
    }
    const leaf = parts.at(-1)!
    expect(object).toHaveProperty(leaf)
    object[leaf] = field.type === 'text' ? 42 : 'wrong numeric type'
    mock.replyNext({ status: 200, body: JSON.stringify([{ value }]) })
    expect(await client.status('billing', 'dev'), field.path).toMatchObject({
      status: 'uncertain',
    })
  }
})

for (const key of ['projects', 'environments'] as const) {
  test(`${key} validate current record states instead of trusting stale generated array types`, async () => {
    const mock = createPlatformMock()
    const client = createPlatformClient(mock.transport)
    const read = () =>
      key === 'projects' ? client.projects() : client.environments('billing')
    for (const rows of [
      ['legacy'],
      [{ name: 'x' }],
      [{ name: 'x', state: null }],
      [{ name: 'x', state: 'unknown' }],
      [{ name: 42, state: 'active' }],
      [{ name: 'x', state: 1 }],
    ]) {
      mock.replyNext({
        status: 200,
        body: JSON.stringify([{ value: { [key]: rows } }]),
      })
      expect(await read()).toMatchObject({
        status: 'uncertain',
        reason: 'The reply does not match the operation result.',
      })
    }
    const rows = [
      { name: 'Mixed / Case', state: 'inactive' },
      { name: 'second', state: 'active' },
    ]
    mock.replyNext({
      status: 200,
      body: JSON.stringify([{ value: { [key]: rows } }]),
    })
    expect(await read()).toEqual({
      status: 'completed',
      value: { [key]: rows },
    })
    mock.dispose()
  })
}
