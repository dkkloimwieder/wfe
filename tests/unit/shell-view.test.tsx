import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, within } from '@solidjs/testing-library'
import { createSignal, Errored, flush, onCleanup } from 'solid-js'
import { Input } from '@wfe/components'
import { ShellView } from '@wfe/shell'
import type { ShellBindings, ShellDescription } from '@wfe/shell'

beforeEach(() =>
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  ),
)
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
const initial: ShellDescription = {
  id: 'workspace',
  title: 'Workspace',
  audiences: [
    { id: 'operations', label: 'Operations' },
    { id: 'research', label: 'Research' },
  ],
  routes: [
    { id: 'home', label: 'Home', view: 'summary' },
    {
      id: 'queue',
      label: 'Queue',
      view: 'records',
      audience: 'operations',
      parent: 'home',
    },
    {
      id: 'reports',
      label: 'Reports',
      view: 'summary',
      audience: 'research',
      parent: 'home',
    },
  ],
}
const settle = async () => {
  flush()
  await Promise.resolve()
  flush()
}
function mount(
  initialRoute = 'home',
  initialHeader: 'default' | 'custom' | 'none' = 'default',
) {
  const [header, setHeader] = createSignal(initialHeader)
  const [description, setDescription] = createSignal(initial)
  const [audience, setAudience] = createSignal('operations')
  const [route, setRoute] = createSignal(initialRoute)
  const [prefix, setPrefix] = createSignal('#')
  let accept = false,
    mounts = 0,
    disposals = 0,
    headerMounts = 0,
    headerDisposals = 0
  const CustomHeader = () => {
    headerMounts++
    onCleanup(() => headerDisposals++)
    return <Input aria-label="Header draft" />
  }
  const Page = () => {
    mounts++
    onCleanup(() => disposals++)
    return <Input aria-label="Page draft" />
  }
  const navigate = vi.fn((id: string) => {
    if (accept) setRoute(id)
  })
  const audienceChange = vi.fn()
  const [bindings, setBindings] = createSignal<ShellBindings>({
    audience,
    route,
    href: (id) => prefix() + id,
    views: { summary: Page, records: Page },
    onNavigate: navigate,
    onAudienceChange: audienceChange,
  })
  const h = render(() => (
    <Errored fallback={(error) => <p role="alert">{String(error())}</p>}>
      <ShellView
        description={description()}
        bindings={bindings()}
        style={{ height: '600px' }}
        header={
          header() === 'none' ? null : header() === 'custom' ? (
            <CustomHeader />
          ) : undefined
        }
      />
    </Errored>
  ))
  flush()
  return {
    ...h,
    description,
    setDescription,
    setHeader,
    setAudience,
    setRoute,
    setPrefix,
    bindings,
    setBindings,
    navigate,
    audienceChange,
    accept: () => {
      accept = true
    },
    counts: () => ({ mounts, disposals }),
    headerCounts: () => ({ mounts: headerMounts, disposals: headerDisposals }),
    menu: () =>
      within(h.getByRole('navigation', { name: 'Primary navigation' })),
  }
}

test('renders configured navigation, breadcrumbs and a page without initial focus theft', async () => {
  const h = mount('queue')
  await settle()
  expect(
    h
      .menu()
      .getAllByRole('link')
      .map((link) => link.textContent),
  ).toEqual(['Home', 'Queue'])
  expect(
    h.menu().getByRole('link', { name: 'Queue' }).getAttribute('aria-current'),
  ).toBe('page')
  const path = h.getByRole('navigation', { name: 'Breadcrumbs' })
  expect(
    within(path).getByRole('link', { name: 'Home' }).getAttribute('href'),
  ).toBe('#home')
  expect(path.querySelector('[aria-current="page"]')?.textContent).toBe('Queue')
  expect(h.getByRole('heading', { name: 'Queue' })).not.toBe(
    document.activeElement,
  )
  expect(h.navigate).not.toHaveBeenCalled()
})

test('rejected navigation sends one request without changing the page or focus', async () => {
  const h = mount()
  await settle()
  fireEvent.click(h.getByRole('button', { name: 'Navigation', exact: true }))
  await settle()
  const queue = h.menu().getByRole('link', { name: 'Queue' })
  queue.focus()
  fireEvent.click(queue)
  await settle()
  expect(h.navigate.mock.calls).toEqual([['queue']])
  expect(h.getByRole('heading', { name: 'Home' })).toHaveProperty(
    'isConnected',
    true,
  )
  expect(document.activeElement).toBe(queue)
  expect(
    h.container
      .querySelector('.ui-dashboard')
      ?.hasAttribute('data-navigation-open'),
  ).toBe(true)
  expect(h.counts()).toEqual({ mounts: 1, disposals: 0 })
})

