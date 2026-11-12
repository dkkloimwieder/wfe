// Generated from built declarations by tests/consumers/generate.mjs.
// Resolve only public package exports through the workspace node_modules links.
import type {
  ChartAxisDescription,
  ChartDescription,
  ChartLayerDescription,
  ChartView,
  ChartViewBindings,
} from '@wfe/generator/chart'
import type { AllTyped, Assert } from '../assertions.js'

export type ExportedTypes = Assert<
  AllTyped<{
    ChartAxisDescription: ChartAxisDescription<{ id: string; value: string }>
    ChartDescription: ChartDescription
    ChartLayerDescription: ChartLayerDescription<{ id: string; value: string }>
    ChartView: typeof ChartView
    ChartViewBindings: ChartViewBindings<{ id: string; value: string }>
  }>
>
