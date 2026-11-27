import { Field, FormActions, Label, SelectField } from '@wfe/components'
import type { SheetContentProps, SheetSide } from '@wfe/components'

export type SheetSize = NonNullable<SheetContentProps['size']>

const sides = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
] as const
const sizes = [
  { value: 'default', label: 'Default' },
  { value: 'wide', label: 'Wide' },
] as const

export function SheetOptions(props: {
  side: SheetSide
  size: SheetSize
  onSideChange: (side: SheetSide) => void
  onSizeChange: (size: SheetSize) => void
}) {
  return (
    <FormActions
      role="group"
      aria-label="Sheet options"
      style={{ 'flex-basis': '100%' }}
    >
      <Field style={{ 'inline-size': 'auto' }}>
        <Label>Side</Label>
        <SelectField
          label="Side"
          choices={sides}
          value={props.side}
          onValueChange={(value) => {
            const side = sides.find((choice) => choice.value === value)
            if (side) props.onSideChange(side.value)
          }}
        />
      </Field>
      <Field style={{ 'inline-size': 'auto' }}>
        <Label>Size</Label>
        <SelectField
          label="Size"
          choices={sizes}
          value={props.size}
          onValueChange={(value) => {
            const size = sizes.find((choice) => choice.value === value)
            if (size) props.onSizeChange(size.value)
          }}
        />
      </Field>
    </FormActions>
  )
}
