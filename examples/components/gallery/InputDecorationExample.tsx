import { MatchingCombobox } from '../../shared/controls/MatchingCombobox'
import { createSignal } from 'solid-js'
import {
  Button,
  Checkbox,
  DatePicker,
  DateTimePicker,
  Field,
  FieldGroup,
  FileInput,
  Input,
  Label,
  NumberInput,
  RadioGroup,
  SelectField,
  Switch,
  Textarea,
} from '@wfe/components'
import type { ControlDecoration } from '@wfe/components'

export function InputDecorationExample() {
  const [decoration, setDecoration] = createSignal<ControlDecoration>('neutral')
  const [section, setSection] = createSignal<ControlDecoration>('primary')
  const [sectionHover, setSectionHover] = createSignal(true)
  const [sectionFocus, setSectionFocus] = createSignal(true)
  const [sectionDisabled, setSectionDisabled] = createSignal(false)
  const [name, setName] = createSignal('Example')
  const [notes, setNotes] = createSignal('Editable notes')
  const [plain, setPlain] = createSignal('Per-input override')
  const [compact, setCompact] = createSignal('Custom outer width')
  const [checked, setChecked] = createSignal(false)
  const [enabled, setEnabled] = createSignal(false)
  const [choice, setChoice] = createSignal('one')
  const [number, setNumber] = createSignal<number | undefined>(12)
  const [date, setDate] = createSignal<string>()
  const [instant, setInstant] = createSignal<string>()
  const [files, setFiles] = createSignal<readonly File[]>([])
  const [result, setResult] = createSignal('No submission yet.')
  const choices = [
    { value: 'one', label: 'One' },
    { value: 'two', label: 'Two' },
  ]
  return (
    <div class="example-stack">
      <FieldGroup title="Decoration">
        <SelectField
          label="Input decoration"
          value={decoration() || 'none'}
          choices={[
            { value: 'none', label: 'None' },
            { value: 'neutral', label: 'Neutral' },
            { value: 'primary', label: 'Primary' },
            { value: 'secondary', label: 'Secondary' },
          ]}
          onValueChange={(value) =>
            setDecoration(
              value === 'none' ? false : (value as ControlDecoration),
            )
          }
        />
        <SelectField
          label="Section decoration"
          value={section() || 'none'}
          choices={[
            { value: 'none', label: 'None' },
            { value: 'neutral', label: 'Neutral' },
            { value: 'primary', label: 'Primary' },
            { value: 'secondary', label: 'Secondary' },
          ]}
          onValueChange={(value) =>
            setSection(value === 'none' ? false : (value as ControlDecoration))
          }
        />
        <Checkbox checked={sectionHover()} onChange={setSectionHover}>
          <Checkbox.Input />
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Label>Section hover</Checkbox.Label>
        </Checkbox>
        <Checkbox checked={sectionFocus()} onChange={setSectionFocus}>
          <Checkbox.Input />
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Label>Section focus inside</Checkbox.Label>
        </Checkbox>
        <Checkbox checked={sectionDisabled()} onChange={setSectionDisabled}>
          <Checkbox.Input />
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Label>Disable section</Checkbox.Label>
        </Checkbox>
      </FieldGroup>
      <FieldGroup
        title="Inputs"
        decoration={section()}
        decorationHover={sectionHover()}
        decorationFocusWithin={sectionFocus()}
        disabled={sectionDisabled()}
      >
        <form
          class="example-stack"
          onSubmit={(event) => {
            event.preventDefault()
            setResult(`Saved ${new FormData(event.currentTarget).get('name')}.`)
          }}
        >
          <Field decoration={decoration()}>
            <Label>Name</Label>
            <Input
              name="name"
              required
              value={name()}
              onValueChange={setName}
            />
          </Field>
          <Field decoration={decoration()}>
            <Label>Notes</Label>
            <Textarea value={notes()} onValueChange={setNotes} />
          </Field>
          <Field decoration={decoration()}>
            <Label>Quantity</Label>
            <NumberInput value={number()} onValueChange={setNumber} />
          </Field>
          <Checkbox
            decoration={decoration()}
            checked={checked()}
            onChange={setChecked}
          >
            <Checkbox.Input />
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Checkbox.Label>Accept</Checkbox.Label>
          </Checkbox>
          <Switch
            decoration={decoration()}
            checked={enabled()}
            onChange={setEnabled}
          >
            <Switch.Input />
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            <Switch.Label>Enabled</Switch.Label>
          </Switch>
          <RadioGroup
            decoration={decoration()}
            value={choice()}
            onChange={setChoice}
          >
            <RadioGroup.Label>Choice</RadioGroup.Label>
            <RadioGroup.Item value="one">
              <RadioGroup.ItemInput />
              <RadioGroup.ItemControl>
                <RadioGroup.ItemIndicator />
              </RadioGroup.ItemControl>
              <RadioGroup.ItemLabel>One</RadioGroup.ItemLabel>
            </RadioGroup.Item>
            <RadioGroup.Item value="two">
              <RadioGroup.ItemInput />
              <RadioGroup.ItemControl>
                <RadioGroup.ItemIndicator />
              </RadioGroup.ItemControl>
              <RadioGroup.ItemLabel>Two</RadioGroup.ItemLabel>
            </RadioGroup.Item>
          </RadioGroup>
          <SelectField
            decoration={decoration()}
            label="Selected value"
            choices={choices}
            value={choice()}
            onValueChange={setChoice}
          />
          <MatchingCombobox
            mode="startsWith"
            decoration={decoration()}
            nativeInput
          />
          <DatePicker
            decoration={decoration()}
            label="Date"
            value={date()}
            onValueChange={setDate}
          />
          <DateTimePicker
            decoration={decoration()}
            label="Date and time"
            value={instant()}
            onValueChange={setInstant}
            timeZone="UTC"
          />
          <FileInput
            decoration={decoration()}
            label="Attachments"
            files={files()}
            onFilesChange={setFiles}
          />
          <Field decoration={decoration()}>
            <Label>Disabled</Label>
            <Input disabled value="Unavailable" />
          </Field>
          <Field decoration={decoration()}>
            <Label>Read only</Label>
            <Input readonly value="Read only value" />
          </Field>
          <Field decoration={decoration()}>
            <Label>Always undecorated</Label>
            <Input
              decoration={false}
              value={plain()}
              onValueChange={setPlain}
            />
          </Field>
          <Field decoration={decoration()}>
            <Label>Compact input</Label>
            <Input
              frameStyle={{ width: '12rem', 'max-width': '100%' }}
              value={compact()}
              onValueChange={setCompact}
            />
          </Field>
          <Button type="submit">Save</Button>
          <output role="status" aria-label="Submission result">
            {result()}
          </output>
        </form>
      </FieldGroup>
    </div>
  )
}
