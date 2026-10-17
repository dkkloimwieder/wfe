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

export function SelectRoot<
  Option,
  OptGroup = never,
  T extends ValidComponent = 'div',
>(props: PolymorphicProps<T, Core.SelectRootProps<Option, OptGroup, T>>) {
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
        open={scope.open()}
        onOpenChange={scope.changeOpen}
      />
    </ChoiceScope>
  )
}

// Styled parts add HTML classes and slots at the polymorphic forwarding boundary.
// Keep JSX reference arrays direct. The compiler drops callbacks behind outer assertions.
export function SelectTrigger<T extends ValidComponent = 'button'>(
  props: PolymorphicProps<
    T,
    Core.SelectTriggerProps<T> & { class?: ClassValue }
  >,
) {
  const Primitive = Core.Trigger as Component<typeof props>
  const scope = useChoiceScope()
  return (
    <Primitive
      {...props}
      class={styledClasses('popup-trigger', props.class)}
      ref={[scope.setControl, untrack(() => props.ref)]}
    />
  )
}
export function SelectContent<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<
    T,
    Core.SelectContentProps<T> & {
      class?: ClassValue
      children?: JSX.Element
      footer?: JSX.Element
      status?: JSX.Element
    }
  >,
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
export function SelectItem<T extends ValidComponent = 'li'>(
  props: PolymorphicProps<T, Core.SelectItemProps<T> & { class?: ClassValue }>,
) {
  const Primitive = Core.Item as Component<typeof props>
  return (
    <Primitive {...props} class={styledClasses('popup-option', props.class)} />
  )
}
/** Fixed-size selection marker shared by every choice popup. */
export function SelectItemIndicator<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<
    T,
    Core.SelectItemIndicatorProps<T> & {
      class?: ClassValue
      children?: JSX.Element
    }
  >,
) {
  const Primitive = Core.ItemIndicator as Component<typeof props>
  return (
    <Primitive
      {...props}
      class={styledClasses('popup-item-indicator', props.class)}
    />
  )
}

export function SelectPortal(props: Core.SelectPortalProps) {
  const scope = useChoiceScope()
  return <Core.Portal {...props} mount={props.mount ?? scope.mount()} />
}

export function SelectListbox<
  Option = unknown,
  OptGroup = never,
  T extends ValidComponent = 'ul',
>(
  props: PolymorphicProps<
    T,
    Core.SelectListboxProps<Option, OptGroup, T> & { class?: ClassValue }
  >,
) {
  const Primitive = Core.Listbox as Component<typeof props>
  return (
    <Primitive {...props} class={styledClasses('popup-listbox', props.class)} />
  )
}

export type SelectChoice = { value: string; label: string; disabled?: boolean }
export type SelectFieldProps = Omit<
  PolymorphicProps<'button', Core.SelectTriggerProps<'button'>>,
  'children' | 'value' | 'onChange' | 'disabled' | 'class' | 'name'
> & {
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
            <svg class="ui-check-mark" viewBox="0 0 16 16" aria-hidden="true">
              <path d="m2 8 4 4 8-9" />
            </svg>
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

export const Select = /* @__PURE__ */ Object.assign(SelectRoot, {
  // Refresh proxies hide function keys. Copy named parts without enumerating them.
  Arrow: Core.Arrow,
  Description: Core.Description,
  ErrorMessage: Core.ErrorMessage,
  HiddenSelect: Core.HiddenSelect,
  Icon: Core.Icon,
  ItemDescription: Core.ItemDescription,
  ItemIndicator: SelectItemIndicator,
  ItemLabel: Core.ItemLabel,
  Label: Core.Label,
  Section: Core.Section,
  Value: Core.Value,
  Root: SelectRoot,
  Trigger: SelectTrigger,
  Content: SelectContent,
  Item: SelectItem,
  Listbox: SelectListbox,
  Portal: SelectPortal,
})
export type * from '../internal/controls/select'
