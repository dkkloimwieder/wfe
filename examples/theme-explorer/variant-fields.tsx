import { For } from 'solid-js'
import { NativeSelectVariant } from './NativeSelectVariant'
import type { ColorRole } from '@wfe/components/theme'
import type { JSX } from '@solidjs/web'
import {
  Calendar,
  Checkbox,
  ColorPicker,
  Combobox,
  DatePicker,
  DateRangePicker,
  DateTimePicker,
  Field,
  FieldError,
  FileInput,
  InputGroup,
  Button,
  HelpText,
  Input,
  Label,
  NumberInput,
  RadioGroup,
  RangeCalendar,
  RangeSlider,
  Select,
  SelectField,
  Slider,
  Switch,
  Textarea,
  TimePicker,
} from '@wfe/components'
import {
  actionStates,
  editingStates,
  roleSpecimens,
  specimen,
  stateProps,
  type State,
} from './variant-types'

const noop = () => {}
const date = '2026-11-17'
const range = { start: date, end: '2026-11-21' }
type Choice = { value: string; label: string; disabled?: boolean }
const choices: Choice[] = [
  { value: 'alpha', label: 'Alpha' },
  { value: 'beta', label: 'Beta' },
  { value: 'gamma', label: 'Gamma', disabled: true },
]
const help = 'Use a sample value.'
const error = 'Review this value.'

export function LabeledField(props: {
  label: string
  state: State
  children: JSX.Element
}) {
  return (
    <Field {...stateProps(props.state)}>
      <Label>{props.label}</Label>
      {props.children}
      <HelpText>{help}</HelpText>
      <FieldError>{error}</FieldError>
    </Field>
  )
}

function SelectSample(props: {
  state: State
  multiple?: boolean
  items?: boolean
  decoration?: ColorRole
}) {
  const open = () => props.items || props.state === 'open'
  const selected = () => props.state === 'selected' || (!props.items && open())
  const options = () => sampleOptions(props.items, props.state)
  return (
    <Select<Choice>
      {...stateProps(props.items ? 'rest' : props.state)}
      options={options()}
      optionValue="value"
      optionTextValue="label"
      optionDisabled="disabled"
      {...(props.multiple
        ? { multiple: true, value: selected() ? options().slice(0, 2) : [] }
        : { multiple: false, value: selected() ? options()[0]! : null })}
      placeholder="Choose a team"
      open={open()}
      modal={false}
      itemComponent={(item) => (
        <Select.Item item={item.item}>
          <Select.ItemLabel>{item.item.rawValue.label}</Select.ItemLabel>
          <Select.ItemIndicator />
        </Select.Item>
      )}
    >
      <Select.Label>Team</Select.Label>
      <Select.Trigger decoration={props.decoration}>
        <Select.Value<(typeof choices)[number]>>
          {(value) =>
            value
              .selectedOptions()
              .map((choice) => choice.label)
              .join(', ')
          }
        </Select.Value>
      </Select.Trigger>
      <Select.Description>{help}</Select.Description>
      <Select.ErrorMessage>{error}</Select.ErrorMessage>
      <Select.Portal>
        <Select.Content>
          <Select.Listbox />
        </Select.Content>
      </Select.Portal>
    </Select>
  )
}

function sampleOptions(items: boolean | undefined, state: State) {
  return items && state === 'disabled'
    ? [{ ...choices[0]!, disabled: true }, ...choices.slice(1)]
    : choices
}

