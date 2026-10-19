import { RepeatedApp } from './RepeatedApp'
import type { createRepeatedApplication } from './RepeatedApp'
import { FormatsApp } from './FormatsApp'
import type { createFormatsApplication } from './FormatsApp'
import { DateApp } from './DateApp'
import type { createDateApplication } from './DateApp'
import { FocusApp } from './FocusApp'
import type { createFocusApplication } from './FocusApp'
import { App } from './App'
import { DispatchApp } from './DispatchApp'
import type { createRecordsApplication } from './records-application'
import type { createRecordsWorkflow } from './records-workflow'
import type { createDispatchApplication } from './dispatch-application'
export const applications = {
  repeated: RepeatedApp,
  records: App,
  dispatch: DispatchApp,
  focus: FocusApp,
  dates: DateApp,
  formats: FormatsApp,
}
export type ApplicationName = keyof typeof applications
export type Application =
  | ReturnType<typeof createRepeatedApplication>
  | ReturnType<typeof createFormatsApplication>
  | ReturnType<typeof createDateApplication>
  | ReturnType<typeof createFocusApplication>
  | ReturnType<typeof createRecordsApplication>
  | ReturnType<typeof createRecordsWorkflow>
  | ReturnType<typeof createDispatchApplication>
export function applicationName(value: string | null): ApplicationName {
  if (value === 'repeated') return 'repeated'
  if (value === null || value === 'records') return 'records'
  if (value === 'formats') return 'formats'
  if (value === 'dates') return 'dates'
  if (value === 'focus') return 'focus'
  if (value === 'dispatch') return 'dispatch'
  throw new Error(`Unknown generator example application: ${value}`)
}
