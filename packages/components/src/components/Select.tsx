import type { ControlDecorationProps } from '../internal/controlDecoration'
import { Icon } from './Icon'
import { styledClasses, type ClassValue } from '../internal/classes'
import { FieldContext } from '../internal/fieldContext'
import * as Core from '../internal/controls/select'
import { callHandler } from '../internal/events'
import { Show, createUniqueId, omit, untrack, useContext } from 'solid-js'
import { ChoiceScope, createChoiceScope, useChoiceScope } from './choiceScope'
import type { Component } from 'solid-js'
import type { JSX, ValidComponent } from '@solidjs/web'
import type {
  ElementOf,
  PolymorphicProps,
} from '../vendor/kobalte/core/src/polymorphic'

export type SelectRootProps<
  Option,
  OptGroup = never,
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.SelectRootProps<Option, OptGroup, T> & { class?: ClassValue }
export function SelectRoot<
  Option,
  OptGroup = never,
  T extends ValidComponent = 'div',
>(props: PolymorphicProps<T, SelectRootProps<Option, OptGroup, T>>) {
  const scope = createChoiceScope({
    get open() {
      return props.open
    },
    get defaultOpen() {
      return props.defaultOpen
    },
    get disabled() {
      return props.disabled
    },
    onOpenChange: (value) => props.onOpenChange?.(value),
  })
  return (
    <ChoiceScope value={scope}>
      <Core.Root<Option, OptGroup, T>
        {...props}
        data-ui=""
        class={styledClasses('ui-field', props.class)}
        open={scope.open()}
        onOpenChange={scope.changeOpen}
      />
    </ChoiceScope>
  )
}

// Styled parts add HTML classes and slots at the polymorphic forwarding boundary.
// Keep JSX reference arrays direct. The compiler drops callbacks behind outer assertions.
export type SelectTriggerProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.SelectTriggerProps<T> & ControlDecorationProps & { class?: ClassValue }
export function SelectTrigger<T extends ValidComponent = 'button'>(
  props: PolymorphicProps<T, SelectTriggerProps<T>>,
) {
  const Primitive = Core.Trigger as Component<typeof props>
  const scope = useChoiceScope()
  return (
    <Primitive
      {...(omit(props, 'decoration') as typeof props)}
      data-ui-control-surface=""
      data-ui-control-decoration={
        props.decoration === false ? 'none' : props.decoration
      }
      class={styledClasses('popup-trigger', props.class)}
      ref={[scope.setControl, untrack(() => props.ref)]}
    />
  )
}
export type SelectContentProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.SelectContentProps<T> & {
  class?: ClassValue
  children?: JSX.Element
  footer?: JSX.Element
  status?: JSX.Element
}
export function SelectContent<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, SelectContentProps<T>>,
) {
  const Primitive = Core.Content as Component<typeof props>
  const scope = useChoiceScope()
  const rest = omit(props, 'footer', 'status') as typeof props
  return (
    <Primitive
      {...rest}
      class={styledClasses('popup-content', props.class)}
      ref={[scope.setContent, untrack(() => props.ref)]}
      onPointerDownOutside={(event) => {
        props.onPointerDownOutside?.(event)
        if (!event.defaultPrevented) scope.outside()
      }}
      onFocusOutside={(event) => {
        props.onFocusOutside?.(event)
        if (!event.defaultPrevented) scope.outside()
      }}
      onKeyDown={(
        event: KeyboardEvent & { currentTarget: ElementOf<T>; target: Element },
      ) => {
        callHandler(event, props.onKeyDown)
        scope.tab(event)
      }}
      onCloseAutoFocus={(event) => {
        props.onCloseAutoFocus?.(event)
        scope.closeAutoFocus(event)
      }}
    >
      {props.children}
      <Show when={props.status}>
        <div class="choice-status" role="status">
          {props.status}
        </div>
      </Show>
      <Show when={props.footer}>
        <div class="choice-footer">{props.footer}</div>
      </Show>
    </Primitive>
  )
}
export type SelectItemProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.SelectItemProps<T> & { class?: ClassValue }
export function SelectItem<T extends ValidComponent = 'li'>(
  props: PolymorphicProps<T, SelectItemProps<T>>,
) {
  const Primitive = Core.Item as Component<typeof props>
  return (
    <Primitive {...props} class={styledClasses('popup-option', props.class)} />
  )
}
/** Fixed-size selection marker shared by every choice popup. */
export type SelectItemIndicatorProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.SelectItemIndicatorProps<T> & {
  class?: ClassValue
  children?: JSX.Element
}
export function SelectItemIndicator<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, SelectItemIndicatorProps<T>>,
) {
  const Primitive = Core.ItemIndicator as Component<typeof props>
  return (
    <Primitive
      {...props}
      class={styledClasses('popup-item-indicator', props.class)}
    />
  )
}

