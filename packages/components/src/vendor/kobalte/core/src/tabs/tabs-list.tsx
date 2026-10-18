/*
 * Portions of this file are based on code from react-spectrum.
 * Apache License Version 2.0, Copyright 2020 Adobe.
 *
 * Credits to the React Spectrum team:
 * https://github.com/adobe/react-spectrum/blob/6b51339cca0b8344507d3c8e81e7ad05d6e75f9b/packages/@react-aria/tabs/src/useTabList.ts
 */

import {
  composeEventHandlers,
  type Orientation,
} from '../../../utils/src/index.ts'
import type { JSX, ValidComponent } from '@solidjs/web'
import { createSignal, omit, untrack, type Ref } from 'solid-js'

import {
  type ElementOf,
  Polymorphic,
  type PolymorphicProps,
} from '../polymorphic/index.tsx'
import { createSelectableCollection } from '../selection/index.ts'
import { useTabsContext } from './tabs-context.tsx'
import { TabsKeyboardDelegate } from './tabs-keyboard-delegate.ts'

export interface TabsListOptions {}

export interface TabsListCommonProps<T extends HTMLElement = HTMLElement> {
  ref: Ref<T>
  onKeyDown: JSX.EventHandlerUnion<T, KeyboardEvent>
  onMouseDown: JSX.EventHandlerUnion<T, MouseEvent>
  onFocusIn: JSX.EventHandlerUnion<T, FocusEvent>
  onFocusOut: JSX.EventHandlerUnion<T, FocusEvent>
}

export interface TabsListRenderProps extends TabsListCommonProps {
  role: 'tablist'
  'aria-orientation': Orientation
  'data-orientation': Orientation
}

export type TabsListProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = TabsListOptions & Partial<TabsListCommonProps<ElementOf<T>>>

/**
 * Contains the tabs that are aligned along the edge of the active tab panel.
 */
export function TabsList<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, TabsListProps<T>>,
) {
  const [ref, setRef] = createSignal<HTMLElement | undefined>(undefined, {
    ownedWrite: true,
  })

  const context = useTabsContext()

  const others = omit(
    props as TabsListProps,
    'ref',
    'onKeyDown',
    'onMouseDown',
    'onFocusIn',
    'onFocusOut',
  )

  const direction = () =>
    props.dir === 'rtl' || props.dir === 'ltr' ? props.dir : context.direction()

  const delegate = new TabsKeyboardDelegate(
    () => context.listState().collection(),
    direction,
    context.orientation,
  )

  const selectableCollection = createSelectableCollection(
    {
      selectionManager: () => context.listState().selectionManager(),
      keyboardDelegate: () => delegate,
      selectOnFocus: () => context.activationMode() === 'automatic',
      shouldFocusWrap: false, // handled by the keyboard delegate
      disallowEmptySelection: true,
    },
    ref,
  )

  return (
    <Polymorphic<TabsListRenderProps>
      as="div"
      ref={[setRef, untrack(() => (props as TabsListProps).ref)]}
      role="tablist"
      aria-orientation={context.orientation()}
      data-orientation={context.orientation()}
      onKeyDown={composeEventHandlers([
        props.onKeyDown,
        (event) => {
          if (!event.defaultPrevented) selectableCollection.onKeyDown(event)
        },
      ])}
      onMouseDown={composeEventHandlers([
        props.onMouseDown,
        (event) => {
          if (!event.defaultPrevented) selectableCollection.onMouseDown(event)
        },
      ])}
      onFocusIn={composeEventHandlers([
        props.onFocusIn,
        (event) =>
          untrack(() => {
            // The trigger owns its focused key. Do not refocus the previous key
            // while Solid batches the trigger focus update.
            if (ref()?.contains(event.target as Node))
              context.listState().selectionManager().setFocused(true)
          }),
      ])}
      onFocusOut={composeEventHandlers([
        props.onFocusOut,
        selectableCollection.onFocusOut,
      ])}
      {...others}
    />
  )
}
