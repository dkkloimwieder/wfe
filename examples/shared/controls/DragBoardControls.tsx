import { For, createSignal, createUniqueId } from 'solid-js'
import { Button, Input } from '@wfe/components'
import {
  createDragDrop,
  createDraggable,
  createDroppable,
  DragHandle,
  DragDropFeedback,
  DragPreview,
} from '@wfe/components/dnd'
import { createSortable, moveSortableItem } from '@wfe/components/sortable'
import type { SortableContainer } from '@wfe/components/sortable'
import { KanbanBoard, KanbanColumn, KanbanItem } from '@wfe/components/kanban'

export function DragBoardControls() {
  const help = createUniqueId()
  const [assigned, setAssigned] = createSignal(false)
  const [columns, setColumns] = createSignal<ReadonlyArray<SortableContainer>>([
    { id: 'first', items: ['draft'] },
    { id: 'second', items: [] },
  ])
  const [requests, setRequests] = createSignal(0)
  const scope = createDragDrop({
    onDrop() {
      setAssigned(true)
    },
  })
  const source = createDraggable(scope, {
    id: 'sample',
    label: 'Hydrated sample',
    data: null,
  })
  const target = createDroppable(scope, {
    id: 'destination',
    label: 'Hydrated destination',
    data: null,
  })
  const sorter = createSortable({
    get containers() {
      return columns()
    },
    onMove(move) {
      setRequests((value) => value + 1)
      setColumns((current) => moveSortableItem(current, move))
    },
  })
  return (
    <section id="drag-board-review" aria-label="Hydrated dragging">
      <div ref={source.ref} data-drag-adopt="source">
        <DragHandle drag={source} label="Move hydrated sample" />
        <Button onClick={() => scope.requestDrop('sample', 'destination')}>
          Assign hydrated sample
        </Button>
      </div>
      <div ref={target.ref} data-drag-adopt="target">
        Hydrated destination
      </div>
      <output data-generic-assigned>
        {assigned() ? 'Assigned' : 'Unassigned'}
      </output>
      <DragDropFeedback scope={scope} />
      <DragPreview scope={scope} />
      <KanbanBoard
        aria-label="Hydrated board"
        data-drag-adopt="board"
        style={{ height: '20rem' }}
      >
        <For each={columns()}>
          {(column) => (
            <KanbanColumn
              id={column.id}
              title={column.id === 'first' ? 'First lane' : 'Second lane'}
              sortable={sorter}
            >
              <For each={column.items}>
                {(id) => (
                  <KanbanItem
                    id={id}
                    label="Hydrated draft"
                    sortable={sorter}
                    instructionsId={help}
                    data-hydrated-card
                  >
                    <Input
                      aria-label="Hydrated card draft"
                      value="Keep this draft"
                    />
                  </KanbanItem>
                )}
              </For>
            </KanbanColumn>
          )}
        </For>
      </KanbanBoard>
      <Button
        onClick={() =>
          sorter.requestMove('draft', { containerId: 'second', beforeId: null })
        }
      >
        Move hydrated draft to second lane
      </Button>
      <output data-hydrated-move-count>{requests()}</output>
      <DragDropFeedback scope={sorter.dragDrop} instructionsId={help} />
      <DragPreview scope={sorter.dragDrop} />
    </section>
  )
}