function ComboboxSample(props: {
  state: State
  multiple?: boolean
  items?: boolean
  decoration?: ColorRole
}) {
  const open = () => props.items || props.state === 'open'
  const selected = () => props.state === 'selected' || (!props.items && open())
  const options = () => sampleOptions(props.items, props.state)
  return (
    <Combobox<Choice>
      defaultFilter={() => true}
      {...stateProps(props.items ? 'rest' : props.state)}
      options={options()}
      optionValue="value"
      optionTextValue="label"
      optionDisabled="disabled"
      {...(props.multiple
        ? { multiple: true, value: selected() ? options().slice(0, 2) : [] }
        : { multiple: false, value: selected() ? options()[0]! : null })}
      open={open()}
      modal={false}
      itemComponent={(item) => (
        <Combobox.Item item={item.item}>
          <Combobox.ItemLabel>{item.item.rawValue.label}</Combobox.ItemLabel>
          <Combobox.ItemIndicator />
        </Combobox.Item>
      )}
    >
      <Combobox.Label>Team</Combobox.Label>
      <Combobox.Control<(typeof choices)[number]> decoration={props.decoration}>
        {(value) => (
          <>
            {props.multiple
              ? value
                  .selectedOptions()
                  .map((choice) => choice.label)
                  .join(', ')
              : null}
            <Combobox.Input placeholder="Find a team" />
            <Combobox.Trigger aria-label="Show teams">
              <Combobox.Icon />
            </Combobox.Trigger>
          </>
        )}
      </Combobox.Control>
      <Combobox.Description>{help}</Combobox.Description>
      <Combobox.ErrorMessage>{error}</Combobox.ErrorMessage>
      <Combobox.Portal>
        <Combobox.Content>
          <Combobox.Listbox />
        </Combobox.Content>
      </Combobox.Portal>
    </Combobox>
  )
}

const selectField = (state: State, decoration?: ColorRole) => (
  <LabeledField label="Team" state={state}>
    <SelectField
      decoration={decoration}
      {...stateProps(state)}
      label="Team"
      choices={choices}
      value={state === 'selected' || state === 'open' ? 'alpha' : undefined}
      placeholder="Choose a team"
      onValueChange={noop}
    />
  </LabeledField>
)

const datePicker = (
  state: State,
  withValue = false,
  decoration?: ColorRole,
) => (
  <LabeledField label="Start date" state={state}>
    <DatePicker
      decoration={decoration}
      {...stateProps(state)}
      label="Start date"
      value={
        withValue || state === 'selected' || state === 'open' ? date : undefined
      }
      initialMonth={date}
      dateFormat="yyyy-MM-dd"
      onValueChange={noop}
    />
  </LabeledField>
)

const dateRangePicker = (state: State) => (
  <LabeledField label="Date range" state={state}>
    <DateRangePicker
      {...stateProps(state)}
      label="Date range"
      value={state === 'selected' || state === 'open' ? range : undefined}
      initialMonth={date}
      onValueChange={noop}
    />
  </LabeledField>
)

const dateTimePicker = (
  state: State,
  timeView: 'columns' | 'clock',
  decoration?: ColorRole,
) => (
  <LabeledField label="Appointment" state={state}>
    <DateTimePicker
      decoration={decoration}
      {...stateProps(state)}
      label="Appointment"
      value={
        state === 'selected' || state === 'open'
          ? '2026-11-17T14:30:00Z'
          : undefined
      }
      timeZone="UTC"
      timeView={timeView}
      dateFormat="yyyy-MM-dd"
      onValueChange={noop}
    />
  </LabeledField>
)

const timePicker = (
  state: State,
  timeView: 'columns' | 'clock',
  decoration?: ColorRole,
) => (
  <LabeledField label="Start time" state={state}>
    <TimePicker
      decoration={decoration}
      {...stateProps(state)}
      label="Start time"
      value={state === 'selected' || state === 'open' ? '14:30' : undefined}
      timeView={timeView}
      onValueChange={noop}
    />
  </LabeledField>
)

const colorPicker = (state: State, decoration?: ColorRole) => (
  <LabeledField label="Marker color" state={state}>
    <ColorPicker
      decoration={decoration}
      {...stateProps(state)}
      label="Marker color"
      value="#4176ad"
      onValueChange={noop}
    />
  </LabeledField>
)

const choicesStates = [...editingStates, 'selected'] as const
const popupTrigger = 'button[aria-haspopup]'
const popupLayout = { openTrigger: popupTrigger }

function decorationSpecimens(
  id: string,
  label: string,
  render: (role: ColorRole) => JSX.Element,
) {
  return roleSpecimens(`${id}/decoration`, `${label} decoration`, render, [
    'hover',
  ])
}

