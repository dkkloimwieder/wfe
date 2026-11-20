import { createContext, useContext } from 'solid-js'
import type { Accessor } from 'solid-js'

export type ThemePreset = 'default' | 'vanilla' | 'laser'

/** Whether the owning Theme draws the dotted decoration. An accessor keeps it reactive. */
export const ThemeDecorationContext = createContext<Accessor<boolean>>(
  () => true,
)
export function useThemeDecoration() {
  return useContext(ThemeDecorationContext)
}
