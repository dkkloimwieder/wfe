import { afterEach, expect, test } from 'vitest'
import { cleanup, render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import {
  FieldValue,
  StatusTile,
  ValueDisplay,
  formatDisplayValue,
  isValueFormat,
} from '@wfe/components'
afterEach(cleanup)
test('currency follows locale and code through the shared formatter', () => {
  const [locale, setLocale] = createSignal('en-US')
  const [currency, setCurrency] = createSignal('USD')
  const h = render(() => (
    <ValueDisplay
      value={1249.5}
      format="currency"
      currency={currency()}
      locale={locale()}
    />
  ))
  expect(isValueFormat('currency')).toBe(true)
  expect(h.container.textContent).toBe('$1,249.50')
  setCurrency('EUR')
  setLocale('de-DE')
  flush()
  expect(h.container.textContent).toBe('1.249,50\u00a0€')
  expect(formatDisplayValue(-420, 'currency', { currency: 'JPY' })).toBe(
    '-¥420',
  )
  expect(formatDisplayValue(1249.5, 'currency')).toBe('1249.5')
  expect(formatDisplayValue(null, 'currency', { currency: 'USD' })).toBe('')
  expect(formatDisplayValue('pending', 'currency', { currency: 'USD' })).toBe(
    'pending',
  )
})

test('formatted fields and status tiles pass currency to their display value', () => {
  const h = render(() => (
    <>
      <FieldValue value={15} format="currency" currency="USD" />
      <StatusTile
        label="Monthly cost"
        state="ok"
        value={50}
        format="currency"
        currency="EUR"
      />
    </>
  ))
  expect(h.getByText('$15.00')).toBeTruthy()
  expect(h.getByText('€50.00')).toBeTruthy()
  expect(h.container.querySelector('[currency]')).toBeNull()
})

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
