import assert from 'node:assert/strict'
import { test } from 'node:test'
import { EventEmitter } from 'node:events'
import { get } from 'node:http'
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  startStaticServer,
  launchBrowser,
  attachDiagnostics,
  readReactiveDiagnostics,
  selectGroups,
  createRecorder,
  withCleanup,
  captureDiagnostic,
  finalizeReport,
  errorDetails,
  errorText,
} from '../../examples/shared/browser/runner.mjs'
import { qualificationEnvironment } from '../../scripts/qualify.mjs'

function request(url) {
  return new Promise((done, reject) => {
    get(url, (response) => {
      const chunks = []
      response.on('data', (bytes) => chunks.push(bytes))
      response.on('end', () =>
        done({
          status: response.statusCode,
          type: response.headers['content-type'],
          body: Buffer.concat(chunks).toString(),
        }),
      )
      response.on('error', reject)
    }).on('error', reject)
  })
}

test('static server confines decoded and symlink paths and preserves real asset types', async (t) => {
  const scratch = await mkdtemp(join(tmpdir(), 'wfe-browser-runner-'))
  t.after(() => rm(scratch, { recursive: true, force: true }))
  const assets = join(scratch, 'assets')
  await mkdir(assets)
  await mkdir(join(assets, 'directory'))
  await writeFile(join(scratch, 'secret.txt'), 'outside')
  await symlink(join(scratch, 'secret.txt'), join(assets, 'escape.txt'))
  for (const [file, body] of [
    ['index.html', 'index'],
    ['entry.js', 'entry'],
    ['style.css', 'style'],
    ['data.json', '{}'],
  ])
    await writeFile(join(assets, file), body)
  const errors = []
  const server = await startStaticServer({
    assets,
    onServerError: (error) => errors.push(error),
  })
  t.after(server.close)
  for (const [path, type, body] of [
    ['/', 'text/html', 'index'],
    ['/entry.js', 'text/javascript', 'entry'],
    ['/style.css', 'text/css', 'style'],
    ['/data.json', 'application/json', '{}'],
  ]) {
    const result = await request(server.url + path)
    assert.equal(result.status, 200)
    assert.equal(result.type, type)
    assert.equal(result.body, body)
  }
  for (const path of [
    '/..%2fsecret.txt',
    '/..%2fassets-sibling/file',
    '/escape.txt',
  ])
    assert.equal((await request(server.url + path)).status, 403, path)
  for (const path of ['/missing.js', '/directory'])
    assert.equal((await request(server.url + path)).status, 404, path)
  assert.equal((await request(server.url + '/%zz')).status, 400)
  assert.equal((await request(server.url + '/favicon.ico')).status, 204)
  assert.deepEqual(errors, [])
})

test('server rendering errors remain failures rather than missing asset responses', async (t) => {
  const assets = await mkdtemp(join(tmpdir(), 'wfe-browser-render-'))
  t.after(() => rm(assets, { recursive: true, force: true }))
  const errors = []
  const server = await startStaticServer({
    assets,
    renderIndex: async () => {
      throw 'render failed'
    },
    onServerError: (error) => errors.push(error),
  })
  t.after(server.close)
  assert.equal((await request(server.url + '/?screen=view')).status, 500)
  assert.equal(errors[0].phase, 'render')
  assert.equal(errors[0].error.thrown, 'render failed')
})

test('response-body and server errors remain distinct evidence with a fake HTTP transport', async (t) => {
  const assets = await mkdtemp(join(tmpdir(), 'wfe-browser-body-'))
  t.after(() => rm(assets, { recursive: true, force: true }))
  await writeFile(join(assets, 'index.html'), 'body')
  let handle
  const transport = new EventEmitter()
  transport.listen = (_port, _host, done) => done()
  transport.address = () => ({ port: 1234 })
  transport.close = (done) => done()
  const errors = []
  const server = await startStaticServer({
    assets,
    onServerError: (error) => errors.push(error),
    createHttpServer: (handler) => {
      handle = handler
      return transport
    },
  })
  const response = new EventEmitter()
  response.setHeader = () => {}
  response.writeHead = () => response
  let ends = 0
  response.end = () => {
    if (++ends === 1) throw 'body failed'
  }
  await handle({ url: '/' }, response)
  transport.emit('error', new Error('server failed'))
  assert.deepEqual(
    errors.map((error) => error.phase),
    ['body', 'server'],
  )
  assert.equal(errors[0].error.thrown, 'body failed')
  assert.equal(errors[1].error.message, 'server failed')
  await server.close()
})

