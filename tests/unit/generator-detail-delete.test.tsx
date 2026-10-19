import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@solidjs/testing-library'
import { createSignal, Errored, flush } from 'solid-js'
import { DetailView, DeleteView } from '@wfe/generator'
import type { DetailDescription } from '@wfe/generator'

beforeEach(() =>
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  })),
)
beforeEach(() => vi.spyOn(window, 'scrollTo').mockImplementation(() => {}))
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
const settle = async () => {
  flush()
  await new Promise((resolve) => setTimeout(resolve, 30))
  flush()
}

test('detail fields reuse shared formats, fallback labels, help and actions without a form', async () => {
  const [record, setRecord] = createSignal({
    code: '0123456789abcdef',
    active: true,
    day: '2024-02-29',
  })
  const run = vi.fn()
  const h = render(() => (
    <DetailView
      description={
        {
          id: 'record',
          fields: [
            {
              field: 'code',
              format: 'short-hash',
              help: 'Full code available',
            },
            { field: 'active', format: 'boolean-symbol' },
            {
              field: 'day',
              format: 'date',
              formatOptions: { dateFormat: 'dd/MM/yyyy' },
            },
          ],
          actions: [{ id: 'refresh' }],
        } as const satisfies DetailDescription<ReturnType<typeof record>>
      }
      bindings={{ record, actions: { refresh: { run } } }}
    />
  ))
  await settle()
  const output = h.getByLabelText('code')
  expect(output.textContent).toBe('01234567')
  expect(screen.getByRole('img', { name: '0123456789abcdef' }).title).toBe(
    '0123456789abcdef',
  )
  expect(
    document.getElementById(output.getAttribute('aria-describedby')!)
      ?.textContent,
  ).toBe('Full code available')
  expect(h.getByLabelText('day').textContent).toBe('29/02/2024')
  expect(screen.getByRole('img', { name: 'Yes' })).toBeTruthy()
  expect(h.container.querySelector('form,input')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'refresh' }))
  expect(run).toHaveBeenCalledTimes(1)
  setRecord({ code: 'abcdef0123456789', active: false, day: '2024-03-01' })
  await settle()
  expect(h.getByLabelText('code')).toBe(output)
  expect(output.textContent).toBe('abcdef01')
  expect(screen.getByRole('img', { name: 'No' })).toBeTruthy()
})
test('detail fields retain output owners across metadata reorder and format changes', async () => {
  const [reversed, setReversed] = createSignal(false)
  const record = () => ({ code: 'abcdef012345', name: 'Record' })
  const h = render(() => (
    <DetailView
      description={
        {
          id: 'detail',
          columns: 2,
          fields: reversed()
            ? [
                { field: 'name' },
                { field: 'code', label: 'Identifier', format: 'short-hash' },
              ]
            : [{ field: 'code' }, { field: 'name' }],
        } as const
      }
      bindings={{ record }}
    />
  ))
  await settle()
  const output = h.getByLabelText('code')
  setReversed(true)
  await settle()
  expect(h.getByLabelText('Identifier')).toBe(output)
  expect(output.textContent).toBe('abcdef01')
  expect(
    [...h.container.querySelectorAll('output')].map((node) => node.textContent),
  ).toEqual(['Record', 'abcdef01'])
})
test('detail metadata rejects duplicate keys', () => {
  const h = render(() => (
    <Errored fallback={(error) => <p role="alert">{String(error())}</p>}>
      <DetailView
        description={{
          id: 'invalid',
          fields: [{ field: 'name' }, { field: 'name' }],
        }}
        bindings={{ record: () => ({ name: 'Record' }) }}
      />
    </Errored>
  ))
  flush()
  expect(h.getByRole('alert').textContent).toContain('duplicate detail field')
})
function mountDelete(onConfirm = vi.fn()) {
  const [key, setKey] = createSignal<string | number>('first')
  const [disabled, setDisabled] = createSignal(false)
  const h = render(() => (
    <DeleteView
      description={{
        id: 'delete-record',
        title: 'Delete record?',
        confirmation: 'Remove this record?',
        triggerLabel: 'Remove',
        confirmLabel: 'Confirm',
      }}
      bindings={{ recordKey: key, onConfirm, disabled }}
    />
  ))
  flush()
  const open = async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    await settle()
  }
  return { ...h, open, onConfirm, setKey, setDisabled }
}
test('delete cancel uses the shared alert dialog and never calls the callback', async () => {
  const h = mountDelete()
  await h.open()
  expect(screen.getByRole('alertdialog')).toBeTruthy()
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Cancel' })).toBe(
      document.activeElement,
    ),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  await settle()
  expect(screen.queryByRole('alertdialog')).toBeNull()
  expect(h.onConfirm).not.toHaveBeenCalled()
})
test('delete consumes confirmation immediately and calls back once with the captured key', async () => {
  const h = mountDelete()
  await h.open()
  const button = screen.getByRole('button', { name: 'Confirm' })
  button.click()
  button.click()
  await settle()
  expect(h.onConfirm).toHaveBeenCalledExactlyOnceWith('first')
  expect(screen.queryByRole('alertdialog')).toBeNull()
  button.click()
  await settle()
  expect(h.onConfirm).toHaveBeenCalledTimes(1)
})
test('delete invalidates open confirmation when the key changes', async () => {
  const h = mountDelete()
  await h.open()
  const button = screen.getByRole('button', { name: 'Confirm' })
  h.setKey('second')
  flush()
  button.click()
  await settle()
  expect(h.onConfirm).not.toHaveBeenCalled()
  expect(screen.queryByRole('alertdialog')).toBeNull()
  await h.open()
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
  await settle()
  expect(h.onConfirm).toHaveBeenCalledExactlyOnceWith('second')
})
test('delete checks a new disabled state before confirmation', async () => {
  const h = mountDelete()
  await h.open()
  const button = screen.getByRole('button', { name: 'Confirm' })
  h.setDisabled(true)
  flush()
  button.click()
  await settle()
  expect(h.onConfirm).not.toHaveBeenCalled()
  expect(screen.queryByRole('alertdialog')).toBeNull()
  expect(
    screen.getByRole('button', { name: 'Remove' }).hasAttribute('disabled'),
  ).toBe(true)
})
test('delete callback can immediately unmount its view', async () => {
  let remove = () => {}
  const callback = vi.fn(() => remove())
  const h = mountDelete(callback)
  remove = h.unmount
  await h.open()
  const button = screen.getByRole('button', { name: 'Confirm' })
  button.click()
  await settle()
  button.click()
  await settle()
  expect(callback).toHaveBeenCalledExactlyOnceWith('first')
  expect(document.querySelector('[role="alertdialog"]')).toBeNull()
})
test('delete releases pending dialog focus and stale buttons on disposal', async () => {
  const h = mountDelete()
  await h.open()
  const button = screen.getByRole('button', { name: 'Confirm' })
  h.unmount()
  button.click()
  await settle()
  expect(h.onConfirm).not.toHaveBeenCalled()
  expect(document.querySelector('[role="alertdialog"]')).toBeNull()
})
test('delete accepts numeric keys including zero', async () => {
  const h = mountDelete()
  h.setKey(0)
  await settle()
  await h.open()
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
  await settle()
  expect(h.onConfirm).toHaveBeenCalledExactlyOnceWith(0)
})

