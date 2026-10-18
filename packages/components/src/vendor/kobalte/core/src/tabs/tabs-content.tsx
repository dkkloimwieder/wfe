/*
 * Portions of this file are based on code from react-spectrum.
 * Apache License Version 2.0, Copyright 2020 Adobe.
 *
 * Credits to the React Spectrum team:
 * https://github.com/adobe/react-spectrum/blob/6b51339cca0b8344507d3c8e81e7ad05d6e75f9b/packages/@react-aria/tabs/src/useTabPanel.ts
 */

import type { Orientation } from '../../../utils/src/index.ts'
import { getFocusableTreeWalker } from '@solid-primitives/focus'
import type { ValidComponent } from '@solidjs/web'
import {
  createEffect,
  createRenderEffect,
  createSignal,
  omit,
  type Ref,
  Show,
  untrack,
} from 'solid-js'
import {
  type ElementOf,
  Polymorphic,
  type PolymorphicProps,
} from '../polymorphic/index.tsx'
import { useTabsContext } from './tabs-context.tsx'

export interface TabsContentOptions {
  /** The unique key that associates the tab panel with a tab. */
  value: string

  /**
   * Used to force mounting when more control is needed.
   * Useful when controlling animation with SolidJS animation libraries.
   */
  forceMount?: boolean
}

export interface TabsContentCommonProps<T extends HTMLElement = HTMLElement> {
  id: string
  ref: Ref<T>
}

export interface TabsContentRenderProps extends TabsContentCommonProps {
  hidden: boolean
  inert: boolean
  role: 'tabpanel'
  tabindex: number | undefined
  'aria-labelledby': string | undefined
  'data-orientation': Orientation
  'data-selected': string | undefined
}

export type TabsContentProps<
  T extends ValidComponent | HTMLElement = HTMLElement,
> = TabsContentOptions & Partial<TabsContentCommonProps<ElementOf<T>>>

/**
 * Contains the content associated with a tab trigger.
 */
export function TabsContent<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, TabsContentProps<T>>,
) {
  const [ref, setRef] = createSignal<HTMLElement | undefined>(undefined, {
    ownedWrite: true,
  })

  const context = useTabsContext()

  const others = omit(
    props as TabsContentProps,
    'ref',
    'id',
    'value',
    'forceMount',
  )

  const [tabIndex, setTabIndex] = createSignal<number | undefined>(0)

  const id = () => props.id ?? context.generateContentId(props.value)

  const isSelected = () => context.listState().selectedKey() === props.value

  const present = () => props.forceMount || isSelected()

  createEffect(
    () => [ref(), present(), isSelected()] as const,
    ([refEl, isPresent, selected]) => {
      if (refEl == null || !isPresent || !selected) {
        return
      }

      const updateTabIndex = () =>
        untrack(() => {
          // Detect if there are any tabbable elements and update the tabIndex accordingly.
          const walker = getFocusableTreeWalker(refEl, { tabbable: true })
          setTabIndex(walker.nextNode() ? undefined : 0)
        })

      updateTabIndex()

      const observer = new MutationObserver(updateTabIndex)

      // Update when new elements are inserted, or the tabindex/disabled attribute updates.
      observer.observe(refEl, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['tabindex', 'disabled'],
      })

      return () => observer.disconnect()
    },
  )

  function restoreFocus(node: HTMLElement | undefined) {
    untrack(() => {
      if (!node?.contains(node.ownerDocument.activeElement)) return
      const key = context.listState().selectedKey()
      if (key === undefined) return
      context.listState().selectionManager().setFocusedKey(key)
      node.ownerDocument
        .getElementById(context.generateTriggerId(key))
        ?.focus({ preventScroll: true })
    })
  }
  const references = untrack(() => [
    (node: HTMLElement) => {
      setRef(node)
    },
    (props as TabsContentProps).ref,
  ])
  createRenderEffect(isSelected, (selected) => {
    if (!selected) restoreFocus(untrack(ref))
  })

  return (
    <Show when={present()}>
      <Polymorphic<TabsContentRenderProps>
        as="div"
        ref={references}
        id={id()}
        role="tabpanel"
        tabindex={tabIndex()}
        aria-labelledby={context.generateTriggerId(props.value)}
        data-orientation={context.orientation()}
        data-selected={isSelected() ? '' : undefined}
        {...others}
        hidden={!isSelected()}
        inert={!isSelected()}
      />
    </Show>
  )
}
