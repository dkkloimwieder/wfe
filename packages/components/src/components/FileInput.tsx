import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  merge,
  omit,
  onCleanup,
  useContext,
} from 'solid-js'
import type { JSX } from '@solidjs/web'
import { Button } from './NativeFields'
import { FieldContext } from '../internal/fieldContext'
import { styledClasses } from '../internal/classes'
import {
  callHandler,
  nativeEventProps,
  ownedElementEvents,
} from '../internal/events'
import { createNativeFormResetListener } from '../internal/formReset'

export type FileRejection = Readonly<{
  file: File
  reason: 'type' | 'size' | 'multiple'
}>
export type FileInputProps = Omit<
  JSX.InputHTMLAttributes<HTMLInputElement>,
  | 'accept'
  | 'type'
  | 'value'
  | 'defaultValue'
  | 'name'
  | 'children'
  | 'size'
  | 'onDrop'
  | 'onDragOver'
  | 'onDragLeave'
> & {
  onDrop?: JSX.HTMLAttributes<HTMLDivElement>['onDrop']
  onDragOver?: JSX.HTMLAttributes<HTMLDivElement>['onDragOver']
  onDragLeave?: JSX.HTMLAttributes<HTMLDivElement>['onDragLeave']
  accept?: string
  type?: never
  value?: never
  defaultValue?: never
  name?: never
  label: string
  files: readonly File[]
  onFilesChange: (files: File[]) => void
  onFilesRejected?: (rejections: readonly FileRejection[]) => void
  maxFileSize?: number
  invalid?: boolean
  browseLabel?: string
  removeLabel?: (file: File) => string
}

