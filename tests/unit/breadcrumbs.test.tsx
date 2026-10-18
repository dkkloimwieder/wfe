import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { Breadcrumbs } from '@wfe/components/breadcrumbs'
afterEach(cleanup)
test('semantic navigation keeps native links and a noninteractive current page', () => {
  const clicks = vi.fn((event: MouseEvent) => event.preventDefault())
  const h = render(() => (
    <Breadcrumbs aria-label="Record path">
      <Breadcrumbs.List>
        <Breadcrumbs.Item>
          <Breadcrumbs.Link href="#records" onClick={clicks}>
            Records
          </Breadcrumbs.Link>
        </Breadcrumbs.Item>
        <Breadcrumbs.Item>
          <Breadcrumbs.Separator />
          <Breadcrumbs.Current>Sample record</Breadcrumbs.Current>
        </Breadcrumbs.Item>
      </Breadcrumbs.List>
    </Breadcrumbs>
  ))
  const nav = h.getByRole('navigation', { name: 'Record path' })
  const link = h.getByRole('link', { name: 'Records' })
  expect(link.getAttribute('href')).toBe('#records')
  expect(nav.querySelectorAll('ol > li')).toHaveLength(2)
  expect(nav.querySelector('[aria-current="page"]')?.tagName).toBe('SPAN')
  expect(
    nav.querySelector('.ui-breadcrumbs-separator')?.getAttribute('aria-hidden'),
  ).toBe('true')
  link.click()
  expect(clicks).toHaveBeenCalledTimes(1)
  h.unmount()
  link.click()
  expect(clicks).toHaveBeenCalledTimes(1)
})
test('reactive labels, values and classes preserve nodes and forwarded refs', () => {
  const [revision, setRevision] = createSignal(false)
  const ref = vi.fn()
  const h = render(() => (
    <Breadcrumbs
      aria-label={revision() ? 'Updated path' : 'Initial path'}
      class={['caller', { updated: revision() }]}
      separator=">"
    >
      <Breadcrumbs.List>
        <Breadcrumbs.Item>
          <Breadcrumbs.Link ref={ref} href={revision() ? '/next' : '/records'}>
            Records
          </Breadcrumbs.Link>
        </Breadcrumbs.Item>
        <Breadcrumbs.Item>
          <Breadcrumbs.Separator />
          <Breadcrumbs.Current>
            {revision() ? 'Updated record' : 'Initial record'}
          </Breadcrumbs.Current>
        </Breadcrumbs.Item>
      </Breadcrumbs.List>
    </Breadcrumbs>
  ))
  const link = h.getByRole('link', { name: 'Records' })
  const current = h.container.querySelector('[aria-current]')
  link.focus()
  setRevision(true)
  flush()
  expect(
    h
      .getByRole('navigation', { name: 'Updated path' })
      .classList.contains('updated'),
  ).toBe(true)
  expect(h.getByRole('link', { name: 'Records' })).toBe(link)
  expect(h.container.querySelector('[aria-current]')).toBe(current)
  expect(current?.textContent).toBe('Updated record')
  expect(document.activeElement).toBe(link)
  expect(link.getAttribute('href')).toBe('/next')
  expect(
    h.container.querySelector('.ui-breadcrumbs-separator')?.textContent,
  ).toBe('>')
  expect(ref).toHaveBeenCalledTimes(1)
})
