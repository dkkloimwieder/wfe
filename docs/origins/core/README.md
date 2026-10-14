# Behavior origin

The original repository kept behavior in a separate private package.
Wfe merges that behavior with presentation in `@wfe/components`.
Styled controls remain public. Internal behavior stays under `src/internal`.
The owned Kobalte subset stays under `src/vendor/kobalte`.
Solid and Solid Primitives remain external dependencies.

The [vendor record](../../../packages/components/src/vendor/kobalte/README.md) identifies the revision, licenses, hashes, and local repairs.
The [migration inventory](../../../migration/inventory.json) records the original paths and hashes.
Run `pnpm test:integrity` from the repository root to test ownership and provenance.
