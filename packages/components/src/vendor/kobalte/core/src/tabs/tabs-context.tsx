import type { Orientation } from '../../../utils/src/index.ts'
import { type Accessor, createContext, useContext } from 'solid-js'

import type { SingleSelectListState } from '../list/index.ts'
import type { TabsActivationMode } from './types.ts'

export interface TabsContextValue {
  isDisabled: Accessor<boolean>
  direction: Accessor<'ltr' | 'rtl'>
  orientation: Accessor<Orientation>
  activationMode: Accessor<TabsActivationMode>
  listState: Accessor<SingleSelectListState>
  generateTriggerId: (value: string) => string
  generateContentId: (value: string) => string
}

export const TabsContext = createContext<TabsContextValue>()

export function useTabsContext() {
  const context = useContext(TabsContext)

  if (context === undefined) {
    throw new Error(
      '[kobalte]: `useTabsContext` must be used within a `Tabs` component',
    )
  }

  return context
}
