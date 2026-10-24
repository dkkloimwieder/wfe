# Audit remediation checkpoint

The implementation phases are complete through commit `3c2f63d` on `fix/audit-infrastructure`.
Final qualification attempted every planned stage. Commit `daf32b1` delivers the selected-option correction under Beads `wfe-wmm.9`.
The published adoption guide still names `v0.0.8`.
This checkpoint does not create a release or authorize removal of a runtime repair.

## Scope

The audit retains generic UI ownership and application-owned records, permissions, routing, and requests.
It consolidates control contracts, theme ownership, shared helpers, example boundaries, test infrastructure, and vendor evidence.
All seven implementation phases and their independent checkpoints are closed.
The [original audit](structure-audit-2026-10-22.md) remains a historical record.
The [remaining findings](audit-low-dispositions.md) retain accepted limits and separate investigations.

This branch includes the Solid RC.18 work merged at `a2535bb` from the `fdeaacc` main snapshot.
Later sync work, including main commit `32ad1ba`, is outside this checkpoint.
The audit does not modify that work or claim its validation.
The installed `solid-js/CHEATSHEET.md` defines the Solid reference used during review.

## Recent delivery

Commit `c355d70` gives test runs separate report directories, preserves failures, and prevents explicit output paths from overwriting existing files.
Commit `a7b9723` classifies all six vendor families, including generated icons.
Commit `40b2916` includes all nine vendor notices in source, client, and server outputs.
Commit `ffb9358` checks exact inventories, import boundaries, original licenses, and installed runtime repairs.
Commit `0ec3487` shares guard helpers while retaining the existing manifest formats.
Commit `3c2f63d` reproduces Kobalte formatting, import changes, and residual repairs from verified originals.

## Retained evidence

The [local evidence manifest](../test-results/audit/final-2026-10-24-3c2f63d/manifest.json) maps original paths to retained files and records their SHA256 digests.
The archive contains reports, logs, screenshots, package notices, replay files, and earlier audit records.
It is local test evidence, not a published package or a claim that another checkout contains these files.
Original reports keep their original paths and contents. The manifest provides the corresponding archive paths.

The focused completion passed 16 stages and verified seven browser reports.
The EntryPanel reports cover source and package imports.
Generated details cover source and package imports, plus source hydration.
The live reports cover parent and child ownership.
The live child contains one cold-import case. It does not claim the full interaction suite.
Vendor evidence covers 306 artifacts, 456 source files, six source-production bundles, nine notices, and 218 replayed files.
The bundle audit measures outputs in memory. It does not retain raw bundle files.

Required-gate coverage was assembled from retained attempts.
The original unit suite passed 1,035 cases and reported two five-second deadline failures.
Both unchanged cases passed in isolation at the original deadline.
Server rendering and documentation contracts passed.
The Node suite passed 121 cases and found one stale fixed-path test.
After that test followed the unique run directory, its seven-case file passed with scoped formatting and lint checks.
This covers 1,037 unique unit cases and 122 unique Node cases without adding repeated cases to the totals.
It is not a clean, uninterrupted gate run. The original failures remain recorded as failures.

## Final qualification

The frozen candidate was commit `3c2f63d` plus the seven recorded documentation files.
The command was `pnpm exec node scripts/qualify.mjs --wamn`.
Its plan contained 156 stages, including 19 stages for existing prepared consumer inputs.
The required gate passed 1,037 unit tests and 122 Node tests, plus formatting, lint, integrity, builds, types, server rendering, and documentation contracts.

The original run passed 50 stages and stopped at source hydration's native-tab test.
A reviewed continuation ran exactly the 105 unrun stages. It did not repeat the gate or the failed stage.
Together, the attempts recorded 152 passing stages and four failures, with no skipped stage.
Both attempts retained the same source hashes.
The evidence verifier found no integrity error across the exact stage sequence and 92 reports.
This is a failed qualification with recorded limits, not a full pass.

