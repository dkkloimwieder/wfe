import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve, relative, isAbsolute } from 'node:path'

const families = {
  kobalte: 'kobalte',
  virtual: 'virtual-core',
  calendar: 'corvu-calendar',
  matching: 'match-sorter',
  charts: 'charts',
  icons: 'icons',
  dnd: 'dnd-kit',
}
const componentSource = 'packages/components/src/'
const normalize = (path) => path.replaceAll('\\', '/')

/** Adapt existing manifests without replacing their original evidence. */
export async function vendorInventory(root) {
  const origins = {}
  for (const [family, directory] of Object.entries(families)) {
    origins[family] = JSON.parse(
      await readFile(
        resolve(root, `${componentSource}vendor/${directory}/provenance.json`),
        'utf8',
      ),
    )
  }
  const artifacts = []
  function add(
    family,
    local,
    upstreamPath,
    upstreamSha256,
    localSha256,
    extra = {},
  ) {
    assert.match(
      upstreamSha256,
      /^[a-f0-9]{64}$/,
      `${family}/${local}: original hash`,
    )
    assert.match(
      localSha256,
      /^[a-f0-9]{64}$/,
      `${family}/${local}: local hash`,
    )
    artifacts.push({
      family,
      kind: /LICENSE/.test(local) ? 'license' : 'copied',
      path: `${componentSource}vendor/${families[family]}/${local}`,
      localSha256,
      originals: [
        { origin: family, path: upstreamPath, sha256: upstreamSha256 },
      ],
      ...extra,
    })
  }
  for (const [path, item] of Object.entries(origins.kobalte.sources)) {
    add(
      'kobalte',
      path,
      path === 'LICENSE.md' ? path : `packages/${path}`,
      item.upstreamSha256,
      item.localSha256,
    )
  }
  for (const [path, hash] of Object.entries(origins.virtual.upstreamSha256)) {
    add(
      'virtual',
      path,
      path === 'LICENSE' ? path : `src/${path}`,
      hash,
      origins.virtual.localSha256[path],
    )
  }
  for (const family of ['calendar', 'matching', 'dnd']) {
    for (const [path, item] of Object.entries(origins[family].sources)) {
      add(
        family,
        path,
        item.upstreamPath,
        item.upstreamSha256,
        item.localSha256,
        family === 'calendar' && path === 'navigation.ts'
          ? { kind: 'extracted' }
          : {},
      )
      if (
        family === 'matching' &&
        item.upstreamPath.startsWith('remove-accents@')
      ) {
        artifacts.at(-1).originals[0].originMember = 'accentDependency'
      }
    }
  }
  for (const [path, item] of Object.entries(origins.charts.files)) {
    add('charts', path, item.source, item.upstreamSha256, item.localSha256, {
      ...(item.repair ? { repair: item.repair } : {}),
      ...(origins.charts.repairs[path]
        ? { repairDescription: origins.charts.repairs[path] }
        : {}),
    })
  }
  add(
    'charts',
    'LICENSE',
    'LICENSE',
    origins.charts.licenseSha256,
    origins.charts.licenseSha256,
  )
  add(
    'icons',
    'LICENSE',
    'LICENSE',
    origins.icons.licenseSha256,
    origins.icons.licenseSha256,
  )
  artifacts.push({
    family: 'icons',
    kind: 'generated',
    path: `${componentSource}icons/index.ts`,
    localSha256: origins.icons.generatedSha256,
    generator: {
      path: 'scripts/icons.mjs',
      sha256: origins.icons.generatorSha256,
    },
    originalArchive: `${componentSource}vendor/icons/upstream.json`,
    originals: Object.entries(origins.icons.icons).map(([key, sha256]) => ({
      origin: 'icons',
      key,
      sha256,
    })),
  })
  const byPath = new Map()
  for (const artifact of artifacts) {
    assert.ok(
      !byPath.has(artifact.path),
      `Duplicate vendor artifact: ${artifact.path}`,
    )
    byPath.set(artifact.path, artifact)
  }

  function classify(moduleId) {
    // Bundler queries do not change source ownership. Do not reinterpret virtual IDs.
    if (moduleId.startsWith('\0'))
      return { origin: 'application', kind: 'virtual' }
    const clean = normalize(moduleId.split(/[?#]/, 1)[0])
    let path = isAbsolute(clean)
      ? normalize(relative(root, clean))
      : clean.replace(/^\.\//, '')
    path = path.replace(
      /^packages\/components\/dist\/(?:(?:source|client|server)\/)?/,
      componentSource,
    )
    const candidates = [path]
    if (/\.jsx?$/.test(path))
      candidates.push(
        path.replace(/\.jsx?$/, '.ts'),
        path.replace(/\.jsx?$/, '.tsx'),
      )
    const artifact = candidates
      .map((candidate) => byPath.get(candidate))
      .find(Boolean)
    if (artifact)
      return { origin: artifact.family, kind: artifact.kind, artifact }
    if (path.startsWith(`${componentSource}vendor/`))
      throw new Error(`Unregistered vendor artifact: ${path}`)
    if (path.startsWith(componentSource))
      return {
        origin: 'components',
        kind: 'owned',
        layer: path.startsWith(`${componentSource}internal/`)
          ? 'internal'
          : 'public',
      }
    if (/(^|\/)node_modules\//.test(path))
      return { origin: 'external', kind: 'dependency' }
    return { origin: 'application', kind: 'owned' }
  }
  return { origins, artifacts, classify }
}
