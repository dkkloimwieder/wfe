import { afterEach, expect, test } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { CollapsibleSection, Icon } from '@wfe/components'
import { TableControlSection } from '@wfe/components/table'

afterEach(cleanup)

test('a section names its summary with the title and count', () => {
  const [opened, setOpened] = createSignal<boolean[]>([])
  const mounted = render(() => (
    <CollapsibleSection
      title="Filters"
      count="2 active"
      onOpenChange={(open) => setOpened([...opened(), open])}
    >
      <input aria-label="Name" />
    </CollapsibleSection>
  ))
  const details = mounted.container.querySelector('details')!
  const summary = details.querySelector('summary')!
  expect(details.classList.contains('ui-section')).toBe(true)
  expect(details.classList.contains('ui-button')).toBe(true)
  expect(details.hasAttribute('data-text-only')).toBe(true)
  expect(details.open).toBe(false)
  expect(summary.textContent).toBe('Filters2 active')
  expect(summary.querySelector('.ui-section-count')?.textContent).toBe(
    '2 active',
  )
  fireEvent.click(summary)
  details.open = true
  fireEvent(details, new Event('toggle'))
  flush()
  expect(opened()).toEqual([true])
})

test('icon, active mark and default open state reach the section', () => {
  const mounted = render(() => (
    <CollapsibleSection
      title="Forms"
      icon={<Icon name="form" />}
      active
      defaultOpen
    >
      <a href="#fields">Fields</a>
    </CollapsibleSection>
  ))
  const details = mounted.container.querySelector('details')!
  expect(details.open).toBe(true)
  expect(details.getAttribute('data-ui-active')).toBe('true')
  expect(details.hasAttribute('data-text-only')).toBe(false)
  expect(details.querySelector('.ui-section-icon svg')).not.toBeNull()
  expect(details.querySelector('.ui-section-count')).toBeNull()
})

test('table control sections are collapsible sections', () => {
  const mounted = render(() => (
    <TableControlSection title="Grouping" summary="0 levels" defaultOpen>
      <span>Levels</span>
    </TableControlSection>
  ))
  const details = mounted.container.querySelector('details')!
  expect(details.classList.contains('ui-section')).toBe(true)
  expect(details.classList.contains('table-control-section')).toBe(true)
  expect(
    details.querySelector('.table-control-content.ui-collapsible-content'),
  ).not.toBeNull()
  expect(details.querySelector('.ui-section-count')?.textContent).toBe(
    '0 levels',
  )
})
