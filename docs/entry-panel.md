# EntryPanel

`EntryPanel` centers a small content-sized surface horizontally and vertically.
Use it for an entry screen with a short form or a few choices.
The application supplies headings, fields, buttons, validation, submission, and navigation.
The panel creates no form, main landmark, dialog, or focus trap.

```tsx
import { Theme, Field, Label, Input, Button } from '@wfe/components'
import { EntryPanel } from '@wfe/components/layout'
import '@wfe/components/styles.css'

;<Theme>
  <main>
    <EntryPanel role="group" aria-labelledby="welcome">
      <form>
        <h1 id="welcome">Welcome</h1>
        <Field>
          <Label>Name</Label>
          <Input name="name" />
        </Field>
        <Button type="submit">Continue</Button>
      </form>
    </EntryPanel>
  </main>
</Theme>
```

The default `size="viewport"` fills the current viewport height.
Use `size="container"` inside a parent with a definite height.
The panel scrolls when the content exceeds the available height.
Its surface retains safe edge spacing on narrow screens.

The surface fits its content up to 30rem by default.
Set `--ui-entry-panel-width` on the component to change this limit.
The limit does not set field widths.
Native attributes, classes, styles, events, and refs apply to the outer container.

The panel uses the shared surface, spacing, border, and accent colors.
Its dotted frame uses the primary accent, which is blue in the Default theme.
Decoration remains behind an opaque surface and cannot receive pointer events.
Forced-color mode removes the decorative frame.
The component adds no shadow.

Open `?gallery=entry` for the gallery example or `?galleryPreview=entry` for the standalone example.
