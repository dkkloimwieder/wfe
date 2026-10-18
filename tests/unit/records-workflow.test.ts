import { expect, test } from 'vitest'
import { createRoot, flush } from 'solid-js'
import {
  createRecordsWorkflow,
  workflowRecords,
} from '../../examples/generator/records-workflow'
import { recordRoute, recordUrl } from '../../examples/generator/record-route'

function mount(url = '?app=records') {
  let app!: ReturnType<typeof createRecordsWorkflow>
  const stop = createRoot((dispose) => {
    app = createRecordsWorkflow(recordRoute(url))
    return dispose
  })
  return { app, stop }
}
const settle = async () => {
  for (let step = 0; step < 12; step++) {
    await Promise.resolve()
    flush()
  }
}
test('routes parse identically for relative and absolute URLs and preserve unrelated parameters', () => {
  expect(recordRoute('?app=records')).toEqual({ screen: 'records' })
  expect(
    recordRoute('https://example.test/?screen=edit&record=record-1'),
  ).toEqual({ screen: 'edit', id: 'record-1' })
  expect(recordRoute('?screen=view&record=__proto__')).toEqual({
    screen: 'view',
    id: '__proto__',
  })
  for (const url of [
    '?screen=edit',
    '?record=record-0',
    '?screen=unknown&record=record-0',
    '?screen=view&record=',
  ])
    expect(recordRoute(url)).toEqual({ screen: 'missing' })
  const url = recordUrl('https://example.test/?app=records&other=keep', {
    screen: 'view',
    id: 'record-1',
  })
  expect(url.searchParams.get('other')).toBe('keep')
  expect(recordRoute(url.href)).toEqual({ screen: 'view', id: 'record-1' })
  expect(recordUrl(url.href, { screen: 'records' }).search).toBe(
    '?app=records&other=keep',
  )
})
test('direct links and record transitions load every field from the selected stable ID', () => {
  const { app, stop } = mount('?screen=edit&record=record-1')
  expect(app.values()).toEqual(workflowRecords['record-1'])
  for (const id of ['record-0', 'record-1', 'record-0']) {
    app.enter({ screen: 'edit', id })
    flush()
    expect(app.values()).toEqual(workflowRecords[id])
  }
  app.enter({ screen: 'view', id: '__proto__' })
  flush()
  expect(app.selected()).toBeUndefined()
  stop()
})
test('saving targets only the selected row, and leaving discards local edits', async () => {
  const { app, stop } = mount('?screen=edit&record=record-1')
  app.form.setValue('name', 'Saved second record')
  flush()
  const save = app.form.submit()
  await settle()
  expect(await save).toEqual({ status: 'success' })
  expect(app.rows()['record-1']!.name).toBe('Saved second record')
  expect(app.rows()['record-0']).toEqual(workflowRecords['record-0'])
  expect(app.form.dirty).toBe(false)
  app.form.setValue('name', 'Reset this')
  flush()
  app.form.reset()
  flush()
  expect(app.values().name).toBe('Saved second record')
  app.form.setValue('name', 'Unsaved')
  flush()
  app.enter({ screen: 'records' })
  flush()
  app.enter({ screen: 'edit', id: 'record-1' })
  flush()
  expect(app.values().name).toBe('Saved second record')
  expect(app.form.errors).toEqual({})
  stop()
})
for (const end of ['navigate', 'dispose'] as const)
  test(`late saves cannot publish after ${end}`, async () => {
    const { app, stop } = mount('?screen=edit&record=record-1')
    app.form.setValue('name', 'Late')
    flush()
    const pending = app.form.submit()
    await Promise.resolve()
    flush()
    expect(app.form.phase).toBe('submitting')
    if (end === 'navigate') {
      app.enter({ screen: 'edit', id: 'record-0' })
      flush()
    } else stop()
    await settle()
    expect(await pending).toEqual({
      status: end === 'dispose' ? 'disposed' : 'cancelled',
    })
    expect(app.rows()['record-1']).toEqual(workflowRecords['record-1'])
    if (end === 'navigate') {
      expect(app.values()).toEqual(workflowRecords['record-0'])
      stop()
    }
  })
test('application validation rejects blank names and negative quantities', async () => {
  const { app, stop } = mount('?screen=edit&record=record-0')
  app.form.setValue('name', ' ')
  flush()
  app.form.setValue('quantity', -1)
  flush()
  const pending = app.form.submit()
  await settle()
  expect(await pending).toEqual({ status: 'invalid' })
  expect(app.form.errors.fields?.name).toBe('Name is required')
  expect(app.form.errors.fields?.quantity).toBe('Use a nonnegative quantity')
  expect(app.rows()['record-0']).toEqual(workflowRecords['record-0'])
  stop()
})
