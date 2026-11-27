import { For, createSignal } from 'solid-js'
import {
  Button,
  Meter,
  StepList,
  SummaryList,
  ValueDisplay,
} from '@wfe/components'
import {
  DashboardPanel,
  DashboardShell,
  SidebarGroup,
  SidebarLink,
} from '@wfe/components/layout'

const usageThresholds = [
  { at: 0, tone: 'success', label: 'Within limit' },
  { at: 80, tone: 'warning', label: 'Approaching limit' },
  { at: 101, tone: 'error', label: 'Over the monthly limit' },
] as const
export function MeterExample() {
  const [requests, setRequests] = createSignal(62)
  return (
    <div class="example-stack">
      <Meter
        label="Monthly requests"
        value={requests()}
        max={100}
        thresholds={usageThresholds}
      />
      <div class="example-actions">
        <Button onClick={() => setRequests((value) => value + 20)}>
          Add 20 requests
        </Button>
        <Button onClick={() => setRequests(62)}>Reset usage</Button>
      </div>
    </div>
  )
}

const steps = [
  { id: 'details', label: 'Details' },
  { id: 'plan', label: 'Plan' },
  { id: 'review', label: 'Review' },
] as const
export function StepListExample() {
  const [current, setCurrent] = createSignal<string>('plan')
  const index = () => steps.findIndex((step) => step.id === current())
  return (
    <div class="example-stack">
      <StepList steps={steps} current={current()} onStepChange={setCurrent} />
      <Button
        disabled={index() === steps.length - 1}
        onClick={() => {
          const next = steps[index() + 1]
          if (next) setCurrent(next.id)
        }}
      >
        Next step
      </Button>
    </div>
  )
}

export function SummaryListExample() {
  return (
    <SummaryList
      items={[
        { label: 'Customer', value: 'Northwind' },
        { label: 'Contact', value: 'billing-confirmations@northwind.example' },
        {
          label: 'Due date',
          value: <ValueDisplay value="2026-12-01" format="date-long" />,
        },
      ]}
    />
  )
}

const destinations = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Review the project status.',
  },
  {
    id: 'activity',
    label: 'Activity',
    description: 'Review recent updates to the project.',
  },
] as const
export function SidebarLinkExample() {
  const [selected, setSelected] = createSignal<(typeof destinations)[number]>(
    destinations[0],
  )
  const [open, setOpen] = createSignal(true)
  const [compact, setCompact] = createSignal(false)
  let heading: HTMLHeadingElement | undefined
  return (
    <DashboardShell
      header={<span data-ui-text="system">Release project</span>}
      mainAs="section"
      mainLabel="Project view"
      mainPadding="none"
      style={{ 'min-block-size': 'calc(8 * var(--ui-row-height, 32px))' }}
      navigationLabel="Project sections"
      toggleLabel="Open project sections"
      closeLabel="Close project sections"
      navigationCollapsed={compact()}
      onNavigationCollapsedChange={setCompact}
      navigation={(controls) => (
        <SidebarGroup
          label="Project"
          active
          compact={controls.compact()}
          open={open()}
          onOpenChange={setOpen}
          onExpand={() => setCompact(false)}
        >
          {(close) => (
            <For each={destinations}>
              {(destination) => (
                <SidebarLink
                  href={`#project-${destination.id}`}
                  active={destination === selected()}
                  onSelect={() => setSelected(destination)}
                  closeGroup={close}
                  closeNavigation={controls.close}
                  focusTarget={() => heading}
                  scrollTarget={() =>
                    heading?.closest<HTMLElement>('.ui-dashboard-main')
                  }
                >
                  {destination.label}
                </SidebarLink>
              )}
            </For>
          )}
        </SidebarGroup>
      )}
    >
      <DashboardPanel class="example-stack" fill>
        <h2 ref={heading} tabindex={-1} id={`project-${selected().id}`}>
          {selected().label}
        </h2>
        <p>{selected().description}</p>
      </DashboardPanel>
    </DashboardShell>
  )
}
