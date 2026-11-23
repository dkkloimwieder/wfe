// Open Props samples. MIT, Copyright (c) 2021 Adam Argyle.
// License: ../styles/OPEN-PROPS-LICENSE
// Source: https://raw.githubusercontent.com/argyleink/open-props/f39ab7c377a0e047f930982e3611bbc95254a260/src/props.colors.js
// Source SHA-256: 9197aaccf67264fa1f4acc6c19504f3b79fa7c4c1d684af7e29368dcca4cf39f
// Accent and table-divider samples in palette.ts retain the provenance above.
//
// The theme token base. Every --ui-* token has one default here, and each
// preset, mode, density and application choice is a block of token values.
// scripts/theme-tokens.mjs writes these blocks to styles/tokens.css, and
// resolveThemeTokens applies the same blocks in TypeScript.
// This module imports values only from import-free modules, so Node can run it.
//
// Optional tokens. Sketchy leaves these unset, so each component keeps its
// resting paint; Vanilla and Laser set them in the plain presentation block.
//   --ui-toggle-checked-surface, --ui-toggle-checked-border,
//   --ui-toggle-checked-text: checked checkbox, switch and radio paint.
//   --ui-switch-track, --ui-switch-thumb, --ui-switch-checked-thumb: switch parts.
//   --ui-textarea-radius: multi-line field corners.
import type { Accent, SurfaceScheme, PaletteRoles } from './palette'

export type TokenPreset = 'default' | 'vanilla' | 'laser'
export type TokenMode = 'light' | 'dark' | 'monochrome'
export type TokenDensity = 'default' | 'compact' | 'comfortable'
export type TokenLevel = 0 | 1 | 2 | 3
export type TokenDecorationColor = 'neutral' | 'primary' | 'secondary'
export type TokenInputDecoration = 'none' | TokenDecorationColor

/** The application choices that select token blocks. */
export type TokenChoices = {
  preset: TokenPreset
  mode: TokenMode
  density: TokenDensity
  accent?: string
  secondaryAccent?: string
  canvas?: TokenLevel
  pane?: TokenLevel
  content?: TokenLevel
  rowDivider?: TokenLevel
  columnDivider?: TokenLevel
  dotColor?: TokenDecorationColor
  borderColor?: TokenDecorationColor
  inputDecoration?: TokenInputDecoration
}

/** A block applies when every listed choice matches. `null` means unset. */
export type TokenCondition = {
  preset?: TokenPreset | readonly TokenPreset[]
  mode?: TokenMode
  density?: TokenDensity
  accent?: string | null
  secondaryAccent?: string
  canvas?: TokenLevel
  pane?: TokenLevel
  content?: TokenLevel
  rowDivider?: TokenLevel
  columnDivider?: TokenLevel
  dotColor?: TokenDecorationColor
  borderColor?: TokenDecorationColor
  inputDecoration?: TokenInputDecoration
}
export type TokenBlock = {
  title: string
  when: TokenCondition
  tokens: Readonly<Record<string, string>>
}

/** Data attribute for each choice. Theme writes these on its root. */
export const tokenAttributes: Record<keyof TokenChoices, string> = {
  preset: 'data-ui-preset',
  mode: 'data-ui-mode',
  density: 'data-ui-density',
  accent: 'data-ui-accent',
  secondaryAccent: 'data-ui-secondary-accent',
  canvas: 'data-ui-canvas',
  pane: 'data-ui-pane',
  content: 'data-ui-content',
  rowDivider: 'data-ui-row-divider',
  columnDivider: 'data-ui-column-divider',
  dotColor: 'data-ui-dot-color',
  borderColor: 'data-ui-border-color',
  inputDecoration: 'data-ui-input-decoration',
}

export type TokenSources = {
  schemes: readonly SurfaceScheme[]
  accents: readonly Accent[]
  secondaryAccents: readonly Accent[]
  roles: PaletteRoles
  densities: Readonly<
    Record<
      'compact' | 'comfortable',
      {
        rowHeight: number
        controlHeight: number
        headerHeight: number
        fontSize: number
        smallFontSize: number
        cellPaddingY: number
        cellPaddingX: number
        controlPaddingY: number
        gap: number
      }
    >
  >
}

export const accentName = (accent: Accent) =>
  accent.name.toLowerCase().replaceAll(' ', '-')

