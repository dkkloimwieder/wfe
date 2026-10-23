/** Shared predicates and errors only; each descriptor retains its own policy. */
export function requireValue(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error(`Generator: ${message}`)
}

export function requireObject(
  value: unknown,
  label: string,
): asserts value is Record<string, unknown> {
  requireValue(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    `invalid ${label}`,
  )
}

export function isNonEmptyText(value: unknown): value is string {
  return typeof value === 'string' && Boolean(value.trim())
}

export function requireText(
  value: unknown,
  label: string,
): asserts value is string {
  requireValue(isNonEmptyText(value), `invalid ${label}`)
}

export function requireKeys(
  value: object,
  allowed: readonly string[],
  label: string,
) {
  for (const key of Object.keys(value))
    requireValue(
      allowed.includes(key),
      `unsupported ${label} property "${key}"`,
    )
}

export function isFormColumnCount(value: unknown): value is 1 | 2 | 3 {
  return value === 1 || value === 2 || value === 3
}

export function isFormSpan(value: unknown, columns: number): boolean {
  return (
    value === undefined ||
    value === 'full' ||
    (typeof value === 'number' &&
      Number.isInteger(value) &&
      value >= 1 &&
      value <= columns)
  )
}
