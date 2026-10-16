import {
  AlertDialog,
  Button,
  Dialog,
  DropdownMenu,
  Popover,
  Sheet,
  Tooltip,
  uiScope,
} from '@wfe/components'
import type { ButtonProps, ButtonTone, ButtonVariant } from '@wfe/components'
import { nativeEvents } from '@wfe/components/events'
import { createSignal, flush, onCleanup } from 'solid-js'

function CustomButton(props: ButtonProps) {
  return <Button {...props} data-custom-button="" />
}

export function OverlayButtonControls() {
  const [variant, setVariant] = createSignal<ButtonVariant | undefined>(
    undefined,
  )
  const [tone, setTone] = createSignal<ButtonTone | undefined>(undefined)
  const [disabled, setDisabled] = createSignal(false)
  let refs = 0
  let clicks = 0
  let submits = 0
  let cleanups = 0
  const reference = () => {
    refs++
  }
  const click = () => {
    clicks++
  }
  window.overlayButtonFixture = {
    configure(next) {
      if ('variant' in next) setVariant(next.variant)
      if ('tone' in next) setTone(next.tone)
      if ('disabled' in next) setDisabled(next.disabled!)
      flush()
    },
    read: () => ({ refs, clicks, submits, cleanups }),
  }
  onCleanup(() => {
    cleanups++
  })
  return (
    <main
      {...uiScope()}
      data-ui-portal-root=""
      data-ui-theme={
        new URLSearchParams(location.search).has('dark') ? 'dark' : undefined
      }
    >
      <form
        ref={nativeEvents<HTMLFormElement>({
          submit(event) {
            event.preventDefault()
            submits++
          },
        })}
      >
        <Button data-button-part="reference" variant={variant()} tone={tone()}>
          Reference action
        </Button>
        <Dialog>
          <Dialog.Trigger
            as={CustomButton}
            data-button-part="dialog-trigger"
            variant={variant()}
            tone={tone()}
            disabled={disabled()}
            ref={reference}
            onClick={click}
          >
            Dialog action
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay />
            <Dialog.Content>
              <Dialog.Title>Button dialog</Dialog.Title>
              <Dialog.CloseButton
                data-button-part="dialog-close"
                variant={variant()}
                tone={tone()}
                disabled={disabled()}
                ref={reference}
                onClick={click}
              >
                Close button dialog
              </Dialog.CloseButton>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog>
        <AlertDialog>
          <AlertDialog.Trigger
            data-button-part="alert-trigger"
            variant={variant()}
            tone={tone()}
            disabled={disabled()}
          >
            Alert action
          </AlertDialog.Trigger>
          <AlertDialog.Portal>
            <AlertDialog.Overlay />
            <AlertDialog.Content>
              <AlertDialog.Title>Button confirmation</AlertDialog.Title>
              <AlertDialog.Cancel
                data-button-part="alert-cancel"
                variant={variant()}
                tone={tone()}
                disabled={disabled()}
                ref={reference}
                onClick={click}
              >
                Keep button values
              </AlertDialog.Cancel>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog>
        <Sheet>
          <Sheet.Trigger
            data-button-part="sheet-trigger"
            variant={variant()}
            tone={tone()}
          >
            Sheet action
          </Sheet.Trigger>
          <Sheet.Portal>
            <Sheet.Overlay />
            <Sheet.Content>
              <Sheet.Title>Button sheet</Sheet.Title>
              <Sheet.CloseButton
                data-button-part="sheet-close"
                variant={variant()}
                tone={tone()}
              >
                Close button sheet
              </Sheet.CloseButton>
            </Sheet.Content>
          </Sheet.Portal>
        </Sheet>
        <Popover>
          <Popover.Trigger
            as={Button}
            data-button-part="popover-trigger"
            variant={variant()}
            tone={tone()}
            disabled={disabled()}
            ref={reference}
            onClick={click}
          >
            Popover action
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content>
              <Popover.Title>Button popover</Popover.Title>
              <Popover.CloseButton
                data-button-part="popover-close"
                variant={variant()}
                tone={tone()}
                disabled={disabled()}
                ref={reference}
                onClick={click}
              >
                Close button popover
              </Popover.CloseButton>
            </Popover.Content>
          </Popover.Portal>
        </Popover>
        <DropdownMenu>
          <DropdownMenu.Trigger
            as={CustomButton}
            data-button-part="menu-trigger"
            variant={variant()}
            tone={tone()}
            disabled={disabled()}
            ref={reference}
          >
            Menu action
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content>
              <DropdownMenu.Item>Menu item</DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu>
        <Tooltip openDelay={0} closeDelay={0}>
          <Tooltip.Trigger
            data-button-part="tooltip-trigger"
            variant={variant()}
            tone={tone()}
            disabled={disabled()}
            ref={reference}
            onClick={click}
          >
            Tooltip action
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content>Button help</Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip>
        <Tooltip openDelay={0} closeDelay={0}>
          <Tooltip.Trigger
            as="a"
            href="#help"
            data-button-part="tooltip-link"
            variant={variant()}
            tone={tone()}
          >
            Link help
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content>Link description</Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip>
        <Tooltip>
          <Tooltip.Trigger
            type="submit"
            data-button-part="tooltip-submit"
            variant={variant()}
            tone={tone()}
          >
            Explicit submit
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content>Submission help</Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip>
      </form>
    </main>
  )
}
declare global {
  interface Window {
    overlayButtonFixture: {
      configure: (next: {
        variant?: ButtonVariant
        tone?: ButtonTone
        disabled?: boolean
      }) => void
      read: () => {
        refs: number
        clicks: number
        submits: number
        cleanups: number
      }
      stop?: () => void
    }
  }
}
