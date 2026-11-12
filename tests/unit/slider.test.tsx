import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { Slider, RangeSlider } from '@wfe/components/slider'
import { Field, Label, HelpText } from '@wfe/components/fields'
import { sliderScale } from '../../packages/components/src/internal/slider'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function key(node: Element, value: string) {
  fireEvent.keyDown(node, { key: value })
  flush()
  fireEvent.keyUp(node, { key: value })
  flush()
}
function pointer(
  node: Element,
  type: string,
  x: number,
  extra: Record<string, unknown> = {},
) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.assign(event, {
    pointerId: 7,
    pointerType: 'mouse',
    isPrimary: true,
    button: 0,
    clientX: x,
    clientY: 16,
    ...extra,
  })
  node.dispatchEvent(event)
  flush()
}
function measured(h: ReturnType<typeof render>) {
  const track = h.container.querySelector('.ui-slider-track')!
  const read = vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    width: 100,
    height: 32,
    right: 100,
    bottom: 32,
  } as DOMRect)
  return { track, read }
}

test('keyboard changes accepted values and commits once on release with form values', () => {
  const [value, setValue] = createSignal(20)
  const commit = vi.fn()
  const h = render(() => (
    <form>
      <Slider
        aria-label="Volume"
        value={value()}
        step={2}
        name="volume"
        onValueChange={setValue}
        onValueCommit={commit}
      />
    </form>
  ))
  flush()
  const thumb = h.getByRole('slider', { name: 'Volume' })
  thumb.focus()
  fireEvent.keyDown(thumb, { key: 'ArrowRight' })
  flush()
  fireEvent.keyDown(thumb, { key: 'ArrowRight', repeat: true })
  flush()
  expect(value()).toBe(24)
  expect(commit).not.toHaveBeenCalled()
  fireEvent.keyUp(thumb, { key: 'ArrowRight' })
  flush()
  expect(commit).toHaveBeenCalledOnce()
  expect(commit.mock.calls[0]![0]).toBe(24)
  expect(new FormData(h.container.querySelector('form')!).get('volume')).toBe(
    '24',
  )
  expect(document.activeElement).toBe(thumb)
  key(thumb, 'Home')
  expect(value()).toBe(0)
  key(thumb, 'End')
  expect(value()).toBe(100)
  key(thumb, 'PageDown')
  expect(value()).toBe(80)
})

test('rejected changes preserve canonical values, focus and nodes without committing', () => {
  const change = vi.fn(),
    commit = vi.fn()
  const h = render(() => (
    <Slider
      aria-label="Rejected"
      value={30}
      onValueChange={change}
      onValueCommit={commit}
    />
  ))
  flush()
  const thumb = h.getByRole('slider')
  thumb.focus()
  key(thumb, 'End')
  expect(change.mock.calls[0]![0]).toBe(100)
  expect(thumb.getAttribute('aria-valuenow')).toBe('30')
  expect(h.getByRole('slider')).toBe(thumb)
  expect(document.activeElement).toBe(thumb)
  expect(commit).not.toHaveBeenCalled()
})

test('range thumbs retain order, dependent limits and both submitted values', () => {
  const [value, setValue] = createSignal<[number, number]>([20, 80])
  const h = render(() => (
    <form>
      <RangeSlider
        aria-label="Price"
        thumbLabels={['Minimum', 'Maximum']}
        value={value()}
        name="price"
        onValueChange={setValue}
      />
    </form>
  ))
  flush()
  const lower = h.getByRole('slider', { name: 'Price Minimum' })
  const upper = h.getByRole('slider', { name: 'Price Maximum' })
  key(lower, 'End')
  expect(value()).toEqual([80, 80])
  expect(lower.getAttribute('aria-valuemax')).toBe('80')
  expect(upper.getAttribute('aria-valuemin')).toBe('80')
  key(upper, 'Home')
  expect(value()).toEqual([80, 80])
  expect(h.getAllByRole('slider')).toEqual([lower, upper])
  expect(
    new FormData(h.container.querySelector('form')!).getAll('price'),
  ).toEqual(['80', '80'])
})

test('field labels, descriptions, readonly and disabled state apply to the actual thumbs', () => {
  const [disabled, setDisabled] = createSignal(false)
  const change = vi.fn()
  const h = render(() => (
    <form>
      <Field readonly invalid disabled={disabled()}>
        <Label>Gain</Label>
        <HelpText>Accepted gain</HelpText>
        <Slider value={40} name="gain" onValueChange={change} />
      </Field>
    </form>
  ))
  flush()
  const thumb = h.getByRole('slider', { name: 'Gain' })
  expect(thumb.getAttribute('aria-readonly')).toBe('true')
  expect(thumb.getAttribute('aria-invalid')).toBe('true')
  expect(
    document.getElementById(thumb.getAttribute('aria-describedby')!)
      ?.textContent,
  ).toBe('Accepted gain')
  key(thumb, 'End')
  expect(change).not.toHaveBeenCalled()
  setDisabled(true)
  flush()
  expect(thumb.getAttribute('tabindex')).toBe('-1')
  expect(thumb.getAttribute('aria-disabled')).toBe('true')
  expect(new FormData(h.container.querySelector('form')!).has('gain')).toBe(
    false,
  )
})

