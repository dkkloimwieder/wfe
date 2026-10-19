import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { ButtonLink } from '@wfe/components'

afterEach(cleanup)

test('button links retain native attributes, reactive presentation, refs, and listener ownership', () => {
  const [href, setHref] = createSignal('#first')
  const [filled, setFilled] = createSignal(false)
  const clicked = vi.fn((event: MouseEvent) => event.preventDefault())
  let anchor: HTMLAnchorElement | undefined
  const view = render(() => (
    <ButtonLink
      href={href()}
      variant={filled() ? 'filled' : 'outline'}
      tone="accent"
      class={['caller', { selected: filled() }]}
      ref={(node) => (anchor = node)}
      target="_blank"
      rel="noopener"
      download="example.txt"
      onClick={clicked}
    >
      Destination
    </ButtonLink>
  ))
  flush()
  const link = view.getByRole('link')
  expect(link).toBe(anchor)
  expect(link.tagName).toBe('A')
  expect(link.getAttribute('target')).toBe('_blank')
  expect(link.getAttribute('download')).toBe('example.txt')
  expect(link.hasAttribute('type')).toBe(false)
  expect(link.hasAttribute('variant')).toBe(false)
  setHref('#second')
  setFilled(true)
  flush()
  expect(view.getByRole('link')).toBe(link)
  expect(link.getAttribute('href')).toBe('#second')
  expect(link.getAttribute('data-variant')).toBe('filled')
  expect(link.classList.contains('ui-button')).toBe(true)
  expect(link.classList.contains('caller')).toBe(true)
  expect(link.classList.contains('selected')).toBe(true)
  const event = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    ctrlKey: true,
  })
  link.dispatchEvent(event)
  expect(clicked).toHaveBeenCalledWith(event)
  expect(event.defaultPrevented).toBe(true)
  view.unmount()
  link.dispatchEvent(new MouseEvent('click'))
  expect(clicked).toHaveBeenCalledTimes(1)
})
