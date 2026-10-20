import {
  defaultDecorations,
  decorationColors,
  secondaryAccents,
} from '../../shared/appearance/appearance'
import type { Decorations } from '../../shared/appearance/appearance'
export const states = ['normal', 'disabled', 'readonly', 'invalid'] as const
export type GalleryState = (typeof states)[number]
export const entries = [
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
  { id: 'table', label: 'Table', group: 'Components', states: ['normal'] },
  {
    id: 'subtables',
    label: 'Sub-tables',
    group: 'Components',
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
  layers: { canvas: 1, pane: 0, content: 0 },
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
function readDecorations(value: unknown): Decorations | undefined {
  if (!value || typeof value !== 'object') return
  const d = value as Record<string, unknown>
  if (
    !integer(d.secondary, secondaryAccents.length - 1) ||
    !integer(d.dots, 100) ||
    !integer(d.border, 100) ||
    !integer(d.inside, 100) ||
    !decorationColors.includes(d.dotColor as Decorations['dotColor']) ||
    !decorationColors.includes(d.borderColor as Decorations['borderColor'])
  )
    return
  return {
    secondary: d.secondary as number,
    dots: d.dots as number,
    border: d.border as number,
    inside: d.inside as number,
    dotColor: d.dotColor as Decorations['dotColor'],
    borderColor: d.borderColor as Decorations['borderColor'],
  }
}
/** The message boundary accepts presentation enums only. */
export function readConfig(value: unknown): GalleryConfig | undefined {
  if (!value || typeof value !== 'object') return
  const config = value as Record<string, unknown>
  const decorations = readDecorations(config.decorations ?? defaultDecorations)
  const layers = config.layers as Record<string, unknown> | undefined
  if (
    !decorations ||
    !integer(config.scheme, 2) ||
    !integer(config.accent, 8) ||
    !integer(config.depth, 3) ||
    !states.includes(config.state as GalleryState) ||
    !layers ||
    !integer(layers.canvas, 2) ||
    !integer(layers.pane, 2) ||
    !integer(layers.content, 2)
  )
    return
  return {
    decorations,
    scheme: config.scheme as number,
    accent: config.accent as number,
    depth: config.depth as GalleryConfig['depth'],
    state: config.state as GalleryState,
    layers: {
      canvas: layers.canvas as 0 | 1 | 2,
      pane: layers.pane as 0 | 1 | 2,
      content: layers.content as 0 | 1 | 2,
    },
  }
}
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
      dots: number('dots', 35, 100),
      border: number('border', 20, 100),
      inside: number('inside', 100, 100),
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
      canvas: number('canvas', 1, 2) as 0 | 1 | 2,
      pane: number('pane', 0, 2) as 0 | 1 | 2,
      content: number('content', 0, 2) as 0 | 1 | 2,
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
    ['canvas', route.layers.canvas, 1],
    ['pane', route.layers.pane, 0],
    ['content', route.layers.content, 0],
    ['state', route.state, 'normal'],
    ['viewport', route.viewport, 'full'],
  ] as const)
    if (value !== fallback) url.searchParams.set(key, String(value))
  return url
}