test('detail rejects an unknown runtime format', () => {
  const h = render(() => (
    <Errored fallback={(error) => <p role="alert">{String(error())}</p>}>
      <DetailView
        description={{
          id: 'invalid-format',
          fields: [{ field: 'name', format: 'missing' as never }],
        }}
        bindings={{ record: () => ({ name: 'Record' }) }}
      />
    </Errored>
  ))
  flush()
  expect(h.getByRole('alert').textContent).toContain('unsupported format')
})
test('detail requires a present record even with no described fields', () => {
  const h = render(() => (
    <Errored fallback={(error) => <p role="alert">{String(error())}</p>}>
      <DetailView
        description={{ id: 'empty', fields: [] }}
        bindings={{ record: () => undefined as never }}
      />
    </Errored>
  ))
  flush()
  expect(h.getByRole('alert').textContent).toContain('requires one record')
})
test.each(['', '  ', NaN, Infinity])(
  'closed delete rejects invalid key %s',
  (key) => {
    const h = render(() => (
      <Errored fallback={(error) => <p role="alert">{String(error())}</p>}>
        <DeleteView
          description={{
            id: 'invalid-key',
            title: 'Delete?',
            confirmation: 'Delete this record?',
          }}
          bindings={{ recordKey: () => key, onConfirm() {} }}
        />
      </Errored>
    ))
    flush()
    expect(h.getByRole('alert').textContent).toContain(
      'nonempty string or finite number key',
    )
  },
)

test('delete re-reads the key at confirmation even before an invalidation effect runs', async () => {
  let accepted = 'first'
  const callback = vi.fn()
  render(() => (
    <DeleteView
      description={{
        id: 'current-key',
        title: 'Delete?',
        confirmation: 'Delete this record?',
      }}
      bindings={{ recordKey: () => accepted, onConfirm: callback }}
    />
  ))
  flush()
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
  await settle()
  const button = screen
    .getAllByRole('button', { name: 'Delete' })
    .find((node) => node.closest('[role="alertdialog"]'))!
  accepted = 'second'
  button.click()
  await settle()
  expect(callback).not.toHaveBeenCalled()
  expect(screen.queryByRole('alertdialog')).toBeNull()
})
