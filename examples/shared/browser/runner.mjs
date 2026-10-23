import { mkdir, readFile, realpath, stat, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname, extname, resolve, sep } from 'node:path'
import { inspect } from 'node:util'

export function errorDetails(error, seen = new Set()) {
  if (!(error instanceof Error))
    return {
      type: typeof error,
      thrown:
        typeof error === 'string'
          ? error
          : inspect(error, { depth: 5, customInspect: false }),
    }
  if (seen.has(error)) return { message: '[circular error]' }
  seen.add(error)
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...(error.cause === undefined
      ? {}
      : { cause: errorDetails(error.cause, new Set(seen)) }),
    ...(error instanceof AggregateError
      ? {
          errors: [...error.errors].map((item) =>
            errorDetails(item, new Set(seen)),
          ),
        }
      : {}),
  }
}
export const errorText = (error) =>
  error instanceof Error
    ? (error.stack ?? String(error))
    : typeof error === 'string'
      ? error
      : inspect(error, { depth: 5, customInspect: false })

const mime = {
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.html': 'text/html',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
}
const contained = (root, file) =>
  file !== root && file.startsWith(root.endsWith(sep) ? root : root + sep)

/** Serve only real files below one asset root; the suite owns SSR/query interpretation. */
export async function startStaticServer({
  assets,
  renderIndex,
  onServerError = () => {},
  createHttpServer = createServer,
}) {
  const lexicalRoot = resolve(assets)
  const actualRoot = await realpath(lexicalRoot)
  const server = createHttpServer(async (request, response) => {
    let phase = 'request'
    response.on('error', (error) =>
      onServerError({
        phase: 'body',
        url: request.url,
        error: errorDetails(error),
      }),
    )
    try {
      const url = new URL(request.url, 'http://localhost')
      let pathname
      try {
        pathname = decodeURIComponent(url.pathname)
      } catch {
        response.writeHead(400).end()
        return
      }
      if (pathname.includes('\0') || pathname.includes('\\')) {
        response.writeHead(400).end()
        return
      }
      if (pathname === '/favicon.ico') {
        response.writeHead(204).end()
        return
      }
      const file = resolve(
        lexicalRoot,
        '.' + (pathname === '/' ? '/index.html' : pathname),
      )
      if (!contained(lexicalRoot, file)) {
        response.writeHead(403).end()
        return
      }
      response.setHeader(
        'Content-Type',
        mime[extname(file)] ?? 'application/octet-stream',
      )
      if (pathname === '/' && renderIndex) {
        phase = 'render'
        const html = await renderIndex(url)
        if (html !== undefined) {
          response.end(html)
          return
        }
      }
      phase = 'asset'
      const actual = await realpath(file)
      if (!contained(actualRoot, actual)) {
        response.writeHead(403).end()
        return
      }
      if (!(await stat(actual)).isFile()) {
        response.writeHead(404).end()
        return
      }
      const body = await readFile(actual)
      phase = 'body'
      response.end(body)
    } catch (error) {
      if (phase === 'asset' && ['ENOENT', 'ENOTDIR'].includes(error?.code)) {
        response.writeHead(404).end()
        return
      }
      onServerError({ phase, url: request.url, error: errorDetails(error) })
      if (!response.headersSent) response.writeHead(500)
      response.end()
    }
  })
  await new Promise((done, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject)
      done()
    })
  })
  server.on('error', (error) =>
    onServerError({ phase: 'server', error: errorDetails(error) }),
  )
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () =>
      new Promise((done, reject) => {
        server.close((error) => (error ? reject(error) : done()))
      }),
  }
}

/** Inherit the host's transport preload and browser installation; override only when requested. */
export function launchBrowser({
  chromium,
  executablePath = process.env.BENCH_EXECUTABLE_PATH,
  launchOptions = {},
}) {
  return chromium.launch({
    headless: true,
    ...launchOptions,
    ...(executablePath ? { executablePath } : {}),
  })
}

