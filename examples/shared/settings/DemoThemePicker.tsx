import { Field, Label, SelectField } from '@wfe/components'
import type { ThemePreset } from '@wfe/components/theme'
import { demoThemeChoices } from './demoAppearance'
import { isThemePreset } from './settingsRecord'

export function DemoThemePicker(props: {
  value: ThemePreset
  onChange: (value: ThemePreset) => void
}) {
  return (
    <Field>
      <Label>Theme</Label>
      <SelectField
        label="Theme"
        value={props.value}
        choices={demoThemeChoices}
        onValueChange={(value) => {
          if (isThemePreset(value)) props.onChange(value)
        }}
      />
    </Field>
  )
}