Source hydration completed six cases before the native-tab failure, leaving 23 cases unrun.
The development component suite completed 117 cases before the same native-tab symptom, leaving 61 cases unrun.
Development hydration completed its interaction cases but failed its strict diagnostic assertion for `UNCOMMITTED_INPUT_OVERWRITTEN` on `option.selected`.
The live preview failed its initial ten-second navigation before its four cases or child suite started.
The separate preview-isolation stage passed ten cases across four active servers. It does not replace the failed live preview's missing coverage.
Neither native-tab reports nor the startup report establish machine load as their cause.

The original run is `matrix-normal-2026-10-24T18-38-10-273Z-DKfX7n` under `test-results/runs/qualification`.
The continuation is `matrix-normal-2026-10-24T19-59-38-411Z-Bbpy10` under `test-results/runs/qualification-continuation`.
The archive includes their logs, exact case inventories, child reports, diagnostics, source snapshots, and verifier result.
Its manifest retains the original paths and hashes.

## Final reviews

Independent architecture review found no new ownership or structural blocker.
The review used the installed RC.18 cheatsheet and retained the existing cleanup repairs.
Two reviewers inspected ten final viewport captures across forms, tables, popups, and platform examples.
The captures include light and dark themes and narrow layouts. No clipping, overlap, or popup containment blocker appeared in those views.
Earlier EntryPanel and detail captures remain separate supporting evidence.
Light helper and platform record text looked faint. This observation does not establish a new regression or measured contrast compliance.

A separate RC.18 cleanup comparison retained 24 raw heap snapshots across 12 comparisons and two repetitions.
Each loaded fixture contained 1,000 records.
Plain disposal from the settled callback retained all 1,000 records. The action wrapper and direct cleanup paths retained zero.
The evidence records exact runtime inputs, loaded module hashes, raw counts, and independent review.
The result supports retaining the workaround in this fixture. It does not prove general memory safety or authorize repair removal.

## Focused correction

Issue `wfe-wmm.9` isolates the new selected-option warning.
The warning occurs when a combobox filters for `Be` while its accepted value remains `Alpha`.
A focused baseline retained hydration, native form values, readonly rejection, and cleanup assertions, then reproduced the warning.
Removing the competing `select.value` binding passed that same focused regression with zero diagnostics.

A stricter regression also reproduced a warning when the application rejected a native choice.
The handler now restores the accepted set immediately. The existing queue still handles committed values and collection changes.
The wider unit suite caught an initially selected empty placeholder in both multiple-select families.
Synchronous restoration in the existing effect fixes that regression without changing the existing form-value assertions.

The selection manager remains authoritative. Option bindings and guarded restoration keep native form values aligned with it.
All 27 compound-field and native-selection tests pass, including accepted and rejected changes, multiple values, reset, and readonly controls.
The new filtering and rejection regression also asserts strict diagnostics after each interaction phase.

The final correction passed a clean `pnpm check`: 1,038 unit tests, 122 Node tests, builds, integrity, types, server rendering, and documentation contracts.
Eight focused stages then passed against unchanged runtime bytes.
They cover 27 package tests, four compound-only hydration modes, 218-file repair replay, and report verification.
The hydration modes cover source and package imports in production and development. They retain node adoption, form values, disposal, and strict diagnostics.
These focused runs do not claim full shared-hydration coverage or replace the earlier native-tab failures.

The final gate is retained as `wfe-selected-option-final-gate-rfz2k8eg`; the focused supplement is `wfe-phase9-focused-jeap2w4v`.
The archived focused supplement retains the final gate log, source snapshot, and an index of their original paths.
Earlier failed test types and the two initial-selection regressions remain recorded alongside the successful final checks.

Independent source and evidence review approved the correction and bounded audit completion.
The final documentation update receives separate formatting and contract checks after runtime validation.
No result in this document certifies an unrun stage or a later main revision.

## Remaining limits

Beads `wfe-x6o` retains the native-tab investigation, including the earlier shared-development hydration limit of six completed cases out of 29.
Beads `wfe-4k8` retains the recurring live-preview startup timeout and its missing coverage.
Beads `wfe-47e` retains the packaged virtual-selection investigation.
Beads `wfe-0dj` retains runtime repair retirement work.
Earlier RC.16 heap evidence remains historical. The separate RC.18 comparison above supplies current bounded evidence.
Forward text replay does not prove runtime equivalence or authorize repair removal.
