import { localSettings } from './localSettings'
import {
  parseSettingsJson,
  settingsDecoder,
  settingsRecord,
} from './settingsRecord'
import { readLegacyUserViewList } from './userTableViews'

export const demoRoles = [
  'Platform administrator',
  'Tenant administrator',
  'Member',
  'Customer',
] as const
export type DemoRole = (typeof demoRoles)[number]

export const demoSettings = localSettings(
  'wfe.settings.demo.anonymous',
  settingsDecoder(demoRoles),
  (key) => {
    if (!key.startsWith('tableViews:')) return undefined
    if (key.startsWith('tableViews:user:')) {
      const views = readLegacyUserViewList(key)
      // The old record ends with its session. Keep it across tabs after loading.
      if (views) return { record: settingsRecord(views), persistOnRead: true }
    }
    const id = key.slice('tableViews:'.length)
    const raw = localStorage.getItem(`wfe.gallery.table-views.${id}`)
    if (raw !== null) return { record: settingsRecord(parseSettingsJson(raw)) }
    return undefined
  },
)
