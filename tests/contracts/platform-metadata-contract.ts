import type { FormDescription } from '@wfe/generator'
import {
  metadataFormFields,
  metadataTableColumns,
} from '../../examples/platform/metadata-description'

declare const metadata: unknown
const fields = metadataFormFields(
  metadata,
  [
    {
      path: 'value.name',
      description: { field: 'name', control: 'text', label: undefined },
    },
    {
      path: 'value.enabled',
      description: { field: 'enabled', control: 'switch' },
    },
  ],
  ['request_id'],
)
const form = { id: 'example', fields } satisfies FormDescription<{
  name: string
  enabled: boolean
}>
for (const field of fields) {
  const label: string = field.label
  if (field.field === 'enabled') {
    const control: 'switch' = field.control
    void control
  } else {
    const control: 'text' = field.control
    void control
  }
  void label
}
const checkbox = metadataFormFields(
  metadata,
  [{ path: 'name', description: { field: 'name', control: 'checkbox' } }],
  [],
)
const badText = {
  id: 'bad',
  // @ts-expect-error A checkbox cannot edit a string field.
  fields: checkbox,
} satisfies FormDescription<{ name: string }>
const text = metadataFormFields(
  metadata,
  [{ path: 'enabled', description: { field: 'enabled', control: 'text' } }],
  [],
)
const badBoolean = {
  id: 'bad',
  // @ts-expect-error A text input cannot edit a boolean field.
  fields: text,
} satisfies FormDescription<{ enabled: boolean }>
const badEnum = {
  id: 'bad',
  // @ts-expect-error A free-text control cannot edit a string literal union.
  fields: text,
} satisfies FormDescription<{ enabled: 'yes' | 'no' }>
const columns = metadataTableColumns(metadata, 'rows', {
  name: { path: 'rows[].name' },
})
const name: string = columns.name.label
// @ts-expect-error Unmapped columns are not part of the result.
void columns.missing
void [form, badText, badBoolean, badEnum, name]
