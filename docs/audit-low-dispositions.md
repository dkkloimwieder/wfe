# Remaining audit findings

This record supports Beads `wfe-wmm.7.6`. Beads remains the source of task status.
It covers every Low paragraph in sections 5.1–5.6 of the
[October 22 audit](structure-audit-2026-10-22.md).

The source review used commit `5683e57` and the isolated phase 4/7 candidates on October 23, 2026.
No new runtime tests, dependency delivery audit, or performance measurements ran for this record.
This record follows the completion of phase 4 and issues 7.1–7.5. Their issue records contain the implementation and qualification evidence.
Issues 7.8 and 7.9 record the native multiple-selection and nested dialog-scope repairs with their regression evidence.
The user initially deferred phases 5 and 6 until after the component checkpoint.
Work on those phases resumed afterward.

### Status update: October 24, 2026

The shared runner and fixture-disposal implementations are now in the source tree.
Commit `4c68c97` records the shared example boundaries.
Commit `45ee64a` records the platform view extraction and retained table ownership.
Those changes replace the earlier blanket deferral of example and tooling work.
They do not authorize removal of the compatibility paths marked KEEP below.

Issue 5.6 and phase 6 are complete through commit `3c2f63d`.
The Beads checkpoints `wfe-wmm.5.7` and `wfe-wmm.6.6` are closed.
The implementation commits are `c355d70` (5.6), `a7b9723` (6.1), `40b2916` (6.2), `ffb9358` (6.3), `0ec3487` (6.4), and `3c2f63d` (6.5).
Their evidence combines the original gate, targeted follow-up checks, and sixteen focused stages.
It is not an uninterrupted passing gate or a full runtime qualification.
Final qualification attempted all 156 stages and recorded 152 passes and four failures.
The [final checkpoint](audit-remediation-2026-10-24.md) records coverage limits and the focused correction under issue 9 in `daf32b1`.
That correction passed its final gate and focused package, hydration, and vendor replay checks.
The published adoption record still names `v0.0.8`; this update creates no release.

Issue numbers below use the `wfe-wmm.` prefix unless stated otherwise.
KEEP records an intentional compatibility or scope decision. DEFER records work that needs separate evidence or a later phase.
The original audit retains its historical counts and observations.

## 5.1 Core/styles

- KEEP internal/index.ts, ownedSelectEvents and unused style tokens for this checkpoint. Their lack of internal callers alone does not establish consumer or generated-output removal safety. No dead-code removal required for stability.
- KEEP ThemeOptions.depth compatibility even though shadows are disabled by approved appearance. Do not restore shadows or remove this accepted prop. Phase 4.3 owns palette/density consistency. data-date-invalid is a useful emitted state hook without a bundled CSS consumer, not a broken feature.
- Literal token fallback differences and owned-class naming map to phase 4.1/4.2/4.3. Do not rename all legacy classes merely to add a prefix. Cascade and ownership, not spelling, are the acceptance criteria.
- TabsTrigger data-tone=default: KEEP. internal/buttonPresentation.ts explicitly accepts and emits this internal sentinel, and styles/buttons.css:46/50/54 implements it. ButtonTone intentionally permits only explicit neutral/accent choices. Changing it to neutral would alter the approved default appearance. The [button variant documentation](button-variants.md) now distinguishes omitted tone from explicit neutral tone. This corrects the contract wording without changing the API or appearance.
- DialogTrigger scope boundary: repaired in `wfe-wmm.7.9`. The baseline reproduced automatic portals outside the inner UI scope for Dialog, AlertDialog, and Sheet. Their shared trigger now supplies the control boundary that automatic placement expects. Explicit mounts, close focus, and disposal retain regression coverage. The repair does not change the shared portal placement algorithm.
- Missing PURE annotations and long FileInput/Calendar/ResizeHandle functions: DEFER without bundle measurements or independently useful boundaries. Preserve side effects and initialization. Issue 7.4 consolidates date bounds and reuses the existing bounded formatter cache.
- KEEP @types/d3-scale in dependencies: emitted dist/chart/index.d.ts imports d3-scale. Moving declaration dependencies to dev-only could break consumer type resolution. Preserve pinned runtime d3-scale: chart/index.ts exports scaleTime/scaleUtc and vendor/charts/charts-core/src/bar.ts imports scaleBand. Vendored other scale implementations do not replace these contracts.

## 5.2 Table/virtual/layout/chart

