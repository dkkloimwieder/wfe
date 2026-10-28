# Color picker

`ColorPicker` accepts an application-owned `value` and calls `onValueChange` with a lowercase `#RRGGBB` color. It supports opaque sRGB colors. It does not support alpha or other color spaces.

```tsx
import { ColorPicker } from '@wfe/components'
import { createSignal } from 'solid-js'

export function ColorExample() {
  const [color, setColor] = createSignal('#3569c8')
  return <ColorPicker label="Color" value={color()} onValueChange={setColor} />
}
```

The hex input retains incomplete text and blocks native form submission until the text is valid. Escape restores the application value. Valid edits request a change. A caller can reject that request. Blur restores rejected valid text.

The swatch opens a themed popup with keyboard-accessible red, green, and blue sliders. `disabled` and `readonly` prevent changes. A surrounding `Field` supplies those states and label associations. `name` and `form` submit the application value through a hidden input.

`decoration` accepts `false`, `neutral`, `primary`, or `secondary`, like other inputs. The component uses the shared surface, border, radius, spacing, and accent variables. `messages` replaces the popup title, opener label, channel labels, and invalid-value message.

The gallery includes a Color picker page under Forms.
