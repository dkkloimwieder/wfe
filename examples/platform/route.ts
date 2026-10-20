import type { PlatformScenario } from './provider'
export type PlatformRoute =
  | { screen: 'projects' | 'create' | 'invite' | 'users' | 'missing' }
  | { screen: 'project' | 'members'; project: string }
  | { screen: 'access'; principal: string }
  | { screen: 'environment'; project: string; env: string }
export function platformRoute(input: string): PlatformRoute {
  const query = new URL(input, 'http://platform.example').searchParams
  const screen = query.get('screen') ?? 'projects',
    project = query.get('project'),
    env = query.get('env'),
    principal = query.get('principal')
  if (
    screen === 'access' &&
    principal &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      principal,
    ) &&
    project === null &&
    env === null
  )
    return { screen, principal }
  if (principal !== null) return { screen: 'missing' }
  if (
    (screen === 'projects' ||
      screen === 'create' ||
      screen === 'invite' ||
      screen === 'users') &&
    project === null &&
    env === null
  )
    return { screen }
  if ((screen === 'project' || screen === 'members') && project && env === null)
    return { screen, project }
  if (screen === 'environment' && project && env)
    return { screen, project, env }
  return { screen: 'missing' }
}
export function platformUrl(input: string, route: PlatformRoute) {
  const url = new URL(input, 'http://platform.example')
  for (const key of ['screen', 'project', 'env', 'principal'])
    url.searchParams.delete(key)
  if (route.screen !== 'projects') url.searchParams.set('screen', route.screen)
  if ('project' in route) url.searchParams.set('project', route.project)
  if ('principal' in route) url.searchParams.set('principal', route.principal)
  if ('env' in route) url.searchParams.set('env', route.env)
  return url
}
export function platformScenario(input: string): PlatformScenario {
  const value = new URL(input, 'http://platform.example').searchParams.get(
    'scenario',
  )
  return value === 'project-admin' || value === 'no-access' || value === 'empty'
    ? value
    : 'normal'
}
