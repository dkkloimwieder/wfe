import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render } from '@solidjs/testing-library'
import { createSignal, Errored, flush, onCleanup } from 'solid-js'
import { Accordion } from '@wfe/components/accordion'
afterEach(cleanup)

test('single-open requests accept or reject without prop echoes and preserve drafts', () => {
  const [value, setValue] = createSignal<readonly string[]>(['contact'])
  let accept = false
  const change = vi.fn((next: string[]) => {
    if (accept) setValue(next)
  })
  const h = render(() => (
    <Accordion value={value()} onValueChange={change}>
      <Accordion.Item id="contact" value="contact" summary="Contact">
        <input />
      </Accordion.Item>
      <Accordion.Item
        id="preferences"
        value="preferences"
        summary="Preferences"
      >
        Content
      </Accordion.Item>
    </Accordion>
  ))
  const contact = h.container.querySelector<HTMLDetailsElement>('#contact')!
  const preferences =
    h.container.querySelector<HTMLDetailsElement>('#preferences')!
  const input = h.container.querySelector('input')!
  input.value = 'Unsaved name'
  preferences.querySelector('summary')!.click()
  flush()
  expect(contact.open).toBe(true)
  expect(preferences.open).toBe(false)
  expect(change.mock.calls).toEqual([[['preferences']]])
  accept = true
  input.focus()
  preferences.querySelector('summary')!.click()
  flush()
  expect(contact.open).toBe(false)
  expect(preferences.open).toBe(true)
  expect(document.activeElement).toBe(contact.querySelector('summary'))
  setValue(['contact'])
  flush()
  expect(h.container.querySelector('input')).toBe(input)
  expect(input.value).toBe('Unsaved name')
  expect(change).toHaveBeenCalledTimes(2)
  contact.querySelector('summary')!.click()
  flush()
  expect(contact.open).toBe(false)
  expect(change.mock.lastCall).toEqual([[]])
})

test('uncontrolled multiple sections retain owners and native handlers until group disposal', () => {
  const change = vi.fn()
  const dispose = vi.fn()
  const action = vi.fn()
  function Child() {
    onCleanup(dispose)
    return <input />
  }
  const h = render(() => (
    <Accordion multiple defaultValue={['a']} onValueChange={change}>
      <Accordion.Item
        value="a"
        summary={
          <>
            First{' '}
            <button type="button" onClick={action}>
              Action
            </button>
          </>
        }
      >
        <Child />
      </Accordion.Item>
      <Accordion.Item value="b" summary="Second">
        Content
      </Accordion.Item>
    </Accordion>
  ))
  const [a, b] = Array.from(h.container.querySelectorAll('details'))
  b.querySelector('summary')!.click()
  flush()
  expect(a.open && b.open).toBe(true)
  a.querySelector('button')!.click()
  flush()
  expect(action).toHaveBeenCalledTimes(1)
  expect(change.mock.calls).toEqual([[['a', 'b']]])
  a.querySelector('summary')!.click()
  flush()
  expect(a.open).toBe(false)
  expect(b.open).toBe(true)
  expect(dispose).not.toHaveBeenCalled()
  const calls = change.mock.calls.length
  h.unmount()
  a.querySelector('summary')!.click()
  b.dispatchEvent(new Event('toggle'))
  expect(change).toHaveBeenCalledTimes(calls)
  expect(dispose).toHaveBeenCalledTimes(1)
})

test('nested groups and removed items keep their own selected values', () => {
  const [show, setShow] = createSignal(true)
  const h = render(() => (
    <Accordion defaultValue={['outer']}>
      {show() && (
        <Accordion.Item value="outer" summary="Outer">
          <Accordion defaultValue={['inner']}>
            <Accordion.Item value="inner" summary="Inner">
              Nested
            </Accordion.Item>
          </Accordion>
        </Accordion.Item>
      )}
      <Accordion.Item value="other" summary="Other">
        Other
      </Accordion.Item>
    </Accordion>
  ))
  let [outer, inner] = Array.from(h.container.querySelectorAll('details'))
  inner.querySelector('summary')!.click()
  flush()
  expect(outer.open).toBe(true)
  expect(inner.open).toBe(false)
  setShow(false)
  flush()
  setShow(true)
  flush()
  ;[outer, inner] = Array.from(h.container.querySelectorAll('details'))
  expect(outer.open).toBe(true)
  expect(inner.open).toBe(true)
})

