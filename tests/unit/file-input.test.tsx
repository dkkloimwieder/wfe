import assert from 'node:assert/strict'
import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { Field, HelpText, Label } from '@wfe/components'
import { FileInput } from '@wfe/components/file-input'
afterEach(cleanup)
const text = (name = 'note.txt', content = 'abc', type = 'text/plain') =>
  new File([content], name, { type })
function pick(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, 'files', { configurable: true, value: files })
  fireEvent.change(input, { cancelable: true })
  flush()
}
test('controlled picker requests append objects without mutating or deduplicating canonical files', () => {
  const first = text(),
    second = text()
  const original = Object.freeze([first])
  const change = vi.fn()
  const h = render(() => (
    <FileInput
      label="Attachments"
      files={original}
      multiple
      onFilesChange={change}
    />
  ))
  const input = h.container.querySelector('input')!
  pick(input, [second])
  assert(change.mock.calls[0])
  expect(change.mock.calls[0][0]).toEqual([first, second])
  expect(change.mock.calls[0][0][1]).toBe(second)
  expect(original.length).toBe(1)
  expect(h.container.querySelectorAll('li').length).toBe(1)
  expect(input.value).toBe('')
  pick(input, [second])
  expect(change).toHaveBeenCalledTimes(2)
})
test('single selection replaces, mixed batches retain accepted objects, and multi-file single selection rejects the whole batch', () => {
  const [files, setFiles] = createSignal<readonly File[]>([text('old.txt')])
  const [multiple, setMultiple] = createSignal(true)
  const reject = vi.fn()
  const h = render(() => (
    <FileInput
      label="Attachments"
      files={files()}
      multiple={multiple()}
      accept=".txt,image/*"
      maxFileSize={3}
      onFilesChange={setFiles}
      onFilesRejected={reject}
    />
  ))
  const input = h.container.querySelector('input')!
  const valid = text('good.TXT'),
    big = text('big.txt', '1234'),
    wrong = text('wrong.bin', '1', 'application/octet-stream')
  pick(input, [valid, big, wrong])
  expect(files()).toEqual([expect.any(File), valid])
  assert(reject.mock.calls[0])
  expect(
    reject.mock.calls[0][0].map((r: { reason: string }) => r.reason),
  ).toEqual(['size', 'type'])
  expect(input.checkValidity()).toBe(true)
  setMultiple(false)
  setFiles([])
  flush()
  pick(input, [valid, text('other.txt')])
  expect(files()).toEqual([])
  assert(reject.mock.calls[1])
  expect(
    reject.mock.calls[1][0].map((r: { reason: string }) => r.reason),
  ).toEqual(['multiple', 'multiple'])
  pick(input, [valid])
  expect(files()).toEqual([valid])
  pick(input, [text('new.txt')])
  expect(files().map((f) => f.name)).toEqual(['new.txt'])
})
test('required validity follows canonical files after clearing the native picker and invalid submission focuses the visible button', () => {
  const [files, setFiles] = createSignal<readonly File[]>([])
  const h = render(() => (
    <form>
      <Field required controlId="attachments">
        <Label>Attachments</Label>
        <FileInput
          label="Attachments"
          files={files()}
          onFilesChange={setFiles}
        />
        <HelpText>Choose a text file</HelpText>
      </Field>
    </form>
  ))
  const input = h.container.querySelector('input')!
  expect(input.required).toBe(false)
  expect(input.checkValidity()).toBe(false)
  flush()
  expect(document.activeElement).toBe(
    h.getByRole('button', { name: 'Choose file' }),
  )
  expect(h.container.querySelector('label')?.htmlFor).toBe(input.id)
  expect(input.getAttribute('aria-describedby')).toContain(
    h.getByText('Choose a text file').id,
  )
  pick(input, [text()])
  expect(input.value).toBe('')
  expect(input.checkValidity()).toBe(true)
  setFiles([])
  flush()
  expect(input.checkValidity()).toBe(false)
})
test('external canonical changes and constraints update validity without emitting selection requests', () => {
  const [files, setFiles] = createSignal<readonly File[]>([text()])
  const [limit, setLimit] = createSignal(2)
  const change = vi.fn()
  const h = render(() => (
    <FileInput
      label="Attachments"
      files={files()}
      maxFileSize={limit()}
      onFilesChange={change}
    />
  ))
  const input = h.container.querySelector('input')!
  expect(input.checkValidity()).toBe(false)
  setLimit(3)
  flush()
  expect(input.checkValidity()).toBe(true)
  setFiles([text(), text('b.txt')])
  flush()
  expect(input.checkValidity()).toBe(false)
  expect(change).not.toHaveBeenCalled()
})
test('removal and native reset remain rejectable; canceled resets and disposal have no callbacks', async () => {
  const change = vi.fn()
  const h = render(() => (
    <form>
      <FileInput label="Attachments" files={[text()]} onFilesChange={change} />
    </form>
  ))
  const input = h.container.querySelector('input')!
  fireEvent.click(h.getByRole('button', { name: 'Remove note.txt' }))
  flush()
  expect(change.mock.calls).toEqual([[[]]])
  expect(h.getByText('note.txt')).toBeTruthy()
  expect(document.activeElement).toBe(
    h.getByRole('button', { name: 'Choose file' }),
  )
  const form = h.container.querySelector('form')!
  fireEvent.reset(form)
  await new Promise((done) => setTimeout(done, 5))
  flush()
  expect(change).toHaveBeenCalledTimes(2)
  form.addEventListener('reset', (e) => e.preventDefault(), { once: true })
  fireEvent.reset(form)
  await new Promise((done) => setTimeout(done, 5))
  flush()
  expect(change).toHaveBeenCalledTimes(2)
  fireEvent.reset(form)
  h.unmount()
  await new Promise((done) => setTimeout(done, 5))
  pick(input, [text()])
  expect(change).toHaveBeenCalledTimes(2)
})
for (const lock of ['disabled', 'readonly'] as const)
  test(`${lock} blocks changes, removal, and required validity`, () => {
    const change = vi.fn()
    const h = render(() => (
      <Field {...{ [lock]: true }} required>
        <FileInput label="Attachments" files={[]} onFilesChange={change} />
      </Field>
    ))
    const input = h.container.querySelector('input')!
    expect(input.disabled).toBe(true)
    expect(input.checkValidity()).toBe(true)
    pick(input, [text()])
    expect(change).not.toHaveBeenCalled()
  })
