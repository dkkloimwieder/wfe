# Standalone migration

Wfe now owns maintained generic components, Table, examples, tests, and tooling.
The table repository remains a historical source and retains unrelated framework and Query work.
Layout, form coordination, and generation follow the existing Beads phases.
The [machine record](standalone-qualification.json) records the tested commit, preserved reports, comparisons, and task continuations.

## Proof

The acceptance checkout uses an independent Git clone under `/tmp/wfe-standalone-final`.
It starts without dependencies or generated package files.
A frozen installation uses the new lockfile and passes the existing supply-chain policies.
The approved exception for `semver@6.3.1` remains exact.

Bubblewrap creates private filesystem mounts for the commands.
Empty mounts hide both `/home/kaalin/dev/table` and `/home/kaalin/dev/wfe`.
The install, 47-stage suite, and strict package audit pass with both repositories hidden.
The existing Chromium cache remains available under `/tmp`.
The suite runs serially and treats host timings as advisory.
The tracked checkout remains clean after the live-update tests.

The first run stops because example types require package declarations before the package builds.
Commit `ed6119c` builds the package before those type tests.
The first complete suite passes from that commit without prior package outputs.

The preview cutover then exposes a shared Vite cache that causes `504 Outdated Optimize Dep`.
Commit `6b4e171` gives each example its own cache and excludes generated cache files from lint.
A regression test requires distinct caches and reloads earlier pages with four active previews.
The old configuration fails this regression.
A second independent frozen checkout passes all 47 stages from the cache repair commit.
The original failure and final reports remain under `test-results/standalone`.

The suite passes 128 unit tests and source, built-package, and development browser tests.
Each mode passes 102 component cases, 148 editing cases, five read-only cases, and 22 analytics cases.
All three hydration modes retain server nodes and reject warnings.

Live tests pass eight wrapper updates and another 102 interaction cases.
Seventeen module inventories contain no paths outside the fresh checkout.
Vendor hashes, licenses, imports, and bundle audits pass.
The preview regression passes ten interactions with four active servers.

## Comparison

All 463 original inventory hashes match source commit `36cdfa0beffe7a38de254cf8c4ff749904c03570`.
All 248 original literal interaction names remain in the moved examples.
The current examples contain 249 names.
This comparison records names separately from the executed test counts.
The original inventory comparison reads historical Git blobs outside the isolated runtime suite.

Four planned files remain excluded.
The unused `makeData.ts` serves the historical adapter fixture.
The three historical heap wrappers require adapter assets outside this migration.
The extraction records identify these files and other excluded framework code.
The moved native performance tools retain their earlier smoke evidence.
This acceptance run does not repeat heap campaigns or prepare the optional WAMN inputs.

## Review previews

Replacement previews pass before the historical servers stop.
Final previews pass again on the existing review ports with the table directory hidden.
The component consumer uses `http://127.0.0.1:7782/?consumer=1`.
Analytics uses `http://127.0.0.1:7783/`.
The read-only table uses `http://127.0.0.1:7784/`.
Editing uses `http://127.0.0.1:7777/`.

The review tests cover form edits, dialog focus, read-only sorting, and editing controls.
Analytics retains its viewport height after Load all and renders fewer than 60 rows.
The test reaches the final query row and exports all 100,005 rows through the server.
The export preserves server sorting and renamed headers.
The previews produce no browser errors, warnings, or requests for old source.

## Task ownership

The cutover closes migration phase `wfe-w2y.1`.
Layout continues under `wfe-w2y.2`, form coordination under `wfe-w2y.3`, and generation under `wfe-w2y.4`.
Maintenance epic `wfe-0dj` carries the catalog candidates, runtime review, owned repairs, and development workload diagnostics.
Each transferred issue has owner `dkk` and an original issue reference.
The historical task records point to their wfe continuations.
Existing runtime and vendor repairs remain in place.
The migration publishes no packages.
Production WAMN remains separate.
