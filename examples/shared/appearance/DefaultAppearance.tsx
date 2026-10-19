import { onCleanup } from 'solid-js'
import './default-appearance.css'
import { exampleSizing } from './sizing'
import type { JSX } from '@solidjs/web'
import { uiScope } from '@wfe/components'
import { accents, appearanceStyle, schemes } from './appearance'

/** Refresh decorative geometry on entry without changing the action hit area. */
function decorateActions(root: HTMLDivElement) {
  const selector =
    '.ui-button, .ui-dashboard-navigation a[href], .ui-dashboard-menu a[href]'
  const randomize = (node: HTMLElement) => {
    const angle = (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 1.5)
    node.style.setProperty('--ui-action-angle', `${angle.toFixed(2)}deg`)
    const taper = Math.random() * 4 - 2
    node.style.setProperty('--ui-action-taper', `${taper.toFixed(2)}deg`)
  }
  const pin = (node: Element) => {
    if (
      !(node instanceof HTMLElement) ||
      node.style.getPropertyValue('--ui-action-angle')
    )
      return
    randomize(node)
  }
  const scan = (node: Element) => {
    if (node.matches(selector)) pin(node)
    node.querySelectorAll(selector).forEach(pin)
  }
  scan(root)
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof Element) scan(node)
      }
    }
  })
  observer.observe(root, { childList: true, subtree: true })
  const enter = (event: PointerEvent) => {
    if (!(event.target instanceof Element)) return
    const action = event.target.closest(selector)
    if (!(action instanceof HTMLElement) || !root.contains(action)) return
    if (
      event.relatedTarget instanceof Node &&
      action.contains(event.relatedTarget)
    )
      return
    randomize(action)
  }
  root.addEventListener('pointerover', enter)
  onCleanup(() => {
    observer.disconnect()
    root.removeEventListener('pointerover', enter)
  })
}

/** One appearance scope for client rendering and server hydration. */
export function DefaultAppearance(props: {
  children: JSX.Element
  class?: string
  style?: JSX.CSSProperties
}) {
  const scope = uiScope()
  return (
    <div
      {...scope}
      ref={decorateActions}
      class={['default-appearance', 'appearance-scope', props.class]}
      data-ui-portal-root=""
      style={{
        ...scope.style,
        ...exampleSizing,
        ...appearanceStyle(schemes[1]!, accents[1]!, 2, {
          canvas: 1,
          pane: 0,
          content: 0,
        }),
        '--ui-button-color': 'var(--ui-accent)',
        '--ui-button-on-color': 'var(--ui-on-accent)',
        ...props.style,
      }}
    >
      {props.children}
    </div>
  )
}
