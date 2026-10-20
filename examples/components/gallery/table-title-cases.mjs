import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function tableTitleCases({ page, url, record }) {
  await record(
    'table title: full pane, fixed header height and inert accent decoration',
    async () => {
      for (const scheme of [1, 2]) {
        for (const width of [1280, 390]) {
          await page.setViewportSize({ width, height: 900 })
          await page.goto(`${url}?galleryPreview=table&scheme=${scheme}`)
          const table = page.locator('.table-workspace')
          const title = table.locator('.table-workspace-title-face')
          await expect(title).toHaveText('Records')
          const dimensions = await table.boundingBox()
          assert.deepEqual(dimensions, { x: 0, y: 0, width, height: 900 })
          await expect(table).toHaveCSS('overflow', 'visible')
          const header = table.locator('.table-workspace-header')
          assert.equal((await header.boundingBox()).height, 31)
          assert.equal((await title.boundingBox()).height, 26)
          assert.equal(await title.getAttribute('role'), null)
          assert.equal(await title.getAttribute('tabindex'), null)
          await expect(title).toHaveCSS('cursor', 'default')
          const paint = await title.evaluate((node) => {
            const style = getComputedStyle(node)
            const backing = getComputedStyle(node, '::before')
            const header = node.closest('.table-workspace-header')
            return {
              text: style.color,
              neutral: style.getPropertyValue('--ui-sidebar-neutral').trim(),
              header: getComputedStyle(header).backgroundImage,
              pattern: backing.backgroundImage,
              opacity: backing.opacity,
              inset: backing.top,
              overflow: getComputedStyle(node.parentElement).overflow,
              angle: style.getPropertyValue('--ui-action-angle'),
            }
          })
          assert.match(paint.header, /radial-gradient/)
          assert.match(paint.pattern, /radial-gradient/)
          assert.notEqual(paint.header, paint.pattern)
          assert.equal(paint.opacity, '0')
          assert.equal(paint.inset, '-6px')
          assert.equal(paint.overflow, 'visible')
          assert.notEqual(paint.angle, '')
          await title
            .locator('.table-workspace-title-text')
            .evaluate((node) => {
              const heading = document.createElement('h2')
              heading.textContent = 'A deliberately long table title '.repeat(
                12,
              )
              node.replaceChildren(heading)
            })
          await expect(title.getByRole('heading', { level: 2 })).toBeVisible()
          await title.hover()
          assert.equal(
            await title.evaluate(
              (node) => getComputedStyle(node, '::before').opacity,
            ),
            '1',
          )
          for (const angle of ['-2.25deg', '2.25deg']) {
            const bounds = await title.evaluate((node, angle) => {
              node.style.setProperty('--ui-action-angle', angle)
              node.style.setProperty('--ui-action-taper', '1.75deg')
              node.style.setProperty('--ui-action-taper-y', '-1.75deg')
              const p = getComputedStyle(node, '::before')
              const style = getComputedStyle(node)
              const box = node.getBoundingClientRect()
              const origin = p.transformOrigin.split(' ').map(parseFloat)
              const matrix = new DOMMatrix(p.transform)
              const width = parseFloat(p.width),
                height = parseFloat(p.height)
              const y =
                box.top + parseFloat(style.borderTopWidth) + parseFloat(p.top)
              const ys = [
                [0, 0],
                [width, 0],
                [width, height],
                [0, height],
              ].map(([x, dy]) => {
                const point = new DOMPoint(
                  x - origin[0],
                  dy - origin[1],
                ).matrixTransform(matrix)
                return y + origin[1] + point.y / point.w
              })
              const header = node.closest('header').getBoundingClientRect()
              return {
                top: Math.min(...ys),
                bottom: Math.max(...ys),
                headerTop: header.top,
                headerBottom: header.bottom,
              }
            }, angle)
            assert.ok(bounds.top < bounds.headerTop, JSON.stringify(bounds))
            assert.ok(
              bounds.bottom > bounds.headerBottom,
              JSON.stringify(bounds),
            )
          }
          assert.equal((await header.boundingBox()).height, 31)
          assert.equal(
            await page.evaluate(() => document.documentElement.scrollWidth),
            width,
          )
          if (width === 390) {
            await table
              .getByRole('button', { name: 'Table controls', exact: true })
              .click()
            const close = table.getByRole('button', {
              name: 'Close table controls',
              exact: true,
            })
            await expect(close).toBeVisible()
            await close.click()
            await expect(close).not.toBeVisible()
          }
        }
      }
      for (const [scheme, width] of [
        [1, 1280],
        [2, 1280],
        [1, 390],
        [2, 390],
      ]) {
        await page.setViewportSize({ width, height: 900 })
        await page.goto(`${url}?gallery=table&scheme=${scheme}`)
        const title = page
          .locator('.gallery-example-host')
          .locator('.table-workspace-title-face')
        await expect(title).toBeVisible()
        await expect(page.locator('iframe')).toHaveCount(0)
        const geometry = await title.evaluate((node) => {
          const face = node.getBoundingClientRect()
          const backing = getComputedStyle(node, '::before')
          const matrix = new DOMMatrix(backing.transform)
          const origin = backing.transformOrigin.split(' ').map(parseFloat)
          const width = parseFloat(backing.width),
            height = parseFloat(backing.height)
          const points = [
            [0, 0],
            [width, 0],
            [width, height],
            [0, height],
          ].map(([x, y]) => {
            const p = new DOMPoint(
              x - origin[0],
              y - origin[1],
            ).matrixTransform(matrix)
            return (
              face.top +
              parseFloat(getComputedStyle(node).borderTopWidth) +
              parseFloat(backing.top) +
              origin[1] +
              p.y / p.w
            )
          })
          const top = Math.min(...points),
            bottom = Math.max(...points)
          const clippedBy = []
          for (
            let parent = node.parentElement;
            parent;
            parent = parent.parentElement
          ) {
            const box = parent.getBoundingClientRect()
            if (
              getComputedStyle(parent).overflowY !== 'visible' &&
              (top < box.top || bottom > box.bottom)
            )
              clippedBy.push(parent.className)
          }
          const table = node.closest('.table-workspace').getBoundingClientRect()
          const stage = node.closest('.gallery-stage').getBoundingClientRect()
          const toolbar = document
            .querySelector('.gallery-toolbar')
            .getBoundingClientRect()
          return {
            top,
            bottom,
            headerTop: node.closest('header').getBoundingClientRect().top,
            clippedBy,
            topGap: table.top - stage.top,
            toolbarGap: stage.top - toolbar.bottom,
            width: table.width,
            stageWidth: stage.width,
          }
        })
        assert.deepEqual(geometry.clippedBy, [], JSON.stringify(geometry))
        assert.ok(
          geometry.top >= 0 && geometry.top < geometry.headerTop,
          JSON.stringify(geometry),
        )
        assert.equal(geometry.topGap, 0)
        assert.equal(geometry.toolbarGap, 0)
        assert.equal(geometry.width, geometry.stageWidth)
        const paint = (locator) =>
          locator.evaluate((node) => {
            const style = getComputedStyle(node, '::before')
            return { dots: style.backgroundImage, border: style.borderColor }
          })
        const expected = await paint(title)
        const navigation = page.getByRole('navigation', {
          name: 'Component catalog',
        })
        if (!(await navigation.isVisible()))
          await page
            .getByRole('button', { name: 'Components', exact: true })
            .click()
        const selected = page
          .getByRole('navigation', { name: 'Component catalog' })
          .locator('a[aria-current="page"]')
        const inner = await paint(selected)
        assert.notEqual(inner.dots, expected.dots)
        assert.notEqual(inner.border, expected.border)
        assert.equal(
          inner.dots,
          await title.evaluate(
            (node) => getComputedStyle(node.closest('header')).backgroundImage,
          ),
        )
        const outer = await paint(
          page.locator('.ui-sidebar-group .ui-button').first(),
        )
        assert.equal(outer.dots, expected.dots)
        assert.equal(outer.border, expected.border)
        const titleBorder = await title.evaluate((node) => {
          const reference = document.createElement('span')
          reference.style.color =
            'color-mix(in srgb, var(--ui-sidebar-accent) var(--ui-decoration-border-opacity, 20%), transparent)'
          node.append(reference)
          const color = getComputedStyle(reference).color
          reference.remove()
          return color
        })
        assert.equal(expected.border, titleBorder)
      }
    },
  )
}
