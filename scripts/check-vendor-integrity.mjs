import { fileURLToPath } from 'node:url'
import { checkVendorIntegrity } from './lib/vendor-integrity.mjs'
import { checkRuntimePatches } from './lib/runtime-patches.mjs'
const root = fileURLToPath(new URL('../', import.meta.url))
console.log(
  JSON.stringify({
    vendor: await checkVendorIntegrity(root),
    patches: await checkRuntimePatches(root),
  }),
)
