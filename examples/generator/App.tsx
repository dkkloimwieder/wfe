import { untrack } from 'solid-js'
import { RecordsReview } from './RecordsReview'
import { RecordsWorkflow } from './RecordsWorkflow'
import type { createRecordsApplication } from './records-application'
import type { createRecordsWorkflow } from './records-workflow'
import type { RecordRoute } from './record-route'

export function App(props: {
  reviewCells?: boolean
  initialRoute?: RecordRoute
  ready?: (
    api:
      | ReturnType<typeof createRecordsApplication>
      | ReturnType<typeof createRecordsWorkflow>,
  ) => void
}) {
  return untrack(() => props.reviewCells ?? false) ? (
    <RecordsReview reviewCells ready={props.ready} />
  ) : (
    <RecordsWorkflow initialRoute={props.initialRoute} ready={props.ready} />
  )
}
