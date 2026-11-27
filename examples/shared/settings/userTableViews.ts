import type { TableViewList } from '@wfe/components/table'
import { parseSettingsJson, readTableViewList } from './settingsRecord'

export const initialUserViews = {
  'My tickets': {
    views: [
      {
        id: 'by-priority',
        name: 'By priority',
        state: { version: 1, sorting: [{ id: 'priority', desc: false }] },
      },
      {
        id: 'recently-updated',
        name: 'Recently updated',
        state: { version: 1, sorting: [{ id: 'updated', desc: true }] },
      },
      {
        id: 'open-tickets',
        name: 'Open tickets',
        state: {
          version: 1,
          columnFilters: [{ id: 'status', value: 'Open' }],
          sorting: [{ id: 'updated', desc: true }],
        },
      },
      {
        id: 'by-application',
        name: 'By application',
        state: { version: 1, sorting: [{ id: 'application', desc: false }] },
      },
    ],
  },
  Notifications: {
    views: [
      {
        id: 'unread-first',
        name: 'Unread first',
        state: { version: 1, sorting: [{ id: 'status', desc: true }] },
      },
      {
        id: 'recent',
        name: 'Most recent',
        state: { version: 1, sorting: [{ id: 'time', desc: true }] },
      },
      {
        id: 'support-updates',
        name: 'Support updates',
        state: { version: 1, extraFilters: 'Support' },
      },
      {
        id: 'security-alerts',
        name: 'Security alerts',
        state: { version: 1, extraFilters: 'Security' },
      },
    ],
  },
  'Active sessions': {
    views: [
      {
        id: 'recent-sessions',
        name: 'Recently active',
        state: { version: 1, sorting: [{ id: 'active', desc: true }] },
      },
      {
        id: 'sessions-by-device',
        name: 'By device',
        state: { version: 1, sorting: [{ id: 'device', desc: false }] },
      },
    ],
  },
  'Personal access tokens': {
    views: [
      {
        id: 'recent-tokens',
        name: 'Newest tokens',
        state: { version: 1, sorting: [{ id: 'created', desc: true }] },
      },
      {
        id: 'tokens-by-name',
        name: 'By token name',
        state: { version: 1, sorting: [{ id: 'name', desc: false }] },
      },
    ],
  },
} satisfies Record<string, TableViewList>

export type UserTable = keyof typeof initialUserViews
export const userTables = Object.keys(initialUserViews) as UserTable[]
const storageKey = 'wfe-gallery-user-table-views'
const legacyViewIds = new Set([
  'by-priority',
  'recently-updated',
  'unread-first',
])

export function userTableViewKey(table: UserTable) {
  return `tableViews:user:${table}` as const
}

export function readLegacyUserViewList(key: string): TableViewList | undefined {
  const table = userTables.find((name) => userTableViewKey(name) === key)
  if (!table) return undefined

  const stored = parseSettingsJson(sessionStorage.getItem(storageKey))
  if (!stored || typeof stored !== 'object' || !(table in stored))
    return undefined
  const version = 'version' in stored ? stored.version : undefined
  if (version !== undefined && version !== 1) return undefined
  const list = readTableViewList((stored as Record<string, unknown>)[table])
  if (!list || version === 1) return list

  // The original format knew only these seed IDs. Preserve their deletions.
  const added = initialUserViews[table].views.filter(
    ({ id }) =>
      !legacyViewIds.has(id) && !list.views.some((view) => view.id === id),
  )
  return { ...list, views: [...list.views, ...added] }
}