test('pointer dragging measures once, accepts steps and commits on release', () => {
  const [value, setValue] = createSignal(20)
  const commit = vi.fn()
  const h = render(() => (
    <Slider
      aria-label="Drag"
      value={value()}
      onValueChange={setValue}
      onValueCommit={commit}
    />
  ))
  flush()
  const { track, read } = measured(h)
  pointer(track, 'pointerdown', 30)
  pointer(track, 'pointermove', 51)
  pointer(track, 'pointermove', 60)
  expect(value()).toBe(60)
  expect(commit).not.toHaveBeenCalled()
  pointer(track, 'pointerup', 60)
  expect(commit.mock.calls.map((call) => call[0])).toEqual([60])
  expect(read).toHaveBeenCalledOnce()
  expect(document.activeElement).toBe(h.getByRole('slider'))
})

test('grabbing a thumb preserves its pointer offset and Escape requests restoration', () => {
  const [value, setValue] = createSignal(40)
  const commit = vi.fn()
  const h = render(() => (
    <Slider
      aria-label="Grab"
      value={value()}
      onValueChange={setValue}
      onValueCommit={commit}
    />
  ))
  flush()
  measured(h)
  const thumb = h.getByRole('slider')
  pointer(thumb, 'pointerdown', 42)
  expect(value()).toBe(40)
  pointer(thumb, 'pointermove', 62)
  expect(value()).toBe(60)
  key(thumb, 'Escape')
  expect(value()).toBe(40)
  expect(commit).not.toHaveBeenCalled()
})

test('unmount releases pointer capture and retained handlers cannot request more changes', () => {
  const change = vi.fn()
  const h = render(() => (
    <Slider value={40} aria-label="Dispose" onValueChange={change} />
  ))
  flush()
  const { track } = measured(h)
  const host = h.getByRole('group') as HTMLDivElement
  host.setPointerCapture = vi.fn()
  host.hasPointerCapture = vi.fn(() => true)
  host.releasePointerCapture = vi.fn()
  pointer(track, 'pointerdown', 50)
  h.unmount()
  flush()
  expect(host.releasePointerCapture).toHaveBeenCalledWith(7)
  change.mockClear()
  pointer(track, 'pointerdown', 60)
  expect(change).not.toHaveBeenCalled()
})

test('caller prevention, modifiers and readonly gestures preserve the accepted state', () => {
  const change = vi.fn()
  const h = render(() => (
    <Slider
      aria-label="Caller"
      value={20}
      onValueChange={change}
      onKeyDown={(event) => event.preventDefault()}
      onPointerDown={(event) => event.preventDefault()}
    />
  ))
  flush()
  key(h.getByRole('slider'), 'ArrowRight')
  pointer(h.getByRole('group'), 'pointerdown', 80)
  expect(change).not.toHaveBeenCalled()
})

test('RTL keyboard direction and decimal steps use the same engine', () => {
  const [value, setValue] = createSignal(0.25)
  const h = render(() => (
    <Slider
      aria-label="Decimal"
      value={value()}
      min={0.05}
      max={1.05}
      step={0.1}
      direction="rtl"
      onValueChange={setValue}
      getValueText={(n) => `${n} units`}
    />
  ))
  flush()
  const thumb = h.getByRole('slider')
  key(thumb, 'ArrowRight')
  expect(value()).toBe(0.15)
  key(thumb, 'ArrowUp')
  expect(value()).toBe(0.25)
  expect(thumb.getAttribute('aria-valuetext')).toBe('0.25 units')
})

test('bounds clamp and snap presentation without emitting requests', () => {
  const change = vi.fn()
  const h = render(() => (
    <Slider
      aria-label="Bounds"
      value={101}
      max={100}
      step={3}
      onValueChange={change}
    />
  ))
  flush()
  expect(h.getByRole('slider').getAttribute('aria-valuenow')).toBe('99')
  expect(change).not.toHaveBeenCalled()
})

test.each([
  [0, 0, 1],
  [10, 0, 1],
  [0, 100, 0],
  [0, Infinity, 1],
  [NaN, 100, 1],
])('invalid scale %s/%s/%s fails explicitly', (min, max, step) => {
  expect(() => sliderScale(min, max, step)).toThrow(RangeError)
})
