import assert from 'node:assert/strict'
import test from 'node:test'
import {
  matchSorter,
  matchSorterWithRankInfo,
  rankings,
} from '@wfe/components/search'

test('public search entry ranks records without a DOM or runtime matching dependency', () => {
  const records = [{ name: 'Gamma' }, { name: 'Green Meadow' }]
  assert.deepEqual(matchSorter(records, 'gm', { keys: ['name'] }), [
    records[1],
    records[0],
  ])
  assert.equal(
    matchSorterWithRankInfo(records, 'gm', { keys: ['name'] })[0].rank,
    rankings.ACRONYM,
  )
})
