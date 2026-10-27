import {
  createEffect,
  createMemo,
  createSignal,
  omit,
  Show,
  untrack,
} from 'solid-js'
import type { JSX } from '@solidjs/web'
import { Command, type CommandProps } from './Command'
import { Dialog } from './Dialog'
import { Icon } from './Icon'
import {
  createCommandShortcut,
  type CommandShortcutOptions,
} from './commandShortcut'

export type CommandPaletteProps = CommandProps & {
  title: string
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Contents of the shared trigger button. Omit when the application owns its trigger. */
  trigger?: JSX.Element
  shortcut?:
    boolean | Omit<CommandShortcutOptions, 'onTrigger' | 'enabled' | 'document'>
  closeOnSelect?: boolean
  closeLabel?: string
}

/** A command list inside the shared modal dialog. Applications own all actions. */
export function CommandPalette(props: CommandPaletteProps) {
  const [localOpen, setLocalOpen] = createSignal(
    untrack(() => props.defaultOpen ?? false),
  )
  const [input, setInput] = createSignal<HTMLInputElement>()
  const [content, setContent] = createSignal<HTMLElement>()
  const open = createMemo(() => props.open ?? localOpen())
  let origin: HTMLElement | undefined
  function captureOrigin() {
    const document =
      content()?.ownerDocument ??
      (typeof window === 'undefined' ? undefined : window.document)
    const active = document?.activeElement
    if (
      active instanceof HTMLElement &&
      active !== document?.body &&
      !content()?.contains(active)
    )
      origin = active
  }
  const changeOpen = (value: boolean) => {
    if (value && !open()) captureOrigin()
    if (props.open === undefined) setLocalOpen(value)
    props.onOpenChange?.(value)
  }
  createEffect(open, (visible) => {
    if (visible) captureOrigin()
  })
  const shortcut = () =>
    typeof props.shortcut === 'object' ? props.shortcut : undefined
  createCommandShortcut({
    get enabled() {
      return !!props.shortcut
    },
    get key() {
      return shortcut()?.key
    },
    get allowInEditable() {
      return open() || shortcut()?.allowInEditable
    },
    when: (event) => {
      if (shortcut()?.when?.(event) === false) return false
      const target = event.target as Element | null
      const dialog = target?.closest?.('[role="dialog"], [role="alertdialog"]')
      return !dialog || dialog === content()
    },
    onTrigger: () => changeOpen(!open()),
  })
  const commandProps = omit(
    props,
    'title',
    'open',
    'defaultOpen',
    'onOpenChange',
    'trigger',
    'shortcut',
    'closeOnSelect',
    'closeLabel',
    'inputRef',
    'onSelect',
  )
  return (
    <Dialog open={open()} onOpenChange={changeOpen}>
      <Show when={props.trigger}>
        <Dialog.Trigger>{props.trigger}</Dialog.Trigger>
      </Show>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content
          class="ui-command-palette"
          data-ui-section-decoration="primary"
          data-ui-section-always=""
          ref={setContent}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            if (!open()) return
            // The focus primitive can request initial focus again after DOM changes.
            // Capture once; never replace the opener with body or a temporary focus target.
            if (!origin) captureOrigin()
            if (
              !content()?.contains(
                content()?.ownerDocument.activeElement ?? null,
              )
            )
              input()?.focus({ preventScroll: true })
          }}
          onCloseAutoFocus={(event) => {
            if (open()) {
              event.preventDefault()
              return
            }
            const restore = origin
            origin = undefined
            const document = content()?.ownerDocument ?? restore?.ownerDocument
            const active = document?.activeElement
            if (
              active &&
              active !== document?.body &&
              !content()?.contains(active)
            ) {
              event.preventDefault()
              return
            }
            if (restore?.isConnected) {
              event.preventDefault()
              restore.focus({ preventScroll: true })
            }
            // Otherwise retain Dialog's own trigger/focus restoration.
          }}
          onEscapeKeyDown={(event) => {
            if (event.isComposing || event.keyCode === 229)
              event.preventDefault()
          }}
        >
          <div class="ui-command-palette-surface">
            <div class="ui-command-palette-heading">
              <Dialog.Title>{props.title}</Dialog.Title>
              <Dialog.CloseButton
                class="ui-icon-button"
                aria-label={props.closeLabel ?? 'Close command palette'}
              >
                <Icon name="cross" />
              </Dialog.CloseButton>
            </div>
            <Command
              {...commandProps}
              inputRef={(node) => {
                setInput(node)
                props.inputRef?.(node)
              }}
              onSelect={(item, event) => {
                props.onSelect?.(item, event)
                if (!event.defaultPrevented && props.closeOnSelect !== false)
                  changeOpen(false)
              }}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
