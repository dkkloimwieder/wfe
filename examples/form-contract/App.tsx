import { Show, createSignal, onCleanup } from 'solid-js'
import {
  Button,
  Checkbox,
  Field,
  FieldError,
  HelpText,
  Input,
  Label,
  SelectField,
  uiScope,
} from '@wfe/components'
import { nativeEvents } from '@wfe/components/events'
import { AppearanceReview } from '../shared/appearance/AppearanceReview'
import {
  monochrome,
  neutralAccent,
  defaultLayers,
  appearanceStyle,
} from '../shared/appearance/appearance'
import type { Depth } from '../shared/appearance/appearance'
import { createApplication } from './application'
import type { ResponseMode } from './application'

export function App(props: {
  ready?: (application: ReturnType<typeof createApplication>) => void
}) {
  const [scheme, setScheme] = createSignal(monochrome)
  const [accent, setAccent] = createSignal(neutralAccent)
  const [depth, setDepth] = createSignal<Depth>(1)
  const [layers, setLayers] = createSignal(defaultLayers)
  const scope = uiScope()
  const application = createApplication()
  const form = application.form
  props.ready?.(application)
  let element: HTMLFormElement | undefined
  onCleanup(() => {
    element = undefined
  })
  const save = async () => {
    const result = await form.submit()
    if (result.status === 'invalid' || result.status === 'rejected')
      element?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }
  return (
    <main
      {...scope}
      class="form-page appearance-scope"
      style={{
        ...scope.style,
        ...appearanceStyle(scheme(), accent(), depth(), layers()),
      }}
      data-ui-theme={scheme().mode === 'dark' ? 'dark' : undefined}
    >
      <AppearanceReview
        scheme={scheme()}
        accent={accent()}
        depth={depth()}
        layers={layers()}
        onSchemeChange={setScheme}
        onAccentChange={setAccent}
        onDepthChange={setDepth}
        onLayersChange={setLayers}
      />
      <div class="form-example">
        <h1>Form contract</h1>
        <p>
          Values and saving belong to this example application. Changes are not
          persisted.
        </p>
        <form
          novalidate
          ref={[
            (node) => {
              element = node
            },
            nativeEvents<HTMLFormElement>({
              submit: (event) => event.preventDefault(),
            }),
          ]}
          aria-label="Record form"
          aria-busy={form.pending ? 'true' : 'false'}
        >
          <Field required invalid={Boolean(form.errors.fields?.name)}>
            <Label>Name</Label>
            <Input
              value={form.values.name}
              onValueChange={(value) => form.setValue('name', value)}
            />
            <HelpText>Enter a record name.</HelpText>
            <FieldError>{form.errors.fields?.name}</FieldError>
          </Field>
          <Field invalid={Boolean(form.errors.fields?.category)}>
            <Label>Category</Label>
            <SelectField
              label="Category"
              choices={[
                { value: 'General', label: 'General' },
                { value: 'Research', label: 'Research' },
              ]}
              value={form.values.category}
              onValueChange={(value) => form.setValue('category', value)}
            />
            <FieldError>{form.errors.fields?.category}</FieldError>
          </Field>
          <Checkbox
            checked={form.values.enabled}
            onChange={(value) => form.setValue('enabled', value)}
          >
            <Checkbox.Input />
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Checkbox.Label>Enabled</Checkbox.Label>
          </Checkbox>
          <Show when={form.errors.form || form.phase === 'error'}>
            <p role="alert">
              {form.errors.form ?? 'The save failed. Try again.'}
            </p>
          </Show>
          <div class="buttons">
            <Button
              onClick={() => {
                void save()
              }}
              disabled={form.pending}
            >
              Save
            </Button>
            <Button onClick={() => form.reset()}>Reset</Button>
            <Button onClick={() => form.cancel()} disabled={!form.pending}>
              Cancel
            </Button>
          </div>
          <p role="status" data-ui-text="system">
            {form.phase} · {form.dirty ? 'Changed' : 'Unchanged'}
          </p>
        </form>
        <section aria-label="Example service">
          <h2>Example service</h2>
          <Field>
            <Label>Simulated response</Label>
            <SelectField
              data-ui-text="system"
              label="Simulated response"
              choices={[
                { value: 'success', label: 'Success' },
                { value: 'field-error', label: 'Field rejection' },
                { value: 'form-error', label: 'Form rejection' },
                { value: 'failure', label: 'Unexpected failure' },
              ]}
              value={application.response()}
              onValueChange={(value) =>
                application.setResponse(value as ResponseMode)
              }
            />
          </Field>
          <Checkbox
            checked={application.hold() === 'submission'}
            onChange={(value) =>
              application.setHold(value ? 'submission' : undefined)
            }
          >
            <Checkbox.Input />
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Checkbox.Label>Pause response</Checkbox.Label>
          </Checkbox>
          <div class="buttons">
            <Button
              disabled={!application.waiting()}
              onClick={() => {
                application.complete()
              }}
            >
              Complete response
            </Button>
            <Button
              onClick={() =>
                application.replace({
                  name: 'External record',
                  category: 'Research',
                  enabled: true,
                })
              }
            >
              Load other record
            </Button>
          </div>
        </section>
      </div>
    </main>
  )
}
