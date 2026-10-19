import { placeTooltip } from './tooltip-position'
import {
  createChartTooltipContent,
  orderChartTooltipPoints,
  resolveChartTooltipAnchor,
} from './tooltip-model'
import type {
  ChartTooltipExtension,
  ChartTooltipExtensionContext,
  ChartTooltipExtensionInstance,
  ChartTooltipPaintContext,
  ChartTooltipPortalExtension,
  ChartTooltipPortalExtensionInstance,
} from './dom-types'
import type {
  ChartPoint,
  ChartScene,
  ChartTooltipContent,
  ChartTooltipOptions,
  ChartTooltipPortalOptions,
  ChartValue,
} from './types'

export const tooltip: ChartTooltipExtension = {
  id: 'tooltip',
  __chartExtensionType: 'tooltip',
  __chartTooltipHost: 'dom',
  create: createTooltipExtension,
}

export type {
  ChartTooltipExtension,
  ChartTooltipExtensionContext,
  ChartTooltipExtensionInstance,
  ChartTooltipPaintContext,
} from './dom-types'

export type {
  ChartTooltipAnchor,
  ChartTooltipAnchorContext,
  ChartTooltipContent,
  ChartTooltipDatumItem,
  ChartTooltipDerivedItem,
  ChartTooltipInput,
  ChartTooltipItemBase,
  ChartTooltipOptions,
  ChartTooltipPlacement,
  ChartTooltipPosition,
  ChartTooltipRow,
  ChartTooltipSort,
} from './types'

