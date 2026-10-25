import { For, createSignal, createUniqueId } from 'solid-js'
import { Button, Checkbox, DropdownMenu } from '@wfe/components'
import {
  createDragDrop,
  createDraggable,
  createDroppable,
  DragDropFeedback,
  DragHandle,
  DragPreview,
  DropIndicator,
} from '@wfe/components/dnd'
import {
  createSortable,
  createSortableContainer,
  createSortableItem,
  moveSortableItem,
} from '@wfe/components/sortable'
import type { SortableContainer, SortableId } from '@wfe/components/sortable'
import './generic.css'

const destinations = ['Library', 'Archive'] as const
const initial: ReadonlyArray<SortableContainer> = [
  { id: 'agenda', items: ['Plan', 'Write', 'Review'] },
]

/** Application state and rejection are deliberately local example choices. */
export function DragExample() {
  const instructions = createUniqueId()
  const sortingInstructions = createUniqueId()
  const [disabled, setDisabled] = createSignal(false)
  const [reject, setReject] = createSignal(false)
  const [location, setLocation] = createSignal('Unassigned')
  const [message, setMessage] = createSignal('')
  const [containers, setContainers] = createSignal(initial)
  const scope = createDragDrop<string>({
    get disabled() {
      return disabled()
    },
    onDrop(request) {
      if (reject()) {
        setMessage('The example rejected the assignment.')
        return
      }
      setLocation(request.target.data)
      setMessage(`Assigned the document to ${request.target.label}.`)
    },
  })
  const source = createDraggable(scope, {
    id: 'document',
    label: 'Draft document',
    data: 'document',
  })
  const sorter = createSortable({
    get containers() {
      return containers()
    },
    get disabled() {
      return disabled()
    },
    onMove(request) {
      if (reject()) {
        setMessage('The example rejected the reorder.')
        return
      }
      setContainers((current) => moveSortableItem(current, request))
      setMessage(`Moved ${request.itemId}.`)
    },
  })
  const list = createSortableContainer(sorter, {
    id: 'agenda',
    label: 'Agenda',
  })
  const firstOther = (id: SortableId) =>
    containers()[0]!.items.find((item) => item !== id) ?? null
  return (
    <div class="drag-example">
      <section class="drag-example-section">
        <h2>Drag and drop</h2>
        <p>
          These examples use application-owned state. Reject a request to keep
          the accepted value unchanged. Drag a handle, use Space and arrow keys,
          or use its move menu.
        </p>
        <div class="drag-example-actions">
          <Checkbox checked={disabled()} onChange={setDisabled}>
            <Checkbox.Input />
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Checkbox.Label>Disable movement</Checkbox.Label>
          </Checkbox>
          <Checkbox checked={reject()} onChange={setReject}>
            <Checkbox.Input />
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Checkbox.Label>Reject requests</Checkbox.Label>
          </Checkbox>
          <Button
            onClick={() => {
              scope.cancel()
              sorter.cancel()
              setLocation('Unassigned')
              setContainers(initial)
              setMessage('Reset.')
            }}
          >
            Reset
          </Button>
        </div>
      </section>
      <section class="drag-example-section" aria-label="Assign a document">
        <h2>Generic targets</h2>
        <article ref={source.ref} class="drag-example-source">
          <DragHandle
            drag={source}
            label="Move draft document"
            disabled={disabled()}
            aria-describedby={instructions}
          />
          <span>Draft document</span>
          <DropdownMenu>
            <DropdownMenu.Trigger as={Button} disabled={disabled()}>
              Assign to
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content>
                <For each={destinations}>
                  {(destination) => (
                    <DropdownMenu.Item
                      onSelect={() =>
                        scope.requestDrop('document', destination)
                      }
                    >
                      Assign to {destination}
                    </DropdownMenu.Item>
                  )}
                </For>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu>
        </article>
        <p>
          Accepted location:{' '}
          <output data-document-location>{location()}</output>
        </p>
        <div class="drag-example-targets">
          <For each={destinations}>
            {(destination) => {
              const target = createDroppable(scope, {
                id: destination,
                label: destination,
                data: destination,
              })
              return (
                <div
                  ref={target.ref}
                  class="drag-example-target"
                  data-targeted={target.targeted() ? '' : undefined}
                >
                  <span>{destination}</span>
                  <DropIndicator active={target.targeted()} />
                </div>
              )
            }}
          </For>
        </div>
        <DragDropFeedback scope={scope} instructionsId={instructions} />
        <DragPreview scope={scope} tone="primary" />
      </section>
      <section class="drag-example-section" aria-label="Sortable agenda">
        <h2>Controlled list</h2>
        <ol ref={list.ref} class="drag-example-list">
          <For each={containers()[0]!.items}>
            {(id) => {
              const item = createSortableItem(sorter, { id, label: String(id) })
              return (
                <li ref={item.ref} data-agenda-item={String(id)}>
                  <DropIndicator
                    active={sorter.preview()?.destination.beforeId === id}
                  />
                  <div class="drag-example-source">
                    <DragHandle
                      drag={item}
                      label={`Move ${id}`}
                      disabled={disabled()}
                      aria-describedby={sortingInstructions}
                    />
                    <span>{id}</span>
                    <DropdownMenu>
                      <DropdownMenu.Trigger as={Button} disabled={disabled()}>
                        Move
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content>
                          <DropdownMenu.Item
                            onSelect={() =>
                              sorter.requestMove(id, {
                                containerId: 'agenda',
                                beforeId: firstOther(id),
                              })
                            }
                          >
                            Move to start
                          </DropdownMenu.Item>
                          <DropdownMenu.Item
                            onSelect={() =>
                              sorter.requestMove(id, {
                                containerId: 'agenda',
                                beforeId: null,
                              })
                            }
                          >
                            Move to end
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu>
                  </div>
                </li>
              )
            }}
          </For>
        </ol>
        <DragDropFeedback
          scope={sorter.dragDrop}
          instructionsId={sortingInstructions}
        />
        <DragPreview scope={sorter.dragDrop} tone="secondary" />
      </section>
      <p role="status" class="drag-example-section">
        {message() || 'No requests yet.'}
      </p>
    </div>
  )
}
