import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { createSignal, Errored, flush } from 'solid-js'
import {
  AlertDialog,
  Toast,
  StatusTile,
  ValueDisplay,
  alertDialogMessages,
  toastMessages,
  statusTileMessages,
  valueDisplayMessages,
} from '@wfe/components'
import type {
  ToastMessages,
  StatusTileMessages,
  ValueDisplayMessages,
} from '@wfe/components'

beforeEach(() => vi.stubGlobal('scrollTo', vi.fn()))
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

test('display message defaults preserve English labels and empty values', () => {
  expect(alertDialogMessages.cancel).toBe('Cancel')
  expect(toastMessages).toEqual({
    regionLabel: 'Notifications',
    dismissLabel: 'Dismiss notification',
    close: 'Close',
  })
  expect(valueDisplayMessages).toEqual({ yes: 'Yes', no: 'No', emptyValue: '' })
  expect(statusTileMessages).toEqual({
    ...valueDisplayMessages,
    ok: 'OK',
    warning: 'Warning',
    unknown: 'Unknown',
  })
  const h = render(() => (
    <>
      <ValueDisplay value={true} format="boolean-symbol" />
      <ValueDisplay value={false} format="boolean-text" />
      <StatusTile label="Count" value={null} state="unknown" />
    </>
  ))
  expect(h.getByRole('img', { name: 'Yes' })).toBeTruthy()
  expect(h.getByText('No')).toBeTruthy()
  expect(h.getByText('Unknown')).toBeTruthy()
})

test('value and status messages update in place without translating caller content or numbers', () => {
  const [messages, setMessages] = createSignal<Partial<StatusTileMessages>>({
    yes: 'Sí',
    emptyValue: 'Sin valor',
    ok: 'Correcto',
  })
  const h = render(() => (
    <>
      <ValueDisplay
        value={true}
        format="boolean-symbol"
        messages={messages()}
      />
      <ValueDisplay value={false} format="boolean-text" messages={messages()} />
      <StatusTile
        label="Application title"
        detail="Application detail"
        value={null}
        state="ok"
        messages={messages()}
      />
      <StatusTile
        label="Formatted"
        value={true}
        format="boolean-text"
        state="warning"
        messages={messages()}
      />
      <output aria-label="Locale number">
        <ValueDisplay
          value={1234}
          format="number-grouped"
          locale="de-DE"
          messages={messages()}
        />
      </output>
    </>
  ))
  const icon = h.getByRole('img', { name: 'Sí' })
  const tile = h.getByRole('group', { name: 'Application title' })
  expect(tile.textContent).toContain('CorrectoSin valor')
  expect(h.getByRole('group', { name: 'Formatted' }).textContent).toContain(
    'Sí',
  )
  const number = h.getByLabelText('Locale number')
  expect(number.textContent).toBe('1.234')
  setMessages({ yes: 'Oui', no: 'Non', emptyValue: 'Vide', ok: 'Prêt' })
  flush()
  expect(h.getByRole('img', { name: 'Oui' })).toBe(icon)
  expect(h.getByRole('group', { name: 'Application title' })).toBe(tile)
  expect(tile.textContent).toContain('PrêtVide')
  expect(tile.textContent).toContain('Application detail')
  expect(h.getByText('Non')).toBeTruthy()
  expect(h.getByLabelText('Locale number')).toBe(number)
  expect(number.textContent).toBe('1.234')
  expect(tile.hasAttribute('messages')).toBe(false)
  h.unmount()
  setMessages({ yes: 'After disposal' })
  flush()
  expect(icon.getAttribute('aria-label')).toBe('Oui')
})

