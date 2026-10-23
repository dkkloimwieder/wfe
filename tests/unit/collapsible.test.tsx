import assert from 'node:assert/strict'
import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { Collapsible } from '@wfe/components/collapsible'
import { TableControlSection, TableDetailToggle } from '@wfe/components/table'

afterEach(cleanup)

test('controlled requests can be accepted or rejected without toggle echoes', () => {
  const [open, setOpen] = createSignal(true)
  let accept = false
  const requests = vi.fn((next: boolean) => {
    if (accept) setOpen(next)
  })
  const h = render(() => (
    <Collapsible summary="Details" open={open()} onOpenChange={requests}>
      <input />
    </Collapsible>
  ))
  const node = h.container.querySelector('details')!
  const summary = h.container.querySelector('summary')!
  summary.click()
  flush()
  expect(node.open).toBe(true)
  expect(requests.mock.calls).toEqual([[false]])
  accept = true
  summary.click()
  flush()
  expect(node.open).toBe(false)
  node.dispatchEvent(new Event('toggle'))
  expect(requests.mock.calls).toEqual([[false], [false]])
  setOpen(true)
  flush()
  node.dispatchEvent(new Event('toggle'))
  expect(node.open).toBe(true)
  expect(requests).toHaveBeenCalledTimes(2)
})

test('external close restores focus and retains input identity and state', () => {
  const [open, setOpen] = createSignal(true)
  const h = render(() => (
    <Collapsible open={open()} summary="Details">
      <input />
    </Collapsible>
  ))
  const input = h.container.querySelector('input')!
  input.value = 'Unsaved draft'
  input.focus()
  setOpen(false)
  flush()
  expect(document.activeElement).toBe(h.container.querySelector('summary'))
  setOpen(true)
  flush()
  expect(h.container.querySelector('input')).toBe(input)
  expect(input.value).toBe('Unsaved draft')
})

test('table sections retain native reveal and detached listeners stop callbacks', () => {
  const change = vi.fn()
  const click = vi.fn()
  const h = render(() => (
    <>
      <TableControlSection title="Filters">
        <input />
      </TableControlSection>
      <Collapsible summary="Native" onOpenChange={change} onClick={click}>
        Body
      </Collapsible>
    </>
  ))
  const [table, generic] = Array.from(h.container.querySelectorAll('details'))
  assert(table && generic)
  table.open = true
  expect(table.open).toBe(true)
  generic.open = true
  generic.dispatchEvent(new Event('toggle'))
  expect(change.mock.calls).toEqual([[true]])
  generic.dispatchEvent(new Event('toggle'))
  expect(change).toHaveBeenCalledTimes(1)
  h.unmount()
  generic.open = false
  generic.dispatchEvent(new Event('toggle'))
  generic.click()
  expect(change).toHaveBeenCalledTimes(1)
  expect(click).not.toHaveBeenCalled()
})

test('native attributes, classes, refs and interactive summary content survive updates', () => {
  const [revision, setRevision] = createSignal(0)
  const request = vi.fn()
  const refs = vi.fn()
  const clicks = vi.fn()
  const h = render(() => (
    <Collapsible
      id={'section-' + revision()}
      onClick={clicks}
      ref={(node) => {
        refs(node)
      }}
      class={['caller', { revised: revision() > 0 }]}
      contentClass="body-slot"
      open={true}
      onOpenChange={request}
      summary={
        <>
          <span>Details</span>
          <button type="button">Action</button>
        </>
      }
    >
      Body
    </Collapsible>
  ))
  const node = h.container.querySelector('details')!
  h.getByRole('button').click()
  expect(request).not.toHaveBeenCalled()
  expect(clicks).toHaveBeenCalledTimes(1)
  setRevision(1)
  flush()
  expect(h.container.querySelector('details')).toBe(node)
  expect(node.id).toBe('section-1')
  expect(new Set(node.classList)).toEqual(
    new Set(['caller', 'revised', 'ui-collapsible']),
  )
  expect(node.querySelector('.body-slot.ui-collapsible-content')).not.toBeNull()
  expect(refs).toHaveBeenCalledTimes(1)
})

test('disclosure indicators have unique patterns and do not replace their control semantics', () => {
  const requests = vi.fn()
  const h = render(() => (
    <>
      <Collapsible
        summary="Section"
        indicatorPlacement="end"
        open={false}
        onOpenChange={requests}
      >
        Content
      </Collapsible>
      <TableDetailToggle
        rowId="one"
        contentId="detail-one"
        expanded={false}
        onExpandedChange={requests}
      />
    </>
  ))
  const indicators = [
    ...h.container.querySelectorAll('.ui-disclosure-indicator'),
  ]
  expect(indicators).toHaveLength(2)
  const ids = indicators.map((svg) => svg.querySelector('pattern')!.id)
  expect(new Set(ids).size).toBe(2)
  indicators.forEach((svg, index) => {
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.getAttribute('focusable')).toBe('false')
    expect(svg.hasAttribute('tabindex')).toBe(false)
    expect(
      svg.querySelector('.ui-disclosure-decoration')!.getAttribute('fill'),
    ).toBe(`url(#${ids[index]})`)
  })
  const summary = h.container.querySelector('summary')!
  expect(summary.dataset.indicatorPlacement).toBe('end')
  summary.click()
  h.getByRole('button', { name: 'Expand details for row one' }).click()
  expect(requests.mock.calls).toEqual([[true], [true]])
  expect(h.container.querySelector('details')!.open).toBe(false)
})
