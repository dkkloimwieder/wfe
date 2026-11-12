import { createMemo, untrack } from 'solid-js'
import type { ComponentProps } from '@solidjs/web'
import {
  HiddenSelectBase,
  useFormControlContext,
} from './controls/hidden-select'
import {
  createHiddenSelectChange,
  guardHiddenSelection,
} from './hiddenSelectChange'

type BaseProps = ComponentProps<typeof HiddenSelectBase>
type HiddenChoiceSelectProps = Omit<
  BaseProps,
  keyof ComponentProps<'select'>
> & {
  nativeProps: ComponentProps<'select'>
}

/** Native submission, autofill and readonly protection shared by choice controls. */
export function HiddenChoiceSelect(props: HiddenChoiceSelectProps) {
  const nativeProps = untrack(() => props.nativeProps)
  const form = useFormControlContext()
  const locked = () => Boolean(form.isReadOnly() || form.isDisabled())
  const manager = createMemo(() =>
    guardHiddenSelection(props.selectionManager, locked),
  )
  const change = createHiddenSelectChange(
    nativeProps,
    () => props.selectionManager.selectedKeys(),
    locked,
  )
  return (
    <HiddenSelectBase
      collection={props.collection}
      selectionManager={manager()}
      isOpen={props.isOpen}
      isMultiple={props.isMultiple}
      isVirtualized={props.isVirtualized}
      focusTrigger={props.focusTrigger}
      {...props.nativeProps}
      onChange={change}
    />
  )
}
