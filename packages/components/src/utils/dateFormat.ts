import { dateFormatter } from './intlFormat'
import { dateValue, parseDate } from './date'

/** Numeric Gregorian patterns use yyyy, MM and dd once, or locale order. */
export type DateInputFormat = string

export function dateInputPattern(
  format: DateInputFormat = 'yyyy-MM-dd',
  locale?: string,
): string {
  const pattern =
    format === 'locale'
      ? dateFormatter(locale ?? 'en-US', {
          calendar: 'gregory',
          numberingSystem: 'latn',
          timeZone: 'UTC',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
          .formatToParts(new Date('2006-11-22T12:00:00Z'))
          .map((part) =>
            part.type === 'year'
              ? 'yyyy'
              : part.type === 'month'
                ? 'MM'
                : part.type === 'day'
                  ? 'dd'
                  : part.value,
          )
          .join('')
      : format
  const tokens = pattern.match(/yyyy|MM|dd/g) ?? []
  if (
    tokens.length !== 3 ||
    new Set(tokens).size !== 3 ||
    /[a-zA-Z]/.test(pattern.replace(/yyyy|MM|dd/g, ''))
  )
    throw new RangeError('Date format must contain yyyy, MM, and dd once')
  return pattern
}

export function formatDateInput(
  value: string | undefined,
  format?: DateInputFormat,
  locale?: string,
): string {
  const pattern = dateInputPattern(format, locale)
  if (!value) return ''
  const date = parseDate(value)
  if (!date) throw new RangeError('Date value must be a valid YYYY-MM-DD date')
  const parts: Record<string, string> = {
    yyyy: value.slice(0, 4),
    MM: value.slice(5, 7),
    dd: value.slice(8, 10),
  }
  return pattern.replace(/yyyy|MM|dd/g, (token) => parts[token]!)
}

export function parseDateInput(
  value: string,
  format?: DateInputFormat,
  locale?: string,
): string | undefined {
  const pattern = dateInputPattern(format, locale)
  const tokens: string[] = []
  const expression = pattern
    .split(/(yyyy|MM|dd)/)
    .map((part) => {
      if (part === 'yyyy' || part === 'MM' || part === 'dd') {
        tokens.push(part)
        return part === 'yyyy' ? '([0-9]{4})' : '([0-9]{2})'
      }
      return Array.from(part, (character) =>
        '.*+?^${}()|[]'.includes(character) || character.charCodeAt(0) === 92
          ? String.fromCharCode(92) + character
          : character,
      ).join('')
    })
    .join('')
  const match = new RegExp(`^${expression}$`).exec(value.trim())
  if (!match) return undefined
  const parts = Object.fromEntries(
    tokens.map((token, index) => [
      token,
      match[index + 1]!.padStart(token === 'yyyy' ? 4 : 2, '0'),
    ]),
  )
  const date = parseDate(`${parts.yyyy}-${parts.MM}-${parts.dd}`)
  return date ? dateValue(date) : undefined
}
