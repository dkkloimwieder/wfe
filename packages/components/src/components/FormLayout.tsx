import { createUniqueId, omit, Show } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { styledClasses } from '../internal/classes'
import { nativeEventProps, ownedElementEvents } from '../internal/events'

export type FormColumns = 1 | 2 | 3
export type FormSpan = FormColumns | 'full'
export type FormGridProps = JSX.HTMLAttributes<HTMLDivElement> & {
  columns?: FormColumns
}

/** A container-responsive grid for fields or field groups. */
export function FormGrid(props: FormGridProps) {
  const attributes = omit(
    props,
    'columns',
    'children',
    'ref',
    ...nativeEventProps,
  )
  const events = ownedElementEvents(props)
  return (
    <div
      {...attributes}
      data-ui=""
      class={styledClasses('ui-form-layout', props.class)}
      ref={[props.ref, events]}
    >
      <div class="ui-form-grid" data-columns={props.columns ?? 1}>
        {props.children}
      </div>
    </div>
  )
}

export type FieldGroupProps = Omit<
  JSX.FieldsetHTMLAttributes<HTMLFieldSetElement>,
  'title'
> & {
  title: string
  help?: string
  columns?: FormColumns
  span?: FormSpan
}

/** A named native fieldset with a responsive field grid. */
export function FieldGroup(props: FieldGroupProps) {
  const helpId = `field-group-help-${createUniqueId()}`
  const attributes = omit(
    props,
    'title',
    'help',
    'columns',
    'span',
    'children',
    'ref',
    ...nativeEventProps,
  )
  const events = ownedElementEvents(props)
  return (
    <fieldset
      {...attributes}
      data-ui=""
      data-form-span={props.span ?? 1}
      aria-describedby={
        [props['aria-describedby'], props.help ? helpId : undefined]
          .filter(Boolean)
          .join(' ') || undefined
      }
      class={styledClasses('ui-field-set ui-field-group', props.class)}
      ref={[props.ref, events]}
    >
      <legend data-ui-text="system">{props.title}</legend>
      <Show when={props.help}>
        <div id={helpId} class="ui-help">
          {props.help}
        </div>
      </Show>
      <FormGrid columns={props.columns}>{props.children}</FormGrid>
    </fieldset>
  )
}
