import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import {
  Calendar,
  RangeCalendar,
  DateRangePicker,
} from '@wfe/components/calendar'
import type { CalendarRange } from '@wfe/components/calendar'
import {
  calendarRangeValue,
  selectCalendarRange,
} from '../../packages/components/src/internal/calendarRange'
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
function day(h: ReturnType<typeof render>, value: string) {
  const target = h.container.ownerDocument.querySelector<HTMLButtonElement>(
    `button[data-date="${value}"]:not([data-outside])`,
  )
  if (!target) throw new Error(`Missing calendar day ${value}`)
  return target
}

test('single-date calendars retain their grid and selection behavior', async () => {
  const [value, setValue] = createSignal('2026-01-10')
  const h = render(() => (
    <Calendar
      value={value()}
      onValueChange={setValue}
      isDateDisabled={(date) => date === '2026-01-11'}
    />
  ))
  flush()
  const grid = h.getByRole('grid'),
    target = day(h, '2026-01-12')
  day(h, '2026-01-10').focus()
  fireEvent.keyDown(day(h, '2026-01-10'), { key: 'ArrowRight' })
  flush()
  await waitFor(() => expect(document.activeElement).toBe(target))
  fireEvent.click(target)
  flush()
  expect(value()).toBe('2026-01-12')
  expect(h.getByRole('grid')).toBe(grid)
  expect(day(h, '2026-01-12')).toBe(target)
  expect(target.parentElement?.getAttribute('aria-selected')).toBe('true')
})

test('two months share one tab stop and accept a partial then complete range', () => {
  const [value, setValue] = createSignal<CalendarRange>()
  const h = render(() => (
    <RangeCalendar
      label="Window"
      initialMonth="2026-01-01"
      value={value()}
      onValueChange={setValue}
    />
  ))
  flush()
  expect(h.getAllByRole('grid')).toHaveLength(2)
  const dates = [...h.container.querySelectorAll('[data-date]')].map((node) =>
    node.getAttribute('data-date'),
  )
  expect(new Set(dates).size).toBe(dates.length)
  expect(
    h.container.querySelectorAll('[data-date][tabindex="0"]'),
  ).toHaveLength(1)
  fireEvent.click(day(h, '2026-01-28'))
  flush()
  expect(value()).toEqual({ start: '2026-01-28' })
  fireEvent.click(day(h, '2026-02-04'))
  flush()
  expect(value()).toEqual({ start: '2026-01-28', end: '2026-02-04' })
  expect(h.container.querySelectorAll('[aria-selected="true"]')).toHaveLength(8)
  expect(h.container.querySelectorAll('[data-range-start]')).toHaveLength(1)
  expect(h.container.querySelectorAll('[data-range-end]')).toHaveLength(1)
  expect(h.getAllByRole('grid')[0]?.getAttribute('aria-label')).toBe(
    'Window January 2026',
  )
})

test('rejected range proposals preserve accepted cells and retained nodes', () => {
  const change = vi.fn()
  const h = render(() => (
    <RangeCalendar
      initialMonth="2026-01-01"
      value={{ start: '2026-01-10' }}
      onValueChange={change}
    />
  ))
  flush()
  const accepted = day(h, '2026-01-10'),
    candidate = day(h, '2026-01-08')
  candidate.focus()
  fireEvent.click(candidate)
  flush()
  expect(change.mock.calls.map((call) => call[0])).toEqual([
    { start: '2026-01-08', end: '2026-01-10' },
  ])
  expect(h.container.querySelectorAll('[aria-selected="true"]')).toHaveLength(1)
  expect(day(h, '2026-01-10')).toBe(accepted)
  expect(document.activeElement).toBe(candidate)
})

test('keyboard navigation crosses visible months before advancing the view', async () => {
  const h = render(() => (
    <RangeCalendar
      label="Window"
      initialMonth="2026-01-01"
      onValueChange={() => {}}
    />
  ))
  flush()
  const january = day(h, '2026-01-31')
  january.focus()
  fireEvent.keyDown(january, { key: 'ArrowRight' })
  flush()
  await waitFor(() => expect(document.activeElement).toBe(day(h, '2026-02-01')))
  expect(h.getAllByRole('grid')[0]?.getAttribute('aria-label')).toBe(
    'Window January 2026',
  )
  day(h, '2026-02-28').focus()
  fireEvent.keyDown(day(h, '2026-02-28'), { key: 'ArrowRight' })
  flush()
  await waitFor(() => expect(document.activeElement).toBe(day(h, '2026-03-01')))
  expect(h.getAllByRole('grid')[0]?.getAttribute('aria-label')).toBe(
    'Window February 2026',
  )
})

