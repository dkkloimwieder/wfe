import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import type { Accessor } from 'solid-js'
import {
  DragDropFeedback,
  DragPreview,
  DragHandle,
  DropIndicator,
} from '../../packages/components/src/dnd/DragDropFeedback'
import type {
  DragDropEvent,
  DragDropScope,
  DragOperation,
} from '../../packages/components/src/dnd/types'

afterEach(cleanup)

function fixture() {
  const [operation, setOperation] = createSignal<DragOperation<string> | null>(
    null,
  )
  const listeners = new Set<(event: DragDropEvent<string>) => void>()
  const scope: DragDropScope<string> = {
    operation,
    cancel() {},
    requestDrop: () => false,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
  const value: DragOperation<string> = {
    source: { id: 'one', label: 'First record', data: 'one' },
    target: { id: 'two', label: 'Next list', data: 'two' },
    input: 'pointer',
    point: { x: 50, y: 60 },
  }
  return {
    scope,
    value,
    setOperation,
    listeners,
    emit(event: DragDropEvent<string>) {
      for (const listener of listeners) listener(event)
      flush()
    },
  }
}

test('feedback distinguishes move requests and cancellations and releases its subscription', () => {
  const state = fixture()
  const view = render(() => (
    <DragDropFeedback scope={state.scope} instructionsId="drag-help" />
  ))
  flush()
  expect(view.getByText(/Press Space/).id).toBe('drag-help')
  state.emit({ type: 'start', operation: state.value })
  expect(view.getByRole('status').textContent).toBe('Picked up First record.')
  state.emit({ type: 'over', operation: state.value })
  expect(view.getByRole('status').textContent).toBe(
    'First record over Next list.',
  )
  state.emit({
    type: 'drop',
    operation: { ...state.value, target: state.value.target! },
  })
  expect(view.getByRole('status').textContent).toBe(
    'Move requested for First record to Next list.',
  )
  state.emit({ type: 'cancel', operation: state.value })
  expect(view.getByRole('status').textContent).toBe(
    'Moving First record canceled.',
  )
  view.unmount()
  expect(state.listeners.size).toBe(0)
})

test('default preview only renders a label, preserves source inputs, and cleans its portal', () => {
  const state = fixture()
  const mount = document.createElement('div')
  document.body.append(mount)
  const view = render(() => (
    <>
      <input id="original-field" value="Original value" />
      <DragPreview scope={state.scope} mount={mount} />
    </>
  ))
  flush()
  expect(mount.textContent).toBe('')
  state.setOperation(state.value)
  flush()
  const preview = mount.querySelector('.ui-dnd-preview')!
  expect(preview.textContent).toBe('First record')
  expect(preview.hasAttribute('inert')).toBe(true)
  expect(preview.getAttribute('aria-hidden')).toBe('true')
  expect(preview.querySelector('input, button, [id], [tabindex]')).toBeNull()
  expect(document.querySelectorAll('#original-field')).toHaveLength(1)
  expect(view.getByDisplayValue('Original value')).toBeTruthy()
  state.setOperation(null)
  flush()
  expect(mount.childElementCount).toBe(0)
  state.setOperation(state.value)
  flush()
  view.unmount()
  expect(mount.childElementCount).toBe(0)
  mount.remove()
})

test('custom preview stays mounted during pointer updates and keyboard drags do not create it', () => {
  const state = fixture()
  const renderer = vi.fn((operation: Accessor<DragOperation<string>>) => (
    <strong>{operation().source.label}</strong>
  ))
  const view = render(() => (
    <DragPreview scope={state.scope}>{renderer}</DragPreview>
  ))
  flush()
  state.setOperation({ ...state.value, input: 'keyboard' })
  flush()
  expect(renderer).not.toHaveBeenCalled()
  state.setOperation(state.value)
  flush()
  expect(renderer).toHaveBeenCalledTimes(1)
  state.setOperation({ ...state.value, point: { x: 90, y: 100 } })
  flush()
  expect(renderer).toHaveBeenCalledTimes(1)
  view.unmount()
  expect(document.querySelector('.ui-dnd-preview')).toBeNull()
})

test('handle delegates registration and remains a non-submit accessible button', () => {
  const handleRef = vi.fn()
  const [active, setActive] = createSignal(false)
  const view = render(() => (
    <form>
      <DragHandle
        drag={{ ref() {}, handleRef, dragging: active }}
        label="Move record"
        aria-describedby="drag-help"
      />
      <DropIndicator active={active()} />
    </form>
  ))
  flush()
  const handle = view.getByRole('button', { name: 'Move record' })
  expect(handleRef).toHaveBeenCalledWith(handle)
  expect(handle.getAttribute('type')).toBe('button')
  expect(handle.getAttribute('aria-describedby')).toBe('drag-help')
  expect(view.container.querySelector('.ui-dnd-indicator')).toBeNull()
  setActive(true)
  flush()
  expect(handle.hasAttribute('data-dragging')).toBe(true)
  expect(
    view.container
      .querySelector('.ui-dnd-indicator')
      ?.getAttribute('aria-hidden'),
  ).toBe('true')
})
