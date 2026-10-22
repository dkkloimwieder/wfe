import { createSignal } from 'solid-js'
import {
  Button,
  Checkbox,
  FieldGroup,
  FormActions,
  Icon,
} from '@wfe/components'
import { createForm } from '@wfe/form'
import { FormView } from '@wfe/generator'

/** This example application owns submission, availability, and callbacks. */
export function FormActionsExample() {
  const initial = { name: 'Sample record' }
  const [values, setValues] = createSignal(initial)
  const [submitDisabled, setSubmitDisabled] = createSignal(false)
  const [icons, setIcons] = createSignal(true)
  const [iconOnly, setIconOnly] = createSignal(false)
  const [message, setMessage] = createSignal('No action requested.')
  const form = createForm({
    values,
    defaults: () => initial,
    onValuesChange: setValues,
    validate: (value) =>
      value.name.trim() ? {} : { fields: { name: 'Enter a name.' } },
    onSubmit: (value) => {
      setMessage(`Saved ${value.name}.`)
      return { ok: true }
    },
  })
  const SaveIcon = () => <Icon name="check" />
  const CancelIcon = () => <Icon name="cross" />
  return (
    <div class="example-stack">
      <FieldGroup title="Action options">
        <Checkbox checked={submitDisabled()} onChange={setSubmitDisabled}>
          <Checkbox.Input />
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Label>Disable submission</Checkbox.Label>
        </Checkbox>
        <Checkbox checked={icons()} onChange={setIcons}>
          <Checkbox.Input />
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Label>Include icons</Checkbox.Label>
        </Checkbox>
        <Checkbox checked={iconOnly()} onChange={setIconOnly}>
          <Checkbox.Input />
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Label>Icon-only actions</Checkbox.Label>
        </Checkbox>
      </FieldGroup>
      <FieldGroup title="Generated form">
        <FormView
          description={{
            id: 'gallery-form-actions',
            fields: [
              { field: 'name', label: 'Name', control: 'text', required: true },
            ],
            submit: { id: 'save', label: 'Save', iconOnly: iconOnly() },
            actions: [{ id: 'cancel', label: 'Cancel', iconOnly: iconOnly() }],
          }}
          bindings={{
            form,
            submitDisabled,
            submitIcon: icons() ? SaveIcon : undefined,
            actions: {
              cancel: {
                icon: icons() ? CancelIcon : undefined,
                run: () => {
                  form.reset()
                  setMessage('Cancelled.')
                },
              },
            },
          }}
        />
      </FieldGroup>
      <FieldGroup
        title="Handwritten actions"
        help="FormActions uses the same row layout for application buttons."
      >
        <FormActions>
          <Button onClick={() => setMessage('Preview requested.')}>
            Preview
          </Button>
          <Button onClick={() => setMessage('Reset requested.')}>Reset</Button>
        </FormActions>
      </FieldGroup>
      <p role="status" aria-live="polite">
        {message()}
      </p>
    </div>
  )
}
