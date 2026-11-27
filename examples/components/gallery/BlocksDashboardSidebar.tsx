import { createSignal, For } from 'solid-js'
import { DashboardContent, dashboardTableSections } from './BlocksDashboard'
import { BlockNavigation, BlockShell } from './blocksParts'

export const dashboardGroups = [
  {
    title: 'Overview',
    icon: 'layout',
    sections: ['Platform overview', 'Usage'],
  },
  {
    title: 'Operations',
    icon: 'view',
    sections: ['Deployments', 'Incidents', 'Alerts'],
  },
] as const

export function BlocksDashboardSidebar() {
  const [section, setSection] = createSignal('Platform overview')
  return (
    <BlockShell
      title={section()}
      fillTable={dashboardTableSections.includes(section())}
      navigationLabel="Dashboard navigation"
      navigation={(controls) => (
        <For each={dashboardGroups}>
          {(group) => (
            <BlockNavigation
              title={group.title}
              icon={group.icon}
              sections={group.sections}
              value={section()}
              onChange={setSection}
              controls={controls}
            />
          )}
        </For>
      )}
    >
      <DashboardContent section={section()} />
    </BlockShell>
  )
}
