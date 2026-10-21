# Combobox matching

`Combobox` filters by `contains` unless the caller overrides `defaultFilter`.
Use `defaultFilter="startsWith"` for prefix matching or `defaultFilter="contains"` for matching anywhere in a label.
Both use the existing locale-aware comparison and ignore case at the default comparison strength.
`optionTextValue` selects the text to match for object options.

The gallery at `?gallery=choices` shows Contains, Starts with, and Fuzzy controls.
Type `mm` into Contains, `ga` into Starts with, or `gm` into Fuzzy.
The separate `?choices=1` fixture tests externally supplied results and deliberately bypasses local filtering.

## Ranked fuzzy results

`matchSorter` is a generic search utility from `@wfe/components/search`.
It ranks exact matches, prefixes, word prefixes, substrings, acronyms, and characters that appear in order.
It does not perform spelling correction.
Its default normalization removes common accents.
The utility returns a new array and retains the original item references.

```tsx
import { createMemo, createSignal } from 'solid-js'
import { Combobox } from '@wfe/components'
import { matchSorter } from '@wfe/components/search'

const [query, setQuery] = createSignal('')
const matches = createMemo(() => matchSorter(items, query(), { keys: ['label'] }))

<Combobox
  options={matches()}
  inputValue={query()}
  onInputChange={setQuery}
  optionValue="id"
  optionLabel="label"
  optionTextValue="label"
  defaultFilter={() => true}
/>
```

The gallery source supplies the control, item, selection, and popup composition.

The fuzzy recipe bypasses the second local filter because `matches()` already filters and ranks the options.
The utility also exports `rankings` and `matchSorterWithRankInfo` for thresholds and ranking metadata.
Applications still own requests, loading, pagination, accepted selection, and result data.

The owned [match-sorter capture](../packages/components/src/vendor/match-sorter/README.md) records exact versions, licenses, hashes, and local type adaptations.
