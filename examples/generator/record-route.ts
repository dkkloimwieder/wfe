export type RecordRoute =
  | { screen: 'records' }
  | { screen: 'view' | 'edit'; id: string }
  | { screen: 'missing' }

/** Application URL parsing shared by client and server entry points. */
export function recordRoute(url: string): RecordRoute {
  const params = new URL(url, 'http://records.example').searchParams
  const screen = params.get('screen')
  const id = params.get('record')
  if (screen === null && id === null) return { screen: 'records' }
  if ((screen === 'view' || screen === 'edit') && id !== null && id.trim())
    return { screen, id }
  return { screen: 'missing' }
}

export function recordUrl(url: string, route: RecordRoute) {
  const next = new URL(url, 'http://records.example')
  if (route.screen === 'view' || route.screen === 'edit') {
    next.searchParams.set('screen', route.screen)
    next.searchParams.set('record', route.id)
  } else {
    next.searchParams.delete('screen')
    next.searchParams.delete('record')
  }
  return next
}
