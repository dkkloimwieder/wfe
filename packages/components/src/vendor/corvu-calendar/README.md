# Vendored calendar behavior

This subset comes from Corvu Calendar at the commit in `provenance.json`.
The MIT license remains unchanged.
The manifest records original and local SHA-256 hashes.

`utils.ts` preserves calendar arithmetic and bounded searches for enabled dates.
`navigation.ts` extracts the keyboard movement from upstream `CellTrigger.tsx`.
The local adaptation uses UTC arithmetic for date-only values.
It also clamps leap-day year changes and preserves years below 100.
The owned Calendar component supplies Solid 2 rendering, selection, focus, and shared styling.
Corvu context, polymorphic components, popup code, and utility packages are excluded.

Run `pnpm test:integrity` to test the inventory and local hashes.
For an update, fetch the exact commit, compare the original hashes, and review each local repair before replacing source.
Preserve the license and update both hashes after the review.
