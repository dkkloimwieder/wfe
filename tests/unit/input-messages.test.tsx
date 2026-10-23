import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { FileInput, NumberInput } from '@wfe/components'
import type { FileInputMessages, NumberInputMessages } from '@wfe/components'
afterEach(cleanup)

test('numeric messages retain invalid draft and focus without value or validity requests', () => {
  const [messages, setMessages] = createSignal<Partial<NumberInputMessages>>()
  const changed = vi.fn(),
    validity = vi.fn((valid: boolean) => valid)
  const h = render(() => (
    <NumberInput
      aria-label="Amount"
      name="amount"
      value={2}
      min={0}
      max={9}
      messages={messages()}
      onValueChange={changed}
      onValidityChange={validity}
    />
  ))
  const input = h.getByLabelText<HTMLInputElement>('Amount')
  fireEvent.input(input, { target: { value: '-1' } })
  flush()
  input.focus()
  expect(validity).toHaveBeenLastCalledWith(false)
  const calls = validity.mock.calls.length
  setMessages({ minimumError: (min) => `Mínimo: ${min}` })
  flush()
  expect(h.getByLabelText('Amount')).toBe(input)
  expect(input.value).toBe('-1')
  expect(document.activeElement).toBe(input)
  expect(input.validationMessage).toBe('Mínimo: 0')
  expect(h.getByText('Mínimo: 0')).toBeTruthy()
  expect(validity).toHaveBeenCalledTimes(calls)
  expect(changed).not.toHaveBeenCalled()
  setMessages({ minimumError: () => '' })
  flush()
  expect(input.validity.customError).toBe(true)
  expect(input.getAttribute('aria-invalid')).toBe('true')
  fireEvent.input(input, { target: { value: '-3' } })
  flush()
  expect(changed).not.toHaveBeenCalled()
  expect(validity).toHaveBeenCalledTimes(calls)
  fireEvent.keyDown(input, { key: 'Escape' })
  flush()
  expect(input.value).toBe('2')
  expect(validity).toHaveBeenLastCalledWith(true)
  expect(h.container.querySelector('input[type=hidden]')).toHaveProperty(
    'value',
    '2',
  )
  expect(input.hasAttribute('messages')).toBe(false)
})

test('file messages retain selected File identity, focus, rejection feedback and explicit labels', () => {
  const [messages, setMessages] = createSignal<Partial<FileInputMessages>>()
  const file = new File(['abc'], 'note.txt', { type: 'text/plain' })
  const [files, setFiles] = createSignal<readonly File[]>([file])
  const changed = vi.fn((next: File[]) => setFiles(next)),
    rejected = vi.fn()
  const h = render(() => (
    <FileInput
      label="Attachment"
      required
      files={files()}
      messages={messages()}
      browseLabel="Browse attachment"
      removeLabel={(file) => `Erase ${file.name}`}
      accept=".txt"
      onFilesChange={changed}
      onFilesRejected={rejected}
    />
  ))
  const input = h.container.querySelector<HTMLInputElement>('input[type=file]')!
  fireEvent.change(input, {
    target: { files: [new File(['x'], 'bad.png', { type: 'image/png' })] },
  })
  flush()
  expect(rejected).toHaveBeenCalledOnce()
  const remove = h.getByRole('button', { name: 'Erase note.txt' })
  remove.focus()
  setMessages({
    remove: 'Quitar',
    removeFile: () => 'Ignored',
    fileSize: (n) => `${n} octetos`,
    typeError: 'Tipo no permitido',
    required: 'Obligatorio',
    chooseFile: 'Elegir',
  })
  flush()
  expect(h.getByRole('button', { name: 'Erase note.txt' })).toBe(remove)
  expect(remove.textContent).toBe('Quitar')
  expect(document.activeElement).toBe(remove)
  expect(h.getByRole('button', { name: 'Browse attachment' })).toBeTruthy()
  expect(h.getByText('3 octetos')).toBeTruthy()
  expect(h.getByText('Tipo no permitido', { exact: false })).toBeTruthy()
  expect(files()[0]).toBe(file)
  expect(changed).not.toHaveBeenCalled()
  expect(rejected).toHaveBeenCalledOnce()
  expect(input.hasAttribute('messages')).toBe(false)
  fireEvent.click(remove)
  flush()
  expect(changed).toHaveBeenCalledExactlyOnceWith([])
  expect(document.activeElement).toBe(
    h.getByRole('button', { name: 'Browse attachment' }),
  )
  setMessages({ requiredError: 'Seleccione archivo', noFiles: 'Sin archivos' })
  flush()
  expect(input.validationMessage).toBe('Seleccione archivo')
  expect(h.getByText('Sin archivos')).toBeTruthy()
  setMessages({ requiredError: '' })
  flush()
  expect(input.validity.customError).toBe(true)
  expect(changed).toHaveBeenCalledTimes(1)
})
