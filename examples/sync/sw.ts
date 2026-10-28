// The worker entry of the gallery. The build replaces the manifest name with
// the list of built assets; see precacheManifest in vite.config.ts.
import { precache } from '@wfe/sync/worker'

declare const __PRECACHE_MANIFEST__: string[]

precache(__PRECACHE_MANIFEST__)
