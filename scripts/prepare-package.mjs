import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'

const hashFile = '.tsdown-hash'

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`
    return entry.isDirectory() ? sourceFiles(path) : [path]
  })
}

function workspaceDependencies(manifest) {
  const names = new Set(
    [
      'dependencies',
      'peerDependencies',
      'devDependencies',
      'optionalDependencies',
    ].flatMap((field) =>
      Object.keys(manifest[field] ?? {}).filter((name) =>
        name.startsWith('@wfe/'),
      ),
    ),
  )
  const directories = new Map()
  if (names.size === 0) return directories
  for (const entry of readdirSync('..', { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const directory = `../${entry.name}`
    const path = `${directory}/package.json`
    if (!existsSync(path)) continue
    const { name } = JSON.parse(readFileSync(path, 'utf8'))
    if (names.has(name)) directories.set(name, directory)
  }
  return directories
}

try {
  const manifest = JSON.parse(readFileSync('package.json', 'utf8'))
  const files = [
    'package.json',
    ...(manifest.wfeBuildInputs ?? []),
    ...sourceFiles('src'),
    ...readdirSync('.', { withFileTypes: true })
      .filter(
        (entry) => entry.isFile() && /^tsdown\.config\..+/.test(entry.name),
      )
      .map((entry) => entry.name),
  ].sort()
  const hash = createHash('sha256')
  for (const path of files) {
    const contents = readFileSync(path)
    // Frame each path and byte length before the unchanged file bytes.
    hash.update(JSON.stringify([path, contents.length]) + '\n')
    hash.update(contents)
  }
  const dependencies = workspaceDependencies(manifest)
  for (const name of [...dependencies.keys()].sort()) {
    const path = `${dependencies.get(name)}/${hashFile}`
    if (existsSync(path)) {
      const contents = readFileSync(path)
      hash.update(JSON.stringify(['dependency', name, contents.length]) + '\n')
      hash.update(contents)
    } else {
      hash.update(JSON.stringify(['dependency', name, 'missing']) + '\n')
    }
  }
  const currentHash = hash.digest('hex')
  if (
    existsSync('dist') &&
    existsSync(hashFile) &&
    readFileSync(hashFile, 'utf8').trim() === currentHash
  ) {
    console.log(`Prepare: ${manifest.name} unchanged, skipping build`)
  } else {
    // Invalidate before starting, including when the build is interrupted.
    rmSync(hashFile, { force: true })
    // pnpm puts the package's node_modules/.bin first in the lifecycle PATH.
    const result = spawnSync('tsdown', [], {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    })
    if (result.error) throw result.error
    if (result.status === 0) writeFileSync(hashFile, `${currentHash}\n`)
    else process.exitCode = result.status ?? 1
  }
} catch (error) {
  rmSync(hashFile, { force: true })
  console.error(error)
  process.exitCode = 1
}
