// Generated from built declarations by tests/consumers/generate.mjs.
// Resolve only public package exports through the workspace node_modules links.
import type {
  KeyOption,
  matchSorter,
  MatchSorterOptions,
  matchSorterWithRankInfo,
  RankedItem,
  rankings,
} from '@wfe/components/search'
import type { AllTyped, Assert } from '../assertions.js'

export type ExportedTypes = Assert<
  AllTyped<{
    KeyOption: KeyOption<unknown>
    matchSorter: typeof matchSorter
    MatchSorterOptions: MatchSorterOptions
    matchSorterWithRankInfo: typeof matchSorterWithRankInfo
    RankedItem: RankedItem<unknown>
    rankings: typeof rankings
  }>
>
