import type { TableViewList } from '@wfe/components/table'
import type { ThemeDensity, ThemePreset } from '@wfe/components/theme'

export type SchemeSetting = 'light' | 'dark' | 'system'
export type TableViewsKey = `tableViews:${string}`

export const signInLandingPages = [
  'Member home',
  'My tickets',
  'Notifications inbox',
  'Profile',
] as const
export type SignInLandingPage = (typeof signInLandingPages)[number]

export type ProfileSettings = {
  name: string
  email: string
  language: string
  timeZone: string
}

export type Settings<Role extends string> = {
  theme: ThemePreset
  scheme: SchemeSetting
  density: ThemeDensity
  role: Role
  profile: ProfileSettings
  notificationChannels: Record<string, boolean>
  signInDefaults: { landing: SignInLandingPage; role: Role }
} & Record<TableViewsKey, TableViewList>

export type SettingsKey = keyof Settings<string>
export type SettingsOptions = { signal?: AbortSignal }
export type SettingsListener<T> = (value: T | undefined) => void

export interface SettingsStore<Role extends string = string> {
  get<K extends SettingsKey>(
    key: K,
    options?: SettingsOptions,
  ): Promise<Settings<Role>[K] | undefined>
  set<K extends SettingsKey>(
    key: K,
    value: Settings<Role>[K],
    options?: SettingsOptions,
  ): Promise<void>
  /** A remote adapter can retry the change with a newer value. */
  update<K extends SettingsKey>(
    key: K,
    change: (current: Settings<Role>[K] | undefined) => Settings<Role>[K],
    options?: SettingsOptions,
  ): Promise<void>
  subscribe<K extends SettingsKey>(
    key: K,
    listener: SettingsListener<Settings<Role>[K]>,
  ): () => void
}
