import * as z from 'zod/mini'
import type { ScalarFieldDescription } from '@wfe/generator'

const labelSchema = z
  .string()
  .check(
    z.refine((label) => label.trim().length > 0, 'Labels must contain text'),
  )
const fieldSchema = z.strictObject({
  path: z.string().check(z.minLength(1)),
  type: z.enum(['text', 'boolean', 'int32']),
  nullable: z.boolean(),
  values: z.array(z.union([z.string(), z.boolean(), z.int32()])),
  label: z.optional(labelSchema),
})
const fieldsSchema = z.array(fieldSchema)
type Field = z.infer<typeof fieldSchema>
function fields(metadata: unknown, result: boolean) {
  const parsed = (
    result
      ? z.strictObject({ class: z.literal('one'), fields: fieldsSchema })
      : z.strictObject({ fields: fieldsSchema })
  ).parse(metadata)
  const indexed = new Map<string, Field>()
  for (const field of parsed.fields) {
    if (indexed.has(field.path))
      throw new Error(`Duplicate metadata path: ${field.path}`)
    const valueType =
      field.type === 'text'
        ? 'string'
        : field.type === 'boolean'
          ? 'boolean'
          : 'number'
    if (field.values.some((value) => typeof value !== valueType))
      throw new Error(`Invalid enum values: ${field.path}`)
    indexed.set(field.path, field)
  }
  return indexed
}
function take(indexed: Map<string, Field>, path: string) {
  const field = indexed.get(path)
  if (!field) throw new Error(`Unknown or repeated mapping: ${path}`)
  indexed.delete(path)
  return field
}
function complete(indexed: Map<string, Field>) {
  if (indexed.size)
    throw new Error(
      `Unmapped metadata paths: ${[...indexed.keys()].join(', ')}`,
    )
}

type InputDescription = Omit<
  ScalarFieldDescription<{ value: string }>,
  'field' | 'control'
> & {
  field: string
  control: 'text' | 'checkbox' | 'switch'
}
type ResolvedDescription<D> = D extends InputDescription
  ? Omit<D, 'label'> & { label: string }
  : never
export function metadataFormFields<const D extends InputDescription>(
  metadata: unknown,
  mappings: readonly { path: string; description: D }[],
  supplied: readonly string[],
): ResolvedDescription<D>[]
export function metadataFormFields(
  metadata: unknown,
  mappings: readonly { path: string; description: InputDescription }[],
  supplied: readonly string[],
): (InputDescription & { label: string })[] {
  const indexed = fields(metadata, false)
  for (const field of indexed.values())
    if (field.nullable)
      throw new Error(`Unsupported nullable input: ${field.path}`)
  for (const path of indexed.keys()) {
    if (!/^(?:value\.)?[a-zA-Z_][a-zA-Z0-9_]*$/.test(path))
      throw new Error(`Unsupported input path: ${path}`)
  }
  for (const path of supplied) take(indexed, path)
  const keys = new Set<string>()
  const descriptions = mappings.map(({ path, description }) => {
    const field = take(indexed, path)
    if (keys.has(description.field))
      throw new Error(`Duplicate form field: ${description.field}`)
    keys.add(description.field)
    const expected = description.control === 'text' ? 'text' : 'boolean'
    if (field.type !== expected || field.values.length)
      throw new Error(`Unsupported input control: ${path}`)
    return {
      ...description,
      label: labelSchema.parse(
        description.label ?? field.label ?? description.field,
      ),
    }
  })
  complete(indexed)
  return descriptions
}

export function metadataTableColumns<const K extends string>(
  metadata: unknown,
  root: string,
  mappings: Readonly<Record<K, { path: string; label?: string }>>,
  envelope: readonly string[] = [],
): Record<K, { label: string }> {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(root))
    throw new Error(`Unsupported list root: ${root}`)
  const indexed = fields(metadata, true)
  for (const path of envelope) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(path))
      throw new Error(`Unsupported envelope path: ${path}`)
    take(indexed, path)
  }
  for (const field of indexed.values())
    if (field.nullable)
      throw new Error(`Unsupported nullable column: ${field.path}`)
  const prefix = `${root}[].`
  for (const path of indexed.keys()) {
    if (
      !path.startsWith(prefix) ||
      !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(path.slice(prefix.length))
    )
      throw new Error(`Unsupported result path: ${path}`)
  }
  // Object.keys preserves the mapping's own string keys at runtime.
  const keys = Object.keys(mappings) as K[]
  const columns = Object.fromEntries(
    keys.map((key) => {
      const mapping = mappings[key]
      const field = take(indexed, mapping.path)
      return [
        key,
        { label: labelSchema.parse(mapping.label ?? field.label ?? key) },
      ]
    }),
  ) as Record<K, { label: string }>
  complete(indexed)
  return columns
}
