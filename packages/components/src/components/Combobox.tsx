import { choiceContentHandlers, choiceContentSlots } from './choiceContent'
import { renderCompoundFieldRoot } from '../internal/fieldRendering'
import {
  createHiddenSelectChange,
  guardHiddenSelection,
} from '../internal/hiddenSelectChange'
import {
  HiddenSelectBase,
  useFormControlContext,
} from '../internal/controls/hidden-select'
import {
  createCompoundField,
  createCompoundFieldTarget,
} from '../internal/compoundField'
import type {
  CompoundFieldProps,
  WithValueChange,
} from '../internal/compoundField'
import { CompoundControl } from '../internal/controlDecoration'
import type { ControlDecorationProps } from '../internal/controlDecoration'
import { Icon } from './Icon'
import { styledClasses, type ClassValue } from '../internal/classes'
import * as Core from '../internal/controls/combobox'
import { callHandler } from '../internal/events'
import { createMemo, omit, untrack } from 'solid-js'
import { ChoiceScope, createChoiceScope, useChoiceScope } from './choiceScope'
import type { Component } from 'solid-js'
import type { JSX, ValidComponent } from '@solidjs/web'
import type {
  ElementOf,
  PolymorphicProps,
} from '../vendor/kobalte/core/src/polymorphic'

export type ComboboxRootProps<
  Option,
  OptGroup = never,
  T extends ValidComponent | HTMLElement = HTMLElement,
> = WithValueChange<Core.ComboboxRootProps<Option, OptGroup, T>> &
  CompoundFieldProps & { class?: ClassValue }
export function ComboboxRoot<
  Option,
  OptGroup = never,
  T extends ValidComponent = 'div',
>(props: PolymorphicProps<T, ComboboxRootProps<Option, OptGroup, T>>) {
  const state = createCompoundField(props)
  const scope = createChoiceScope({
    get open() {
      return props.open
    },
    get defaultOpen() {
      return props.defaultOpen
    },
    get disabled() {
      return state.disabled() || state.readonly()
    },
    onOpenChange: (value, mode) => props.onOpenChange?.(value, mode),
  })
  return renderCompoundFieldRoot(() => (
    <ChoiceScope value={scope}>
      <Core.Root<Option, OptGroup, T>
        {...(omit(
          props,
          'readonly',
          'invalid',
          'onValueChange',
        ) as typeof props)}
        disabled={state.disabled()}
        required={state.required()}
        readOnly={state.readonly()}
        validationState={state.validationState()}
        onChange={(value: Option | Option[] | null) => {
          if (state.disabled() || state.readonly()) return
          const change = props.onValueChange ?? props.onChange
          ;(
            change as ((value: Option | Option[] | null) => void) | undefined
          )?.(value)
        }}
        data-ui=""
        class={styledClasses('ui-field', props.class)}
        open={scope.open()}
        onOpenChange={scope.changeOpen}
        allowsEmptyCollection={props.allowsEmptyCollection ?? true}
      />
    </ChoiceScope>
  ))
}

// Styled parts add HTML classes and slots at the polymorphic forwarding boundary.
// Keep JSX reference arrays direct. The compiler drops callbacks behind outer assertions.
export type ComboboxTriggerProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.ComboboxTriggerProps<T> & { class?: ClassValue }
export function ComboboxTrigger<T extends ValidComponent = 'button'>(
  props: PolymorphicProps<T, ComboboxTriggerProps<T>>,
) {
  const Primitive = Core.Trigger as Component<typeof props>

  return (
    <Primitive {...props} class={styledClasses('choice-toggle', props.class)} />
  )
}
export type ComboboxContentProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.ComboboxContentProps<T> & {
  class?: ClassValue
  children?: JSX.Element
  footer?: JSX.Element
  status?: JSX.Element
}
export function ComboboxContent<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, ComboboxContentProps<T>>,
) {
  const Primitive = Core.Content as Component<typeof props>
  const scope = useChoiceScope()
  const rest = omit(props, 'footer', 'status') as typeof props
  const handlers = choiceContentHandlers<ElementOf<T>>(props, scope)
  return (
    <Primitive
      {...rest}
      class={styledClasses('popup-content', props.class)}
      ref={[scope.setContent, untrack(() => props.ref)]}
      {...handlers}
    >
      {props.children}
      {choiceContentSlots(props)}
    </Primitive>
  )
}
export type ComboboxItemProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.ComboboxItemProps<T> & { class?: ClassValue }
export function ComboboxItem<T extends ValidComponent = 'li'>(
  props: PolymorphicProps<T, ComboboxItemProps<T>>,
) {
  const Primitive = Core.Item as Component<typeof props>
  return (
    <Primitive {...props} class={styledClasses('popup-option', props.class)} />
  )
}
/** Fixed-size selection marker shared by every choice popup. */
export type ComboboxItemIndicatorProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.ComboboxItemIndicatorProps<T> & {
  class?: ClassValue
  children?: JSX.Element
}
export function ComboboxItemIndicator<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, ComboboxItemIndicatorProps<T>>,
) {
  const Primitive = Core.ItemIndicator as Component<typeof props>
  return (
    <Primitive
      {...props}
      class={styledClasses('popup-item-indicator', props.class)}
    />
  )
}