/** Black or white text for a filled accent, by relative luminance. */
export function contrastText(color: string) {
  const channels = color
    .slice(1)
    .match(/../g)!
    .map((part) => {
      const value = parseInt(part, 16) / 255
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    })
  const luminance =
    channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
  return luminance > 0.179 ? '#000000' : '#ffffff'
}

/** Vanilla and Laser surfaces. Vanilla surfaces 2 to 4 use 98.5% of the Sketchy channels. */
export const presetSchemes = {
  vanilla: {
    light: ['#ffffff', '#f8f8f9', '#f1f1f1', '#e2e2e2'],
    dark: ['#171717', '#1b1b1b', '#252525', '#3f3f3f'],
    monochrome: ['#ffffff', '#ffffff', '#ffffff', '#ffffff'],
  },
  laser: {
    light: ['#edf2fb', '#ffffff', '#e3ebf7', '#c6d3e6'],
    dark: ['#050505', '#0b0b0b', '#121b2b', '#222d43'],
    monochrome: ['#ffffff', '#ffffff', '#ffffff', '#ffffff'],
  },
} as const

/** Default choices per preset. Explicit choices override them. */
export const presetDefaults = {
  default: {
    mode: 'light',
    decoration: true,
    glow: false,
    layers: { canvas: 0, pane: 2, content: 1 },
  },
  vanilla: {
    mode: 'light',
    decoration: false,
    glow: false,
    layers: { canvas: 1, pane: 0, content: 0 },
  },
  laser: {
    mode: 'dark',
    decoration: false,
    glow: true,
    layers: { canvas: 0, pane: 1, content: 1 },
  },
} as const

const surfaces = (values: readonly string[]) =>
  Object.fromEntries(values.map((value, i) => [`--ui-surface-${i + 1}`, value]))
const dividers = (values: readonly string[]) =>
  Object.fromEntries(values.map((value, i) => [`--ui-divider-${i + 1}`, value]))
const surfaceDividers = dividers(
  [1, 2, 3, 4].map((n) => `var(--ui-surface-${n})`),
)
const plain: readonly TokenPreset[] = ['vanilla', 'laser']

