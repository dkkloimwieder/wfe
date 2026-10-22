import { OBSERVE, action, flush } from 'solid-js'
import { hydrate, render } from '@solidjs/web'
import { applications } from './applications'
import { ExampleAppearance } from './ExampleAppearance'
import { recordRoute } from './record-route'
import type { Application, ApplicationName } from './applications'
import type {
  DispatchStage,
  DispatchResponse,
  DispatchValues,
} from './dispatch-provider'
import type { RepeatedConfiguration } from './RepeatedApp'
import type { DateDemoConfiguration } from './DateApp'
import type { FormErrors, FormReply, FormOutcome } from '@wfe/form'
import './style.css'
export function createFixture(
  name: ApplicationName = 'records',
  reviewCells = false,
  initialUrl = '?app=records',
) {
  const App = applications[name]
  let capture:
    | ReturnType<NonNullable<typeof OBSERVE>['diagnostics']['capture']>
    | undefined
  const events: unknown[] = []
  const begin = () => {
    events.push(...(capture?.stop() ?? []))
    capture = OBSERVE?.diagnostics.capture()
  }
  let release: (() => void) | undefined
  let app: Application | undefined
  let outcome: FormOutcome | undefined
  function form() {
    if (!app || !('form' in app)) throw new Error('This example has no form')
    return app.form
  }
  function dispatch() {
    if (app?.kind !== 'dispatch')
      throw new Error('This operation needs the dispatch example')
    return app
  }
  function records() {
    if (app?.kind !== 'records')
      throw new Error('This operation needs the records example')
    return app
  }

  // eslint-disable-next-line require-yield -- Disposal uses the existing synchronous action boundary.
  const dispose = action(function* () {
    release?.()
  })
  return {
    start() {
      begin()
      release = render(
        () => (
          <ExampleAppearance>
            <App
              reviewCells={reviewCells}
              initialRoute={recordRoute(initialUrl)}
              initialUrl={initialUrl}
              ready={(value: Application) => {
                app = value
              }}
            />
          </ExampleAppearance>
        ),
        document.getElementById('root')!,
      )
      flush()
    },
    async hydrate() {
      begin()
      release = await hydrate(
        () => (
          <ExampleAppearance>
            <App
              reviewCells={reviewCells}
              initialRoute={recordRoute(initialUrl)}
              initialUrl={initialUrl}
              ready={(value: Application) => {
                app = value
              }}
            />
          </ExampleAppearance>
        ),
        document.getElementById('root')!,
      )
      flush()
    },
    repeatedConfiguration(next: Partial<RepeatedConfiguration>) {
      if (app?.kind !== 'repeated')
        throw new Error('This operation needs the repeated example')
      app.configure(next)
      flush()
    },
    dateConfiguration(next: Partial<DateDemoConfiguration>) {
      if (app?.kind !== 'dates')
        throw new Error('This operation needs the date example')
      app.configure(next)
      flush()
    },
    dateTable(sorting: 'asc' | 'desc', minimum?: string) {
      if (app?.kind !== 'dates')
        throw new Error('This operation needs the date example')
      app.table.setSorting([{ id: 'instant', desc: sorting === 'desc' }])
      app.table.setColumnFilters(
        minimum ? [{ id: 'instant', value: minimum }] : [],
      )
      flush()
    },
    dateValues(next: {
      reviewDate: string
      systemTime: string
      browserTime: string
    }) {
      if (app?.kind !== 'dates')
        throw new Error('This operation needs the date example')
      app.replace(next)
      flush()
    },
    focusOrder(
      kind: 'fields' | 'panels',
      reversed: boolean,
      then?: 'elsewhere' | 'disable' | 'remove' | 'dispose',
    ) {
      if (app?.kind !== 'focus')
        throw new Error('This operation needs the focus example')
      if (kind === 'fields') app.moveFields(reversed)
      else app.movePanels(reversed)
      if (then === 'elsewhere')
        document.getElementById('focus-elsewhere')!.focus()
      if (then === 'disable') app.disable(true)
      if (then === 'remove') app.remove()
      if (then === 'dispose') dispose()
      flush()
    },
    workflowColumns() {
      if (app?.kind !== 'records-workflow')
        throw new Error('This operation needs the normal records example')
      app.table.setColumnOrder(['quantity', 'name', 'active', 'actions'])
      app.table.setColumnSizing({
        name: 1400,
        quantity: 200,
        active: 100,
        actions: 250,
      })
      flush()
    },
    submit() {
      outcome = undefined
      void form()
        .submit()
        .then((result) => {
          outcome = result
        })
      flush()
    },
    outcome: () => outcome,
    hold(stage: DispatchStage | undefined) {
      dispatch().provider.setHold(stage)
      flush()
    },
    response(value: DispatchResponse) {
      dispatch().provider.setResponse(value)
      flush()
    },
    rejectEdits(value: boolean) {
      dispatch().setRejectEdits(value)
      flush()
    },
    replace(value: DispatchValues) {
      dispatch().replace(value)
      flush()
    },
    cancel() {
      form().cancel()
      flush()
    },
    completeValidation(id: number, errors?: FormErrors<DispatchValues>) {
      const result = dispatch().provider.completeValidation(id, errors)
      flush()
      return result
    },
    completeSave(id: number, reply?: FormReply<DispatchValues>) {
      const result = dispatch().provider.completeSave(id, reply)
      flush()
      return result
    },
    fill(value: boolean) {
      records().setFill(value)
      flush()
    },
    rows(count: number) {
      records().setCount(count)
      flush()
    },
    columns(count: 1 | 2) {
      records().setColumns(count)
      flush()
    },
    fieldColumns(count: 2 | 3) {
      records().setFieldColumns(count)
      flush()
    },
    formColumns(count: 1 | 2 | 3) {
      records().setFormColumns(count)
      flush()
    },
    actionIcons(next: {
      only?: boolean
      visible?: boolean
      alternate?: boolean
      disabled?: boolean
    }) {
      records().configureIcons(next)
      flush()
    },
    recordOrder(reversed: boolean) {
      records().setReversed(reversed)
      flush()
    },
    revise() {
      if (!app || !('revise' in app))
        throw new Error('Review actions need review mode')
      app.revise()
      flush()
    },
    remove() {
      if (!app || !('remove' in app))
        throw new Error('Review actions need review mode')
      app.remove()
      flush()
    },
    rowActionState(
      id: string,
      patch: { name?: string; archived?: boolean; pending?: boolean },
    ) {
      if (app?.kind !== 'column-controls')
        throw new Error('This operation needs the column controls example')
      app.updateRow(id, patch)
      flush()
    },
    replaceRowActionHandler() {
      if (app?.kind !== 'column-controls')
        throw new Error('This operation needs the column controls example')
      app.replaceHandler()
      flush()
    },
    snapshot: () => app!.snapshot(),
    diagnostics: () => {
      events.push(...(capture?.stop() ?? []))
      capture = undefined
      return events.splice(0)
    },
    stop() {
      dispose()
      flush()
      release = undefined
    },
  }
}
declare global {
  interface Window {
    generatorFixture: ReturnType<typeof createFixture>
  }
}
