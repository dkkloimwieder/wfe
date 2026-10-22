import assert from 'node:assert/strict'
import test from 'node:test'
import { parseIcon } from '../../scripts/icons.mjs'
const svg = (body) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">${body}</svg>`
test('icon importer accepts basic geometry and rejects executable or unsupported markup', () => {
  assert.equal(
    parseIcon('sample', svg('<path d="M1 2h3" />')).nodes[0][0],
    'path',
  )
  for (const body of [
    '<script>alert(1)</script>',
    '<use href="https://example.com" />',
    '<path d="M1 2" onclick="alert(1)" />',
    '<path style="color:red" d="M1 2" />',
    '<path fill="url(#external)" d="M1 2" />',
    '<g><path d="M1 2" /></g>',
  ]) {
    assert.throws(() => parseIcon('unsafe', svg(body)))
  }
})