test('caller cancellation and reactive native classes, refs and attributes survive', () => {
  const [revision, setRevision] = createSignal(false)
  const refs = vi.fn()
  const change = vi.fn()
  const h = render(() => (
    <Accordion
      ref={refs}
      class={['caller', { revised: revision() }]}
      aria-label={revision() ? 'Revised' : 'Original'}
      defaultValue={['a']}
      onValueChange={change}
    >
      <Accordion.Item
        value="a"
        summary="First"
        onClick={(event) => event.preventDefault()}
      >
        Body
      </Accordion.Item>
    </Accordion>
  ))
  const root = h.container.querySelector('.ui-accordion')!
  h.container.querySelector('summary')!.click()
  flush()
  expect(h.container.querySelector('details')!.open).toBe(true)
  expect(change).not.toHaveBeenCalled()
  setRevision(true)
  flush()
  expect(root.getAttribute('aria-label')).toBe('Revised')
  expect(root.classList.contains('revised')).toBe(true)
  expect(refs).toHaveBeenCalledTimes(1)
})

for (const invalid of [['a', 'a'], [''], ['a', 'b']]) {
  test(
    'reject invalid single-open selection: ' + JSON.stringify(invalid),
    () => {
      const h = render(() => (
        <Errored fallback={(error) => <p role="alert">{String(error())}</p>}>
          <Accordion defaultValue={invalid}>
            <Accordion.Item value="a" summary="First">
              Body
            </Accordion.Item>
          </Accordion>
        </Errored>
      ))
      flush()
      expect(h.getByRole('alert').textContent).toContain(
        invalid.length > 1 && invalid[0] !== invalid[1]
          ? 'at most one'
          : 'unique nonempty',
      )
    },
  )
}
test('changing control mode or multiple mode cannot silently discard selection', () => {
  const [multiple, setMultiple] = createSignal(true)
  const h = render(() => (
    <Errored fallback={(error) => <p role="alert">{String(error())}</p>}>
      <Accordion multiple={multiple()} defaultValue={['a', 'b']}>
        <Accordion.Item value="a" summary="First">
          Body
        </Accordion.Item>
      </Accordion>
    </Errored>
  ))
  setMultiple(false)
  flush()
  expect(h.getByRole('alert').textContent).toContain('at most one')
})
test('controlled roots reject a switch to uncontrolled state', () => {
  const [value, setValue] = createSignal<readonly string[] | undefined>(['a'])
  const h = render(() => (
    <Errored fallback={(error) => <p role="alert">{String(error())}</p>}>
      <Accordion value={value()}>
        <Accordion.Item value="a" summary="First">
          Body
        </Accordion.Item>
      </Accordion>
    </Errored>
  ))
  setValue(undefined)
  flush()
  expect(h.getByRole('alert').textContent).toContain('control mode')
})

test('uncontrolled multiple requests accumulate before a flush and callback arrays are isolated', () => {
  const changes: string[][] = []
  const h = render(() => (
    <Accordion
      multiple
      onValueChange={(next) => {
        changes.push([...next])
        next.length = 0
      }}
    >
      <Accordion.Item value="a" summary="First">
        First
      </Accordion.Item>
      <Accordion.Item value="b" summary="Second">
        Second
      </Accordion.Item>
    </Accordion>
  ))
  const [a, b] = Array.from(h.container.querySelectorAll('details'))
  a.querySelector('summary')!.click()
  b.querySelector('summary')!.click()
  flush()
  expect(a.open && b.open).toBe(true)
  expect(changes).toEqual([['a'], ['a', 'b']])
})

test('reactive empty item values report an error through the owner', () => {
  const [value, setValue] = createSignal('contact')
  const h = render(() => (
    <Errored fallback={(error) => <p role="alert">{String(error())}</p>}>
      <Accordion>
        <Accordion.Item value={value()} summary="Contact">
          Body
        </Accordion.Item>
      </Accordion>
    </Errored>
  ))
  setValue('')
  flush()
  expect(h.getByRole('alert').textContent).toContain('nonempty string value')
})
