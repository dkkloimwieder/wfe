import type { DatePickerMessages } from '../components/dateMessages'
import { resolveTableMessages } from './messages'
import { ownsFocus } from '../internal/ownedFocus'
import { Icon } from '../components/Icon'
import {
  Show,
  createEffect,
  createSignal,
  createUniqueId,
  onCleanup,
} from 'solid-js'
import { Button } from '../components/NativeFields'
import { nativeEvents } from '../utils/nativeEvents'
import { TableColumnFilter } from './TableColumnFilter'
import type {
  TableColumnFilterProps,
  TableColumnFilterConfig,
  ConfiguredTableColumnFilterProps,
} from './TableColumnFilter'
import type { JSX } from '@solidjs/web'
import { TableFilter } from './TableFilter'
import type { TableFilterProps } from './TableFilter'

export type TableHeaderFilterProps = (
  | TableColumnFilterProps
  | TableColumnFilterProps<{ kind: 'boolean' }>
  | TableColumnFilterProps<{ kind: 'date-range' }>
  | TableColumnFilterProps<TableColumnFilterConfig>
  | (TableFilterProps & { config?: undefined })
) & {
  datePickerMessages?: Partial<DatePickerMessages>
  columnId: string
  columnLabel: string
  triggerRef?: (node: HTMLButtonElement) => void
  onRemovalFocus?: () => void
}

type HeaderFilterOptions = Pick<
  TableHeaderFilterProps,
  | 'columnId'
  | 'columnLabel'
  | 'triggerRef'
  | 'onRemovalFocus'
  | 'datePickerMessages'
>

// Keep overloads in a type so development compilation emits one component.
type TableHeaderFilterComponent = {
  (
    props: TableFilterProps & { config?: undefined } & HeaderFilterOptions,
  ): JSX.Element
  <const C extends TableColumnFilterConfig>(
    props: ConfiguredTableColumnFilterProps<C> & HeaderFilterOptions,
  ): JSX.Element
}

export const TableHeaderFilter: TableHeaderFilterComponent = (
  props: TableHeaderFilterProps,
) => {
  const messages = resolveTableMessages(() => props.messages)
  const canonical = () => props.config !== undefined
  const active = () =>
    canonical() ? props.value !== undefined : Boolean(props.value)
  const columnProps = () =>
    props as ConfiguredTableColumnFilterProps<TableColumnFilterConfig>
  const legacyProps = () => props as TableFilterProps
  const popupId = createUniqueId()
  const statusId = createUniqueId()
  const [open, setOpen] = createSignal(false)
  let trigger: HTMLButtonElement | undefined
  let popup: HTMLDivElement | undefined
  let control: HTMLInputElement | HTMLButtonElement | undefined

  function position() {
    if (!trigger || !popup) return
    const anchor = trigger.getBoundingClientRect()
    const box = popup.getBoundingClientRect()
    popup.style.left = `${Math.max(8, Math.min(anchor.left, innerWidth - box.width - 8))}px`
    const top =
      anchor.bottom + 4 + box.height <= innerHeight - 8
        ? anchor.bottom + 4
        : anchor.top - box.height - 4
    popup.style.top = `${Math.max(8, Math.min(top, innerHeight - box.height - 8))}px`
  }
  function close(restoreFocus = false) {
    if (!popup?.matches(':popover-open')) return
    popup.hidePopover()
    if (restoreFocus && trigger && !trigger.disabled)
      trigger.focus({ preventScroll: true })
  }
  function toggle() {
    if (props.disabled || !popup) return
    if (popup.matches(':popover-open')) close(true)
    else {
      popup.showPopover()
      position()
      const target =
        (control?.isConnected ? control : undefined) ??
        popup.querySelector<HTMLElement>(
          '.header-filter-popup-body input:not(:disabled)',
        ) ??
        popup.querySelector<HTMLElement>(
          '.header-filter-popup-body [role=combobox]:not(:disabled), .header-filter-popup-body button:not(:disabled)',
        )
      target?.focus({ preventScroll: true })
    }
  }
  createEffect(
    () => Boolean(props.disabled),
    (disabled) => {
      if (disabled) close()
    },
  )
  createEffect(open, (opened) => {
    if (!opened) return
    window.addEventListener('resize', position)
    document.addEventListener('scroll', position, true)
    return () => {
      window.removeEventListener('resize', position)
      document.removeEventListener('scroll', position, true)
    }
  })
  onCleanup(() => {
    if (!popup || !trigger) return
    if (ownsFocus(popup) || document.activeElement === trigger)
      props.onRemovalFocus?.()
  })
  return (
    <span class="header-filter">
      <Button
        type="button"
        class="header-filter-trigger"
        data-header-filter={props.columnId}
        data-filtered={active() ? 'true' : undefined}
        aria-label={messages.filter(props.columnLabel)}
        aria-describedby={active() ? statusId : undefined}
        aria-haspopup="dialog"
        aria-expanded={open() ? 'true' : 'false'}
        aria-controls={popupId}
        title={messages.filterTitle(props.columnLabel, active())}
        disabled={props.disabled}
        ref={[
          (node) => {
            trigger = node
            props.triggerRef?.(node)
          },
          nativeEvents<HTMLButtonElement>({ click: toggle }),
        ]}
      >
        <Icon name="filter" />
      </Button>
      <Show when={active()}>
        <span id={statusId} class="sr-only">
          {messages.filterActive}
        </span>
      </Show>
      <div
        ref={[
          (node) => {
            popup = node
          },
          nativeEvents<HTMLDivElement>({
            beforetoggle: (event) => {
              setOpen((event as ToggleEvent).newState === 'open')
            },
            keydown: (event) => {
              if (
                event.defaultPrevented ||
                event.isComposing ||
                event.keyCode === 229
              )
                return
              if (
                event.key === 'Escape' ||
                (event.key === 'Enter' &&
                  event.target instanceof HTMLInputElement)
              ) {
                event.preventDefault()
                event.stopPropagation()
                close(true)
              }
            },
            focusout: (event) => {
              const node = event.currentTarget
              if (
                event.relatedTarget instanceof Node &&
                ownsFocus(node, event.relatedTarget)
              )
                return
              queueMicrotask(() => {
                if (!ownsFocus(node) && document.activeElement !== trigger)
                  close()
              })
            },
          }),
        ]}
        id={popupId}
        data-header-filter-popup={props.columnId}
        class="header-filter-popup"
        popover="auto"
        role="dialog"
        aria-label={messages.filter(props.columnLabel)}
      >
        <Button
          type="button"
          class="header-filter-close"
          aria-label={messages.closeFilter(props.columnLabel)}
          ref={nativeEvents({ click: () => close(true) })}
        >
          <span aria-hidden="true">×</span>
        </Button>
        <div class="header-filter-popup-body">
          <Show
            when={canonical()}
            fallback={
              <TableFilter
                {...legacyProps()}
                controlRef={(node) => {
                  control = node
                  legacyProps().controlRef?.(node)
                }}
                onEscape={() => close(true)}
              />
            }
          >
            <TableColumnFilter
              {...columnProps()}
              onEscape={() => close(true)}
            />
          </Show>
        </div>
      </div>
    </span>
  )
}
