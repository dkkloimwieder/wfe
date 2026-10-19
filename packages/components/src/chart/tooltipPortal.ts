import { portalMount } from '../internal/portalMount'
import { portal } from '../vendor/charts/charts-core/src/tooltip-portal'
import type { ChartTooltipPortalExtension } from '../vendor/charts/charts-core/src/dom-types'

/** Keep fallback tooltips in the same UI scope as the chart. */
export const tooltipPortal: ChartTooltipPortalExtension = {
  id: 'ui-tooltip-portal',
  create(context, options) {
    context.element.dataset.ui = ''
    context.element.dataset.uiChartTooltip = ''
    const withMount = (value: typeof options) => ({
      ...value,
      mount:
        value.mount ??
        portalMount(context.container) ??
        context.container.parentElement ??
        undefined,
    })
    const instance = portal.create(context, withMount(options))
    return {
      ...instance,
      update(next) {
        instance.update(withMount(next))
      },
    }
  },
}