test('accepted navigation replaces the old page owner and focuses the new heading', async () => {
  const h = mount()
  await settle()
  h.accept()
  fireEvent.click(h.getByRole('button', { name: 'Navigation', exact: true }))
  await settle()
  fireEvent.click(h.menu().getByRole('link', { name: 'Queue' }))
  await settle()
  expect(h.getByRole('heading', { name: 'Queue' })).toBe(document.activeElement)
  expect(h.counts()).toEqual({ mounts: 2, disposals: 1 })
  expect(
    h.container
      .querySelector('.ui-dashboard')
      ?.hasAttribute('data-navigation-open'),
  ).toBe(false)
  h.setRoute('home')
  await settle()
  expect(h.getByRole('heading', { name: 'Home' })).toBe(document.activeElement)
  expect(h.navigate).toHaveBeenCalledTimes(1)
})

test('metadata labels and href changes retain page drafts, links and focus', async () => {
  const h = mount('queue')
  await settle()
  const draft = h.getByRole('textbox', {
    name: 'Page draft',
  }) as HTMLInputElement
  const link = h.menu().getByRole('link', { name: 'Queue' })
  draft.value = 'Retained'
  draft.focus()
  h.setDescription({
    ...initial,
    routes: initial.routes.map((route) =>
      route.id === 'queue' ? { ...route, label: 'Updated queue' } : route,
    ),
  })
  h.setPrefix('#updated-')
  await settle()
  expect(h.getByRole('textbox', { name: 'Page draft' })).toBe(draft)
  expect(draft.value).toBe('Retained')
  expect(document.activeElement).toBe(draft)
  expect(h.menu().getByRole('link', { name: 'Updated queue' })).toBe(link)
  expect(link.getAttribute('href')).toBe('#updated-queue')
  expect(h.counts()).toEqual({ mounts: 1, disposals: 0 })
})

test('accepted audience changes adjust menu placement without redirecting the application', async () => {
  const h = mount('queue')
  await settle()
  h.setAudience('research')
  await settle()
  expect(
    h
      .menu()
      .getAllByRole('link')
      .map((link) => link.textContent),
  ).toEqual(['Home', 'Reports'])
  expect(h.getByRole('heading', { name: 'Queue' })).toHaveProperty(
    'isConnected',
    true,
  )
  expect(h.audienceChange).not.toHaveBeenCalled()
  expect(h.navigate).not.toHaveBeenCalled()
})

test.each([
  { ctrlKey: true },
  { metaKey: true },
  { shiftKey: true },
  { altKey: true },
  { button: 1 },
])('preserves native modified activation %j', async (options) => {
  const h = mount()
  await settle()
  const event = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    ...options,
  })
  h.menu().getByRole('link', { name: 'Queue' }).dispatchEvent(event)
  await settle()
  expect(event.defaultPrevented).toBe(false)
  expect(h.navigate).not.toHaveBeenCalled()
})

test('uses the latest callback and removes detached link listeners on disposal', async () => {
  const h = mount()
  await settle()
  const latest = vi.fn()
  h.setBindings({ ...h.bindings(), onNavigate: latest })
  await settle()
  const link = h.menu().getByRole('link', { name: 'Queue' })
  fireEvent.click(link)
  await settle()
  expect(latest.mock.calls).toEqual([['queue']])
  expect(h.navigate).not.toHaveBeenCalled()
  h.unmount()
  flush()
  fireEvent.click(link)
  await settle()
  expect(latest).toHaveBeenCalledTimes(1)
  expect(h.counts().disposals).toBe(1)
})

test('disposal cancels pending heading focus', async () => {
  const h = mount()
  await settle()
  const outside = document.createElement('button')
  document.body.append(outside)
  h.setRoute('queue')
  flush()
  h.unmount()
  outside.focus()
  await settle()
  expect(document.activeElement).toBe(outside)
  outside.remove()
})

test.each([
  ['audience', { audience: () => 'missing' }],
  ['route', { route: () => 'missing' }],
  ['view', { views: {} }],
  [
    'inherited view',
    { views: Object.create({ summary: () => null, records: () => null }) },
  ],
  ['href', { href: () => '' }],
  ['callback', { onNavigate: undefined }],
])(
  'rejects invalid %s bindings through the application error boundary',
  async (name, patch) => {
    const h = mount()
    await settle()
    h.setBindings({ ...h.bindings(), ...patch } as ShellBindings)
    await settle()
    expect(h.getByRole('alert').textContent).toMatch(/Shell:/)
    void name
  },
)

test('rejects replacement shell identity and releases the page when its boundary unmounts', async () => {
  const h = mount()
  await settle()
  h.setDescription({ ...initial, id: 'replacement' })
  await settle()
  expect(h.getByRole('alert').textContent).toContain('remount the shell')
  h.unmount()
  flush()
  expect(h.counts().disposals).toBe(1)
})

