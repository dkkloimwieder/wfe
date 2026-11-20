import { themeTokens } from '@wfe/components/theme'
import type { JSX } from '@solidjs/web'

const sizingTokens = [
  'font-size',
  'small-font-size',
  'font-family',
  'line-height',
  'control-line-height',
  'label-line-height',
  'label-weight',
  'heading-font-size',
  'heading-line-height',
  'heading-weight',
  'button-font-weight',
  'control-height',
  'control-padding-y',
  'control-padding-x',
  'input-padding-x',
  'gap',
  'layout-inset',
  'field-gap',
  'field-max-width',
  'form-max-width',
  'table-control-height',
  'tree-row-min-height',
  'tree-toggle-size',
  'tree-symbol-size',
  'tree-indent',
]
const tokens = themeTokens()

/** Theme sizing for raw fixtures that do not mount a Theme. */
export const exampleSizing = Object.fromEntries(
  sizingTokens.map((name) => [`--ui-${name}`, tokens[`--ui-${name}`]]),
) as JSX.CSSProperties
