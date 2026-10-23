# Control state and change callbacks

This guide records the public vocabulary decision for shared controls.
The current APIs below are implemented. The migration rules describe the target contract.
The callback aliases and broader `Field` inheritance remain pending audit tasks.
This documentation change does not add props or change runtime behavior.

Applications own accepted values and decide whether to accept a change request.
Controls own input interaction, accessible associations, and native form behavior.
Neither a callback nor an accessibility attribute supplies application validation or persistence policy.

## Current APIs

Use the current names until the corresponding migration lands.
The compound controls expose separate root, input, label, and other parts.
A callback on a compound root can carry a value rather than a DOM event.

| Family                         | Current change callback | Value and event shape                                                                                   |
| ------------------------------ | ----------------------- | ------------------------------------------------------------------------------------------------------- |
| `Input`, `Textarea`            | `onValueChange`         | String, then `InputEvent`. Empty text is `''`.                                                          |
| `NativeSelect`                 | `onValueChange`         | String, then `Event`. Native DOM handlers remain separate.                                              |
| `NumberInput`                  | `onValueChange`         | Number or `undefined`, then `InputEvent`.                                                               |
| `SelectField`                  | `onValueChange`         | String without an event argument. Empty selection is `''`.                                              |
| `DatePicker`, `DateTimePicker` | `onValueChange`         | String or `undefined`, without an event argument. Empty values use `undefined`.                         |
| `Select`, `Combobox` roots     | `onChange`              | Selected option or `null` for single selection, option array for multiple selection. No event argument. |
| `RadioGroup` root              | `onChange`              | Selected string without an event argument.                                                              |
| `Checkbox`, `Switch` roots     | `onChange`              | Checked boolean without an event argument.                                                              |
| `FileInput`                    | `onFilesChange`         | File array without an event argument. Empty selection is `[]`.                                          |
| `Tabs`                         | `onValueChange`         | Selected string without an event argument.                                                              |

`NumberInput` requests `undefined` for empty input unless `allowEmpty` is `false`.

`Checkbox` and `Switch` use `checked` and `defaultChecked` for boolean state.
Their separate `value` is the string submitted by a native form.
Checkbox `indeterminate` remains separate from checked state.
`Combobox` also separates search text from accepted option selection through its existing input-value API.
Existing default-value props remain available where the family supports them.
This decision adds no default-value prop to another family.

Owned native fields, `SelectField`, numeric fields, date fields, and `FileInput` use lowercase `readonly` and boolean `invalid`.
Supported states fall back to their enclosing `Field` through the existing implementations.
`Checkbox`, `Switch`, `RadioGroup`, `Select`, and `Combobox` roots currently expose `readOnly` and `validationState`.
These compound roots do not yet inherit the shared `Field` state.
Native elements retain their browser-specific limitations, including the absence of native select read-only behavior.

## Planned compatible names

Scalar and selection controls use `value` with `onValueChange`.
Boolean controls use `checked` with `onCheckedChange`.
Files retain `files` with `onFilesChange`.
Checkbox `value` never becomes a boolean alias.
Existing value shapes and empty representations remain unchanged.

The migration adds the preferred callbacks at owned styled boundaries.
Legacy compound-root `onChange` remains a supported value callback.
When both names are supplied, the latest preferred callback wins and runs once.
For boolean controls, that callback is `onCheckedChange`. For scalar and selection controls, it is `onValueChange`.
The implementation does not call both aliases for one request.

Native `onInput` and `onChange` handlers keep their DOM event meaning on native controls and applicable input parts.
They do not become value-callback aliases.
Existing cancellation, composition, controlled restoration, and form reset behavior remain intact.
Each family preserves the events it already supplies.
The migration does not fabricate events or make existing required event parameters optional.

## Planned state precedence

Lowercase `readonly` and boolean `invalid` are the preferred state names.
Existing `readOnly` and `validationState` props remain supported aliases where they already exist.
The migration does not promise every alias on every control.
Broader shared `Field` inheritance is a separate implementation task.

The target resolution for read-only state is `readonly ?? readOnly ?? Field.readonly`.
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
Labels and descriptions must refer to the actual control target, rather than an arbitrary compound root.

## Migration boundaries

Existing consumer props and exports remain supported.
New adapter-only props stay out of native DOM attributes.
The migration changes owned wrappers without changing captured vendor sources or adding application rules.
Documentation will name implemented aliases as each family migration lands.

Each implementation must cover callback precedence, current callback replacement, explicit false, and rejected controlled requests.
It must preserve native events, keyboard interaction, form submission, reset, accessible associations, and owner cleanup.
Server rendering and hydration must retain the same control identity and behavior.
