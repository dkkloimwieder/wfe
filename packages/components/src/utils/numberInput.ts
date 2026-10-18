/** Decimal and exponent syntax, without hexadecimal or nonfinite values. */
export function parseNumberInput(text: string): number | undefined {
  const value = text.trim()
  if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value))
    return undefined
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}
