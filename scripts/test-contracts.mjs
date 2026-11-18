import {
  documents,
  contracts,
  typeScriptFences,
} from './coverage-inventory.mjs'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runTsc } from './lib/tsc.mjs'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const files = new Map()
for (const document of documents.filter(({ status }) => status === 'covered')) {
  const fences = typeScriptFences(
    readFileSync(resolve(packageRoot, document.path), 'utf8'),
  )
  for (const [index, fence] of fences.entries()) {
    files.set(
      resolve(
        packageRoot,
        `${document.path}.example-${index}.${fence.language}`,
      ),
      fence.code,
    )
  }
}
if (!files.size) throw new Error('No UI contract examples found')
const scratch = mkdtempSync(resolve(packageRoot, '.wfe-contracts-'))
const created = []
const suffix = '.' + randomUUID()
try {
  // Keep each fence beside its document so relative imports resolve as written.
  for (const [path, code] of files) {
    const temporary = path.replace(/\.(tsx?)$/, `${suffix}.$1`)
    writeFileSync(temporary, code, { flag: 'wx' })
    created.push(temporary)
  }
  const config = resolve(scratch, 'tsconfig.json')
  writeFileSync(
    config,
    JSON.stringify({
      extends: resolve(packageRoot, 'packages/components/tsconfig.json'),
      compilerOptions: { types: ['vite/client'] },
      files: [
        ...created,
        ...contracts
          .filter(({ gate }) => gate === 'contracts')
          .map(({ path }) => resolve(packageRoot, path)),
      ],
      include: [],
    }),
  )
  const result = runTsc(['--project', config, '--pretty'], { cwd: packageRoot })
  if (result.status !== 0) {
    console.error((result.stdout + result.stderr).replaceAll(suffix, ''))
    process.exitCode = 1
  } else {
    console.log(
      `Typechecked ${files.size} UI contract examples and generator contracts`,
    )
  }
} finally {
  for (const path of created) rmSync(path, { force: true })
  rmSync(scratch, { recursive: true, force: true })
}
