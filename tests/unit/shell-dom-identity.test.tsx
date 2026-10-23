import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, within } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { defineShell, ShellView } from '@wfe/shell'

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test.each(['shared-description', 'shared shell metadata'])(
  'two shells retain metadata identity %j with distinct DOM IDs and local navigation focus',
  async (id) => {
    const description = defineShell({
      id,
      audiences: [{ id: 'audience', label: 'Audience' }],
      routes: [
        { id: 'home', label: 'Home', view: 'page' },
        { id: 'detail', label: 'Detail', view: 'page', parent: 'home' },
      ],
    } as const)
    const [firstRoute, setFirstRoute] = createSignal<'home' | 'detail'>('home')
    const [secondRoute, setSecondRoute] = createSignal<'home' | 'detail'>(
      'home',
    )
    const Page = () => <p>Page content</p>
    const h = render(() => (
      <>
        <ShellView
          description={description}
          bindings={{
            audience: () => 'audience',
            route: firstRoute,
            href: (route) => `#first-${route}`,
            views: { page: Page },
            onAudienceChange() {},
            onNavigate: setFirstRoute,
          }}
        />
        <ShellView
          description={description}
          bindings={{
            audience: () => 'audience',
            route: secondRoute,
            href: (route) => `#second-${route}`,
            views: { page: Page },
            onAudienceChange() {},
            onNavigate: setSecondRoute,
          }}
        />
      </>
    ))
    flush()
    await Promise.resolve()
    const shells = [
      ...h.container.querySelectorAll<HTMLElement>('.ui-dashboard'),
    ]
    expect(shells).toHaveLength(2)
    const ids = [...h.container.querySelectorAll('[id]')].map((node) => node.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((value) => value.length > 0 && !/\s/.test(value))).toBe(
      true,
    )
    expect(description.id).toBe(id)
    const first = within(shells[0]!)
    const second = within(shells[1]!)
    for (const shell of shells) {
      const toggle = within(shell).getByRole('button', {
        name: 'Navigation',
      })
      const target = document.getElementById(
        toggle.getAttribute('aria-controls')!,
      )
      expect(target !== null && shell.contains(target)).toBe(true)
      expect(target?.getAttribute('aria-label')).toBe('Primary navigation')
    }
    const initialIds = shells.map((shell) => shell.id)
    const firstHeading = first.getByRole('heading', { name: 'Home' })
    const secondHeading = second.getByRole('heading', { name: 'Home' })
    fireEvent.click(
      within(
        first.getByRole('navigation', { name: 'Primary navigation' }),
      ).getByRole('link', { name: 'Detail' }),
    )
    flush()
    await Promise.resolve()
    flush()
    expect(
      first.getByRole('heading', { name: 'Detail' }) === firstHeading,
    ).toBe(true)
    expect(document.activeElement === firstHeading).toBe(true)
    expect(
      second.getByRole('heading', { name: 'Home' }) === secondHeading,
    ).toBe(true)
    expect(shells.map((shell) => shell.id)).toEqual(initialIds)
    expect(document.getElementById(firstHeading.id) === firstHeading).toBe(true)
    expect(document.getElementById(secondHeading.id) === secondHeading).toBe(
      true,
    )
  },
)
