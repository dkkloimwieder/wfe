import { expect, test } from 'vitest'
import {
  description,
  readLocation,
  routeHref,
} from '../../examples/shell/routes'

test('each example route supplies its own audience when opened directly', () => {
  for (const route of description.routes) {
    expect(readLocation(`/?audience=invalid&page=${route.id}`)).toEqual({
      audience: route.audience,
      route: route.id,
    })
  }
})
test('invalid example addresses fall back without an inferred redirect', () => {
  expect(readLocation('/?page=missing&audience=research')).toEqual({
    audience: 'research',
    route: 'observations',
  })
  expect(readLocation('/?page=missing&audience=invalid')).toEqual({
    audience: 'operations',
    route: 'records',
  })
})
test('example links preserve unrelated query data, path, and fragment', () => {
  const href = routeHref(
    '/workspace?source=direct&audience=operations&page=record#details',
    'findings',
  )
  expect(href).toBe(
    '/workspace?source=direct&audience=research&page=findings#details',
  )
  expect(readLocation(href)).toEqual({
    audience: 'research',
    route: 'findings',
  })
})
