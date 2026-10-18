import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const target = fileURLToPath(new URL('snapshot/', import.meta.url))
const source = resolve(process.env.WAMN_ROOT ?? '../wamn')
const files = []
async function capture(path, local, transform = (text) => text) {
  const text = await readFile(resolve(source, path), 'utf8')
  const output = transform(text)
  const destination = resolve(target, local)
  await mkdir(dirname(destination), { recursive: true })
  await writeFile(destination, output)
  const hash = (value) => createHash('sha256').update(value).digest('hex')
  files.push({
    source: path,
    local,
    sourceSha256: hash(text),
    sha256: hash(output),
  })
}
for (const name of ['control', 'project', 'environment'])
  await capture(
    `apps/target/wamn/wamn_control/control/client-ts/${name}.ts`,
    `client/${name}.ts`,
    (text) => text.replaceAll('"@wamn/web-runtime"', '"../runtime/wire"'),
  )
for (const name of ['wire', 'transport', 'readQuery', 'readCache'])
  await capture(`web/runtime/src/${name}.ts`, `runtime/${name}.ts`)
for (const operation of [
  'control/mine',
  'project/list',
  'project/create',
  'environment/list',
  'environment/status',
])
  for (const kind of ['input', 'result', 'operation', 'errors'])
    await capture(
      `crates/catalog/model/src/host_route/control/contracts/${operation}.${kind}.json`,
      `metadata/${operation}.${kind}.json`,
    )
await capture('Cargo.toml', 'upstream-Cargo.toml')
await capture('web/runtime/package.json', 'runtime-package.json')
const validationPath = 'crates/identity/platform/src/lib.rs'
const validation = await readFile(resolve(source, validationPath), 'utf8')
const rule = validation.match(/fn checked_scope_segment\([\s\S]+?\n}/)?.[0]
if (!rule) throw new Error('Cannot find the current scope validation rule')
await writeFile(
  resolve(target, 'scope-rule.json'),
  JSON.stringify(
    {
      source: validationPath,
      sourceSha256: createHash('sha256').update(validation).digest('hex'),
      rule,
    },
    null,
    2,
  ) + '\n',
)
await copyFile(
  '/usr/share/common-licenses/Apache-2.0',
  resolve(target, 'LICENSE'),
)
const support = []
for (const local of ['scope-rule.json', 'LICENSE'])
  support.push({
    local,
    sha256: createHash('sha256')
      .update(await readFile(resolve(target, local)))
      .digest('hex'),
  })
await writeFile(
  resolve(target, 'provenance.json'),
  JSON.stringify(
    {
      revision: execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], {
        encoding: 'utf8',
      }).trim(),
      captured: new Date().toISOString(),
      changes:
        'Client imports point to the copied wire module. All other captured source bytes stay unchanged.',
      files,
      support,
    },
    null,
    2,
  ) + '\n',
)
console.log(
  `Captured ${files.length} WAMN source files without building or changing WAMN.`,
)
