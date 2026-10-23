# File selection

`FileInput` selects and displays local files. Applications own the canonical `File[]`, uploads, storage, progress, and request failures.
The component does not read file contents, create object URLs, or send requests.
Import shared styles once through `@wfe/components/styles.css`.
The root export and `@wfe/components/file-input` expose the same component and types.

## Application control

Supply `files` and `onFilesChange`. There is no internal selected-file array.
The callback requests a replacement array. The application can reject the request by retaining its current array.
Application prop changes do not emit selection requests.

The picker and file drops follow the same rules.
Single mode replaces the selection. A single-mode batch with multiple files rejects the whole batch.
Multiple mode appends accepted files in order. A mixed batch appends valid files and reports rejected candidates separately.

The component does not deduplicate files. Distinct files can share names and other metadata.
Removal targets a list entry. It does not remove every file with the same name.

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

## Constraints and feedback

`accept` uses comma-separated extensions, MIME types, and MIME wildcards such as `image/*`.
Matching ignores case. Files without a MIME type can still match a filename extension.
`maxFileSize` is a nonnegative safe integer in bytes. Zero permits only empty files.
The component applies these constraints to selection requests and current canonical files.

`onFilesRejected` receives the rejected file objects and a `type`, `size`, or `multiple` reason.
Local feedback retains names and reasons, without retaining rejected file objects.
Rejected candidates do not invalidate an existing valid selection.
Required-empty feedback appears after a selection attempt or invalid submission. Invalid canonical files show feedback immediately.
These selection constraints do not replace application or server validation.

## Fields, forms, and access

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
Applications construct `FormData` from their selected files when they submit.
Files remain separate from `@wfe/form` scalar values and generator descriptions.
Server rendering supports an empty selection. Applications supply browser files after attachment.
The browser attaches picker and drop behavior to retained server fields during hydration.

The native behavior follows the [file input documentation](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/file) and [file drop API](https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/files).

## UI messages

FileInput accepts `messages?: Partial<FileInputMessages>` for its owned actions, empty state, byte counts, required hint, and validation or rejection feedback.
Import `FileInputMessages` and the English `fileInputMessages` defaults from `@wfe/components`.
Explicit `label`, `aria-label`, `browseLabel`, and `removeLabel` props retain precedence for their existing targets.
Filenames remain file values. The `fileSize(bytes)` callback controls the displayed size text; it does not change byte limits.
Changing messages retains selected File objects, focused controls, and rejection reasons without issuing selection or rejection callbacks.

Overrides resolve per property and remain reactive; omitted properties use the English defaults.
Validation reasons are independent of translated text. An empty translated error retains native invalidity by falling back to the English error for native validation.
Use matching initial messages for server rendering and hydration. No translation service or application policy is added.
