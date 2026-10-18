import { createMemo, createSignal, onSettled } from 'solid-js'
import { dateFormatter } from '../utils/intlFormat'

/** Browser zones become available only after mounting or hydration. */
export function createTimeZone(
  requested: () => string | undefined,
  fallback: 'UTC' | 'browser',
) {
  const [mounted, setMounted] = createSignal(false)
  onSettled(() => {
    setMounted(true)
  })
  return createMemo(() => {
    const value = requested() ?? fallback
    if (value === 'browser')
      return mounted()
        ? new Intl.DateTimeFormat().resolvedOptions().timeZone
        : undefined
    dateFormatter('en-US', { timeZone: value })
    return value
  })
}
