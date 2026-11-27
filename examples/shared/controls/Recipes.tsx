import { scalarText } from '../scalarText'
import { For, Show, createSignal } from 'solid-js'
import {
  Button,
  ButtonLink,
  Icon,
  IconButton,
  Field,
  FieldError,
  HelpText,
  Input,
  Textarea,
  Label,
  SelectField,
  DatePicker,
  DateTimePicker,
  TimePicker,
  TimeClock,
  Dialog,
  AlertDialog,
  Sheet,
} from '@wfe/components'
import type { ClockValue, SheetSide } from '@wfe/components'
import {
  ReadOnlyTable,
  createTable,
  createTableSelection,
} from '@wfe/components/table'
import type { GalleryState } from '../appearance/galleryConfig'
import { TableWorkspaceExample } from './TableWorkspaceExample'
import { SheetOptions, type SheetSize } from './SheetOptions'
export type RecipeProps = { state: GalleryState }
export function Fields(props: RecipeProps) {
  const [name, setName] = createSignal('Sample record')
  const [notes, setNotes] = createSignal('A record note')
  const [choice, setChoice] = createSignal('open')
  return (
    <section class="example-stack">
      <Field
        disabled={props.state === 'disabled'}
        readonly={props.state === 'readonly'}
        invalid={props.state === 'invalid'}
      >
        <Label>Name</Label>
        <Input value={name()} onValueChange={setName} />
        <HelpText>The application owns the entered value.</HelpText>
        <FieldError>Enter a name.</FieldError>
      </Field>
      <Field
        disabled={props.state === 'disabled'}
        readonly={props.state === 'readonly'}
        invalid={props.state === 'invalid'}
      >
        <Label>Status</Label>
        <SelectField
          label="Status"
          value={choice()}
          onValueChange={setChoice}
          choices={[
            { value: 'open', label: 'Open' },
            { value: 'closed', label: 'Closed' },
          ]}
        />
        <FieldError>Choose a status.</FieldError>
      </Field>
      <Field
        disabled={props.state === 'disabled'}
        readonly={props.state === 'readonly'}
        invalid={props.state === 'invalid'}
      >
        <Label>Notes</Label>
        <Textarea value={notes()} onValueChange={setNotes} />
        <FieldError>Review the notes.</FieldError>
      </Field>
    </section>
  )
}
export function Buttons(props: RecipeProps) {
  return (
    <section class="example-stack">
      <For each={['neutral', 'primary', 'secondary', 'accent'] as const}>
        {(tone) => (
          <div
            class="example-actions"
            role="group"
            aria-label={`${tone} buttons`}
          >
            <For each={['outline', 'filled', 'inverted', 'ghost'] as const}>
              {(variant) => (
                <Button
                  tone={tone}
                  variant={variant}
                  disabled={props.state === 'disabled'}
                >
                  {variant}
                </Button>
              )}
            </For>
            <IconButton
              aria-label={`${tone} refresh`}
              tone={tone}
              disabled={props.state === 'disabled'}
            >
              <Icon name="refresh" />
            </IconButton>
          </div>
        )}
      </For>
      <div class="example-actions" role="group" aria-label="Navigation links">
        <For each={['outline', 'filled', 'inverted', 'ghost'] as const}>
          {(variant) => (
            <ButtonLink
              href="#button-link-example"
              variant={variant}
              tone="primary"
            >
              {variant} link
            </ButtonLink>
          )}
        </For>
      </div>
      <p id="button-link-example">Links retain native browser navigation.</p>
    </section>
  )
}
export function Dates(props: RecipeProps) {
  const [time, setTime] = createSignal<string | undefined>('14:30')
  const [seconds, setSeconds] = createSignal<string | undefined>('14:30:15')
  const [clock, setClock] = createSignal<ClockValue>({
    hour: 14,
    minute: 30,
    second: 0,
  })
  const [date, setDate] = createSignal<string | undefined>('2026-10-18')
  const [instant, setInstant] = createSignal<string | undefined>(
    '2026-10-18T14:30:00.000Z',
  )
  return (
    <section class="example-stack">
      <Field
        disabled={props.state === 'disabled'}
        readonly={props.state === 'readonly'}
        invalid={props.state === 'invalid'}
      >
        <Label>Date</Label>
        <DatePicker
          label="Date"
          value={date()}
          onValueChange={setDate}
          dateFormat="yyyy-MM-dd"
        />
        <FieldError>Review the date.</FieldError>
      </Field>
      <Field
        disabled={props.state === 'disabled'}
        readonly={props.state === 'readonly'}
        invalid={props.state === 'invalid'}
      >
        <Label>Time (24-hour)</Label>
        <TimePicker
          label="Time (24-hour)"
          value={time()}
          onValueChange={setTime}
          timeFormat="HH:mm"
          locale="en-US"
        />
        <HelpText>A time of day without a date or timezone.</HelpText>
        <FieldError>Review the time.</FieldError>
      </Field>
      <Field
        disabled={props.state === 'disabled'}
        readonly={props.state === 'readonly'}
        invalid={props.state === 'invalid'}
      >
        <Label>Time (12-hour with seconds)</Label>
        <TimePicker
          label="Time (12-hour with seconds)"
          value={seconds()}
          onValueChange={setSeconds}
          timeFormat="hh:mm:ss a"
          locale="en-US"
        />
        <HelpText>A time of day without a date or timezone.</HelpText>
        <FieldError>Review the time.</FieldError>
      </Field>
      <Field
        disabled={props.state === 'disabled'}
        readonly={props.state === 'readonly'}
        invalid={props.state === 'invalid'}
      >
        <Label>Datetime (time columns)</Label>
        <DateTimePicker
          label="Datetime (time columns)"
          value={instant()}
          onValueChange={setInstant}
          timeZone="UTC"
          dateFormat="yyyy-MM-dd"
        />
        <HelpText>
          This example uses UTC. Applications choose the timezone.
        </HelpText>
        <FieldError>Review the datetime.</FieldError>
      </Field>
      <Field
        disabled={props.state === 'disabled'}
        readonly={props.state === 'readonly'}
        invalid={props.state === 'invalid'}
      >
        <Label>Datetime (clock)</Label>
        <DateTimePicker
          label="Datetime (clock)"
          value={instant()}
          onValueChange={setInstant}
          timeView="clock"
          timeZone="UTC"
          dateFormat="yyyy-MM-dd"
        />
        <HelpText>
          Both examples share one value. Pick a date, then use the clock.
        </HelpText>
        <FieldError>Review the datetime.</FieldError>
      </Field>
      <section class="example-stack" aria-labelledby="time-clock-heading">
        <h2 id="time-clock-heading">Time clock</h2>
        <TimeClock
          label="Time clock"
          value={clock()}
          onValueChange={setClock}
          timeFormat="HH:mm"
          readonly={props.state === 'readonly'}
          disabled={props.state === 'disabled'}
        />
      </section>
    </section>
  )
}
export function Dialogs(props: { sheetOptions?: boolean }) {
  const [confirm, setConfirm] = createSignal(false)
  const [side, setSide] = createSignal<SheetSide>('right')
  const [size, setSize] = createSignal<SheetSize>('wide')
  let returnFocus: HTMLHeadingElement | undefined
  return (
    <section class="example-actions">
      <Dialog>
        <Dialog.Trigger as={Button}>Open dialog</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content>
            <Dialog.Title>Record information</Dialog.Title>
            <Dialog.Description>
              This dialog displays readonly information.
            </Dialog.Description>
            <Dialog.CloseButton as={Button}>Close</Dialog.CloseButton>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
      <AlertDialog open={confirm()} onOpenChange={setConfirm}>
        <AlertDialog.Trigger as={Button}>Open confirmation</AlertDialog.Trigger>
        <AlertDialog.Portal>
          <AlertDialog.Overlay />
          <AlertDialog.Content>
            <AlertDialog.Title>Confirm action</AlertDialog.Title>
            <AlertDialog.Description>
              The application decides what the action does.
            </AlertDialog.Description>
            <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
            <AlertDialog.Action onClick={() => setConfirm(false)}>
              Confirm
            </AlertDialog.Action>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog>
      <section class="example-stack" aria-labelledby="overlay-focus-heading">
        <h2 id="overlay-focus-heading" ref={returnFocus} tabindex={-1}>
          Edit contact details
        </h2>
        <div class="example-actions">
          <OverlayFocusExample
            family={Dialog}
            label="dialog"
            restoreFocus={() => returnFocus}
          />
          <OverlayFocusExample
            family={Sheet}
            label="sheet"
            restoreFocus={() => returnFocus}
          />
          <Sheet>
            <Sheet.Trigger as={Button}>
              {size() === 'wide' ? 'Open wide sheet' : 'Open sheet'}
            </Sheet.Trigger>
            <Sheet.Portal>
              <Sheet.Overlay />
              <Sheet.Content side={side()} size={size()}>
                <Sheet.Title>
                  {size() === 'wide' ? 'Wide sheet' : 'Sheet'}
                </Sheet.Title>
                <Sheet.Description>
                  Review the full record before editing.
                </Sheet.Description>
                <Sheet.CloseButton>Close</Sheet.CloseButton>
              </Sheet.Content>
            </Sheet.Portal>
          </Sheet>
        </div>
      </section>
      <Show when={props.sheetOptions}>
        <SheetOptions
          side={side()}
          size={size()}
          onSideChange={setSide}
          onSizeChange={setSize}
        />
      </Show>
    </section>
  )
}