test('cancelable change handler composition and empty picker events preserve the canonical list', () => {
  const change = vi.fn()
  const h = render(() => (
    <FileInput
      label="Attachments"
      files={[]}
      onFilesChange={change}
      onChange={(event) => event.preventDefault()}
    />
  ))
  const input = h.container.querySelector('input')!
  pick(input, [text()])
  pick(input, [])
  expect(change).not.toHaveBeenCalled()
})

test('root drop cancellation and native disabled fieldsets prevent selection', () => {
  const change = vi.fn(),
    onDrop = vi.fn((event: DragEvent) => event.preventDefault())
  const [disabled, setDisabled] = createSignal(false)
  const h = render(() => (
    <fieldset disabled={disabled()}>
      <FileInput
        label="Attachments"
        files={[]}
        onFilesChange={change}
        onDrop={onDrop}
      />
    </fieldset>
  ))
  const root = h.getByRole('group', { name: 'Attachments' })
  const transfer = { types: ['Files'], files: [text()] }
  fireEvent.drop(root, { dataTransfer: transfer, cancelable: true })
  expect(onDrop).toHaveBeenCalledTimes(1)
  expect(change).not.toHaveBeenCalled()
  setDisabled(true)
  flush()
  fireEvent.dragOver(root, { dataTransfer: transfer, cancelable: true })
  expect(root.hasAttribute('data-dragging')).toBe(false)
  fireEvent.drop(root, { dataTransfer: transfer, cancelable: true })
  expect(change).not.toHaveBeenCalled()
})
