/** Passive, bounded evidence for an existing navigation deadline. Never retries navigation. */
export async function captureNavigation({ page, server, limit = 256 }) {
  if (!Number.isSafeInteger(limit) || limit < 1)
    throw new RangeError('Navigation event limit must be a positive integer')
  const session = await page.context().newCDPSession(page)
  const started = Date.now()
  const report = { started, events: [], droppedEvents: 0, droppedRequests: 0 }
  const pending = new Map()
  const serverPending = new Map()
  const remove = []
  let active = true
  let detached = false
  let requestId = 0
  const record = (kind, value) => {
    if (!active) return
    if (report.events.length === limit) {
      report.events.shift()
      report.droppedEvents++
    }
    report.events.push({ at: Date.now() - started, kind, ...value })
  }
  const listen = (emitter, name, callback) => {
    emitter.on(name, callback)
    const off = () => emitter.off(name, callback)
    remove.push(off)
    return off
  }
  listen(session, 'Network.requestWillBeSent', (event) => {
    const value = {
      id: event.requestId,
      url: event.request.url,
      method: event.request.method,
      type: event.type,
      frameId: event.frameId,
      loaderId: event.loaderId,
    }
    if (pending.has(value.id) || pending.size < limit)
      pending.set(value.id, value)
    else report.droppedRequests++
    record('browser-request', value)
  })
  listen(session, 'Network.responseReceived', (event) =>
    record('browser-response', {
      id: event.requestId,
      url: event.response.url,
      status: event.response.status,
      fromDiskCache: event.response.fromDiskCache,
      type: event.type,
    }),
  )
  for (const name of ['Network.loadingFinished', 'Network.loadingFailed'])
    listen(session, name, (event) => {
      pending.delete(event.requestId)
      record(name, {
        id: event.requestId,
        error: event.errorText,
        canceled: event.canceled,
      })
    })
  listen(session, 'Page.frameNavigated', ({ frame }) =>
    record('frame-navigated', {
      id: frame.id,
      parentId: frame.parentId,
      url: frame.url,
      loaderId: frame.loaderId,
    }),
  )
  listen(session, 'Page.lifecycleEvent', (event) =>
    record('lifecycle', {
      name: event.name,
      frameId: event.frameId,
      loaderId: event.loaderId,
    }),
  )
  listen(page, 'domcontentloaded', () => record('page-domcontentloaded', {}))
  listen(page, 'load', () => record('page-load', {}))
  // Observe Node's request/response lifecycle without consuming or changing either stream.
  const responseCleanup = new Set()
  if (server)
    listen(server, 'request', (request, response) => {
      const id = ++requestId
      const value = { id, url: request.url, method: request.method }
      record('server-request', value)
      if (serverPending.size >= limit) {
        report.droppedRequests++
        return
      }
      serverPending.set(id, value)
      const finish = () => done('server-finish')
      const close = () => done('server-close')
      const cleanup = () => {
        response.off('finish', finish)
        response.off('close', close)
        responseCleanup.delete(cleanup)
      }
      const done = (kind) => {
        record(kind, {
          ...value,
          status: response.statusCode,
          completed: response.writableFinished,
        })
        serverPending.delete(id)
        cleanup()
      }
      responseCleanup.add(cleanup)
      response.on('finish', finish)
      response.on('close', close)
    })
  function stop(error) {
    if (!active) return
    report.elapsed = Date.now() - started
    report.url = page.url()
    report.outcome = error ? 'failed' : 'complete'
    if (error) report.error = String(error)
    report.pendingBrowser = [...pending.values()]
    report.pendingServer = [...serverPending.values()]
    active = false
    remove.splice(0).forEach((off) => off())
    for (const cleanup of [...responseCleanup]) cleanup()
    pending.clear()
    serverPending.clear()
  }
  async function dispose() {
    stop()
    if (detached) return
    detached = true
    await session.detach()
  }
  try {
    await session.send('Network.enable')
    await session.send('Page.enable')
    await session.send('Page.setLifecycleEventsEnabled', { enabled: true })
  } catch (error) {
    stop(error)
    const cleanupFailures = []
    try {
      await dispose()
    } catch (cleanupError) {
      cleanupFailures.push(cleanupError)
    }
    if (cleanupFailures.length)
      throw new AggregateError(
        [error, ...cleanupFailures],
        'Navigation capture setup and cleanup failed',
        { cause: error },
      )
    throw error
  }
  return { report, stop, dispose }
}
