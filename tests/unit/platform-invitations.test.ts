import { expect, test } from 'vitest'
import { createRoot, flush } from 'solid-js'
import { createPlatformApplication } from '../../examples/platform/application'
import { invitationRequest } from '../../examples/platform/invitation-application'
import {
  createPlatformClient,
  createPlatformMock,
} from '../../examples/platform/provider'
import { platformRoute } from '../../examples/platform/route'
const ANN = '00000000-0000-4000-8000-000000000002'
const settle = async () => {
  for (let i = 0; i < 80; i++) {
    await Promise.resolve()
    flush()
  }
}
function mount(scenario: 'normal' | 'project-admin' | 'no-access' = 'normal') {
  let app!: ReturnType<typeof createPlatformApplication>
  const stop = createRoot((dispose) => {
    app = createPlatformApplication({ screen: 'invite' }, scenario)
    return dispose
  })
  return { app, stop }
}
function person(app: ReturnType<typeof createPlatformApplication>) {
  app.invitation.form.setValue('displayName', 'Sample Person')
  flush()
  app.invitation.form.setValue('email', 'person@example.test')
  flush()
}
test('invitation route rejects unrelated coordinates', () => {
  expect(platformRoute('?screen=invite')).toEqual({ screen: 'invite' })
  expect(platformRoute('?screen=invite&project=billing')).toEqual({
    screen: 'missing',
  })
})
test('demo invitation maps collections and nullable administration without UI keys or opaque target IDs', async () => {
  const { app, stop } = mount()
  try {
    await app.initialize()
    await settle()
    person(app)
    const memberships = app.invitation.memberships().slice(0, 2)
    const projects = app.invitation.projects().slice(0, 2)
    app.invitation.form.setValue(
      'memberships',
      memberships.map((choice, i) => ({ key: `row-${i}`, target: choice.id })),
    )
    flush()
    app.invitation.form.setValue(
      'projectAdmins',
      projects.map((choice, i) => ({ key: `project-${i}`, target: choice.id })),
    )
    flush()
    expect(await app.invitation.form.submit()).toEqual({ status: 'success' })
    await settle()
    const request = app.mock.sent().at(-1)!
    expect(request.operation).toContain('user/invite')
    expect(request.items).toEqual([
      {
        request_id: expect.any(String),
        value: {
          display_name: 'Sample Person',
          email: 'person@example.test',
          org_admin: null,
          memberships: memberships.map((choice) => ({
            project: choice.project,
            env: choice.env,
          })),
          project_admins: projects.map((choice) => choice.project),
        },
      },
    ])
    for (const [choice, expected] of [
      ['unspecified', null],
      ['yes', true],
      ['no', false],
    ] as const) {
      const result = invitationRequest(
        {
          ...app.invitation.snapshot(),
          orgAdmin: choice,
          memberships: [],
          projectAdmins: [],
        },
        [],
        [],
      )
      expect(result).toEqual({
        displayName: 'Sample Person',
        email: 'person@example.test',
        orgAdmin: expected,
        memberships: [],
        projectAdmins: [],
      })
    }
    app.enter({ screen: 'users' })
    await settle()
    expect(
      app.access.users().some((user) => user.email === 'person@example.test'),
    ).toBe(true)
  } finally {
    stop()
  }
})
test('empty collections submit and sample rows keep errors by key after removal', async () => {
  const { app, stop } = mount()
  try {
    await app.initialize()
    await settle()
    person(app)
    const good = { key: 'good', target: app.invitation.memberships()[0]!.id },
      bad = { key: 'bad', target: 'old-or-inaccessible' }
    app.invitation.form.setValue('memberships', [good, bad])
    const before = app.mock.sent().length
    flush()
    expect(await app.invitation.form.submit()).toEqual({ status: 'invalid' })
    expect(
      app.invitation.form.errors.rows?.memberships?.bad?.fields?.target,
    ).toContain('current sample target')
    expect(app.mock.sent()).toHaveLength(before)
    app.invitation.form.setValue('memberships', [bad])
    flush()
    await app.invitation.form.submit()
    await settle()
    expect(app.invitation.form.errors.rows?.memberships?.bad).toBeDefined()
    app.invitation.form.setValue('memberships', [])
    flush()
    expect(await app.invitation.form.submit()).toEqual({ status: 'success' })
    expect(app.mock.sent().at(-1)?.items[0]).toMatchObject({
      value: { memberships: [], project_admins: [] },
    })
  } finally {
    stop()
  }
})
test('sample target access and missing values produce errors without sending commands', async () => {
  const { app, stop } = mount('project-admin')
  try {
    await app.initialize()
    await settle()
    expect(app.invitation.projects().map((p) => p.project)).toEqual(['billing'])
    await app.invitation.form.submit()
    await settle()
    expect(app.invitation.form.errors.fields?.email).toBeDefined()
    person(app)
    app.invitation.form.setValue('orgAdmin', 'yes')
    flush()
    app.invitation.form.setValue('projectAdmins', [
      { key: 'stale', target: JSON.stringify(['shop']) },
    ])
    flush()
    expect(await app.invitation.form.submit()).toEqual({ status: 'invalid' })
    expect(app.invitation.form.errors.fields?.orgAdmin).toBeDefined()
    expect(app.invitation.form.errors.rows?.projectAdmins?.stale).toBeDefined()
    expect(
      app.mock
        .sent()
        .some((request) => request.operation.includes('user/invite')),
    ).toBe(false)
  } finally {
    stop()
  }
})
test('simulated refusal and uncertain completion retain invitation drafts', async () => {
  const { app, stop } = mount()
  try {
    await app.initialize()
    await settle()
    person(app)
    for (const reply of [
      {
        status: 403,
        body: JSON.stringify({
          error: {
            code: 'permission-denied',
            operation: 'wamn-control:user/invite@0.9.0',
          },
        }),
      },
      { status: 503, body: 'Sample connection lost' },
    ]) {
      app.mock.replyNext(reply)
      flush()
      expect(await app.invitation.form.submit()).toEqual({ status: 'rejected' })
      expect(app.invitation.form.errors.form).toBeTruthy()
      expect(app.invitation.form.values.displayName).toBe('Sample Person')
      expect(app.invitation.completed()).toBe('')
    }
  } finally {
    stop()
  }
})
test('navigation and disposal cancel waiting without a late success or automatic retry', async () => {
  for (const dispose of [false, true]) {
    const { app, stop } = mount()
    await app.initialize()
    await settle()
    person(app)
    const release = app.mock.holdNext()
    flush()
    const pending = app.invitation.form.submit()
    await settle()
    expect(app.invitation.form.pending).toBe(true)
    if (dispose) stop()
    else app.enter({ screen: 'users' })
    release()
    await pending
    await settle()
    expect(app.invitation.completed()).toBe('')
    expect(
      app.mock
        .sent()
        .filter((request) => request.operation.includes('user/invite')),
    ).toHaveLength(1)
    if (!dispose) stop()
  }
})
test('lifecycle confirmations capture identities, refresh sample status, and ignore canceled completions', async () => {
  const { app, stop } = mount()
  try {
    await app.initialize()
    await settle()
    app.enter({ screen: 'users' })
    await settle()
    const user = app.access.users().find((user) => user.principalId === ANN)!
    app.lifecycle.open(user, 'deactivate')
    flush()
    expect(app.lifecycle.target()?.name).toBe('Ann Example')
    flush()
    expect(await app.lifecycle.form.submit()).toEqual({ status: 'success' })
    expect(
      app.access.users().find((user) => user.principalId === ANN)?.status,
    ).toBe('inactive')
    await settle()
    expect(app.lifecycle.target()).toBeUndefined()
    const request = app.mock
      .sent()
      .slice()
      .reverse()
      .find((request) => request.operation.includes('user/deactivate'))!
    expect(request.items).toEqual([
      { request_id: expect.any(String), value: { principal_id: ANN } },
    ])
    app.lifecycle.open(user, 'activate')
    const release = app.mock.holdNext(),
      pending = app.lifecycle.form.submit()
    await settle()
    app.lifecycle.close()
    release()
    await pending
    await settle()
    await settle()
    expect(app.lifecycle.target()).toBeUndefined()
    expect(app.lifecycle.form.phase).not.toBe('success')
  } finally {
    stop()
  }
})
test('lifecycle rejects a changed confirmation and the client accepts textual status without inventing an enum', async () => {
  const { app, stop } = mount()
  try {
    await app.initialize()
    await settle()
    app.enter({ screen: 'users' })
    await settle()
    app.lifecycle.open(
      app.access.users().find((user) => user.principalId === ANN)!,
      'activate',
    )
    app.lifecycle.form.setValue('principalId', 'different')
    flush()
    expect(await app.lifecycle.form.submit()).toEqual({ status: 'rejected' })
    expect(
      app.mock
        .sent()
        .some((request) => request.operation.includes('user/activate')),
    ).toBe(false)
  } finally {
    stop()
  }
  const mock = createPlatformMock(),
    client = createPlatformClient(mock.transport)
  try {
    mock.replyNext({
      status: 200,
      body: JSON.stringify([
        {
          request_id: 'one',
          value: { principal_id: ANN, status: 'sample-other-state' },
        },
      ]),
    })
    expect(await client.lifecycle('activate', ANN, 'one')).toMatchObject({
      status: 'completed',
      value: { status: 'sample-other-state' },
    })
    mock.replyNext({
      status: 200,
      body: JSON.stringify([
        {
          request_id: 'two',
          value: { principal_id: 'wrong', status: 'active' },
        },
      ]),
    })
    expect(await client.lifecycle('activate', ANN, 'two')).toMatchObject({
      status: 'uncertain',
    })
  } finally {
    mock.dispose()
  }
})