- Missing-record ids.includes, grouping per-record arrays and selection full-mounted-cell painting: DEFER performance changes until measured. Virtualization bounds mounted-cell work. No demonstrated regression justifies cache invalidation complexity.
- Captured table controller is resolved by closed 2.6 with explicit lifetime guard and keyed-remount contract.
- Virtualizer vendor access and local signal named window: KEEP the existing owned adapter and lifecycle repair. Local naming is not a global collision. Do not rewrite vendor lifecycle without evidence.
- KEEP public TableSelection ReturnType and mixed ID/column callback parameter contracts for compatibility. Narrowing/removing exposed members or changing callback payloads is an API change, not cleanup.
- Range boundary constants 0/2 in nativeSelectionMirror.ts: KEEP semantically START_TO_START/END_TO_END. Named constants could improve readability but are not a behavior defect or checkpoint blocker.
- KEEP direct d3 time scale exports as above. Do not pretend all scales are copied sources.
- Missing direct unit files are not proof of absent coverage. Closed 1.3 records required coverage, including browser and SSR entry points. A per-file count does not establish a missing behavioral contract. Add a regression for demonstrated behavior, not a per-file quota.
- Engine docs, rowSelection versus cell selection and factory aliases are covered by closed 3.8. Keep both public aliases. The open `wfe-47e` selection-reveal failure remains a separate investigation. The audit's anchor-restore explanation remains unproven.

## 5.3 Form/generator/shell

- Shared action rows and equivalent generator validation are handled by `wfe-wmm.7.5`. Those changes do not consolidate alerts, scalar branches, or focus policies.
- KEEP FormView's plain alert paragraphs. They retain alert semantics without introducing InlineAlert's visual container and presentation defaults. An appearance redesign is outside this task.
- KEEP the Checkbox and Switch scalar branches. They share binding semantics but use different parts: Checkbox.Indicator and Switch.Thumb. Runtime descriptor preflight rejects unsupported controls. A type-level exhaustiveness refactor is deferred until it preserves the custom-control and read-only paths.
- KEEP the two focus policies. Repeated-field insertion selects an eligible visible control. Reorder restoration restores the previously focused retained node only when focus falls to the body. Combining them requires proof that neither path steals focus or loses restoration.
- KEEP inline layout styles that express caller geometry. The number of style objects does not establish duplicate ownership. Shared layout ownership remains under phases 4 and 7.5.
- FormView JSON row/field identity work: DEFER optimization pending representative measurements and preservation of draft/error ownership.
- cancel settled feedback, unequal versus equivalent submit publication and owner prerequisite resolved by closed 2.7 as documented/tested intentional behavior. No application request semantics added.
- KEEP exported FormValues despite no internal uses. Missing named description exports and undocumented exports are API documentation/ergonomics follow-up, not removal grounds. Closed 3.3/3.7 cover actual wrapper typing and descriptor validation. Do not broaden exports without identifying consumer need.
- KEEP generator/shell chunking: tsdown hashed internal chunks are legitimate package implementation details. No evidence of missing published files or duplicate runtime owners. Public imports remain package exports.
- KEEP ShellView distinct from LayoutDescription. Existing docs state separate navigation/routing and layout responsibilities. Merging them would expand this checkpoint.

## 5.4 Examples

- Unused analytics/fixed-window, stub components/prepare, historical KOBALTE_LICENSE references and five mock naming styles: KEEP until phase 5 cleanup establishes delivery/reference needs. License copies are not deleted as dead code.
- Normal host ownership and redundant exampleSizing overrides are handled by 4.4. Class containment belongs to 4.1/4.2. The [example theme documentation](example-themes.md) preserves deliberate raw-scope and performance fixtures.
- Deep-import and cross-example guards are implemented under 5.4. The platform view extraction under 5.5 preserves application-owned navigation and persistent table owners. These changes do not authorize broad example renaming or removal of unused compatibility files.

## 5.5 Tooling/history

