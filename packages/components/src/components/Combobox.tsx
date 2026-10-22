import { CompoundControl } from '../internal/controlDecoration'
import type { ControlDecorationProps } from '../internal/controlDecoration'
import { Icon } from './Icon'
import { styledClasses, type ClassValue } from '../internal/classes'
import * as Core from '../internal/controls/combobox'
import { callHandler } from '../internal/events'
import { Show, omit, untrack } from 'solid-js'
import { ChoiceScope, createChoiceScope, useChoiceScope } from './choiceScope'
import type { Component } from 'solid-js'
import type { JSX, ValidComponent } from '@solidjs/web'
import type {
  ElementOf,
  PolymorphicProps,
} from '../vendor/kobalte/core/src/polymorphic'

export function ComboboxRoot<
  Option,
  OptGroup = never,
  T extends ValidComponent = 'div',
>(props: PolymorphicProps<T, Core.ComboboxRootProps<Option, OptGroup, T>>) {
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
    onOpenChange: (value, mode) => props.onOpenChange?.(value, mode),
  })
  return (
    <ChoiceScope value={scope}>
      <Core.Root<Option, OptGroup, T>
        {...props}
        data-ui=""
        class={styledClasses('ui-field', props.class)}
        open={scope.open()}
        onOpenChange={scope.changeOpen}
        allowsEmptyCollection={props.allowsEmptyCollection ?? true}
      />
    </ChoiceScope>
  )
}

// Styled parts add HTML classes and slots at the polymorphic forwarding boundary.
// Keep JSX reference arrays direct. The compiler drops callbacks behind outer assertions.
export function ComboboxTrigger<T extends ValidComponent = 'button'>(
  props: PolymorphicProps<
    T,
    Core.ComboboxTriggerProps<T> & { class?: ClassValue }
  >,
) {
  const Primitive = Core.Trigger as Component<typeof props>

  return (
    <Primitive {...props} class={styledClasses('choice-toggle', props.class)} />
  )
}
export function ComboboxContent<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<
    T,
    Core.ComboboxContentProps<T> & {
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
export function ComboboxItem<T extends ValidComponent = 'li'>(
  props: PolymorphicProps<
    T,
    Core.ComboboxItemProps<T> & { class?: ClassValue }
  >,
) {
  const Primitive = Core.Item as Component<typeof props>
  return (
    <Primitive {...props} class={styledClasses('popup-option', props.class)} />
  )
}
/** Fixed-size selection marker shared by every choice popup. */
export function ComboboxItemIndicator<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<
    T,
    Core.ComboboxItemIndicatorProps<T> & {
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

export function ComboboxPortal(props: Core.ComboboxPortalProps) {
  const scope = useChoiceScope()
  return <Core.Portal {...props} mount={props.mount ?? scope.mount()} />
}

export function ComboboxListbox<
  Option = unknown,
  OptGroup = never,
  T extends ValidComponent = 'ul',
>(
  props: PolymorphicProps<
    T,
    Core.ComboboxListboxProps<Option, OptGroup, T> & { class?: ClassValue }
  >,
) {
  const Primitive = Core.Listbox as Component<typeof props>
  return (
    <Primitive {...props} class={styledClasses('popup-listbox', props.class)} />
  )
}
export function ComboboxInput<T extends ValidComponent = 'input'>(
  props: PolymorphicProps<
    T,
    Core.ComboboxInputProps<T> & { class?: ClassValue }
  >,
) {
  const Primitive = Core.Input as Component<typeof props>
  const scope = useChoiceScope()
  return (
    <Primitive
      {...props}
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
export function ComboboxControl<Option, T extends ValidComponent = 'div'>(
  props: PolymorphicProps<
    T,
    Core.ComboboxControlProps<Option, T> &
      ControlDecorationProps & { class?: ClassValue }
  >,
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

export function ComboboxIcon<T extends ValidComponent = 'span'>(
  props: PolymorphicProps<
    T,
    Core.ComboboxIconProps<T> & { class?: ClassValue }
  >,
) {
  const Primitive = Core.Icon as Component<typeof props>
  return (
    <Primitive {...props} class={styledClasses('ui-choice-icon', props.class)}>
      {props.children ?? <Icon name="chevron-down" />}
    </Primitive>
  )
}

export function ComboboxLabel<T extends ValidComponent = 'label'>(
  props: PolymorphicProps<
    T,
    Core.ComboboxLabelProps<T> & { class?: ClassValue }
  >,
) {
  const Primitive = Core.Label as Component<typeof props>
  return <Primitive {...props} class={styledClasses('ui-label', props.class)} />
}

export function ComboboxDescription<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<
    T,
    Core.ComboboxDescriptionProps & { class?: ClassValue }
  >,
) {
  const Primitive = Core.Description as Component<typeof props>
  return <Primitive {...props} class={styledClasses('ui-help', props.class)} />
}

export function ComboboxErrorMessage<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<
    T,
    Core.ComboboxErrorMessageProps<T> & { class?: ClassValue }
  >,
) {
  const Primitive = Core.ErrorMessage as Component<typeof props>
  return (
    <Primitive
      {...props}
      class={styledClasses('ui-field-error', props.class)}
    />
  )
}

export const Combobox = /* @__PURE__ */ Object.assign(ComboboxRoot, {
  // Refresh proxies hide function keys. Copy named parts without enumerating them.
  Arrow: Core.Arrow,
  Description: ComboboxDescription,
  ErrorMessage: ComboboxErrorMessage,
  HiddenSelect: Core.HiddenSelect,
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
export type * from '../internal/controls/combobox'
