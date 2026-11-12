import { createSignal } from 'solid-js'
import {
  Card,
  Checkbox,
  ContextMenu,
  DropdownMenu,
  Button,
  Input,
  Icon,
} from '@wfe/components'

export function ContextMenuExample() {
  const [accept, setAccept] = createSignal(true)
  const [open, setOpen] = createSignal(false)
  const [pinned, setPinned] = createSignal(false)
  const [request, setRequest] = createSignal('No action requested')
  const [action, setAction] = createSignal('No action selected')
  return (
    <section class="example-stack" aria-label="Context menu review">
      <p>
        Right-click the record, hold it on a touch screen, or focus it and press
        Shift+F10.
      </p>
      <Checkbox checked={accept()} onCheckedChange={setAccept}>
        <Checkbox.Input />
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        <Checkbox.Label>Accept menu changes</Checkbox.Label>
      </Checkbox>
      <ContextMenu
        open={open()}
        onOpenChange={(next) => {
          setRequest(next ? 'Open requested' : 'Close requested')
          if (accept()) setOpen(next)
        }}
      >
        <ContextMenu.Trigger
          aria-label="Project record"
          style={{ padding: '1rem', border: '1px solid var(--ui-border)' }}
        >
          <Card>
            <h3>Project Atlas</h3>
            <p>Owner: Platform team</p>
            <p>Status: {pinned() ? 'Pinned' : 'Unpinned'}</p>
          </Card>
        </ContextMenu.Trigger>
        <ContextMenu.Portal>
          <ContextMenu.Content>
            <ContextMenu.Item onSelect={() => setAction('Inspect requested')}>
              Inspect record
            </ContextMenu.Item>
            <ContextMenu.CheckboxItem checked={pinned()} onChange={setPinned}>
              <ContextMenu.ItemIndicator>
                <Icon name="check" />
              </ContextMenu.ItemIndicator>{' '}
              Pin record
            </ContextMenu.CheckboxItem>
            <ContextMenu.Sub>
              <ContextMenu.SubTrigger>Copy</ContextMenu.SubTrigger>
              <ContextMenu.Portal>
                <ContextMenu.SubContent>
                  <ContextMenu.Item
                    onSelect={() => setAction('Copy identifier requested')}
                  >
                    Identifier
                  </ContextMenu.Item>
                  <ContextMenu.Item
                    onSelect={() => setAction('Copy link requested')}
                  >
                    Record link
                  </ContextMenu.Item>
                </ContextMenu.SubContent>
              </ContextMenu.Portal>
            </ContextMenu.Sub>
            <ContextMenu.Separator />
            <ContextMenu.Item disabled>Delete record</ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu>
      <Input
        aria-label="Retained record draft"
        placeholder="Type a draft before opening the menu"
      />
      <DropdownMenu>
        <DropdownMenu.Trigger>Other record actions</DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content>
            <DropdownMenu.Item
              onSelect={() => setAction('Dropdown inspect requested')}
            >
              Inspect with dropdown
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu>
      <Button
        onClick={() => {
          setOpen(false)
          setRequest('Menu reset')
        }}
      >
        Reset menu
      </Button>
      <output data-menu-request aria-live="polite">
        {request()}
      </output>
      <output data-menu-action aria-live="polite">
        {action()}
      </output>
    </section>
  )
}