export type ComboboxPortalProps = Core.ComboboxPortalProps
export function ComboboxPortal(props: ComboboxPortalProps) {
  const scope = useChoiceScope()
  return <Core.Portal {...props} mount={props.mount ?? scope.mount()} />
}

export type ComboboxListboxProps<
  Option = unknown,
  OptGroup = never,
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.ComboboxListboxProps<Option, OptGroup, T> & { class?: ClassValue }
export function ComboboxListbox<
  Option = unknown,
  OptGroup = never,
  T extends ValidComponent = 'ul',
>(props: PolymorphicProps<T, ComboboxListboxProps<Option, OptGroup, T>>) {
  const Primitive = Core.Listbox as Component<typeof props>
  return (
    <Primitive {...props} class={styledClasses('popup-listbox', props.class)} />
  )
}
export type ComboboxInputProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.ComboboxInputProps<T> & { class?: ClassValue }
export function ComboboxInput<T extends ValidComponent = 'input'>(
  props: PolymorphicProps<T, ComboboxInputProps<T>>,
) {
  const Primitive = Core.Input as Component<typeof props>
  const target = createCompoundFieldTarget(props)
  const scope = useChoiceScope()
  return (
    <Primitive
      {...props}
      {...target}
      class={styledClasses('choice-input', props.class)}
      ref={[scope.setControl, untrack(() => props.ref)]}
      onKeyDown={(
        event: KeyboardEvent & { currentTarget: ElementOf<T>; target: Element },
      ) => {
        callHandler(event, props.onKeyDown)
        scope.enterContent(event)
      }}
    />
  )
}
export type ComboboxControlProps<
  Option,
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.ComboboxControlProps<Option, T> &
  ControlDecorationProps & { class?: ClassValue }
export function ComboboxControl<Option, T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, ComboboxControlProps<Option, T>>,
) {
  const Primitive = Core.Control as Component<typeof props>
  return (
    <CompoundControl value={true}>
      <Primitive
        {...(omit(props, 'decoration') as typeof props)}
        data-ui-control-surface=""
        data-ui-control-decoration={
          props.decoration === false ? 'none' : props.decoration
        }
        class={styledClasses('choice-control', props.class)}
      />
    </CompoundControl>
  )
}

export type ComboboxIconProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.ComboboxIconProps<T> & { class?: ClassValue }
export function ComboboxIcon<T extends ValidComponent = 'span'>(
  props: PolymorphicProps<T, ComboboxIconProps<T>>,
) {
  const Primitive = Core.Icon as Component<typeof props>
  return (
    <Primitive {...props} class={styledClasses('ui-choice-icon', props.class)}>
      {props.children ?? <Icon name="chevron-down" />}
    </Primitive>
  )
}

export type ComboboxLabelProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.ComboboxLabelProps<T> & { class?: ClassValue }
export function ComboboxLabel<T extends ValidComponent = 'label'>(
  props: PolymorphicProps<T, ComboboxLabelProps<T>>,
) {
  const Primitive = Core.Label as Component<typeof props>
  return <Primitive {...props} class={styledClasses('ui-label', props.class)} />
}

export type ComboboxDescriptionProps = Core.ComboboxDescriptionProps & {
  class?: ClassValue
}
export function ComboboxDescription<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, ComboboxDescriptionProps>,
) {
  const Primitive = Core.Description as Component<typeof props>
  return <Primitive {...props} class={styledClasses('ui-help', props.class)} />
}

export type ComboboxErrorMessageProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.ComboboxErrorMessageProps<T> & { class?: ClassValue }
export function ComboboxErrorMessage<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, ComboboxErrorMessageProps<T>>,
) {
  const Primitive = Core.ErrorMessage as Component<typeof props>
  return (
    <Primitive
      {...props}
      class={styledClasses('ui-field-error', props.class)}
    />
  )
}

