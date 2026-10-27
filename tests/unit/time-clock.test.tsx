import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, within } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import {
  TimeClock,
  type ClockValue,
} from '../../packages/components/src/components/TimeClock'
import { TimeSelection } from '../../packages/components/src/components/TimeSelection'

afterEach(cleanup)

test('clock keyboard changes exact units, wraps hours and keeps seconds and period', () => {
  const [value, setValue] = createSignal<ClockValue>({
    hour: 23,
    minute: 58,
    second: 17,
  })
  const h = render(() => (
    <TimeClock
      value={value()}
      onValueChange={setValue}
      timeFormat="hh:mm:ss a"
    />
  ))
  const slider = h.getByRole('slider', { name: 'Hour' })
  expect(h.getByRole<HTMLInputElement>('textbox', { name: 'Hour' }).value).toBe(
    '11',
  )
  expect(h.getByRole('button', { name: 'PM', pressed: true })).toBeTruthy()
  slider.focus()
  fireEvent.keyDown(slider, { key: 'End' })
  flush()
  expect(value()).toEqual({ hour: 12, minute: 58, second: 17 })
  fireEvent.keyDown(slider, { key: 'ArrowUp' })
  flush()
  expect(value().hour).toBe(13)
  fireEvent.keyDown(slider, { key: 'Enter' })
  flush()
  expect(h.getByRole('slider', { name: 'Minute' })).toBe(slider)
  expect(
    h.getByRole<HTMLInputElement>('textbox', { name: 'Minute' }).value,
  ).toBe('58')
  fireEvent.keyDown(slider, { key: 'ArrowUp' })
  flush()
  expect(value().minute).toBe(59)
  fireEvent.keyDown(slider, { key: 'ArrowUp' })
  flush()
  expect(value().minute).toBe(0)
  fireEvent.input(h.getByRole('textbox', { name: 'Minute' }), {
    target: { value: '37' },
  })
  flush()
  expect(value().minute).toBe(37)
  fireEvent.click(h.getByRole('button', { name: 'AM' }))
  flush()
  expect(value()).toEqual({ hour: 1, minute: 37, second: 17 })
  expect(document.activeElement).toBe(slider)
})

test('clock pointer distinguishes inner 24-hour ring and advances into precise minutes', () => {
  const [value, setValue] = createSignal<ClockValue>({
    hour: 0,
    minute: 0,
    second: 42,
  })
  const h = render(() => <TimeClock value={value()} onValueChange={setValue} />)
  const slider = h.getByRole('slider', { name: 'Hour' })
  vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    width: 200,
    height: 200,
    right: 200,
    bottom: 200,
    toJSON() {},
  })
  const pointer = (name: string, x: number, y: number) => {
    const event = new MouseEvent(name, {
      bubbles: true,
      cancelable: true,
      button: 0,
      clientX: x,
      clientY: y,
    })
    Object.defineProperty(event, 'pointerId', { value: 1 })
    slider.dispatchEvent(event)
    flush()
  }
  pointer('pointerdown', 150, 100)
  expect(value().hour).toBe(15)
  pointer('pointerup', 150, 100)
  expect(h.getByRole('slider', { name: 'Minute' })).toBe(slider)
  // 17 minutes clockwise from twelve, not rounded to a five-minute tick.
  const angle = (17 / 60) * 2 * Math.PI
  pointer('pointerdown', 100 + Math.sin(angle) * 82, 100 - Math.cos(angle) * 82)
  pointer('pointerup', 100 + Math.sin(angle) * 82, 100 - Math.cos(angle) * 82)
  expect(value()).toEqual({ hour: 15, minute: 17, second: 42 })
})

test('clock rejection and readonly state never claim an unaccepted value', () => {
  const [readonly, setReadonly] = createSignal(false)
  const changed = vi.fn()
  const h = render(() => (
    <TimeClock
      value={{ hour: 9, minute: 15, second: 0 }}
      onValueChange={changed}
      readonly={readonly()}
    />
  ))
  const slider = h.getByRole('slider', { name: 'Hour' })
  fireEvent.keyDown(slider, { key: 'ArrowRight' })
  flush()
  expect(changed).toHaveBeenLastCalledWith({ hour: 10, minute: 15, second: 0 })
  expect(slider.getAttribute('aria-valuenow')).toBe('9')
  setReadonly(true)
  flush()
  expect(slider.getAttribute('aria-readonly')).toBe('true')
  fireEvent.keyDown(slider, { key: 'End' })
  fireEvent.input(h.getByRole('textbox', { name: 'Hour' }), {
    target: { value: '12' },
  })
  flush()
  expect(changed).toHaveBeenCalledTimes(1)
})