/** Every token block in cascade order. Later blocks win. */
export function tokenBlocks(source: TokenSources): TokenBlock[] {
  const [mono, light, dark] = source.schemes as [
    SurfaceScheme,
    SurfaceScheme,
    SurfaceScheme,
  ]
  const blue = source.accents[1]!
  const roles = source.roles
  const blocks: TokenBlock[] = [
    {
      title: 'Base: Sketchy, light mode, default density',
      when: {},
      tokens: {
        // Typography
        '--ui-font-family': '"Fira Code Variable", ui-monospace, monospace',
        '--ui-font-size': '12px',
        '--ui-small-font-size': '12px',
        '--ui-line-height': '1.625',
        '--ui-control-line-height': '16px',
        '--ui-label-line-height': '12px',
        '--ui-label-weight': '400',
        '--ui-heading-font-size': '14px',
        '--ui-heading-line-height': '20px',
        '--ui-heading-weight': '500',
        '--ui-sidebar-heading-weight': 'var(--ui-heading-weight)',
        '--ui-kanban-heading-weight': 'var(--ui-heading-weight)',
        '--ui-button-font-weight': '500',
        '--ui-system-text-transform': 'uppercase',
        // Sizing
        '--ui-row-height': '32px',
        '--ui-header-height': '22px',
        '--ui-control-height': '32px',
        '--ui-table-control-height': '26px',
        '--ui-field-max-width': '30rem',
        '--ui-form-max-width': '30rem',
        '--ui-tree-row-min-height': '30px',
        '--ui-tree-toggle-size': '24px',
        '--ui-tree-symbol-size': '18px',
        '--ui-tree-indent': '20px',
        '--ui-icon-stroke-width': '1',
        '--ui-connector-stroke-width': '1.5',
        // Spacing
        '--ui-gap': '8px',
        // Space between panels equals the space around them.
        '--ui-field-gap': 'var(--ui-layout-inset)',
        // Side regions: one token for the region edge and between its panels.
        '--ui-region-gap': 'var(--ui-gap)',
        '--ui-layout-inset': '16px',
        '--ui-control-padding-x': '10px',
        '--ui-control-padding-y': '4px',
        '--ui-input-padding-x': '10px',
        '--ui-cell-padding-x': '8px',
        '--ui-cell-padding-y': '6px',
        // Borders and radius
        '--ui-border-width': '1px',
        '--ui-control-border-width': 'var(--ui-border-width)',
        '--ui-divider-width': 'var(--ui-border-width)',
        '--ui-radius': '0px',
        '--ui-control-radius': 'var(--ui-radius)',
        '--ui-popup-radius': 'var(--ui-radius)',
        '--ui-panel-radius': 'var(--ui-radius)',
        '--ui-radio-radius': 'var(--ui-control-radius)',
        '--ui-checkbox-radius': 'var(--ui-control-radius)',
        '--ui-switch-radius': 'var(--ui-control-radius)',
        // Surfaces
        ...surfaces(light.surfaces),
        ...dividers(roles.lightDividers),
        '--ui-color-scheme': 'light',
        '--ui-canvas-surface': 'var(--ui-surface-1)',
        '--ui-pane-surface': 'var(--ui-surface-3)',
        '--ui-surface': 'var(--ui-surface-2)',
        '--ui-muted-surface': 'var(--ui-surface)',
        '--ui-skeleton-surface': 'var(--ui-surface-3)',
        '--ui-popup-surface': 'var(--ui-surface)',
        '--ui-control-surface': 'var(--ui-surface)',
        '--ui-highlight': 'var(--ui-surface-3)',
        '--ui-control-hover': 'var(--ui-control-surface)',
        '--ui-overlay': 'rgb(0 0 0 / 40%)',
        // Text
        '--ui-text': light.text[0],
        '--ui-muted-text': light.text[1],
        '--ui-heading-color':
          'color-mix(in srgb, var(--ui-text) 80%, var(--ui-muted-text))',
        '--ui-sidebar-neutral': 'var(--ui-text)',
        // Borders
        '--ui-border': 'var(--ui-surface-4)',
        '--ui-control-border': 'var(--ui-border)',
        '--ui-button-border': 'var(--ui-control-border)',
        '--ui-neutral-button-border':
          'var(--ui-button-color, var(--ui-button-border))',
        '--ui-table-row-divider': 'var(--ui-divider-2)',
        '--ui-table-column-divider': 'var(--ui-divider-2)',
        // Accent and status
        '--ui-accent-light': blue.light,
        '--ui-accent-dark': blue.dark,
        '--ui-on-accent-light': contrastText(blue.light),
        '--ui-on-accent-dark': contrastText(blue.dark),
        '--ui-secondary-accent-light': blue.light,
        '--ui-secondary-accent-dark': blue.dark,
        '--ui-accent': 'var(--ui-accent-light)',
        '--ui-on-accent': 'var(--ui-on-accent-light)',
        '--ui-secondary-accent': 'var(--ui-secondary-accent-light)',
        '--ui-sidebar-accent': 'var(--ui-accent)',
        '--ui-button-color': 'var(--ui-accent)',
        '--ui-button-on-color': 'var(--ui-on-accent)',
        '--ui-accent-hover': 'var(--ui-accent)',
        '--ui-accent-inverted-hover': 'var(--ui-on-accent)',
        '--ui-success': '#37734c',
        '--ui-warning-surface': '#fff7d9',
        '--ui-warning-text': '#765200',
        '--ui-warning-border': '#a78d4d',
        '--ui-error': '#9d251e',
        // Focus
        '--ui-focus-ring': roles.lightRing,
        '--ui-focus-width': '1px',
        '--ui-focus-offset': '0px',
        // States. The muted surface is the sunken surface of disabled and read-only fields.
        // Every preset dims disabled controls with this one opacity.
        '--ui-disabled-opacity': '0.5',
        // Disabled foreground: text and borders mixed toward the surface at the ratio
        // above. Backgrounds stay opaque, so no layer shows through a disabled control.
        '--ui-disabled-text':
          'color-mix(in srgb, var(--ui-text) calc(var(--ui-disabled-opacity) * 100%), var(--ui-surface))',
        '--ui-disabled-accent':
          'color-mix(in srgb, var(--ui-accent) calc(var(--ui-disabled-opacity) * 100%), var(--ui-surface))',
        '--ui-disabled-border':
          'color-mix(in srgb, var(--ui-control-border) calc(var(--ui-disabled-opacity) * 100%), var(--ui-surface))',
        // Shadows
        '--ui-panel-shadow': 'none',
        '--ui-popup-shadow': 'none',
        '--ui-laser-inset-glow-strength': '0.6',
        // Default-tone outline buttons: 100% uses the button color, 0% the neutral text and border.
        '--ui-outline-accent-weight': '100%',
        '--ui-action-hover-fill': 'none',
        '--ui-choice-hover-fill': 'initial',
        '--ui-choice-hover-text-shadow': 'none',
        '--ui-choice-selected-fill': 'var(--ui-highlight)',
        '--ui-field-hover-fill': 'var(--ui-action-hover-fill)',
        '--ui-field-hover-overlay': 'transparent',
        '--ui-state-invalid-shadow':
          'inset 0 0 0 var(--ui-border-width) var(--ui-error)',
        '--ui-invalid-decoration-color': 'var(--ui-error)',
        '--ui-invalid-decoration-opacity': '1',
        '--ui-state-readonly-shadow':
          'inset 0 0 0 var(--ui-border-width) var(--ui-muted-text)',
        '--ui-state-open-shadow':
          '0 0 0 var(--ui-border-width) var(--ui-accent)',
        '--ui-action-hover-shadow': '0 0 transparent',
        '--ui-state-selected-shadow':
          'inset 0 0 0 var(--ui-border-width) var(--ui-accent)',
        '--ui-action-outline-opacity': '100%',
        // Glyphs and choice lists
        '--ui-disclosure-overflow': 'visible',
        '--ui-disclosure-width': '10.5px',
        '--ui-disclosure-height': '15.75px',
        '--ui-listbox-padding': '6px',
        '--ui-option-margin-y': '2px',
        // Sketchy decoration
        '--ui-neutral-dot-color': light.text[1],
        '--ui-neutral-border-color': light.text[1],
        '--ui-decoration-dot-color': 'var(--ui-neutral-dot-color)',
        '--ui-decoration-border-color': 'var(--ui-neutral-border-color)',
        '--ui-decoration-dot-opacity': '50%',
        '--ui-decoration-border-opacity': '100%',
        '--ui-action-dot-visibility': '0%',
        '--ui-decoration-border':
          'color-mix(in srgb, var(--ui-decoration-border-color) var(--ui-decoration-border-opacity), transparent)',
        // decoration.css defines the one dot pattern; the canvas reads it. Without
        // decoration the pattern is unset, so the canvas has no dots.
        '--ui-canvas-pattern': 'var(--ui-dot-pattern)',
        // An absolute size keeps the dot spacing equal on every surface.
        '--ui-canvas-pattern-size':
          'calc(var(--ui-font-size) * 0.3) calc(var(--ui-font-size) * 0.3)',
        '--ui-input-decoration-display': 'block',
        '--ui-input-disclosure-arrow-visibility': 'hidden',
        '--ui-input-decoration-dot-color': 'var(--ui-neutral-dot-color)',
        '--ui-input-decoration-border-color': 'var(--ui-neutral-border-color)',
        // Optional tokens: unset in Sketchy, reset at every root.
        '--ui-toggle-checked-surface': 'initial',
        '--ui-toggle-checked-border': 'initial',
        '--ui-toggle-checked-text': 'initial',
        '--ui-switch-track': 'initial',
        '--ui-switch-thumb': 'initial',
        '--ui-switch-checked-thumb': 'initial',
        '--ui-textarea-radius': 'initial',
        // Compatibility aliases. Components read the canonical token on the right.
        '--ui-subtle-text': 'var(--ui-muted-text)',
        '--ui-hover': 'var(--ui-highlight)',
        '--ui-divider': 'var(--ui-border)',
        '--ui-focus': 'var(--ui-focus-ring)',
        '--ui-field-focus-border': 'var(--ui-focus-ring)',
        '--ui-selection': 'var(--ui-accent)',
        '--ui-on-selection': 'var(--ui-on-accent)',
      },
    },
    {
      title: 'Dark mode',
      when: { mode: 'dark' },
      tokens: {
        ...surfaces(dark.surfaces),
        ...dividers(roles.darkDividers),
        '--ui-color-scheme': 'dark',
        '--ui-control-surface':
          'color-mix(in srgb, var(--ui-surface) 95.5%, white)',
        '--ui-text': dark.text[0],
        '--ui-muted-text': dark.text[1],
        '--ui-border': roles.darkBorder,
        '--ui-neutral-button-border': roles.darkBorder,
        '--ui-accent': 'var(--ui-accent-dark)',
        '--ui-on-accent': 'var(--ui-on-accent-dark)',
        '--ui-secondary-accent': 'var(--ui-secondary-accent-dark)',
        '--ui-success': '#8ce99a',
        '--ui-warning-surface': '#39301c',
        '--ui-warning-text': '#f1d68c',
        '--ui-error': '#ffa69b',
        '--ui-focus-ring': roles.darkRing,
        '--ui-neutral-dot-color': roles.darkNeutralDot,
        '--ui-neutral-border-color': roles.darkBorder,
      },
    },
    {
      title: 'Black and white mode',
      when: { mode: 'monochrome' },
      tokens: {
        ...surfaces(mono.surfaces),
        '--ui-text': mono.text[0],
        '--ui-muted-text': mono.text[1],
        '--ui-border': mono.text[0],
        '--ui-success': mono.text[0],
        '--ui-warning-surface': 'var(--ui-surface)',
        '--ui-warning-text': 'var(--ui-text)',
        '--ui-warning-border': 'var(--ui-border)',
        '--ui-error': mono.text[0],
        '--ui-neutral-dot-color': mono.text[1],
        '--ui-neutral-border-color': mono.text[1],
      },
    },
  ]
  for (const density of ['compact', 'comfortable'] as const) {
    const value = source.densities[density]
    blocks.push({
      title: `${density} density`,
      when: { density },
      tokens: {
        '--ui-row-height': `${value.rowHeight}px`,
        '--ui-control-height': `${value.controlHeight}px`,
        '--ui-table-control-height': `${value.controlHeight}px`,
        '--ui-header-height': `${value.headerHeight}px`,
        '--ui-font-size': `${value.fontSize}px`,
        '--ui-small-font-size': `${value.smallFontSize}px`,
        '--ui-cell-padding-y': `${value.cellPaddingY}px`,
        '--ui-cell-padding-x': `${value.cellPaddingX}px`,
        '--ui-control-padding-y': `${value.controlPaddingY}px`,
        '--ui-gap': `${value.gap}px`,
        '--ui-tree-row-min-height': 'var(--ui-row-height)',
        '--ui-tree-toggle-size': 'calc(var(--ui-control-height) - 2px)',
        '--ui-tree-symbol-size': 'calc(var(--ui-control-height) - 8px)',
        '--ui-tree-indent': 'calc(var(--ui-control-height) - 6px)',
      },
    })
  }
  blocks.push(
    {
      title: 'Plain presentation shared by Vanilla and Laser',
      when: { preset: plain },
      tokens: {
        ...surfaceDividers,
        '--ui-font-family': 'ui-sans-serif, system-ui, sans-serif',
        '--ui-line-height': '1.5',
        '--ui-control-line-height': '1.5',
        '--ui-label-line-height': '1.5',
        '--ui-heading-line-height': '1.5',
        '--ui-label-weight': '500',
        '--ui-heading-weight': '600',
        '--ui-sidebar-heading-weight': '500',
        '--ui-kanban-heading-weight': '500',
        '--ui-icon-stroke-width': '1.5',
        '--ui-error': '#b91c1c',
        '--ui-invalid-decoration-color': 'initial',
        '--ui-invalid-decoration-opacity': 'initial',
        '--ui-radio-radius': '50%',
        '--ui-switch-radius': '999px',
        '--ui-popup-surface': 'var(--ui-surface)',
        '--ui-control-surface': 'var(--ui-surface)',
        '--ui-muted-surface': 'var(--ui-highlight)',
        '--ui-skeleton-surface': 'var(--ui-highlight)',
        '--ui-control-hover': 'var(--ui-highlight)',
        '--ui-heading-color': 'var(--ui-text)',
        '--ui-control-border': 'var(--ui-border)',
        '--ui-button-border': 'var(--ui-control-border)',
        '--ui-focus-offset': '2px',
        '--ui-decoration-dot-opacity': '0%',
        '--ui-input-decoration-display': 'none',
        '--ui-input-disclosure-arrow-visibility': 'visible',
        '--ui-toggle-checked-surface': 'var(--ui-accent)',
        '--ui-toggle-checked-border': 'var(--ui-accent)',
        '--ui-toggle-checked-text': 'var(--ui-on-accent)',
        '--ui-switch-track': 'var(--ui-border)',
        '--ui-switch-thumb': 'var(--ui-text)',
        '--ui-switch-checked-thumb': 'var(--ui-on-accent)',
        '--ui-outline-accent-weight': '0%',
        '--ui-action-hover-fill':
          'linear-gradient(var(--ui-action-hover-overlay), var(--ui-action-hover-overlay))',
        '--ui-check-hover-fill': 'var(--ui-action-hover-fill)',
        '--ui-choice-hover-fill': 'var(--ui-action-hover-fill)',
        '--ui-action-hover-overlay':
          'color-mix(in srgb, var(--ui-highlight) 50%, transparent)',
        '--ui-disclosure-overflow': 'hidden',
        '--ui-disclosure-width': '12px',
        '--ui-disclosure-height': '16px',
        '--ui-listbox-padding': 'initial',
        '--ui-option-margin-y': '0',
      },
    },
    {
      title: 'Plain presentation, dark mode',
      when: { preset: plain, mode: 'dark' },
      tokens: { '--ui-error': '#f87171' },
    },
    {
      title: 'Plain presentation, black and white mode',
      when: { preset: plain, mode: 'monochrome' },
      tokens: { '--ui-error': '#000000' },
    },
    {
      title: 'Plain presentation, default density spacing',
      when: { preset: plain, density: 'default' },
      tokens: {
        '--ui-control-padding-x': '8px',
        '--ui-input-padding-x': '8px',
        '--ui-gap': '6px',
        '--ui-layout-inset': '12px',
      },
    },
    {
      title: 'Vanilla',
      when: { preset: 'vanilla' },
      tokens: {
        ...surfaces(presetSchemes.vanilla.light),
        '--ui-radius': '0.375rem',
        '--ui-panel-radius': '0.5rem',
        '--ui-canvas-surface': 'var(--ui-surface-2)',
        '--ui-pane-surface': 'var(--ui-surface-1)',
        '--ui-surface': 'var(--ui-surface-1)',
        '--ui-highlight': '#f4f4f5',
        '--ui-text': '#09090b',
        '--ui-muted-text': '#71717a',
        '--ui-border': '#e4e4e7',
        '--ui-table-row-divider': 'var(--ui-border)',
        '--ui-table-column-divider': 'var(--ui-border)',
        '--ui-focus-ring': roles.darkRing,
        '--ui-focus-width': '2px',
        '--ui-popup-shadow': '0 4px 12px rgb(0 0 0 / 10%)',
      },
    },
    {
      title: 'Vanilla, dark mode',
      when: { preset: 'vanilla', mode: 'dark' },
      tokens: {
        ...surfaces(presetSchemes.vanilla.dark),
        '--ui-highlight': '#27272a',
        '--ui-text': '#fafafa',
        '--ui-muted-text': '#a1a1aa',
        '--ui-focus-ring': roles.lightRing,
        '--ui-border': '#27272a',
      },
    },
    {
      title: 'Vanilla, black and white mode',
      when: { preset: 'vanilla', mode: 'monochrome' },
      tokens: {
        ...surfaces(presetSchemes.vanilla.monochrome),
        '--ui-text': '#000000',
        '--ui-muted-text': '#000000',
        '--ui-border': '#000000',
      },
    },
    {
      title: 'Vanilla without an application accent',
      when: { preset: 'vanilla', accent: null },
      tokens: { '--ui-accent': '#18181b', '--ui-on-accent': '#fafafa' },
    },
    {
      title: 'Vanilla without an application accent, dark mode',
      when: { preset: 'vanilla', accent: null, mode: 'dark' },
      tokens: { '--ui-accent': '#fafafa', '--ui-on-accent': '#18181b' },
    },
    {
      title: 'Vanilla without an application accent, black and white mode',
      when: { preset: 'vanilla', accent: null, mode: 'monochrome' },
      tokens: { '--ui-accent': '#000000', '--ui-on-accent': '#ffffff' },
    },
    {
      title: 'Laser',
      when: { preset: 'laser' },
      tokens: {
        ...surfaces(presetSchemes.laser.light),
        '--ui-canvas-surface': 'var(--ui-surface-1)',
        '--ui-pane-surface': 'var(--ui-surface-2)',
        '--ui-surface': 'var(--ui-surface-2)',
        '--ui-radius': '18px',
        '--ui-control-radius': '999px',
        '--ui-panel-radius': '20px',
        '--ui-popup-radius': '16px',
        '--ui-checkbox-radius': '6px',
        '--ui-input-padding-x': '12px',
        '--ui-textarea-radius': 'var(--ui-panel-radius)',
        '--ui-text': '#172642',
        '--ui-muted-text': '#526480',
        '--ui-border': '#b7c7de',
        '--ui-table-row-divider': 'var(--ui-border)',
        '--ui-table-column-divider': 'var(--ui-border)',
        '--ui-on-accent': '#ffffff',
        '--ui-highlight':
          'color-mix(in srgb, var(--ui-accent) 7%, var(--ui-surface))',
        '--ui-action-hover-fill': 'none',
        '--ui-action-hover-shadow': 'initial',
        '--ui-check-hover-fill': 'none',
        '--ui-choice-hover-fill': 'none',
        '--ui-choice-hover-text-shadow': 'initial',
        '--ui-field-hover-fill':
          'linear-gradient(var(--ui-field-hover-overlay), var(--ui-field-hover-overlay))',
        '--ui-field-hover-overlay':
          'var(--ui-laser-action-surface, color-mix(in srgb, var(--ui-accent) 12%, transparent))',
        '--ui-laser-shadow-y': '2px',
        '--ui-laser-shadow-blur': '12px',
        '--ui-laser-shadow-spread': '4px',
        '--ui-laser-shadow-color': 'rgb(255 255 255 / 70%)',
        '--ui-laser-elevation':
          '0 var(--ui-laser-shadow-y) var(--ui-laser-shadow-blur) var(--ui-laser-shadow-spread) var(--ui-laser-shadow-color)',
        '--ui-laser-glow': 'initial',
        '--ui-laser-icon-shadow': 'initial',
        '--ui-laser-text-glow': 'initial',
        '--ui-laser-glow-width': '1px',
        '--ui-laser-glow-blur': '8px',
        '--ui-laser-glow-ring-opacity': '55%',
        '--ui-laser-glow-opacity': '16%',
        '--ui-laser-inset-glow-strength': '0.3',
        '--ui-laser-text-glow-blur': '6px',
        '--ui-laser-text-glow-opacity': '22%',
        '--ui-laser-icon-elevation': '0 3px 3px rgb(255 255 255 / 95%)',
        '--ui-laser-icon-glow-blur': '4px',
        '--ui-laser-icon-glow-opacity': '40%',
        '--ui-panel-shadow': 'var(--ui-laser-elevation)',
        '--ui-popup-shadow': 'initial',
      },
    },
    {
      title: 'Laser, dark mode',
      when: { preset: 'laser', mode: 'dark' },
      tokens: {
        ...surfaces(presetSchemes.laser.dark),
        '--ui-text': '#e0eaff',
        '--ui-muted-text': '#a4b4d0',
        '--ui-border': '#252c39',
        '--ui-accent': 'color-mix(in srgb, var(--ui-accent-dark) 80%, white)',
        '--ui-secondary-accent':
          'color-mix(in srgb, var(--ui-secondary-accent-dark) 80%, white)',
        '--ui-on-accent': '#050505',
        '--ui-highlight':
          'color-mix(in srgb, var(--ui-accent) 12%, var(--ui-surface))',
        '--ui-laser-shadow-color': 'transparent',
        '--ui-laser-glow-blur': '14px',
        '--ui-laser-glow-ring-opacity': '65%',
        '--ui-laser-glow-opacity': '40%',
        '--ui-laser-text-glow-blur': '10px',
        '--ui-laser-text-glow-opacity': '55%',
        '--ui-laser-icon-elevation': '0 0 0 transparent',
        '--ui-laser-icon-glow-opacity': '65%',
      },
    },
    {
      title: 'Laser, black and white mode',
      when: { preset: 'laser', mode: 'monochrome' },
      tokens: {
        ...surfaces(presetSchemes.laser.monochrome),
        '--ui-text': '#000000',
        '--ui-muted-text': '#000000',
        '--ui-border': '#000000',
        '--ui-accent': '#000000',
        '--ui-secondary-accent': '#000000',
        '--ui-laser-elevation': 'none',
        '--ui-laser-glow': 'none',
        '--ui-laser-icon-shadow': 'none',
        '--ui-laser-text-glow': 'none',
        '--ui-popup-shadow': 'none',
      },
    },
  )
  for (const accent of source.accents)
    blocks.push({
      title: `${accent.name} accent`,
      when: { accent: accentName(accent) },
      tokens: {
        '--ui-accent-light': accent.light,
        '--ui-accent-dark': accent.dark,
        '--ui-on-accent-light': contrastText(accent.light),
        '--ui-on-accent-dark': contrastText(accent.dark),
      },
    })
  for (const accent of source.secondaryAccents)
    blocks.push({
      title: `${accent.name} secondary accent`,
      when: { secondaryAccent: accentName(accent) },
      tokens: {
        '--ui-secondary-accent-light': accent.light,
        '--ui-secondary-accent-dark': accent.dark,
      },
    })
  for (const level of [0, 1, 2] as const) {
    const surface = `var(--ui-surface-${level + 1})`
    blocks.push(
      {
        title: `Canvas on surface ${level + 1}`,
        when: { canvas: level },
        tokens: { '--ui-canvas-surface': surface },
      },
      {
        title: `Panes on surface ${level + 1}`,
        when: { pane: level },
        tokens: { '--ui-pane-surface': surface },
      },
      {
        title: `Content on surface ${level + 1}`,
        when: { content: level },
        tokens: { '--ui-surface': surface },
      },
    )
  }
  for (const level of [0, 1, 2, 3] as const) {
    const divider = `var(--ui-divider-${level + 1})`
    blocks.push(
      {
        title: `Row dividers ${level + 1}`,
        when: { rowDivider: level },
        tokens: { '--ui-table-row-divider': divider },
      },
      {
        title: `Column dividers ${level + 1}`,
        when: { columnDivider: level },
        tokens: { '--ui-table-column-divider': divider },
      },
    )
  }
  const decorationColor = {
    neutral: undefined,
    primary: 'var(--ui-accent)',
    secondary: 'var(--ui-secondary-accent)',
  } as const
  for (const color of ['primary', 'secondary'] as const) {
    blocks.push(
      {
        title: `${color} decoration dots`,
        when: { dotColor: color },
        tokens: { '--ui-decoration-dot-color': decorationColor[color] },
      },
      {
        title: `${color} decoration borders`,
        when: { borderColor: color },
        tokens: { '--ui-decoration-border-color': decorationColor[color] },
      },
      {
        title: `${color} input decoration`,
        when: { inputDecoration: color },
        tokens: {
          '--ui-input-decoration-dot-color': decorationColor[color],
          '--ui-input-decoration-border-color': decorationColor[color],
        },
      },
    )
  }
  blocks.push({
    title: 'Input decoration turned off',
    when: { inputDecoration: 'none' },
    tokens: {
      '--ui-input-decoration-display': 'none',
      '--ui-input-disclosure-arrow-visibility': 'visible',
    },
  })
  return blocks
}