test('browser launch forwards executable and existing launch options without changing process transport', async () => {
  const calls = []
  const chromium = {
    launch: async (options) => {
      calls.push(options)
      return 'browser'
    },
  }
  assert.equal(
    await launchBrowser({
      chromium,
      executablePath: '/chosen/chromium',
      launchOptions: { args: ['--sample'] },
    }),
    'browser',
  )
  assert.deepEqual(calls, [
    { headless: true, args: ['--sample'], executablePath: '/chosen/chromium' },
  ])
  const previous = process.env.BENCH_EXECUTABLE_PATH
  try {
    process.env.BENCH_EXECUTABLE_PATH = '/host/default-chromium'
    await launchBrowser({ chromium })
    assert.equal(calls.at(-1).executablePath, '/host/default-chromium')
  } finally {
    if (previous === undefined) delete process.env.BENCH_EXECUTABLE_PATH
    else process.env.BENCH_EXECUTABLE_PATH = previous
  }
})

test('diagnostics preserve strict console policy, advisory reactive events and listener ownership', async () => {
  const page = new EventEmitter()
  page.url = () => 'http://example.test/'
  page.evaluate = async () => [
    { code: 'HOT_SCOPE_TIME' },
    { code: 'NO_OWNER_EFFECT' },
  ]
  const existing = () => {}
  page.on('console', existing)
  const report = { cases: [] }
  const detach = attachDiagnostics(page, report)
  for (const type of ['warning', 'error', 'log'])
    page.emit('console', { type: () => type, text: () => 'HOT_SCOPE_TIME' })
  page.emit('pageerror', new Error('page failed'))
  assert.deepEqual(report.warnings, ['HOT_SCOPE_TIME', 'HOT_SCOPE_TIME'])
  assert.deepEqual(report.errors, ['page failed'])
  assert.equal(report.consoleEvents.length, 3)
  assert.deepEqual(
    await readReactiveDiagnostics(page, report, {
      scope: 'records',
      read: () => [],
    }),
    [{ code: 'NO_OWNER_EFFECT' }],
  )
  assert.deepEqual(
    report.reactiveDiagnostics.map((item) => item.classification),
    ['advisory', 'reject'],
  )
  detach()
  assert.deepEqual(page.listeners('console'), [existing])
  assert.equal(page.listenerCount('pageerror'), 0)
})

test('application filtering preserves complete groups and rejects invalid or empty selections', () => {
  const groups = { records: () => {}, dates: () => {} }
  assert.deepEqual(selectGroups(groups, '^records$'), {
    selected: ['records'],
    skipped: ['dates'],
    pattern: '^records$',
  })
  assert.deepEqual(selectGroups(groups, '').selected, ['records', 'dates'])
  assert.throws(() => selectGroups(groups, 'missing'), /No application groups/)
  assert.throws(() => selectGroups(groups, '['), SyntaxError)
})

test('recorder enforces serial awaited cases and records only completed cases', async () => {
  const report = { cases: [] }
  const record = createRecorder(report, () => {})
  let release
  const held = record(
    'prerequisite',
    () =>
      new Promise((done) => {
        release = done
      }),
  )
  await assert.rejects(
    record('overlap', async () => {}),
    /Concurrent browser case/,
  )
  assert.deepEqual(report.cases, [])
  release()
  await held
  await assert.rejects(
    record('failed', async () => {
      throw 'case failed'
    }),
    (error) => error === 'case failed',
  )
  await record('later', async () => {})
  assert.deepEqual(report.cases, ['prerequisite', 'later'])
})

