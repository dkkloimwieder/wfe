import { createEffect, omit } from 'solid-js'
import { usePopupScope } from '../components/popupScope'
import { Trigger, useTooltipContext } from '../internal/controls/tooltip'
import type { JSX } from '@solidjs/web'

/** Keep the bar presentation and combine tooltip details with edit instructions. */
export function GanttBarTrigger(
  props: JSX.ButtonHTMLAttributes<HTMLButtonElement> & { hideDetails: boolean },
) {
  const scope = usePopupScope()
  const tooltip = useTooltipContext()
  const attributes = omit(props, 'hideDetails')
  createEffect(
    () => props.hideDetails,
    (hidden) => {
      if (hidden) {
        tooltip.cancelOpening()
        tooltip.hideTooltip(true)
      }
    },
  )
  return (
    <Trigger
      {...attributes}
      ref={[scope.setTrigger, props.ref]}
      aria-describedby={
        [
          props['aria-describedby'],
          tooltip.isOpen() ? tooltip.contentId() : undefined,
        ]
          .filter(Boolean)
          .join(' ') || undefined
      }
    />
  )
}
