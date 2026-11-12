import { reviewDiagram } from '../../shared/diagrams/review.mjs'
export async function diagramCases({ url, record, reviewPage }) {
  for (const kind of ['workflow', 'erd'])
    for (const preset of ['default', 'vanilla', 'laser'])
      for (const scheme of [1, 2])
        await record(`gallery: diagram ${kind} ${preset} ${scheme}`, () =>
          reviewPage(async (page) => {
            await page.setViewportSize({
              width: scheme === 2 ? 390 : 1280,
              height: 1000,
            })
            await page.goto(
              `${url}?gallery=${kind}&preset=${preset}&scheme=${scheme}`,
            )
            await reviewDiagram(page, kind)
          }),
        )
}
