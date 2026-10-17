// These existing local derivations intentionally scan candidate records.
const nodes = new Set([
  'createNativeFiltering.filteredIds',
  'createNativeTable.sortedIds',
  'createNativeGrouping.tree',
  'createNativeGrouping.roots',
  'createGroupView.value',
])
export function expectedTableBreadth(event) {
  return Boolean(
    event &&
    ['WIDE_SCOPE_DEPS', 'HUGE_FAN_IN'].includes(event.code) &&
    nodes.has(event.nodeName),
  )
}
export function expectedTableBreadthMessage(message) {
  const match =
    /^\[(WIDE_SCOPE_DEPS|HUGE_FAN_IN)\] (?:memo|Computation) "([^"]+)"(?:\s|$)/.exec(
      message,
    )
  return Boolean(
    match && expectedTableBreadth({ code: match[1], nodeName: match[2] }),
  )
}
