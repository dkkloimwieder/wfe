export function restoreTextValue(
  element: HTMLInputElement | HTMLTextAreaElement,
  accepted: string | number | readonly string[] | undefined,
) {
  if (accepted == null) return
  const text = String(accepted)
  if (element.value !== text) element.value = text
}
