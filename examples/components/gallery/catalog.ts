import {
  accentColors,
  defaultDecorations,
  primaryColors,
  decorationColors,
  secondaryColors,
} from '../../shared/appearance/appearance'
import type { Decorations } from '../../shared/appearance/appearance'
import {
  previewScheme,
  schemeIndex,
} from '../../shared/settings/demoAppearance'
import { isThemePreset } from '../../shared/settings/settingsRecord'
import {
  defaults,
  layersForPreset,
  schemeForPreset,
  states,
} from '../../shared/appearance/galleryConfig'
import type {
  GalleryConfig,
  GalleryState,
} from '../../shared/appearance/galleryConfig'
export {
  states,
  layersForPreset,
  schemeForPreset,
  galleryThemeOptions,
  defaults,
} from '../../shared/appearance/galleryConfig'
export type {
  GalleryConfig,
  GalleryState,
} from '../../shared/appearance/galleryConfig'
export const entries = [
  {
    id: 'blocks-tenant-admin',
    label: 'Tenant administration',
    group: 'Blocks',
    states: ['normal'],
  },
  {
    id: 'blocks-records',
    label: 'Records workspace',
    group: 'Blocks',
    states: ['normal'],
  },
  {
    id: 'blocks-dashboard',
    label: 'Platform dashboard',
    group: 'Blocks',
    states: ['normal'],
  },
  {
    id: 'blocks-tenant-admin-sidebar',
    label: 'Tenant administration (sidebar)',
    group: 'Blocks',
    states: ['normal'],
  },
  {
    id: 'blocks-records-sidebar',
    label: 'Records workspace (sidebar)',
    group: 'Blocks',
    states: ['normal'],
  },
  {
    id: 'blocks-dashboard-sidebar',
    label: 'Platform dashboard (sidebar)',
    group: 'Blocks',
    states: ['normal'],
  },
  {
    id: 'blocks-tenant-settings',
    label: 'Tenant settings',
    group: 'Blocks',
    states: ['normal'],
  },
  {
    id: 'blocks-billing',
    label: 'Billing and usage',
    group: 'Blocks',
    states: ['normal'],
  },
  {
    id: 'blocks-app-catalog',
    label: 'Application catalog',
    group: 'Blocks',
    states: ['normal'],
  },
  {
    id: 'blocks-user-detail',
    label: 'User access',
    group: 'Blocks',
    states: ['normal'],
  },
  {
    id: 'blocks-create-tenant',
    label: 'Create tenant',
    group: 'Blocks',
    states: ['normal'],
  },
  {
    id: 'blocks-integrations',
    label: 'Integrations and webhooks',
    group: 'Blocks',
    states: ['normal'],
  },
  {
    id: 'blocks-issue-tracker',
    label: 'Issue tracker',
    group: 'Blocks',
    states: ['normal'],
  },
  {
    id: 'blocks-admin-app',
    label: 'Admin application',
    group: 'Blocks',
    states: ['normal'],
  },
  {
    id: 'blocks-user-home',
    label: 'Member home',
    group: 'Blocks',
    states: ['normal'],
  },
  {
    id: 'blocks-user-support',
    label: 'Customer support portal',
    group: 'Blocks',
    states: ['normal'],
  },
  {
    id: 'blocks-user-account',
    label: 'Account',
    group: 'Blocks',
    states: ['normal'],
  },
  {
    id: 'blocks-user-preferences',
    label: 'Preferences',
    group: 'Blocks',
    states: ['normal'],
  },
  {
    id: 'blocks-user-notifications',
    label: 'Notifications inbox',
    group: 'Blocks',
    states: ['normal'],
  },
  {
    id: 'blocks-user-invitation',
    label: 'Invitation and onboarding',
    group: 'Blocks',
    states: ['normal'],
  },
  { id: 'tree', label: 'Tree', group: 'Navigation', states: ['normal'] },
  {
    id: 'workflow',
    label: 'Workflow diagrams',
    group: 'Diagrams',
    states: ['normal'],
  },
  {
    id: 'erd',
    label: 'Entity relationships',
    group: 'Diagrams',
    states: ['normal'],
  },
  {
    id: 'chart-financial',
    label: 'Financial and comparison charts',
    group: 'Charts',
    states: ['normal'],
  },
  {
    id: 'chart-statistics',
    label: 'Statistical charts',
    group: 'Charts',
    states: ['normal'],
  },
  {
    id: 'chart-descriptions',
    label: 'Chart descriptions',
    group: 'Charts',
    states: ['normal'],
  },
  {
    id: 'chart-focus-context',
    label: 'Time-series navigation',
    group: 'Charts',
    states: ['normal'],
  },
  {
    id: 'chart-time-series',
    label: 'Time-series charts',
    group: 'Charts',
    states: ['normal'],
  },
  {
    id: 'chart-layers',
    label: 'Layered charts',
    group: 'Charts',
    states: ['normal'],
  },
  {
    id: 'chart-data',
    label: 'Chart transforms',
    group: 'Charts',
    states: ['normal'],
  },
  {
    id: 'chart-polar',
    label: 'Polar charts',
    group: 'Charts',
    states: ['normal'],
  },
  {
    id: 'calendar-ranges',
    label: 'Calendar ranges',
    group: 'Forms',
    states: ['normal', 'disabled', 'readonly'],
  },
  {
    id: 'toggles',
    label: 'Toggles and groups',
    group: 'Forms',
    states: ['normal', 'disabled', 'readonly'],
  },
  {
    id: 'sliders',
    label: 'Sliders and ranges',
    group: 'Forms',
    states: ['normal', 'disabled', 'readonly', 'invalid'],
  },
  {
    id: 'context-menu',
    label: 'Context menus',
    group: 'Components',
    states: ['normal'],
  },
  {
    id: 'commands',
    label: 'Commands and search',
    group: 'Navigation',
    states: ['normal'],
  },
  {
    id: 'themes',
    label: 'Theme boundaries',
    group: 'Components',
    states: ['normal'],
  },
  { id: 'gantt', label: 'Gantt', group: 'Components', states: ['normal'] },
  {
    id: 'drag-and-drop',
    label: 'Drag and drop',
    group: 'Components',
    states: ['normal'],
  },
  {
    id: 'kanban',
    label: 'Issue board',
    group: 'Components',
    states: ['normal'],
  },
  {
    id: 'decoration-geometry',
    label: 'Decoration geometry',
    group: 'Components',
    states: ['normal'],
  },
  { id: 'icons', label: 'Icons', group: 'Components', states: ['normal'] },
  {
    id: 'input-decoration',
    label: 'Input decoration',
    group: 'Forms',
    states: ['normal'],
  },
  {
    id: 'form-actions',
    label: 'Form actions',
    group: 'Forms',
    states: ['normal'],
  },
  {
    id: 'column-controls',
    label: 'Column controls and row actions',
    group: 'Tables',
    states: ['normal'],
  },
  {
    id: 'contexts',
    label: 'Context switcher',
    group: 'Navigation',
    states: ['normal'],
  },
  { id: 'entry', label: 'Entry panel', group: 'Layout', states: ['normal'] },
  {
    id: 'dashboard-layout',
    label: 'Dashboard layout',
    group: 'Layout',
    states: ['normal'],
  },
  {
    id: 'everything',
    label: 'Everything form',
    group: 'Forms',
    states: ['normal'],
  },
  { id: 'fields', label: 'Fields', group: 'Forms', states },
  {
    id: 'buttons',
    label: 'Buttons',
    group: 'Components',
    states: ['normal', 'disabled'],
  },
  { id: 'choices', label: 'Select and combobox', group: 'Forms', states },
  {
    id: 'booleans',
    label: 'Checkbox, switch and radio',
    group: 'Forms',
    states,
  },
  {
    id: 'numbers',
    label: 'Numbers',
    group: 'Forms',
    states: ['normal', 'disabled', 'readonly'],
  },
  { id: 'colors', label: 'Color picker', group: 'Forms', states: ['normal'] },
  { id: 'dates', label: 'Date, time and datetime', group: 'Forms', states },
  {
    id: 'files',
    label: 'File selection',
    group: 'Forms',
    states: ['normal', 'disabled', 'readonly'],
  },
  {
    id: 'tabs',
    label: 'Tabs',
    group: 'Navigation',
    states: ['normal', 'disabled'],
  },
  {
    id: 'breadcrumbs',
    label: 'Breadcrumbs',
    group: 'Navigation',
    states: ['normal'],
  },
  { id: 'step-list', label: 'Steps', group: 'Navigation', states: ['normal'] },
  {
    id: 'sidebar-links',
    label: 'Sidebar links',
    group: 'Navigation',
    states: ['normal'],
  },
  {
    id: 'collapsible',
    label: 'Collapsible',
    group: 'Layout',
    states: ['normal'],
  },
  { id: 'accordion', label: 'Accordion', group: 'Layout', states: ['normal'] },
  {
    id: 'resizable',
    label: 'Resizable panes',
    group: 'Layout',
    states: ['normal', 'disabled'],
  },
  {
    id: 'overlays',
    label: 'Popover, menu and tooltip',
    group: 'Components',
    states: ['normal'],
  },
  {
    id: 'dialogs',
    label: 'Dialogs and confirmations',
    group: 'Components',
    states: ['normal'],
  },
  {
    id: 'display',
    label: 'Display and status',
    group: 'Components',
    states: ['normal'],
  },
  {
    id: 'meter',
    label: 'Usage meter',
    group: 'Components',
    states: ['normal'],
  },
  {
    id: 'summary-list',
    label: 'Summary list',
    group: 'Components',
    states: ['normal'],
  },
  {
    id: 'pagination',
    label: 'Pagination and header actions',
    group: 'Tables',
    states: ['normal'],
  },
  { id: 'table', label: 'Table', group: 'Tables', states: ['normal'] },
  {
    id: 'subtables',
    label: 'Sub-tables',
    group: 'Tables',
    states: ['normal'],
  },
] as const
export type GalleryId = (typeof entries)[number]['id']
export type GalleryRoute = GalleryConfig & {
  id: GalleryId
  viewport: 'full' | 'tablet' | 'phone'
}
export const entryFor = (id: string | null) =>
  entries.find((entry) => entry.id === id) ??
  entries.find((entry) => entry.id === 'fields')!
