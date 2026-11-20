import type { ThemeOptions } from '@wfe/components/theme'

export type Preset = NonNullable<ThemeOptions['preset']>
export type TokenGroup = (typeof tokenGroups)[number]
export const tokenGroups = [
  'surfaces',
  'text',
  'borders',
  'accent',
  'sizing',
  'radius',
  'shadows',
  'spacing',
  'other',
] as const

// The first matching rule wins. Border widths stay with borders, not sizing.
const rules: readonly [TokenGroup, RegExp][] = [
  ['radius', /radius/],
  ['shadows', /shadow|glow|elevation/],
  ['borders', /border|divider|ring|stroke/],
  ['spacing', /padding|gap|inset|margin|indent|offset/],
  ['sizing', /height|width|size/],
  [
    'accent',
    /accent|focus|selection|button-color|button-on|error|success|warning|decoration|dot|pattern|opacity|visibility/,
  ],
  ['surfaces', /surface|canvas|pane|hover|highlight|overlay|backdrop/],
  [
    'text',
    /text|heading|font|weight|transform|label|line-height|scheme|neutral/,
  ],
]

export function tokenGroup(name: string): TokenGroup {
  return rules.find(([, pattern]) => pattern.test(name))?.[0] ?? 'other'
}

export function groupTokens(names: readonly string[]) {
  const groups = new Map<TokenGroup, string[]>(
    tokenGroups.map((group) => [group, []]),
  )
  for (const name of [...new Set(names)].sort())
    groups.get(tokenGroup(name))!.push(name)
  return tokenGroups
    .map((group) => ({ group, names: groups.get(group)! }))
    .filter(({ names }) => names.length > 0)
}

/** Applied overrides skip empty drafts so the preset value shows through. */
export function appliedOverrides(overrides: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(overrides).filter(([, value]) => value.trim() !== ''),
  )
}

export function overridesAsCss(
  preset: Preset,
  overrides: Record<string, string>,
) {
  const entries = Object.entries(appliedOverrides(overrides)).sort(([a], [b]) =>
    a.localeCompare(b),
  )
  if (!entries.length) return ''
  return [
    '/* Theme tokens have zero specificity, so this rule overrides them. */',
    `.ui-theme[data-ui-preset='${preset}'] {`,
    ...entries.map(([name, value]) => `  ${name}: ${value.trim()};`),
    '}',
  ].join('\n')
}

export function isColor(value: string) {
  return (
    value !== '' &&
    typeof CSS !== 'undefined' &&
    CSS.supports('color', value) &&
    !/^(inherit|initial|unset|revert|currentcolor)$/i.test(value)
  )
}
