import type { Accessor, Component } from 'solid-js'
import type { DashboardShellProps } from '@wfe/components/layout'

export type ShellAudience = Readonly<{ id: string; label: string }>
export type ShellRoute = Readonly<{
  id: string
  label: string
  view: string
  /** Menu placement only. An omitted audience makes the route shared. */
  audience?: string
  parent?: string
}>
export type ShellDescription = Readonly<{
  id: string
  title?: string
  audiences: readonly ShellAudience[]
  routes: readonly ShellRoute[]
}>
export type ShellAudienceId<D extends ShellDescription> =
  D['audiences'][number]['id']
export type ShellRouteId<D extends ShellDescription> = D['routes'][number]['id']
export type ShellViewId<D extends ShellDescription> =
  D['routes'][number]['view']
export type ShellPageProps<D extends ShellDescription = ShellDescription> =
  Readonly<{
    audience: D['audiences'][number]
    route: D['routes'][number]
  }>
export type ShellBindings<D extends ShellDescription = ShellDescription> =
  Readonly<{
    audience: Accessor<ShellAudienceId<D>>
    route: Accessor<ShellRouteId<D>>
    href: (route: ShellRouteId<D>) => string
    views: Readonly<{ [Id in ShellViewId<D>]: Component<ShellPageProps<D>> }>
    onAudienceChange: (requested: ShellAudienceId<D>) => void
    onNavigate: (requested: ShellRouteId<D>) => void
  }>
export type ShellViewProps<D extends ShellDescription = ShellDescription> =
  Pick<
    DashboardShellProps,
    | 'class'
    | 'style'
    | 'density'
    | 'theme'
    | 'scroll'
    | 'footer'
    | 'footerLabel'
    | 'navigationLabel'
    | 'toggleLabel'
    | 'closeLabel'
    | 'mainLabel'
    | 'context'
    | 'contextLabel'
    | 'contextToggleLabel'
    | 'contextCloseLabel'
  > & {
    description: D
    bindings: ShellBindings<D>
    audienceLabel?: string
  }