const integer = (value: unknown, max: number) =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= 0 &&
  value <= max
export function galleryOverrides(url: URL) {
  const preset = url.searchParams.get('preset')
  return {
    preset: isThemePreset(preset) ? preset : undefined,
    scheme: previewScheme(url.searchParams.get('scheme')),
  }
}

export function readRoute(
  url: URL,
  fallback?: Pick<GalleryRoute, 'preset' | 'scheme'>,
): GalleryRoute {
  const id = entryFor(
    url.searchParams.get('gallery') ?? url.searchParams.get('galleryPreview'),
  ).id
  const number = (key: string, fallback: number, max: number) => {
    const raw = url.searchParams.get(key)
    const n = raw === null || !/^\d+$/.test(raw) ? fallback : Number(raw)
    return integer(n, max) ? n : fallback
  }
  const override = galleryOverrides(url)
  const preset = override.preset ?? fallback?.preset ?? 'default'
  const layers = layersForPreset(preset)
  const state = url.searchParams.get('state') as GalleryState
  const viewport = url.searchParams.get('viewport')
  return {
    id,
    preset,
    decorations: {
      secondary: number(
        'secondary',
        defaults.decorations.secondary,
        secondaryColors.length - 1,
      ),
      dots: number('dots', defaultDecorations.dots, 100),
      border: number('border', defaultDecorations.border, 100),
      inside: number('inside', defaultDecorations.inside, 100),
      dotColor:
        decorationColors.find(
          (value) => value === url.searchParams.get('dotColor'),
        ) ?? 'neutral',
      borderColor:
        decorationColors.find(
          (value) => value === url.searchParams.get('borderColor'),
        ) ?? 'neutral',
    },
    scheme: override.scheme
      ? schemeIndex[override.scheme]
      : (fallback?.scheme ?? schemeForPreset(preset)),
    primary: number('primary', defaults.primary, primaryColors.length - 1),
    accent: number('accent', defaults.accent, accentColors.length - 1),
    layers: {
      canvas: number('canvas', layers.canvas, 2) as 0 | 1 | 2,
      pane: number('pane', layers.pane, 2) as 0 | 1 | 2,
      content: number('content', layers.content, 2) as 0 | 1 | 2,
    },
    state: (entryFor(id).states as readonly string[]).includes(state)
      ? state
      : 'normal',
    viewport: viewport === 'phone' || viewport === 'tablet' ? viewport : 'full',
  }
}
export function galleryUrl(
  base: URL,
  route: GalleryRoute,
  appearance: { preset?: GalleryRoute['preset']; scheme?: number },
) {
  const url = new URL(base)
  url.search = ''
  url.hash = ''
  url.searchParams.set('gallery', route.id)
  if (appearance.preset) url.searchParams.set('preset', appearance.preset)
  if (appearance.scheme !== undefined)
    url.searchParams.set('scheme', String(appearance.scheme))
  for (const [key, value, fallback] of [
    ...Object.entries(defaults.decorations).map(
      ([key, fallback]) =>
        [key, route.decorations[key as keyof Decorations], fallback] as const,
    ),
    ['primary', route.primary, defaults.primary],
    ['accent', route.accent, defaults.accent],
    ['canvas', route.layers.canvas, layersForPreset(route.preset).canvas],
    ['pane', route.layers.pane, layersForPreset(route.preset).pane],
    ['content', route.layers.content, layersForPreset(route.preset).content],
    ['state', route.state, 'normal'],
    ['viewport', route.viewport, 'full'],
  ] as const)
    if (value !== fallback) url.searchParams.set(key, String(value))
  return url
}