test('toast inherited messages retain focus, announcements, dismiss behavior and explicit labels', () => {
  const [messages, setMessages] = createSignal<Partial<ToastMessages>>({
    regionLabel: 'Avisos',
    dismissLabel: 'Descartar aviso',
    close: 'Cerrar',
  })
  const dismiss = vi.fn()
  const h = render(() => (
    <Toast.Region messages={messages()}>
      <Toast defaultOpen persistent onDismiss={dismiss}>
        <Toast.Title>Caller title</Toast.Title>
        <Toast.CloseButton />
      </Toast>
    </Toast.Region>
  ))
  const region = h.getByRole('region', { name: 'Avisos' })
  const button = h.getByRole('button', { name: 'Descartar aviso' })
  button.focus()
  setMessages({
    regionLabel: 'Notifications françaises',
    dismissLabel: 'Fermer la notification',
    close: 'Fermer',
  })
  flush()
  expect(h.getByRole('button', { name: 'Fermer la notification' })).toBe(button)
  expect(button.textContent).toBe('Fermer')
  expect(document.activeElement).toBe(button)
  expect(h.getByRole('status').getAttribute('aria-live')).toBe('polite')
  expect(region.hasAttribute('messages')).toBe(false)
  expect(button.hasAttribute('messages')).toBe(false)
  fireEvent.keyDown(button, { key: 'Escape' })
  flush()
  expect(dismiss).toHaveBeenCalledWith('escape')
  expect(h.queryByRole('status')).toBeNull()
  h.unmount()
  const explicit = render(() => (
    <Toast.Region aria-label="Own region" messages={{ regionLabel: 'Ignored' }}>
      <Toast
        defaultOpen
        persistent
        messages={{ close: 'Ignored', dismissLabel: 'Ignored' }}
      >
        <Toast.CloseButton aria-label="Own dismiss">
          Own action
        </Toast.CloseButton>
      </Toast>
    </Toast.Region>
  ))
  expect(explicit.getByRole('region', { name: 'Own region' })).toBeTruthy()
  expect(
    explicit.getByRole('button', { name: 'Own dismiss' }).textContent,
  ).toBe('Own action')
})

test('alert cancel messages retain its button and cancellation behavior', () => {
  const [cancel, setCancel] = createSignal('Cancelar')
  const change = vi.fn()
  const h = render(() => (
    <AlertDialog
      defaultOpen
      onOpenChange={change}
      messages={{ cancel: cancel() }}
    >
      <AlertDialog.Content>
        <AlertDialog.Title>Caller title</AlertDialog.Title>
        <AlertDialog.Description>Caller explanation</AlertDialog.Description>
        <AlertDialog.Cancel />
      </AlertDialog.Content>
    </AlertDialog>
  ))
  const button = h.getByRole('button', { name: 'Cancelar' })
  button.focus()
  setCancel('Annuler')
  flush()
  expect(h.getByRole('button', { name: 'Annuler' })).toBe(button)
  expect(document.activeElement).toBe(button)
  expect(button.hasAttribute('messages')).toBe(false)
  fireEvent.click(button)
  flush()
  expect(change).toHaveBeenCalledWith(false)
})

const valid: Partial<ValueDisplayMessages> = { yes: 'Sí' }
// @ts-expect-error Message names are a finite component-owned contract.
const invalid: Partial<ValueDisplayMessages> = { translatedEverything: 'No' }
void [valid, invalid]

test('translated empty values retain date format validation', () => {
  const h = render(() => (
    <Errored fallback={(error) => <p role="alert">{String(error())}</p>}>
      <ValueDisplay
        value=""
        format="date"
        dateFormat="invalid"
        messages={{ emptyValue: 'Vacío' }}
      />
    </Errored>
  ))
  flush()
  expect(h.getByRole('alert').textContent).toContain(
    'Date format must contain yyyy, MM, and dd once',
  )
  expect(h.queryByText('Vacío')).toBeNull()
})

test('toast translation retains the remaining dismissal timeout', () => {
  vi.useFakeTimers()
  const [messages, setMessages] = createSignal<Partial<ToastMessages>>({
    close: 'Cerrar',
  })
  const dismiss = vi.fn()
  const h = render(() => (
    <Toast.Region messages={messages()}>
      <Toast defaultOpen duration={1000} onDismiss={dismiss}>
        <Toast.CloseButton />
      </Toast>
    </Toast.Region>
  ))
  flush()
  const button = h.getByRole('button', { name: 'Dismiss notification' })
  vi.advanceTimersByTime(600)
  setMessages({ close: 'Fermer' })
  flush()
  expect(h.getByRole('button', { name: 'Dismiss notification' })).toBe(button)
  expect(button.textContent).toBe('Fermer')
  vi.advanceTimersByTime(399)
  flush()
  expect(dismiss).not.toHaveBeenCalled()
  vi.advanceTimersByTime(1)
  flush()
  expect(dismiss).toHaveBeenCalledExactlyOnceWith('timeout')
  expect(h.queryByRole('status')).toBeNull()
})
