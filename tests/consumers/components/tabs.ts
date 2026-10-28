// Generated from built declarations by tests/consumers/generate.mjs.
// Resolve only public package exports through the workspace node_modules links.
import type {
  Tabs,
  TabsContent,
  TabsContentProps,
  TabsList,
  TabsListProps,
  TabsPanelMount,
  TabsRoot,
  TabsRootProps,
  TabsTrigger,
  TabsTriggerProps,
} from '@wfe/components/tabs'
import type { AllTyped, Assert } from '../assertions.js'

export type ExportedTypes = Assert<
  AllTyped<{
    Tabs: typeof Tabs
    TabsContent: typeof TabsContent
    TabsContentProps: TabsContentProps
    TabsList: typeof TabsList
    TabsListProps: TabsListProps
    TabsPanelMount: TabsPanelMount
    TabsRoot: typeof TabsRoot
    TabsRootProps: TabsRootProps
    TabsTrigger: typeof TabsTrigger
    TabsTriggerProps: TabsTriggerProps
  }>
>
