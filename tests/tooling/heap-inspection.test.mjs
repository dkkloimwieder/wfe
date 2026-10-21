import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execute = promisify(execFile)
const inspector = fileURLToPath(
  new URL('../../bench/inspect-heap.mjs', import.meta.url),
)
const requestedKey = 'object:RetentionRecord'

function snapshot(retention = 'strong') {
  const strings = ['root', 'retained', 'RetentionRecord']
  const nodeFields = ['type', 'name', 'id', 'self_size', 'edge_count']
  const nodes = []
  const edges = []
  const bulkCount = 81
  const hasRecord = retention !== 'absent'
  nodes.push(0, 0, 1, 0, bulkCount + Number(hasRecord))
  for (let index = 1; index <= bulkCount; index++) {
    strings.push(`Bulk${index}`)
    nodes.push(1, strings.length - 1, index * 2 + 1, 1024, 0)
    edges.push(0, 1, index * nodeFields.length)
  }
  if (hasRecord) {
    const index = bulkCount + 1
    nodes.push(1, 2, index * 2 + 1, 1, 0)
    edges.push(retention === 'weak' ? 1 : 0, 1, index * nodeFields.length)
  }
  return {
    snapshot: {
      meta: {
        node_fields: nodeFields,
        node_types: [
          ['synthetic', 'object'],
          'string',
          'number',
          'number',
          'number',
        ],
        edge_fields: ['type', 'name_or_index', 'to_node'],
        edge_types: [['property', 'weak'], 'string_or_number', 'node'],
      },
    },
    nodes,
    edges,
    strings,
  }
}

async function withSnapshot(retention, work) {
  const directory = await mkdtemp(join(tmpdir(), 'wfe-heap-inspection-'))
  const file = join(directory, 'sample.heapsnapshot')
  try {
    await writeFile(file, JSON.stringify(snapshot(retention)))
    await work(async (key) => {
      await execute(process.execPath, [inspector, file, ...(key ? [key] : [])])
      return JSON.parse(await readFile(file + '.summary.json', 'utf8'))
    })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

test('a requested heap group reports records below the largest 80 groups', () =>
  withSnapshot('strong', async (inspect) => {
    const baseline = await inspect()
    assert.equal(baseline.groups.length, 80)
    assert.equal(
      baseline.groups.some(({ key }) => key === requestedKey),
      false,
    )
    const result = await inspect(requestedKey)
    assert.equal(result.requestedGroup.key, requestedKey)
    assert.equal(result.requestedGroup.count, 1)
    const path = result.requestedGroup.retainingPath
    assert.equal(path[0].index, 0)
    assert.equal(path.at(-1).name, 'RetentionRecord')
    assert.equal(path.at(-1).via, 'property:retained')
  }))

test('an absent requested heap group explicitly reports zero records', () =>
  withSnapshot('absent', async (inspect) => {
    const result = await inspect(requestedKey)
    assert.equal(result.requestedGroup.key, requestedKey)
    assert.equal(result.requestedGroup.count, 0)
    assert.deepEqual(result.requestedGroup.retainingPath, [])
  }))

test('a requested heap group does not turn a weak edge into a strong retaining path', () =>
  withSnapshot('weak', async (inspect) => {
    const result = await inspect(requestedKey)
    assert.equal(result.requestedGroup.key, requestedKey)
    assert.equal(result.requestedGroup.count, 1)
    const path = result.requestedGroup.retainingPath
    assert.equal(path.at(-1).name, 'RetentionRecord')
    assert.equal(
      path.some(({ index }) => index === 0),
      false,
    )
    assert.equal(
      path.some(({ via }) => via?.startsWith('weak:')),
      false,
    )
  }))
