const limit = 32
const dates = new Map<string, Intl.DateTimeFormat>()
const numbers = new Map<string, Intl.NumberFormat>()
function cached<T>(cache: Map<string, T>, key: string, create: () => T): T {
  const found = cache.get(key)
  if (found) {
    cache.delete(key)
    cache.set(key, found)
    return found
  }
  const value = create()
  if (cache.size === limit) cache.delete(cache.keys().next().value!)
  cache.set(key, value)
  return value
}
/** Cache formatting machinery only. Record values never enter these bounded caches. */
export function dateFormatter(
  locale: string | undefined,
  options: Intl.DateTimeFormatOptions,
) {
  return cached(
    dates,
    JSON.stringify([locale, options]),
    () => new Intl.DateTimeFormat(locale, options),
  )
}
export function numberFormatter(
  locale: string | undefined,
  options: Intl.NumberFormatOptions,
) {
  return cached(
    numbers,
    JSON.stringify([locale, options]),
    () => new Intl.NumberFormat(locale, options),
  )
}
