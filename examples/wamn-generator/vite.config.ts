import { fileURLToPath } from 'node:url'
import { exampleConfig } from '../vite-config.ts'

const config = exampleConfig(import.meta.url)
export default {
  ...config,
  resolve: {
    ...config.resolve,
    alias: [
      {
        find: /^@wamn\/web-runtime$/,
        replacement: fileURLToPath(
          new URL('../wamn/.input/runtime/index.ts', import.meta.url),
        ),
      },
    ],
  },
}
