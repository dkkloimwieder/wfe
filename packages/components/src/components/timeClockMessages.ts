import { resolveMessages } from '../internal/messages'

export interface TimeClockMessages {
  hour: string
  minute: string
  second: string
  period: string
  clockInstructions: (unit: string) => string
}
export const timeClockMessages: Readonly<TimeClockMessages> = {
  hour: 'Hour',
  minute: 'Minute',
  second: 'Second',
  period: 'AM/PM',
  clockInstructions: (unit) =>
    `Choose ${unit.toLowerCase()} on the clock, or use arrow keys. Home and End select the first and last value. Enter moves to the next unit.`,
}
export const resolveTimeClockMessages = (
  overrides: () => Partial<TimeClockMessages> | undefined,
) => resolveMessages(timeClockMessages, overrides)