function createTooltipExtension<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  extensionContext: ChartTooltipExtensionContext<TDatum, TXValue, TYValue>,
): ChartTooltipExtensionInstance<TDatum, TXValue, TYValue> {
  let options: ChartTooltipOptions<TDatum, TXValue, TYValue> = {}
  let element: HTMLDivElement | undefined
  let bodyElement: HTMLDivElement | undefined
  let activeBodyChange:
    ReturnType<typeof extensionContext.bodyChange> | undefined
  let bodyVisible = false
  let customBody = false
  let bodyScene: ChartScene<TDatum, TXValue, TYValue> | undefined
  let bodyPoints: readonly ChartPoint<TDatum, TXValue, TYValue>[] = []
  let bodyPinned = false
  let bodyDirty = false
  let paintContext:
    ChartTooltipPaintContext<TDatum, TXValue, TYValue> | undefined
  let anchor: { x: number; y: number } | null = null
  let positionFrame: number | undefined
  let resizeObserver: ResizeObserver | undefined
  let portalExtension: ChartTooltipPortalExtension | undefined
  let portalInstance: ChartTooltipPortalExtensionInstance | undefined
  const { container } = extensionContext
  const view = container.ownerDocument.defaultView
  const tooltipMotion = extensionContext.motion

  function update(nextOptions: ChartTooltipOptions<TDatum, TXValue, TYValue>) {
    if (options !== nextOptions) bodyDirty = true
    options = nextOptions
    if (element) syncPortal()
  }

  function paint(
    nextContext: ChartTooltipPaintContext<TDatum, TXValue, TYValue>,
  ) {
    if (paintContext?.point !== nextContext.point) bodyDirty = true
    paintContext = nextContext
    if (options.visibility === 'pinned' && !nextContext.pinned) {
      hide()
      return
    }
    const tooltipElement = ensureElement()
    syncPortal()
    const motionSnapshot = tooltipMotion?.beforePaint(tooltipElement)
    tooltipElement.style.visibility = 'hidden'
    tooltipElement.removeAttribute('hidden')
    tooltipElement.className = options.className
      ? `ts-chart-tooltip ${options.className}`
      : 'ts-chart-tooltip'
    const points = orderChartTooltipPoints(
      nextContext.points,
      nextContext.scene,
      options.sort,
    )
    const resolvedContent = createChartTooltipContent(
      points,
      nextContext.scene,
      nextContext.pinned,
      options,
      nextContext.point,
    )
    const custom = renderTooltipBody(
      tooltipElement,
      points,
      resolvedContent,
      nextContext.pinned,
    )
    if (custom !== customBody) {
      Object.assign(
        tooltipElement.style,
        custom ? customTooltipCardStyle : tooltipCardStyle,
      )
      customBody = custom
    }
    if (!custom) {
      if (typeof resolvedContent === 'string') {
        paintPlainTooltip(tooltipElement, resolvedContent)
      } else {
        paintStructuredTooltip(tooltipElement, resolvedContent)
      }
    }
    configureTooltipSemantics(
      tooltipElement,
      resolvedContent,
      custom,
      nextContext.pinned,
    )
    tooltipElement.style.pointerEvents = nextContext.pinned ? 'auto' : 'none'
    tooltipElement.style.userSelect = nextContext.pinned ? 'text' : 'none'
    tooltipElement.dataset.sticky = String(nextContext.pinned)
    anchor = resolveChartTooltipAnchor(
      nextContext.point,
      points,
      nextContext.scene,
      nextContext.pointer,
      options,
      nextContext.focus,
    )
    position()
    tooltipElement.style.removeProperty('visibility')
    if (motionSnapshot) {
      tooltipMotion?.afterPaint(tooltipElement, motionSnapshot, options.motion)
    }
  }

  function ensureElement() {
    if (element) return element
    element = createTooltip(container.ownerDocument)
    element.addEventListener('keydown', handleKeyDown)
    resizeObserver = view?.ResizeObserver
      ? new view.ResizeObserver(schedulePosition)
      : undefined
    resizeObserver?.observe(element)
    container.append(element)
    return element
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Escape' || !paintContext?.pinned) return
    event.preventDefault()
    event.stopPropagation()
    extensionContext.dismiss()
  }

  function schedulePosition() {
    if (!paintContext || !anchor || positionFrame !== undefined) return
    if (!view?.requestAnimationFrame) {
      position()
      return
    }
    positionFrame = view.requestAnimationFrame(() => {
      positionFrame = undefined
      position()
    })
  }

  function position() {
    if (!paintContext || !element || !anchor) return
    if (portalInstance) {
      const visible = portalInstance.position({
        scene: paintContext.scene,
        surface: paintContext.surface,
        anchor,
        placement: options.placement,
        offset: options.offset,
      })
      if (!visible) element.setAttribute('hidden', '')
      return
    }
    placeTooltip(
      element,
      anchor.x,
      anchor.y,
      {
        left: 0,
        top: 0,
        right: paintContext.scene.width,
        bottom: paintContext.scene.height,
      },
      options.placement,
      options.offset,
    )
  }

  function syncPortal() {
    if (!element) return
    const input = options.portal
    const nextExtension = (
      input ? ('create' in input ? input : input.use) : undefined
    ) as ChartTooltipPortalExtension | undefined
    const nextOptions: ChartTooltipPortalOptions =
      input && 'use' in input ? input : {}
    if (nextExtension !== portalExtension) {
      portalInstance?.destroy()
      portalInstance = undefined
      portalExtension = nextExtension
      if (nextExtension) {
        portalInstance = nextExtension.create(
          {
            container,
            element,
            schedulePosition,
          },
          nextOptions,
        )
      } else {
        moveToContainer()
      }
    } else {
      portalInstance?.update(nextOptions)
    }
  }

  function moveToContainer() {
    if (!element) return
    if (element.parentNode !== container) container.append(element)
    element.removeAttribute('popover')
    delete element.dataset.tsChartTooltipPortal
    Object.assign(element.style, {
      position: 'absolute',
      zIndex: '1',
      right: 'auto',
      bottom: 'auto',
      margin: '0',
    })
  }

  function renderTooltipBody(
    tooltipElement: HTMLDivElement,
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
    content: ChartTooltipContent | string,
    pinned: boolean,
  ) {
    const callback = extensionContext.bodyChange()
    if (!callback) {
      deactivateTooltipBody()
      return false
    }
    if (activeBodyChange !== callback) {
      activeBodyChange?.(null)
      activeBodyChange = callback
      bodyVisible = false
      bodyElement = undefined
    }
    if (!bodyElement) {
      bodyElement = tooltipElement.ownerDocument.createElement('div')
      bodyElement.className = 'ts-chart-tooltip__body'
      tooltipElement.replaceChildren(bodyElement)
    }
    bodyElement.toggleAttribute('inert', !pinned)
    setTooltipContentAccessibility(tooltipElement, content)
    const changed =
      bodyDirty ||
      !bodyVisible ||
      bodyScene !== paintContext?.scene ||
      bodyPinned !== pinned ||
      !samePointList(points, bodyPoints)
    bodyDirty = false
    bodyVisible = true
    bodyScene = paintContext?.scene
    bodyPoints = points
    bodyPinned = pinned
    if (changed) {
      callback({
        element: bodyElement,
        primaryPoint: paintContext?.point,
        points,
        content,
        pinned,
        dismiss: extensionContext.dismiss,
      })
    }
    return true
  }

  function hideTooltipBody() {
    if (!bodyVisible) return
    bodyVisible = false
    activeBodyChange?.(null)
  }

  function deactivateTooltipBody() {
    hideTooltipBody()
    activeBodyChange = undefined
    bodyElement = undefined
    bodyScene = undefined
    bodyPoints = []
  }

  function hide() {
    paintContext = undefined
    anchor = null
    const currentElement = element
    if (!currentElement || currentElement.hidden) {
      portalInstance?.hide()
      hideTooltipBody()
      return
    }
    const complete = () => {
      portalInstance?.hide()
      currentElement.setAttribute('hidden', '')
      hideTooltipBody()
    }
    if (tooltipMotion?.hide(currentElement, options.motion, complete)) return
    complete()
  }

  function destroy() {
    hide()
    deactivateTooltipBody()
    portalInstance?.destroy()
    portalInstance = undefined
    portalExtension = undefined
    if (positionFrame !== undefined) {
      view?.cancelAnimationFrame?.(positionFrame)
      positionFrame = undefined
    }
    tooltipMotion?.destroy(element)
    resizeObserver?.disconnect()
    resizeObserver = undefined
    element?.remove()
    element = undefined
  }

  return {
    update,
    paint,
    hide,
    contains: (target) => Boolean(target && element?.contains(target as Node)),
    destroy,
  }
}

