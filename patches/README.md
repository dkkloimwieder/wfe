# Dependency patches

Pnpm applies these repairs to the pinned external dependencies during installation.
Keep the package versions and upstream licenses unchanged.

## Interaction focus timing

`solid-primitives-interaction-1.0.0.patch` registers the focus handler immediately.
The pointer handler retains its opening delay.
If the element moves to another document before the pointer timer runs, the focus handler follows it.
Both handlers retain their existing disposal cleanup.
This prevents a popup from missing focus that leaves before the pointer timer runs.
The repair closes Beads `wfe-w2y.23`.

## Shared scroll registry

`solid-primitives-scroll-3.0.0.patch` creates the shared scroll stack outside a component owner.
This preserves the registry when its first consumer closes.

## Integrity evidence

`provenance.json` records the exact patch bytes, original archive integrity,
original and repaired target hashes, and unchanged license hashes.
Both archives matched the npm registry's SHA-512 integrity values before extraction.
Applying the patches to those archives reproduced the installed files.
Both licenses matched the hashes from the previous versions.

The integrity gate rejects added or missing patch files, altered patch bytes,
workspace or lockfile mismatches, and installations without the recorded repairs.
It runs offline. Archive retrieval and repair behavior qualification remain separate
from the installed-byte check; a passing hash check does not prove runtime behavior.
