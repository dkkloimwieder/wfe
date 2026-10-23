import { resolveTableMessages, type TableMessages } from './messages'
import { Show, createSignal, onSettled } from 'solid-js'
import { Button, Input } from '../components/NativeFields'
import { nativeEvents } from '../utils/nativeEvents'
import { TableSort } from './TableSort'

export function TableHeaderName(props: {
  messages?: Partial<TableMessages>
  label: string
  sorted: 'asc' | 'desc' | false
  onSort: () => void
  onRename: (label: string) => void
  sortingDisabled?: boolean
}) {
  const messages = resolveTableMessages(() => props.messages)
  const [editing, setEditing] = createSignal(false)
  let rename!: HTMLButtonElement
  return (
    <>
      <Show
        when={editing()}
        fallback={
          <TableSort
            messages={props.messages}
            label={props.label}
            sorted={props.sorted}
            class="header-sort"
            accessibleLabel={messages.sortHeader(props.label)}
            onSort={props.onSort}
            disabled={props.sortingDisabled}
          />
        }
      >
        <HeaderEditor
          messages={props.messages}
          label={props.label}
          done={(value, restoreFocus) => {
            if (value !== undefined) props.onRename(value)
            setEditing(false)
            if (restoreFocus)
              queueMicrotask(() => rename.focus({ preventScroll: true }))
          }}
        />
      </Show>
      <Button
        type="button"
        class="header-rename"
        hidden={editing()}
        aria-label={messages.renameColumnHeader(props.label)}
        title={messages.renameHeader}
        ref={[
          (node) => {
            rename = node
          },
          nativeEvents({ click: () => setEditing(true) }),
        ]}
      >
        ✎
      </Button>
    </>
  )
}

function HeaderEditor(props: {
  messages?: Partial<TableMessages>
  label: string
  done: (value: string | undefined, restoreFocus: boolean) => void
}) {
  const messages = resolveTableMessages(() => props.messages)
  let input!: HTMLInputElement
  let finished = false
  function finish(value: string | undefined, restoreFocus = false) {
    if (finished) return
    finished = true
    props.done(value, restoreFocus)
  }
  onSettled(() => {
    input.focus({ preventScroll: true })
    input.select()
  })
  return (
    <Input
      class="header-name"
      type="text"
      aria-label={messages.headerName(props.label)}
      defaultValue={props.label}
      ref={[
        (node) => {
          input = node
        },
        nativeEvents<HTMLInputElement>({
          blur: (event) => finish(event.currentTarget.value),
          keydown: (event) => {
            if (event.isComposing) return
            if (event.key === 'Enter' || event.key === 'Escape') {
              event.preventDefault()
              event.stopPropagation()
              finish(
                event.key === 'Enter' ? event.currentTarget.value : undefined,
                true,
              )
            }
          },
        }),
      ]}
    />
  )
}