export const generatorDiagnosticPolicy = {
  console: ({ type }) =>
    ['warning', 'error'].includes(type) ? 'reject' : 'observe',
  reactive: ({ code }) => (code === 'HOT_SCOPE_TIME' ? 'advisory' : 'reject'),
}
export function attachDiagnostics(
  page,
  report,
  policy = generatorDiagnosticPolicy,
) {
  report.consoleEvents ??= []
  report.errors ??= []
  report.warnings ??= []
  const onError = (error) => {
    report.errors.push(
      error instanceof Error ? error.message : errorText(error),
    )
    report.pageErrors ??= []
    report.pageErrors.push(errorDetails(error))
  }
  const onConsole = (message) => {
    const event = {
      type: message.type(),
      text: message.text(),
      url: page.url(),
    }
    const classification = policy.console(event)
    report.consoleEvents.push({ ...event, classification })
    if (classification === 'reject') report.warnings.push(event.text)
  }
  page.on('pageerror', onError)
  page.on('console', onConsole)
  return () => {
    page.off('pageerror', onError)
    page.off('console', onConsole)
  }
}
export async function readReactiveDiagnostics(
  page,
  report,
  { scope, policy = generatorDiagnosticPolicy, read } = {},
) {
  const events = await page.evaluate(read)
  report.reactiveDiagnostics ??= []
  const rejected = []
  for (const event of events) {
    const classification = policy.reactive(event)
    report.reactiveDiagnostics.push({ scope, event, classification })
    if (classification === 'reject') rejected.push(event)
  }
  return rejected
}

/** A filter selects complete application groups; cases inside each group keep their prerequisites. */
export function selectGroups(
  groups,
  pattern = process.env.BENCH_APPLICATION_PATTERN,
) {
  const names = Object.keys(groups)
  const expression = pattern ? new RegExp(pattern) : undefined
  const selected = names.filter((name) => !expression || expression.test(name))
  if (expression && !selected.length)
    throw new Error(`No application groups match ${pattern}`)
  return {
    selected,
    skipped: names.filter((name) => !selected.includes(name)),
    pattern: pattern ?? null,
  }
}
export function createRecorder(report, log = console.log) {
  let active = false
  return async (name, fn) => {
    if (active) throw new Error(`Concurrent browser case: ${name}`)
    active = true
    try {
      log(`Start: ${name}`)
      await fn()
      report.cases.push(name)
      log(`Pass: ${name}`)
    } finally {
      active = false
    }
  }
}

export async function captureDiagnostic(report, name, capture) {
  try {
    return await capture()
  } catch (error) {
    report.diagnosticFailures ??= []
    report.diagnosticFailures.push({ name, error: errorDetails(error) })
    report.diagnosticFailure ??= errorText(error)
    return undefined
  }
}

/** Every cleanup is attempted, and the original rejection remains the first aggregate cause. */
export async function withCleanup(run, cleanup) {
  const failures = []
  let value
  try {
    value = await run()
  } catch (error) {
    failures.push(error)
  }
  for (const { name, close } of cleanup) {
    try {
      await close()
    } catch (error) {
      failures.push(new Error(`Cleanup failed: ${name}`, { cause: error }))
    }
  }
  if (failures.length === 1) throw failures[0]
  if (failures.length)
    throw new AggregateError(failures, 'Browser operation and cleanup failed', {
      cause: failures[0],
    })
  return value
}

export async function finalizeReport({
  report,
  cleanup,
  output,
  write = async (file, text) => {
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, text)
  },
  log = console.log,
}) {
  for (const { name, close } of cleanup) {
    try {
      await close()
    } catch (error) {
      report.cleanupFailures ??= []
      report.cleanupFailures.push({ name, error: errorDetails(error) })
      report.cleanupFailure ??= errorText(error)
    }
  }
  try {
    await write(output, JSON.stringify(report, null, 2) + '\n')
  } catch (error) {
    report.outputFailure = errorDetails(error)
  }
  try {
    log(JSON.stringify(report, null, 2))
  } catch (error) {
    report.logFailure = errorDetails(error)
    try {
      await write(output, JSON.stringify(report, null, 2) + '\n')
    } catch (outputError) {
      report.outputFailure ??= errorDetails(outputError)
    }
  }
  return Boolean(
    report.failure !== undefined ||
    report.cleanupFailures?.length ||
    report.diagnosticFailures?.length ||
    report.outputFailure ||
    report.logFailure ||
    report.serverErrors?.length ||
    report.errors?.length ||
    report.warnings?.length ||
    report.diagnostics?.length,
  )
}
