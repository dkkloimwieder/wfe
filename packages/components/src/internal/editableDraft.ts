import { createEffect, createMemo, createSignal, untrack } from 'solid-js'

/** A formatted draft resets only when its accepted presentation changes. */
export function createEditableDraft(
  presentation: () => readonly [string, ...unknown[]],
  onPresentationChange?: () => void,
) {
  const accepted = createMemo(presentation, {
    equals: (left, right) =>
      left.length === right.length &&
      left.every((value, index) => value === right[index]),
  })
  const [draft, setDraft] = createSignal(untrack(() => accepted()[0]))
  createEffect(accepted, ([value]) => {
    setDraft(value)
    onPresentationChange?.()
  })
  return [draft, setDraft] as const
}

/** Keep native draft validity and coordinator notifications in one place. */
export function createDraftValidity(options: {
  input: () => HTMLInputElement | undefined
  invalid: () => boolean
  locked: () => boolean
  message: () => string
  // Pickers preserve their error on lock; validity notifications still allow it.
  nativeWhenLocked: 'preserve' | 'clear'
  onValidityChange: (valid: boolean) => void
}) {
  createEffect(
    () =>
      (options.nativeWhenLocked === 'clear' && options.locked()) ||
      !options.invalid()
        ? ''
        : options.message(),
    (message) => options.input()?.setCustomValidity(message),
  )
  const valid = createMemo(() => options.locked() || !options.invalid())
  createEffect(valid, (value) => {
    untrack(() => options.onValidityChange(value))
  })
}
