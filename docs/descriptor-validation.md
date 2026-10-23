# Descriptor validation and compatibility

Descriptions select generic UI presentation. Bindings provide current values, component implementations, and callbacks. Neither layer adds application permissions, requests, or persistence rules.

Use literal descriptions with `as const satisfies`. Derive bindings from their exact type. A widened interface cannot retain specific action, view, field, or formatter names. Runtime guards also protect descriptions loaded from JavaScript or changed reactively. They are configuration checks, not a schema for untrusted application data.

## Contract matrix

| View       | Labels                                                                                                                                                                                   | Current availability                                                                                                                         | Runtime unknown-key policy                                                                                                              |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| FormView   | Scalar and repeated field labels default to field keys. Action labels default to action IDs. Named group titles are required.                                                            | `bindings.disabled(field)` and `bindings.readOnly(field)` control field availability. Submit and action availability have separate bindings. | Additional description keys are ignored. Described fields, groups, controls, formats, and binding references are validated.             |
| TableView  | Column labels are optional. An accepted header alias overrides the description label. An omitted label uses the underlying column heading. Supplied labels and aliases must be nonblank. | The existing table and application bindings control current capabilities and actions.                                                        | Additional description keys are ignored. Unknown column IDs, alias IDs, renderer references, formats, and supported flags are rejected. |
| DetailView | Field labels default to field keys. Action labels default to IDs.                                                                                                                        | Fields are read-only by definition. Actions have availability bindings.                                                                      | Additional description keys are ignored. Fields, formats, layout spans, and actions are validated.                                      |
| DeleteView | Title and confirmation are required. Optional action labels have existing English defaults.                                                                                              | The caller supplies the record key, disabled state, and confirmation callback.                                                               | Additional description keys are ignored. Identity, required text, labels, callback presence, and record-key shape are validated.        |
| LayoutView | Titles and region labels are optional. Action labels default to IDs.                                                                                                                     | View components and actions come from bindings.                                                                                              | Additional description keys are ignored. Panel IDs, view references, layout options, and actions are validated.                         |
| GridView   | Row and column labels are required. The optional title must be nonblank when supplied.                                                                                                   | Row `disabled` and column `readOnly` belong to reactive grid metadata. Accepted cell values remain in bindings.                              | Own enumerable string keys outside the description, row, and column allowlists are rejected.                                            |
| ChartView  | `ariaLabel` is required. Optional title and axis labels must be nonblank.                                                                                                                | Data and callbacks come from bindings. There are no form-editing permissions.                                                                | Own enumerable string keys outside the chart and axis allowlists are rejected.                                                          |
| ShellView  | Audience and route labels are required.                                                                                                                                                  | The application supplies available routes, accepted navigation, and replacement header/navigation content.                                   | Own enumerable string keys outside the shell, audience, and route allowlists are rejected.                                              |

These differences are retained deliberately. A grid describes the availability of a row/column matrix. A form reads field availability from its existing controller bindings. Required chart accessibility text and destructive confirmation text do not use record-key fallbacks. Optional FormView, TableView, and LayoutView titles keep their existing empty-title behavior. DetailView rejects an explicitly blank title.

The permissive descriptions do not expose arbitrary extra properties to DOM elements. They do not interpret extra keys as application metadata. TypeScript still checks unknown keys on fresh literals. Do not rely on unknown keys as extension points. Format options have a separate strict allowlist shared by forms, tables, and detail fields.

## Validation order

FormView first checks all scalar and repeated-field descriptor metadata. It then mounts custom field components and asks repeated bindings for row keys. This includes later fields and children of repeated groups. Live accepted values, choices, and row identities are checked when their controls read them. Accessors must remain safe reads. These guards do not suppress ordinary application reads or replace application validation.

TableView checks supplied column labels and accepted header aliases before custom cells mount. It also checks them before the initial toolbar component mounts. Undefined aliases still fall back to the description label, then to the existing heading. An empty string or whitespace-only label is a configuration error. This also applies when another label takes precedence. Valid reactive label changes retain existing cells.

Other view guards keep their existing validation order. A configuration error prevents the associated action from rendering or running. Accessors can still run before the error occurs. Rendering custom components is distinct from submitting forms, confirming deletion, or running actions. Those operations remain explicit application callbacks.

## Chart formatter bindings

`ChartViewBindings<Row, D>` derives required formatter keys from the x and y axes in the literal description. If those axes name `day` and `amount`, both functions are required. Fresh binding literals reject misspelled formatter keys. `ChartView<Row, D>` uses the same contract.

The second generic is optional. Existing `ChartViewBindings<Row>` annotations and explicit `ChartView<Row>` calls retain the broad formatter dictionary and runtime validation. Descriptions with widened formatter names also retain that dictionary. Descriptions without named formatters do not require a formatter map. Runtime checks continue to require each referenced formatter to be an own callable binding before chart creation.

The [chart type fixtures](../tests/contracts/chart-contract.ts) cover literal keys, missing functions, misspellings, and the broad compatibility form. The existing form, table, layout, and grid contract fixtures continue to cover their own required bindings.

## Callback and root conventions

`ActionBinding.run` is the existing operation callback. Form submission remains on the form controller. DeleteView uses `onConfirm`. Value, selection, and navigation requests use their existing `on…` callbacks. These names are retained for compatibility rather than adding aliases for different operations.

FormView, TableView, GridView, and ChartView use `data-generator-view`. DetailView uses `data-generator-detail`. DeleteView uses `data-generator-delete`. LayoutView composes DashboardShell and marks its panels. These attributes identify generated content for inspection. They are not a shared root-attribute forwarding API.

ShellView forwards the documented DashboardShell presentation props, including structured `class` and `style`. Generated views do not accept a universal `class` or arbitrary HTML attribute bag. Use their existing component/layout contracts or an application-owned surrounding element. Do not add application behavior through DOM selectors.

Form, repeated-row, and detail layouts share the same column-count and span
predicates. They retain their existing defaults and error messages; repeated-row
metadata still rejects an explicit null column count. Validation remains a
preflight step before custom field renderers or row-key callbacks run.

Grid and Chart share only non-array object, text and allowed-key guard machinery.
Their allowed keys and descriptor rules remain separate. Grid still permits an
empty row or column list; Shell keeps its own package-local guards and nonempty
route/audience requirements. No package dependency or descriptor format changes.

Generated detail, delete and repeated-row actions use the same FormActions row
as FormView. Button order, native button types and full-span repeated-row action
placement remain unchanged. The row wraps natural-width buttons; it does not
choose actions, validation, confirmation policy or application requests.
