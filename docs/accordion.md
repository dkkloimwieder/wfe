# Accordion

Accordion groups related sections that open and close. It uses the shared native Collapsible component.
Applications own field values, validation, requests, and persistence.
The root export and `@wfe/components/accordion` expose the same components and types.
Import `@wfe/components/styles.css` once for shared styles.

Use `Accordion.Root` or `Accordion` for the group. Use `Accordion.Item` for each section.
Supply each item with a unique, nonempty `value`, a `summary`, and content.
The summary keeps native disclosure semantics. The group does not add a separate accessibility role.
Use headings inside summaries when the page structure needs them.

The default group allows one open section. Set `multiple` to allow several open sections.
Use `defaultValue` for local state, or `value` and `onValueChange` for application control.
Both values contain arrays of item values. An empty array closes all sections.
The callback requests a change. The application can accept or reject that request.
Initial rendering and application prop changes do not call the callback.
Keep the control mode stable for the group lifetime.
The component rejects duplicate or empty selected values and several selected values in a single-open group.
If you change `multiple` to false, first reduce the selected values to one or none.

Children stay mounted while a section closes. Draft values and DOM nodes remain in place.
Closing a section with focus inside its content returns focus to its summary.
Focus outside the section stays unchanged.
Removing an item does not clear its selected value. Applications own selection across changes to their item list.
Native `toggle` events can combine several property writes in one task.

Enter and Space open or close the focused summary.
Up and down arrows move between visible summaries in the same group and wrap at either end.
Home and End move to the first and last summaries. These keys move focus without opening sections.
Nested groups keep their own navigation. Inputs and buttons inside sections retain their normal keys.
Caller event handlers can cancel an action with `preventDefault()`.
The root accepts native div attributes, structured classes, events, and refs.
Items accept the native Collapsible attributes, events, refs, and `contentClass`.
The group owns each item's open state.

```tsx
import { createSignal } from 'solid-js'
import { Accordion, Field, Input, Label } from '@wfe/components'

export function ProfileSections() {
  const [open, setOpen] = createSignal<string[]>(['contact'])
  return (
    <Accordion value={open()} onValueChange={setOpen}>
      <Accordion.Item value="contact" summary="Contact">
        <Field controlId="profile-name">
          <Label>Name</Label>
          <Input id="profile-name" defaultValue="Ada" />
        </Field>
      </Accordion.Item>
      <Accordion.Item value="preferences" summary="Preferences">
        Application preferences
      </Accordion.Item>
    </Accordion>
  )
}

const independent = (
  <Accordion.Root multiple defaultValue={['contact', 'preferences']}>
    <Accordion.Item value="contact" summary="Contact">
      Contact content
    </Accordion.Item>
    <Accordion.Item value="preferences" summary="Preferences">
      Preferences content
    </Accordion.Item>
  </Accordion.Root>
)
const invalidItem = (
  // @ts-expect-error The group owns the item open state.
  <Accordion.Item value="contact" summary="Contact" open>
    Content
  </Accordion.Item>
)
// @ts-expect-error Selected values use an array in both group modes.
const invalidSelection = <Accordion value="contact" />
void independent
void invalidItem
void invalidSelection
```

The `?accordion=1` component preview demonstrates grouped forms with the shared default appearance.
The browser and hydration suites use the same form fixture.
