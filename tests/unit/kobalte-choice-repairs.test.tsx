import { cleanup, fireEvent, render, waitFor } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { afterEach, expect, test, vi } from 'vitest'
import { DropdownMenu, Select } from '@wfe/components'
import * as VendorSelect from '../../packages/components/src/vendor/kobalte/core/src/select'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function watchDiagnostics() {
  const warn = vi.spyOn(console, 'warn')
  const error = vi.spyOn(console, 'error')
  return () => {
    expect(warn.mock.calls).toEqual([])
    expect(error.mock.calls).toEqual([])
  }
}

test('menu and option parts keep label links and refs without strict reads', async () => {
  const checkDiagnostics = watchDiagnostics()
  const [revision, setRevision] = createSignal('initial')
  const menuRef = vi.fn()
  const optionRef = vi.fn()
  const menu = render(() => (
    <DropdownMenu modal={false} defaultOpen>
      <DropdownMenu.Trigger>Actions</DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.CheckboxItem id={`menu-${revision()}`} checked>
          <DropdownMenu.ItemLabel ref={menuRef}>Inspect</DropdownMenu.ItemLabel>
          <DropdownMenu.ItemDescription>
            Read details
          </DropdownMenu.ItemDescription>
          <DropdownMenu.ItemIndicator />
        </DropdownMenu.CheckboxItem>
      </DropdownMenu.Content>
    </DropdownMenu>
  ))
  const item = await menu.findByRole('menuitemcheckbox', { name: 'Inspect' })
  checkDiagnostics()
  expect(item.getAttribute('aria-labelledby')).toBe('menu-initial-label')
  expect(item.getAttribute('aria-describedby')).toBe('menu-initial-description')
  expect(menuRef).toHaveBeenCalledWith(
    document.getElementById('menu-initial-label'),
  )
  setRevision('updated')
  flush()
  expect(item.getAttribute('aria-labelledby')).toBe('menu-updated-label')
  expect(item.getAttribute('aria-describedby')).toBe('menu-updated-description')
  expect(menuRef).toHaveBeenCalledTimes(1)
  menu.unmount()

  const select = render(() => (
    <Select<string>
      open
      options={['Alpha']}
      defaultValue="Alpha"
      itemComponent={(props) => (
        <Select.Item item={props.item} id={`option-${revision()}`}>
          <Select.ItemLabel id={`caller-${revision()}`} ref={optionRef}>
            Alpha
          </Select.ItemLabel>
          <Select.ItemDescription>First option</Select.ItemDescription>
          <Select.ItemIndicator />
        </Select.Item>
      )}
    >
      <Select.Trigger aria-label="Pick" />
      <Select.Content>
        <Select.Listbox />
      </Select.Content>
    </Select>
  ))
  const option = await select.findByRole('option', { name: 'Alpha' })
  checkDiagnostics()
  expect(option.getAttribute('aria-labelledby')).toBe('caller-updated')
  expect(option.getAttribute('aria-describedby')).toBe(
    'option-updated-description',
  )
  expect(optionRef).toHaveBeenCalledWith(
    document.getElementById('caller-updated'),
  )
  setRevision('next')
  flush()
  expect(option.getAttribute('aria-labelledby')).toBe('caller-next')
  expect(optionRef).toHaveBeenCalledTimes(1)
  select.unmount()
  checkDiagnostics()
})

test('vendored non-modal Select restores trigger focus on close without a diagnostic', async () => {
  const checkDiagnostics = watchDiagnostics()
  const [open, setOpen] = createSignal(true)
  const h = render(() => (
    <VendorSelect.Root<string>
      options={['Alpha']}
      open={open()}
      onOpenChange={setOpen}
    >
      <VendorSelect.Trigger aria-label="Pick" />
      <VendorSelect.Content>
        <VendorSelect.Listbox />
      </VendorSelect.Content>
    </VendorSelect.Root>
  ))
  const trigger = h.getByRole('button', { name: 'Pick' })
  const list = await h.findByRole('listbox')
  list.focus()
  setOpen(false)
  flush()
  await waitFor(() => expect(document.activeElement).toBe(trigger))
  checkDiagnostics()
})

test('vendored Select prunes missing uncontrolled selections without a diagnostic', async () => {
  const checkDiagnostics = watchDiagnostics()
  const [options, setOptions] = createSignal(['Alpha', 'Beta', 'Gamma'])
  const h = render(() => (
    <VendorSelect.Root<string>
      multiple
      options={options()}
      defaultValue={['Alpha', 'Beta']}
      itemComponent={(props) => (
        <VendorSelect.Item item={props.item}>
          <VendorSelect.ItemLabel>{props.item.rawValue}</VendorSelect.ItemLabel>
        </VendorSelect.Item>
      )}
    >
      <VendorSelect.Trigger aria-label="Pick">
        <VendorSelect.Value<string>>
          {(state) => state.selectedOptions().join(', ')}
        </VendorSelect.Value>
      </VendorSelect.Trigger>
      <VendorSelect.Content>
        <VendorSelect.Listbox />
      </VendorSelect.Content>
    </VendorSelect.Root>
  ))
  const trigger = h.getByRole('button', { name: 'Pick Alpha, Beta' })
  expect(trigger.textContent).toBe('Alpha, Beta')
  setOptions(['Beta', 'Gamma'])
  flush()
  await waitFor(() => expect(trigger.textContent).toBe('Beta'))
  fireEvent.keyDown(trigger, { key: 'ArrowDown' })
  flush()
  const option = await h.findByRole('option', { name: 'Beta' })
  expect(option.getAttribute('aria-selected')).toBe('true')
  checkDiagnostics()
})
