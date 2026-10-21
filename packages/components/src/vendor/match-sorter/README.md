# Owned match-sorter source

This capture contains match-sorter 8.3.0 from commit `e7c9c20efd8fd8b4428ba20795f7a376fb46ff00`.
The upstream repository is https://github.com/kentcdodds/match-sorter.
`LICENSE` preserves its MIT license.

`remove-accents.ts` contains the character mapping and removal function from remove-accents 0.5.0.
Its npm tarball integrity and original source hashes appear in `provenance.json`.
`LICENSE-remove-accents` preserves its MIT license.
The upstream repository is https://github.com/tyxla/remove-accents.

Local changes redirect the accent import to the captured file and format both files.
Bounded index reads have TypeScript non-null assertions for the repository's strict indexed-access rules.
The accent module uses TypeScript and an ESM default export.
Unused CommonJS aliases and the accent-detection function are omitted.
The ranking algorithm, character mapping, and normalization behavior remain unchanged.

The public entry is `@wfe/components/search`.
This capture adds no runtime dependency on Babel or an installed matching package.
Run `node scripts/check-matching.mjs` after changes.
Retain the licenses and update local hashes for deliberate repairs.
