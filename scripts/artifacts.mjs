import { AsyncLocalStorage } from 'node:async_hooks'
import { execFile } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import {
  mkdir,
  mkdtemp,
  open,
  readFile,
  writeFile,
  copyFile,
  stat,
  realpath,
  rename,
} from 'node:fs/promises'
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from 'node:path'
import { inspect, promisify } from 'node:util'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const execute = promisify(execFile)
const contexts = new AsyncLocalStorage()
const require = createRequire(import.meta.url)
const playwrightVersion = () => {
  try {
    return require('@playwright/test/package.json').version
  } catch {
    return null
  }
}
const executionSettings = () =>
  Object.fromEntries(
    [
      'BENCH_APPLICATION_PATTERN',
      'BENCH_CASE',
      'BENCH_CASE_PATTERN',
      'BENCH_SCENARIOS',
      'BENCH_CONTINUE',
      'BENCH_WORKLOAD',
      'BENCH_WORKLOADS',
      'BENCH_VIEW_WORKLOAD',
      'BENCH_LOCK_WORKLOAD',
      'BENCH_CHILD_WORKLOAD',
      'BENCH_SIZES',
      'BENCH_MODES',
      'BENCH_ITERATIONS',
      'BENCH_REPEATS',
      'BENCH_WARMUPS',
      'BENCH_HEAPS',
      'BENCH_ATTRIBUTION',
      'BENCH_CHART_FALLBACK',
    ]
      .filter((key) => process.env[key] !== undefined)
      .map((key) => [key, process.env[key]]),
  )
const describe = (error, seen = new Set()) => {
  if (!(error instanceof Error))
    return { thrown: inspect(error, { customInspect: false }) }
  if (seen.has(error)) return { message: '[circular error]' }
  seen.add(error)
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...(error.code === undefined ? {} : { code: error.code }),
    ...(error.cause === undefined
      ? {}
      : { cause: describe(error.cause, new Set(seen)) }),
    ...(error instanceof AggregateError
      ? {
          errors: [...error.errors].map((item) =>
            describe(item, new Set(seen)),
          ),
        }
      : {}),
  }
}
const safe = (value) =>
  String(value)
    .replace(/[^a-zA-Z0-9_.-]/g, '-')
    .slice(0, 100) || 'unknown'

export function artifactMode(environment = process.env) {
  return environment.BENCH_DEVELOPMENT
    ? 'development'
    : environment.BENCH_DISTRIBUTION
      ? 'package'
      : 'source'
}
export function currentArtifacts() {
  return contexts.getStore()
}
export async function artifactPath(name, requested) {
  const artifacts = currentArtifacts()
  if (!artifacts) throw new Error('Artifact paths require an owned run context')
  return artifacts.attachment(name, requested)
}

async function revision(cwd) {
  try {
    const { stdout: head } = await execute('git', ['rev-parse', 'HEAD'], {
      cwd,
    })
    const { stdout: diff } = await execute(
      'git',
      ['diff', '--binary', 'HEAD'],
      { cwd, maxBuffer: 64 * 1024 * 1024 },
    )
    const { stdout: untracked } = await execute(
      'git',
      ['ls-files', '--others', '--exclude-standard', '-z'],
      { cwd },
    )
    const inputs = []
    for (const path of untracked.split('\0').filter(Boolean)) {
      const info = await stat(resolve(cwd, path))
      if (!info.isFile()) continue
      inputs.push({
        path,
        sha256: createHash('sha256')
          .update(await readFile(resolve(cwd, path)))
          .digest('hex'),
      })
    }
    return {
      head: head.trim(),
      dirty: Boolean(diff || inputs.length),
      diffSha256: createHash('sha256').update(diff).digest('hex'),
      untracked: inputs,
    }
  } catch (error) {
    return { head: null, unavailable: describe(error) }
  }
}

