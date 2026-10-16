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
