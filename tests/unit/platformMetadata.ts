import { z } from 'zod'

export const operationMetadata = z.object({
  operation: z.string(),
  type: z.string(),
  result: z.string(),
  transaction: z.string(),
})
export const errorMetadata = z.object({
  cases: z.array(z.object({ literal: z.string() })),
})
export const fieldMetadata = z.object({
  fields: z.array(z.object({ path: z.string() })),
})
export const resultMetadata = z.object({
  fields: z.array(
    z.object({
      path: z.string(),
      type: z.enum(['text', 'boolean', 'uuid', 'int32']),
      nullable: z.boolean(),
      values: z.array(z.union([z.string(), z.number(), z.boolean()])),
    }),
  ),
})