const fieldRoleSpecimens = [
  ...decorationSpecimens('field', 'Field', (decoration) => (
    <Field decoration={decoration}>
      <Label>Name</Label>
      <Input value="Sample record" />
    </Field>
  )),
  ...decorationSpecimens('input', 'Input', (decoration) => (
    <Input aria-label="Name" value="Sample record" decoration={decoration} />
  )),
  ...decorationSpecimens('number-input', 'NumberInput', (decoration) => (
    <NumberInput
      aria-label="Quantity"
      value={12}
      onValueChange={noop}
      decoration={decoration}
    />
  )),
  ...decorationSpecimens('textarea', 'Textarea', (decoration) => (
    <Textarea
      aria-label="Notes"
      value="Sample record"
      rows={2}
      decoration={decoration}
    />
  )),
  ...decorationSpecimens('native-select', 'NativeSelect', (decoration) => (
    <NativeSelectVariant
      choices={choices}
      selected={false}
      decoration={decoration}
    />
  )),
  ...decorationSpecimens('select', 'Select.Trigger', (decoration) => (
    <SelectSample state="rest" decoration={decoration} />
  )),
  ...decorationSpecimens('select-field', 'SelectField', (decoration) =>
    selectField('rest', decoration),
  ),
  ...decorationSpecimens('combobox', 'Combobox.Control', (decoration) => (
    <ComboboxSample state="rest" decoration={decoration} />
  )),
  ...decorationSpecimens('checkbox', 'Checkbox', (decoration) => (
    <Checkbox decoration={decoration}>
      <Checkbox.Input />
      <Checkbox.Control>
        <Checkbox.Indicator />
      </Checkbox.Control>
      <Checkbox.Label>Notify me</Checkbox.Label>
    </Checkbox>
  )),
  ...decorationSpecimens('radio-group', 'RadioGroup', (decoration) => (
    <RadioGroup decoration={decoration}>
      <RadioGroup.Label>Delivery</RadioGroup.Label>
      <RadioGroup.Item value="email">
        <RadioGroup.ItemInput />
        <RadioGroup.ItemControl>
          <RadioGroup.ItemIndicator />
        </RadioGroup.ItemControl>
        <RadioGroup.ItemLabel>Email</RadioGroup.ItemLabel>
      </RadioGroup.Item>
    </RadioGroup>
  )),
  ...decorationSpecimens('switch', 'Switch', (decoration) => (
    <Switch decoration={decoration}>
      <Switch.Input />
      <Switch.Control>
        <Switch.Thumb />
      </Switch.Control>
      <Switch.Label>Auto-save</Switch.Label>
    </Switch>
  )),
  ...decorationSpecimens('slider', 'Slider', (decoration) => (
    <Slider
      aria-label="Amount"
      value={40}
      onValueChange={noop}
      decoration={decoration}
    />
  )),
  ...decorationSpecimens('range-slider', 'RangeSlider', (decoration) => (
    <RangeSlider
      aria-label="Amounts"
      value={[30, 70]}
      thumbLabels={['Minimum', 'Maximum']}
      onValueChange={noop}
      decoration={decoration}
    />
  )),
  ...decorationSpecimens('date-picker', 'DatePicker', (decoration) =>
    datePicker('rest', true, decoration),
  ),
  ...decorationSpecimens('date-time-picker', 'DateTimePicker', (decoration) =>
    dateTimePicker('rest', 'columns', decoration),
  ),
  ...decorationSpecimens('time-picker', 'TimePicker', (decoration) =>
    timePicker('rest', 'columns', decoration),
  ),
  ...decorationSpecimens('color-picker', 'ColorPicker', (decoration) =>
    colorPicker('rest', decoration),
  ),
  ...decorationSpecimens('file-input', 'FileInput', (decoration) => (
    <FileInput
      label="Attachments"
      files={[]}
      onFilesChange={noop}
      decoration={decoration}
    />
  )),
  ...decorationSpecimens('input-group', 'InputGroup', (decoration) => (
    <InputGroup decoration={decoration}>
      <Input aria-label="Search" value="Sample record" />
      <Button>Go</Button>
    </InputGroup>
  )),
]

