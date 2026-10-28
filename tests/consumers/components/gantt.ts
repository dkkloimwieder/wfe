// Generated from built declarations by tests/consumers/generate.mjs.
// Resolve only public package exports through the workspace node_modules links.
import type {
  Gantt,
  GanttChange,
  GanttDependency,
  GanttId,
  GanttInterval,
  GanttProps,
  GanttRange,
  GanttRow,
} from '@wfe/components/gantt'
import type { AllTyped, Assert } from '../assertions.js'

export type ExportedTypes = Assert<
  AllTyped<{
    Gantt: typeof Gantt
    GanttChange: GanttChange
    GanttDependency: GanttDependency
    GanttId: GanttId
    GanttInterval: GanttInterval
    GanttProps: GanttProps
    GanttRange: GanttRange
    GanttRow: GanttRow
  }>
>
