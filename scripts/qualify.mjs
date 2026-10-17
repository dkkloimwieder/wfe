import { spawn, execFileSync } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { appendFile, mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))

export function selectsQualification(paths) {
  return paths.some((path) =>
    /^(packages\/|patches\/|examples\/|tests\/|scripts\/|docs\/contracts\/|\.github\/workflows\/|package\.json$|pnpm-lock\.yaml$|pnpm-workspace\.yaml$|tsconfig\.json$|vitest\.config\.ts$|eslint\.config\.mjs$)/.test(
      path,
    ),
  )
}

export function qualificationStages(output, { wamn = false } = {}) {
  const stage = (name, args, env = {}) => ({ name, args, env })
  const stages = [
    stage('checks', ['run', 'check']),
    stage('unit-tests', ['run', 'test:unit'], { NODE_ENV: 'test' }),
    stage('source-tests', [
      'exec',
      'node',
      '--test',
      'tests/source/source.test.mjs',
    ]),
    stage('analytics-server', [
      'exec',
      'node',
      '--test',
      'examples/analytics/demo-server.test.mjs',
      'examples/analytics/paging.test.mjs',
    ]),
    stage('server-rendering', ['run', 'test:ssr']),
    stage('contracts', ['exec', 'node', 'scripts/test-contracts.mjs']),
    stage('engine-imports', [
      'exec',
      'node',
      'scripts/check-engine-imports.mjs',
    ]),
    stage('vendor-audit', [
      'exec',
      'node',
      'scripts/audit-vendor.mjs',
      '--bundles',
      '--output',
      resolve(output, 'vendor-audit'),
    ]),
  ]
  for (const mode of ['source', 'distribution', 'development']) {
    const env = {
      NODE_ENV: mode === 'development' ? 'development' : 'production',
      BENCH_DISTRIBUTION: mode === 'distribution' ? '1' : '',
      BENCH_DEVELOPMENT: mode === 'development' ? '1' : '',
    }
    for (const fixture of [
      'components',
      'table-editing',
      'table-read-only',
      'analytics',
      'styles',
      'layout',
      'dashboard',
      'date-picker',
      'form-contract',
      'generator',
      'virtualization',
    ]) {
      if (mode === 'development' && fixture === 'virtualization') continue
      stages.push(
        stage(
          `${fixture}-${mode}-build`,
          [
            'exec',
            'vite',
            'build',
            '--config',
            `examples/${fixture}/vite.config.ts`,
          ],
          env,
        ),
      )
      stages.push(
        stage(
          `${fixture}-${mode}-browser`,
          ['exec', 'node', `examples/${fixture}/run.mjs`],
          { ...env, BENCH_OUTPUT: resolve(output, `${fixture}-${mode}.json`) },
        ),
      )
    }
    stages.push(
      stage(
        `date-hydration-${mode}`,
        ['exec', 'node', 'examples/date-picker/run-hydration.mjs'],
        {
          ...env,
          BENCH_OUTPUT: resolve(output, `date-hydration-${mode}.json`),
        },
      ),
    )
    stages.push(
      stage(
        `generator-hydration-${mode}`,
        ['exec', 'node', 'examples/generator/run-hydration.mjs'],
        {
          ...env,
          BENCH_OUTPUT: resolve(output, `generator-hydration-${mode}.json`),
        },
      ),
    )
    stages.push(
      stage(
        `form-hydration-${mode}`,
        ['exec', 'node', 'examples/form-contract/run-hydration.mjs'],
        {
          ...env,
          BENCH_OUTPUT: resolve(output, `form-hydration-${mode}.json`),
        },
      ),
    )
    stages.push(
      stage(
        `hydration-${mode}`,
        ['exec', 'node', 'examples/hydration/run.mjs'],
        { ...env, BENCH_OUTPUT: resolve(output, `hydration-${mode}.json`) },
      ),
    )
  }
  stages.push(
    stage(
      'components-live-browser',
      ['exec', 'node', 'examples/components/run-live.mjs'],
      {
        NODE_ENV: 'development',
        BENCH_OUTPUT: resolve(output, 'components-live.json'),
      },
    ),
  )
  stages.push(
    stage('previews-browser', ['exec', 'node', 'examples/run-previews.mjs'], {
      NODE_ENV: 'development',
      BENCH_DEVELOPMENT: '1',
      BENCH_OUTPUT: resolve(output, 'previews.json'),
    }),
  )
  if (wamn) {
    stages.push(
      stage('wamn-inputs', ['exec', 'node', 'examples/wamn/check-inputs.mjs']),
      stage('wamn-types', [
        'exec',
        'tsc',
        '--project',
        'examples/wamn/tsconfig.json',
      ]),
      stage('wamn-lint', [
        'exec',
        'eslint',
        ...[
          'App.tsx',
          'createWamnTable.ts',
          'transport.ts',
          'main.tsx',
          'vite.config.ts',
        ].map((file) => `examples/wamn/${file}`),
      ]),
    )
    stages.push(
      stage('wamn-generator-types', [
        'exec',
        'tsc',
        '--project',
        'examples/wamn-generator/tsconfig.json',
      ]),
    )
    for (const mode of ['source', 'distribution', 'development']) {
      const env = {
        NODE_ENV: mode === 'development' ? 'development' : 'production',
        BENCH_DISTRIBUTION: mode === 'distribution' ? '1' : '',
        BENCH_DEVELOPMENT: mode === 'development' ? '1' : '',
      }
      stages.push(
        stage(
          `wamn-${mode}-build`,
          ['exec', 'vite', 'build', '--config', 'examples/wamn/vite.config.ts'],
          env,
        ),
        stage(
          `wamn-${mode}-browser`,
          ['exec', 'node', 'examples/wamn/run.mjs'],
          { ...env, BENCH_OUTPUT: resolve(output, `wamn-${mode}.json`) },
        ),
      )
      stages.push(
        stage(
          `wamn-generator-${mode}-build`,
          [
            'exec',
            'vite',
            'build',
            '--config',
            'examples/wamn-generator/vite.config.ts',
          ],
          env,
        ),
        stage(
          `wamn-generator-${mode}-browser`,
          ['exec', 'node', 'examples/wamn-generator/run.mjs'],
          {
            ...env,
            BENCH_OUTPUT: resolve(output, `wamn-generator-${mode}.json`),
          },
        ),
        stage(
          `wamn-generator-${mode}-hydration`,
          ['exec', 'node', 'examples/wamn-generator/run.mjs', '--hydration'],
          {
            ...env,
            BENCH_OUTPUT: resolve(
              output,
              `wamn-generator-hydration-${mode}.json`,
            ),
          },
        ),
      )
    }
  }
  return stages
}

