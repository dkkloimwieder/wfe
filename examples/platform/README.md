# WAMN platform example

This interactive mockup uses captured WAMN control clients and a deterministic mock transport.
It changes sample records only and sends no email or network request to an application server.
Its workflows, sample validation, access scenarios, and lifecycle outcomes do not prescribe application behavior.
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
The control snapshot includes unused operations from seven client modules.
`snapshot/application` separately captures application-host user, role, permission, and user-role clients.
It includes metadata for the eight role-assignment and read operations, plus the host and identity implementation sources.
The application and control user operations share identifiers but return different records.
A transport must bind the application host to a project and environment before it invokes those operations.
The capture does not enable application screens or add authorization rules to shared components.
The mock supports the five initial operations, user and membership lists, six access commands, and user invitation, activation, and deactivation.
Captured declarations inform the example scenarios. The mock is not an authorization or lifecycle implementation.

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

The access editor lists the selected user's organization flag and project grants before the command form.
The list covers only projects that the current viewer can administer.
Each failed project read stays unknown. The screen does not treat a failed read as absent access.
The captured contracts do not identify direct and inherited grants.
Application roles use separate operations and remain outside this screen.

## Metadata descriptions

`metadata-description.ts` maps captured fields to explicit form fields and table column IDs.
Project creation takes its field label from the input metadata.
Project and environment lists map each captured scalar member to an application column.
The application supplies control choices, labels that override metadata, required fields, help text, and actions.
The adapter returns presentation descriptions only. It does not send requests or transform records.

Each input path belongs to one editable field or one application-supplied field.
The current form subset accepts non-null text and boolean fields without enums.
It accepts flat input paths and the explicit `value` wrapper.
The current table subset accepts one record array with text, boolean, or int32 members.
It allows display enums with values that match their declared type.
It rejects missing, duplicate, unknown, nullable, and unsupported mappings or metadata annotations.
Nested deployment status stays an explicit application view.

The adapter does not infer domain constraints from scalar types or field names.
Application validation, reply schemas, permissions, callbacks, record identity, and table order remain unchanged.

## Known gaps

Beads epic `wfe-f81` owns this application and its follow-up work.
Issue `wfe-f81.2` implements the project and environment screens.
Issue `wfe-f81.3.1` adds the user directory and scoped access editor.
Issue `wfe-f81.3.2` adds invitation and user lifecycle mockups.
Issue `wfe-f81.3.3` tracks application roles, which use separate application-host operations.
Issue `wfe-f81.4` adds the adapter from host metadata to generic view descriptions.
Issue `wfe-f81.5` tracks validation metadata that omits server constraints.
Issue `wfe-f81.6` tracks structural result validators in generated clients.
Issue `wfe-f81.7` tracks a shared native link with button appearance.
Issue `wfe-f81.8` fixes duplicate construction of shared table action and configuration slots.
Issue `wfe-f81.9` tracks authority declarations missing from operation metadata.
Issue `wfe-f81.10` tracks generated collection fields needed by invitations.

Project names use the recorded server rule: trim, then accept 1 to 40 UTF-8 bytes.
The generated input metadata only declares text. It does not carry this length rule.
The application applies the rule and maps declared server refusals to its form.
The rule does not require a lowercase slug.
Project and environment lists contain name and state records in the captured result metadata.
The State column shows the supplied `active` or `inactive` value.
State does not change navigation or authorization in this mockup.
Authority and creation replies contain no state, so their rows show Unknown until an authorized list read supplies it.
Deployment status remains separate from registry state.

The capture at `bd69b4e82b005d22f8fab3842ed6bf1a0dbd1a64` contains stale generated list declarations.
Those clients still declare string arrays, while the captured result metadata declares records.
The application treats decoded replies as unknown and returns schema-parsed values from its checked boundary.
It rejects old string arrays, missing states, and states outside the captured contract.
This adapter does not repair the upstream generator or claim that its declarations match the current metadata.
Issue `wfe-f81.29` tracks replacement after upstream regeneration. Generated snapshot files retain their captured bytes.

## Review the application

From the WFE repository root, start the preview:

```sh
pnpm exec vite --config examples/platform/vite.config.ts --host 127.0.0.1 --port 7791 --strictPort
```

