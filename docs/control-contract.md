# Control state and change callbacks

This guide records the public vocabulary decision for shared controls.
The current APIs below are implemented.
`Checkbox`, `Switch`, `RadioGroup`, `Select`, and `Combobox` now support the compatible callbacks and shared `Field` inheritance described below.
Other families retain their existing APIs. This guide does not promise every alias on every control.

Applications own accepted values and decide whether to accept a change request.
Controls own input interaction, accessible associations, and native form behavior.
Neither a callback nor an accessibility attribute supplies application validation or persistence policy.

## Current APIs

Use the preferred callback names below for new consumers.
The listed legacy aliases remain supported.
The compound controls expose separate root, input, label, and other parts.
A callback on a compound root can carry a value rather than a DOM event.

| Family                                       | Current change callback              | Value and event shape                                                                                   |
| -------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `Input`, `Textarea`                          | `onValueChange`                      | String, then `InputEvent`. Empty text is `''`.                                                          |
| `NativeSelect`                               | `onValueChange`                      | String, then `Event`. Native DOM handlers remain separate.                                              |
| `NumberInput`                                | `onValueChange`                      | Number or `undefined`, then `InputEvent`.                                                               |
| `SelectField`                                | `onValueChange`                      | String without an event argument. Empty selection is `''`.                                              |
| `DatePicker`, `TimePicker`, `DateTimePicker` | `onValueChange`                      | String or `undefined`, without an event argument. Empty values use `undefined`.                         |
| `Select`, `Combobox` roots                   | `onValueChange`, legacy `onChange`   | Selected option or `null` for single selection, option array for multiple selection. No event argument. |
| `RadioGroup` root                            | `onValueChange`, legacy `onChange`   | Selected string without an event argument.                                                              |
| `Checkbox`, `Switch` roots                   | `onCheckedChange`, legacy `onChange` | Checked boolean without an event argument.                                                              |
| `FileInput`                                  | `onFilesChange`                      | File array without an event argument. Empty selection is `[]`.                                          |
| `Tabs`                                       | `onValueChange`                      | Selected string without an event argument.                                                              |

`NumberInput` requests `undefined` for empty input unless `allowEmpty` is `false`.

`Checkbox` and `Switch` use `checked` and `defaultChecked` for boolean state.
Their separate `value` is the string submitted by a native form.
Checkbox `indeterminate` remains separate from checked state.
`Combobox` also separates search text from accepted option selection through its existing input-value API.
Existing default-value props remain available where the family supports them.
This decision adds no default-value prop to another family.

Owned native fields, `SelectField`, numeric fields, date fields, and `FileInput` use lowercase `readonly` and boolean `invalid`.
Supported states fall back to their enclosing `Field` through the existing implementations.
`Checkbox`, `Switch`, `RadioGroup`, `Select`, and `Combobox` roots support `readonly` and `invalid` with `readOnly` and `validationState` aliases.
These compound roots inherit required, disabled, read-only, and invalid state from the shared `Field`.
The primitive retains its existing form-control owner.
Native elements retain their browser-specific limitations, including the absence of native select read-only behavior.

## Compatible callback names

Scalar and selection controls use `value` with `onValueChange`.
Boolean controls use `checked` with `onCheckedChange`.
Files retain `files` with `onFilesChange`.
Checkbox `value` never becomes a boolean alias.
Existing value shapes and empty representations remain unchanged.

The five compound families add the preferred callbacks at owned styled boundaries.
Legacy compound-root `onChange` remains a supported value callback.
When both names are supplied, the latest preferred callback wins and runs once.
For boolean controls, that callback is `onCheckedChange`. For scalar and selection controls, it is `onValueChange`.
The implementation does not call both aliases for one request.

Native `onInput` and `onChange` handlers keep their DOM event meaning on native controls and applicable input parts.
They do not become value-callback aliases.
Existing cancellation, composition, controlled restoration, and form reset behavior remain intact.
Each family preserves the events it already supplies.
The migration does not fabricate events or make existing required event parameters optional.

## Compound state precedence

Lowercase `readonly` and boolean `invalid` are the preferred state names.
Existing `readOnly` and `validationState` props remain supported aliases where they already exist.
The migration does not promise every alias on every control.
The five compound families implement the following shared `Field` precedence.

The resolution for read-only state is `readonly ?? readOnly ?? Field.readonly`.
For invalid state, an explicit `invalid` wins.
Otherwise, a supplied `validationState` resolves to whether it equals `'invalid'`.
Without either prop, the control inherits `Field.invalid`.
Thus, legacy `'valid'` overrides an inherited invalid state.

An explicit `false` wins over an alias or inherited `true`.
Undefined means that the control falls back to the next source.
Shared `disabled` and `required` props follow the same explicit-prop-before-Field rule.
These rules use nullish fallback, never logical OR.
Native disabled fieldsets and the first-legend exemption retain browser behavior.
A control prop cannot enable an input that the browser disables through its fieldset.

ARIA overrides remain accessibility attributes.
They do not change accepted values, validation results, or whether application commands are available.
Labels and descriptions refer to the actual control target, rather than an arbitrary wrapper.
`Field` labels target the Checkbox or Switch input, Select trigger, or Combobox input.
RadioGroup uses the Field label IDs to name its accessible group, without an invalid HTML label target.
Caller-supplied and primitive-owned labels and descriptions remain available.
An explicit control `aria-label` retains its existing naming behavior.

## Deferred custom controls and server rendering

A conditional or custom wrapper can defer a native input or trigger until after its Field label renders.
For a custom target ID, set `Field.controlId` and omit the nested input or trigger ID.
Without a custom ID, the nested target inherits the Field-generated ID.

For example, set `controlId="choice-input"` on the Field.
Place its Label before a Show that contains your custom Checkbox component.
Inside that component, render `Checkbox.Input` without an `id` prop.

Direct compound roots prepare their explicit target IDs before sibling labels render on the server.
This process does not discover arbitrary targets inside deferred application components.
For a deferred native input or trigger, put the ID on `Field.controlId`.
Do not repeat it on the root wrapper.
This fallback does not apply to a deferred RadioGroup, which uses an accessible group name instead of an HTML label target.

## Migration boundaries

Existing consumer props and exports remain supported.
New adapter-only props stay out of native DOM attributes.
The migration changes owned wrappers and includes documented local vendor repairs.
Upstream revisions, original hashes, and licenses remain unchanged.
Application rules remain outside the controls.
The table above names the implemented aliases.

Each implementation must cover callback precedence, current callback replacement, explicit false, and rejected controlled requests.
It must preserve native events, keyboard interaction, form submission, reset, accessible associations, and owner cleanup.
Server rendering and hydration must retain the same control identity and behavior.
