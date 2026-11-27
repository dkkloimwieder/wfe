import type {
  TableView,
  TableViewList,
  TableViewStorage,
  TableViewsOptions,
} from '@wfe/components/table'
import type { SettingsStore } from '../settings/SettingsStore'
import { demoSettings } from '../settings/demoSettings'

export function settingsTableViewStorage<Role extends string>(
  store: SettingsStore<Role>,
  tableId: string,
  options: { initial?: TableViewList; systemViews?: readonly TableView[] } = {},
): TableViewStorage {
  const key = `tableViews:${tableId}` as const
  const initial = options.initial ?? { views: [] }
  const systemIds = new Set(options.systemViews?.map(({ id }) => id))

  function userList(list: TableViewList = initial): TableViewList {
    if (systemIds.size === 0) return list
    return { ...list, views: list.views.filter(({ id }) => !systemIds.has(id)) }
  }

  function assertUserView(id: string) {
    if (systemIds.has(id)) throw new Error('System views are read-only.')
  }

  return {
    async list(signal) {
      return userList(await store.get(key, { signal }))
    },
    async save(view, signal) {
      assertUserView(view.id)
      await store.update(
        key,
        (value) => {
          const current = userList(value)
          const views = current.views.some(({ id }) => id === view.id)
            ? current.views.map((item) => (item.id === view.id ? view : item))
            : [...current.views, view]
          return { ...current, views }
        },
        { signal },
      )
    },
    async remove(id, signal) {
      assertUserView(id)
      await store.update(
        key,
        (value) => {
          const { views, defaultId } = userList(value)
          return {
            views: views.filter((view) => view.id !== id),
            defaultId: defaultId === id ? null : defaultId,
          }
        },
        { signal },
      )
    },
    setDefault(defaultId, signal) {
      return store.update(key, (value) => ({ ...userList(value), defaultId }), {
        signal,
      })
    },
    subscribe(listener) {
      return store.subscribe(key, (value) => listener(userList(value)))
    },
  }
}

export function localTableViews(
  tableId: string,
  options: Omit<TableViewsOptions, 'storage'>,
): TableViewsOptions {
  return {
    ...options,
    storage: settingsTableViewStorage(demoSettings, tableId, options),
  }
}
