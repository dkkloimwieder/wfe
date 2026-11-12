// Tree keyboard navigation adapted from Terracotta, MIT © 2025 Alexis Munsayac.
// See LICENSE and provenance.json in this directory.
import {
  For,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  untrack,
} from 'solid-js'
import { DisclosureIndicator } from '../components/DisclosureIndicator'
import { Button } from '../components/NativeFields'

export type TreeNode = {
  id: string
  label: string
  disabled?: boolean
  children?: readonly TreeNode[]
}
export type TreeProps = {
  label: string
  nodes: readonly TreeNode[]
  selected: readonly string[]
  expanded: readonly string[]
  multiple?: boolean
  dir?: 'ltr' | 'rtl'
  onSelectionChange: (ids: readonly string[]) => void
  onExpandedChange: (ids: readonly string[]) => void
}
type Row = {
  node: TreeNode
  level: number
  position: number
  size: number
  parent?: string
}

/** A controlled experimental tree. Applications own records, selection and expansion. */
export function Tree(props: TreeProps) {
  let root: HTMLDivElement | undefined
  let lastFocused: HTMLElement | undefined
  const elements = new Map<string, HTMLDivElement>()
  const [focused, setFocused] = createSignal<string>()
  const model = createMemo(() => {
    const all = new Map<string, Row>()
    const visible: Row[] = []
    const expanded = new Set(props.expanded)
    function visit(
      nodes: readonly TreeNode[],
      level: number,
      shown: boolean,
      parent?: string,
    ) {
      nodes.forEach((node, index) => {
        if (!node.id || all.has(node.id))
          throw new Error('Tree node IDs must be nonempty and unique')
        const row = {
          node,
          level,
          position: index + 1,
          size: nodes.length,
          parent,
        }
        all.set(node.id, row)
        if (shown) visible.push(row)
        if (node.children)
          visit(
            node.children,
            level + 1,
            shown && expanded.has(node.id),
            node.id,
          )
      })
    }
    visit(props.nodes, 1, true)
    return { all, visible }
  })
  const tabStop = createMemo(() => {
    const { all, visible } = model()
    const ids = new Set(visible.map((row) => row.node.id))
    let candidate = focused()
    while (candidate && !ids.has(candidate))
      candidate = all.get(candidate)?.parent
    return (
      candidate ??
      visible.find((row) => props.selected.includes(row.node.id))?.node.id ??
      visible[0]?.node.id
    )
  })
  function focus(id: string | undefined) {
    if (id) elements.get(id)?.focus()
  }
  createEffect(tabStop, (id) => {
    if (!root || !lastFocused || root.ownerDocument.activeElement === undefined)
      return
    const active = root.ownerDocument.activeElement
    if (
      !lastFocused.isConnected &&
      (active === root.ownerDocument.body || (active && root.contains(active)))
    ) {
      if (id) focus(id)
      else root.focus()
    }
  })
  function select(node: TreeNode) {
    if (node.disabled) return
    props.onSelectionChange(
      props.multiple
        ? props.selected.includes(node.id)
          ? props.selected.filter((id) => id !== node.id)
          : [...props.selected, node.id]
        : [node.id],
    )
  }
  function expand(node: TreeNode, open: boolean) {
    if (!node.children?.length || props.expanded.includes(node.id) === open)
      return
    props.onExpandedChange(
      open
        ? [...props.expanded, node.id]
        : props.expanded.filter((id) => id !== node.id),
    )
  }
  let query = ''
  let timeout: ReturnType<typeof setTimeout> | undefined
  onCleanup(() => {
    clearTimeout(timeout)
    elements.clear()
    lastFocused = undefined
    root = undefined
  })
  function key(event: KeyboardEvent, row: Row) {
    if (
      event.defaultPrevented ||
      event.isComposing ||
      event.target !== event.currentTarget
    )
      return
    const rows = model().visible
    const index = rows.findIndex((item) => item.node.id === row.node.id)
    const open = props.expanded.includes(row.node.id)
    const forward = props.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
    const backward = props.dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft'
    switch (event.key) {
      case 'ArrowDown':
        focus(rows[index + 1]?.node.id)
        break
      case 'ArrowUp':
        focus(rows[index - 1]?.node.id)
        break
      case 'Home':
        focus(rows[0]?.node.id)
        break
      case 'End':
        focus(rows.at(-1)?.node.id)
        break
      case forward:
        if (!open) expand(row.node, true)
        else if (rows[index + 1]?.parent === row.node.id)
          focus(rows[index + 1]?.node.id)
        break
      case backward:
        if (open && row.node.children?.length) expand(row.node, false)
        else focus(row.parent)
        break
      case 'Enter':
      case ' ':
        select(row.node)
        break
      default: {
        if (
          event.key.length !== 1 ||
          event.ctrlKey ||
          event.metaKey ||
          event.altKey
        )
          return
        clearTimeout(timeout)
        const character = event.key.toLocaleLowerCase()
        query = query === character ? character : query + character
        const start = query.length === 1 ? index + 1 : index
        for (let offset = 0; offset < rows.length; offset++) {
          const candidate = rows[(start + offset) % rows.length]
          if (candidate?.node.label.toLocaleLowerCase().startsWith(query)) {
            focus(candidate.node.id)
            break
          }
        }
        timeout = setTimeout(() => {
          query = ''
        }, 500)
      }
    }
    event.preventDefault()
    event.stopPropagation()
  }
  return (
    <div
      data-ui=""
      class="ui-tree"
      role="tree"
      aria-label={props.label}
      aria-multiselectable={props.multiple ? 'true' : undefined}
      dir={props.dir}
      tabindex={model().visible.length ? -1 : 0}
      ref={(element) => {
        root = element
      }}
    >
      <For each={model().visible} keyed={(row) => row.node.id}>
        {(row) => {
          const id = untrack(() => row().node.id)
          onCleanup(() => {
            elements.delete(id)
          })
          return (
            <div
              class="ui-tree-item"
              data-ui-section-decoration="accent"
              data-ui-section-active={
                props.selected.includes(row().node.id) ? '' : undefined
              }
              role="treeitem"
              data-tree-id={row().node.id}
              aria-label={row().node.label}
              aria-level={row().level}
              aria-posinset={row().position}
              aria-setsize={row().size}
              aria-selected={
                props.selected.includes(row().node.id) ? 'true' : 'false'
              }
              aria-disabled={row().node.disabled ? 'true' : undefined}
              aria-expanded={
                row().node.children?.length
                  ? props.expanded.includes(row().node.id)
                    ? 'true'
                    : 'false'
                  : undefined
              }
              tabindex={tabStop() === row().node.id ? 0 : -1}
              style={{
                '--ui-tree-depth': row().level - 1,
              }}
              ref={(element) => {
                elements.set(id, element)
              }}
              onFocus={(event) => {
                lastFocused = event.currentTarget
                setFocused(row().node.id)
              }}
              onKeyDown={(event) => key(event, row())}
              onClick={(event) => {
                if ((event.target as Element).closest('button')) return
                event.currentTarget.focus()
                select(row().node)
              }}
            >
              <Button
                variant="outline"
                class="ui-tree-toggle ui-disclosure-trigger"
                tabindex={-1}
                aria-label={`${props.expanded.includes(row().node.id) ? 'Collapse' : 'Expand'} ${row().node.label}`}
                aria-hidden={row().node.children?.length ? undefined : 'true'}
                disabled={!row().node.children?.length}
                onClick={(event) => {
                  event.stopPropagation()
                  focus(row().node.id)
                  expand(row().node, !props.expanded.includes(row().node.id))
                }}
              >
                <DisclosureIndicator
                  class="ui-tree-symbol"
                  shape={
                    props.expanded.includes(row().node.id) ? 'minus' : 'plus'
                  }
                />
              </Button>
              <span class="ui-tree-label">{row().node.label}</span>
            </div>
          )
        }}
      </For>
    </div>
  )
}
