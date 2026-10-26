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

test('all supported surface choices survive direct and preview URL roundtrips', () => {
  const levels = [0, 1, 2] as const
  for (const canvas of levels)
    for (const pane of levels)
      for (const content of levels) {
        const route = {
          ...defaults,
          id: 'fields' as const,
          viewport: 'full' as const,
          layers: { canvas, pane, content },
        }
        for (const preview of [false, true]) {
          const url = galleryUrl(
            new URL('https://example.test/'),
            route,
            preview,
          )
          expect(readRoute(url)).toEqual(route)
          const next = galleryUrl(url, { ...route, id: 'numbers' }, preview)
          expect(readRoute(next).layers).toEqual(route.layers)
        }
      }
})

test('omitted gallery surface defaults decode to the same choices', () => {
  const route = {
    ...defaults,
    id: 'fields' as const,
    viewport: 'full' as const,
  }
  for (const preview of [false, true]) {
    const url = galleryUrl(new URL('https://example.test/'), route, preview)
    for (const key of ['canvas', 'pane', 'content'])
      expect(url.searchParams.has(key)).toBe(false)
    expect(readRoute(url)).toEqual(route)
  }
})

test('theme preset survives navigation and preview links independently of mode', () => {
  for (const preset of ['default', 'vanilla'] as const) {
    for (const scheme of [0, 1, 2]) {
      const route = {
        ...defaults,
        id: 'fields' as const,
        viewport: 'full' as const,
        preset,
        scheme,
      }
      for (const preview of [false, true]) {
        const url = galleryUrl(new URL('https://example.test/'), route, preview)
        expect(readRoute(url)).toEqual(route)
        expect(url.searchParams.has('preset')).toBe(preset !== 'default')
        const next = readRoute(
          galleryUrl(url, { ...route, id: 'numbers' }, preview),
        )
        expect(next.preset).toBe(preset)
        expect(next.scheme).toBe(scheme)
      }
    }
  }
  expect(
    readRoute(new URL('https://example.test/?preset=unknown')).preset,
  ).toBe('default')
})
