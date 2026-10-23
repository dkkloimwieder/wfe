import type { TableFilterValue } from './TableColumnFilter'

/** The legacy simple control selects strings; it does not choose query semantics. */
export type LegacyTableFilterKind = 'text' | 'boolean' | 'select'

/** Adapt the legacy empty-string sentinel to an absent criterion. */
export function fromLegacyTableFilterValue(
  value: string,
  kind: LegacyTableFilterKind = 'text',
): TableFilterValue | undefined {
  if (value === '') return undefined
  if (kind === 'boolean') {
    if (value === 'true') return true
    if (value === 'false') return false
    throw new Error('A legacy boolean filter must be true, false, or empty.')
  }
  return kind === 'select'
    ? { operator: 'in', values: [value] }
    : { operator: 'contains', value }
}

/** Reject criteria that a legacy control cannot represent without losing meaning. */
export function toLegacyTableFilterValue(
  value: TableFilterValue | undefined,
  kind: LegacyTableFilterKind = 'text',
): string {
  if (value === undefined) return ''
  if (kind === 'boolean' && typeof value === 'boolean') return String(value)
  if (typeof value === 'object' && 'operator' in value) {
    if (
      kind === 'text' &&
      value.operator === 'contains' &&
      'value' in value &&
      value.value !== ''
    )
      return value.value
    if (
      kind === 'select' &&
      value.operator === 'in' &&
      'values' in value &&
      value.values.length === 1 &&
      value.values[0] !== ''
    )
      return value.values[0]!
  }
  throw new Error(
    'This criterion cannot be represented by the legacy filter control.',
  )
}