/** Controlled file selection. Applications own file contents and submission. */
export function FileInput(props: FileInputProps) {
  const field = useContext(FieldContext)
  const generated = `file-input-${createUniqueId()}`
  const id = () => props.id || field?.baseControlId() || generated
  field?.registerControl(id)
  const disabled = () => props.disabled ?? field?.disabled()
  const readonly = () => props.readonly ?? field?.readonly()
  const locked = () => Boolean(disabled() || readonly())
  const required = () => props.required ?? field?.required()
  const invalid = () => props.invalid ?? field?.invalid()
  const [feedback, setFeedback] = createSignal<
    Array<{ name: string; reason: FileRejection['reason'] }>
  >([])
  const [attempted, setAttempted] = createSignal(false)
  const [dragging, setDragging] = createSignal(false)
  const feedbackId = `${generated}-feedback`
  const [resetTarget, setResetTarget] = createSignal<HTMLInputElement>()
  let input: HTMLInputElement | undefined
  let browse: HTMLButtonElement | undefined
  let alive = true
  const configuration = createMemo(() => {
    const max = props.maxFileSize
    if (max !== undefined && (!Number.isSafeInteger(max) || max < 0))
      throw new Error(
        'FileInput maxFileSize must be a nonnegative safe integer in bytes',
      )
    return {
      max,
      types: (props.accept ?? '')
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    }
  })
  function reason(file: File) {
    const { max, types } = configuration()
    const matches =
      !types.length ||
      types.some((type) =>
        type.startsWith('.')
          ? file.name.toLowerCase().endsWith(type)
          : type.endsWith('/*')
            ? file.type.toLowerCase().startsWith(type.slice(0, -1))
            : file.type.toLowerCase() === type,
      )
    return !matches
      ? 'type'
      : max !== undefined && file.size > max
        ? 'size'
        : undefined
  }
  const validityMessage = createMemo(() => {
    configuration()
    if (locked()) return ''
    if (required() && props.files.length === 0) return 'Choose a file.'
    if (!props.multiple && props.files.length > 1) return 'Select one file.'
    if (props.files.some((file) => reason(file)))
      return 'The selected files do not meet the type or size limits.'
    return ''
  })
  const showValidity = () =>
    Boolean(validityMessage() && (attempted() || props.files.length))
  const invalidState = () => invalid() || showValidity()
  const validityId = `${generated}-validity`
  const interactionLocked = () =>
    locked() || Boolean(input?.matches(':disabled'))
  const describedBy = () =>
    [
      field?.describedBy(),
      props['aria-describedby'],
      required() ? `${generated}-required` : undefined,
      feedback().length ? feedbackId : undefined,
      showValidity() ? validityId : undefined,
    ]
      .filter(Boolean)
      .join(' ') || undefined
  function choose(files: File[]) {
    if (!alive || interactionLocked() || !files.length) return
    const accepted: File[] = []
    const rejected: FileRejection[] = []
    setAttempted(true)
    for (const file of files) {
      const why =
        !props.multiple && files.length > 1 ? 'multiple' : reason(file)
      if (why) rejected.push({ file, reason: why })
      else accepted.push(file)
    }
    setFeedback(
      rejected.map(({ file, reason }) => ({ name: file.name, reason })),
    )
    if (rejected.length) props.onFilesRejected?.(rejected)
    if (alive && accepted.length)
      props.onFilesChange(
        props.multiple ? [...props.files, ...accepted] : accepted,
      )
  }
  function reset() {
    if (!alive) return
    setFeedback([])
    setAttempted(false)
    setDragging(false)
    if (!interactionLocked()) props.onFilesChange([])
  }
  createNativeFormResetListener(resetTarget, reset)
  createEffect(validityMessage, (message) => {
    input?.setCustomValidity(message)
  })
  createEffect(locked, (locked) => {
    if (locked) setDragging(false)
  })
  const fileDrag = (event: DragEvent) =>
    Boolean(event.dataTransfer?.types.includes('Files'))
  const dropEvents = ownedElementEvents({
    onDragOver(
      event: DragEvent & { currentTarget: HTMLDivElement; target: Element },
    ) {
      const canceled = callHandler(event, props.onDragOver)
      if (!alive || !fileDrag(event)) return
      event.preventDefault()
      if (event.dataTransfer)
        event.dataTransfer.dropEffect =
          interactionLocked() || canceled ? 'none' : 'copy'
      setDragging(!interactionLocked() && !canceled)
    },
    onDragLeave(
      event: DragEvent & { currentTarget: HTMLDivElement; target: Element },
    ) {
      callHandler(event, props.onDragLeave)
      if (
        !(event.relatedTarget instanceof Node) ||
        !event.currentTarget.contains(event.relatedTarget)
      )
        setDragging(false)
    },
    onDrop(
      event: DragEvent & { currentTarget: HTMLDivElement; target: Element },
    ) {
      const canceled = callHandler(event, props.onDrop)
      if (!alive || !fileDrag(event)) return
      event.preventDefault()
      setDragging(false)
      if (!canceled && !interactionLocked())
        choose(Array.from(event.dataTransfer?.files ?? []))
    },
  })
  const events = ownedElementEvents(
    merge(omit(props, 'onDrop', 'onDragOver', 'onDragLeave'), {
      onChange(
        event: Event & {
          currentTarget: HTMLInputElement
          target: HTMLInputElement
        },
      ) {
        try {
          if (
            !callHandler(
              event,
              props.onChange as JSX.EventHandlerUnion<HTMLInputElement, Event>,
            )
          )
            choose(Array.from(event.currentTarget.files ?? []))
        } finally {
          event.currentTarget.value = ''
        }
      },
      onInvalid(
        event: Event & {
          currentTarget: HTMLInputElement
          target: HTMLInputElement
        },
      ) {
        if (callHandler(event, props.onInvalid)) return
        event.preventDefault()
        setAttempted(true)
        if (!locked()) browse?.focus({ preventScroll: true })
      },
    }),
  )
  const attributes = omit(
    props,
    'id',
    'ref',
    'class',
    'style',
    'label',
    'files',
    'onFilesChange',
    'onFilesRejected',
    'maxFileSize',
    'invalid',
    'browseLabel',
    'removeLabel',
    'disabled',
    'readonly',
    'required',
    'name',
    'type',
    'value',
    'defaultValue',
    ...nativeEventProps,
  )
  onCleanup(() => {
    alive = false
    input = undefined
    browse = undefined
  })
  return (
    <div
      data-ui=""
      class={styledClasses('ui-file-input', props.class)}
      style={props.style}
      role="group"
      aria-label={props.label}
      data-disabled={disabled() ? '' : undefined}
      data-readonly={readonly() ? '' : undefined}
      data-invalid={invalidState() ? '' : undefined}
      data-dragging={dragging() ? '' : undefined}
      ref={dropEvents}
    >
      <input
        {...attributes}
        id={id()}
        type="file"
        class="ui-file-picker"
        tabindex={-1}
        aria-label={props['aria-label'] ?? props.label}
        aria-describedby={describedBy()}
        aria-invalid={
          props['aria-invalid'] ?? (invalidState() ? 'true' : undefined)
        }
        accept={props.accept}
        multiple={props.multiple}
        disabled={locked()}
        ref={[
          (node: HTMLInputElement) => {
            input = node
            setResetTarget(node)
          },
          props.ref,
          events,
        ]}
      />
      <Show when={required()}>
        <span id={`${generated}-required`} class="ui-help">
          Required
        </span>
      </Show>
      <div class="ui-file-actions">
        <Button
          ref={(node) => {
            browse = node
          }}
          disabled={locked()}
          aria-describedby={describedBy()}
          aria-invalid={invalidState() ? 'true' : undefined}
          onClick={() => {
            if (alive && !interactionLocked()) input?.click()
          }}
        >
          {props.browseLabel ??
            (props.multiple ? 'Choose files' : 'Choose file')}
        </Button>
        <span class="ui-help">
          Or drop {props.multiple ? 'files' : 'a file'} here
        </span>
      </div>
      <Show
        when={props.files.length}
        fallback={<p class="ui-help">No files selected</p>}
      >
        <ul class="ui-file-list">
          <For
            each={props.files.map((file, index) => ({ file, index }))}
            keyed={(entry) => entry.index}
          >
            {(entry) => (
              <li>
                <span class="ui-file-name" data-ui-text="value">
                  {entry().file.name}
                </span>
                <span class="ui-file-size" data-ui-text="value">
                  {entry().file.size} bytes
                </span>
                <Button
                  disabled={locked()}
                  aria-label={
                    props.removeLabel?.(entry().file) ??
                    `Remove ${entry().file.name}`
                  }
                  onClick={() => {
                    if (!alive || interactionLocked()) return
                    browse?.focus({ preventScroll: true })
                    setFeedback([])
                    props.onFilesChange(
                      props.files.filter((_, index) => index !== entry().index),
                    )
                  }}
                >
                  Remove
                </Button>
              </li>
            )}
          </For>
        </ul>
      </Show>
      <Show when={showValidity()}>
        <p id={validityId} class="ui-field-error">
          {validityMessage()}
        </p>
      </Show>
      <div
        id={feedbackId}
        class="ui-field-error"
        role="status"
        aria-live="polite"
      >
        <For each={feedback()}>
          {(entry) => (
            <p>
              <span data-ui-text="value">{entry.name}</span>:{' '}
              {entry.reason === 'multiple'
                ? 'Select one file.'
                : entry.reason === 'type'
                  ? 'File type is not allowed.'
                  : 'File exceeds the size limit.'}
            </p>
          )}
        </For>
      </div>
    </div>
  )
}
