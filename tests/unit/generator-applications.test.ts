import { action, createRoot, flush } from 'solid-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDispatchApplication } from '../../examples/generator/dispatch-application'
import { initialDispatch } from '../../examples/generator/dispatch-provider'
import {
  createRecordsProvider,
  initialRecord,
} from '../../examples/generator/records-provider'

const stops: (() => void)[] = []
function owned<T>(create: () => T) {
  const root = createRoot((dispose) => ({ value: create(), dispose }))
  // eslint-disable-next-line require-yield -- Dispose through the synchronous action boundary.
  const stop = action(function* () {
    root.dispose()
  })
  stops.push(stop)
  flush()
  return { app: root.value, stop }
}
async function settle() {
  await Promise.resolve()
  await Promise.resolve()
  flush()
}
afterEach(() => {
  stops.splice(0).forEach((stop) => stop())
  flush()
  vi.restoreAllMocks()
})

describe('independent generator applications', () => {
  it('keeps controlled values and validates application-specific numbers and dates', async () => {
    const { app } = owned(createDispatchApplication)
    app.setRejectEdits(true)
    flush()
    app.form.setValue('trackingCode', 'PKG-222')
    flush()
    expect(app.values().trackingCode).toBe('PKG-100')
    for (const value of [NaN, Infinity, -1])
      expect(
        app.provider.rules({ ...initialDispatch, declaredValue: value }).fields
          ?.declaredValue,
      ).toBeTruthy()
    expect(
      app.provider.rules({ ...initialDispatch, insured: true }).fields
        ?.declaredValue,
    ).toBeTruthy()
    expect(
      app.provider.rules({ ...initialDispatch, dispatchDate: '2026-02-30' })
        .fields?.dispatchDate,
    ).toBeTruthy()
    expect(
      app.provider.rules({ ...initialDispatch, dispatchDate: '2028-02-29' }),
    ).toEqual({})
    app.setRejectEdits(false)
    flush()
    app.form.setValue('trackingCode', 'bad')
    flush()
    expect(await app.form.submit()).toEqual({ status: 'invalid' })
    expect(app.provider.publications()).toBe(0)
  })
  it('reports service field errors, form errors and exceptions, then retries', async () => {
    const { app } = owned(createDispatchApplication)
    for (const response of ['field-error', 'form-error', 'failure'] as const) {
      app.provider.setResponse(response)
      const result = await app.form.submit()
      expect(result.status).toBe(response === 'failure' ? 'error' : 'rejected')
      expect(app.provider.publications()).toBe(0)
      if (response === 'field-error')
        expect(app.form.errors.fields?.trackingCode).toBeTruthy()
      if (response === 'form-error') expect(app.form.errors.form).toBeTruthy()
      if (response === 'failure') expect(app.form.failure).toBeInstanceOf(Error)
    }
    app.provider.setResponse('accepted')
    expect(await app.form.submit()).toEqual({ status: 'success' })
    expect(app.provider.publications()).toBe(1)
    expect(Object.values(app.provider.rows())).toHaveLength(3)
  })
  it('holds validation and rejects wrong-phase or duplicate completions', async () => {
    const { app } = owned(createDispatchApplication)
    app.provider.setHold('validation')
    app.form.setValue('trackingCode', 'bad')
    flush()
    const result = app.form.submit()
    await settle()
    const request = app.provider.pending()!
    expect(Object.isFrozen(request.values)).toBe(true)
    expect(app.provider.completeSave(request.id)).toBe(false)
    expect(app.provider.completeValidation(request.id)).toBe(true)
    expect(app.provider.completeValidation(request.id)).toBe(false)
    expect(await result).toEqual({ status: 'invalid' })
    expect(app.provider.publications()).toBe(0)
  })
  for (const stage of ['validation', 'save'] as const)
    for (const end of ['cancel', 'replace', 'remove', 'dispose'] as const)
      it(`ignores late ${stage} replies after ${end}`, async () => {
        const warn = vi.spyOn(console, 'warn')
        const { app, stop } = owned(createDispatchApplication)
        app.provider.setHold(stage)
        flush()
        const result = app.form.submit()
        await settle()
        await settle()
        const request = app.provider.pending()!
        expect(request.stage).toBe(stage)
        if (end === 'cancel') app.form.cancel()
        if (end === 'replace')
          app.replace({ ...initialDispatch, trackingCode: 'PKG-333' })
        if (end === 'remove') app.remove()
        if (end === 'dispose') stop()
        flush()
        expect(await result).toEqual({
          status: end === 'dispose' ? 'disposed' : 'cancelled',
        })
        expect(request.signal.aborted).toBe(true)
        if (stage === 'validation')
          app.provider.completeValidation(request.id, { form: 'Late error' })
        else app.provider.completeSave(request.id)
        await settle()
        expect(app.provider.publications()).toBe(0)
        expect(Object.values(app.provider.rows())).toHaveLength(2)
        expect(app.form.errors).toEqual({})
        expect(warn).not.toHaveBeenCalled()
      })
  for (const end of ['abort', 'dispose'] as const)
    it(`guards the records provider after ${end}`, async () => {
      const { app, stop } = owned(createRecordsProvider)
      const controller = new AbortController()
      const result = app.save(initialRecord, {
        attempt: 1,
        signal: controller.signal,
      })
      if (end === 'abort') controller.abort()
      else stop()
      await result
      expect(app.submitted()).toBe(0)
    })
})
