import { createContext, useContext } from 'solid-js'
import type { Accessor } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { Theme } from '@wfe/components/theme'
import type { ThemeDensity, ThemeMode } from '@wfe/components/theme'
import type {
  TableView,
  TableViewList,
  TableViewStorage,
} from '@wfe/components/table'

import { galleryThemeOptions } from './catalog'
import type { GalleryRoute } from './catalog'
import { settingsTableViewStorage } from '../../shared/controls/tableViewStorage'
import { demoSettings } from '../../shared/settings/demoSettings'
import type { AppearanceChoice } from '../../shared/settings/demoAppearance'
import { useDemoSetting } from '../../shared/settings/useDemoSetting'
import {
  initialUserViews,
  userTables,
  userTableViewKey,
} from '../../shared/settings/userTableViews'
import type { UserTable } from '../../shared/settings/userTableViews'

export type UserAppearanceChoice = 'Light' | 'Dark' | 'System'
export { userTables }

export const UserAppearance = createContext<{
  choice: Accessor<UserAppearanceChoice>
  setChoice: (value: UserAppearanceChoice) => Promise<boolean>
  density: Accessor<ThemeDensity>
} | null>(null)

const choiceLabel = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
  monochrome: 'Light',
} as const

const choiceValue = { Light: 'light', Dark: 'dark', System: 'system' } as const

function createUserViews() {
  const read = userTables.map((table) => ({
    table,
    value: useDemoSetting(userTableViewKey(table), initialUserViews[table]),
  }))
  return {
    lists: () =>
      Object.fromEntries(
        read.map(({ table, value }) => [table, value()]),
      ) as Record<UserTable, TableViewList>,
    storage: userViewStorage,
  }
}

const userViewStorage = Object.fromEntries(
  userTables.map((table) => [
    table,
    settingsTableViewStorage(demoSettings, 'user:' + table, {
      initial: initialUserViews[table],
    }),
  ]),
) as Record<UserTable, TableViewStorage>

const UserViews = createContext<ReturnType<typeof createUserViews> | null>(null)

export function UserViewSettings(props: { children: JSX.Element }) {
  const views = createUserViews()
  return <UserViews value={views}>{props.children}</UserViews>
}

export function useUserViews() {
  return useContext(UserViews) ?? createUserViews()
}

export type UserViewRow = { table: UserTable; view: TableView }

export function UserBlockAppearance(props: {
  route: Accessor<GalleryRoute>
  mode: Accessor<ThemeMode>
  choice: Accessor<AppearanceChoice>
  setChoice: (value: AppearanceChoice) => Promise<boolean>
  children: JSX.Element
}) {
  const density = useDemoSetting('density', 'default')
  const settings = {
    choice: () => choiceLabel[props.choice()],
    setChoice: (value: UserAppearanceChoice) =>
      props.setChoice(choiceValue[value]),
    density,
  }
  return (
    <UserAppearance value={settings}>
      <Theme
        {...galleryThemeOptions(props.route())}
        preset={props.route().preset}
        mode={props.mode()}
        density={density()}
        class="gallery-example-fill"
      >
        {props.children}
      </Theme>
    </UserAppearance>
  )
}