async function main() {
  const args = process.argv.slice(2)
  if (args.includes('--affected')) {
    const base = process.env.NX_BASE
    if (!base) throw new Error('--affected requires NX_BASE')
    const paths = execFileSync(
      'git',
      ['diff', '--name-only', '-z', `${base}...HEAD`],
      { cwd: root, encoding: 'utf8' },
    ).split('\0')
    const selected = selectsQualification(paths)
    if (args.includes('--select')) {
      if (process.env.GITHUB_OUTPUT)
        await appendFile(process.env.GITHUB_OUTPUT, `selected=${selected}\n`)
      console.log(`Qualification selected: ${selected}`)
      return
    }
    if (!selected) return
  }
  const output = resolve(
    root,
    process.env.QUALIFICATION_OUTPUT ?? 'test-results/qualification',
  )
  const stages = qualificationStages(output, { wamn: args.includes('--wamn') })
  if (args.includes('--plan')) {
    console.log(JSON.stringify(stages, null, 2))
    return
  }
  await mkdir(output, { recursive: true })
  const report = { stages: [] }
  // Never inherit scenario selectors, external review URLs, or profiling flags.
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('BENCH_')),
  )
  if (process.env.BENCH_EXECUTABLE_PATH)
    env.BENCH_EXECUTABLE_PATH = process.env.BENCH_EXECUTABLE_PATH
  Object.assign(env, {
    NODE_ENV: 'production',
    BENCH_WORKLOADS: '0',
    BENCH_WORKLOAD: '0',
    BENCH_SCENARIOS: '1',
  })
  for (const stage of stages) {
    console.log(`Qualification: ${stage.name}`)
    const log = createWriteStream(resolve(output, `${stage.name}.log`))
    const result = await new Promise((done) => {
      const child = spawn('pnpm', stage.args, {
        cwd: root,
        env: { ...env, ...stage.env },
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      child.stdout.on('data', (bytes) => {
        process.stdout.write(bytes)
        log.write(bytes)
      })
      child.stderr.on('data', (bytes) => {
        process.stderr.write(bytes)
        log.write(bytes)
      })
      child.on('error', (error) => {
        log.write(`${error.stack}\n`)
        done({ status: 1, error: error.message })
      })
      child.on('close', (status, signal) => done({ status, signal }))
    })
    await new Promise((done) => log.end(done))
    report.stages.push({ ...stage, ...result })
    await writeFile(
      resolve(output, 'summary.json'),
      JSON.stringify(report, null, 2) + '\n',
    )
    if (result.status !== 0) {
      process.exitCode = 1
      break
    }
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main()
}
