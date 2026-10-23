import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render } from '@solidjs/testing-library'
import { createSignal, flush, onCleanup } from 'solid-js'
import { DropdownMenu, Popover, Theme, Tooltip } from '@wfe/components'

afterEach(cleanup)

for (const family of ['popover', 'tooltip', 'menu'] as const) {
  for (const explicit of [false, true]) {
    test(`${family} owns one popup frame with ${explicit ? 'explicit' : 'theme'} mounting and live appearance`, () => {
      const external = document.createElement('div')
      document.body.append(external)
      const [mode, setMode] = createSignal<'light' | 'dark'>('light')
      const changed = vi.fn()
      let mounts = 0
      let cleanups = 0
      let ref: HTMLDivElement | undefined
      function Draft() {
        mounts++
        onCleanup(() => {
          cleanups++
        })
        return <input aria-label="Popup draft" />
      }
      const h = render(() => (
        <Theme mode={mode()}>
          {family === 'popover' ? (
            <Popover open onOpenChange={changed}>
              <Popover.Trigger>Open</Popover.Trigger>
              <Popover.Portal mount={explicit ? external : undefined}>
                <Popover.Content
                  data-testid="content"
                  ref={(node) => (ref = node)}
                >
                  <Draft />
                </Popover.Content>
              </Popover.Portal>
            </Popover>
          ) : family === 'tooltip' ? (
            <Tooltip open onOpenChange={changed}>
              <Tooltip.Trigger>Open</Tooltip.Trigger>
              <Tooltip.Portal mount={explicit ? external : undefined}>
                <Tooltip.Content
                  data-testid="content"
                  ref={(node) => (ref = node)}
                >
                  <Draft />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip>
          ) : (
            <DropdownMenu open onOpenChange={changed}>
              <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
              <DropdownMenu.Portal mount={explicit ? external : undefined}>
                <DropdownMenu.Content
                  data-testid="content"
                  ref={(node) => (ref = node)}
                >
                  <Draft />
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu>
          )}
        </Theme>
      ))
      try {
        flush()
        const content = document.querySelector<HTMLElement>(
          '[data-testid="content"]',
        )!
        expect(content).toBe(ref)
        const frame = content.closest('.ui-popup-portal')!
        expect(frame).not.toBeNull()
        expect(document.querySelectorAll('.ui-popup-portal')).toHaveLength(1)
        const host = explicit
          ? external
          : h.container.querySelector('[data-ui-theme-owner]')!
        expect(host.contains(frame)).toBe(true)
        const input = content.querySelector('input')!
        input.value = 'Retained draft'
        setMode('dark')
        flush()
        expect(document.querySelector('[data-testid="content"]')).toBe(content)
        expect(content.querySelector('input')).toBe(input)
        expect(input.value).toBe('Retained draft')
        expect(mounts).toBe(1)
        expect(changed).not.toHaveBeenCalled()
        h.unmount()
        expect(document.querySelector('.ui-popup-portal')).toBeNull()
        expect(cleanups).toBe(1)
      } finally {
        h.unmount()
        external.remove()
      }
    })
  }
}
