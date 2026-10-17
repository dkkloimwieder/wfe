import type { JSX } from '@solidjs/web'

export type ClassValue = JSX.HTMLAttributes<HTMLElement>['class']

/** Keep caller values structured. Library classes always remain present. */
export function styledClasses(base: string, value: ClassValue): ClassValue {
  return [snapshot(value), base]
}

// Read nested getters while the class expression tracks its dependencies.
// DOM assignment can run outside that tracking scope.
function snapshot(value: ClassValue): ClassValue {
  if (Array.isArray(value)) return value.map(snapshot)
  if (value !== null && typeof value === 'object') return { ...value }
  return value
}