/** Allocate owned paths only. Never remove or reuse a prior run directory. */
export async function createRunArtifacts({
  suite,
  mode = artifactMode(),
  hydration = false,
  cwd = process.cwd(),
  revisionRoot = fileURLToPath(new URL('../', import.meta.url)),
  base = resolve(cwd, 'test-results/runs'),
  requestedOutput,
  command = [process.execPath, ...process.argv.slice(1)],
  limits = [],
  metadata = {},
} = {}) {
  if (
    typeof suite !== 'string' ||
    !suite.trim() ||
    ['.', '..'].includes(safe(suite))
  )
    throw new Error('Invalid artifact suite')
  const parent = resolve(base, safe(suite))
  await mkdir(parent, { recursive: true })
  const directory = await mkdtemp(
    resolve(
      parent,
      `${safe(mode)}-${hydration ? 'hydration' : 'normal'}-${new Date().toISOString().replace(/[:.]/g, '-')}-`,
    ),
  )
  const manifest = {
    schemaVersion: 1,
    id: basename(directory),
    directory,
    suite,
    mode,
    hydration,
    startedAt: new Date().toISOString(),
    cwd,
    command,
    limits,
    runtime: {
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
      playwright: playwrightVersion(),
    },
    executionSettings: executionSettings(),
    revisionRoot,
    revision: await revision(revisionRoot),
    metadata,
    parentRun: process.env.BENCH_ARTIFACT_PARENT ?? null,
    stage: process.env.BENCH_ARTIFACT_STAGE ?? null,
    attachments: [],
    status: 'running',
  }
  const actualDirectory = await realpath(directory)
  const manifestPath = resolve(directory, 'manifest.json')
  const reportPath = resolve(directory, 'report.json')
  let alias,
    closed = false
  const mirrors = []
  let writes = Promise.resolve()
  const writeOwned = (file, text) => {
    const pending = writes.then(async () => {
      const temporary = resolve(
        directory,
        `.${basename(file)}-${randomUUID()}.tmp`,
      )
      await writeFile(temporary, text, { flag: 'wx' })
      await rename(temporary, file)
    })
    writes = pending.catch(() => undefined)
    return pending
  }
  const saveManifest = () =>
    writeOwned(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  const assertActive = () => {
    if (closed) throw new Error('Run artifacts are already finalized')
  }
  const writeCanonical = (report) => {
    assertActive()
    return writeOwned(reportPath, JSON.stringify(report, null, 2) + '\n')
  }
  await saveManifest()
  await (await open(reportPath, 'wx')).close()
  return {
    directory,
    reportPath,
    manifest,
    manifestPath,
    async reserveOutput() {
      assertActive()
      if (requestedOutput === undefined) return
      if (typeof requestedOutput !== 'string' || !requestedOutput.trim())
        throw new Error('Requested report output must be a nonempty path')
      const path = resolve(cwd, requestedOutput)
      if (path === reportPath) return
      await mkdir(dirname(path), { recursive: true })
      alias = await open(path, 'wx')
      manifest.requestedOutput = path
      await saveManifest()
    },
    async writeReport(report) {
      assertActive()
      report.artifacts = {
        directory,
        manifest: manifestPath,
        report: reportPath,
      }
      await writeCanonical(report)
      if (alias) {
        const bytes = Buffer.from(JSON.stringify(report, null, 2) + '\n')
        let position = 0
        while (position < bytes.length) {
          const { bytesWritten } = await alias.write(
            bytes,
            position,
            bytes.length - position,
            position,
          )
          if (!bytesWritten)
            throw new Error('Requested report output made no write progress')
          position += bytesWritten
        }
        await alias.truncate(bytes.length)
      }
    },
    writeCanonical,
    async attachment(name, requested) {
      assertActive()
      if (!name || isAbsolute(name))
        throw new Error(`Invalid artifact name: ${name}`)
      const target = resolve(directory, name)
      const inside = relative(directory, target)
      if (
        !inside ||
        inside === '..' ||
        inside.startsWith('..' + sep) ||
        isAbsolute(inside)
      )
        throw new Error(`Artifact escapes its run: ${name}`)
      await mkdir(dirname(target), { recursive: true })
      const actualParent = await realpath(dirname(target))
      if (
        actualParent !== actualDirectory &&
        !actualParent.startsWith(actualDirectory + sep)
      )
        throw new Error(`Artifact escapes its run through a symlink: ${name}`)
      let canonical = target
      for (let index = 1; ; index++) {
        try {
          await (await open(canonical, 'wx')).close()
          break
        } catch (error) {
          if (error.code !== 'EEXIST') throw error
          const extension = extname(target)
          canonical =
            target.slice(0, target.length - extension.length) +
            `-${index}` +
            extension
        }
      }
      let path = canonical
      if (requested !== undefined) {
        if (typeof requested !== 'string' || !requested.trim())
          throw new Error('Requested attachment output must be a nonempty path')
        path = resolve(cwd, requested)
        if (path !== canonical) {
          await mkdir(dirname(path), { recursive: true })
          await (await open(path, 'wx')).close()
          mirrors.push({ path, canonical })
        }
      }
      manifest.attachments.push({
        name,
        path: canonical,
        ...(path !== canonical ? { requestedPath: path } : {}),
      })
      await saveManifest()
      return path
    },
    async finish({ failed = false, error, report } = {}) {
      assertActive()
      closed = true
      const failures = []
      for (const { path, canonical } of mirrors) {
        try {
          await copyFile(path, canonical)
        } catch (error) {
          failures.push(error)
        }
      }
      for (const attachment of manifest.attachments) {
        try {
          attachment.bytes = (await stat(attachment.path)).size
        } catch (error) {
          failures.push(error)
        }
      }
      if (alias) {
        try {
          await alias.close()
        } catch (error) {
          failures.push(error)
        }
        alias = undefined
      }
      manifest.finishedAt = new Date().toISOString()
      manifest.status = failed || failures.length ? 'failed' : 'passed'
      if (error !== undefined) manifest.failure = describe(error)
      if (report)
        manifest.result = {
          failure: report.failure,
          cases: report.cases?.length,
          assertions: report.assertions?.length,
          stages: report.stages?.map(({ name, status, signal }) => ({
            name,
            status,
            signal,
          })),
        }
      if (failures.length)
        manifest.artifactFailures = failures.map((failure) => describe(failure))
      try {
        await saveManifest()
      } catch (error) {
        failures.push(error)
      }
      if (failures.length)
        throw new AggregateError(failures, 'Run artifact finalization failed')
    },
  }
}

/** Async context keeps nested and concurrent caller-owned runs independent. */
export async function withArtifactRun(options, operation) {
  const artifacts = await createRunArtifacts({
    requestedOutput: currentArtifacts() ? undefined : process.env.BENCH_OUTPUT,
    ...options,
  })
  const failures = []
  let value, report
  await contexts.run(artifacts, async () => {
    const write = artifacts.writeReport.bind(artifacts)
    artifacts.writeReport = async (value) => {
      report = value
      await write(value)
    }
    try {
      await artifacts.reserveOutput()
      value = await operation(artifacts)
      report = artifacts.report ?? report
    } catch (error) {
      failures.push(error)
      report = artifacts.report ?? report ?? {}
      report.failure ??= inspect(error, { customInspect: false })
      report.failureDetails ??= describe(error)
      report.artifacts ??= {
        directory: artifacts.directory,
        manifest: artifacts.manifestPath,
        report: artifacts.reportPath,
      }
      try {
        await artifacts.writeCanonical(report)
      } catch (error) {
        failures.push(error)
      }
    }
    try {
      await artifacts.finish({
        failed: Boolean(
          failures.length ||
          report?.failure !== undefined ||
          report?.firstFailure !== undefined ||
          report?.stages?.some(
            (stage) =>
              'status' in stage &&
              stage.status !== 0 &&
              stage.status !== 'passed',
          ) ||
          report?.outputFailure ||
          report?.logFailure ||
          report?.artifactFailure ||
          report?.cleanupFailures?.length ||
          report?.diagnosticFailures?.length ||
          report?.serverErrors?.length ||
          report?.errors?.length ||
          report?.warnings?.length ||
          report?.diagnostics?.length,
        ),
        error: failures[0],
        report,
      })
    } catch (error) {
      failures.push(error)
    }
  })
  if (failures.length) {
    try {
      console.error(`Run artifact evidence: ${artifacts.directory}`)
    } catch (error) {
      failures.push(error)
    }
  }
  if (failures.length === 1) throw failures[0]
  if (failures.length)
    throw new AggregateError(failures, 'Run and artifact finalization failed', {
      cause: failures[0],
    })
  return value
}
