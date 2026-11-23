import groups from './variant-groups.json' with { type: 'json' }

export const variantGroups = Object.keys(groups)

export function variantPages() {
  return ['light', 'dark'].flatMap((mode) =>
    variantGroups.map((group) => ({ group, mode })),
  )
}

export async function openVariants(page, url, group, mode, { allFocus } = {}) {
  const target = new URL(url)
  target.searchParams.set('variants', group)
  target.searchParams.set('mode', mode)
  if (allFocus) target.searchParams.set('audit-all-focus', '')
  await page.goto(target.href)
  await page.locator('[data-variants-ready]').waitFor({
    state: 'attached',
    timeout: 45_000,
  })
}