Open `http://127.0.0.1:7791/`. Reuse that server if it already runs.
The example represents one organization, `acme`.
The Projects table fills the main panel. View opens the selected project's environments.
An environment's View action opens its digest, rollout counts, workloads, and live releases.
These fields come from deployment status. They do not imply registry activation.
Create a project opens a separate generated form.
A completed command adds the accepted project to the application collection before its Open link appears.
Creation does not provision an environment. A new project has no environments.
The example does not invent rename, project editing, or environment creation operations.

Users opens the organization directory. Members beside each project opens its member table.
Manage access opens a separate generated form for one user.
Choose organization administrator, project administrator, or environment membership, then Grant or Revoke.
The form offers actual project and environment choices. It sends one explicit command per submission.
Organization scope requires organization administration. Project scope also accepts that project's administrator.
The application reads these rules from the captured host authority declarations, not from permission token names.

The mock follows recorded grant materialization rules.
Granting organization administration adds project administration and environment memberships throughout the organization.
Revoking organization administration removes project administration but preserves ordinary environment memberships.
Granting project administration adds memberships in that project's environments. Revocation preserves those memberships.
Higher-level grants can refuse a lower-level revoke with `admin_covered`.
These rules belong to the application fixture. Shared controls contain no authorization rules.

After a completed command, the application reloads caller authority and the current screen.
If the reload fails, the completion notice remains separate from the read error.
Uncertain commands and partial-write refusals retain recovery details. The application does not retry or claim rollback.
Stop waiting leaves a notice that the command can still complete. Explicit refresh reads authority again.
The generated user status remains text. The example does not invent an enum or offer activation commands.

Browser Back and Forward retain the table owners, sorting, widths, and controls.
Search changes stay pending until the refresh action applies them.
Refresh also reads the current screen through its generated operation.
Column dividers support pointer dragging and keyboard resizing.
On a phone, the navigation uses the shared drawer, and wide tables scroll within their panel.
Appearance uses the shared controls. Defaults are Light, Blue, Surface 1 components, Surface 2 background, outline buttons, and depth 2.

Use `?screen=project&project=billing` for a direct project link.
Use `?screen=environment&project=billing&env=dev` for a direct environment link.
Use `?screen=create` for the project form.
Use `?screen=users` for users and `?screen=members&project=billing` for project members.
Use `?screen=access&principal=00000000-0000-4000-8000-000000000002` for the access editor.
Add `scenario=project-admin`, `scenario=no-access`, or `scenario=empty` to review those mock states.
Each full reload starts a fresh mock. No request reaches a WAMN server.

The server renders initial loading markup without private mock data.
Hydration retains that markup and starts the same application reads after attachment.
Fragments return to native links after attachment because HTTP requests do not include them.

After a source fixture build, run the browser cases from the WFE root:

```sh
pnpm exec vite build --config examples/platform/vite.config.ts
node examples/platform/run.mjs
node examples/platform/run.mjs --hydration
```

The hydration command builds its server and client artifacts before it runs.
Set `BENCH_DISTRIBUTION=1` for package imports.
Set `BENCH_DEVELOPMENT=1` and `NODE_ENV=development` for development imports.
Use the same environment for each fixture build and its browser cases.
The regular qualification command includes all three modes and their hydration cases.

Tables use compact 32px rows and Surface 2 row and column dividers by default.
The controls pane has a fixed width and shared sections. Its toolbar button opens and closes it.
Sidebar names use uppercase presentation as navigation labels. Table values retain their original case.

## Invitation and lifecycle mockups

Open Users, then select Invite a user.
Add environment membership rows or project administration rows as needed.
Each row uses a searchable shared Combobox. Empty collections are valid in this sample.
Unspecified, Yes, and No map explicitly to null, true, and false in the captured request shape.
This mapping does not define what an application must do with null.
The example removes draft keys and picker IDs before it constructs a request.

The user table exposes separate activation and deactivation confirmations.
Both actions stay explicit because the captured status field is text, not a declared state machine.
Cancel closes the confirmation without a request. Stop waiting ignores a late response but does not undo an accepted sample change.
The mock labels successful invitations as invited and lifecycle results as active or inactive for demonstration only.

The existing pinned `snapshot/client/user.ts` supplies all three request and result contracts.
No new upstream snapshot or library API is needed for these screens.
The invite action uses a separate strip because generated table actions sit inside collapsible controls.
Issue `wfe-f81.18` tracks an always-visible toolbar action slot.
`platform-invitations.test.ts` and `invitation-cases.mjs` cover request projection, row errors, response failures, navigation, and cleanup.
Shared components render controlled values and errors. The example owns all simulation choices.
