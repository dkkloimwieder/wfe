import assert from 'node:assert/strict'

/** Both editing fixtures use the same owned table and control families. */
export function assertEditingControlModules(modules) {
  assert.ok(
    !modules.some((path) =>
      /table-core|@tanstack\/store|virtual-core|solid-form|node_modules\/@kobalte\/|sonner|lucide/.test(
        path,
      ),
    ),
    'editing uses owned controls rather than external or replaced implementations',
  )
  const owned = modules.filter((path) => path.includes('/vendor/kobalte/'))
  assert.ok(
    owned.some((path) => /\/checkbox-root\.(tsx|jsx)$/.test(path)),
    'boolean filters use the owned shared checkbox',
  )
  assert.ok(
    owned.every((path) =>
      /\/utils\/src\/|\/core\/src\/(button|checkbox|dismissable-layer|form-control|i18n|list|listbox|polymorphic|popper|popover|select|selection)\/|\/core\/src\/primitives\/(create-collection|create-disclosure-state|create-register-id|create-tag-name|create-toggle-state)\//.test(
        path,
      ),
    ),
    'editing retains shared checkbox, select, and date-picker popover behavior with their support modules',
  )
}
