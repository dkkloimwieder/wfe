import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'
import { decoratedSelectors } from '@wfe/components/theme'

test('the decoration sheet transforms exactly the elements that the controller samples', () => {
  const css = readFileSync(
    resolve(process.cwd(), 'packages/components/src/styles/decoration.css'),
    'utf8',
  )
  const rule = css.match(/:scope\s*:is\(([^{]*?)\)::before\s*\{\s*transform:/)
  expect(rule).not.toBeNull()
  const listed = rule![1]!
    .split(/,\s*(?![^()]*\))/)
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  expect(listed).toEqual([...decoratedSelectors])
})
