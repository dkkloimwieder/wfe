import { expect, test } from 'vitest'
import {
  defaults,
  entries,
  galleryUrl,
  readRoute,
} from '../../examples/components/gallery/catalog'

test('direct gallery links preserve example, state, width and presentation in a fresh URL', () => {
  const route = {
    ...defaults,
    id: 'fields' as const,
    state: 'readonly' as const,
    viewport: 'phone' as const,
    scheme: 2,
    accent: 4,
    depth: 3 as const,
    layers: { canvas: 2 as const, pane: 1 as const, content: 2 as const },
  }
  const url = galleryUrl(
    new URL('https://example.test/components/?legacy=1#old'),
    route,
  )
  expect(readRoute(url)).toEqual(route)
  expect(url.origin).toBe('https://example.test')
  expect(url.hash).toBe('')
  expect(url.searchParams.has('legacy')).toBe(false)
  const preview = galleryUrl(url, route, true)
  expect(preview.searchParams.has('gallery')).toBe(false)
  expect(preview.searchParams.get('galleryPreview')).toBe('fields')
  expect(readRoute(preview)).toEqual(route)
})
test('invalid URL input falls back to finite presentation defaults and capability-aware states', () => {
  const route = readRoute(
    new URL(
      'https://example.test/?gallery=buttons&state=readonly&scheme=Infinity&accent=-1&depth=9&canvas=1.5&pane=&content=invalid&viewport=giant',
    ),
  )
  expect(route).toEqual({ ...defaults, id: 'buttons', viewport: 'full' })
  expect(
    readRoute(new URL('https://example.test/?gallery=https://foreign.test')).id,
  ).toBe('fields')
})
test('every catalog entry has a unique direct URL and supports the normal state', () => {
  expect(new Set(entries.map((entry) => entry.id)).size).toBe(entries.length)
  for (const entry of entries) {
    expect(entry.states).toContain('normal')
    const url = galleryUrl(new URL('https://example.test/'), {
      ...defaults,
      id: entry.id,
      viewport: 'full',
    })
    expect(readRoute(url).id).toBe(entry.id)
  }
})

test('decoration URLs round trip and reject unbounded presentation values', () => {
  const route = {
    ...defaults,
    id: 'fields' as const,
    viewport: 'full' as const,
    decorations: {
      secondary: 6,
      dots: 0,
      border: 100,
      inside: 42,
      dotColor: 'secondary' as const,
      borderColor: 'primary' as const,
    },
  }
  expect(readRoute(galleryUrl(new URL('https://example.test'), route))).toEqual(
    route,
  )
  expect(
    readRoute(
      new URL(
        'https://example.test?dots=-1&border=101&inside=1.2&secondary=12&dotColor=red&borderColor=red',
      ),
    ).decorations,
  ).toEqual(defaults.decorations)
})

test('additional secondary accents round trip without changing primary bounds', () => {
  for (const secondary of [9, 10, 11]) {
    const route = {
      ...defaults,
      id: 'fields' as const,
      viewport: 'full' as const,
      decorations: { ...defaults.decorations, secondary },
    }
    expect(
      readRoute(galleryUrl(new URL('https://example.test'), route)),
    ).toEqual(route)
  }
  expect(readRoute(new URL('https://example.test?accent=9')).accent).toBe(
    defaults.accent,
  )
})
