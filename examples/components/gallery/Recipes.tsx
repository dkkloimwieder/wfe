import { For, createSignal } from 'solid-js'
import {
  Button,
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
  Dialog,
  AlertDialog,
} from '@wfe/components'
import { ReadOnlyTable, createTable } from '@wfe/components/table'
import type { GalleryState } from './catalog'
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
      <For each={['accent', 'neutral'] as const}>
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
    </section>
  )
}
export function Dates(props: RecipeProps) {
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
        <Label>Datetime</Label>
        <DateTimePicker
          label="Datetime"
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
    </section>
  )
}
export function Dialogs() {
  const [confirm, setConfirm] = createSignal(false)
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
    </section>
  )
}
export function TableExample() {
  const rows = [
    { id: '1', name: 'Sample record', status: 'Open' },
    { id: '2', name: 'Second record', status: 'Closed' },
  ]
  const textColumn = {
    sortFn: (left: unknown, right: unknown) =>
      String(left ?? '').localeCompare(String(right ?? '')),
    filterFn: (value: unknown, filter: unknown) =>
      String(value ?? '')
        .toLowerCase()
        .includes(String(filter).toLowerCase()),
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
  return (
    <div class="gallery-table">
      <ReadOnlyTable table={table} title="Records" />
    </div>
  )
}