- The narrow documentation path selection was corrected by closed `wfe-wmm.1.3`: `selectsQualification` now includes all `docs/` changes. KEEP `NX_BASE` as the existing Git comparison input. Reading that environment variable does not require an Nx dependency.
- KEEP the synthetic `.github/workflows/pr.yml` path in the qualification test. It exercises the workflow-directory selection rule and does not claim that the file exists.
- Shared runner work under `wfe-wmm.5.1`/`wfe-wmm.5.2` is now in the source tree. Stage identities, failure reporting and source/package/development coverage remain part of its contract. Each issue retains its own evidence and limitations.
- Wall-clock unit waits: DEFER changes until a specific test demonstrates a clock-dependent failure. Fake clocks and event settlement require different ownership. Phase 5.3 owns shared fixture disposal, not a blanket timer rewrite. File naming, repeated afterEach and example unit co-location are KEEP absent isolation evidence. A global setup abstraction can change ownership and cleanup ordering.
- KEEP migration history, dependency-integrity trustPolicyExclude evidence and old heap-findings evidence. Closed 1.6 annotates stale documentation. Do not rewrite history or delete supporting supply-chain records.
- KEEP the three manual scripts as manual tools. Unused coverage/publint pins stay pinned until a dedicated delivery/dependency audit proves removability. KEEP current CI timeout, concurrency and cache policy for this checkpoint. A timeout or cancellation change requires observed run durations and a decision about retaining interrupted evidence. The Node boundary matrix already limits its own parallelism to one. It does not serialize every workflow job.
- test-results retention and fixed artifact destinations map to 5.6. Preserve current failed and passing evidence; do not prune during audit.

## 5.6 Vendor

- The shared vendor classification registry under 6.1 replaces obsolete audit-vendor package aliases. Issues 6.3 and 6.5 add inventory checks and repair attribution. Unused entryPoints, scale barrels, repeated repair strings and dead Kobalte exports remain KEEP. Inventory or internal reachability alone does not authorize removal of public vendor-backed types.
- @internationalized/number: KEEP dependency until complete source/generated delivery evidence establishes the unused-file claim and licenses/pins remain intact.
- Issues 6.3 and 6.5 record original archive hashes, installed repair checks and replay evidence beyond the lockfile. Existing working repairs remain retained. Text replay does not prove runtime equivalence.
- The shared runner and classification work under 5.2/6.1 retains bundle ownership checks. Issue 6.3 adds complete captured-file inventory checks. These results do not authorize removal of vendor-backed APIs.

## Evidence and checkpoint limits

The table engine's missing-record scan occurs only after `source.get(id)` returns undefined (`packages/components/src/table/engine/table.ts`).
The grouping allocation is the small type-membership array in `engine/grouping.ts`. Neither observation is a measured bottleneck.
Selection painting scans mounted cells. Changes to that work need representative virtualized and nonvirtualized measurements.
The open `wfe-47e` reveal hypothesis remains a distinct investigation, not a verified consequence of these allocations.

`docs/table-engine.md` and `docs/table-selection.md` now describe both row selection and rectangular cell selection.
`packages/generator/package.json` and `packages/shell/package.json` include the entire `dist` directory in their file lists.
Their tsdown configurations permit internal shared chunks. This source evidence supports keeping chunking, but does not replace package qualification.

The generator's focus rules are in `repeatedField.tsx` and `reorderFocus.ts`.
The former checks computed visibility before choosing a new target. The latter also checks focus history before restoring an existing target.
`FormView.tsx` uses JSON keys to distinguish ordinary fields and repeated rows. No representative cost measurement supports replacing those identities.

The qualification selection rule and its synthetic-path tests are in `scripts/qualify.mjs` and `tests/tooling/qualification.test.mjs`.
The CI policy is in `.github/workflows/check.yml`. Historical migration and heap reports remain evidence, not current executable specifications.
Vendor inventory, notice delivery and repair replay now have focused qualification evidence.
The original gate at `/tmp/wfe-final-vendor-focused-results/run-8KRSXj` remains failed with two unit deadlines.
The unchanged targeted cases passed at `/tmp/wfe-unit-deadlines-j7fbbs2p` under their original deadlines.
The continuation at `/tmp/wfe-final-vendor-resume-results/run-V7VJK1` passed SSR and contracts but retained a stale qualification-test failure.
The reviewed test correction passed its scoped checks at `/tmp/wfe-qualification-path-fix-q7clyvvf`.
All sixteen remaining focused stages passed at `/tmp/wfe-final-vendor-completion-results/run-eMePBA` with unchanged source during that run.
Those stages cover representative browser artifacts, vendor bundle classification, exact notice delivery, and replay from verified originals.
The live child selection covers one cold-icon case. Its existing parent case label does not establish full popup coverage.
These local paths are retained evidence references, not published artifacts or a guarantee of permanent storage.
The final checkpoint records the completed qualification attempts, their failures, and the corrected selection diagnostic. No repair is retired by these results.

The new Dialog scope finding is tracked by `wfe-wmm.7.9`. Unlocked native multiple selection is tracked by `wfe-wmm.7.8`.
Issues 7.8 and 7.9 record separate failing baselines and qualification for their repairs. Issues 7.1–7.5 record the completed shared-helper changes and their qualification.
The closed phase 7 checkpoint records its review of those results. This document does not authorize a release or report unrun checks as passing.