function OverlayFocusExample(props: {
  family: typeof Dialog | typeof Sheet
  label: string
  restoreFocus: () => HTMLElement | undefined
}) {
  const [editing, setEditing] = createSignal(true)
  let email: HTMLInputElement | undefined
  let edit: HTMLButtonElement | undefined
  return (
    <props.family
      onOpenChange={(open) => {
        if (!open) setEditing(true)
      }}
    >
      <props.family.Trigger as={Button}>
        Edit in {props.label}
      </props.family.Trigger>
      <props.family.Portal>
        <props.family.Overlay />
        <props.family.Content
          focusKey={editing()}
          initialFocus={() => (editing() ? email : edit)}
          restoreFocus={props.restoreFocus}
        >
          <props.family.Title>Contact details</props.family.Title>
          <props.family.Description>
            Update the email address.
          </props.family.Description>
          <Show
            when={editing()}
            fallback={
              <Button ref={edit} onClick={() => setEditing(true)}>
                Edit email
              </Button>
            }
          >
            <Field>
              <Label>Contact email</Label>
              <Input type="email" ref={email} />
            </Field>
            <Button onClick={() => setEditing(false)}>Review contact</Button>
          </Show>
          <props.family.CloseButton as={Button} aria-label="Done">
            Done
          </props.family.CloseButton>
        </props.family.Content>
      </props.family.Portal>
    </props.family>
  )
}
export function TableExample() {
  const [workspace, setWorkspace] = createSignal(false)
  const rows = [
    { id: '1', name: 'Sample record', status: 'Open' },
    { id: '2', name: 'Second record', status: 'Closed' },
  ]
  const textColumn = {
    sortFn: (left: unknown, right: unknown) =>
      scalarText(left).localeCompare(scalarText(right)),
    filterFn: (value: unknown, filter: unknown) =>
      scalarText(value).toLowerCase().includes(String(filter).toLowerCase()),
  }
  const table = createTable({
    source: {
      ids: () => rows.map((row) => row.id),
      get: (id) => rows.find((row) => row.id === id)!,
    },
    columns: [
      { ...textColumn, id: 'id', accessorKey: 'id', header: 'ID' },
      { ...textColumn, id: 'name', accessorKey: 'name', header: 'Name' },
      { ...textColumn, id: 'status', accessorKey: 'status', header: 'Status' },
    ],
  })
  const selection = createTableSelection({
    rows: () =>
      table.getDisplayKeys().flatMap((key) => {
        const item = table.getDisplayItem(key)
        return item.kind === 'row' ? [item.id] : []
      }),
    columns: () => table.getVisibleColumns().map((column) => column.id),
    getText: ({ row, column }) => String(table.getValue(row, column) ?? ''),
  })
  return (
    <div class="gallery-table">
      <Show
        when={workspace()}
        fallback={
          <ReadOnlyTable
            table={table}
            selection={selection}
            title="Records"
            columnAlignment={{ id: 'right' }}
            toolbarActions={
              <IconButton
                aria-label="Workspace example"
                title="Workspace example"
                onClick={() => setWorkspace(true)}
              >
                <Icon name="layout" />
              </IconButton>
            }
          />
        }
      >
        <TableWorkspaceExample onBack={() => setWorkspace(false)} />
      </Show>
    </div>
  )
}
