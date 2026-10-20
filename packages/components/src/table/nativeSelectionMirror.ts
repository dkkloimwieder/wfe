/** A DOM range enables the browser Copy command. Logical IDs still own copy text. */
export function nativeSelectionMirror(
  table: HTMLTableElement,
  interactive: string,
) {
  const document = table.ownerDocument
  let range: Range | undefined
  function owns() {
    const selection = document.getSelection()
    if (!range || !selection || selection.rangeCount !== 1) return false
    const current = selection.getRangeAt(0)
    return (
      current.compareBoundaryPoints(0, range) === 0 &&
      current.compareBoundaryPoints(2, range) === 0
    )
  }
  function release() {
    if (owns()) document.getSelection()?.removeAllRanges()
    range = undefined
    table.removeAttribute('data-native-cell-selection')
  }
  function changed() {
    if (range && !owns()) {
      range = undefined
      table.removeAttribute('data-native-cell-selection')
    }
  }
  function focus(event: FocusEvent) {
    const target = event.target
    if (!(target instanceof Element) || target === table) return
    if (target.closest('table') !== table || target.closest(interactive))
      release()
  }
  document.addEventListener('selectionchange', changed)
  document.addEventListener('focusin', focus, true)
  return {
    owns,
    release,
    sync(cells: readonly HTMLTableCellElement[]) {
      const active = document.activeElement
      const selection = document.getSelection()
      if (
        !active ||
        active.closest('table') !== table ||
        active.closest(interactive)
      ) {
        release()
        return
      }
      // Never replace another selection, including native text outside this table.
      if (!selection || (!selection.isCollapsed && !owns())) {
        changed()
        return
      }
      const first = cells[0],
        last = cells[cells.length - 1]
      if (!first || !last) {
        release()
        return
      }
      const next = document.createRange()
      // Selecting the cell nodes also gives empty or icon-only cells a DOM range.
      next.setStartBefore(first)
      next.setEndAfter(last)
      range = next.cloneRange()
      selection.removeAllRanges()
      selection.addRange(next)
      table.setAttribute('data-native-cell-selection', '')
    },
    dispose() {
      release()
      document.removeEventListener('selectionchange', changed)
      document.removeEventListener('focusin', focus, true)
    },
  }
}
