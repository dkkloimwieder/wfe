# Inputs

These controls accept numbers, dates, colors, files, and choices. Each section explains how the control handles values and sends change requests.

Contents

- [Numeric inputs](#numeric-inputs)
- [Date and time inputs](#date-and-time-inputs)
- [Calendar and date picker](#calendar-and-date-picker)
- [Calendar ranges](#calendar-ranges)
- [Color picker](#color-picker)
- [File selection](#file-selection)
- [Sliders and ranges](#sliders-and-ranges)
- [Toggles and groups](#toggles-and-groups)
- [Combobox matching](#combobox-matching)

## Numeric inputs

NumberInput edits a controlled number through the shared text input.

### Import

Import `NumberInput` and `NumberInputProps` from `@wfe/components/number-input` or the package root.

### Example

```tsx
import { createSignal } from 'solid-js'
import { Field, Label, NumberInput } from '@wfe/components'

export function NumericAmount() {
  const [amount, setAmount] = createSignal<number | undefined>(undefined)
  return (
    <Field>
      <Label>Amount</Label>
      <NumberInput name="amount" value={amount()} onValueChange={setAmount} />
    </Field>
  )
}
```

### Behavior and options

It accepts finite decimal numbers and exponent notation, such as `-0.5`, `.25`, and `1e-7`.
It rejects hexadecimal values, thousands separators, `NaN`, and `Infinity`.
Values use JavaScript number precision. The control does not provide exact decimal storage, currency formatting, or locale parsing.

The control keeps a local text draft. Incomplete text such as `-`, `1.`, or `1e-` stays visible and does not publish a value.
Complete accepted edits preserve their spelling while the input retains focus.
After focus leaves, a valid draft returns to the accepted value's standard spelling. This also restores a complete edit that the application rejects.
Temporary focus loss during a field or panel move preserves its text and selection.
Invalid drafts remain visible after blur. Escape restores the accepted value, and an external change to that value replaces the draft.
An unchanged accepted value preserves the draft through unrelated parent updates.

The change callback receives a finite number or `undefined`. Empty text requests `undefined` by default.
Set `allowEmpty={false}` to retain empty text as an intrinsic error, an error that prevents a numeric value from forming.
Optional finite `min` and `max` constraints also prevent publication outside their bounds. The control does not clamp or round values.
The control provides no increment buttons or step validation.

The component inherits shared Field labels, help, errors, disabled state, readonly state, and native required attributes.
Native required validation remains separate from intrinsic numeric errors.
The visible input uses a decimal keyboard hint. A named hidden input serializes the accepted value, including its external form association.
Invalid numeric text sets native custom validity and `data-ui-invalid-input` on the visible input.
The optional `onValidityChange` callback reports intrinsic validity, including its initial state. Disabled and readonly controls report true.
Normal parent updates do not emit value changes. Owned input listeners stop callbacks after disposal.

#### Generated fields

`FormView` supports `control: 'number'` for fields whose type contains the full `number` type.
A nonnullable number defaults to `empty: 'reject'`. Blank local text then blocks submission while the accepted value remains unchanged.
An optional field requires `empty: 'undefined'`. A nullable field requires `empty: 'null'`.
A field that permits both empty values can select either policy.
Numeric literal unions require a custom control because arbitrary numeric edits cannot fit a fixed set of values.

```tsx
import type { FormDescription } from '@wfe/generator'

type NumericValues = {
  count: number
  quantity: number | undefined
  declaredValue: number | null
}

export const numericDescription = {
  id: 'numeric-editor',
  fields: [
    { field: 'count', label: 'Count', control: 'number' },
    {
      field: 'quantity',
      label: 'Quantity',
      control: 'number',
      empty: 'undefined',
    },
    {
      field: 'declaredValue',
      label: 'Declared value',
      control: 'number',
      empty: 'null',
    },
  ],
} as const satisfies FormDescription<NumericValues>
```

During native submission, `FormView` focuses the first intrinsic error and prevents a request with an older accepted number.
It uses the shared input marker, including markers inside custom fields. Disabled fields, readonly fields, and inputs associated with another form do not block.
Ordinary required checks and business validation still belong to the application when `FormView` uses `novalidate`.
Calling the application coordinator directly uses accepted values and bypasses this view-level draft guard.
The form coordinator and its request behavior remain unchanged.

The records example keeps its custom Quantity field as a thin wrapper around `NumberInput` to demonstrate extension and cleanup.
The dispatch example uses a generated nullable number for Declared value.

#### UI messages

NumberInput accepts `messages?: Partial<NumberInputMessages>` for required, invalid, minimum, and maximum errors.
Import `NumberInputMessages` and the English `numberInputMessages` defaults from `@wfe/components`.
Minimum and maximum message callbacks receive the numeric limit.
Messages do not change the numeric parser, accepted values, hidden form value, or input format.
Changing messages retains incomplete drafts and focus, updates native validation text, and does not repeat an unchanged validity callback or request a new value.

Overrides update per property. Omitted properties use the English defaults.
Validation reasons are independent of translated text. An empty translated error retains native invalidity by falling back to the English error for native validation.
Use matching initial messages for server rendering and hydration. No translation service or application policy is added.

### Application ownership

Supply the accepted number or `undefined`. Choose bounds and empty-value policy. Own business validation, units, and persistence.

### Gallery

Open `?gallery=numbers` for numeric drafts and control states.

## Date and time inputs

The date and time controls edit a date, a time of day, or an instant.

### Import

Import `DatePicker`, `TimePicker`, `TimeClock`, and `DateTimePicker` from `@wfe/components`.

### Example

```jsx
import { createSignal } from 'solid-js'
import { TimePicker } from '@wfe/components'

export function StartTime() {
  const [time, setTime] = createSignal('09:00')
  return (
    <TimePicker
      label="Start time"
      value={time()}
      onValueChange={setTime}
      timeView="clock"
    />
  )
}
```

### Behavior and options

#### Date input

`DatePicker` edits a Gregorian calendar date.
Its controlled value is `YYYY-MM-DD` or `undefined` for an empty field.
The value has no timezone and does not represent an instant.

`dateFormat` controls display and typed input.
The default is `yyyy-MM-dd`.
Numeric patterns contain `yyyy`, `MM`, and `dd` once each, with optional literal separators.
Each numeric part uses its stated width.
For example, `dd/MM/yyyy` shows `17/10/2026`.
Named months and non-Gregorian input calendars are outside this grammar.

`dateFormat="locale"` uses the supplied locale's numeric date order and separators.
This input uses Gregorian dates and Latin digits.
If no locale is supplied for this format, the control uses `en-US` for deterministic rendering.
Applications can supply the user's locale explicitly.
Changing format or locale updates presentation without a value callback.

Valid complete input requests a canonical date through `onValueChange`.
Incomplete or invalid text remains a local draft and does not change the accepted value.
An empty input requests `undefined`.
Blur restores the accepted display after valid input that the parent rejects.
Escape restores the accepted display and clears the local input error.
Calendar selection follows the same controlled value.

`min`, `max`, and `isDateDisabled` constrain selectable and typed dates.
The application supplies these constraints.
The control also rejects impossible dates and years outside 0001 through 9999.

The picker inherits disabled, readonly, required, and invalid states from `Field`.
It uses the shared input's label, help, error, and control registration.
A picker inside `Field` uses the external label.
A standalone picker renders its own label.
The `id` prop supports standard label integration.
The `name` prop serializes one hidden accepted ISO value, including an empty string when cleared.
Readonly fields retain this value, and disabled fields omit it.
The visible formatted input is unnamed.
Intrinsic draft errors set native input validity and notify optional `onValidityChange`.
Application-supplied errors do not change this intrinsic validity.
Readonly inputs remain focusable, but typing, calendar selection, and clearing do not request changes.

#### Time input

`TimePicker` edits a time of day without a date or timezone.
Its controlled `value` is `HH:mm`, `HH:mm:ss`, or `undefined` for an empty field.
`onValueChange` requests a canonical 24-hour value or `undefined` when cleared.

`timeFormat` accepts `HH:mm`, `HH:mm:ss`, `hh:mm a`, or `hh:mm:ss a`.
The default is `HH:mm`.
The 12-hour formats use the supplied `locale` for AM and PM text.
The input uses Latin digits.
Changing format or locale updates the display without requesting a value change.
`min` and `max` accept canonical times and include both endpoints.

Users can type a time or open the popup to choose hours and minutes.
`timeView="columns"` is the default and shows scrollable time columns.
`timeView="clock"` shows an analog clock instead.
Formats with seconds also show a seconds choice.
The 12-hour formats add an AM or PM choice.
Incomplete or invalid input remains a local draft and leaves the accepted value unchanged.
Escape restores the accepted display.

The picker accepts `label`, `id`, `name`, and `decoration`.
It inherits disabled, readonly, required, and invalid states from `Field`.
A named picker submits the accepted canonical value through one hidden input.
Disabled controls omit that value, and readonly controls retain it.
Intrinsic draft errors block native form submission and notify `onValidityChange`.
`messages` accepts a partial `TimePickerMessages` catalog for control labels and errors.
`timePickerMessages` supplies the English defaults.

#### Standalone clock

`TimeClock` edits a `ClockValue` with numeric `hour`, `minute`, and `second` fields. It accepts `timeFormat`, `locale`, `label`, and partial `messages`. `disabled` and `readonly` stop requests. The owner applies bounds and accepts changes.

#### Datetime input

`DateTimePicker` edits an instant through one combined date and time text field.
Its popup contains the shared calendar and time selection controls.
Its controlled value requires an ISO timestamp with `Z` or an explicit offset.
For example, `2024-02-29T09:15:16.123-05:00` represents the same instant as `2024-02-29T14:15:16.123Z`.
The callback requests a normalized UTC ISO timestamp, or `undefined` when cleared.
Values support up to millisecond precision.

`timeZone` defaults to `browser`.
The browser zone resolves after the control mounts or attaches to server markup.
Before that step, the visible input stays empty and disabled.
The server never guesses the user's zone from its own host.
An explicit IANA zone, such as `America/New_York` or `UTC`, renders on the server and client.
The application supplies its system timezone through this prop.
Changing the timezone or display format does not request a value change.

`dateFormat` and `locale` follow the date-only input rules.
The input joins the formatted date and time with one space.
For example, `dd/MM/yyyy` with `HH:mm` displays `29/02/2024 14:15`.
`timeFormat` accepts `HH:mm`, `HH:mm:ss`, `hh:mm a`, or `hh:mm:ss a`.
The default is `HH:mm`.
The 12-hour formats use the supplied locale's AM and PM text.
All numeric input uses Latin digits.
Editing a format without seconds preserves accepted seconds and milliseconds.
Editing visible seconds preserves accepted milliseconds.

The control rejects nonexistent local times during daylight-saving changes.
It also rejects repeated local times by default.
`disambiguation="earlier"` or `disambiguation="later"` selects an occurrence of a repeated time.
These modes never shift a nonexistent time to another clock time.
An unchanged accepted instant in a repeated hour retains its known offset.
`min` and `max` constrain instants and require the same offset-bearing ISO grammar.

Complete valid typed input requests an instant immediately.
Invalid or incomplete date and time text remains local and blocks native form submission.
Escape restores the accepted display when the popup is closed.
A valid request that the parent rejects restores the accepted display when focus leaves the control.
Clearing the complete text requests `undefined`.
Removing only the time leaves an incomplete draft until the user completes or resets it.

`timeView="columns"` is the default.
It shows the calendar and scrollable time columns together in one popup.
`timeView="clock"` first shows the calendar, then an analog clock after the user chooses a date.
Calendar and time choices remain local until the user selects Apply date and time.
Apply requests one complete instant and closes the popup.
In clock mode, the upper-left back icon returns to the calendar and retains the pending selection.
The hour, minute, and optional second fields above the clock also accept typed values.
Blur or Escape in these fields restores invalid or rejected text to the current staged value.
Cancel closes the popup and discards the pending selection.
Escape elsewhere in the popup also closes it.
The input uses `label`. The popup time selection uses `timeLabel`.
The control inherits `Field` state and serializes one canonical named value.
Its `onValidityChange` callback reports only intrinsic input validity.

#### Generated forms

`FormView` accepts `control: 'date'`, `control: 'time'`, and `control: 'datetime'` for string fields.
All three controls use an empty string for an empty generated field.
The application maps other storage types through its adapter or a custom field binding.
Date descriptions accept `dateFormat`, `locale`, `min`, `max`, and `startOfWeek`.
`TimeControlDescription` accepts `timeFormat`, `timeView`, `locale`, `min`, and `max`.
Standalone time descriptions have no timezone.
Datetime descriptions also accept `timeFormat`, `timeView`, `timeZone`, and `disambiguation`.
These descriptions contain data, not application callbacks.

The generated view blocks its DOM submit action while an editable date or time control contains an invalid draft.
It focuses that control and does not call application validation or submission.
Readonly, disabled, and removed fields release this local block.
Application validation errors remain the application's responsibility and do not prevent a retry.
A direct application call to `form.submit()` still submits accepted values.
It does not inspect drafts in a rendered view.

The [date example](../examples/generator/DateApp.tsx) shows these controls with application-owned values and callbacks.

#### Read-only output

Use `ValueDisplay` or `formatDisplayValue` for table cells, details, and summaries.
They share the numeric date/time grammar used by these inputs.
Read-only datetime output defaults to UTC.
Pass the same explicit application zone when input and output must match.
The component also supports the browser timezone after hydration.
Read [shared value formatting](tables.md#shared-value-formatting) for formats, examples, and raw-value ownership.

#### Shared validation and formatting

Date-only Calendar and DatePicker bounds share an inclusive comparison after
parsing. Either bound can be omitted. Their Gregorian YYYY-MM-DD values do not depend on the browser time zone. Datetime
normalization and instant bounds remain separate, including era validation and
conversion to the selected display timezone.

Calendar labels use a bounded Intl formatter cache keyed by locale and configuration. Locale changes update labels and preserve date buttons and accepted selection.

### Application ownership

Supply the accepted value, format, locale, and bounds. For instants, choose the display time zone and the policy for repeated local hours. Own scheduling and storage rules.

### Gallery

Open `?gallery=dates` for the pickers and standalone clock.

## Calendar and date picker

Calendar and DatePicker let users select a date without a time zone.

### Import

Import `Calendar` and `DatePicker` from `@wfe/components`.

### Example

```jsx
import { createSignal } from 'solid-js'
import { DatePicker } from '@wfe/components'

export function DeliveryDate() {
  const [date, setDate] = createSignal('2026-03-12')
  return (
    <DatePicker label="Delivery date" value={date()} onValueChange={setDate} />
  )
}
```

### Behavior and options

#### Values

Pass a valid `YYYY-MM-DD` string through `value`.
Use `undefined` for an empty value.
Handle accepted changes through `onValueChange`.
The application owns the accepted value and its persistence.

The picker keeps invalid text visible and leaves the accepted value unchanged.
Escape restores the accepted text when the calendar is closed.
The clear button requests an empty value and focuses the input. Calendar selection requests a date and closes the popup. The trigger receives focus if the calendar still owns it.

#### Calendar behavior

Arrow keys move between days or weeks.
Home and End move to the first and last days of a week.
Page Up and Page Down move between months.
Shift with Page Up or Page Down moves between years.
Keyboard movement skips disabled dates and stops after a bounded search.

Use `min`, `max`, and `isDateDisabled` to restrict available dates.
Use `locale` for calendar labels and `startOfWeek` for the first weekday.
The standalone calendar also accepts `direction` for left-to-right or right-to-left navigation.

Provide `initialMonth` for a deterministic initial view of an empty standalone calendar.
The standalone calendar defaults to January 1970 when no initial date exists.
An empty picker opens at the current browser-local calendar date unless the application supplies `initialMonth`.
An accepted `value` takes precedence over both defaults.
This default does not convert stored `YYYY-MM-DD` values into instants or change date bounds.
It chooses that default on opening, so server and client markup stay consistent.

#### Table use

The date range filter composes two instances of the shared picker.
Start and End remain optional, independent boundaries.
The application supplies inclusive comparisons for those boundaries.
The Table controls do not define timezone or server query rules.

Click the calendar heading to choose a month and enter a year. Press Escape to return to the day grid without selecting a date.

#### UI messages

Calendar, DatePicker, TimePicker, and DateTimePicker accept a reactive partial `messages` object.
Their exported types are `CalendarMessages`, `DatePickerMessages`, `TimePickerMessages`, and `DateTimePickerMessages`.
The date-picker catalog includes the calendar keys.
The datetime catalog includes the date-picker and time-picker keys.
The exported `calendarMessages`, `datePickerMessages`, `timePickerMessages`, and `dateTimePickerMessages` provide English defaults.
Omitted keys fall back individually. Existing explicit `label`, `clearLabel`, and `timeLabel` props retain precedence where supported.

Messages cover navigation, keyboard help, calendar titles, clear actions, invalid input, the time label, and the pending browser-timezone notice.
Date pickers forward their messages to the nested calendar.
Time picker messages also cover the hour, minute, second, period, and apply controls.
The combined datetime picker uses `openDateTimePicker`, `dateTimePickerTitle`, `backToDate`, `cancelDateTime`, and `applyDateTime` for its popup.
Use `openDateTimePicker` for the datetime trigger. Use `openCalendar` for the date-only trigger.
Changing messages updates visible errors and native validation text without requesting a new value or repeating an unchanged validity callback.
Invalid drafts, focused controls, selected dates, and open calendars remain in place.
If an error translation is empty, native validation uses the default error.

Message language is separate from `locale`, `dateFormat`, `timeFormat`, and `timeZone`.
Month and weekday names, full-date accessible labels, and input patterns remain date formatting, controlled by those existing props.
The actual timezone identifier remains a value, not translated UI text.
Use the same initial messages on the server and client when hydrating. Language can change after hydration without remounting controls.

### Application ownership

Accept date requests and supply bounds, date availability, and storage rules. Own Table date comparisons and server query criteria.

### Gallery

Open `?gallery=dates` for the date picker. Open `?gallery=calendar-ranges` for inline calendars and ranges.

## Calendar ranges

RangeCalendar and DateRangePicker select a date-only start and optional end.

### Import

Import `RangeCalendar` and `DateRangePicker` from `@wfe/components/calendar` or the package root.

### Example

```jsx
import { createSignal } from 'solid-js'
import { DateRangePicker } from '@wfe/components/calendar'

export function DateFilter() {
  const [range, setRange] = createSignal(undefined)
  return (
    <DateRangePicker
      label="Travel dates"
      value={range()}
      onValueChange={setRange}
    />
  )
}
```

### Behavior and options

`CalendarRange` contains a date-only `start` and an optional `end`.
Values use `YYYY-MM-DD` within years 0001 through 9999.
A complete range has ordered endpoints.
The first selection proposes a start. The second proposes ordered endpoints.
A selection after a complete range proposes a new start.
Rejection preserves the accepted selection.

`numberOfMonths` accepts 1, 2, or 3. The range default is 2.
Multiple months omit duplicate outside-month buttons and share one day in the tab sequence.
Arrow keys navigate dates. Home and End navigate the week.
Page Up and Page Down navigate months. Shift changes that movement to years.
The existing month and year chooser remains available.
`locale`, `startOfWeek`, and `direction` retain their calendar behavior.
UI messages remain separate from date formatting locale.

`min`, `max`, and `isDateDisabled` block unavailable endpoint actions.
Readonly inline calendars allow navigation and preserve selection.
Disabled calendars block navigation and selection.

`DateRangePicker` places the same calendar inside the shared Popover.
Its `label` names the trigger. Shared Field and HelpText provide state and descriptions.
An accepted complete range closes the popup and returns owned focus.
Rejected proposals keep the accepted dates and the popup open.
Readonly pickers block opening. The clear button proposes `undefined`.

A picker `name` submits two endpoint strings under the same key.
A partial range submits an empty end string. Disabled pickers omit both values.

### Application ownership

Supply accepted endpoints and any date limits. Decide whether a range can contain unavailable days and whether a complete range is required.

### Gallery

Open `?gallery=calendar-ranges` for inline and popup selection, rejection, locale changes, and form values.

## Color picker

ColorPicker edits an opaque sRGB color through hex text and three color channels.

### Import

Import `ColorPicker` from `@wfe/components`.

### Example

```tsx
import { ColorPicker } from '@wfe/components'
import { createSignal } from 'solid-js'

export function ColorExample() {
  const [color, setColor] = createSignal('#3569c8')
  return <ColorPicker label="Color" value={color()} onValueChange={setColor} />
}
```

### Behavior and options

The current value must use six hex digits after `#`. Valid edits request a lowercase value through `onValueChange`. Incomplete text stays visible. The default validity message blocks native form submission until the text is valid. Escape restores the accepted color, and blur restores it after a rejected valid edit.

The swatch opens a popup with red, green, and blue sliders. `disabled` and `readonly` block edits. A surrounding Field can supply control state and label associations. A named hidden input submits the accepted color unless the control is disabled.

Use `decoration` for shared input decoration. Use `messages` for the popup title, opener, channel labels, and invalid-value text.

### Application ownership

Supply the accepted color and decide whether to accept each request. The application owns storage and color rules.

### Gallery

Open `?gallery=colors` for text entry and the channel popup.

## File selection

FileInput selects, drops, and lists local files.

### Import

Import `FileInput` and `FileInputProps` from `@wfe/components/file-input` or the package root.

### Example

```tsx
import { createSignal } from 'solid-js'
import { Field, Label, HelpText } from '@wfe/components'
import { FileInput, type FileInputProps } from '@wfe/components/file-input'

export function Attachments() {
  const [files, setFiles] = createSignal<readonly File[]>([])
  return (
    <Field controlId="attachments" required>
      <Label>Attachments</Label>
      <FileInput
        label="Attachments"
        files={files()}
        onFilesChange={setFiles}
        accept=".txt,image/*"
        maxFileSize={1024 * 1024}
        multiple
      />
      <HelpText>Text or image files, up to 1 MiB each.</HelpText>
    </Field>
  )
}

// @ts-expect-error Selected files use files, not a native value string.
const invalid: FileInputProps['value'] = 'file.txt'
void invalid
```

### Behavior and options

Supply `files` and `onFilesChange`. There is no internal selected-file array.
The callback requests a replacement array. The application can reject the request by retaining its current array.
Application prop changes do not emit selection requests.

The picker and file drops follow the same rules.
Single mode replaces the selection. A single-mode batch with multiple files rejects the whole batch.
Multiple mode appends accepted files in order. A mixed batch appends valid files and reports rejected candidates separately.

The component does not deduplicate files. Distinct files can share names and other metadata.
Removal targets a list entry. It does not remove every file with the same name.

#### Constraints and feedback

`accept` uses comma-separated extensions, MIME types, and MIME wildcards such as `image/*`.
Matching ignores case. Files without a MIME type can still match a filename extension.
`maxFileSize` is a nonnegative safe integer in bytes. Zero permits only empty files.
The component applies these constraints to selection requests and current canonical files.

`onFilesRejected` receives the rejected file objects and a `type`, `size`, or `multiple` reason.
Local feedback retains names and reasons, without retaining rejected file objects.
Rejected candidates do not invalidate an existing valid selection.
Required-empty feedback appears after a selection attempt or invalid submission. Invalid canonical files show feedback immediately.
These selection constraints do not replace application or server validation.

#### Fields, forms, and access

The component consumes Field labels, descriptions, disabled state, readonly state, required state, and invalid state.
`label` supplies the accessible group and picker name. The visible browse button uses shared Button styling.
`browseLabel` and `removeLabel` customize action text.

Drag event handlers target the drop container. Preventing the drop default cancels selection.
Other native input attributes and `ref` target the picker. `class` and `style` target the enclosing component.
Keyboard users activate the visible browse button with Enter or Space.
Rejected selections appear in a live status region. Filenames retain their original case.
Invalid submission moves focus to the visible browse button.

Readonly and disabled fields block selection and removal. Locked file drops stay within the field instead of navigating the browser.
Ordinary text dragging stays unaffected.

The native picker stays nameless and clears after each change, so the same file can be selected again.
Canceling the picker keeps the canonical selection.
Required validity follows the canonical array rather than the cleared native file list.

A native form reset requests an empty array. Canceled resets do not request changes, and applications can reject reset requests.
Files remain separate from `@wfe/form` scalar values and generator descriptions.
Server rendering supports an empty selection. Applications supply browser files after attachment.
The browser attaches picker and drop behavior to retained server fields during hydration.

The native behavior follows the [file input documentation](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/file) and [file drop API](https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/files).

#### UI messages

FileInput accepts `messages?: Partial<FileInputMessages>` for its owned actions, empty state, byte counts, required hint, and validation or rejection feedback.
Import `FileInputMessages` and the English `fileInputMessages` defaults from `@wfe/components`.
Explicit `label`, `aria-label`, `browseLabel`, and `removeLabel` props retain precedence for their existing targets.
Filenames remain file values. The `fileSize(bytes)` callback formats the size label.
Changing messages retains selected File objects, focused controls, and rejection reasons without issuing selection or rejection callbacks.

Overrides update per property. Omitted properties use the English defaults.
Validation reasons are independent of translated text. An empty translated error retains native invalidity by falling back to the English error for native validation.
Use matching initial messages for server rendering and hydration. No translation service or application policy is added.

### Application ownership

Supply the accepted files. Own file validation, uploads, progress, storage, and failure handling. Build FormData from the accepted files on submission.

### Gallery

Open `?gallery=files` for selection constraints, rejection feedback, and file removal.

## Sliders and ranges

Slider edits one number, and RangeSlider edits two ordered endpoints.

### Import

Import `Slider` and `RangeSlider` from `@wfe/components/slider` or the package root.

### Example

```jsx
import { createSignal } from 'solid-js'
import { RangeSlider } from '@wfe/components/slider'

export function PriceRange() {
  const [range, setRange] = createSignal([20, 70])
  return (
    <RangeSlider
      value={range()}
      onValueChange={setRange}
      thumbLabels={['Minimum price', 'Maximum price']}
    />
  )
}
```

### Behavior and options

`Slider` accepts a numeric `value` and an `onValueChange` callback.
`RangeSlider` accepts an ordered pair and two `thumbLabels`.
The callback proposes a value. The application decides whether to accept it.
Rejected proposals preserve the accepted value, focus, and thumb nodes.

The default bounds are 0 and 100. The default step is 1.
Bounds must be finite and increasing. The step must be positive and usable within those bounds.
The controls clamp and snap displayed values without emitting a change request.
Range thumbs keep their order and expose their current dependent limits.

Arrow keys change one step. Home and End move to the allowed limits.
Page Up and Page Down change ten steps.
`direction="rtl"` reverses horizontal navigation. `orientation="vertical"` changes the track orientation.
`getValueText` supplies an accessible description of a numeric value.

`Field`, `Label`, and `HelpText` provide shared naming and state.
Otherwise, provide `aria-label` or `aria-labelledby`.
Disabled sliders leave the tab sequence. Readonly sliders retain focus and expose their value.
A `name` adds hidden form inputs. Ranges submit two values under the same name.
Disabled sliders omit those values from submission.

`onValueCommit` reports an accepted change after pointer release, key release, or keyboard focus departure.
Rejected changes do not commit.
Pointer cancellation retains the last accepted value without a commit callback.
Escape during a drag requests the value from the start of that gesture.
The application can reject that request.
The control measures its track once per pointer gesture.

The implementation follows the [WAI slider pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/) and [multi-thumb pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider-multithumb/).
Touch assistive-technology acceptance requires a device review.

### Application ownership

Provide names, bounds, and accepted values. Decide whether to accept each request. Keep any storage or application rules outside the slider.

### Gallery

Open `?gallery=sliders` for rejected changes, form values, right-to-left navigation, and vertical sliders.

## Toggles and groups

Toggle controls one pressed state, and ToggleGroup controls a set of choices.

### Import

Import `Toggle` and `ToggleGroup` from `@wfe/components/toggle` or the package root.

### Example

```jsx
import { createSignal } from 'solid-js'
import { Toggle } from '@wfe/components/toggle'

export function PinAction() {
  const [pinned, setPinned] = createSignal(false)
  return (
    <Toggle pressed={pinned()} onPressedChange={setPinned}>
      Pin
    </Toggle>
  )
}
```

### Behavior and options

`Toggle` accepts `pressed` and `onPressedChange`.
The callback proposes the next state. The application decides whether to accept it.
The visible label stays the same in both states.
The pressed state uses the filled Button variant by default.
`variant` controls the unpressed appearance. `pressedVariant` controls the pressed appearance.

`ToggleGroup` accepts uniquely keyed `items` and a controlled `value`.
Single selection uses a string or `undefined`.
With `multiple`, the value is an array of strings.
`allowEmpty={false}` prevents removal of the final selected value.
Item values keep button nodes stable across record replacement and reordering.

Space and Enter activate the focused button.
Arrow keys, Home, and End move focus without selecting a value.
Disabled items leave that navigation sequence.
`orientation="vertical"` uses Up and Down. `direction="rtl"` reverses horizontal navigation.
`loop={false}` stops navigation at the ends.
Readonly buttons retain focus and expose an unavailable activation state.

A standalone toggle gets its accessible name from its children or `aria-label`.
Name a group with `aria-label`, `aria-labelledby`, or the shared Field and Label.
Provide an accessible name for each icon-only item.
A `name` adds hidden form values for accepted selections.
Disabled controls and disabled items omit their values from submission.
Readonly selections still submit their accepted values.

The implementation follows the [WAI toggle button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/).

### Application ownership

Supply labels, stable item IDs, and accepted state. Handle the effect of a selection and any persistence in the application.

### Gallery

Open `?gallery=toggles` for toolbar buttons, single and multiple choices, and rejected requests.

## Combobox matching

Combobox offers local text filtering or accepts results ranked by the application.

### Import

Import `Combobox` from `@wfe/components` and `matchSorter` from `@wfe/components/search`.

### Example

This fragment shows how to pass ranked results to the root. Use the [gallery recipe](../examples/components/gallery/MatchingChoices.tsx) for the input, option, and popup parts.

```tsx
import { createMemo, createSignal } from 'solid-js'
import { Combobox } from '@wfe/components'
import { matchSorter } from '@wfe/components/search'

const [query, setQuery] = createSignal('')
const matches = createMemo(() => matchSorter(items, query(), { keys: ['label'] }))

<Combobox
  options={matches()}
  inputValue={query()}
  onInputChange={setQuery}
  optionValue="id"
  optionLabel="label"
  optionTextValue="label"
  defaultFilter={() => true}
/>
```

### Behavior and options

`Combobox` filters by `contains` unless the caller overrides `defaultFilter`.
Use `defaultFilter="startsWith"` for prefix matching or `defaultFilter="contains"` for matching anywhere in a label.
Both use the existing locale-aware comparison and ignore case at the default comparison strength.
`optionTextValue` selects the text to match for object options.

`matchSorter` is a generic search utility from `@wfe/components/search`.
It ranks exact matches, prefixes, word prefixes, substrings, acronyms, and characters that appear in order.
It does not perform spelling correction.
Its default normalization removes common accents.
The utility returns a new array and retains the original item references.

The fuzzy recipe bypasses the second local filter because `matches()` already filters and ranks the options.
The utility also exports `rankings` and `matchSorterWithRankInfo` for thresholds and ranking metadata.

The owned [match-sorter capture](../packages/components/src/vendor/match-sorter/README.md) records exact versions, licenses, hashes, and local type adaptations.

### Application ownership

Supply options, accepted selection, and input state as needed. Own external search requests, loading, paging, and result data.

### Gallery

Open `?gallery=choices` for Contains, Starts with, and Fuzzy recipes.
