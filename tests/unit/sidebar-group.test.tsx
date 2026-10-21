import { afterEach, expect, test } from 'vitest'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { createSignal, flush, onCleanup } from 'solid-js'
import { Icon } from '@wfe/components'
import { SidebarGroup } from '@wfe/components/layout'

afterEach(cleanup)

test('text-only headings omit the icon slot and retain controlled disclosure state', () => {
  const [icon, setIcon] = createSignal(false)
  const [open, setOpen] = createSignal(false)
  const mounted = render(() => (
    <SidebarGroup
      label="Reports"
      icon={icon() ? <Icon name="form" /> : undefined}
      compact={false}
      open={open()}
      onOpenChange={setOpen}
      onExpand={() => {}}
    >
      {() => <a href="#report">Report</a>}
    </SidebarGroup>
  ))
  const summary = mounted.container.querySelector('summary')!
  const details = mounted.container.querySelector('details')!
  expect(mounted.container.querySelector('.ui-sidebar-group-icon')).toBeNull()
  summary.focus()
  fireEvent.click(summary)
  flush()
  expect(details.open).toBe(true)
  setIcon(true)
  flush()
  expect(
    mounted.container.querySelector('.ui-sidebar-group-icon'),
  ).not.toBeNull()
  expect(mounted.container.querySelector('summary')).toBe(summary)
  expect(document.activeElement).toBe(summary)
  setIcon(false)
  flush()
  expect(mounted.container.querySelector('.ui-sidebar-group-icon')).toBeNull()
  expect(details.open).toBe(true)
})

for (const behavior of ['flyout', 'expand'] as const) {
  test(`compact ${behavior} uses a visible Unicode initial and retains the full name`, () => {
    const [label, setLabel] = createSignal('🗂 Reports')
    const [icon, setIcon] = createSignal(false)
    let opens = 0,
      expansions = 0
    const mounted = render(() => (
      <SidebarGroup
        label={label()}
        icon={icon() ? <Icon name="form" /> : undefined}
        compact
        open={false}
        behavior={behavior}
        onOpenChange={() => {
          opens++
        }}
        onExpand={() => {
          expansions++
        }}
      >
        {() => <a href="#report">Report</a>}
      </SidebarGroup>
    ))
    const button = mounted.getByRole('button', { name: '🗂 Reports' })
    expect(button.textContent).toBe('🗂')
    expect(button.title).toBe('🗂 Reports')
    button.focus()
    setLabel('Archive')
    setIcon(true)
    flush()
    expect(mounted.getByRole('button', { name: 'Archive' })).toBe(button)
    expect(button.querySelector('svg')).not.toBeNull()
    setIcon(false)
    flush()
    expect(button.textContent).toBe('A')
    expect(document.activeElement).toBe(button)
    if (behavior === 'expand') {
      fireEvent.click(button)
      flush()
      expect(opens).toBe(1)
      expect(expansions).toBe(1)
    }
    mounted.unmount()
    fireEvent.click(button)
    expect(expansions).toBe(behavior === 'expand' ? 1 : 0)
  })
}

test('the icon mounts once and survives sidebar presentation changes', () => {
  const [compact, setCompact] = createSignal(false)
  const [visible, setVisible] = createSignal(true)
  let mounts = 0
  let disposals = 0
  function TrackedIcon() {
    mounts++
    onCleanup(() => disposals++)
    return (
      <svg data-testid="sidebar-icon">
        <path d="M0 0L1 1" />
      </svg>
    )
  }
  const mounted = render(() => (
    <SidebarGroup
      label="Reports"
      icon={visible() ? <TrackedIcon /> : undefined}
      compact={compact()}
      behavior="expand"
      open={false}
      onOpenChange={() => {}}
      onExpand={() => {}}
    >
      {() => <a href="#report">Report</a>}
    </SidebarGroup>
  ))
  const icon = mounted.getByTestId('sidebar-icon')
  expect(mounts).toBe(1)
  for (const state of [true, false, true]) {
    setCompact(state)
    flush()
    expect(mounted.getByTestId('sidebar-icon')).toBe(icon)
    expect(mounts).toBe(1)
    expect(disposals).toBe(0)
  }
  setVisible(false)
  flush()
  expect(mounted.queryByTestId('sidebar-icon')).toBeNull()
  expect(disposals).toBe(1)
  setVisible(true)
  flush()
  expect(mounts).toBe(2)
  mounted.unmount()
  expect(disposals).toBe(2)
})
