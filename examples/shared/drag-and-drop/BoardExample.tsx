import { For, Show, createSignal, createUniqueId } from 'solid-js'
import {
  Button,
  Badge,
  FormGrid,
  Select,
  Checkbox,
  DropdownMenu,
  Field,
  Icon,
  IconButton,
  Input,
  Label,
  Sheet,
  EmptyState,
  Spinner,
} from '@wfe/components'
import { DragDropFeedback, DragPreview } from '@wfe/components/dnd'
import { KanbanBoard, KanbanColumn, KanbanItem } from '@wfe/components/kanban'
import { createSortable, moveSortableItem } from '@wfe/components/sortable'
import type {
  SortableContainer,
  SortableId,
  SortableMove,
} from '@wfe/components/sortable'
import { nativeEvents } from '@wfe/components/events'
import { accents } from '@wfe/components/theme'
import { iconEllipsis, iconPlus, iconPencil } from '@wfe/components/icons'
import './style.css'

type Issue = { id: string; title: string; description: string; tags: string[] }
const categories = ['Design', 'Engineering', 'Accessibility', 'Testing']
const stageAccents = {
  planned: accents.find((accent) => accent.name === 'Blue')!,
  active: accents.find((accent) => accent.name === 'Green')!,
}
function stageStyle(id: SortableId) {
  const accent = stageAccents[id as keyof typeof stageAccents]
  return accent
    ? { '--ui-accent': `light-dark(${accent.light}, ${accent.dark})` }
    : undefined
}
const initial: ReadonlyArray<SortableContainer> = [
  { id: 'planned', items: ['outline', 'review', 'test'] },
  { id: 'active', items: ['keyboard'] },
  { id: 'done', items: [] },
]
const titles: Record<string, string> = {
  planned: 'Planned',
  active: 'Active',
  done: 'Done',
}
const seed: Issue[] = [
  {
    id: 'outline',
    title: 'Outline the release',
    tags: ['Engineering'],
    description: 'Agree on the scope before work starts.',
  },
  {
    id: 'review',
    title: 'Review the design',
    tags: ['Design'],
    description: 'Compare the light and dark themes.',
  },
  {
    id: 'test',
    title: 'Test the small screen',
    tags: ['Testing', 'Accessibility'],
    description: 'Use the move menu when a destination is offscreen.',
  },
  {
    id: 'keyboard',
    title: 'Support the keyboard',
    tags: ['Engineering', 'Accessibility'],
    description:
      'Pick up with Space, move with arrows, and drop with Space. Escape cancels.',
  },
]
export function BoardExample() {
  const instructionsId = createUniqueId()
  const columnInstructionsId = createUniqueId()
  const [lanes, setLanes] = createSignal(initial)
  const [issues, setIssues] = createSignal(seed)
  const [readonly, setReadonly] = createSignal(false)
  const [reject, setReject] = createSignal(false)
  const [loading, setLoading] = createSignal(false)
  const [message, setMessage] = createSignal('')
  const [requests, setRequests] = createSignal(0)
  const [selected, setSelected] = createSignal<Issue>()
  const [title, setTitle] = createSignal('')
  const [description, setDescription] = createSignal('')
  const [tags, setTags] = createSignal<string[]>([])
  const [open, setOpen] = createSignal(false)
  const [origin, setOrigin] = createSignal<HTMLElement>()
  let nextId = 1
  const sorter = createSortable({
    get containers() {
      return lanes()
    },
    get disabled() {
      return readonly() || loading()
    },
    onMove(move: SortableMove) {
      setRequests((value) => value + 1)
      if (reject()) {
        setMessage(
          'The example app rejected this move. The board keeps its accepted order.',
        )
        return
      }
      setLanes((current) => moveSortableItem(current, move))
      setMessage(
        `Moved ${issues().find((issue) => issue.id === move.itemId)?.title ?? move.itemId}.`,
      )
    },
  })
  const columnSorter = createSortable({
    get containers() {
      return [{ id: 'board', items: lanes().map((lane) => lane.id) }]
    },
    orientation: 'horizontal',
    get disabled() {
      return readonly() || loading()
    },
    onMove(move: SortableMove) {
      setRequests((value) => value + 1)
      if (reject()) {
        setMessage('The example app rejected this column move.')
        return
      }
      setLanes((current) => {
        const order = [{ id: 'board', items: current.map((lane) => lane.id) }]
        const next = moveSortableItem(order, move)
        if (next === order) return current
        const byId = new Map(current.map((lane) => [lane.id, lane]))
        return next[0]!.items.map((id) => byId.get(id)!)
      })
      setMessage(`Moved ${titles[String(move.itemId)] ?? move.itemId} column.`)
    },
  })
  function edit(issue: Issue | undefined, trigger: HTMLElement) {
    setOrigin(trigger)
    setSelected(issue)
    setTitle(issue?.title ?? '')
    setDescription(issue?.description ?? '')
    setTags([...(issue?.tags ?? [])])
    setOpen(true)
  }
  function save(event: SubmitEvent) {
    event.preventDefault()
    if (readonly() || !title().trim()) return
    const previous = selected()
    if (previous)
      setIssues((current) =>
        current.map((issue) =>
          issue.id === previous.id
            ? {
                ...issue,
                title: title(),
                description: description(),
                tags: [...tags()],
              }
            : issue,
        ),
      )
    else {
      const id = `new-${nextId++}`
      setIssues((current) => [
        ...current,
        { id, title: title(), description: description(), tags: [...tags()] },
      ])
      setLanes((current) =>
        current.map((lane) =>
          lane.id === 'planned'
            ? { ...lane, items: [...lane.items, id] }
            : lane,
        ),
      )
    }
    setMessage(previous ? 'Issue updated.' : 'Issue created.')
    setOpen(false)
  }
  function addSamples() {
    const extra = Array.from({ length: 24 }, () => {
      const id = `sample-${nextId++}`
      return {
        id,
        title: `Sample issue ${id}`,
        tags: ['Testing'],
        description: 'Sample content to explore scrolling and drop targets.',
      }
    })
    setIssues((current) => [...current, ...extra])
    setLanes((current) =>
      current.map((lane) =>
        lane.id === 'planned'
          ? {
              ...lane,
              items: [...lane.items, ...extra.map((issue) => issue.id)],
            }
          : lane,
      ),
    )
  }
  const issueFor = (id: SortableId) =>
    issues().find((issue) => issue.id === id)!
  return (
    <section class="board-example" aria-label="Issue board example">
      <header class="board-example-toolbar">
        <h1>Issue board</h1>
        <Button
          disabled={readonly() || loading()}
          onClick={(event) => edit(undefined, event.currentTarget)}
        >
          <Icon glyph={iconPlus} />
          Create issue
        </Button>
        <Checkbox checked={readonly()} onChange={setReadonly}>
          <Checkbox.Input />
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Label>Read only</Checkbox.Label>
        </Checkbox>
        <Checkbox checked={reject()} onChange={setReject}>
          <Checkbox.Input />
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Label>Reject moves</Checkbox.Label>
        </Checkbox>
        <Checkbox checked={loading()} onChange={setLoading}>
          <Checkbox.Input />
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Label>Loading</Checkbox.Label>
        </Checkbox>
        <Button disabled={readonly() || loading()} onClick={addSamples}>
          Add sample issues
        </Button>
        <Button
          onClick={() => {
            sorter.cancel()
            columnSorter.cancel()
            setLanes(initial)
            setIssues(seed)
            setMessage('Board reset.')
          }}
        >
          Reset
        </Button>
      </header>
      <p class="board-example-help">
        Drag a card to move it. Focus a card and press Space to pick it up.
        Arrow keys choose a destination, Space drops, and Escape cancels. Each
        card also has a move menu.
      </p>
      <Show
        when={!loading()}
        fallback={
          <div class="board-example-loading">
            <Spinner aria-label="Loading issues" />
          </div>
        }
      >
        <KanbanBoard aria-label="Issues">
          <For each={lanes().map((lane) => lane.id)}>
            {(laneId) => {
              const lane = () => lanes().find((value) => value.id === laneId)!
              return (
                <KanbanColumn
                  frameless
                  style={stageStyle(laneId)}
                  headerDecoration={laneId === 'done' ? 'neutral' : 'primary'}
                  headerDecorationAlways
                  instructionsId={columnInstructionsId}
                  sortable={sorter}
                  columnSortable={columnSorter}
                  id={laneId}
                  title={titles[String(laneId)]!}
                  count={lane().items.length}
                  disabled={readonly()}
                >
                  <For each={lane().items}>
                    {(id) => (
                      <KanbanItem
                        title={issueFor(id).title}
                        dragSurface="card"
                        decoration={laneId === 'done' ? 'neutral' : 'primary'}
                        decorationActive={open() && selected()?.id === id}
                        instructionsId={instructionsId}
                        id={id}
                        label={issueFor(id).title}
                        sortable={sorter}
                        disabled={readonly()}
                        data-issue={String(id)}
                        actions={
                          <>
                            <IconButton
                              tone="neutral"
                              aria-label={`Edit ${issueFor(id).title}`}
                              disabled={readonly()}
                              onClick={(event) =>
                                edit(issueFor(id), event.currentTarget)
                              }
                            >
                              <Icon glyph={iconPencil} />
                            </IconButton>
                            <DropdownMenu>
                              <DropdownMenu.Trigger
                                as={IconButton}
                                tone="neutral"
                                aria-label={`Actions for ${issueFor(id).title}`}
                              >
                                <Icon glyph={iconEllipsis} />
                              </DropdownMenu.Trigger>
                              <DropdownMenu.Portal>
                                <DropdownMenu.Content>
                                  <For each={lanes()}>
                                    {(destination) => (
                                      <DropdownMenu.Item
                                        disabled={readonly()}
                                        onSelect={() =>
                                          sorter.requestMove(id, {
                                            containerId: destination.id,
                                            beforeId: null,
                                          })
                                        }
                                      >
                                        Move to {titles[String(destination.id)]}
                                      </DropdownMenu.Item>
                                    )}
                                  </For>
                                </DropdownMenu.Content>
                              </DropdownMenu.Portal>
                            </DropdownMenu>
                          </>
                        }
                      >
                        <p>{issueFor(id).description}</p>
                        <Show when={issueFor(id).tags.length > 0}>
                          <div
                            class="board-example-tags"
                            role="list"
                            aria-label="Categories"
                          >
                            <For each={issueFor(id).tags}>
                              {(tag) => (
                                <Badge role="listitem" data-value="">
                                  {tag}
                                </Badge>
                              )}
                            </For>
                          </div>
                        </Show>
                      </KanbanItem>
                    )}
                  </For>
                  <Show when={lane().items.length === 0}>
                    <EmptyState>No issues</EmptyState>
                  </Show>
                </KanbanColumn>
              )
            }}
          </For>
        </KanbanBoard>
      </Show>
      <DragDropFeedback
        instructionsId={instructionsId}
        scope={sorter.dragDrop}
      />
      <DragPreview scope={sorter.dragDrop} />
      <DragDropFeedback
        instructionsId={columnInstructionsId}
        scope={columnSorter.dragDrop}
      />
      <DragPreview scope={columnSorter.dragDrop} />
      <footer class="board-example-footer">
        <span role="status">{message()}</span>
        <span data-ui-text="system" data-move-requests={requests()}>
          {requests()} move requests
        </span>
      </footer>
      <Sheet open={open()} onOpenChange={setOpen}>
        <Sheet.Portal>
          <Sheet.Overlay />
          <Sheet.Content
            onCloseAutoFocus={(event) => {
              event.preventDefault()
              origin()?.focus()
            }}
          >
            <Sheet.Title>
              {selected() ? 'Issue details' : 'Create issue'}
            </Sheet.Title>
            <Sheet.Description>
              Edit the issue title, description, and categories.
            </Sheet.Description>
            <form
              class="board-example-form"
              ref={nativeEvents({ submit: save })}
            >
              <FormGrid>
                <Field>
                  <Label>Title</Label>
                  <Input
                    required
                    value={title()}
                    onValueChange={setTitle}
                    readonly={readonly()}
                  />
                </Field>
                <Field>
                  <Label>Description</Label>
                  <Input
                    value={description()}
                    onValueChange={setDescription}
                    readonly={readonly()}
                  />
                </Field>
                <Select<string>
                  multiple
                  options={categories}
                  value={tags()}
                  onChange={setTags}
                  disabled={readonly()}
                  itemComponent={(props) => (
                    <Select.Item item={props.item}>
                      <Select.ItemLabel>{props.item.rawValue}</Select.ItemLabel>
                      <Select.ItemIndicator />
                    </Select.Item>
                  )}
                >
                  <Select.Label>Tags</Select.Label>
                  <Select.Trigger>
                    <Select.Value<string>>
                      {(state) =>
                        state.selectedOptions().join(', ') ||
                        'Choose categories'
                      }
                    </Select.Value>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content>
                      <Select.Listbox />
                    </Select.Content>
                  </Select.Portal>
                </Select>
              </FormGrid>
              <div class="ui-form-actions">
                <Button type="submit" disabled={readonly()}>
                  Save
                </Button>
                <Sheet.CloseButton as={Button}>Cancel</Sheet.CloseButton>
              </div>
            </form>
          </Sheet.Content>
        </Sheet.Portal>
      </Sheet>
    </section>
  )
}
