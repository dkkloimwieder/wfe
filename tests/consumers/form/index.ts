// Generated from built declarations by tests/consumers/generate.mjs.
// Resolve only public package exports through the workspace node_modules links.
import type {
  createForm,
  FormBindings,
  FormContext,
  FormContract,
  FormErrors,
  FormOutcome,
  FormPhase,
  FormRepeatedErrors,
  FormReply,
  FormRowErrors,
  FormScalar,
  FormShape,
  FormSnapshot,
  FormValues,
  MaybePromise,
} from '@wfe/form'
import type { AllTyped, Assert } from '../assertions.js'

export type ExportedTypes = Assert<
  AllTyped<{
    createForm: typeof createForm
    FormBindings: FormBindings<{ id: string; value: string }>
    FormContext: FormContext
    FormContract: FormContract<{ id: string; value: string }>
    FormErrors: FormErrors<unknown>
    FormOutcome: FormOutcome
    FormPhase: FormPhase
    FormRepeatedErrors: FormRepeatedErrors<unknown>
    FormReply: FormReply<unknown>
    FormRowErrors: FormRowErrors<unknown>
    FormScalar: FormScalar
    FormShape: FormShape<{ id: string; value: string }>
    FormSnapshot: FormSnapshot<unknown>
    FormValues: FormValues
    MaybePromise: MaybePromise<unknown>
  }>
>
