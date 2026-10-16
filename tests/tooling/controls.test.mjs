import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  inspectControls,
  checkControls,
  controlExceptions,
} from '../../scripts/check-controls.mjs'
import { fileURLToPath } from 'node:url'

const normal = 'examples/dashboard/FutureControls.tsx'
test('shared control guard rejects raw markup without matching text or comments', () => {
  for (const name of ['button', 'input', 'textarea', 'select', 'option'])
    assert.match(
      inspectControls(normal, `export const View=()=> <${name}/>`).join(),
      /Use a shared component/,
    )
  assert.ok(
    inspectControls(normal, 'const View=()=> <div role="combobox"/>').length,
  )
  assert.deepEqual(
    inspectControls(
      normal,
      '// <input />\nconst text="<select>"; export const View=()=> <Input/>',
    ),
    [],
  )
  assert.deepEqual(
    inspectControls(
      'examples/future/index.html',
      '<!-- <input> --><div id="root"></div>',
    ),
    [],
  )
  assert.match(
    inspectControls('examples/future/index.html', '<input/>').join(),
    /Use a shared component/,
  )
})
test('shared control guard rejects aliased compatibility controls and private imports', () => {
  for (const source of [
    `import { NativeSelect as Choice } from '@wfe/components';`,
    `import * as UI from '@wfe/components'; const View=()=> <UI.NativeSelect/>;`,
    `import * as UI from '@wfe/components'; const Control=UI['NativeSelect'];`,
    `export {NativeSelect as Choice} from '@wfe/components/fields';`,
    `import * as UI from '@wfe/components'; const {NativeSelect: Choice}=UI;`,
    `import {Input} from '../../packages/components/src/components/NativeFields';`,
    `const Controls=import('@wfe/components/internal/controls/select');`,
    `import * as Select from '@kobalte/core/select';`,
  ])
    assert.ok(inspectControls(normal, source).length, source)
  assert.deepEqual(
    inspectControls(
      normal,
      `import {Input,SelectField,Button} from '@wfe/components';`,
    ),
    [],
  )
})
test('interop exceptions allow only their declared capabilities', () => {
  for (const [name, exception] of Object.entries(controlExceptions)) {
    assert.ok(exception.reason.length)
    if (exception.native)
      assert.deepEqual(
        inspectControls(
          name,
          `import {NativeSelect} from '@wfe/components'; const View=()=> <NativeSelect><option>A</option></NativeSelect>`,
        ),
        [],
      )
  }
  assert.ok(
    inspectControls(
      'examples/components/NativeFieldsFixture.tsx',
      'const View=()=> <input/>',
    ).length,
  )
  assert.ok(
    inspectControls(
      'examples/components/NativeFieldsFixture.tsx',
      `import X from '@wfe/components/internal/controls/select';`,
    ).length,
  )
  assert.ok(
    inspectControls(
      'examples/form-contract/NewAssociationCases.tsx',
      `import {NativeSelect} from '@wfe/components';`,
    ).length,
  )
})
test('all current examples use shared controls or named interoperability exceptions', async () => {
  assert.ok(
    (await checkControls(fileURLToPath(new URL('../../', import.meta.url)))) >
      90,
  )
})
