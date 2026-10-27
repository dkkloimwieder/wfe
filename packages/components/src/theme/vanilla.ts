import type { JSX } from '@solidjs/web'
import type { ThemeDensity } from './sizing'
import type { SurfaceScheme, SurfaceLayers, TableDividers } from './appearance'

/** Plain neutral presentation; callers can still override semantic roles. */
export function vanillaStyle(
  scheme: SurfaceScheme,
  density: ThemeDensity = 'default',
  monochrome = false,
  layers: Partial<SurfaceLayers> = {},
  dividers?: Partial<TableDividers>,
): JSX.CSSProperties {
  const dark = scheme.mode === 'dark'
  const surface = `var(--ui-surface-${(layers.content ?? 0) + 1})`
  const text = monochrome ? '#000000' : dark ? '#fafafa' : '#09090b'
  const muted = monochrome ? text : dark ? '#a1a1aa' : '#71717a'
  const border = monochrome ? text : dark ? '#27272a' : '#e4e4e7'
  const hover = dark ? '#27272a' : '#f4f4f5'
  return {
    '--ui-surface-1': scheme.surfaces[0],
    '--ui-surface-2': scheme.surfaces[1],
    '--ui-surface-3': scheme.surfaces[2],
    '--ui-surface-4': scheme.surfaces[3],
    '--ui-divider-1': 'var(--ui-surface-1)',
    '--ui-divider-2': 'var(--ui-surface-2)',
    '--ui-divider-3': 'var(--ui-surface-3)',
    '--ui-divider-4': 'var(--ui-surface-4)',
    '--ui-font-family': 'ui-sans-serif, system-ui, sans-serif',
    '--ui-line-height': '1.5',
    '--ui-control-line-height': '1.5',
    '--ui-label-line-height': '1.5',
    '--ui-heading-line-height': '1.5',
    '--ui-label-weight': '500',
    '--ui-heading-weight': '600',
    '--ui-sidebar-heading-weight': '500',
    '--ui-kanban-heading-weight': '500',
    '--ui-system-text-transform': 'uppercase',
    '--ui-icon-stroke-width': '1.5',
    '--ui-border-width': '1px',
    '--ui-disabled-opacity': '0.5',
    '--ui-error': monochrome ? text : dark ? '#f87171' : '#b91c1c',
    '--ui-radius': '0.375rem',
    '--ui-panel-radius': '0.5rem',
    '--ui-radio-radius': '50%',
    '--ui-switch-radius': '999px',
    '--ui-canvas-surface': `var(--ui-surface-${(layers.canvas ?? 1) + 1})`,
    '--ui-pane-surface': `var(--ui-surface-${(layers.pane ?? 0) + 1})`,
    '--ui-surface': surface,
    '--ui-popup-surface': 'var(--ui-surface)',
    '--ui-control-surface': 'var(--ui-surface)',
    '--ui-muted-surface': 'var(--ui-highlight)',
    '--ui-skeleton-surface': 'var(--ui-highlight)',
    '--ui-handle-border': 'var(--ui-border)',
    '--ui-highlight': hover,
    '--ui-hover': 'var(--ui-highlight)',
    '--ui-control-hover': 'var(--ui-highlight)',
    '--ui-text': text,
    '--ui-muted-text': muted,
    '--ui-subtle-text': 'var(--ui-muted-text)',
    '--ui-heading-color': 'var(--ui-text)',
    '--ui-border': border,
    '--ui-divider': 'var(--ui-border)',
    '--ui-control-border': 'var(--ui-border)',
    '--ui-button-border': 'var(--ui-control-border)',
    '--ui-table-row-divider':
      dividers?.rows === undefined
        ? 'var(--ui-border)'
        : `var(--ui-divider-${dividers.rows + 1})`,
    '--ui-table-column-divider':
      dividers?.columns === undefined
        ? 'var(--ui-border)'
        : `var(--ui-divider-${dividers.columns + 1})`,
    '--ui-focus-ring': 'var(--ui-muted-text)',
    '--ui-field-focus-border': 'var(--ui-focus-ring)',
    '--ui-focus-width': '2px',
    '--ui-focus-offset': '2px',
    '--ui-canvas-pattern': 'none',
    '--ui-input-decoration-display': 'none',
    '--ui-input-disclosure-arrow-visibility': 'visible',
    '--ui-popup-shadow': '0 4px 12px rgb(0 0 0 / 10%)',
    ...(density === 'default'
      ? {
          '--ui-control-padding-x': '8px',
          '--ui-input-padding-x': '8px',
          '--ui-gap': '6px',
          '--ui-layout-inset': '12px',
          '--ui-field-gap': '16px',
        }
      : {}),
  }
}
