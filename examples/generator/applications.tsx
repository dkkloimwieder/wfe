import { ColumnControlsApp } from './ColumnControlsApp'
import type { createColumnControlsApplication } from './ColumnControlsApp'
import { SubTables } from '../components/gallery/SubTables'
import { DetailsApp } from './DetailsApp'
import type { createDetailsApplication } from './DetailsApp'
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
  'column-controls': ColumnControlsApp,
  subtables: () => <SubTables initiallyExpanded />,
  details: DetailsApp,
  repeated: RepeatedApp,
  records: App,
  dispatch: DispatchApp,
  focus: FocusApp,
  dates: DateApp,
  formats: FormatsApp,
}
export type ApplicationName = keyof typeof applications
export type Application =
  | ReturnType<typeof createColumnControlsApplication>
  | ReturnType<typeof createDetailsApplication>
  | ReturnType<typeof createRepeatedApplication>
  | ReturnType<typeof createFormatsApplication>
  | ReturnType<typeof createDateApplication>
  | ReturnType<typeof createFocusApplication>
  | ReturnType<typeof createRecordsApplication>
  | ReturnType<typeof createRecordsWorkflow>
  | ReturnType<typeof createDispatchApplication>
export function applicationName(value: string | null): ApplicationName {
  if (value === 'column-controls') return 'column-controls'
  if (value === 'subtables') return 'subtables'
  if (value === 'repeated') return 'repeated'
  if (value === 'details') return 'details'
  if (value === null || value === 'records') return 'records'
  if (value === 'formats') return 'formats'
  if (value === 'dates') return 'dates'
  if (value === 'focus') return 'focus'
  if (value === 'dispatch') return 'dispatch'
  throw new Error(`Unknown generator example application: ${value}`)
}
