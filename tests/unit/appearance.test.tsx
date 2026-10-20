import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render } from '@solidjs/testing-library'
import { Button, Theme, themeStyle } from '@wfe/components'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

test('action decorations release their pointer listener and observer with the appearance owner', async () => {
  const warnings = vi.spyOn(console, 'warn')
  const view = render(() => (
    <Theme>
      <Button>Action</Button>
    </Theme>
  ))
  const root = view.container.querySelector('.ui-theme')!
  const button = view.getByRole('button', { name: 'Action' })
  await new Promise<void>((resolve) => queueMicrotask(resolve))
  expect(button.style.getPropertyValue('--ui-action-angle')).not.toBe('')
  const random = vi.spyOn(Math, 'random').mockReturnValue(0.8)
  button.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }))
  expect(random).toHaveBeenCalled()
  view.unmount()
  random.mockClear()
  button.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }))
  const added = document.createElement('button')
  added.className = 'ui-button'
  root.append(added)
  added.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }))
  await new Promise<void>((resolve) => queueMicrotask(resolve))
  expect(random).not.toHaveBeenCalled()
  expect(added.style.getPropertyValue('--ui-action-angle')).toBe('')
  expect(warnings).not.toHaveBeenCalled()
})

test('nested themes own decoration events exactly once', async () => {
  const view = render(() => (
    <Theme>
      <Theme mode="dark">
        <Button>Nested action</Button>
      </Theme>
    </Theme>
  ))
  await new Promise<void>((resolve) => queueMicrotask(resolve))
  const random = vi.spyOn(Math, 'random').mockReturnValue(0.8)
  view
    .getByRole('button', { name: 'Nested action' })
    .dispatchEvent(new MouseEvent('pointerover', { bubbles: true }))
  expect(random).toHaveBeenCalledTimes(3)
})

test('undefined partial theme values retain the defaults', () => {
  expect(
    themeStyle({
      layers: { canvas: undefined },
      dividers: { rows: undefined },
      decorations: { dots: undefined },
    }),
  ).toEqual(themeStyle())
})

test('CSS-only scopes retain the enclosing theme decoration owner', async () => {
  const view = render(() => (
    <Theme>
      <div class="ui-theme">
        <Button>CSS scope action</Button>
      </div>
    </Theme>
  ))
  const button = view.getByRole('button', { name: 'CSS scope action' })
  await new Promise<void>((resolve) => queueMicrotask(resolve))
  expect(button.style.getPropertyValue('--ui-action-angle')).not.toBe('')
  const random = vi.spyOn(Math, 'random').mockReturnValue(0.8)
  button.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }))
  expect(random).toHaveBeenCalledTimes(3)
})
