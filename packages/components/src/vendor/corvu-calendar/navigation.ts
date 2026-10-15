// Adapted from Corvu Calendar CellTrigger keyboard handling.
import { modifyFocusedDay } from './utils'

export function navigateDay(
  date: Date,
  key: string,
  shift: boolean,
  startOfWeek: number,
  rtl: boolean,
  disabled: (date: Date) => boolean,
): Date | null {
  const weekday = (date.getUTCDay() - startOfWeek + 7) % 7
  const offsets: Record<
    string,
    { day?: number; month?: number; year?: number }
  > = {
    ArrowLeft: { day: rtl ? 1 : -1 },
    ArrowRight: { day: rtl ? -1 : 1 },
    ArrowUp: { day: -7 },
    ArrowDown: { day: 7 },
    Home: { day: -weekday },
    End: { day: 6 - weekday },
    PageUp: shift ? { year: -1 } : { month: -1 },
    PageDown: shift ? { year: 1 } : { month: 1 },
  }
  const offset = offsets[key]
  if (!offset) return null
  return modifyFocusedDay(
    date,
    offset,
    disabled,
    key !== 'Home' && key !== 'End',
  )
}
