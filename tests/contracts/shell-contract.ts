import { defineShell } from '@wfe/shell'
import type { ShellBindings, ShellViewProps } from '@wfe/shell'
const description = defineShell({
  id: 'workspace',
  audiences: [
    { id: 'operations', label: 'Operations' },
    { id: 'research', label: 'Research' },
  ],
  routes: [
    { id: 'overview', label: 'Overview', view: 'summary' },
    {
      id: 'queue',
      label: 'Queue',
      view: 'records',
      audience: 'operations',
      parent: 'overview',
    },
  ],
})
type Bindings = ShellBindings<typeof description>
const bindings: Bindings = {
  audience: () => 'operations',
  route: () => 'overview',
  href: (route) => `?page=${route}`,
  views: { summary: () => null, records: () => null },
  onAudienceChange: (audience) => {
    const id: 'operations' | 'research' = audience
    void id
  },
  onNavigate: (route) => {
    const id: 'overview' | 'queue' = route
    void id
  },
}
const props: ShellViewProps<typeof description> = { description, bindings }
// @ts-expect-error Accepted audience IDs come from the description.
const unknownAudience: Bindings['audience'] = () => 'missing'
// @ts-expect-error Accepted route IDs come from the description.
const unknownRoute: Bindings['route'] = () => 'missing'
// @ts-expect-error Every referenced page needs an application component.
const missingView: Bindings['views'] = {
  summary: () => null,
}
const unknownView: Bindings['views'] = {
  summary: () => null,
  records: () => null,
  // @ts-expect-error Page bindings do not accept unreferenced component IDs.
  other: () => null,
}
void [props, unknownAudience, unknownRoute, missingView, unknownView]
