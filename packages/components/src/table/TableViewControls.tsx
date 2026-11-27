import { createSignal, Show } from 'solid-js'
import { Dialog } from '../components/Dialog'
import { Badge } from '../components/Display'
import { DropdownMenu } from '../components/DropdownMenu'
import { FormActions } from '../components/FormLayout'
import { Icon } from '../components/Icon'
import { Button, Field, Input, Label } from '../components/NativeFields'
import { SelectField } from '../components/Select'
import { iconLock } from '../icons'
import type { TableViewsController } from './createTableViews'
import type { TableMessages } from './messages'

type ViewDialog = 'copy' | 'rename' | 'delete'

export function TableViewControls(props: {
  views: TableViewsController
  messages: Required<TableMessages>
}) {
  const views = props.views
  const messages = props.messages
  const [dialog, setDialog] = createSignal<ViewDialog>()
  const [name, setName] = createSignal('')
  let actions: HTMLButtonElement | undefined
  let input: HTMLInputElement | undefined
  let cancel: HTMLButtonElement | undefined
  const editable = () =>
    views.ready() && Boolean(views.selected()) && !views.locked()
  const isDefault = () =>
    Boolean(views.selected() && views.selected()?.id === views.defaultId())
  const error = () => {
    switch (views.error()) {
      case 'list':
        return messages.viewLoadError
      case 'write':
        return messages.viewWriteError
      case 'state':
        return messages.viewStateError
      case 'name':
        return messages.viewNameError
      default:
        return undefined
    }
  }
  const title = () =>
    dialog() === 'delete'
      ? messages.deleteView
      : dialog() === 'rename'
        ? messages.renameView
        : messages.saveViewAs

  function show(next: ViewDialog) {
    views.clearError()
    setName(next === 'rename' ? (views.selected()?.name ?? '') : '')
    setDialog(next)
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault()
    const mode = dialog()
    if (!mode || views.busy()) return
    const success =
      mode === 'delete' ? await views.remove() : await views.save(name(), mode)
    if (success && dialog() === mode) setDialog()
  }

  return (
    <div
      class="table-view-controls"
      role="group"
      aria-label={messages.savedViews}
    >
      <SelectField
        label={messages.savedViews}
        decoration={false}
        placeholder={messages.currentView}
        value={views.selected()?.id ?? ''}
        disabled={views.busy()}
        choices={[
          { value: '', label: messages.currentView },
          ...views.views().map(({ id, name }) => ({ value: id, label: name })),
        ]}
        onValueChange={views.choose}
      />
      <DropdownMenu>
        <DropdownMenu.Trigger
          ref={(node) => {
            actions = node
          }}
        >
          {messages.viewActions}
          <Icon name="chevron-down" />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content>
            <DropdownMenu.Item
              disabled={views.busy() || !editable() || !views.dirty()}
              onSelect={() => {
                const selected = views.selected()
                if (selected) void views.save(selected.name, 'save')
              }}
            >
              {messages.saveView}
            </DropdownMenu.Item>
            <DropdownMenu.Item
              disabled={views.busy() || !views.ready()}
              onSelect={() => show('copy')}
            >
              {messages.saveViewAs}
            </DropdownMenu.Item>
            <DropdownMenu.Item
              disabled={views.busy() || !views.dirty()}
              onSelect={() => views.choose(views.selected()?.id ?? '')}
            >
              {messages.resetView}
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item
              disabled={views.busy() || !editable()}
              onSelect={() => show('rename')}
            >
              {messages.renameView}
            </DropdownMenu.Item>
            <DropdownMenu.Item
              disabled={views.busy() || !editable()}
              onSelect={() => show('delete')}
            >
              {messages.deleteView}
            </DropdownMenu.Item>
            <DropdownMenu.Item
              disabled={views.busy() || !views.ready() || !views.selected()}
              onSelect={() => void views.changeDefault()}
            >
              {isDefault()
                ? messages.clearDefaultView
                : messages.setDefaultView}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu>
      <span class="table-view-badges" role="status">
        <Show when={views.locked()}>
          <Badge>
            <Icon glyph={iconLock} />
            {messages.systemView}
          </Badge>
        </Show>
        <Show when={isDefault()}>
          <Badge>{messages.defaultView}</Badge>
        </Show>
        <Show when={views.dirty()}>
          <Badge tone="warning">{messages.unsavedView}</Badge>
        </Show>
        <Show when={views.busy()}>
          <span class="sr-only">{messages.viewWorking}</span>
        </Show>
      </span>
      <Show when={!dialog() && error()}>
        <Badge role="alert" tone="error">
          {error()}
        </Badge>
        <Show when={views.error() === 'list'}>
          <Button onClick={() => void views.reload()}>
            {messages.retryViews}
          </Button>
        </Show>
      </Show>
      <Dialog
        open={Boolean(dialog())}
        onOpenChange={(open) => {
          if (!open) {
            views.clearError()
            setDialog()
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content
            initialFocus={() => (dialog() === 'delete' ? cancel : input)}
            restoreFocus={() => actions}
          >
            <Dialog.Title>{title()}</Dialog.Title>
            <Dialog.Description>
              {dialog() === 'delete'
                ? messages.deleteViewPrompt(views.selected()?.name ?? '')
                : messages.nameViewPrompt}
            </Dialog.Description>
            <form onSubmit={(event) => void submit(event)}>
              <Show when={dialog() !== 'delete'}>
                <Field>
                  <Label>{messages.viewName}</Label>
                  <Input
                    ref={(node) => {
                      input = node
                    }}
                    value={name()}
                    onValueChange={setName}
                    maxlength={80}
                    required
                    readonly={views.busy()}
                  />
                </Field>
              </Show>
              <Show when={error()}>
                <p role="alert">{error()}</p>
              </Show>
              <FormActions>
                <Dialog.CloseButton
                  aria-label={messages.cancelViewAction}
                  ref={(node) => {
                    cancel = node
                  }}
                >
                  {messages.cancelViewAction}
                </Dialog.CloseButton>
                <Button type="submit" tone="primary" disabled={views.busy()}>
                  {title()}
                </Button>
              </FormActions>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </div>
  )
}
