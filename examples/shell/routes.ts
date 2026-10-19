import { defineShell } from '@wfe/shell'

export const description = defineShell({
  id: 'example-shell',
  title: 'Workspace',
  audiences: [
    { id: 'operations', label: 'Operations' },
    { id: 'research', label: 'Research' },
  ],
  routes: [
    { id: 'records', label: 'Records', audience: 'operations', view: 'table' },
    {
      id: 'record',
      label: 'Record detail',
      audience: 'operations',
      view: 'detail',
      parent: 'records',
    },
    {
      id: 'overview',
      label: 'Overview',
      audience: 'operations',
      view: 'summary',
    },
    {
      id: 'observations',
      label: 'Observations',
      audience: 'research',
      view: 'table',
    },
    {
      id: 'observation',
      label: 'Observation detail',
      audience: 'research',
      view: 'detail',
      parent: 'observations',
    },
    {
      id: 'findings',
      label: 'Findings',
      audience: 'research',
      view: 'summary',
    },
  ],
} as const)
export type RouteId = (typeof description.routes)[number]['id']
export type AudienceId = (typeof description.audiences)[number]['id']
export type Location = { route: RouteId; audience: AudienceId }
export function defaultRoute(audience: AudienceId): RouteId {
  return audience === 'operations' ? 'records' : 'observations'
}
export function readLocation(address: string): Location {
  const url = new URL(address, 'http://shell.example')
  const route = description.routes.find(
    (entry) => entry.id === url.searchParams.get('page'),
  )
  if (route) return { route: route.id, audience: route.audience }
  const audience =
    url.searchParams.get('audience') === 'research' ? 'research' : 'operations'
  return { audience, route: defaultRoute(audience) }
}
export function routeHref(address: string, id: RouteId): string {
  const url = new URL(address, 'http://shell.example')
  const route = description.routes.find((entry) => entry.id === id)!
  url.searchParams.set('audience', route.audience)
  url.searchParams.set('page', route.id)
  return url.pathname + url.search + url.hash
}
