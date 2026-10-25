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

## Screen ownership

`PlatformApp.tsx` creates one application controller and owns browser history, native links, heading focus, and document titles.
It also supplies the organization header, navigation, appearance controls, and session feedback to `DashboardShell`.
The screen modules receive that same controller. They do not create another transport or authority context.

`ProjectTables.tsx` owns the project and environment table presentation, selection, resizing, and collapsed controls.
Both tables stay mounted when the route changes. Their existing hidden containers preserve state during Back and Forward navigation.
`CreateProjectView.tsx` owns the project form description and its result presentation.
`EnvironmentView.tsx` presents deployment status and links to the application access screens.
`AccessViews.tsx`, `ApplicationAccessViews.tsx`, and `InvitationView.tsx` retain their existing screen boundaries.

This example uses `DashboardShell` directly because its tables have a longer lifetime than the active route.
`ShellView` changes the mounted page when its route ID changes.
Its header and navigation overrides do not change that page lifetime.
Using a synthetic single-route description here adds another route model without removing the application navigation logic.
Other examples demonstrate `ShellView` for screens that follow its page lifetime.

The application modules own mock permissions, requests, cancellation, and response handling.
The provider modules adapt captured clients to the mock transport.
`metadata-description.ts` maps captured fields to generic descriptions, and `table-selection.ts` supplies application display text for copying.
These adapters stay inside this example. They do not define behavior for library consumers.

Existing upstream work remains separate: `wfe-f81.9` tracks authority metadata, and `wfe-f81.5` tracks validation constraints.
`wfe-f81.29` refreshes the regenerated list declarations and their matching metadata.
This screen split does not replace those contracts or invent missing metadata.

## Captured inputs

`snapshot/provenance.json` records the WAMN revision, source paths, and hashes.
Captured client imports point to the copied wire module.
The application policy snapshot uses the renamed `platform` SQL schema.
Its provenance records the local replacement and retains the original source hash.
The integrity check reverses recorded replacements before it compares that hash.
Other source bytes stay unchanged.
A fresh capture replaces local repairs with the source checkout contents.
Use a source checkout that includes the schema rename when you capture it again.
The original workspace declares Apache-2.0. The snapshot includes that license text and the original Cargo metadata.
The control snapshot includes unused operations from seven client modules.
`snapshot/application` separately captures application-host user, role, permission, and user-role clients.
It includes metadata for the eight role-assignment and read operations, plus the host and identity implementation sources.
The application and control user operations share identifiers but return different records.
A transport must bind the application host to a project and environment before it invokes those operations.
The capture does not add authorization rules to shared components.
`application-access-provider.ts` and `application-access-application.ts` provide the separately scoped mock and controller.
They bind each transport to an immutable project and environment, outside the operation body.
They read caller authority from `permission.mine`, independently of control administration.
They preserve stored roles, administrator coverage, served operations, and stored permissions as separate fields.
Their sample outcomes do not prescribe application workflows or replace server authorization.
`ApplicationAccessViews.tsx` uses the shared table and form views for users, assigned roles, and stored permissions.
Open `?screen=app-users&project=billing&env=dev` to review user assignments.
Open `?screen=app-roles&project=billing&env=dev` to review permissions by role.
The environment screen links to both views. Browser history preserves each table owner.
The `billing/prod` example denies application administration even when the caller administers the control organization.
These screens require no new shared component or generator behavior.
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
Issue `wfe-f81.6` adds example-owned structural validators generated from captured result metadata.
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

The capture at `448270d0ecc6dba0358a6475b2348b1aa257e34f` contains regenerated
project and environment list clients whose name/state records match the metadata.
The coherent snapshot also includes list pagination fields and nullable environment
status counts from that revision. The mock returns one complete local page with a
null next cursor; unknown totals and status counts remain null. These fixtures do
not prescribe application paging or lifecycle policy.
The application retains its checked boundary and rejects old string arrays,
missing states, and states outside the captured contract. Captured files are
unaltered except for the documented local client import paths.

## Generated result validation

The example generates 24 wire result schemas: 16 control operations and eight application operations.
The lifecycle metadata capture adds invitation, activation, and deactivation contracts from the same upstream revision.
The two schema registries remain separate because control and application operations can share identifiers.

`metadata-invoke.ts` checks completed replies before the captured clients rename their fields.
It returns accepted replies unchanged. It does not strip unknown members or normalize values.
An unsupported operation or result class returns an uncertain outcome before dispatch.
A malformed completed reply also returns an uncertain outcome.
Refused, uncertain, and partial outcomes retain their original meanings.
The existing application adapter still rejects partial replies that the screen cannot apply.

The generator supports required objects and arrays, nullable scalar leaves, text, booleans, UUIDs, int32 values, and declared enum values.
It rejects unsupported metadata, duplicate paths, and conflicting structures.
It does not infer input limits, authorization rules, or optional containers.
The invocation helper supports one outcome per request. It does not expose streaming or batch transport methods.
Decoded schemas retain application identity checks alongside the regenerated client types.
`metadataTableColumns` takes an explicit fourth argument for result-envelope paths
that are not row columns. The example names `next_cursor` and `total`. Unknown,
repeated, and nested envelope paths are rejected; every row field still needs an
explicit column mapping. This is an application adapter, not shared UI policy.
No shared UI package or upstream WAMN source changes for this path.

From the WFE repository root, regenerate the example schemas:

```sh
node examples/platform/generate-result-schemas.mjs
```

To detect changes in the generated output, run:

```sh
node examples/platform/generate-result-schemas.mjs --check
```

The repository test suite also compares generated output with the captured metadata.

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
