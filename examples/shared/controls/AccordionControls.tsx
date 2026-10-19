import { createSignal, flush, onCleanup } from 'solid-js'
import {
  Accordion,
  Button,
  Field,
  FormGrid,
  Input,
  Label,
} from '@wfe/components'

export const accordionLifecycle = {
  configure: (_next: {
    value?: string[]
    accept?: boolean
    prevent?: boolean
    preventKeys?: boolean
  }) => {},
  read: () => ({
    requests: [] as string[][],
    multipleRequests: [] as string[][],
    actions: 0,
    mounts: 0,
    cleanups: 0,
  }),
  stop: () => {},
}
let mounts = 0
let cleanups = 0
function Draft() {
  mounts++
  onCleanup(() => {
    cleanups++
  })
  return (
    <Field controlId="accordion-name">
      <Label>Name</Label>
      <Input id="accordion-name" defaultValue="Ada" />
    </Field>
  )
}
export function AccordionControls() {
  mounts = 0
  cleanups = 0
  const [value, setValue] = createSignal<string[]>(['contact'])
  let accept = true
  let prevent = false
  let preventKeys = false
  let actions = 0
  const requests: string[][] = []
  const multipleRequests: string[][] = []
  accordionLifecycle.configure = (next) => {
    if (next.value !== undefined) setValue(next.value)
    if (next.accept !== undefined) accept = next.accept
    if (next.prevent !== undefined) prevent = next.prevent
    if (next.preventKeys !== undefined) preventKeys = next.preventKeys
    flush()
  }
  accordionLifecycle.read = () => ({
    requests: requests.map((value) => [...value]),
    multipleRequests: multipleRequests.map((value) => [...value]),
    actions,
    mounts,
    cleanups,
  })
  return (
    <section class="example-stack" data-accordion-review>
      <form
        aria-label="Profile sections"
        onSubmit={(event) => event.preventDefault()}
      >
        <p class="ui-help">
          One section opens at a time. Drafts stay in place when a section
          closes.
        </p>
        <Accordion
          id="profile-accordion"
          value={value()}
          onValueChange={(next) => {
            requests.push(next)
            if (accept) setValue(next)
          }}
          onKeyDown={(event) => {
            if (preventKeys) event.preventDefault()
          }}
        >
          <Accordion.Item
            id="accordion-contact"
            value="contact"
            summary={
              <>
                <span>Contact</span>{' '}
                <Button
                  id="accordion-help"
                  onClick={() => {
                    actions++
                  }}
                >
                  Help
                </Button>
              </>
            }
            onClick={(event) => {
              if (prevent) event.preventDefault()
            }}
          >
            <FormGrid columns={2}>
              <Draft />
              <Field controlId="accordion-email">
                <Label>Email</Label>
                <Input
                  id="accordion-email"
                  type="email"
                  defaultValue="ada@example.test"
                />
              </Field>
            </FormGrid>
          </Accordion.Item>
          <Accordion.Item
            id="accordion-preferences"
            value="preferences"
            summary="Preferences"
          >
            <Field controlId="accordion-language">
              <Label>Language</Label>
              <Input id="accordion-language" defaultValue="English" />
            </Field>
            <Accordion id="nested-accordion" aria-label="Delivery details">
              <Accordion.Item
                id="accordion-delivery"
                value="delivery"
                summary="Delivery"
              >
                <p>Use the primary contact address.</p>
              </Accordion.Item>
              <Accordion.Item
                id="accordion-backup"
                value="backup"
                summary="Backup"
              >
                <p>No backup address.</p>
              </Accordion.Item>
            </Accordion>
          </Accordion.Item>
          <Accordion.Item id="accordion-notes" value="notes" summary="Notes">
            <Field controlId="accordion-note">
              <Label>Note</Label>
              <Input id="accordion-note" defaultValue="Account note" />
            </Field>
          </Accordion.Item>
        </Accordion>
      </form>
      <p class="ui-help">These sections open independently.</p>
      <Accordion
        id="multiple-accordion"
        multiple
        defaultValue={['notifications']}
        onValueChange={(next) => multipleRequests.push(next)}
      >
        <Accordion.Item
          id="accordion-notifications"
          value="notifications"
          summary="Notifications"
        >
          <p>Send updates to the contact email.</p>
        </Accordion.Item>
        <Accordion.Item id="accordion-access" value="access" summary="Access">
          <p>The application controls access rules.</p>
        </Accordion.Item>
      </Accordion>
      <Button id="accordion-outside">Outside sections</Button>
    </section>
  )
}
declare global {
  interface Window {
    accordionFixture: typeof accordionLifecycle
  }
}
