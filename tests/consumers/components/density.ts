// Generated from built declarations by tests/consumers/generate.mjs.
// Resolve only public package exports through the workspace node_modules links.
import type {
  UI_DENSITIES,
  uiDensity,
  UIDensity,
  uiScope,
} from '@wfe/components/density'
import type { AllTyped, Assert } from '../assertions.js'

export type ExportedTypes = Assert<
  AllTyped<{
    UI_DENSITIES: typeof UI_DENSITIES
    uiDensity: typeof uiDensity
    UIDensity: UIDensity
    uiScope: typeof uiScope
  }>
>
