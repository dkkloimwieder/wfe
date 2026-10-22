import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
const root = new URL('snapshot/', import.meta.url)
const manifest = JSON.parse(
  await readFile(new URL('provenance.json', root), 'utf8'),
)
for (const file of [...manifest.files, ...manifest.support]) {
  const bytes = await readFile(new URL(file.local, root))
  const hash = (value) => createHash('sha256').update(value).digest('hex')
  assert.equal(
    hash(bytes),
    file.sha256,
    `Changed captured source: ${file.local}`,
  )
  if (file.sourceSha256) {
    let original = file.local.startsWith('application/client/')
      ? bytes
          .toString('utf8')
          .replaceAll('"../../runtime/wire"', '"@wamn/web-runtime"')
      : file.local.startsWith('client/')
        ? bytes
            .toString('utf8')
            .replaceAll('"../runtime/wire"', '"@wamn/web-runtime"')
        : bytes
    for (const repair of [...(file.localReplacements ?? [])].reverse())
      original = original.toString('utf8').replaceAll(repair.to, repair.from)
    assert.equal(
      hash(original),
      file.sourceSha256,
      `Adaptation exceeds the recorded rewrites: ${file.local}`,
    )
  }
}
assert.equal(manifest.files.length, 118)
console.log(
  `Checked ${manifest.files.length} platform source snapshots from WAMN ${manifest.revision}.`,
)