export type SelectPortalProps = Core.SelectPortalProps
export function SelectPortal(props: SelectPortalProps) {
  const scope = useChoiceScope()
  return <Core.Portal {...props} mount={props.mount ?? scope.mount()} />
}

export type SelectListboxProps<
  Option = unknown,
  OptGroup = never,
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.SelectListboxProps<Option, OptGroup, T> & { class?: ClassValue }
export function SelectListbox<
  Option = unknown,
  OptGroup = never,
  T extends ValidComponent = 'ul',
>(props: PolymorphicProps<T, SelectListboxProps<Option, OptGroup, T>>) {
  const Primitive = Core.Listbox as Component<typeof props>
  return (
    <Primitive {...props} class={styledClasses('popup-listbox', props.class)} />
  )
}

export type SelectChoice = { value: string; label: string; disabled?: boolean }
export type SelectFieldProps = Omit<
  PolymorphicProps<'button', Core.SelectTriggerProps<'button'>>,
  'children' | 'value' | 'onChange' | 'disabled' | 'class' | 'name'
> &
  ControlDecorationProps & {
    class?: ClassValue
    'data-ui-text'?: 'system' | 'value' | 'prose'
    name?: string
    contentProps?: { [key: `data-${string}`]: string | undefined }
    disabled?: boolean
    readonly?: boolean
    required?: boolean
    label: string
    choices: readonly SelectChoice[]
    value: string | undefined
    onValueChange: (value: string) => void
    placeholder?: string
    invalid?: boolean
  }

/** A single choice composed from the same Select parts as multiple choices. */
export function SelectField(props: SelectFieldProps) {
  const field = useContext(FieldContext)
  const generated = `select-field-${createUniqueId()}`
  const id = () => props.id || field?.baseControlId() || generated
  const disabled = () => props.disabled ?? field?.disabled()
  const readonly = () => props.readonly ?? field?.readonly()
  field?.registerControl(id)
  const rest = omit(
    props,
    'label',
    'choices',
    'value',
    'onValueChange',
    'placeholder',
    'invalid',
    'disabled',
    'name',
    'contentProps',
    'readonly',
    'required',
  )
  return (
    <SelectRoot<SelectChoice>
      class="ui-select-field"
      name={props.name}
      options={[...props.choices]}
      optionValue="value"
      optionTextValue="label"
      optionDisabled="disabled"
      value={
        props.choices.find((choice) => choice.value === props.value) ?? null
      }
      onChange={(choice) =>
        untrack(() => {
          if (!disabled() && !readonly())
            props.onValueChange(choice?.value ?? '')
        })
      }
      disabled={disabled()}
      readOnly={readonly()}
      required={props.required ?? field?.required()}
      open={readonly() ? false : undefined}
      validationState={
        (props.invalid ?? field?.invalid()) ? 'invalid' : undefined
      }
      placeholder={props.placeholder}
      itemComponent={(item) => (
        <SelectItem
          item={item.item}
          data-choice-value={item.item.rawValue.value}
        >
          <Core.ItemLabel>{item.item.rawValue.label}</Core.ItemLabel>
          <SelectItemIndicator>
            <Icon class="ui-check-mark" name="check" />
          </SelectItemIndicator>
        </SelectItem>
      )}
    >
      <SelectTrigger
        {...rest}
        id={id()}
        aria-disabled={readonly() ? 'true' : props['aria-disabled']}
        aria-describedby={
          [field?.describedBy(), props['aria-describedby']]
            .filter(Boolean)
            .join(' ') || undefined
        }
        aria-label={props.label}
        data-value={props.value ?? ''}
      >
        <Core.Value<SelectChoice>>
          {(state) => state.selectedOption()?.label}
        </Core.Value>
      </SelectTrigger>
      <Show when={props.name}>
        <Core.HiddenSelect />
      </Show>
      <SelectPortal>
        <SelectContent
          {...props.contentProps}
          data-ui-text={props['data-ui-text']}
        >
          <SelectListbox />
        </SelectContent>
      </SelectPortal>
    </SelectRoot>
  )
}

