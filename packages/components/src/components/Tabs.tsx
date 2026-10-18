import {
  createContext,
  createEffect,
  omit,
  useContext,
  untrack,
} from 'solid-js'
import type { JSX } from '@solidjs/web'
import { styledClasses, type ClassValue } from '../internal/classes'
import { TabsRoot as Root } from '../vendor/kobalte/core/src/tabs/tabs-root'
import { TabsList as List } from '../vendor/kobalte/core/src/tabs/tabs-list'
import { TabsTrigger as Trigger } from '../vendor/kobalte/core/src/tabs/tabs-trigger'
import { TabsContent as Content } from '../vendor/kobalte/core/src/tabs/tabs-content'

export type TabsPanelMount = 'retain' | 'active'
export type TabsRootProps = Omit<
  JSX.HTMLAttributes<HTMLDivElement>,
  'onChange' | 'id' | 'dir'
> & {
  id?: string
  dir?: 'ltr' | 'rtl'
  onValueChange?: (value: string) => void
  orientation?: 'horizontal' | 'vertical'
  activationMode?: 'automatic' | 'manual'
  disabled?: boolean
  panelMount?: TabsPanelMount
} & (
    | { value: string; defaultValue?: never }
    | { value?: never; defaultValue: string }
  )
export type TabsListProps = JSX.HTMLAttributes<HTMLDivElement>
export type TabsTriggerProps = Omit<
  JSX.ButtonHTMLAttributes<HTMLButtonElement>,
  'id' | 'value' | 'disabled' | 'type'
> & { id?: never; value: string; disabled?: boolean; type?: 'button' }
export type TabsContentProps = Omit<
  JSX.HTMLAttributes<HTMLDivElement>,
  'id' | 'hidden' | 'inert'
> & { id?: never; value: string; class?: ClassValue }
const MountContext = createContext<() => TabsPanelMount>()

export function TabsRoot(props: TabsRootProps) {
  const controlled = untrack(() => props.value !== undefined)
  if (!untrack(() => props.value ?? props.defaultValue))
    throw new Error('Tabs requires a nonempty value or defaultValue')
  createEffect(
    () => props.value,
    (value) => {
      if ((value !== undefined) !== controlled)
        throw new Error('Tabs cannot change control mode')
      if (controlled && !value)
        throw new Error('Tabs requires a nonempty value')
    },
  )
  const attributes = omit(props, 'class', 'panelMount', 'onValueChange')
  return (
    <MountContext value={() => props.panelMount ?? 'retain'}>
      <Root
        {...attributes}
        data-ui=""
        class={styledClasses('ui-tabs', props.class)}
        onChange={(next) => {
          props.onValueChange?.(next)
        }}
      />
    </MountContext>
  )
}
export function TabsList(props: TabsListProps) {
  return <List {...props} class={styledClasses('ui-tabs-list', props.class)} />
}
export function TabsTrigger(props: TabsTriggerProps) {
  return (
    <Trigger
      {...props}
      class={styledClasses('ui-button ui-tabs-trigger', props.class)}
      data-variant="outline"
      data-tone="default"
    />
  )
}
export function TabsContent(props: TabsContentProps) {
  const mount = useContext(MountContext)
  if (!mount) throw new Error('Tabs.Content requires Tabs.Root')
  return (
    <Content
      {...props}
      forceMount={mount() === 'retain'}
      class={styledClasses('ui-tabs-content', props.class)}
    />
  )
}
export const Tabs = Object.assign(TabsRoot, {
  Root: TabsRoot,
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
})
