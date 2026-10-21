import { createSignal } from 'solid-js'
import { Button, Field, Input, Label } from '@wfe/components'
import { EntryPanel, EntryPanelActions } from '@wfe/components/layout'
import { nativeEvents } from '@wfe/components/events'

export function EntryExample() {
  const [submitted, setSubmitted] = createSignal(false)
  return (
    <EntryPanel size="container" role="group" aria-labelledby="entry-heading">
      <form
        class="example-stack"
        ref={nativeEvents({
          submit: (event) => {
            event.preventDefault()
            setSubmitted(true)
          },
        })}
      >
        <header>
          <h1 id="entry-heading">Welcome</h1>
          <p>Enter your details to continue.</p>
        </header>
        <Field required>
          <Label>Name</Label>
          <Input name="name" autocomplete="name" />
        </Field>
        <Field required>
          <Label>Email</Label>
          <Input name="email" type="email" autocomplete="email" />
        </Field>
        <EntryPanelActions>
          <Button type="submit" tone="accent">
            Continue
          </Button>
          <Button type="reset" onClick={() => setSubmitted(false)}>
            Clear
          </Button>
        </EntryPanelActions>
        <p role="status">
          {submitted() ? 'Example submitted. No request was sent.' : ''}
        </p>
      </form>
    </EntryPanel>
  )
}
