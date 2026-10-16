export function restoreTextValue(
  element: HTMLInputElement | HTMLTextAreaElement,
  accepted: unknown,
) {
  if (accepted != null && element.value !== String(accepted))
    element.value = String(accepted)
}