test('month buttons and chooser advance a multi-month view explicitly', () => {
  const h = render(() => (
    <RangeCalendar
      label="Window"
      initialMonth="2026-01-01"
      onValueChange={() => {}}
    />
  ))
  flush()
  fireEvent.click(h.getByRole('button', { name: 'Next month' }))
  flush()
  expect(h.getAllByRole('grid')[0]?.getAttribute('aria-label')).toBe(
    'Window February 2026',
  )
  fireEvent.click(h.getByRole('button', { name: 'Choose month and year' }))
  flush()
  fireEvent.click(h.getByRole('button', { name: 'June' }))
  flush()
  expect(h.getAllByRole('grid')[0]?.getAttribute('aria-label')).toBe(
    'Window June 2026',
  )
})

test('bounds, disabled dates and readonly state block date requests', () => {
  const [readonly, setReadonly] = createSignal(false)
  const change = vi.fn()
  const h = render(() => (
    <RangeCalendar
      initialMonth="2026-01-01"
      min="2026-01-05"
      max="2026-02-20"
      readonly={readonly()}
      isDateDisabled={(value) => value === '2026-01-10'}
      onValueChange={change}
    />
  ))
  flush()
  fireEvent.click(day(h, '2026-01-04'))
  fireEvent.click(day(h, '2026-01-10'))
  fireEvent.click(day(h, '2026-02-21'))
  flush()
  expect(change).not.toHaveBeenCalled()
  setReadonly(true)
  flush()
  fireEvent.click(day(h, '2026-01-12'))
  flush()
  expect(change).not.toHaveBeenCalled()
  expect(h.getAllByRole('grid')[0]?.getAttribute('aria-readonly')).toBe('true')
})

