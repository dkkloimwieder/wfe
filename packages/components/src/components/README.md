# Styled controls

This directory contains the shared form, overlay, and display components.
Table editors and application forms use these components and the styles in `../styles`.
Application adapters own validation, requests, permissions, and persistence.

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
`SelectField` submits its accepted value through a hidden native select when it has a name.
A read-only choice retains its submitted value and blocks edits.
A disabled choice control is excluded from form submission.
The application accepts or rejects value changes through its controlled value.

`NativeSelect` remains a compatibility export for native browser integration.
Normal interfaces use `SelectField` or `Select`.
Native interoperability fixtures and style-isolation fixtures can use native controls explicitly.

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

## Icons

`Icon` from `@wfe/components` supplies shared 16-pixel decorative SVGs.
Its typed `name` selects the glyph, and `class` accepts native class values.
The surrounding control supplies the accessible name.
Icons have no tab stop and ignore pointer events within a UI scope.
Existing context classes retain checkbox, value, calendar, and table dimensions.
A shared text slot preserves the previous width and line height of navigation glyphs.

Ordinary selects retain one automatic CSS caret, shared with compatibility NativeSelect.
An explicit `Select.Icon` slot replaces that caret and its reserved padding.
Select, Combobox, and DropdownMenu icon slots use shared chevrons by default.
Custom children take precedence, including an explicit empty string or `false`.
Popup positioning arrows remain with their positioning primitive.
