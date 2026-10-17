import { FocusApp } from './FocusApp'
import type { createFocusApplication } from './FocusApp'
import { App } from './App'
import { DispatchApp } from './DispatchApp'
import type { createRecordsApplication } from './records-application'
import type { createDispatchApplication } from './dispatch-application'
export const applications = {
  records: App,
  dispatch: DispatchApp,
  focus: FocusApp,
}
export type ApplicationName = keyof typeof applications
export type Application =
  | ReturnType<typeof createFocusApplication>
  | ReturnType<typeof createRecordsApplication>
  | ReturnType<typeof createDispatchApplication>
export function applicationName(value: string | null): ApplicationName {
  if (value === null || value === 'records') return 'records'
  if (value === 'focus') return 'focus'
  if (value === 'dispatch') return 'dispatch'
  throw new Error(`Unknown generator example application: ${value}`)
}
