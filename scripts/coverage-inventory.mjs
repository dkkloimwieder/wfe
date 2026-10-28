import { readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

export const browserModes = ['source', 'distribution', 'development']
const required = (id, modes = browserModes) => ({
  id,
  status: 'required',
  reason: 'Functional public API coverage.',
  types: `examples/${id}/tsconfig.json`,
  modes,
  build: true,
})
export const examples = [
  required('drag-and-drop'),
  required('status-tiles'),
  required('grid'),
  required('shell'),
  required('charts'),
  required('components'),
  required('table-editing'),
  required('table-read-only'),
  required('analytics'),
  required('styles'),
  required('layout'),
  required('dashboard'),
  required('date-picker'),
  required('form-contract'),
  required('generator'),
  required('platform'),
  required('sync'),
  required('virtualization', ['source', 'distribution']),
  { ...required('hydration'), build: false, reviewStage: 'hydration-{mode}' },
  {
    ...required('theme', ['source']),
    build: false,
    reviewStage: 'theme-browser',
    reason: 'Public Theme consumer; its runner builds its own fixture.',
  },
  ...['accessor-profile', 'editing-overhead'].map((id) => ({
    id,
    status: 'diagnostic',
    reason: 'Performance measurements run separately from functional gates.',
    types: `examples/${id}/tsconfig.json`,
    modes: [],
  })),
  ...['wamn', 'wamn-generator'].map((id) => ({
    id,
    status: 'optional',
    reason:
      'Requires separately prepared external application inputs; enable with --wamn.',
    types: `examples/${id}/tsconfig.json`,
    modes: browserModes,
  })),
]

export const excludedModes = [
  ...['distribution', 'development'].map((mode) => ({
    id: 'theme',
    mode,
    reason:
      'The shared hydration fixture runs the same Theme consumer and review in this mode; the standalone Theme runner covers source consumption.',
  })),
  {
    id: 'virtualization',
    mode: 'development',
    reason:
      'The bounded-row fixture runs in source and distribution production modes; development instrumentation is not part of its qualification contract.',
  },
]

// Every executable example review entry point has an explicit disposition.
export const runners = [
  {
    path: 'examples/shared/browser/runner.mjs',
    status: 'shared',
    consumer: 'examples/generator/run.mjs',
    reason:
      'Generator stages exercise the shared helper; required Node tests cover its failure paths.',
  },
  ...examples.map(({ id, status, reason }) => ({
    path: `examples/${id}/run.mjs`,
    status,
    reason,
  })),
  ...['date-picker', 'form-contract', 'generator'].map((id) => ({
    path: `examples/${id}/run-hydration.mjs`,
    status: 'required',
    reason: 'Server node adoption and cleanup coverage.',
  })),
  {
    path: 'examples/components/run-live.mjs',
    status: 'required',
    reason: 'Live development exports and hot updates.',
  },
  {
    path: 'examples/run-previews.mjs',
    status: 'required',
    reason: 'Preview server and page containment.',
  },
  {
    path: 'examples/table-editing/grouping-profile.mjs',
    status: 'diagnostic',
    reason: 'Grouping performance measurement.',
  },
]

export const hydrationReviews = [
  ...['charts', 'shell', 'grid', 'status-tiles', 'platform'].map((id) => ({
    stage: `${id}-hydration-{mode}`,
    path: `examples/${id}/run.mjs`,
    args: ['--hydration'],
    status: 'required',
  })),
  ...[
    ['date', 'date-picker'],
    ['form', 'form-contract'],
    ['generator', 'generator'],
  ].map(([name, id]) => ({
    stage: `${name}-hydration-{mode}`,
    path: `examples/${id}/run-hydration.mjs`,
    args: [],
    status: 'required',
  })),
  {
    stage: 'wamn-generator-{mode}-hydration',
    path: 'examples/wamn-generator/run.mjs',
    args: ['--hydration'],
    status: 'optional',
  },
]

export const documents = [
  ...[
    ['docs/contracts/UI-BOUNDARIES.md', 3],
    ['docs/adoption.md', 3],
    ['docs/layout.md', 1],
    ['docs/table-workspace.md', 2],
    ['docs/form-contract.md', 4],
    ['docs/table-formatting.md', 1],
    ['docs/collapsible.md', 1],
    ['docs/number-inputs.md', 2],
    ['docs/form-layout.md', 3],
    ['docs/tabs.md', 1],
    ['docs/breadcrumbs.md', 1],
    ['docs/accordion.md', 1],
    ['docs/resizable.md', 1],
    ['docs/file-input.md', 1],
    ['docs/charts.md', 2],
    ['docs/gantt.md', 1],
    ['docs/status-tiles.md', 1],
    ['docs/table-row-actions.md', 1],
    ['docs/entry-panel.md', 1],
    ['docs/icons.md', 1],
    ['docs/theme.md', 1],
    ['packages/components/src/styles/README.md', 1],
  ].map(([path, fences]) => ({
    path,
    fences,
    status: 'covered',
    reason: 'Compile every TypeScript fence against public declarations.',
  })),
  {
    path: 'docs/combobox-matching.md',
    fences: 1,
    status: 'excluded',
    reason:
      'Composition fragment uses application-supplied items; the matching unit and gallery cases cover the complete composition.',
  },
  {
    path: 'docs/sidebar-context-switcher.md',
    fences: 1,
    status: 'excluded',
    reason:
      'Composition fragment uses application-owned context and menu callbacks; the gallery context cases cover the complete composition.',
  },
  {
    path: 'docs/table-selection.md',
    fences: 1,
    status: 'excluded',
    reason:
      'Function-body fragment assumes an existing table; unit table-selection cases cover the complete composition.',
  },
  {
    path: 'packages/components/src/components/README.md',
    fences: 1,
    status: 'excluded',
    reason:
      'Composition fragment assumes application field state; choice and field unit cases cover the complete composition.',
  },
  {
    path: 'docs/plan/wamn-sync.md',
    fences: 1,
    status: 'excluded',
    reason:
      'Plan fragments sketch the sync surface and its consumer; the sync unit cases and gallery cover the implemented package.',
  },
  {
    path: 'packages/sync/README.md',
    fences: 2,
    status: 'excluded',
    reason:
      'The worker recipe needs Node types; the sync gallery builds the same recipe and worker entry in every mode.',
  },
]

export const contracts = [
  'generator',
  'chart',
  'shell',
  'grid',
  'status-tile',
].map((name) => ({
  path: `tests/contracts/${name}-contract.ts`,
  gate: 'contracts',
}))
contracts.push({
  path: 'tests/contracts/platform-metadata-contract.ts',
  gate: 'examples/platform/tsconfig.json',
})

export function typeScriptFences(text) {
  return [
    ...text.matchAll(/^```(ts|tsx|typescript)[ \t]*\r?\n([^]*?)^```[ \t]*$/gm),
  ].map((match) => ({
    language: match[1] === 'typescript' ? 'ts' : match[1],
    code: match[2],
  }))
}

function walk(root, directory) {
  return readdirSync(resolve(root, directory), { withFileTypes: true }).flatMap(
    (entry) => {
      if (
        entry.name.startsWith('.') ||
        ['node_modules', 'dist'].includes(entry.name)
      )
        return []
      const path = `${directory}/${entry.name}`
      return entry.isDirectory() ? walk(root, path) : [path]
    },
  )
}

export function assertCoverageInventory(root, stages, optionalStages) {
  const files = ['docs', 'packages', 'examples', 'tests/contracts'].flatMap(
    (dir) => walk(root, dir),
  )
  const exact = (actual, entries, label) => {
    const expected = entries.map(({ path }) => path)
    if (new Set(expected).size !== expected.length)
      throw new Error(`Duplicate ${label} inventory entry`)
    for (const path of actual)
      if (!expected.includes(path))
        throw new Error(`Unclassified ${label}: ${path}`)
    for (const path of expected)
      if (!actual.includes(path)) throw new Error(`Stale ${label}: ${path}`)
  }
  files.push(...readdirSync(root).filter((name) => name.endsWith('.md')))
  exact(
    files.filter(
      (path) =>
        /\.md$/.test(path) &&
        typeScriptFences(readFileSync(resolve(root, path), 'utf8')).length,
    ),
    documents,
    'documentation',
  )
  exact(
    files.filter((path) =>
      /^examples\/(?:.*\/)?(?:run[^/]*|[^/]*-profile)\.mjs$/.test(path),
    ),
    runners,
    'runner',
  )
  exact(
    files.filter((path) => /^examples\/[^/]+\/tsconfig\.json$/.test(path)),
    examples.map(({ types }) => ({ path: types })),
    'example types',
  )
  exact(
    files.filter((path) => /^tests\/contracts\/.*\.ts$/.test(path)),
    contracts,
    'type contract',
  )
  for (const document of documents) {
    if (!['covered', 'excluded'].includes(document.status))
      throw new Error(`Invalid documentation status: ${document.path}`)
    if (
      typeScriptFences(readFileSync(resolve(root, document.path), 'utf8'))
        .length !== document.fences
    )
      throw new Error(`Changed documentation fence count: ${document.path}`)
  }
  for (const entry of [...examples, ...runners, ...documents]) {
    if (!entry.reason?.trim())
      throw new Error(`Missing coverage reason: ${entry.path ?? entry.id}`)
  }
  for (const example of examples) {
    if (!['required', 'optional', 'diagnostic'].includes(example.status))
      throw new Error(`Invalid example status: ${example.id}`)
  }
  for (const contract of contracts) {
    if (contract.gate === 'contracts') continue
    if (
      !examples.some(
        ({ types, status }) => types === contract.gate && status === 'required',
      )
    )
      throw new Error(`Missing type contract gate: ${contract.path}`)
    const config = JSON.parse(
      readFileSync(resolve(root, contract.gate), 'utf8'),
    )
    if (
      !config.include?.some(
        (path) =>
          resolve(root, dirname(contract.gate), path) ===
          resolve(root, contract.path),
      )
    )
      throw new Error(`Type contract absent from its project: ${contract.path}`)
  }
  for (const exclusion of excludedModes) {
    const example = examples.find(({ id }) => id === exclusion.id)
    if (
      !exclusion.reason.trim() ||
      !example ||
      !browserModes.includes(exclusion.mode) ||
      example.modes.includes(exclusion.mode)
    )
      throw new Error(`Invalid mode exclusion: ${exclusion.id}`)
  }
  for (const example of examples.filter(
    ({ status }) => status === 'required',
  )) {
    for (const mode of browserModes) {
      if (
        !example.modes.includes(mode) &&
        !excludedModes.some(
          (entry) => entry.id === example.id && entry.mode === mode,
        )
      )
        throw new Error(`Unclassified example mode: ${example.id}-${mode}`)
    }
  }
  for (const review of hydrationReviews) {
    const selected = review.status === 'optional' ? optionalStages : stages
    for (const mode of browserModes) {
      const name = review.stage.replace('{mode}', mode)
      const stage = selected.find((stage) => stage.name === name)
      if (
        !stage ||
        !stage.args.includes(review.path) ||
        !review.args.every((arg) => stage.args.includes(arg))
      )
        throw new Error(`Missing hydration stage: ${name}`)
    }
  }
  for (const runner of runners) {
    if (
      !['required', 'optional', 'diagnostic', 'shared'].includes(runner.status)
    )
      throw new Error(`Invalid runner status: ${runner.path}`)
    if (runner.status === 'shared') {
      const consumer = runners.find(({ path }) => path === runner.consumer)
      if (
        consumer?.status !== 'required' ||
        !stages.some(({ args }) => args.includes(runner.consumer))
      )
        throw new Error(`Missing shared runner consumer: ${runner.path}`)
      continue
    }
    const selected = runner.status === 'optional' ? optionalStages : stages
    const present = selected.some(({ args }) => args.includes(runner.path))
    if (runner.status !== 'diagnostic' && !present)
      throw new Error(`Missing runner stage: ${runner.path}`)
    if (runner.status === 'diagnostic' && present)
      throw new Error(`Diagnostic runner in required gate: ${runner.path}`)
  }
  for (const example of examples.filter(
    ({ status }) => status === 'required' || status === 'optional',
  )) {
    const selected = example.status === 'optional' ? optionalStages : stages
    for (const mode of example.modes) {
      const names =
        example.build === false
          ? [example.reviewStage.replace('{mode}', mode)]
          : [`${example.id}-${mode}-build`, `${example.id}-${mode}-browser`]
      for (const name of names) {
        if (!selected.some((stage) => stage.name === name))
          throw new Error(`Missing example stage: ${name}`)
      }
    }
  }
}