test('operation failure and every cleanup failure survive together, including thrown strings', async () => {
  const calls = []
  const primary = new Error('first failure')
  await assert.rejects(
    withCleanup(async () => {
      throw primary
    }, [
      {
        name: 'page',
        close: async () => {
          calls.push('page')
          throw 'page close failed'
        },
      },
      { name: 'listeners', close: () => calls.push('listeners') },
      {
        name: 'server',
        close: async () => {
          calls.push('server')
          throw new Error('server close failed')
        },
      },
    ]),
    (error) => {
      assert.equal(error.cause, primary)
      assert.equal(error.errors[0], primary)
      assert.equal(error.errors[1].cause, 'page close failed')
      assert.equal(error.errors[2].cause.message, 'server close failed')
      assert.equal(errorDetails(error).cause.message, 'first failure')
      assert.equal(errorDetails(error).errors[0].message, 'first failure')
      return true
    },
  )
  assert.deepEqual(calls, ['page', 'listeners', 'server'])
})

test('finalization attempts all resources and report output without replacing initial failure', async () => {
  const report = { failure: 'first failure', cases: [] }
  await captureDiagnostic(report, 'DOM', async () => {
    throw 'DOM unavailable'
  })
  const calls = [],
    logs = []
  assert.equal(
    await finalizeReport({
      report,
      output: 'unused',
      cleanup: [
        {
          name: 'page',
          close: () => {
            calls.push('page')
            throw new Error('page failed')
          },
        },
        {
          name: 'browser',
          close: () => {
            calls.push('browser')
            throw false
          },
        },
        { name: 'server', close: () => calls.push('server') },
      ],
      write: async () => {
        calls.push('output')
        throw new Error('output failed')
      },
      log: (value) => logs.push(value),
    }),
    true,
  )
  assert.deepEqual(calls, ['page', 'browser', 'server', 'output'])
  assert.equal(report.failure, 'first failure')
  assert.equal(report.diagnosticFailures[0].error.thrown, 'DOM unavailable')
  assert.equal(report.cleanupFailures.length, 2)
  assert.equal(report.cleanupFailures[1].error.type, 'boolean')
  assert.equal(report.outputFailure.message, 'output failed')
  assert.equal(JSON.parse(logs[0]).failure, 'first failure')
  const clean = { cases: [] }
  let persisted
  assert.equal(
    await finalizeReport({
      report: clean,
      cleanup: [],
      output: 'unused',
      write: async (_file, body) => {
        persisted = JSON.parse(body)
      },
      log: () => {},
    }),
    false,
  )
  assert.deepEqual(persisted, clean)
})

test('qualification strips application and case filters while preserving host browser and transport configuration', () => {
  const env = qualificationEnvironment(
    Object.freeze({
      BENCH_APPLICATION_PATTERN: '^dates$',
      BENCH_CASE_PATTERN: 'only one',
      BENCH_EXECUTABLE_PATH: '/host/chromium',
      NODE_OPTIONS: '--import /host/bridge.mjs',
      PLAYWRIGHT_BROWSERS_PATH: '/host/browsers',
    }),
  )
  assert.equal(env.BENCH_APPLICATION_PATTERN, undefined)
  assert.equal(env.BENCH_CASE_PATTERN, undefined)
  assert.equal(env.BENCH_EXECUTABLE_PATH, '/host/chromium')
  assert.equal(env.NODE_OPTIONS, '--import /host/bridge.mjs')
  assert.equal(env.PLAYWRIGHT_BROWSERS_PATH, '/host/browsers')
})

test('non-Error failures stay serializable without invoking their string conversion', () => {
  const thrown = Object.assign(Object.create(null), {
    reason: 'request failed',
  })
  assert.match(errorText(thrown), /request failed/)
  assert.match(JSON.stringify(errorDetails(thrown)), /request failed/)
  assert.equal(errorText('literal failure'), 'literal failure')
  assert.equal(errorDetails(undefined).type, 'undefined')
})

test('a console-output failure is retained in the saved report when file output remains available', async () => {
  let saved
  const report = { cases: [] }
  const failed = await finalizeReport({
    report,
    cleanup: [],
    output: 'unused',
    write: async (_file, body) => {
      saved = JSON.parse(body)
    },
    log: () => {
      throw new Error('console unavailable')
    },
  })
  assert.equal(failed, true)
  assert.equal(saved.logFailure.message, 'console unavailable')
})
