import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { vendorTransforms } from '../../scripts/vendor-transforms.mjs'

const source = fileURLToPath(
  new URL('../../packages/components/src/', import.meta.url),
)

test('captured standard decorators preserve accessors and initializers at runtime', async () => {
  const input = `
    const initialized = [];
    function tracked(value, context) {
      context.addInitializer(function () { initialized.push(context.name); });
      return {
        get() { return value.get.call(this) * 2; },
        set(next) { value.set.call(this, next); },
        init(initial) { return initial + 1; }
      };
    }
    export class Model { @tracked accessor count: number = 2; }
    export { initialized };
  `
  const id = source + 'vendor/dnd-kit/state/src/test.ts'
  const result = vendorTransforms().transform(input, id + '?v=1')
  assert.ok(result)
  const { Model, initialized } = await import(
    'data:text/javascript;base64,' + Buffer.from(result.code).toString('base64')
  )
  const instance = new Model()
  assert.equal(instance.count, 6)
  instance.count = 7
  assert.equal(instance.count, 14)
  assert.deepEqual(initialized, ['count'])
  assert.deepEqual(result.map.sources, [id])
  assert.deepEqual(result.map.sourcesContent, [input])
})

test('unrelated Solid JSX and TypeScript stay with their existing compilers', () => {
  const transform = vendorTransforms().transform
  const jsx = 'export const Field = () => <input value={value()} />'
  for (const path of [
    'components/Field.tsx',
    'dnd/index.ts',
    'vendor/kobalte/core/src/index.ts',
    'vendor/dnd-kit-other/src/test.ts',
    'vendor/dnd-kit/test.d.ts',
    'vendor/dnd-kit/test.tsx',
  ])
    assert.equal(transform(jsx, source + path), null, path)
  assert.equal(transform(jsx, '\0' + source + 'vendor/dnd-kit/test.ts'), null)
})
