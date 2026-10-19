import type { ShellDescription } from './types'

function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Shell: ${message}`)
}
function object(
  value: unknown,
  label: string,
): asserts value is Record<string, unknown> {
  requireValue(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    `invalid ${label}`,
  )
}
function text(value: unknown, label: string): asserts value is string {
  requireValue(
    typeof value === 'string' && Boolean(value.trim()),
    `invalid ${label}`,
  )
}
function keys(value: object, allowed: readonly string[], label: string) {
  for (const key of Object.keys(value))
    requireValue(
      allowed.includes(key),
      `unsupported ${label} property "${key}"`,
    )
}

function nonEmptyArray(value: unknown, label: string) {
  requireValue(
    Array.isArray(value) && value.length > 0,
    `at least one ${label} is required`,
  )
}

export function createShellModel<D extends ShellDescription>(description: D) {
  object(description, 'description')
  keys(description, ['id', 'title', 'audiences', 'routes'], 'description')
  text(description.id, 'shell ID')
  if (description.title !== undefined) text(description.title, 'shell title')
  nonEmptyArray(description.audiences, 'audience')
  nonEmptyArray(description.routes, 'route')
  const audiences = new Map<string, D['audiences'][number]>()
  for (const audience of description.audiences) {
    object(audience, 'audience')
    keys(audience, ['id', 'label'], 'audience')
    text(audience.id, 'audience ID')
    text(audience.label, 'audience label')
    requireValue(
      !audiences.has(audience.id),
      `duplicate audience "${audience.id}"`,
    )
    audiences.set(audience.id, audience)
  }
  const routes = new Map<string, D['routes'][number]>()
  for (const route of description.routes) {
    object(route, 'route')
    keys(route, ['id', 'label', 'view', 'audience', 'parent'], 'route')
    text(route.id, 'route ID')
    text(route.label, 'route label')
    text(route.view, 'view ID')
    if (route.audience !== undefined) {
      text(route.audience, 'route audience')
      requireValue(
        audiences.has(route.audience),
        `unknown audience "${route.audience}"`,
      )
    }
    if (route.parent !== undefined) text(route.parent, 'parent route ID')
    requireValue(!routes.has(route.id), `duplicate route "${route.id}"`)
    routes.set(route.id, route)
  }
  for (const route of routes.values())
    if (route.parent !== undefined)
      requireValue(
        routes.has(route.parent),
        `unknown parent route "${route.parent}"`,
      )
  const completed = new Set<string>()
  for (const route of routes.values()) {
    const chain = new Set<string>()
    let cursor: string | undefined = route.id
    while (cursor !== undefined && !completed.has(cursor)) {
      requireValue(!chain.has(cursor), `cyclic parent route "${cursor}"`)
      chain.add(cursor)
      cursor = routes.get(cursor)!.parent
    }
    for (const id of chain) completed.add(id)
  }
  return { audiences, routes }
}

/** Validate serializable navigation metadata without creating application state. */
export function defineShell<const D extends ShellDescription>(
  description: D,
): D {
  createShellModel(description)
  return description
}
