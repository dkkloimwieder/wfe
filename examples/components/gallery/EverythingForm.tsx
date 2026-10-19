import { For, Show, createSignal } from 'solid-js'
import {
  Button,
  Checkbox,
  Combobox,
  DatePicker,
  DateTimePicker,
  Field,
  FieldError,
  FieldGroup,
  FieldValue,
  FileInput,
  HelpText,
  Input,
  Label,
  NumberInput,
  RadioGroup,
  Select,
  SelectField,
  Switch,
  Textarea,
} from '@wfe/components'
import { nativeEvents } from '@wfe/components/events'

type Choice = { id: string; label: string }
const teams: Choice[] = [
  { id: 'operations', label: 'Operations' },
  { id: 'support', label: 'Support' },
  { id: 'review', label: 'Review' },
]
const tags: Choice[] = [
  { id: 'internal', label: 'Internal' },
  { id: 'priority', label: 'Priority' },
  { id: 'external', label: 'External' },
]
const identity = [
  { name: 'name', label: 'Record name', type: 'text', required: true },
  { name: 'email', label: 'Contact email', type: 'email', required: true },
  { name: 'phone', label: 'Telephone', type: 'tel', required: false },
  { name: 'website', label: 'Website', type: 'url', required: false },
] as const

/** An application-owned form that exercises the shared controls together. */
export function EverythingForm() {
  const [invalid, setInvalid] = createSignal(false)
  const [errors, setErrors] = createSignal<Record<string, string>>({})
  const [status, setStatus] = createSignal('draft')
  const [team, setTeam] = createSignal<Choice | null>(teams[0]!)
  const [selectedTags, setSelectedTags] = createSignal<Choice[]>([tags[0]!])
  const [start, setStart] = createSignal<string | undefined>('2026-10-19')
  const [end, setEnd] = createSignal<string | undefined>()
  const [appointment, setAppointment] = createSignal<string | undefined>(
    '2026-10-20T14:30:00.000Z',
  )
  const [quantity, setQuantity] = createSignal<number | undefined>(12)
  const [budget, setBudget] = createSignal<number | undefined>(1250.5)
  const [discount, setDiscount] = createSignal<number | undefined>()
  const [notify, setNotify] = createSignal(true)
  const [active, setActive] = createSignal(true)
  const [delivery, setDelivery] = createSignal('standard')
  const [files, setFiles] = createSignal<File[]>([])
  const [saved, setSaved] = createSignal<string>()
  let form: HTMLFormElement | undefined
  function reset() {
    form?.reset()
    setErrors({})
    setInvalid(false)
    setSaved(undefined)
    setStatus('draft')
    setTeam(teams[0]!)
    setSelectedTags([tags[0]!])
    setStart('2026-10-19')
    setEnd(undefined)
    setAppointment('2026-10-20T14:30:00.000Z')
    setQuantity(12)
    setBudget(1250.5)
    setDiscount(undefined)
    setNotify(true)
    setActive(true)
    setDelivery('standard')
    setFiles([])
  }
  const events = nativeEvents<HTMLFormElement>({
    submit(event) {
      event.preventDefault()
      const issues: Record<string, string> = {}
      for (const element of Array.from(event.currentTarget.elements)) {
        if (
          element instanceof HTMLInputElement &&
          element.name &&
          !element.validity.valid
        )
          issues[element.name] = element.validationMessage
      }
      setErrors(issues)
      const valid = event.currentTarget.checkValidity()
      setInvalid(!valid)
      if (!valid) {
        setSaved(undefined)
        event.currentTarget
          .querySelector<HTMLElement>(
            'input:invalid, textarea:invalid, select:invalid',
          )
          ?.focus()
        return
      }
      const data = new FormData(event.currentTarget)
      setSaved(
        `${data.get('name')} · ${status()} · ${team()?.label ?? 'No team'} · ${selectedTags().length} tags · ${files().length} attachments`,
      )
    },
    input(event) {
      const input = event.target
      if (input instanceof HTMLInputElement && input.name)
        setErrors((previous) => ({
          ...previous,
          [input.name]: input.validity.valid
            ? ''
            : (previous[input.name] ?? ''),
        }))
      setSaved(undefined)
    },
  })
  return (
    <form
      class="example-stack everything-form"
      aria-label="Everything form"
      novalidate
      ref={[
        (node) => {
          form = node
        },
        events,
      ]}
    >
      <header class="example-stack">
        <h1>Everything form</h1>
        <p>
          Review the controls together. This example keeps all changes in your
          browser.
        </p>
      </header>
      <FieldGroup
        title="Identity"
        help="Text, email, telephone, and URL fields. Name and email are required."
      >
        <For each={identity}>
          {(field) => (
            <Field
              required={field.required}
              invalid={Boolean(errors()[field.name])}
            >
              <Label>{field.label}</Label>
              <Input name={field.name} type={field.type} defaultValue="" />
              <FieldError>{errors()[field.name]}</FieldError>
            </Field>
          )}
        </For>
      </FieldGroup>
      <FieldGroup title="Classification">
        <Field>
          <Label>Status</Label>
          <SelectField
            label="Status"
            name="status"
            value={status()}
            onValueChange={setStatus}
            choices={[
              { value: 'draft', label: 'Draft' },
              { value: 'active', label: 'Active' },
              { value: 'archived', label: 'Archived' },
            ]}
          />
        </Field>
        <Combobox
          options={teams}
          defaultValue={teams[0]}
          value={team()}
          onChange={setTeam}
          optionValue="id"
          optionTextValue="label"
          optionLabel="label"
          itemComponent={(props) => (
            <Combobox.Item item={props.item}>
              <Combobox.ItemLabel>
                {props.item.rawValue.label}
              </Combobox.ItemLabel>
              <Combobox.ItemIndicator />
            </Combobox.Item>
          )}
        >
          <Combobox.Label>Responsible team</Combobox.Label>
          <Combobox.Control>
            <Combobox.Input />
            <Combobox.Trigger aria-label="Show teams">
              <Combobox.Icon />
            </Combobox.Trigger>
          </Combobox.Control>
          <Combobox.Description>Type to find a team.</Combobox.Description>
          <Combobox.Portal>
            <Combobox.Content>
              <Combobox.Listbox />
            </Combobox.Content>
          </Combobox.Portal>
        </Combobox>
        <Select<Choice>
          multiple
          options={tags}
          defaultValue={[tags[0]!]}
          value={selectedTags()}
          onChange={(next) => setSelectedTags(next)}
          optionValue="id"
          optionTextValue="label"
          itemComponent={(props) => (
            <Select.Item item={props.item}>
              <Select.ItemLabel>{props.item.rawValue.label}</Select.ItemLabel>
              <Select.ItemIndicator />
            </Select.Item>
          )}
        >
          <Select.Label>Tags</Select.Label>
          <Select.Trigger>
            <Select.Value<Choice>>
              {(state) =>
                state
                  .selectedOptions()
                  .map((option) => option.label)
                  .join(', ') || 'Choose tags'
              }
            </Select.Value>
          </Select.Trigger>
          <Select.Description>Select more than one tag.</Select.Description>
          <Select.Portal>
            <Select.Content>
              <Select.Listbox />
            </Select.Content>
          </Select.Portal>
        </Select>
      </FieldGroup>
      <FieldGroup title="Schedule">
        <Field>
          <Label>Start date</Label>
          <DatePicker
            label="Start date"
            value={start()}
            onValueChange={setStart}
            dateFormat="yyyy-MM-dd"
          />
        </Field>
        <Field>
          <Label>End date</Label>
          <DatePicker
            label="End date"
            value={end()}
            onValueChange={setEnd}
            dateFormat="yyyy-MM-dd"
          />
          <HelpText>Optional.</HelpText>
        </Field>
        <Field>
          <Label>Appointment</Label>
          <DateTimePicker
            label="Appointment"
            value={appointment()}
            onValueChange={setAppointment}
            timeZone="UTC"
            dateFormat="yyyy-MM-dd"
          />
          <HelpText>Displayed in UTC.</HelpText>
        </Field>
      </FieldGroup>
      <FieldGroup title="Amounts">
        <Field>
          <Label>Quantity</Label>
          <NumberInput
            name="quantity"
            value={quantity()}
            onValueChange={setQuantity}
            min={0}
          />
        </Field>
        <Field>
          <Label>Budget</Label>
          <NumberInput
            name="budget"
            value={budget()}
            onValueChange={setBudget}
            min={0}
          />
          <HelpText>Decimal values are allowed.</HelpText>
        </Field>
        <Field>
          <Label>Discount percent</Label>
          <NumberInput
            name="discount"
            value={discount()}
            onValueChange={setDiscount}
            min={0}
            max={100}
          />
        </Field>
      </FieldGroup>
      <FieldGroup title="Preferences">
        <Checkbox checked={notify()} defaultChecked onChange={setNotify}>
          <Checkbox.Input />
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Label>Send notifications</Checkbox.Label>
          <Checkbox.Description>
            Receive an update when the record changes.
          </Checkbox.Description>
        </Checkbox>
        <Switch checked={active()} defaultChecked onChange={setActive}>
          <Switch.Input />
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Switch.Label>Active</Switch.Label>
        </Switch>
        <RadioGroup
          value={delivery()}
          defaultValue="standard"
          onChange={setDelivery}
        >
          <RadioGroup.Label>Delivery</RadioGroup.Label>
          <For each={['standard', 'express', 'collection']}>
            {(value) => (
              <RadioGroup.Item value={value}>
                <RadioGroup.ItemInput />
                <RadioGroup.ItemControl>
                  <RadioGroup.ItemIndicator />
                </RadioGroup.ItemControl>
                <RadioGroup.ItemLabel>{value}</RadioGroup.ItemLabel>
              </RadioGroup.Item>
            )}
          </For>
        </RadioGroup>
      </FieldGroup>
      <FieldGroup title="Notes and attachments">
        <Field>
          <Label>Notes</Label>
          <Textarea name="notes" rows={5} />
          <HelpText>Prose keeps its original capitalization.</HelpText>
        </Field>
        <Field>
          <Label>Attachments</Label>
          <FileInput
            label="Attachments"
            files={files()}
            multiple
            onFilesChange={setFiles}
          />
          <HelpText>Files stay in this browser. Nothing is uploaded.</HelpText>
        </Field>
      </FieldGroup>
      <FieldGroup title="Read only and unavailable fields">
        <Field readonly>
          <Label>Reference</Label>
          <Input value="REC-0042" />
        </Field>
        <Field readonly>
          <Label>Recorded date</Label>
          <FieldValue
            value="2026-10-19"
            format="date"
            dateFormat="yyyy-MM-dd"
          />
        </Field>
        <Field disabled>
          <Label>External identifier</Label>
          <Input value="Not assigned" />
          <HelpText>This field is unavailable in the example.</HelpText>
        </Field>
      </FieldGroup>
      <div class="example-actions">
        <Button type="submit">Save example</Button>
        <Button onClick={reset}>Reset example</Button>
      </div>
      <Show when={invalid()}>
        <p role="alert">Review the highlighted fields.</p>
      </Show>
      <Show when={saved()}>
        <output aria-label="Saved example" role="status">
          {saved()}
        </output>
      </Show>
    </form>
  )
}
