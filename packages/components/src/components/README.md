# Styled controls

This directory contains the shared form, overlay, and display components.
Table editors and application forms use these components and the styles in `../styles`.
Application adapters own validation, requests, permissions, and persistence.
The [control contract](../../../../docs/control-contract.md) documents callback aliases, state precedence, and compound Field inheritance.

Applications import these controls from `@wfe/components` or its public component subpaths.
They explicitly import `@wfe/components/styles.css` and supply a `data-ui` scope through `uiScope()`.
The [style guide](../styles/README.md) assigns shared presentation and state rules to their owning stylesheets.
The [internal entry points](../internal/controls/README.md) delegate behavior to the single owned Kobalte subset.
Solid and Solid Primitives remain external dependencies.

## Choice controls

Use `SelectField` for one string value from a list of choices.
It composes the shared `Select` parts and uses the same trigger, menu, and selection behavior.
Use `Select` directly for custom choice content or multiple selection.
Use `Combobox` when users need editable search text.

```tsx
<Field required invalid={Boolean(error())}>
  <Label>Category</Label>
  <SelectField
    label="Category"
    name="category"
    choices={categories}
    value={category()}
    onValueChange={setCategory}
  />
  <HelpText>Choose a category.</HelpText>
  <FieldError>{error()}</FieldError>
</Field>
```

`Field` supplies the label association, descriptions, and required, disabled, read-only, and invalid states.
An explicit control prop takes precedence over the corresponding Field state.
The raw Checkbox, Switch, RadioGroup, Select, and Combobox roots also inherit these states.
Their native inputs, Select trigger, and RadioGroup group receive the appropriate Field associations.
Canonical `readonly` and `invalid` props take precedence over existing `readOnly` and `validationState` aliases, including explicit false.
`SelectField` submits its accepted value through a hidden native select when it has a name.
A read-only choice retains its submitted value and blocks edits.
A disabled choice control is excluded from form submission.
The application accepts or rejects value changes through its controlled value.

`NativeSelect` remains a compatibility export for native browser integration.
Normal interfaces use `SelectField` or `Select`.
Native interoperability fixtures and style-isolation fixtures can use native controls explicitly.

## Shared choice content

Select and Combobox share their owned content callback composition and optional
status/footer markup through `choiceContent.tsx`. The helper reads current
caller callbacks and preserves cancellation before choice-scope handling. It
adds no provider, portal, component root, or selection state.

Each family keeps its public polymorphic Content type, primitive, direct ref
array, root, and portal wrapper. `choiceScope.ts` still owns choice Tab and focus
restoration policy; the primitives keep their distinct focus and dismissal
behavior. Field inheritance, hidden native values and callback aliases remain
in the family wrappers. Dialog, Popover, Tooltip and menu triggers are not
changed by this extraction. No application API migration is required.

## Overlay buttons

Dialog, AlertDialog, Sheet, Popover, DropdownMenu, and Tooltip buttons share Button presentation.
Their triggers and close or cancel buttons accept `variant` and `tone`.
The defaults are `outline` and `neutral`.
The variants are `outline`, `filled`, `inverted`, and `ghost`.
The tones are `neutral` and `accent`.

The primitive owns overlay events, focus, and accessibility attributes.
Shared presentation adds no wrapper element or event handler.
Custom elements through `as`, including `as={Button}`, retain the selected presentation.
A default Tooltip trigger uses `type="button"` to avoid accidental form submission.
Custom links keep their link behavior, and an explicit `type` takes precedence.

Popover, Tooltip and DropdownMenu also share the identical popup scope and
portal frame through `popupPresentation.tsx`. Each named wrapper still creates
its own typed primitive and applies the explicit `mount` override before its
scope fallback. The helpers add no component owner or dynamic primitive factory.
Dialog scopes retain their content/cancel/origin focus metadata, and choice
scopes retain their selection and Tab policies; neither is merged into the
popup scope. Dialog trigger behavior is unchanged.

## Icons

`Icon` from `@wfe/components` supplies shared 16-pixel decorative SVGs.
Its typed `name` selects the glyph, and `class` accepts native class values.
The surrounding control supplies the accessible name.
Icons have no tab stop and ignore pointer events within a UI scope.
Existing context classes retain checkbox, value, calendar, and table dimensions.
A shared text slot preserves the previous width and line height of navigation glyphs.

Ordinary selects retain one automatic CSS caret, shared with compatibility NativeSelect.
An explicit `Select.Icon` slot replaces that caret and its reserved padding.
Select, Combobox, and DropdownMenu icon slots use shared neutral triangles by default.
Custom children take precedence, including an explicit empty string or `false`.
Popup positioning arrows remain with their positioning primitive.