test('activating the already-current route closes navigation and focuses its heading without replacing the page', async () => {
  const h = mount()
  await settle()
  fireEvent.click(h.getByRole('button', { name: 'Navigation', exact: true }))
  await settle()
  const home = h.menu().getByRole('link', { name: 'Home' })
  home.focus()
  fireEvent.click(home)
  await settle()
  expect(h.navigate.mock.calls).toEqual([['home']])
  expect(h.getByRole('heading', { name: 'Home' })).toBe(document.activeElement)
  expect(
    h.container
      .querySelector('.ui-dashboard')
      ?.hasAttribute('data-navigation-open'),
  ).toBe(false)
  expect(h.counts()).toEqual({ mounts: 1, disposals: 0 })
})

test('retains default-prevented application link activation', async () => {
  const h = mount()
  await settle()
  const event = new MouseEvent('click', { bubbles: true, cancelable: true })
  event.preventDefault()
  h.menu().getByRole('link', { name: 'Queue' }).dispatchEvent(event)
  await settle()
  expect(h.navigate).not.toHaveBeenCalled()
})

test('replacing a current page component releases its old owner without changing the route', async () => {
  const h = mount()
  await settle()
  h.setBindings({
    ...h.bindings(),
    views: { ...h.bindings().views, summary: () => <p>Replacement page</p> },
  })
  await settle()
  expect(h.getByText('Replacement page').isConnected).toBe(true)
  expect(h.counts()).toEqual({ mounts: 1, disposals: 1 })
  expect(h.getByRole('heading', { name: 'Home' })).not.toBe(
    document.activeElement,
  )
})

test('a null header omits default content without removing navigation or the page', async () => {
  const h = mount('home', 'none')
  await settle()
  expect(h.queryByRole('heading', { level: 1 })).toBeNull()
  expect(h.queryByRole('navigation', { name: 'Breadcrumbs' })).toBeNull()
  expect(h.queryByRole('button', { name: /^Audience/ })).toBeNull()
  expect(h.menu().getByRole('link', { name: 'Home' })).toBeTruthy()
  const draft = h.getByRole('textbox', { name: 'Page draft' })
  draft.focus()
  h.setHeader('default')
  await settle()
  expect(h.getByRole('heading', { name: 'Home' })).toBeTruthy()
  expect(h.getByRole('textbox', { name: 'Page draft' }) === draft).toBe(true)
  expect(document.activeElement === draft).toBe(true)
  expect(h.counts()).toEqual({ mounts: 1, disposals: 0 })
})

test('replacing the default header cancels queued heading focus and restores a fresh default later', async () => {
  const h = mount()
  await settle()
  const originalHeading = h.getByRole('heading', { name: 'Home' })
  const focus = vi.spyOn(originalHeading, 'focus')
  try {
    h.setRoute('queue')
    flush()
    h.setHeader('custom')
    flush()
    const draft = h.getByRole('textbox', { name: 'Header draft' })
    draft.focus()
    await settle()
    expect(originalHeading.isConnected).toBe(false)
    expect(focus).not.toHaveBeenCalled()
    expect(document.activeElement === draft).toBe(true)
    expect(h.queryByRole('navigation', { name: 'Breadcrumbs' })).toBeNull()
    h.setHeader('default')
    await settle()
    expect(h.queryByRole('textbox', { name: 'Header draft' })).toBeNull()
    const restoredHeading = h.getByRole('heading', { name: 'Queue' })
    expect(restoredHeading !== originalHeading).toBe(true)
    h.setRoute('home')
    await settle()
    expect(
      document.activeElement === h.getByRole('heading', { name: 'Home' }),
    ).toBe(true)
    expect(focus).not.toHaveBeenCalled()
  } finally {
    focus.mockRestore()
  }
})

test('custom header content owns one lifecycle across route reads and releases it on replacement', async () => {
  const h = mount('home', 'custom')
  await settle()
  const draft = h.getByRole('textbox', { name: 'Header draft' })
  expect(h.headerCounts()).toEqual({ mounts: 1, disposals: 0 })
  for (const route of ['queue', 'home']) {
    h.setRoute(route)
    await settle()
    expect(h.getByRole('textbox', { name: 'Header draft' }) === draft).toBe(
      true,
    )
    expect(h.headerCounts()).toEqual({ mounts: 1, disposals: 0 })
  }
  h.setHeader('none')
  await settle()
  expect(draft.isConnected).toBe(false)
  expect(h.headerCounts()).toEqual({ mounts: 1, disposals: 1 })
  h.setHeader('default')
  await settle()
  expect(h.getByRole('heading', { name: 'Home' })).toBeTruthy()
  expect(h.headerCounts()).toEqual({ mounts: 1, disposals: 1 })
  h.setHeader('custom')
  await settle()
  expect(h.getByRole('textbox', { name: 'Header draft' }) !== draft).toBe(true)
  expect(h.headerCounts()).toEqual({ mounts: 2, disposals: 1 })
  h.unmount()
  flush()
  expect(h.headerCounts()).toEqual({ mounts: 2, disposals: 2 })
})