function samePointList(
  left: readonly ChartPoint[],
  right: readonly ChartPoint[],
) {
  return (
    left.length === right.length &&
    left.every(
      (point, index) =>
        point.key === right[index]?.key &&
        point.markId === right[index]?.markId &&
        point.datumIndex === right[index]?.datumIndex,
    )
  )
}

const customTooltipCardStyle = {
  maxWidth: 'none',
  padding: '0',
  border: 'none',
  borderRadius: '0',
  background: 'transparent',
  color: 'inherit',
  boxShadow: 'none',
  font: 'inherit',
}

const tooltipCardStyle = {
  maxWidth: 'var(--ts-chart-tooltip-max-width, min(24rem, 80%))',
  padding: 'var(--ts-chart-tooltip-padding, 0.4rem 0.55rem)',
  border:
    'var(--ts-chart-tooltip-border, 1px solid color-mix(in srgb, CanvasText 18%, transparent))',
  borderRadius: 'var(--ts-chart-tooltip-border-radius, 0.45rem)',
  background: 'var(--ts-chart-tooltip-background, Canvas)',
  color: 'var(--ts-chart-tooltip-color, CanvasText)',
  boxShadow: 'var(--ts-chart-tooltip-shadow, 0 6px 24px rgb(0 0 0 / 0.14))',
  font: 'var(--ts-chart-tooltip-font, 500 0.75rem/1.3 system-ui, sans-serif)',
}

function createTooltip(document: Document) {
  const tooltipElement = document.createElement('div')
  tooltipElement.className = 'ts-chart-tooltip'
  tooltipElement.setAttribute('role', 'status')
  tooltipElement.setAttribute('aria-live', 'polite')
  Object.assign(tooltipElement.style, {
    position: 'absolute',
    zIndex: '1',
    ...tooltipCardStyle,
    pointerEvents: 'none',
    overflowWrap: 'anywhere',
  })
  tooltipElement.hidden = true
  return tooltipElement
}

