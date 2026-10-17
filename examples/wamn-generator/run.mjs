import { run } from '../generator/run.mjs'
import { review, reviewServer } from './review.mjs'
export const applications = Object.fromEntries(
  ['original', 'review'].map((name) => [
    name,
    {
      label: name === 'original' ? 'Operator note' : 'Service note',
      value: 'Widget 0',
      server: (page) => reviewServer(page, name),
      review,
    },
  ]),
)
await run({
  root: new URL('.', import.meta.url),
  applications,
  hydration: process.argv.includes('--hydration'),
})
