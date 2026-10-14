# Extraction record

The source is https://github.com/dkkloimwieder/table at commit `36cdfa0beffe7a38de254cf8c4ff749904c03570`.
The [inventory](inventory.json) records each source file, planned destination, category, and SHA-256 before extraction.
The original checkout remains a historical reference.

The native engine imports Solid and its own nine source files.
It does not require the legacy table-core engine or framework adapters.
Generic behavior and presentation merge into `@wfe/components`.
Solid and Solid Primitives remain external.
The scroll primitive retains its reviewed package patch.
Kobalte and Virtual keep their original hashes, local repairs, licenses, and attribution.

Editing rules, demo records, mock requests, server export, and cache policy remain in examples.
The WAMN fixture remains optional and uses its explicit preparation boundary.
Native hydration replaces the old fixture's mixed native and legacy adapter branches.
The source inventory excludes downloaded inputs, dependency trees, build outputs, and stored heap captures.
Historical profiling evidence remains in the original repository.

The migration preserves public behavior while changing file ownership and imports.
Required checks cover types, imports, unit behavior, source and built-package consumers, live reload, rendering, hydration, accessibility, and cleanup.
The standalone acceptance run makes the old checkout unavailable to builds and tests.
Heavy checks run serially because host load varies.
Timings remain advisory. Correctness, allocation counts, and cleanup remain strict where the existing tests use them.

## Examples

The [example record](examples.json) records the moved fixtures and their local hashes.
Examples import public component exports through one shared Vite configuration.
The `wfe-source` condition selects owned source for development and live updates.
Built consumers use the `solid` condition without source aliases.
The styles demo imports the public stylesheet.
The unused legacy `makeData.ts` helper stays outside this extraction.

Live previews declare external dependencies through their owning package.
This declaration prevents late dependency optimization from replacing modules during interaction.
Browser reports stay under `test-results/migration-examples`.
Source and built runs retain separate reports.
The optional WAMN fixture keeps its explicit external input preparation.

## Tests and maintenance

The [test extraction](testing-extraction.json) records original and local hashes for the moved tests, fixtures, documents, and tools.
The [qualification instructions](../docs/qualification.md) describe the standalone command and retained reports.
Native hydration replaces the mixed adapter fixture while preserving DOM identity, updates, and disposal assertions.
The runner preserves serial stages, mandatory live checks, development diagnostics, and first-failure logs.
The vendor audit records import ownership and retained bundle contributions.
Original comparisons require unchanged license bytes and exact repair replay.

The analytics density repair uses one DOM snapshot for related row bounds and scroll extent.
The original failed snapshots remain available in the qualification reports.
Six independent density runs and the complete qualification suite pass with the repair.
The repair is a separate commit from this tool migration.

The moved performance tools pass small source and built-package smoke runs.
Historical adapter heap wrappers remain excluded because their fixtures are not part of wfe.
The retained heap findings describe the original repository and its recorded measurements.
