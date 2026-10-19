import type { ChartTheme } from '../vendor/charts/charts-core/src/types'
/** Paint uses inherited roles. Applications can provide a series palette in the definition. */
export const chartTheme: ChartTheme = {
  foreground: 'var(--ui-text, currentColor)',
  muted: 'var(--ui-muted-text, currentColor)',
  grid: 'var(--ui-divider, currentColor)',
  background: 'var(--ui-surface, Canvas)',
  palette: ['var(--ui-accent, var(--ui-focus, currentColor))'],
}
