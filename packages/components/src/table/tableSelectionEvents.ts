import { nativeSelectionMirror } from './nativeSelectionMirror'
import type { TableSelection, TableSelectionCell } from './createTableSelection'

const interactive =
  'button, a, input, textarea, select, label, summary, [contenteditable]:not([contenteditable="false"]), [role="button"], [role="checkbox"], [role="switch"], [role="slider"], [role="separator"], [role="combobox"], [role="link"], [role="menuitem"], [role="radio"], [role="spinbutton"], [data-table-selection-ignore]'
/** One set of delegated events also covers custom and virtual table bodies. */
export function tableSelectionEvents(
  table: HTMLTableElement,
  selection: TableSelection,
) {
  const viewport = table.closest<HTMLElement>('.table-scroll') ?? table
  const document = table.ownerDocument,
    window = document.defaultView!
  const mirror = nativeSelectionMirror(table, interactive)
  let keyboardOrigin: TableSelectionCell | undefined
  let keyboardReveal = false
  let drag: { id: number; x: number; y: number } | undefined
  let frame = 0,
    disposed = false
  function owned(element: Element) {
    return element.closest('table') === table
  }
  function point(element: Element | null): TableSelectionCell | undefined {
    const cell = element?.closest<HTMLTableCellElement>('td[data-column]')
    const row = cell?.closest<HTMLTableRowElement>('tr[data-row]')
    if (
      !cell ||
      !row ||
      !owned(cell) ||
      row.dataset.row === undefined ||
      cell.dataset.column === undefined
    )
      return
    const value = { row: row.dataset.row, column: cell.dataset.column }
    return selection.contains(value) ? value : undefined
  }
  function clearCell(cell: HTMLElement) {
    cell.removeAttribute('data-cell-selection')
    cell.removeAttribute('data-selection-active')
    cell.removeAttribute('data-selection-edges')
  }
  function paint() {
    if (disposed) return
    const selected: HTMLTableCellElement[] = []
    for (const cell of table.querySelectorAll<HTMLTableCellElement>(
      'td[data-column]',
    )) {
      if (!owned(cell)) continue
      const value = point(cell),
        state = value && selection.cellState(value)
      if (!state) {
        clearCell(cell)
        continue
      }
      selected.push(cell)
      cell.setAttribute('data-cell-selection', '')
      cell.toggleAttribute('data-selection-active', state.active)
      cell.setAttribute('data-selection-edges', state.edges)
    }
    const focus = selection.range?.focus
    if (!focus) {
      stop()
      mirror.release()
      keyboardOrigin = undefined
      keyboardReveal = false
      return
    }
    if (
      keyboardReveal &&
      (focus.row !== keyboardOrigin?.row ||
        focus.column !== keyboardOrigin?.column)
    ) {
      keyboardReveal = !reveal()
    }
    mirror.sync(selected)
  }
  // Ignore content changes inside cells. Only row/cell structure affects painting.
  const observer = new MutationObserver((changes) => {
    if (
      changes.some((change) => {
        if (change.type === 'attributes') return owned(change.target as Element)
        return [...change.addedNodes].some(
          (node) =>
            node instanceof Element &&
            ((node.matches('tr[data-row], td[data-column]') && owned(node)) ||
              Array.from(
                node.querySelectorAll('tr[data-row], td[data-column]'),
              ).some(owned)),
        )
      })
    )
      paint()
  })
  observer.observe(table, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-row', 'data-column'],
  })
  function stop() {
    const current = drag
    drag = undefined
    window.cancelAnimationFrame(frame)
    frame = 0
    window.removeEventListener('blur', stop)
    document.removeEventListener('visibilitychange', visibility)
    if (current && viewport.hasPointerCapture(current.id))
      viewport.releasePointerCapture(current.id)
  }
  function visibility() {
    if (document.hidden) stop()
  }
  function update() {
    frame = 0
    if (!drag) return
    const rect = viewport.getBoundingClientRect()
    const dx = drag.x < rect.left + 24 ? -12 : drag.x > rect.right - 24 ? 12 : 0
    const dy = drag.y < rect.top + 24 ? -12 : drag.y > rect.bottom - 24 ? 12 : 0
    const beforeX = viewport.scrollLeft,
      beforeY = viewport.scrollTop
    if (dx || dy) viewport.scrollBy(dx, dy)
    const element = document.elementFromPoint(
      Math.max(rect.left + 1, Math.min(rect.right - 1, drag.x)),
      Math.max(rect.top + 1, Math.min(rect.bottom - 1, drag.y)),
    )
    const value = point(element)
    if (value) selection.select(value, true)
    if (beforeX !== viewport.scrollLeft || beforeY !== viewport.scrollTop)
      frame = window.requestAnimationFrame(update)
  }
  function down(event: PointerEvent) {
    if (event.target instanceof Element && event.target.closest(interactive))
      mirror.release()
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      !event.isPrimary ||
      event.pointerType === 'touch' ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      !(event.target instanceof Element) ||
      event.target.closest(interactive)
    )
      return
    const value = point(event.target)
    if (!value) return
    event.preventDefault()
    keyboardReveal = false
    stop()
    document.getSelection()?.removeAllRanges()
    table.focus({ preventScroll: true })
    selection.select(value, event.shiftKey)
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY }
    viewport.setPointerCapture(event.pointerId)
    window.addEventListener('blur', stop)
    document.addEventListener('visibilitychange', visibility)
  }
  function move(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.id) return
    drag.x = event.clientX
    drag.y = event.clientY
    if (!frame) frame = window.requestAnimationFrame(update)
  }
  function finish(event: PointerEvent) {
    if (event.pointerId !== drag?.id) return
    if (event.type === 'pointerup') {
      window.cancelAnimationFrame(frame)
      frame = 0
      drag.x = event.clientX
      drag.y = event.clientY
      update()
    }
    stop()
  }
  function eventOwned(event: Event) {
    const target = event.target
    return (
      target instanceof Element &&
      (target === viewport || owned(target)) &&
      !target.closest(interactive)
    )
  }
  function reveal() {
    const focus = selection.range?.focus
    if (!focus) return false
    for (const cell of table.querySelectorAll<HTMLTableCellElement>(
      'td[data-column]',
    )) {
      const value = point(cell)
      if (value?.row === focus.row && value.column === focus.column) {
        const box = cell.getBoundingClientRect(),
          frame = viewport.getBoundingClientRect()
        const left = frame.left + viewport.clientLeft,
          right = left + viewport.clientWidth
        let top = frame.top + viewport.clientTop
        const bottom = top + viewport.clientHeight
        const header = table.tHead
        if (header && window.getComputedStyle(header).position === 'sticky')
          top = Math.max(top, header.getBoundingClientRect().bottom)
        const x =
          box.width > right - left || box.left < left
            ? box.left - left
            : Math.max(0, box.right - right)
        const y =
          box.height > bottom - top || box.top < top
            ? box.top - top
            : Math.max(0, box.bottom - bottom)
        if (x || y) viewport.scrollBy(x, y)
        return true
      }
    }
    return false
  }
  function key(event: KeyboardEvent) {
    if (
      event.defaultPrevented ||
      event.isComposing ||
      event.altKey ||
      !eventOwned(event)
    )
      return
    const arrows: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    }
    const delta = arrows[event.key]
    if (delta && !event.ctrlKey && !event.metaKey) {
      event.preventDefault()
      keyboardOrigin = selection.range?.focus
      keyboardReveal = true
      selection.move(...delta, event.shiftKey)
    } else if (
      event.key === ' ' &&
      event.shiftKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      event.preventDefault()
      selection.selectRow()
    } else if (event.key === ' ' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      selection.selectColumn()
    } else if (
      event.key.toLowerCase() === 'a' &&
      (event.ctrlKey || event.metaKey)
    ) {
      event.preventDefault()
      selection.selectAll()
    } else if (event.key === 'Escape' && (drag || selection.range)) {
      event.preventDefault()
      stop()
      selection.clear()
    }
  }
  function copy(event: ClipboardEvent) {
    if (
      event.defaultPrevented ||
      !event.clipboardData ||
      !eventOwned(event) ||
      !selection.range ||
      (!document.getSelection()?.isCollapsed && !mirror.owns())
    )
      return
    const active = document.activeElement
    if (!active || !(active === viewport || owned(active))) return
    let text: string | undefined
    try {
      text = selection.copyText()
    } catch {
      if (mirror.owns()) event.preventDefault()
      mirror.release()
      return
    }
    if (text === undefined) return
    event.clipboardData.setData('text/plain', text)
    event.preventDefault()
  }
  const handlers = {
    pointerdown: down,
    pointermove: move,
    pointerup: finish,
    pointercancel: finish,
    lostpointercapture: finish,
    keydown: key,
    copy,
    focusin: (event: FocusEvent) => {
      if (event.target === table) paint()
    },
  }
  for (const [name, handler] of Object.entries(handlers))
    viewport.addEventListener(name, handler as EventListener)
  table.setAttribute('data-table-selection', '')
  paint()
  return {
    paint,
    dispose() {
      disposed = true
      stop()
      observer.disconnect()
      mirror.dispose()
      for (const [name, handler] of Object.entries(handlers))
        viewport.removeEventListener(name, handler as EventListener)
      table.removeAttribute('data-table-selection')
      for (const cell of table.querySelectorAll<HTMLTableCellElement>(
        'td[data-cell-selection]',
      ))
        if (owned(cell)) clearCell(cell)
    },
  }
}
