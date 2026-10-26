import type { JSX } from '@solidjs/web'
import type { ThemeMode } from './Theme'
import type { ThemeDensity } from './sizing'
import type { Accent, SurfaceLayers, SurfaceScheme } from './appearance'
import { vanillaStyle } from './vanilla'

/** Rounded controls with mode-specific neon contrast and layered elevation. */
export function laserStyle(
  mode: ThemeMode,
  accent: Accent,
  secondary: Accent,
  density: ThemeDensity = 'default',
  layers: Partial<SurfaceLayers> = {},
): JSX.CSSProperties {
  const dark = mode === 'dark'
  const monochrome = mode === 'monochrome'
  const scheme: SurfaceScheme = {
    name: 'Laser',
    mode: dark ? 'dark' : 'light',
    surfaces: monochrome
      ? ['#ffffff', '#ffffff', '#ffffff', '#ffffff']
      : dark
        ? ['#030509', '#0a0f19', '#121b2b', '#222d43']
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
  const surface = scheme.surfaces[layers.content ?? 1]
  const shadow = dark
    ? '0 12px 28px -8px rgb(0 0 0 / 75%)'
    : '0 8px 20px -8px rgb(25 45 80 / 24%)'
  const sectionElevation = dark
    ? '0 14px 44px -2px rgb(0 0 0 / 75%)'
    : '0 12px 32px -2px rgb(25 45 80 / 24%)'
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
    '--ui-border': border,
    '--ui-divider': border,
    '--ui-control-border': border,
    '--ui-button-border': border,
    '--ui-table-row-divider': border,
    '--ui-table-column-divider': border,
    '--ui-accent': color,
    '--ui-secondary-accent': secondaryColor,
    '--ui-on-accent': dark ? '#030509' : '#ffffff',
    '--ui-selection': 'var(--ui-accent)',
    '--ui-on-selection': 'var(--ui-on-accent)',
    '--ui-button-color': 'var(--ui-accent)',
    '--ui-button-on-color': 'var(--ui-on-accent)',
    '--ui-accent-hover': 'var(--ui-accent)',
    '--ui-accent-inverted-hover': 'var(--ui-on-accent)',
    '--ui-focus': 'var(--ui-accent)',
    '--ui-focus-ring': 'var(--ui-accent)',
    '--ui-field-focus-border': 'var(--ui-accent)',
    '--ui-focus-width': '1px',
    '--ui-highlight': `color-mix(in srgb, var(--ui-accent) ${dark ? 12 : 7}%, ${surface})`,
    '--ui-hover': 'var(--ui-highlight)',
    '--ui-control-hover': 'var(--ui-highlight)',
    '--ui-muted-surface': 'var(--ui-highlight)',
    '--ui-laser-elevation': monochrome ? 'none' : shadow,
    '--ui-laser-glow': monochrome
      ? 'none'
      : `${shadow}, 0 0 0 1px color-mix(in srgb, var(--ui-accent) ${dark ? 65 : 55}%, transparent), 0 0 ${dark ? 14 : 8}px color-mix(in srgb, var(--ui-accent) ${dark ? 40 : 16}%, transparent)`,
    '--ui-laser-icon-shadow': monochrome
      ? 'none'
      : `drop-shadow(0 3px 3px rgb(0 0 0 / ${dark ? 65 : 25}%)) drop-shadow(0 0 4px color-mix(in srgb, var(--ui-accent) ${dark ? 65 : 40}%, transparent))`,
    '--ui-laser-text-glow': monochrome
      ? 'none'
      : `0 0 ${dark ? 10 : 6}px color-mix(in srgb, var(--ui-accent) ${dark ? 55 : 22}%, transparent)`,
    '--ui-laser-section-shadow': monochrome
      ? 'none'
      : `${sectionElevation}, 0 0 8px color-mix(in srgb, var(--ui-accent) ${dark ? 17 : 9}%, transparent)`,
    '--ui-panel-shadow': 'var(--ui-laser-elevation)',
    '--ui-popup-shadow': 'var(--ui-laser-glow)',
  }
}
