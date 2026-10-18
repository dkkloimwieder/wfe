import { mergeConfig } from 'vite'
import { exampleConfig } from '../vite-config.ts'
export default mergeConfig(exampleConfig(import.meta.url), {
  // Keep every fixture style attached for the shared CSS provenance checks.
  build: { cssCodeSplit: false },
})