test('the last supported year renders bounded months and disables forward navigation', () => {
  const h = render(() => (
    <RangeCalendar
      initialMonth="9999-12-01"
      numberOfMonths={3}
      onValueChange={() => {}}
    />
  ))
  flush()
  expect(h.getAllByRole('grid')).toHaveLength(1)
  expect(
    (
      h.getByRole('button', {
        name: 'Next month',
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true)
  expect(
    [...h.container.querySelectorAll('[data-date]')].every((node) =>
      node.getAttribute('data-date')!.startsWith('9999-12'),
    ),
  ).toBe(true)
})

test('disposal cancels queued calendar focus even when a retained host reconnects', async () => {
  const h = render(() => (
    <Calendar initialMonth="2026-01-01" onValueChange={() => {}} />
  ))
  flush()
  const host = h.container.querySelector('.ui-calendar')!
  fireEvent.keyDown(day(h, '2026-01-10'), { key: 'ArrowRight' })
  flush()
  h.unmount()
  const replacement = document.createElement('button')
  replacement.dataset.date = '2026-01-11'
  const focus = vi.spyOn(replacement, 'focus')
  host.replaceChildren(replacement)
  document.body.append(host)
  await new Promise<void>((resolve) => queueMicrotask(resolve))
  expect(focus).not.toHaveBeenCalled()
  host.remove()
})

test('range pickers close only after an accepted complete selection and submit endpoints', async () => {
  const [value, setValue] = createSignal<CalendarRange>()
  const h = render(() => (
    <form>
      <DateRangePicker
        label="Booking"
        name="booking"
        initialMonth="2026-01-01"
        numberOfMonths={1}
        value={value()}
        onValueChange={setValue}
      />
    </form>
  ))
  flush()
  const trigger = h.getByRole('button', { name: /^Booking/ })
  fireEvent.click(trigger)
  flush()
  await waitFor(() => expect(h.getByRole('grid')).toBeTruthy())
  day(h, '2026-01-05').focus()
  fireEvent.click(day(h, '2026-01-05'))
  flush()
  expect(value()).toEqual({ start: '2026-01-05' })
  expect(h.queryByRole('grid')).not.toBeNull()
  day(h, '2026-01-10').focus()
  fireEvent.click(day(h, '2026-01-10'))
  flush()
  await waitFor(() => expect(h.queryByRole('grid')).toBeNull())
  expect(value()).toEqual({ start: '2026-01-05', end: '2026-01-10' })
  expect(
    new FormData(h.container.querySelector('form')!).getAll('booking'),
  ).toEqual(['2026-01-05', '2026-01-10'])
  expect(document.activeElement).toBe(trigger)
})

test('rejected picker ranges remain open and retain accepted endpoints', async () => {
  const change = vi.fn()
  const h = render(() => (
    <DateRangePicker
      label="Rejected"
      initialMonth="2026-01-01"
      numberOfMonths={1}
      value={{ start: '2026-01-05' }}
      onValueChange={change}
    />
  ))
  flush()
  fireEvent.click(h.getByRole('button', { name: /^Rejected/ }))
  flush()
  await waitFor(() => expect(h.getByRole('grid')).toBeTruthy())
  fireEvent.click(day(h, '2026-01-10'))
  flush()
  expect(change.mock.calls[0]![0]).toEqual({
    start: '2026-01-05',
    end: '2026-01-10',
  })
  expect(h.queryByRole('grid')).not.toBeNull()
  expect(
    day(h, '2026-01-05').parentElement?.getAttribute('aria-selected'),
  ).toBe('true')
})

test('range values reject invalid dates and order without application mutation', () => {
  expect(() => calendarRangeValue({ start: '2026-02-30' })).toThrow(RangeError)
  expect(() =>
    calendarRangeValue({ start: '2026-02-10', end: '2026-01-10' }),
  ).toThrow(RangeError)
  const current = { start: '2026-01-10', end: '2026-01-12' }
  expect(selectCalendarRange(current, '2026-02-01')).toEqual({
    start: '2026-02-01',
  })
  expect(current).toEqual({ start: '2026-01-10', end: '2026-01-12' })
})

test('later accepted endpoints close the picker without a second change request', async () => {
  const [value, setValue] = createSignal<CalendarRange>({ start: '2026-01-05' })
  const change = vi.fn()
  const h = render(() => (
    <DateRangePicker
      label="Delayed"
      initialMonth="2026-01-01"
      numberOfMonths={1}
      value={value()}
      onValueChange={change}
    />
  ))
  flush()
  const trigger = h.getByRole('button', { name: /^Delayed/ })
  fireEvent.click(trigger)
  flush()
  await waitFor(() => expect(h.getByRole('grid')).toBeTruthy())
  day(h, '2026-01-10').focus()
  fireEvent.click(day(h, '2026-01-10'))
  flush()
  expect(h.queryByRole('grid')).not.toBeNull()
  await Promise.resolve()
  setValue({ start: '2026-01-05', end: '2026-01-10' })
  flush()
  await waitFor(() => expect(h.queryByRole('grid')).toBeNull())
  expect(change).toHaveBeenCalledOnce()
  expect(document.activeElement).toBe(trigger)
})

test('accepted picker changes preserve an explicit caller focus choice', async () => {
  const [value, setValue] = createSignal<CalendarRange>({ start: '2026-01-05' })
  let next: HTMLInputElement | undefined
  const h = render(() => (
    <>
      <DateRangePicker
        label="Caller focus"
        initialMonth="2026-01-01"
        numberOfMonths={1}
        value={value()}
        onValueChange={(range) => {
          if (range) setValue(range)
          if (range?.end) next?.focus()
        }}
      />
      <input
        aria-label="Next field"
        ref={(node) => {
          next = node
        }}
      />
    </>
  ))
  flush()
  fireEvent.click(h.getByRole('button', { name: /^Caller focus/ }))
  flush()
  await waitFor(() => expect(h.getByRole('grid')).toBeTruthy())
  day(h, '2026-01-10').focus()
  fireEvent.click(day(h, '2026-01-10'))
  flush()
  await waitFor(() => expect(h.queryByRole('grid')).toBeNull())
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    ),
  )
  expect(document.activeElement).toBe(next)
})

test('readonly changes close the picker and disposed day nodes release their handlers', async () => {
  const [locked, setLocked] = createSignal(false)
  const change = vi.fn()
  const h = render(() => (
    <DateRangePicker
      label="Lifecycle"
      initialMonth="2026-01-01"
      numberOfMonths={1}
      readonly={locked()}
      onValueChange={change}
    />
  ))
  flush()
  fireEvent.click(h.getByRole('button', { name: /^Lifecycle/ }))
  flush()
  await waitFor(() => expect(h.getByRole('grid')).toBeTruthy())
  const retained = day(h, '2026-01-10')
  setLocked(true)
  flush()
  await waitFor(() => expect(h.queryByRole('grid')).toBeNull())
  setLocked(false)
  flush()
  document.body.append(retained)
  fireEvent.click(retained)
  flush()
  expect(change).not.toHaveBeenCalled()
  retained.remove()
})

test('an accepted outside-month endpoint restores focus to its new calendar cell', async () => {
  const [value, setValue] = createSignal<CalendarRange>()
  const h = render(() => (
    <RangeCalendar
      initialMonth="2026-01-01"
      numberOfMonths={1}
      value={value()}
      onValueChange={setValue}
    />
  ))
  flush()
  const outside = h.container.querySelector<HTMLButtonElement>(
    '[data-date="2026-02-03"][data-outside]',
  )!
  outside.focus()
  fireEvent.click(outside)
  flush()
  await waitFor(() => expect(document.activeElement).toBe(day(h, '2026-02-03')))
  expect(value()).toEqual({ start: '2026-02-03' })
})