test('time columns provide roving keyboard selection and exact minute values without committing another unit', () => {
  const [value, setValue] = createSignal<ClockValue>({
    hour: 13,
    minute: 15,
    second: 24,
  })
  const h = render(() => (
    <TimeSelection
      value={value()}
      onValueChange={setValue}
      timeFormat="hh:mm:ss a"
    />
  ))
  const minute = h.getByRole('listbox', { name: 'Minute' })
  const selected = within(minute).getByRole('option', {
    name: '15',
    selected: true,
  })
  expect(
    within(minute).getAllByRole('option', { selected: false }),
  ).toHaveLength(59)
  selected.focus()
  fireEvent.keyDown(selected, { key: 'ArrowDown' })
  flush()
  expect(value()).toEqual({ hour: 13, minute: 16, second: 24 })
  expect(
    within(minute).getByRole('option', { selected: true }).textContent,
  ).toBe('16')
  expect(selected.getAttribute('aria-selected')).toBe('false')
  expect(document.activeElement).toBe(
    within(minute).getByRole('option', { name: '16' }),
  )
  expect(
    within(minute)
      .getAllByRole('option')
      .filter((node) => node.getAttribute('tabindex') === '0'),
  ).toHaveLength(1)
  fireEvent.keyDown(document.activeElement!, { key: 'End' })
  flush()
  expect(value().minute).toBe(59)
  fireEvent.click(
    within(h.getByRole('listbox', { name: 'AM/PM' })).getByRole('option', {
      name: 'AM',
    }),
  )
  flush()
  expect(value()).toEqual({ hour: 1, minute: 59, second: 24 })
})

test('top clock fields edit each unit and retain partial drafts until blur or Escape', () => {
  const [value, setValue] = createSignal<ClockValue>({
    hour: 9,
    minute: 15,
    second: 24,
  })
  const changed = vi.fn((next: ClockValue) => setValue(next))
  const h = render(() => (
    <TimeClock value={value()} onValueChange={changed} timeFormat="HH:mm:ss" />
  ))
  const hour = h.getByRole<HTMLInputElement>('textbox', { name: 'Hour' })
  const minute = h.getByRole<HTMLInputElement>('textbox', { name: 'Minute' })
  const second = h.getByRole<HTMLInputElement>('textbox', { name: 'Second' })
  hour.focus()
  fireEvent.input(hour, { target: { value: '' } })
  flush()
  expect(hour.value).toBe('')
  expect(changed).not.toHaveBeenCalled()
  // An unrelated accepted unit update must not replace the partial hour draft.
  setValue({ hour: 9, minute: 16, second: 24 })
  flush()
  expect(hour.value).toBe('')
  expect(minute.value).toBe('16')
  fireEvent.input(hour, { target: { value: '1' } })
  flush()
  expect(hour.value).toBe('1')
  expect(value().hour).toBe(1)
  fireEvent.input(hour, { target: { value: '12' } })
  flush()
  expect(value().hour).toBe(12)
  minute.focus()
  flush()
  expect(h.getByRole('slider', { name: 'Minute' })).toBeTruthy()
  fireEvent.input(minute, { target: { value: '37' } })
  flush()
  expect(value().minute).toBe(37)
  second.focus()
  flush()
  expect(h.getByRole('slider', { name: 'Second' })).toBeTruthy()
  fireEvent.input(second, { target: { value: '58' } })
  flush()
  expect(value()).toEqual({ hour: 12, minute: 37, second: 58 })
  minute.focus()
  const count = changed.mock.calls.length
  fireEvent.input(minute, { target: { value: '99' } })
  flush()
  expect(minute.value).toBe('99')
  expect(changed).toHaveBeenCalledTimes(count)
  fireEvent.keyDown(minute, { key: 'Escape' })
  flush()
  expect(minute.value).toBe('37')
  fireEvent.input(minute, { target: { value: 'bad' } })
  flush()
  hour.focus()
  flush()
  expect(minute.value).toBe('37')
  expect(changed).toHaveBeenCalledTimes(count)
})

test('rejected top-field requests reset on blur and disabled or readonly fields cannot change values', () => {
  const [disabled, setDisabled] = createSignal(false)
  const [readonly, setReadonly] = createSignal(false)
  const changed = vi.fn()
  const h = render(() => (
    <TimeClock
      value={{ hour: 9, minute: 15, second: 24 }}
      onValueChange={changed}
      disabled={disabled()}
      readonly={readonly()}
    />
  ))
  const hour = h.getByRole<HTMLInputElement>('textbox', { name: 'Hour' })
  const minute = h.getByRole<HTMLInputElement>('textbox', { name: 'Minute' })
  hour.focus()
  fireEvent.input(hour, { target: { value: '17' } })
  flush()
  expect(hour.value).toBe('17')
  expect(changed).toHaveBeenLastCalledWith({ hour: 17, minute: 15, second: 24 })
  minute.focus()
  flush()
  expect(hour.value).toBe('09')
  setReadonly(true)
  flush()
  expect(hour.readOnly).toBe(true)
  fireEvent.input(hour, { target: { value: '18' } })
  flush()
  expect(changed).toHaveBeenCalledTimes(1)
  setDisabled(true)
  flush()
  expect(hour.disabled).toBe(true)
  fireEvent.input(hour, { target: { value: '19' } })
  flush()
  expect(changed).toHaveBeenCalledTimes(1)
})
