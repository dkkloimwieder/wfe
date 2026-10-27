import type { JSX } from '@solidjs/web'
import type { ThemeMode } from './Theme'
import type { ThemeDensity } from './sizing'
import type {
  Accent,
  SurfaceLayers,
  SurfaceScheme,
  TableDividers,
} from './appearance'
import { vanillaStyle } from './vanilla'

/** Rounded controls with mode-specific neon contrast and layered elevation. */
export function laserStyle(
  mode: ThemeMode,
  accent: Accent,
  secondary: Accent,
  density: ThemeDensity = 'default',
  layers: Partial<SurfaceLayers> = {},
  dividers?: Partial<TableDividers>,
): JSX.CSSProperties {
  const dark = mode === 'dark'
  const monochrome = mode === 'monochrome'
  const scheme: SurfaceScheme = {
    name: 'Laser',
    mode: dark ? 'dark' : 'light',
    surfaces: monochrome
      ? ['#ffffff', '#ffffff', '#ffffff', '#ffffff']
      : dark
        ? ['#050505', '#0b0b0b', '#121b2b', '#222d43']
        : ['#edf2fb', '#ffffff', '#e3ebf7', '#c6d3e6'],
    text: dark ? ['#e0eaff', '#a4b4d0'] : ['#172642', '#526480'],
  }
  const color = monochrome
    ? '#000000'
    : dark
      ? `color-mix(in srgb, ${accent.dark} 80%, white)`
      : accent.light
  const secondaryColor = monochrome
    ? '#000000'
    : dark
      ? `color-mix(in srgb, ${secondary.dark} 80%, white)`
      : secondary.light
  const border = monochrome ? '#000000' : dark ? '#35445f' : '#b7c7de'
  const divider = dark ? 'var(--ui-surface-2)' : 'var(--ui-control-border)'
  const shadow =
    '0 var(--ui-laser-shadow-y) var(--ui-laser-shadow-blur) var(--ui-laser-shadow-spread) var(--ui-laser-shadow-color)'
  return {
    ...vanillaStyle(scheme, density, monochrome, {
      canvas: 0,
      pane: 1,
      content: 1,
      ...layers,
    }),
    '--ui-radius': '18px',
    '--ui-control-radius': '999px',
    '--ui-panel-radius': '20px',
    '--ui-popup-radius': '16px',
    '--ui-text': monochrome ? '#000000' : scheme.text[0],
    '--ui-heading-color': 'var(--ui-text)',
    '--ui-muted-text': monochrome ? '#000000' : scheme.text[1],
    '--ui-subtle-text': 'var(--ui-muted-text)',
    '--ui-border': divider,
    '--ui-divider': 'var(--ui-border)',
    '--ui-control-border': border,
    '--ui-button-border': 'var(--ui-control-border)',
    '--ui-table-row-divider':
      dividers?.rows === undefined
        ? 'var(--ui-divider)'
        : `var(--ui-divider-${dividers.rows + 1})`,
    '--ui-table-column-divider':
      dividers?.columns === undefined
        ? 'var(--ui-divider)'
        : `var(--ui-divider-${dividers.columns + 1})`,
    '--ui-accent': color,
    '--ui-secondary-accent': secondaryColor,
    '--ui-on-accent': dark ? '#050505' : '#ffffff',
    '--ui-selection': 'var(--ui-accent)',
    '--ui-on-selection': 'var(--ui-on-accent)',
    '--ui-button-color': 'var(--ui-accent)',
    '--ui-button-on-color': 'var(--ui-on-accent)',
    '--ui-accent-hover': 'var(--ui-accent)',
    '--ui-accent-inverted-hover': 'var(--ui-on-accent)',
    '--ui-focus': 'var(--ui-accent)',
    '--ui-focus-ring': 'var(--ui-accent)',
    '--ui-field-focus-border': 'var(--ui-accent)',
    '--ui-checkbox-radius': '6px',
    '--ui-input-min-padding-x': '12px',
    '--ui-focus-width': '1px',
    '--ui-highlight': `color-mix(in srgb, var(--ui-accent) ${dark ? 12 : 7}%, var(--ui-surface))`,
    '--ui-hover': 'var(--ui-highlight)',
    '--ui-control-hover': 'var(--ui-highlight)',
    '--ui-muted-surface': 'var(--ui-highlight)',
    '--ui-laser-shadow-y': dark ? '12px' : '8px',
    '--ui-laser-shadow-blur': dark ? '28px' : '20px',
    '--ui-laser-shadow-spread': '-8px',
    '--ui-laser-shadow-color': dark
      ? 'rgb(0 0 0 / 75%)'
      : 'rgb(25 45 80 / 24%)',
    '--ui-laser-elevation': monochrome ? 'none' : shadow,
    // Full-effect overrides remain optional; CSS resolves defaults at each consumer.
    '--ui-laser-glow': monochrome ? 'none' : 'initial',
    '--ui-laser-icon-shadow': monochrome ? 'none' : 'initial',
    '--ui-laser-text-glow': monochrome ? 'none' : 'initial',
    '--ui-laser-glow-width': '1px',
    '--ui-laser-glow-blur': dark ? '14px' : '8px',
    '--ui-laser-glow-ring-opacity': dark ? '65%' : '55%',
    '--ui-laser-glow-opacity': dark ? '40%' : '16%',
    '--ui-laser-text-glow-blur': dark ? '10px' : '6px',
    '--ui-laser-text-glow-opacity': dark ? '55%' : '22%',
    '--ui-laser-icon-elevation': `0 3px 3px rgb(0 0 0 / ${dark ? 65 : 25}%)`,
    '--ui-laser-icon-glow-blur': '4px',
    '--ui-laser-icon-glow-opacity': dark ? '65%' : '40%',
    '--ui-panel-shadow': 'var(--ui-laser-elevation)',
    '--ui-popup-shadow': monochrome ? 'none' : 'initial',
  }
}
