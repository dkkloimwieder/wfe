/* global window */
import { action, createRoot, onCleanup, onSettled, flush } from 'solid-js'
class RetentionRecord {
  constructor(id) {
    this.id = id
    this.value = 'initial'
    this.retentionMarker = 'pending-repro'
  }
}
let release
const counts = { setups: 0, cleanups: 0, value: 0 }
// eslint-disable-next-line require-yield -- Match the original synchronous action boundary.
const disposeRoot = action(function* () {
  release?.()
})
window.repro = {
  start(mode, size) {
    counts.setups = 0
    counts.cleanups = 0
    counts.value = 0
    createRoot((dispose) => {
      release = dispose
      const records = Array.from(
        { length: size },
        (_, i) => new RetentionRecord(i),
      )
      if (mode === 'settled') {
        onSettled(() => {
          counts.setups++
          counts.value = records.length
          return () => {
            counts.cleanups++
            counts.value = records.length
          }
        })
      } else if (mode === 'settled-no-cleanup') {
        onSettled(() => {
          counts.setups++
          counts.value = records.length
        })
        onCleanup(() => counts.cleanups++)
      } else {
        counts.setups++
        counts.value = records.length
        onCleanup(() => {
          counts.cleanups++
          counts.value = records.length
        })
      }
    })
    flush()
  },
  inspect() {
    return { ...counts }
  },
  settle() {
    flush()
  },
  dispose(method) {
    if (method === 'action') disposeRoot()
    else release?.()
    release = undefined
    flush()
    return { ...counts }
  },
}
