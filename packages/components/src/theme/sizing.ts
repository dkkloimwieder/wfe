import type { JSX } from '@solidjs/web'
import { uiScope, type UIDensity } from '../styles/density'

export type ThemeDensity = 'default' | UIDensity

/** Shared measurements for themed shells, controls, and their portals. */
export const themeSizing: JSX.CSSProperties = {
  '--ui-font-size': '12px',
  '--ui-small-font-size': '12px',
  '--ui-font-family': '"Fira Code Variable", ui-monospace, monospace',
  '--ui-line-height': '1.625',
  '--ui-control-line-height': '16px',
  '--ui-label-line-height': '12px',
  '--ui-label-weight': '400',
  '--ui-heading-font-size': '14px',
  '--ui-heading-line-height': '20px',
  '--ui-heading-weight': '500',
  '--ui-button-font-weight': '500',
  '--ui-control-height': '32px',
  '--ui-control-padding-y': '4px',
  '--ui-control-padding-x': '10px',
  '--ui-input-padding-x': '10px',
  '--ui-gap': '8px',
  '--ui-layout-inset': '16px',
  '--ui-field-gap': '20px',
  '--ui-field-max-width': '30rem',
  '--ui-form-max-width': '30rem',
  '--ui-table-control-height': '26px',
  '--ui-tree-row-min-height': '30px',
  '--ui-tree-toggle-size': '24px',
  '--ui-tree-symbol-size': '18px',
  '--ui-tree-indent': '20px',
}

/** Keep the approved mixed profile; explicit densities own all density tokens. */
export function resolveThemeSizing(
  density: ThemeDensity = 'default',
): JSX.CSSProperties {
  return density === 'default'
    ? { ...uiScope().style, ...themeSizing }
    : {
        ...themeSizing,
        ...uiScope(density).style,
        '--ui-tree-row-min-height': 'var(--ui-row-height)',
        '--ui-tree-toggle-size': 'calc(var(--ui-control-height) - 2px)',
        '--ui-tree-symbol-size': 'calc(var(--ui-control-height) - 8px)',
        '--ui-tree-indent': 'calc(var(--ui-control-height) - 6px)',
      }
}
