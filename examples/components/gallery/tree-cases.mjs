import { expect } from '@playwright/test'
export async function treeCases({ url, record, reviewPage }) {
  for (const preset of ['default', 'vanilla', 'laser']) {
    for (const scheme of [1, 2]) {
      await record(
        `gallery: tree ${preset} scheme ${scheme} selection and keyboard navigation`,
        () =>
          reviewPage(async (page) => {
            await page.setViewportSize({
              width: scheme === 2 ? 390 : 1280,
              height: 1000,
            })
            await page.goto(
              `${url}?gallery=tree&preset=${preset}&scheme=${scheme}`,
            )
            const tree = page.getByRole('tree', { name: 'Files' })
            const alpha = tree.getByRole('treeitem', {
              name: 'Alpha',
              exact: true,
            })
            await alpha.focus()
            await alpha.press('ArrowRight')
            await expect(
              tree.getByRole('treeitem', { name: 'Notes', exact: true }),
            ).toBeVisible()
            await alpha.press('Enter')
            await expect(alpha).toHaveAttribute('aria-selected', 'true')
            await expect(
              page.locator('[aria-label="Single select"]'),
            ).toHaveCount(0)
            await expect(
              page.locator('[aria-label="Multiselect"]'),
            ).toHaveCount(0)
            await expect(
              page.getByText('Theme comparison', { exact: true }),
            ).toHaveCount(0)
            expect(
              await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
              ),
            ).toBe(true)
          }),
      )
    }
  }
}
