import assert from 'node:assert/strict'
import { test } from 'node:test'
import { collectFallbacks, inspectTheme } from '../../scripts/check-theme.mjs'

test('fallback inventory groups literal fallbacks by token and skips nested references', () => {
  const fallbacks = collectFallbacks([
    ['a.css', 'a { gap: var(--ui-gap, 8px); color: var(--ui-text, var(--x)) }'],
    ['b.css', 'b {\n  gap: var(--ui-gap, 6px);\n}'],
  ])
  assert.deepEqual([...fallbacks.keys()], ['--ui-gap'])
  assert.deepEqual(
    [...fallbacks.get('--ui-gap').entries()],
    [
      ['8px', ['a.css:1']],
      ['6px', ['b.css:2']],
    ],
  )
})

test('theme inspection reports drift, important, preset selectors and preset reads', () => {
  const kinds = inspectTheme(
    [
      ['packages/components/src/styles/a.css', 'a { gap: var(--ui-gap, 8px) }'],
      [
        'packages/components/src/styles/b.css',
        "b { gap: var(--ui-gap, 6px) !important }\n.ui-theme[data-ui-preset='laser'] b {}",
      ],
      [
        'packages/components/src/styles/tokens.css',
        ":where(.ui-theme[data-ui-preset='laser']) {}",
      ],
    ],
    [['packages/components/src/x.tsx', 'const preset = useThemePreset()']],
  ).map(({ kind }) => kind)
  assert.deepEqual(kinds.sort(), [
    'fallback',
    'important',
    'preset-selector',
    'preset-test',
  ])
})
