import { readTableView } from '@wfe/components/table'
import type { TableView, TableViewList } from '@wfe/components/table'
import type { ThemePreset } from '@wfe/components/theme'
import type { Settings, SettingsKey } from './SettingsStore'
import { signInLandingPages } from './SettingsStore'

export type SettingsRecord = { version: 1; value: unknown }

export type SettingsDecoder<Role extends string> = <K extends SettingsKey>(
  key: K,
  record: unknown,
) => Settings<Role>[K] | undefined

export function parseSettingsJson(raw: string | null): unknown {
  try {
    return raw === null ? undefined : JSON.parse(raw)
  } catch {
    return undefined
  }
}

export function settingsRecord(value: unknown): SettingsRecord {
  return { version: 1, value }
}

export function assertWritableSettings(record: unknown) {
  if (
    record &&
    typeof record === 'object' &&
    'version' in record &&
    typeof record.version === 'number' &&
    record.version > 1
  ) {
    throw new Error('Unsupported settings version')
  }
}

export function readTableViewList(value: unknown): TableViewList | undefined {
  if (
    !value ||
    typeof value !== 'object' ||
    !('views' in value) ||
    !Array.isArray(value.views)
  )
    return undefined

  const views = new Map<string, TableView>()
  for (const entry of value.views as unknown[]) {
    const view = readTableView(entry)
    if (view && !views.has(view.id)) views.set(view.id, view)
  }
  const defaultId = 'defaultId' in value ? value.defaultId : undefined
  // The table controller resolves system IDs and discards stale IDs.
  return {
    views: [...views.values()],
    defaultId:
      typeof defaultId === 'string' || defaultId === null
        ? defaultId
        : undefined,
  }
}

export function isThemePreset(value: unknown): value is ThemePreset {
  return value === 'default' || value === 'vanilla' || value === 'laser'
}

function decodeValue<Role extends string>(
  key: SettingsKey,
  value: unknown,
  roles: readonly Role[],
): Settings<Role>[SettingsKey] | undefined {
  if (key === 'theme') return isThemePreset(value) ? value : undefined
  if (key === 'scheme') {
    if (value === 'light' || value === 'dark' || value === 'system')
      return value
    return undefined
  }
  if (key === 'role') return roles.find((role) => role === value)
  if (key === 'density') {
    return value === 'default' || value === 'compact' || value === 'comfortable'
      ? value
      : undefined
  }
  if (key === 'profile') {
    if (
      value &&
      typeof value === 'object' &&
      'name' in value &&
      'email' in value &&
      'language' in value &&
      'timeZone' in value
    ) {
      const { name, email, language, timeZone } = value
      if (
        typeof name === 'string' &&
        typeof email === 'string' &&
        typeof language === 'string' &&
        typeof timeZone === 'string'
      )
        return { name, email, language, timeZone }
    }
    return undefined
  }
  if (key === 'notificationChannels') {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      return undefined
    const entries = Object.entries(value)
    return entries.every(([, choice]) => typeof choice === 'boolean')
      ? Object.fromEntries(entries)
      : undefined
  }
  if (key === 'signInDefaults') {
    if (
      value &&
      typeof value === 'object' &&
      'landing' in value &&
      'role' in value
    ) {
      const landing = signInLandingPages.find((page) => page === value.landing)
      const role = roles.find((role) => role === value.role)
      if (landing && role) return { landing, role }
    }
    return undefined
  }
  return readTableViewList(value)
}

export function settingsDecoder<Role extends string>(
  roles: readonly Role[],
): SettingsDecoder<Role> {
  return (key, record) => {
    if (
      !record ||
      typeof record !== 'object' ||
      !('version' in record) ||
      record.version !== 1 ||
      !('value' in record)
    )
      return undefined
    return decodeValue(key, record.value, roles) as
      Settings<Role>[typeof key] | undefined
  }
}

export function encodeSetting<Role extends string, K extends SettingsKey>(
  decode: SettingsDecoder<Role>,
  key: K,
  value: Settings<Role>[K],
) {
  const normalized = decode(key, settingsRecord(value))
  if (normalized === undefined) throw new Error('Invalid setting')
  return settingsRecord(normalized)
}