export type SelectIconProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.SelectIconProps<T> & { class?: ClassValue }
export function SelectIcon<T extends ValidComponent = 'span'>(
  props: PolymorphicProps<T, SelectIconProps<T>>,
) {
  const Primitive = Core.Icon as Component<typeof props>
  return (
    <Primitive {...props} class={styledClasses('ui-choice-icon', props.class)}>
      {props.children ?? <Icon name="chevron-down" />}
    </Primitive>
  )
}

export type SelectLabelProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.SelectLabelProps<T> & { class?: ClassValue }
export function SelectLabel<T extends ValidComponent = 'span'>(
  props: PolymorphicProps<T, SelectLabelProps<T>>,
) {
  const Primitive = Core.Label as Component<typeof props>
  return <Primitive {...props} class={styledClasses('ui-label', props.class)} />
}

export type SelectDescriptionProps = Core.SelectDescriptionProps & {
  class?: ClassValue
}
export function SelectDescription<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, SelectDescriptionProps>,
) {
  const Primitive = Core.Description as Component<typeof props>
  return <Primitive {...props} class={styledClasses('ui-help', props.class)} />
}

export type SelectErrorMessageProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = Core.SelectErrorMessageProps<T> & { class?: ClassValue }
export function SelectErrorMessage<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, SelectErrorMessageProps<T>>,
) {
  const Primitive = Core.ErrorMessage as Component<typeof props>
  return (
    <Primitive
      {...props}
      class={styledClasses('ui-field-error', props.class)}
    />
  )
}

export const Select = /* @__PURE__ */ Object.assign(SelectRoot, {
  // Refresh proxies hide function keys. Copy named parts without enumerating them.
  Arrow: Core.Arrow,
  Description: SelectDescription,
  ErrorMessage: SelectErrorMessage,
  HiddenSelect: Core.HiddenSelect,
  Icon: SelectIcon,
  ItemDescription: Core.ItemDescription,
  ItemIndicator: SelectItemIndicator,
  ItemLabel: Core.ItemLabel,
  Label: SelectLabel,
  Section: Core.Section,
  Value: Core.Value,
  Root: SelectRoot,
  Trigger: SelectTrigger,
  Content: SelectContent,
  Item: SelectItem,
  Listbox: SelectListbox,
  Portal: SelectPortal,
})
// Explicit compatibility exports retain the previously available primitive types.
export type {
  SelectArrowCommonProps,
  SelectArrowOptions,
  SelectArrowProps,
  SelectArrowRenderProps,
  SelectContentCommonProps,
  SelectContentOptions,
  SelectContentRenderProps,
  SelectDescriptionCommonProps,
  SelectDescriptionOptions,
  SelectDescriptionRenderProps,
  SelectErrorMessageCommonProps,
  SelectErrorMessageOptions,
  SelectErrorMessageRenderProps,
  SelectHiddenSelectProps,
  SelectIconCommonProps,
  SelectIconOptions,
  SelectIconRenderProps,
  SelectItemCommonProps,
  SelectItemDescriptionCommonProps,
  SelectItemDescriptionOptions,
  SelectItemDescriptionProps,
  SelectItemDescriptionRenderProps,
  SelectItemIndicatorCommonProps,
  SelectItemIndicatorOptions,
  SelectItemIndicatorRenderProps,
  SelectItemLabelCommonProps,
  SelectItemLabelOptions,
  SelectItemLabelProps,
  SelectItemLabelRenderProps,
  SelectItemOptions,
  SelectItemRenderProps,
  SelectLabelCommonProps,
  SelectLabelOptions,
  SelectLabelRenderProps,
  SelectListboxCommonProps,
  SelectListboxOptions,
  SelectListboxRenderProps,
  SelectMultipleSelectionOptions,
  SelectRootCommonProps,
  SelectRootItemComponentProps,
  SelectRootOptions,
  SelectRootRenderProps,
  SelectRootSectionComponentProps,
  SelectSectionProps,
  SelectSingleSelectionOptions,
  SelectTriggerCommonProps,
  SelectTriggerOptions,
  SelectTriggerRenderProps,
  SelectValueCommonProps,
  SelectValueOptions,
  SelectValueProps,
  SelectValueRenderProps,
  Arrow,
  Content,
  Description,
  ErrorMessage,
  HiddenSelect,
  Icon,
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
  Value,
  SelectContextValue,
  useSelectContext,
} from '../internal/controls/select'
