# WAMN platform example

This application example uses captured WAMN control clients and a deterministic mock transport.
Its first operations are `control.mine`, `project.list`, `project.create`, `environment.list`, and `environment.status`.
The generated clients encode request members and decode returned member names.
The copied runtime classifies mock HTTP replies against the actual operation contracts.
The application also checks structural result types before it accepts completed data.

The example owns scope, requests, permissions, record projection, and validation.
Shared component, form, and generator packages contain no WAMN imports.
Project creation maps a flat project field to the generated nested command.
The application supplies the request ID. It does not retry commands automatically.
Cancellation stops the application from waiting. It does not undo a command that the mock already accepts.

## Captured inputs

`snapshot/provenance.json` records the WAMN revision, source paths, and hashes.
Captured client imports point to the copied wire module. Other source bytes stay unchanged.
The original workspace declares Apache-2.0. The snapshot includes that license text and the original Cargo metadata.
The snapshot includes unused operations from the three client modules. The mock supports only the five operations named above.

From the WFE repository root, make sure that the snapshot retains its captured bytes:

```sh
node examples/platform/check-snapshot.mjs
```

Regular tests need neither a WAMN checkout nor Cargo.
To replace the snapshot, use existing generated clients in the WAMN checkout:

```sh
WAMN_ROOT=/home/kaalin/dev/wamn node examples/platform/capture.mjs
```

The capture command reads the checkout. It does not build Rust or modify WAMN.
Review changed operation metadata and generated clients together before accepting a refreshed snapshot.

## Known gaps

Beads epic `wfe-f81` owns this application and its follow-up work.
Issue `wfe-f81.2` adds the project and environment screens.
Issue `wfe-f81.3` adds membership and role assignment.
Issue `wfe-f81.4` tracks the adapter from host metadata to generic view descriptions.
Issue `wfe-f81.5` tracks validation metadata that omits server constraints.
Issue `wfe-f81.6` tracks structural result validators in generated clients.

Project names use the recorded server rule: trim, then accept 1 to 40 UTF-8 bytes.
The generated input metadata only declares text. It does not carry this length rule.
The application applies the rule and maps declared server refusals to its form.
The rule does not require a lowercase slug.
Project and environment lists contain names only. Deployment status does not describe activation state.
