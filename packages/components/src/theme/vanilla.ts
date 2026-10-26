import type { JSX } from '@solidjs/web'
import type { ThemeDensity } from './sizing'

/** Plain neutral presentation; callers can still override semantic roles. */
export function vanillaStyle(
  dark: boolean,
  density: ThemeDensity = 'default',
  monochrome = false,
): JSX.CSSProperties {
  const surface = dark ? '#09090b' : '#ffffff'
  const text = monochrome ? '#000000' : dark ? '#fafafa' : '#09090b'
  const muted = monochrome ? text : dark ? '#a1a1aa' : '#71717a'
  const border = monochrome ? text : dark ? '#27272a' : '#e4e4e7'
  const hover = dark ? '#27272a' : '#f4f4f5'
  return {
    '--ui-font-family': 'ui-sans-serif, system-ui, sans-serif',
    '--ui-line-height': '1.5',
    '--ui-control-line-height': '1.5',
    '--ui-label-line-height': '1.5',
    '--ui-heading-line-height': '1.5',
    '--ui-label-weight': '500',
    '--ui-heading-weight': '600',
    '--ui-system-text-transform': 'none',
    '--ui-icon-stroke-width': '1.5',
    '--ui-border-width': '1px',
    '--ui-disabled-opacity': '0.5',
    '--ui-error': dark ? '#f87171' : '#b91c1c',
    '--ui-radius': '0.375rem',
    '--ui-panel-radius': '0.5rem',
    '--ui-radio-radius': '50%',
    '--ui-switch-radius': '999px',
    '--ui-canvas-surface': surface,
    '--ui-pane-surface': surface,
    '--ui-surface': surface,
    '--ui-popup-surface': surface,
    '--ui-control-surface': surface,
    '--ui-muted-surface': hover,
    '--ui-skeleton-surface': hover,
    '--ui-handle-border': border,
    '--ui-highlight': hover,
    '--ui-hover': hover,
    '--ui-control-hover': hover,
    '--ui-text': text,
    '--ui-muted-text': muted,
    '--ui-subtle-text': muted,
    '--ui-heading-color': text,
    '--ui-border': border,
    '--ui-divider': border,
    '--ui-control-border': border,
    '--ui-button-border': border,
    '--ui-table-row-divider': border,
    '--ui-table-column-divider': border,
    '--ui-focus-ring': muted,
    '--ui-field-focus-border': muted,
    '--ui-focus-width': '2px',
    '--ui-focus-offset': '2px',
    '--ui-canvas-pattern': 'none',
    '--ui-input-decoration-display': 'none',
    '--ui-input-disclosure-arrow-visibility': 'visible',
    '--ui-popup-shadow': '0 4px 12px rgb(0 0 0 / 10%)',
    ...(density === 'default'
      ? {
          '--ui-font-size': '14px',
          '--ui-small-font-size': '12px',
          '--ui-heading-font-size': '16px',
          '--ui-control-height': '36px',
          '--ui-table-control-height': '28px',
        }
      : {}),
  }
}
