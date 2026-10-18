import { afterEach, expect, test } from 'vitest'
import { cleanup, render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { ValueDisplay } from '@wfe/components'
afterEach(cleanup)
test('shared date display follows format, locale and timezone updates without replacing the host', () => {
  const [zone, setZone] = createSignal('UTC')
  const [format, setFormat] = createSignal('yyyy-MM-dd')
  const [locale, setLocale] = createSignal('en-US')
  const [value, setValue] = createSignal('2024-02-29T02:15Z')
  const view = render(() => (
    <span data-host>
      <ValueDisplay
        value={value()}
        format="datetime"
        dateFormat={format()}
        timeZone={zone()}
        locale={locale()}
      />
    </span>
  ))
  const host = view.container.querySelector('[data-host]')!
  expect(host.textContent).toBe('2024-02-29 02:15')
  setZone('America/New_York')
  setFormat('locale')
  setLocale('en-GB')
  flush()
  expect(host.textContent).toBe('28/02/2024 21:15')
  expect(view.container.querySelector('[data-host]')).toBe(host)
  setValue('bad timestamp')
  flush()
  expect(host.textContent).toBe('bad timestamp')
  view.unmount()
  setZone('UTC')
  setValue('2024-02-29T03:15Z')
  flush()
  expect(host.textContent).toBe('bad timestamp')
})
