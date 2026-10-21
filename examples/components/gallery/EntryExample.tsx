import { createSignal } from 'solid-js'
import { Button, Field, Input, Label } from '@wfe/components'
import { EntryPanel } from '@wfe/components/layout'
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
        <div class="example-actions">
          <Button type="submit" tone="accent">
            Continue
          </Button>
          <Button type="reset" onClick={() => setSubmitted(false)}>
            Clear
          </Button>
        </div>
        <p role="status">
          {submitted() ? 'Example submitted. No request was sent.' : ''}
        </p>
      </form>
    </EntryPanel>
  )
}