export const fieldSpecimens = [
  specimen('input/text', 'Input / text', editingStates, (state) => (
    <LabeledField label="Name" state={state}>
      <Input value="Sample record" onValueChange={noop} />
    </LabeledField>
  )),
  specimen('number-input/default', 'NumberInput', editingStates, (state) => (
    <LabeledField label="Quantity" state={state}>
      <NumberInput value={12} min={0} max={24} onValueChange={noop} />
    </LabeledField>
  )),
  specimen('textarea/default', 'Textarea', editingStates, (state) => (
    <LabeledField label="Notes" state={state}>
      <Textarea value="Sample notes" rows={2} onValueChange={noop} />
    </LabeledField>
  )),
  specimen(
    'native-select/single',
    'NativeSelect / single',
    choicesStates,
    (state) => (
      <LabeledField label="Team" state={state}>
        <NativeSelectVariant
          choices={choices}
          selected={state === 'selected'}
        />
      </LabeledField>
    ),
  ),
  specimen(
    'native-select/multiple',
    'NativeSelect / multiple',
    choicesStates,
    (state) => (
      <LabeledField label="Teams" state={state}>
        <NativeSelectVariant
          choices={choices}
          selected={state === 'selected'}
          multiple
        />
      </LabeledField>
    ),
  ),
  specimen(
    'select-field/single',
    'SelectField / single',
    choicesStates,
    selectField,
  ),
  specimen('select-field/popup', 'SelectField / popup', ['open'], selectField, {
    ...popupLayout,
    baseline: 'select-field/single',
  }),
  ...([false, true] as const).flatMap((multiple) => {
    const variant = multiple ? 'multiple' : 'single'
    return [
      specimen(
        `select/${variant}`,
        `Select / ${variant}`,
        choicesStates,
        (state) => <SelectSample state={state} multiple={multiple} />,
      ),
      specimen(
        `select/${variant}-popup`,
        `Select / ${variant} popup`,
        ['open'],
        (state) => <SelectSample state={state} multiple={multiple} />,
        { baseline: `select/${variant}` },
      ),
      specimen(
        `select/${variant}-items`,
        `Select / ${variant} options`,
        [...actionStates, 'selected'],
        (state) => <SelectSample state={state} multiple={multiple} items />,
      ),
      specimen(
        `combobox/${variant}`,
        `Combobox / ${variant}`,
        choicesStates,
        (state) => <ComboboxSample state={state} multiple={multiple} />,
      ),
      specimen(
        `combobox/${variant}-popup`,
        `Combobox / ${variant} popup`,
        ['open'],
        (state) => <ComboboxSample state={state} multiple={multiple} />,
        { baseline: `combobox/${variant}` },
      ),
      specimen(
        `combobox/${variant}-items`,
        `Combobox / ${variant} options`,
        [...actionStates, 'selected'],
        (state) => <ComboboxSample state={state} multiple={multiple} items />,
      ),
    ]
  }),
  specimen(
    'checkbox/default',
    'Checkbox',
    [...editingStates, 'checked', 'mixed'],
    (state) => (
      <Checkbox
        {...stateProps(state)}
        checked={state === 'checked'}
        indeterminate={state === 'mixed'}
      >
        <Checkbox.Input />
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        <Checkbox.Label>Notify me</Checkbox.Label>
        <Checkbox.Description>{help}</Checkbox.Description>
        <Checkbox.ErrorMessage>{error}</Checkbox.ErrorMessage>
      </Checkbox>
    ),
  ),
  specimen('radio-group/default', 'RadioGroup', choicesStates, (state) => (
    <RadioGroup
      {...stateProps(state)}
      value={state === 'selected' ? 'email' : ''}
    >
      <RadioGroup.Label>Delivery</RadioGroup.Label>
      <For each={['Email', 'Post']}>
        {(label) => (
          <RadioGroup.Item value={label.toLowerCase()}>
            <RadioGroup.ItemInput />
            <RadioGroup.ItemControl>
              <RadioGroup.ItemIndicator />
            </RadioGroup.ItemControl>
            <RadioGroup.ItemLabel>{label}</RadioGroup.ItemLabel>
          </RadioGroup.Item>
        )}
      </For>
      <RadioGroup.Description>{help}</RadioGroup.Description>
      <RadioGroup.ErrorMessage>{error}</RadioGroup.ErrorMessage>
    </RadioGroup>
  )),
  specimen(
    'switch/default',
    'Switch',
    [...editingStates, 'checked'],
    (state) => (
      <Switch {...stateProps(state)} checked={state === 'checked'}>
        <Switch.Input />
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
        <Switch.Label>Auto-save</Switch.Label>
        <Switch.Description>{help}</Switch.Description>
        <Switch.ErrorMessage>{error}</Switch.ErrorMessage>
      </Switch>
    ),
  ),
  ...(['horizontal', 'vertical'] as const).flatMap((orientation) => [
    specimen(
      `slider/${orientation}`,
      `Slider / ${orientation}`,
      editingStates,
      (state) => (
        <LabeledField label="Amount" state={state}>
          <Slider
            aria-label="Amount"
            orientation={orientation}
            value={40}
            onValueChange={noop}
          />
        </LabeledField>
      ),
    ),
    specimen(
      `range-slider/${orientation}`,
      `RangeSlider / ${orientation}`,
      editingStates,
      (state) => (
        <LabeledField label="Amounts" state={state}>
          <RangeSlider
            aria-label="Amounts"
            orientation={orientation}
            value={[30, 70]}
            thumbLabels={['Minimum', 'Maximum']}
            onValueChange={noop}
          />
        </LabeledField>
      ),
    ),
  ]),
  specimen('date-picker/default', 'DatePicker', choicesStates, datePicker),
  specimen(
    'date-picker/adornments',
    'DatePicker / available clear and calendar buttons',
    editingStates,
    (state) => datePicker(state, true),
  ),
  specimen('date-picker/popup', 'DatePicker / popup', ['open'], datePicker, {
    ...popupLayout,
    baseline: 'date-picker/default',
  }),
  specimen(
    'date-range-picker/default',
    'DateRangePicker',
    choicesStates,
    dateRangePicker,
  ),
  specimen(
    'date-range-picker/popup',
    'DateRangePicker / popup',
    ['open'],
    dateRangePicker,
    { ...popupLayout, baseline: 'date-range-picker/default' },
  ),
  ...(['columns', 'clock'] as const).flatMap((view) => [
    specimen(
      `date-time-picker/${view}`,
      `DateTimePicker / ${view}`,
      choicesStates,
      (state) => dateTimePicker(state, view),
    ),
    specimen(
      `date-time-picker/${view}-popup`,
      `DateTimePicker / ${view} popup`,
      ['open'],
      (state) => dateTimePicker(state, view),
      { ...popupLayout, baseline: `date-time-picker/${view}` },
    ),
    specimen(
      `time-picker/${view}`,
      `TimePicker / ${view}`,
      choicesStates,
      (state) => timePicker(state, view),
    ),
    specimen(
      `time-picker/${view}-popup`,
      `TimePicker / ${view} popup`,
      ['open'],
      (state) => timePicker(state, view),
      { ...popupLayout, baseline: `time-picker/${view}` },
    ),
  ]),
  specimen(
    'calendar/single',
    'Calendar / single',
    [...actionStates, 'selected'],
    (state) => (
      <Calendar
        label="Start date"
        initialMonth={date}
        value={state === 'selected' ? date : undefined}
        disabled={state === 'disabled'}
        onValueChange={noop}
      />
    ),
  ),
  ...([1, 2, 3] as const).map((numberOfMonths) =>
    specimen(
      `range-calendar/${numberOfMonths}-month`,
      `RangeCalendar / ${numberOfMonths} month${numberOfMonths === 1 ? '' : 's'}`,
      [...actionStates, 'selected', 'read-only'],
      (state) => (
        <RangeCalendar
          label="Date range"
          initialMonth={date}
          value={state === 'selected' ? range : undefined}
          {...stateProps(state)}
          numberOfMonths={numberOfMonths}
          onValueChange={noop}
        />
      ),
    ),
  ),
  specimen('color-picker/hex', 'ColorPicker / hex', editingStates, colorPicker),
  specimen(
    'color-picker/popup',
    'ColorPicker / RGB popup',
    ['open'],
    colorPicker,
    { ...popupLayout, baseline: 'color-picker/hex' },
  ),
  ...(['single', 'multiple'] as const).map((kind) =>
    specimen(
      `file-input/${kind}`,
      `FileInput / ${kind}`,
      choicesStates,
      (state) => (
        <LabeledField label="Attachments" state={state}>
          <FileInput
            label="Attachments"
            multiple={kind === 'multiple'}
            files={
              state === 'selected'
                ? [new File(['sample'], 'notes.txt', { type: 'text/plain' })]
                : []
            }
            onFilesChange={noop}
          />
        </LabeledField>
      ),
    ),
  ),
  ...fieldRoleSpecimens,
]
