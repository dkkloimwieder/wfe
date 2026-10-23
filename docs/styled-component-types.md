# Styled component props

Import named props from `@wfe/components` or the component's existing subpath, such as `@wfe/components/select`.
Both paths export the same owned types.
Checkbox, Switch, RadioGroup, Select, and Combobox parts expose named types with their supported styling props.
Dialog, AlertDialog, Popover, DropdownMenu, and Tooltip parts expose these types too.
For example, `SelectTriggerProps` includes decoration and structured classes, while `SelectContentProps` includes the footer and status slots.
Decoration remains limited to the parts that render a decoration surface.
A root does not acquire decoration merely because one of its parts supports it.

Prop types keep their existing generic element parameter, including the legacy HTMLElement form.
The component functions retain their polymorphic `as` behavior and native attributes for the selected element.
The named prop types describe the options and references that each part owns.
Use the component signature to combine these options with native or custom-element props.
Select and Combobox retain Option and OptGroup parameters and their single/multiple selection union.
Single selection requests an option or null. Multiple selection requests an option array.
The styling additions do not collapse that distinction.

The seven subpaths that previously exported all primitive types now enumerate their exports.
Existing primitive Options, CommonProps, RenderProps, state, context, and type-only component names remain explicitly available from those subpaths for compatibility.
Existing names for styled parts now point to the owned wrapper types rather than the narrower primitive types.
No import-path migration is required for those names.
These compatibility exports do not make internal primitive details a new recommended application API.
Prefer the named owned Props types when describing a styled component.
All added prop exports are type-only and do not import additional runtime components.

`BUTTON_VARIANTS`, `BUTTON_TONES`, and `VALUE_FORMATS` expose the finite supported values.
Their union types derive from the same arrays.
`isButtonVariant`, `isButtonTone`, and `isValueFormat` validate unknown values against those contracts.
Generator validation uses those same guards rather than separate lists.
The arrays describe existing behavior. They do not add variants, tones, formats, or new validation policy.
