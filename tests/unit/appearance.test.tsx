import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render } from '@solidjs/testing-library'
import { Button } from '@wfe/components'
import { DefaultAppearance } from '../../examples/shared/appearance/DefaultAppearance'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

test('action decorations release their pointer listener and observer with the appearance owner', async () => {
  const warnings = vi.spyOn(console, 'warn')
  const view = render(() => (
    <DefaultAppearance>
      <Button>Action</Button>
    </DefaultAppearance>
  ))
  const root = view.container.querySelector('.default-appearance')!
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
