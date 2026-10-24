# Vendor repair replay

Keep the recorded upstream files, licenses, local repairs, and dependency pins.
A different file hash does not identify a behavior change.
Formatting, type changes, import redirection, and runtime repairs can share one file.

## Verify the comparison inputs

The Kobalte comparison requires the exact archive and its extracted tree.
Use the pinned URL and digest in the [vendor guide](../packages/components/src/vendor/kobalte/README.md#reproduce-local-patches).
The comparison verifies the archive digest and every original and local file digest before writing output.
It also requires the installed formatter version to match the repository pin.

```sh
node scripts/kobalte-repair-replay.mjs --upstream /tmp/table-kobalte-pinned --archive /tmp/table-kobalte-pinned.tgz --output /tmp/wfe-repair-comparisons
```

Each invocation creates a new comparison directory.
It never changes the supplied originals or the vendored tree.
The report records the revision, archive digest, provenance digest, formatter version, configuration digest, tool digest, and lockfile digest.
Hashes describe the actual input bytes. They do not replace the original provenance records.

## Read the three patches

`01-formatting.patch` applies the pinned repository formatter to original TypeScript files.
License files remain byte-identical.

`02-utils-import-paths.patch` redirects exact static `@kobalte/utils` imports and exports to the captured relative Utils entry.
The parser identifies module specifiers. Comments, other strings, and subpath imports stay unchanged.
This stage records a mechanical path migration, not proof that two runtime modules behave identically.
New owned-helper imports remain in the next patch.

`03-residual-repairs.patch` contains all remaining differences from that intermediate to the existing local source.
It includes behavior repairs, compiler compatibility changes, type moves, extraction, and import ordering.
It is deliberately not called a behavior-only patch.
The report marks every file with residual changes for review.
No unequal hash or successful formatter pass proves semantic equivalence.

The tool applies all three patches to a fresh copy of verified originals.
After each stage, it checks every resulting file against that stage's expected bytes.
The final tree must match the existing local hashes.
This is forward replay from verified originals, not a claim based on reversing a local patch.

## Locate the repairs

The [Kobalte repair record](../packages/components/src/vendor/kobalte/README.md#local-changes) describes the retained behavior.
Use the residual patch with these locations and tests.
A listed test is a coverage reference, not a claim that this comparison ran it.

| Area                                                               | Repair and compiler concerns                                                                                                                                                                        | Coverage references                                                                                   |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `core/src/polymorphic`, `dismissable-layer`, `utils/src/events.ts` | Owned native listeners, custom component forwarding, current callbacks, and disposal. Ref arrays retain compiler-sensitive placement.                                                               | [Native event contract](native-events.md), component browser suites                                   |
| `core/src/combobox`, `select`, `listbox`, `selection`              | Controlled search and accepted selection, missing selected options, exact collection keys, announcements, generated ID snapshots, and focus cleanup. Type moves remain distinct from those repairs. | `tests/unit/collection-keys.test.tsx`, `combobox-refs.test.tsx`, `native-multiple-selection.test.tsx` |
| `core/src/checkbox`, `switch`, `radio-group`, `form-control`       | Prevented events, controlled native state, reset ownership, stable refs, and server label registration.                                                                                             | `tests/unit/compound-field.test.tsx`, `compound-field-mount.test.tsx`, server and hydration suites    |
| `core/src/dialog`, `popover`, `menu`, `tooltip`                    | Modal hiding, focus precedence, dismissal, nested scopes, and timer cleanup. Closed force-mounted content must not retain locks.                                                                    | `tests/unit/dialog-scope.test.tsx`, popup and hydration suites                                        |
| `core/src/tabs`, `breadcrumbs`                                     | Retained extracted API and keyboard behavior. Generic types and export adaptation are not automatically behavior repairs.                                                                           | `tests/unit/tabs.test.tsx`, `breadcrumbs.test.tsx`                                                    |

Native multiple selection keeps the current hidden option inventory.
It does not claim that filtered-out options are available to native autofill.
The Dialog trigger marker preserves the nested UI scope used by its portal.
Both repairs remain part of the residual patch.

## Integration seams

The report records direct owned-helper imports and their current hashes.
These imports deliberately cross from captured vendor code into shared UI support.
Do not move helpers into the vendor tree merely to remove that dependency direction.

- `internal/ownedEvents.ts` owns native listener dispatch and cleanup.
- `internal/formReset.ts` owns deferred native reset work.
- `internal/fieldRendering.tsx` owns server field registration staging.
- `internal/controls/modal-hide-outside.ts` coordinates focus and background hiding.

The lockfile and [external patches](../patches/README.md) remain separate prerequisites.
The interaction and scroll patches affect external primitives, not copied Kobalte source.
Vendor text replay alone does not reproduce these dependencies or qualify their runtime behavior.

## Other captured families

Keep each family's original schema and source notices.
Use its repair records rather than classifying all changed files as formatting.

| Family                                                                 | Attribution boundary                                                                                              |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| [Charts](../packages/components/src/vendor/charts/README.md)           | Strict types, runtime theme handling, and portal mounting have separate purposes. Keep those named repairs.       |
| [Calendar](../packages/components/src/vendor/corvu-calendar/README.md) | Extraction and UTC date navigation change behavior. They are not whitespace normalization.                        |
| [Virtual](../packages/components/src/vendor/virtual-core/README.md)    | Fixed-size measurement behavior remains a runtime adaptation.                                                     |
| [Matching](../packages/components/src/vendor/match-sorter/README.md)   | Omitted functions and type/export adaptation remain explicit extraction choices.                                  |
| [Icons](../packages/components/src/vendor/icons/README.md)             | Generated artwork records source SVGs, generator, output hashes, and notices. It is not one large runtime repair. |

This command separates Kobalte's mechanical stages only.
Other families retain their existing replay and generation tools.
No successful Kobalte replay certifies those families.

## Retirement and qualification

Beads `wfe-0dj.3` tracks popup repair retirement.
Beads `wfe-0dj.5` tracks owned native listener retirement after matched upstream evidence.
Keep the repairs until matched upstream evidence satisfies those tasks.
A newer version or equal final text alone does not establish that evidence.

Run source and built-package behavior tests for changed contracts.
Retain server rendering, hydration, diagnostics, owner cleanup, and actual heap evidence where those contracts require them.
This tool changes no runtime source and removes no repair.
Its comparison report is text evidence, separate from runtime qualification.
