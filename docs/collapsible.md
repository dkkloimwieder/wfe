# Collapsible

`Collapsible` provides a native `details` disclosure with shared compact styles.
The summary uses the shared triangular indicator. `indicatorPlacement` accepts `start` (the default) or `end`.
The Default theme adds gray fill and blue dotted decoration on hover or keyboard focus. The triangle keeps its size.
The `summary` prop supplies its heading. Children remain mounted while the disclosure closes, so inputs retain local values.
Table control sections use this component and retain their existing classes and appearance.

Use `defaultOpen` for an uncontrolled disclosure. Its native `open` property can reveal a table filter before focus moves to an invalid input.
Use `open` and `onOpenChange` when the application controls the disclosure. Keep the same mode for its lifetime.
The callback requests a change. The application can accept or reject that request.
Initialization and application changes do not call the callback.
Native toggle observations can combine several property changes within one task.

The summary retains native Enter and Space behavior. Buttons and links inside the summary retain their own actions.
The root accepts native attributes, classes, event handlers, and refs.
Native exclusive groups through `name` are excluded because each component controls its own opening. Use `contentClass` to style the content container.
When an application closes a disclosure with focus inside its content, focus returns to the summary.
Focus outside the disclosure stays unchanged.

The root export and `@wfe/components/collapsible` expose the same component and `CollapsibleProps` type.
Import `@wfe/components/styles.css` once for the shared styles.

```tsx
import { createSignal } from 'solid-js'
import { Collapsible } from '@wfe/components/collapsible'

export function Details() {
  const [open, setOpen] = createSignal(false)
  return (
    <Collapsible summary="Details" open={open()} onOpenChange={setOpen}>
      The application supplies this content.
    </Collapsible>
  )
}

const grouped = (
  // @ts-expect-error Native exclusive groups are outside this component contract.
  <Collapsible summary="Grouped" name="group">
    Content
  </Collapsible>
)
void grouped
```
