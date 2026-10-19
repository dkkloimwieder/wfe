import { createSignal, flush } from 'solid-js'
import {
  Button,
  Field,
  FileInput,
  HelpText,
  Input,
  Label,
} from '@wfe/components'
import { nativeEvents } from '@wfe/components/events'

export const fileLifecycle = {
  configure: (_next: {
    accept?: boolean
    multiple?: boolean
    required?: boolean
    disabled?: boolean
    readonly?: boolean
    cancelDrop?: boolean
    cancelReset?: boolean
    files?: File[]
    maxFileSize?: number
    acceptedTypes?: string
  }) => {},
  read: () => ({
    names: [] as string[],
    requests: [] as string[][],
    rejected: [] as string[],
    submissions: 0,
  }),
  stop: () => {},
}
/** A record form keeps binary attachments outside its scalar record values. */
export function FileControls() {
  const [files, setFiles] = createSignal<readonly File[]>([])
  const [name, setName] = createSignal('Sample record')
  const [multiple, setMultiple] = createSignal(true)
  const [required, setRequired] = createSignal(true)
  const [disabled, setDisabled] = createSignal(false)
  const [readonly, setReadonly] = createSignal(false)
  const [maxFileSize, setMaxFileSize] = createSignal(1024)
  const [acceptedTypes, setAcceptedTypes] = createSignal(
    '.txt,text/plain,image/*',
  )
  const [submissions, setSubmissions] = createSignal(0)
  let accept = true
  let cancelDrop = false
  let cancelReset = false
  const requests: string[][] = []
  const rejected: string[] = []
  fileLifecycle.configure = (next) => {
    if (next.accept !== undefined) accept = next.accept
    if (next.cancelDrop !== undefined) cancelDrop = next.cancelDrop
    if (next.cancelReset !== undefined) cancelReset = next.cancelReset
    if (next.multiple !== undefined) setMultiple(next.multiple)
    if (next.required !== undefined) setRequired(next.required)
    if (next.disabled !== undefined) setDisabled(next.disabled)
    if (next.readonly !== undefined) setReadonly(next.readonly)
    if (next.files !== undefined) setFiles(next.files)
    if (next.maxFileSize !== undefined) setMaxFileSize(next.maxFileSize)
    if (next.acceptedTypes !== undefined) setAcceptedTypes(next.acceptedTypes)
    flush()
  }
  fileLifecycle.read = () => ({
    names: files().map((file) => file.name),
    requests: requests.map((request) => [...request]),
    rejected: [...rejected],
    submissions: submissions(),
  })
  const events = nativeEvents<HTMLFormElement>({
    submit(event: SubmitEvent) {
      event.preventDefault()
      setSubmissions((value) => value + 1)
    },
    reset(event: Event) {
      if (cancelReset) event.preventDefault()
    },
  })
  return (
    <form
      id="file-review-form"
      class="example-stack"
      data-file-review
      ref={events}
    >
      <h2>Record attachments</h2>
      <Field controlId="file-record-name">
        <Label>Record name</Label>
        <Input id="file-record-name" value={name()} onValueChange={setName} />
      </Field>
      <Field
        controlId="record-attachments"
        required={required()}
        disabled={disabled()}
        readonly={readonly()}
      >
        <Label>Attachments</Label>
        <FileInput
          label="Attachments"
          onDrop={(event) => {
            if (cancelDrop) event.preventDefault()
          }}
          files={files()}
          multiple={multiple()}
          accept={acceptedTypes()}
          maxFileSize={maxFileSize()}
          onFilesChange={(next) => {
            requests.push(next.map((file) => file.name))
            if (accept) setFiles(next)
          }}
          onFilesRejected={(next) =>
            rejected.push(...next.map((entry) => entry.reason))
          }
        />
        <HelpText>
          Text and image files, up to 1,024 bytes each. Files stay in this
          browser preview.
        </HelpText>
      </Field>
      <div class="example-actions">
        <Button type="submit">Review record</Button>
        <Button type="reset">Reset attachments</Button>
      </div>
      <p role="status">
        {submissions()
          ? `Reviewed ${files().length} attachments.`
          : 'No record submitted.'}
      </p>
    </form>
  )
}
declare global {
  interface Window {
    fileFixture: typeof fileLifecycle
  }
}
