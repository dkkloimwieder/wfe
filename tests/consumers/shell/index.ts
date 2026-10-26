// Generated from built declarations by tests/consumers/generate.mjs.
// Resolve only public package exports through the workspace node_modules links.
import type {
  defineShell,
  ShellAudience,
  ShellAudienceId,
  ShellBindings,
  ShellDescription,
  shellMessages,
  ShellMessages,
  ShellPageProps,
  ShellRoute,
  ShellRouteId,
  ShellView,
  ShellViewId,
  ShellViewProps,
} from '@wfe/shell'
import type { AllTyped, Assert } from '../assertions.js'

export type ExportedTypes = Assert<
  AllTyped<{
    defineShell: typeof defineShell
    ShellAudience: ShellAudience
    ShellAudienceId: ShellAudienceId<import('@wfe/shell').ShellDescription>
    ShellBindings: ShellBindings
    ShellDescription: ShellDescription
    shellMessages: typeof shellMessages
    ShellMessages: ShellMessages
    ShellPageProps: ShellPageProps
    ShellRoute: ShellRoute
    ShellRouteId: ShellRouteId<import('@wfe/shell').ShellDescription>
    ShellView: typeof ShellView
    ShellViewId: ShellViewId<import('@wfe/shell').ShellDescription>
    ShellViewProps: ShellViewProps
  }>
>
