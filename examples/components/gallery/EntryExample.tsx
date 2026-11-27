import { createSignal } from 'solid-js'
import { Button, Field, Input, Label } from '@wfe/components'
import { EntryPanel, EntryPanelActions } from '@wfe/components/layout'
import { nativeEvents } from '@wfe/components/events'

function EntryForm() {
  const [submitted, setSubmitted] = createSignal(false)
  return (
    <EntryPanel size="container" role="group" title="Welcome" titleAs="h1">
      <form
        class="example-stack"
        ref={nativeEvents({
          submit: (event) => {
            event.preventDefault()
            setSubmitted(true)
          },
        })}
      >
        <p>Enter your details to continue.</p>
        <Field required>
          <Label>Name</Label>
          <Input name="name" autocomplete="name" />
        </Field>
        <Field required>
          <Label>Email</Label>
          <Input name="email" type="email" autocomplete="email" />
        </Field>
        <EntryPanelActions>
          <Button type="submit" tone="primary">
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

export function EntryExample() {
  const [sent, setSent] = createSignal(false)
  return (
    <>
      <EntryForm />
      <EntryPanel size="content" role="group" title="Billing endpoint">
        <div class="example-stack">
          <p>Receives invoice events.</p>
          <EntryPanelActions>
            <Button onClick={() => setSent(true)}>Send test event</Button>
          </EntryPanelActions>
          {sent() && <p role="status">Test event sent.</p>}
        </div>
      </EntryPanel>
    </>
  )
}