export function ComboboxHiddenSelect(props: ComboboxHiddenSelectProps) {
  const context = Core.useComboboxContext()
  const form = useFormControlContext()
  const locked = () => Boolean(form.isReadOnly() || form.isDisabled())
  const manager = createMemo(() =>
    guardHiddenSelection(context.listState().selectionManager(), locked),
  )
  const change = createHiddenSelectChange(
    props,
    () => context.listState().selectionManager().selectedKeys(),
    locked,
  )
  return (
    <HiddenSelectBase
      collection={context.listState().collection()}
      selectionManager={manager()}
      isOpen={context.isOpen()}
      isMultiple={context.isMultiple()}
      isVirtualized={context.isVirtualized()}
      focusTrigger={() => context.inputRef()?.focus({ preventScroll: true })}
      {...props}
      onChange={change}
    />
  )
}

export const Combobox = /* @__PURE__ */ Object.assign(ComboboxRoot, {
  // Refresh proxies hide function keys. Copy named parts without enumerating them.
  Arrow: Core.Arrow,
  Description: ComboboxDescription,
  ErrorMessage: ComboboxErrorMessage,
  HiddenSelect: ComboboxHiddenSelect,
  Icon: ComboboxIcon,
  ItemDescription: Core.ItemDescription,
  ItemIndicator: ComboboxItemIndicator,
  ItemLabel: Core.ItemLabel,
  Label: ComboboxLabel,
  Section: Core.Section,
  Root: ComboboxRoot,
  Trigger: ComboboxTrigger,
  Content: ComboboxContent,
  Item: ComboboxItem,
  Listbox: ComboboxListbox,
  Portal: ComboboxPortal,
  Input: ComboboxInput,
  Control: ComboboxControl,
})
// Explicit compatibility exports retain the previously available primitive types.
export type {
  ComboboxArrowOptions,
  ComboboxArrowProps,
  ComboboxContentCommonProps,
  ComboboxContentOptions,
  ComboboxContentRenderProps,
  ComboboxControlCommonProps,
  ComboboxControlOptions,
  ComboboxControlRenderProps,
  ComboboxDescriptionCommonProps,
  ComboboxDescriptionOptions,
  ComboboxDescriptionRenderProps,
  ComboboxErrorMessageCommonProps,
  ComboboxErrorMessageOptions,
  ComboboxErrorMessageRenderProps,
  ComboboxInputCommonProps,
  ComboboxInputOptions,
  ComboboxInputRenderProps,
  ComboboxItemCommonProps,
  ComboboxItemDescriptionCommonProps,
  ComboboxItemDescriptionOptions,
  ComboboxItemDescriptionProps,
  ComboboxItemDescriptionRenderProps,
  ComboboxItemIndicatorCommonProps,
  ComboboxItemIndicatorOptions,
  ComboboxItemIndicatorRenderProps,
  ComboboxItemLabelCommonProps,
  ComboboxItemLabelOptions,
  ComboboxItemLabelProps,
  ComboboxItemLabelRenderProps,
  ComboboxItemOptions,
  ComboboxItemRenderProps,
  ComboboxLabelCommonProps,
  ComboboxLabelOptions,
  ComboboxLabelRenderProps,
  ComboboxListboxCommonProps,
  ComboboxListboxOptions,
  ComboboxListboxRenderProps,
  ComboboxMultipleSelectionOptions,
  ComboboxRootCommonProps,
  ComboboxRootItemComponentProps,
  ComboboxRootOptions,
  ComboboxRootRenderProps,
  ComboboxRootSectionComponentProps,
  ComboboxSectionCommonProps,
  ComboboxSectionOptions,
  ComboboxSectionProps,
  ComboboxSectionRenderProps,
  ComboboxSingleSelectionOptions,
  ComboboxTriggerCommonProps,
  ComboboxTriggerMode,
  ComboboxTriggerOptions,
  ComboboxTriggerRenderProps,
  Arrow,
  Content,
  Control,
  Description,
  ErrorMessage,
  Icon,
  Input,
  Item,
  ItemDescription,
  ItemIndicator,
  ItemLabel,
  Label,
  Listbox,
  Portal,
  Root,
  Section,
  Trigger,
  ComboboxContextValue,
  useComboboxContext,
} from '../internal/controls/combobox'

export type ComboboxHiddenSelectProps = Core.ComboboxHiddenSelectProps
export { ComboboxHiddenSelect as HiddenSelect }
