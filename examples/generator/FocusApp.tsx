import { exampleSizing } from '../shared/appearance/sizing'
import { createSignal } from 'solid-js'
import { Input, Button } from '@wfe/components'
import { createForm } from '@wfe/form'
import { FormView, LayoutView } from '@wfe/generator'
import type { FormDescription, LayoutDescription } from '@wfe/generator'
export function createFocusApplication() {
  const [values, setValues] = createSignal({
    title: 'Focused title',
    notes: 'Focused notes',
    extra: 'Focused extra',
  })
  const [fieldsReversed, setFieldsReversed] = createSignal(false)
  const [panelsReversed, setPanelsReversed] = createSignal(false)
  const [removed, setRemoved] = createSignal(false)
  const [disabled, setDisabled] = createSignal(false)
  const form = createForm({
    values,
    defaults: values,
    onValuesChange: setValues,
    validate: () => ({}),
    onSubmit: () => ({ ok: true }),
  })
  const Custom = (props: {
    id: string
    value: string
    disabled: boolean
    onValueChange: (value: string) => void
  }) => (
    <Input
      id={props.id}
      value={props.value}
      disabled={props.disabled}
      onValueChange={props.onValueChange}
    />
  )
  const formDescription = () => {
    const fields = [
      { field: 'title', label: 'Title', control: 'text' },
      { field: 'notes', label: 'Notes', control: 'textarea' },
      { field: 'extra', label: 'Extra', control: 'custom' },
    ] as const
    return {
      id: 'focus-form',
      fields: removed()
        ? []
        : fieldsReversed()
          ? [...fields].reverse()
          : fields,
    } as const satisfies FormDescription<ReturnType<typeof values>>
  }
  const Editor = () => (
    <FormView
      description={formDescription()}
      bindings={{ form, fields: { extra: Custom }, disabled }}
    />
  )
  const Other = () => <Button id="focus-elsewhere">Elsewhere</Button>
  const layoutDescription = () => {
    const panels = [
      { id: 'focus-editor', view: 'editor' },
      { id: 'focus-other', view: 'other' },
    ] as const
    return {
      id: 'focus-layout',
      title: 'Reorder focus',
      panels: panelsReversed() ? [...panels].reverse() : panels,
    } as const satisfies LayoutDescription<'editor' | 'other'>
  }
  return {
    kind: 'focus' as const,
    form,
    Editor,
    Other,
    layoutDescription,
    moveFields: setFieldsReversed,
    movePanels: setPanelsReversed,
    disable: setDisabled,
    revise() {
      setFieldsReversed((old) => !old)
      setPanelsReversed((old) => !old)
    },
    remove() {
      setRemoved(true)
    },
    snapshot: () => ({ values: values(), phase: form.phase }),
  }
}
export function FocusApp(props: {
  ready?: (app: ReturnType<typeof createFocusApplication>) => void
}) {
  const app = createFocusApplication()
  props.ready?.(app)
  return (
    <LayoutView
      style={exampleSizing}
      description={app.layoutDescription()}
      bindings={{ views: { editor: app.Editor, other: app.Other } }}
    />
  )
}
