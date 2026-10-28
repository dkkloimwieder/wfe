// Generated from built declarations by tests/consumers/generate.mjs.
// Resolve only public package exports through the workspace node_modules links.
import type {
  KanbanBoard,
  KanbanBoardProps,
  KanbanColumn,
  KanbanColumnProps,
  KanbanItem,
  KanbanItemProps,
} from '@wfe/components/kanban'
import type { AllTyped, Assert } from '../assertions.js'

export type ExportedTypes = Assert<
  AllTyped<{
    KanbanBoard: typeof KanbanBoard
    KanbanBoardProps: KanbanBoardProps
    KanbanColumn: typeof KanbanColumn
    KanbanColumnProps: KanbanColumnProps
    KanbanItem: typeof KanbanItem
    KanbanItemProps: KanbanItemProps
  }>
>
