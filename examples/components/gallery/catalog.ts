import {
  defaultDecorations,
  defaultLayers,
  decorationColors,
  secondaryAccents,
} from '../../shared/appearance/appearance'
import type { Decorations } from '../../shared/appearance/appearance'
export const states = ['normal', 'disabled', 'readonly', 'invalid'] as const
export type GalleryState = (typeof states)[number]
export const entries = [
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
  { id: 'dates', label: 'Date and datetime', group: 'Forms', states },
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
export type GalleryConfig = {
  decorations: Decorations
  scheme: number
  accent: number
  depth: 0 | 1 | 2 | 3
  layers: { canvas: 0 | 1 | 2; pane: 0 | 1 | 2; content: 0 | 1 | 2 }
  state: GalleryState
}
export type GalleryRoute = GalleryConfig & {
  id: GalleryId
  viewport: 'full' | 'tablet' | 'phone'
}
export const defaults: GalleryConfig = {
  decorations: defaultDecorations,
  scheme: 1,
  accent: 1,
  depth: 2,
  layers: { ...defaultLayers },
  state: 'normal',
}
export const entryFor = (id: string | null) =>
  entries.find((entry) => entry.id === id) ??
  entries.find((entry) => entry.id === 'fields')!
const integer = (value: unknown, max: number) =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= 0 &&
  value <= max
export function readRoute(url: URL): GalleryRoute {
  const id = entryFor(
    url.searchParams.get('gallery') ?? url.searchParams.get('galleryPreview'),
  ).id
  const number = (key: string, fallback: number, max: number) => {
    const raw = url.searchParams.get(key)
    const n = raw === null || !/^\d+$/.test(raw) ? fallback : Number(raw)
    return integer(n, max) ? n : fallback
  }
  const state = url.searchParams.get('state') as GalleryState
  const viewport = url.searchParams.get('viewport')
  return {
    id,
    decorations: {
      secondary: number('secondary', 1, secondaryAccents.length - 1),
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
    scheme: number('scheme', 1, 2),
    accent: number('accent', 1, 8),
    depth: number('depth', 2, 3) as GalleryConfig['depth'],
    layers: {
      canvas: number('canvas', defaultLayers.canvas, 2) as 0 | 1 | 2,
      pane: number('pane', defaultLayers.pane, 2) as 0 | 1 | 2,
      content: number('content', defaultLayers.content, 2) as 0 | 1 | 2,
    },
    state: (entryFor(id).states as readonly string[]).includes(state)
      ? state
      : 'normal',
    viewport: viewport === 'phone' || viewport === 'tablet' ? viewport : 'full',
  }
}
export function galleryUrl(base: URL, route: GalleryRoute, preview = false) {
  const url = new URL(base)
  url.search = ''
  url.hash = ''
  url.searchParams.set(preview ? 'galleryPreview' : 'gallery', route.id)
  for (const [key, value, fallback] of [
    ...Object.entries(defaultDecorations).map(
      ([key, fallback]) =>
        [key, route.decorations[key as keyof Decorations], fallback] as const,
    ),
    ['scheme', route.scheme, 1],
    ['accent', route.accent, 1],
    ['depth', route.depth, 2],
    ['canvas', route.layers.canvas, defaultLayers.canvas],
    ['pane', route.layers.pane, defaultLayers.pane],
    ['content', route.layers.content, defaultLayers.content],
    ['state', route.state, 'normal'],
    ['viewport', route.viewport, 'full'],
  ] as const)
    if (value !== fallback) url.searchParams.set(key, String(value))
  return url
}
