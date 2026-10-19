import {
  createMemo,
  createEffect,
  createSignal,
  createUniqueId,
  onCleanup,
  untrack,
} from 'solid-js'
import { AlertDialog } from '@wfe/components'
import type { DeleteDescription, DeleteViewBindings, RecordKey } from './types'
import { StatusView, descriptionLabel, requireValue, uniqueIds } from './shared'

export function DeleteView<Key extends RecordKey>(props: {
  description: DeleteDescription
  bindings: DeleteViewBindings<Key>
}) {
  const identity = untrack(() => props.description.id)
  const domId = `generated-delete-${createUniqueId()}`
  const [open, setOpen] = createSignal(false, { ownedWrite: true })
  let alive = true
  let target: { key: Key } | undefined
  const description = createMemo(() => {
    const value = props.description
    requireValue(
      value.id === identity,
      'remount the delete view to replace its identity',
    )
    uniqueIds([value.id], 'delete')
    for (const text of [value.title, value.confirmation])
      requireValue(
        typeof text === 'string' && text.trim(),
        'delete confirmation requires a title and description',
      )
    descriptionLabel(value.triggerLabel, 'Delete')
    descriptionLabel(value.confirmLabel, 'Delete')
    descriptionLabel(value.cancelLabel, 'Cancel')
    requireValue(
      typeof props.bindings.onConfirm === 'function',
      'delete view requires a confirmation callback',
    )
    return value
  })
  function key() {
    const value = props.bindings.recordKey()
    requireValue(
      (typeof value === 'string' && value.trim().length > 0) ||
        (typeof value === 'number' && Number.isFinite(value)),
      'delete view requires one nonempty string or finite number key',
    )
    return value
  }
  function close() {
    target = undefined
    setOpen(false)
  }
  function changeOpen(next: boolean) {
    if (!alive) return
    if (!next || props.bindings.disabled?.()) {
      close()
      return
    }
    target = { key: key() }
    setOpen(true)
  }
  createEffect(
    () => ({ key: key(), disabled: props.bindings.disabled?.() }),
    (current) => {
      if (target && (!Object.is(target.key, current.key) || current.disabled))
        close()
    },
  )
  onCleanup(() => {
    alive = false
    target = undefined
  })
  function confirm() {
    if (!alive || !target) return
    const accepted = target
    if (props.bindings.disabled?.() || !Object.is(accepted.key, key())) {
      close()
      return
    }
    close()
    props.bindings.onConfirm(accepted.key)
  }
  function checkedId() {
    key()
    return description().id
  }
  return (
    <div data-generator-delete={checkedId()}>
      <StatusView status={props.bindings.status} />
      <AlertDialog id={domId} open={open()} onOpenChange={changeOpen}>
        <AlertDialog.Trigger disabled={props.bindings.disabled?.()}>
          {descriptionLabel(description().triggerLabel, 'Delete')}
        </AlertDialog.Trigger>
        <AlertDialog.Portal>
          <AlertDialog.Overlay />
          <AlertDialog.Content>
            <AlertDialog.Title>{description().title}</AlertDialog.Title>
            <AlertDialog.Description>
              {description().confirmation}
            </AlertDialog.Description>
            <div class="ui-form-actions">
              <AlertDialog.Cancel>
                {descriptionLabel(description().cancelLabel, 'Cancel')}
              </AlertDialog.Cancel>
              <AlertDialog.Action
                disabled={props.bindings.disabled?.()}
                onClick={confirm}
              >
                {descriptionLabel(description().confirmLabel, 'Delete')}
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog>
    </div>
  )
}
