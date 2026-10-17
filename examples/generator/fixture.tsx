import { OBSERVE, action, flush } from 'solid-js'
import { hydrate, render } from '@solidjs/web'
import { applications } from './applications'
import type { Application, ApplicationName } from './applications'
import type {
  DispatchStage,
  DispatchResponse,
  DispatchValues,
} from './dispatch-provider'
import type { DateDemoConfiguration } from './DateApp'
import type { FormErrors, FormReply, FormOutcome } from '@wfe/form'
import './style.css'
export function createFixture(name: ApplicationName = 'records') {
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
          <App
            ready={(value: Application) => {
              app = value
            }}
          />
        ),
        document.getElementById('root')!,
      )
      flush()
    },
    async hydrate() {
      begin()
      release = await hydrate(
        () => (
          <App
            ready={(value: Application) => {
              app = value
            }}
          />
        ),
        document.getElementById('root')!,
      )
      flush()
    },
    dateConfiguration(next: Partial<DateDemoConfiguration>) {
      if (app?.kind !== 'dates')
        throw new Error('This operation needs the date example')
      app.configure(next)
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
    submit() {
      outcome = undefined
      void app!.form.submit().then((result) => {
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
      app!.form.cancel()
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
    revise() {
      app!.revise()
      flush()
    },
    remove() {
      app!.remove()
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