const quote = (value: string) => `'${value}'`

/** The CSS selector for one block. Zero specificity leaves consumer CSS in control. */
export function tokenSelector(when: TokenCondition) {
  const parts = ['[data-ui-tokens]']
  for (const [key, value] of Object.entries(when) as [
    keyof TokenCondition,
    string | number | null | readonly string[],
  ][]) {
    const attribute = tokenAttributes[key]
    if (value === null) parts.push(`:not([${attribute}])`)
    else if (Array.isArray(value))
      parts.push(
        `:is(${value.map((item: string) => `[${attribute}=${quote(item)}]`).join(', ')})`,
      )
    else parts.push(`[${attribute}=${quote(String(value))}]`)
  }
  return `:where(${parts.join('')})`
}

export function tokenCss(blocks: readonly TokenBlock[]) {
  return blocks
    .map(
      (block) =>
        `/* ${block.title} */\n${tokenSelector(block.when)} {\n${Object.entries(
          block.tokens,
        )
          .map(([name, value]) => `  ${name}: ${value};`)
          .join('\n')}\n}`,
    )
    .join('\n\n')
}

function matches(when: TokenCondition, choices: TokenChoices) {
  return (Object.entries(when) as [keyof TokenCondition, unknown][]).every(
    ([key, value]) => {
      const chosen = choices[key]
      if (value === null) return chosen === undefined
      if (Array.isArray(value)) return value.includes(chosen)
      return chosen === value
    },
  )
}

/** The title of the block that sets each token for one set of choices. */
export function resolveTokenSources(
  blocks: readonly TokenBlock[],
  choices: TokenChoices,
) {
  const sources: Record<string, string> = {}
  for (const block of blocks)
    if (matches(block.when, choices))
      for (const name of Object.keys(block.tokens)) sources[name] = block.title
  return sources
}

/** The declared token values for one set of choices, in cascade order. */
export function resolveTokenBlocks(
  blocks: readonly TokenBlock[],
  choices: TokenChoices,
) {
  const tokens: Record<string, string> = {}
  for (const block of blocks)
    if (matches(block.when, choices)) Object.assign(tokens, block.tokens)
  return tokens
}
