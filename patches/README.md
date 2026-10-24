# Dependency patches

Pnpm applies these repairs to the pinned external dependencies during installation.
Keep the package versions and upstream licenses unchanged.

## Interaction focus timing

`solid-primitives-interaction-1.0.0-next.4.patch` registers the focus handler immediately.
The pointer handler retains its opening delay.
Both handlers retain their existing disposal cleanup.
This prevents a popup from missing focus that leaves before the pointer timer runs.
The repair closes Beads `wfe-w2y.23`.

Original `dist/index.js` SHA-256: `59cab11f91108073b7c7bb3fe86888f371ed0858480d388dbd7599df8192357a`.
Patched `dist/index.js` SHA-256: `2e8b7b39e46bd735244b5b4dd569478367ab89e8ff146de4894b3339a47542a9`.

## Shared scroll registry

`solid-primitives-scroll-3.0.0-next.4.patch` creates the shared scroll registry outside a component owner.
This preserves the registry when its first consumer closes.

## Integrity evidence

`provenance.json` records the exact patch bytes, original archive integrity,
original and repaired target hashes, and unchanged license hashes.
Both original archives were fetched from the pinned npm registry URLs and checked
against the existing lockfile SHA-512 integrity before extraction. Replaying the
existing patches on those original files produced the installed repaired bytes.
These are external dependency repairs; no Solid or Solid Primitives code is vendored.

The integrity gate rejects added or missing patch files, altered patch bytes,
workspace or lockfile mismatches, and installations without the recorded repairs.
It runs offline. Archive retrieval and repair behavior qualification remain separate
from the installed-byte check; a passing hash check does not prove runtime behavior.
