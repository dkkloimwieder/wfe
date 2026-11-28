# Styled controls

Import styled controls from `@wfe/components` or a public subpath. Use the shared stylesheet inside Theme. The [control contract](../../../../docs/contracts.md#control-state-and-change-callbacks) covers callbacks and Field state.

## Choice controls

Use SelectField for a string value, Select for custom or multiple choices, and Combobox for editable search. Use NativeSelect when the application needs native select behavior.

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

Field supplies labels, descriptions, and control state. Explicit props take precedence. A named SelectField submits its accepted value through a hidden native select.

## Overlay buttons and icons

Overlay button parts share Button variants and tones. The default variant is outline. Omit tone to use the theme's button colors. Supply `aria-label` for icon-only actions. The [button guide](../../../../docs/buttons.md#buttons) explains the roles.

Import Icon from the package root and individual glyphs from `@wfe/components/icons`. The [icon guide](../../../../docs/buttons.md#icons) covers selective imports.

The [internal entry points](../internal/controls/README.md) own behavior. The [shared styles](../styles/README.md) own presentation.
