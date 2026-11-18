/** Convert scalar fixture data to text at callbacks that receive unknown values. */
export function scalarText(value: unknown, fallback = ''): string {
  switch (typeof value) {
    case 'string':
      return value
    case 'number':
    case 'boolean':
    case 'bigint':
    case 'symbol':
      return String(value)
    default:
      return fallback
  }
}
