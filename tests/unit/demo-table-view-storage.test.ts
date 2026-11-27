import { createRoot, createSignal, flush } from 'solid-js'
import { afterEach, expect, test, vi } from 'vitest'
import type { TableView, TableViewState } from '@wfe/components/table'
import { settingsTableViewStorage } from '../../examples/shared/controls/tableViewStorage'
import { localSettings } from '../../examples/shared/settings/localSettings'
import { settingsDecoder } from '../../examples/shared/settings/settingsRecord'
import { createTableViews } from '../../packages/components/src/table/createTableViews'

const namespace = 'demo-view-test'
const tableId = 'inventory'
const store = localSettings(namespace, settingsDecoder([]))
const system: TableView = {
  id: 'all',
  name: 'All inventory',
  state: { version: 1 },
}
const view: TableView = {
  id: 'north',
  name: 'North warehouse',
  state: { version: 1, globalFilter: 'North' },
}

afterEach(() => localStorage.clear())

test('keeps system views read-only and lets the user manage views and defaults', async () => {
  const storage = settingsTableViewStorage(store, tableId, {
    systemViews: [system],
  })
  const signal = new AbortController().signal
  await expect(storage.save(system, signal)).rejects.toThrow(
    'System views are read-only.',
  )
  await expect(storage.remove(system.id, signal)).rejects.toThrow(
    'System views are read-only.',
  )

  await storage.setDefault(system.id, signal)
  expect(await storage.list(signal)).toEqual({
    views: [],
    defaultId: system.id,
  })
  await storage.save(view, signal)
  await storage.setDefault(view.id, signal)
  await storage.save({ ...view, name: 'Renamed' }, signal)
  expect(await storage.list(signal)).toMatchObject({
    views: [{ ...view, name: 'Renamed' }],
    defaultId: view.id,
  })
  await storage.remove(view.id, signal)
  expect(await storage.list(signal)).toEqual({ views: [], defaultId: null })
})

test('reconciles a mounted table with other-tab lists and retains a draft', async () => {
  const storage = settingsTableViewStorage(store, tableId, {
    systemViews: [system],
  })
  const { controller, dispose, setDraft, draft } = createRoot((dispose) => {
    const [draft, setDraft] = createSignal<TableViewState>({ version: 1 })
    const controller = createTableViews({
      configuration: () => ({
        storage,
        systemViews: [system],
        initialViewId: system.id,
      }),
      capture: draft,
      normalize: (state) => state,
      restore: setDraft,
    })
    return { controller, dispose, setDraft, draft }
  })

  function fromOtherTab(value: {
    views: TableView[]
    defaultId: string | null
  }) {
    const key = `${namespace}.tableViews:${tableId}`
    const newValue = JSON.stringify({ version: 1, value })
    localStorage.setItem(key, newValue)
    window.dispatchEvent(
      new StorageEvent('storage', { key, newValue, storageArea: localStorage }),
    )
    flush()
  }

  try {
    flush()
    await vi.waitFor(() => {
      flush()
      expect(controller.ready()).toBe(true)
    })
    expect(controller.locked()).toBe(true)

    fromOtherTab({ views: [view], defaultId: view.id })
    expect(controller.selected()?.id).toBe(system.id)
    expect(controller.defaultId()).toBe(view.id)
    expect(controller.views().map(({ name }) => name)).toEqual([
      system.name,
      view.name,
    ])

    controller.choose(view.id)
    flush()
    expect(draft().globalFilter).toBe('North')
    setDraft({ version: 1, globalFilter: 'Unapplied' })
    fromOtherTab({ views: [{ ...view, name: 'Renamed' }], defaultId: view.id })
    expect(controller.selected()?.name).toBe('Renamed')
    expect(draft().globalFilter).toBe('Unapplied')

    fromOtherTab({ views: [], defaultId: null })
    expect(controller.selected()).toBeUndefined()
    expect(controller.defaultId()).toBeUndefined()
    expect(draft().globalFilter).toBe('Unapplied')
  } finally {
    dispose()
  }
})
