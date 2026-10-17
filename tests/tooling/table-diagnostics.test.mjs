import test from 'node:test'
import assert from 'node:assert/strict'
import {
  expectedTableBreadth,
  expectedTableBreadthMessage,
} from '../../examples/shared/table-diagnostics.mjs'

test('table breadth policy recognizes exact existing nodes and supported console wordings', () => {
  for (const nodeName of [
    'createNativeFiltering.filteredIds',
    'createNativeTable.sortedIds',
    'createNativeGrouping.tree',
    'createNativeGrouping.roots',
    'createGroupView.value',
  ])
    for (const code of ['WIDE_SCOPE_DEPS', 'HUGE_FAN_IN']) {
      assert.equal(expectedTableBreadth({ code, nodeName }), true)
      for (const word of ['memo', 'Computation'])
        assert.equal(
          expectedTableBreadthMessage(
            `[${code}] ${word} "${nodeName}" tracked 2000 sources.\nrepair guide`,
          ),
          true,
        )
    }
})
test('unknown nodes, suffixes, codes and malformed console messages remain failures', () => {
  for (const nodeName of [
    'computed',
    'other',
    'createNativeTable.sortedIds.extra',
    'createNativeTable.sortedIds ',
  ]) {
    assert.equal(expectedTableBreadth({ code: 'HUGE_FAN_IN', nodeName }), false)
    assert.equal(
      expectedTableBreadthMessage(
        `[HUGE_FAN_IN] Computation "${nodeName}" tracked 2000 sources.`,
      ),
      false,
    )
  }
  for (const code of ['STRICT_READ_UNTRACKED', 'HOT_SCOPE_TIME', 'OTHER']) {
    assert.equal(
      expectedTableBreadth({ code, nodeName: 'createNativeTable.sortedIds' }),
      false,
    )
    assert.equal(
      expectedTableBreadthMessage(
        `[${code}] Computation "createNativeTable.sortedIds" tracked 2000 sources.`,
      ),
      false,
    )
  }
  for (const text of [
    '[HUGE_FAN_IN] Computation computed tracked 2000 sources.',
    'prefix [HUGE_FAN_IN] Computation "createNativeTable.sortedIds" tracked 2000 sources.',
    '[HUGE_FAN_IN] Unknown "createNativeTable.sortedIds" tracked 2000 sources.',
  ])
    assert.equal(expectedTableBreadthMessage(text), false)
  assert.equal(expectedTableBreadth(null), false)
  assert.equal(expectedTableBreadth({ code: 'HUGE_FAN_IN' }), false)
})
