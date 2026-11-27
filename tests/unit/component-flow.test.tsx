import { afterEach, expect, expectTypeOf, test, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import {
  CheckboxField,
  FormGrid,
  Meter,
  StepList,
  SummaryList,
  SwitchField,
} from '@wfe/components'
import { SidebarLink } from '@wfe/components/layout'

afterEach(cleanup)

test('meter announces the highest reached threshold and reports actual overage', () => {
  const [usage, setUsage] = createSignal(84)
  const h = render(() => (
    <Meter
      label="Requests"
      value={usage()}
      max={100}
      thresholds={[
        { at: 101, tone: 'error', label: 'Over the limit' },
        { at: 80, tone: 'warning', label: 'Approaching limit' },
        { at: 40, tone: 'success', label: 'Within limit' },
      ]}
    />
  ))
  const meter = h.getByRole('meter', { name: 'Requests' })
  expect(meter.getAttribute('aria-valuemax')).toBe('100')
  expect(meter.getAttribute('aria-valuenow')).toBe('84')
  expect(meter.getAttribute('aria-valuetext')).toBe(
    '84 of 100. Approaching limit',
  )
  expect(meter.closest('[data-tone]')?.getAttribute('data-tone')).toBe(
    'warning',
  )
  setUsage(120)
  flush()
  expect(meter.getAttribute('aria-valuenow')).toBe('100')
  expect(meter.getAttribute('aria-valuetext')).toBe(
    '120 of 100. Over the limit',
  )
  expect(h.getByText('Over the limit')).toBeTruthy()
  setUsage(-20)
  flush()
  expect(meter.getAttribute('aria-valuenow')).toBe('0')
  expect(meter.getAttribute('aria-valuetext')).toBe('0 of 100')
})

test('steps expose completion, request reachable changes, and keep the current step controlled', () => {
  const [current, setCurrent] = createSignal('plan')
  const request = vi.fn()
  const steps = [
    { id: 'details', label: 'Details' },
    { id: 'plan', label: 'Plan' },
    { id: 'review', label: 'Review' },
    { id: 'confirm', label: 'Confirm', reachable: true },
  ]
  const h = render(() => (
    <StepList steps={steps} current={current()} onStepChange={request} />
  ))
  const details = h.getByRole('button', {
    name: 'Details',
    description: 'Complete',
  })
  const plan = h.getByRole('button', { name: 'Plan' })
  const review = h.getByRole<HTMLButtonElement>('button', { name: 'Review' })
  const confirm = h.getByRole('button', { name: 'Confirm' })
  expect(plan.getAttribute('aria-current')).toBe('step')
  expect(review.disabled).toBe(true)
  fireEvent.click(review)
  fireEvent.click(plan)
  expect(request).not.toHaveBeenCalled()
  fireEvent.click(details)
  fireEvent.click(confirm)
  expect(request.mock.calls).toEqual([['details'], ['confirm']])
  expect(plan.getAttribute('aria-current')).toBe('step')
  setCurrent('review')
  flush()
  expect(review.disabled).toBe(false)
  expect(review.getAttribute('aria-current')).toBe('step')
  expect(h.getByRole('button', { name: 'Plan', description: 'Complete' })).toBe(
    plan,
  )
})

test('summary renders native terms and descriptions and updates the values', () => {
  const [value, setValue] = createSignal('Northwind')
  const h = render(() => (
    <SummaryList
      items={[
        { label: 'Customer', value: <strong>{value()}</strong> },
        { label: 'Seats', value: 0 },
      ]}
    />
  ))
  const list = h.container.querySelector('dl')
  expect(list).toBeTruthy()
  expect(
    Array.from(list!.querySelectorAll('dt'), (node) => node.textContent),
  ).toEqual(['Customer', 'Seats'])
  expect(
    Array.from(list!.querySelectorAll('dd'), (node) => node.textContent),
  ).toEqual(['Northwind', '0'])
  setValue('Contoso')
  flush()
  expect(list!.querySelector('dd strong')?.textContent).toBe('Contoso')
})

test('boolean field labels activate native inputs and describe named form values', () => {
  const [description, setDescription] = createSignal<string | undefined>(
    'Include all receipt files.',
  )
  const checkboxChange = vi.fn<(checked: boolean) => void>()
  const switchChange = vi.fn<(checked: boolean) => void>()
  const h = render(() => (
    <form aria-label="Settings">
      <CheckboxField
        label="Include receipts"
        description={description()}
        name="receipts"
        onCheckedChange={(checked) => {
          expectTypeOf(checked).toEqualTypeOf<boolean>()
          checkboxChange(checked)
        }}
      />
      <SwitchField
        label="Send emails"
        description="Use the account address."
        name="emails"
        value="daily"
        onCheckedChange={(checked) => {
          expectTypeOf(checked).toEqualTypeOf<boolean>()
          switchChange(checked)
        }}
      />
      <CheckboxField aria-label="Select this record" disabled />
    </form>
  ))
  const receipts = h.getByRole<HTMLInputElement>('checkbox', {
    name: 'Include receipts',
    description: 'Include all receipt files.',
  })
  const emails = h.getByRole<HTMLInputElement>('switch', {
    name: 'Send emails',
    description: 'Use the account address.',
  })
  fireEvent.click(h.getByText('Include receipts'))
  fireEvent.click(h.getByText('Send emails'))
  flush()
  expect(receipts.checked).toBe(true)
  expect(emails.checked).toBe(true)
  expect(checkboxChange).toHaveBeenCalledExactlyOnceWith(true)
  expect(switchChange).toHaveBeenCalledExactlyOnceWith(true)
  const form = h.getByRole<HTMLFormElement>('form', { name: 'Settings' })
  expect([...new FormData(form)]).toEqual([
    ['receipts', 'on'],
    ['emails', 'daily'],
  ])
  expect(
    h.getByRole<HTMLInputElement>('checkbox', { name: 'Select this record' })
      .disabled,
  ).toBe(true)
  setDescription(undefined)
  flush()
  expect(receipts.hasAttribute('aria-describedby')).toBe(false)
})

test('sidebar link keeps modified clicks native and moves focus after an app selection', async () => {
  const [active, setActive] = createSignal(false)
  const closeGroup = vi.fn()
  const closeNavigation = vi.fn()
  const scrollTo = vi.fn()
  let destination: HTMLHeadingElement | undefined
  const select = vi.fn(() => setActive(true))
  const h = render(() => (
    <>
      <SidebarLink
        href="#activity"
        active={active()}
        onSelect={select}
        closeGroup={closeGroup}
        closeNavigation={closeNavigation}
        focusTarget={() => destination}
        scrollTarget={() => destination}
      >
        Activity
      </SidebarLink>
      <SidebarLink href="#download" download onSelect={select}>
        Download
      </SidebarLink>
      <SidebarLink
        href="#cancelled"
        onClick={(event) => event.preventDefault()}
        onSelect={select}
      >
        Cancelled
      </SidebarLink>
      <h2
        ref={(node) => {
          destination = node
          node.scrollTo = scrollTo
        }}
        tabindex={-1}
        id="activity"
      >
        Project activity
      </h2>
    </>
  ))
  const link = h.getByRole('link', { name: 'Activity' })
  for (const options of [
    { ctrlKey: true },
    { metaKey: true },
    { altKey: true },
    { shiftKey: true },
    { button: 1 },
  ]) {
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      ...options,
    })
    fireEvent(link, event)
    expect(event.defaultPrevented).toBe(false)
  }
  fireEvent.click(h.getByRole('link', { name: 'Download' }))
  fireEvent.click(h.getByRole('link', { name: 'Cancelled' }))
  expect(select).not.toHaveBeenCalled()
  expect(closeGroup).not.toHaveBeenCalled()
  expect(closeNavigation).not.toHaveBeenCalled()
  link.focus()
  expect(fireEvent.click(link)).toBe(false)
  flush()
  await Promise.resolve()
  expect(select).toHaveBeenCalledOnce()
  expect(closeGroup).toHaveBeenCalledOnce()
  expect(closeNavigation).toHaveBeenCalledOnce()
  expect(scrollTo).toHaveBeenCalledWith(0, 0)
  expect(link.getAttribute('aria-current')).toBe('page')
  expect(document.activeElement).toBe(destination)
})

test('the form grid footer submits the grid fields and plain grids still render a div', () => {
  const submitted = vi.fn()
  const h = render(() => (
    <>
      <FormGrid data-testid="plain">Plain grid</FormGrid>
      <FormGrid
        as="form"
        aria-label="Grid form"
        novalidate
        columns={2}
        onSubmit={(event) => {
          event.preventDefault()
          submitted(new FormData(event.currentTarget).get('name'))
        }}
        footer={<button type="submit">Save</button>}
      >
        <input name="name" value="Report" />
      </FormGrid>
    </>
  ))
  const form = h.getByRole<HTMLFormElement>('form', { name: 'Grid form' })
  const save = h.getByRole<HTMLButtonElement>('button', { name: 'Save' })
  expect(save.form).toBe(form)
  expect(form.noValidate).toBe(true)
  expect(form.querySelector('[data-columns="2"]')?.contains(save)).toBe(false)
  fireEvent.click(save)
  expect(submitted).toHaveBeenCalledExactlyOnceWith('Report')
  expect(h.getByTestId('plain').tagName).toBe('DIV')
})
