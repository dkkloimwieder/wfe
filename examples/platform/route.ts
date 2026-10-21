import type { ApplicationAccessTarget } from './application-access-application'
import type { PlatformScenario } from './provider'
export type PlatformRoute =
  | ApplicationAccessTarget
  | { screen: 'projects' | 'create' | 'invite' | 'users' | 'missing' }
  | { screen: 'project' | 'members'; project: string }
  | { screen: 'access'; principal: string }
  | { screen: 'environment'; project: string; env: string }
export function platformRoute(input: string): PlatformRoute {
  const query = new URL(input, 'http://platform.example').searchParams
  const screen = query.get('screen') ?? 'projects',
    project = query.get('project'),
    env = query.get('env'),
    principal = query.get('principal'),
    role = query.get('role')
  if (project && env) {
    if (
      (screen === 'app-users' || screen === 'app-roles') &&
      principal === null &&
      role === null
    )
      return { screen, project, env }
    if (
      screen === 'app-user' &&
      principal &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        principal,
      ) &&
      role === null
    )
      return { screen, project, env, principal }
    if (screen === 'app-role' && role && principal === null)
      return { screen, project, env, role }
  }
  if (role !== null) return { screen: 'missing' }
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
  for (const key of ['screen', 'project', 'env', 'principal', 'role'])
    url.searchParams.delete(key)
  if (route.screen !== 'projects') url.searchParams.set('screen', route.screen)
  if ('project' in route) url.searchParams.set('project', route.project)
  if ('principal' in route) url.searchParams.set('principal', route.principal)
  if ('env' in route) url.searchParams.set('env', route.env)
  if ('role' in route) url.searchParams.set('role', route.role)
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

export function isApplicationAccessRoute(
  route: PlatformRoute,
): route is ApplicationAccessTarget {
  return ['app-users', 'app-user', 'app-roles', 'app-role'].includes(
    route.screen,
  )
}
