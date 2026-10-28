import { createSignal } from 'solid-js'
import { ColorPicker, Field, Label, HelpText } from '@wfe/components'

export function ColorExample() {
  const [color, setColor] = createSignal('#3569c8')
  return (
    <section class="example-stack">
      <Field>
        <Label>Color</Label>
        <ColorPicker
          label="Color"
          value={color()}
          onValueChange={setColor}
          decoration="primary"
        />
        <HelpText>
          Enter a hex color or open the swatch to adjust its channels.
        </HelpText>
      </Field>
      <Field>
        <Label>Read only</Label>
        <ColorPicker
          label="Read only"
          value={color()}
          onValueChange={setColor}
          readonly
        />
      </Field>
      <Field>
        <Label>Disabled</Label>
        <ColorPicker
          label="Disabled"
          value={color()}
          onValueChange={setColor}
          disabled
        />
      </Field>
      <p>
        Selected color: <code>{color()}</code>
      </p>
    </section>
  )
}