function paintPlainTooltip(tooltipElement: HTMLElement, text: string) {
  setTooltipContentAccessibility(tooltipElement, text)
  tooltipElement.textContent = text
}

function paintStructuredTooltip(
  tooltipElement: HTMLElement,
  content: ChartTooltipContent,
) {
  const document = tooltipElement.ownerDocument
  const children: HTMLElement[] = []
  if (content.title) {
    const title = document.createElement('div')
    title.className = 'ts-chart-tooltip__title'
    title.style.cssText = `display:flex;align-items:center;gap:.4rem;font-weight:650;margin-bottom:${content.rows.length ? '.3rem' : '0'}`
    if (content.color)
      title.append(createTooltipSwatch(document, content.color))
    title.append(content.title)
    children.push(title)
  }
  if (content.rows.length) {
    const rows = document.createElement('div')
    rows.className = 'ts-chart-tooltip__rows'
    rows.setAttribute('aria-hidden', 'true')
    for (const row of content.rows) {
      const line = document.createElement('div')
      line.className = 'ts-chart-tooltip__row'
      line.style.cssText =
        'display:grid;grid-template-columns:.55rem minmax(0,1fr) auto;align-items:center;column-gap:.4rem'
      line.dataset.active = String(row.active === true)
      if (row.active) {
        line.style.fontWeight =
          'var(--ts-chart-tooltip-active-row-font-weight, 700)'
        line.style.background =
          'var(--ts-chart-tooltip-active-row-background, color-mix(in srgb, currentColor 12%, transparent))'
        line.style.borderRadius =
          'var(--ts-chart-tooltip-active-row-border-radius, .2rem)'
        line.style.boxShadow =
          'var(--ts-chart-tooltip-active-row-shadow, 0 0 0 2px color-mix(in srgb, currentColor 12%, transparent))'
      }
      const swatch = row.color
        ? createTooltipSwatch(document, row.color)
        : document.createElement('span')
      const label = document.createElement('span')
      label.textContent = row.label
      const value = document.createElement('span')
      value.textContent = row.value
      value.style.cssText =
        'text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap'
      line.append(swatch, label, value)
      rows.append(line)
    }
    children.push(rows)
  }
  tooltipElement.replaceChildren(...children)
  setTooltipContentAccessibility(tooltipElement, content)
}

function setTooltipContentAccessibility(
  tooltipElement: HTMLElement,
  content: ChartTooltipContent | string,
) {
  if (typeof content === 'string') {
    tooltipElement.removeAttribute('aria-label')
    tooltipElement.style.whiteSpace = 'pre-wrap'
    return
  }
  tooltipElement.style.whiteSpace = 'normal'
  tooltipElement.setAttribute(
    'aria-label',
    [content.title, ...content.rows.map((row) => `${row.label}: ${row.value}`)]
      .filter(Boolean)
      .join('\n'),
  )
}

function configureTooltipSemantics(
  tooltipElement: HTMLElement,
  content: ChartTooltipContent | string,
  custom: boolean,
  pinned: boolean,
) {
  if (custom && typeof content === 'string') {
    tooltipElement.setAttribute('aria-label', content)
  }
  if (custom && pinned) {
    tooltipElement.setAttribute('role', 'dialog')
    tooltipElement.setAttribute('aria-modal', 'false')
    tooltipElement.removeAttribute('aria-live')
    return
  }
  tooltipElement.setAttribute('role', 'status')
  tooltipElement.setAttribute('aria-live', 'polite')
  tooltipElement.removeAttribute('aria-modal')
  if (!custom && typeof content === 'string') {
    tooltipElement.removeAttribute('aria-label')
  }
}

function createTooltipSwatch(document: Document, color: string) {
  const swatch = document.createElement('span')
  swatch.className = 'ts-chart-tooltip__swatch'
  swatch.setAttribute('aria-hidden', 'true')
  swatch.style.cssText =
    'display:block;width:.55rem;height:.55rem;border-radius:.15rem;box-shadow:inset 0 0 0 1px rgb(0 0 0/.12)'
  swatch.style.background = color
  return swatch
}
