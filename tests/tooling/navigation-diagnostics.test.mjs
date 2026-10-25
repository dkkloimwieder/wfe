import assert from 'node:assert/strict'
import { test } from 'node:test'
import { EventEmitter } from 'node:events'
import { captureNavigation } from '../../examples/shared/browser/navigation-diagnostics.mjs'

function fixture(failSetup = false) {
  const session = new EventEmitter()
  const commands = []
  let detached = 0
  session.send = async (name) => {
    commands.push(name)
    if (failSetup) throw new Error('protocol setup')
  }
  session.detach = async () => {
    detached++
  }
  const page = new EventEmitter()
  page.context = () => ({ newCDPSession: async () => session })
  page.url = () => 'http://local.test/?consumer=1'
  const server = new EventEmitter()
  return { session, commands, page, server, detached: () => detached }
}

test('navigation deadline retains browser and server evidence without changing navigation', async () => {
  const f = fixture()
  const capture = await captureNavigation(f)
  const response = new EventEmitter()
  response.statusCode = 200
  response.writableFinished = true
  f.server.emit('request', { method: 'GET', url: '/entry.js' }, response)
  f.session.emit('Network.requestWillBeSent', {
    requestId: 'a',
    request: { method: 'GET', url: 'http://local.test/entry.js' },
    type: 'Script',
  })
  f.session.emit('Network.responseReceived', {
    requestId: 'a',
    response: { url: 'http://local.test/entry.js', status: 200 },
    type: 'Script',
  })
  response.emit('finish')
  f.session.emit('Page.frameNavigated', {
    frame: { id: 'main', url: f.page.url(), loaderId: 'l' },
  })
  f.session.emit('Page.lifecycleEvent', {
    name: 'DOMContentLoaded',
    frameId: 'main',
    loaderId: 'l',
  })
  const failure = new Error('original navigation deadline')
  capture.stop(failure)
  assert.equal(capture.report.outcome, 'failed')
  assert.match(capture.report.error, /original navigation deadline/)
  assert.equal(capture.report.pendingBrowser.length, 1)
  assert.deepEqual(capture.report.pendingServer, [])
  assert.ok(
    capture.report.events.some((event) => event.kind === 'server-finish'),
  )
  assert.ok(
    capture.report.events.some((event) => event.kind === 'frame-navigated'),
  )
  assert.deepEqual(f.commands, [
    'Network.enable',
    'Page.enable',
    'Page.setLifecycleEventsEnabled',
  ])
  assert.equal(f.server.listenerCount('request'), 0)
  assert.equal(response.listenerCount('finish'), 0)
  assert.equal(f.session.eventNames().length, 0)
  assert.equal(f.page.eventNames().length, 0)
  const frozen = JSON.stringify(capture.report)
  f.session.emit('Network.loadingFinished', { requestId: 'a' })
  await capture.dispose()
  await capture.dispose()
  assert.equal(JSON.stringify(capture.report), frozen)
  assert.equal(f.detached(), 1)
})

test('capture bounds events, pending requests and response listeners, including unfinished responses', async () => {
  const f = fixture()
  const capture = await captureNavigation({ ...f, limit: 2 })
  const responses = []
  for (let i = 0; i < 5; i++) {
    f.session.emit('Network.requestWillBeSent', {
      requestId: String(i),
      request: { method: 'GET', url: '/' + i },
    })
    const response = new EventEmitter()
    responses.push(response)
    f.server.emit('request', { method: 'GET', url: '/' + i }, response)
  }
  capture.stop(new Error('timeout'))
  assert.equal(capture.report.events.length, 2)
  assert.equal(capture.report.droppedEvents, 8)
  assert.equal(capture.report.droppedRequests, 6)
  assert.equal(capture.report.pendingBrowser.length, 2)
  assert.equal(capture.report.pendingServer.length, 2)
  assert.ok(responses.every((response) => response.eventNames().length === 0))
  await capture.dispose()
})

test('setup failure removes listeners and detaches the diagnostic session', async () => {
  const f = fixture(true)
  await assert.rejects(captureNavigation(f), /protocol setup/)
  assert.equal(f.detached(), 1)
  assert.equal(f.server.eventNames().length, 0)
  assert.equal(f.session.eventNames().length, 0)
  assert.equal(f.page.eventNames().length, 0)
})

test('setup and detach failures preserve the original cause and both errors', async () => {
  const f = fixture(true)
  f.session.detach = async () => {
    throw new Error('protocol detach')
  }
  await assert.rejects(captureNavigation(f), (error) => {
    assert.ok(error instanceof AggregateError)
    assert.match(error.cause.message, /protocol setup/)
    assert.deepEqual(
      error.errors.map((entry) => entry.message),
      ['protocol setup', 'protocol detach'],
    )
    return true
  })
  assert.equal(f.server.eventNames().length, 0)
  assert.equal(f.session.eventNames().length, 0)
})
