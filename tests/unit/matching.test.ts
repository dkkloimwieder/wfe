import { expect, test } from 'vitest'
import {
  matchSorter,
  matchSorterWithRankInfo,
  rankings,
} from '@wfe/components/search'

test.each([
  ['France', 'France', rankings.CASE_SENSITIVE_EQUAL],
  ['France', 'france', rankings.EQUAL],
  ['France', 'fra', rankings.STARTS_WITH],
  ['South Korea', 'korea', rankings.WORD_STARTS_WITH],
  ['Bahamas', 'ham', rankings.CONTAINS],
  ['United States', 'us', rankings.ACRONYM],
] as const)('preserves upstream ranking for %s and %s', (item, query, rank) => {
  expect(matchSorterWithRankInfo([item], query)[0]?.rank).toBe(rank)
})
test('ordered fuzzy matches differ from substring matching and preserve relevance', () => {
  expect(
    matchSorter(['Gamma Ray', 'Gamma', 'Green Meadow', 'Alpha'], 'gm'),
  ).toEqual(['Green Meadow', 'Gamma', 'Gamma Ray'])
  expect(matchSorter(['Zimbabwe', 'Kuwait'], 'iw')).toEqual(['Zimbabwe'])
  expect(matchSorter(['Uruguay', 'United States of America'], 'ua')).toEqual([
    'Uruguay',
    'United States of America',
  ])
  expect(matchSorter(['Alpha'], 'zz')).toEqual([])
})
test('normalizes captured accented characters and honors keepDiacritics', () => {
  expect(matchSorter(['Café', 'Æther', 'Łódź'], 'cafe')).toEqual(['Café'])
  expect(matchSorter(['Æther'], 'aether')).toEqual(['Æther'])
  expect(matchSorter(['Łódź'], 'lodz')).toEqual(['Łódź'])
  expect(matchSorter(['Café'], 'cafe', { keepDiacritics: true })).toEqual([])
})
test('object keys, getters, thresholds and metadata retain original records without mutation', () => {
  const rows = Object.freeze([
    Object.freeze({ id: 1, name: 'Gamma', nested: { aliases: ['Ray'] } }),
    Object.freeze({
      id: 2,
      name: 'Green Meadow',
      nested: { aliases: ['Field'] },
    }),
  ])
  const result = matchSorter(rows, 'gm', { keys: ['name'] })
  expect(result).toEqual([rows[1], rows[0]])
  expect(result[0]).toBe(rows[1])
  expect(matchSorter(rows, 'ray', { keys: ['nested.aliases'] })).toEqual([
    rows[0],
  ])
  expect(
    matchSorter(rows, 'gam', {
      keys: [(r) => r.name],
      threshold: rankings.STARTS_WITH,
    }),
  ).toEqual([rows[0]])
  const rank = matchSorterWithRankInfo(rows, 'gm', { keys: ['name'] })[0]!
  expect(rank.item).toBe(rows[1])
  expect(rank.index).toBe(1)
  expect(rank.rank).toBe(rankings.ACRONYM)
  expect(rows.map((r) => r.id)).toEqual([1, 2])
})
test('empty queries and tied values remain deterministic', () => {
  expect(matchSorter(['Beta', 'Alpha'], '')).toEqual(['Alpha', 'Beta'])
  const rows = [
    { id: 1, name: 'same' },
    { id: 2, name: 'same' },
  ]
  expect(matchSorter(rows, 'same', { keys: ['name'] })).toEqual(rows)
  expect(matchSorter([], '')).toEqual([])
})
