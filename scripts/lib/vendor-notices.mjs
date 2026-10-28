import assert from 'node:assert/strict'
import { copyFile, mkdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

/** Package-relative source paths; retain separate notices even when bytes match. */
export const vendorNotices = {
  kobalte: [
    'vendor/kobalte/LICENSE.md',
    'vendor/kobalte/core/LICENSE.md',
    'vendor/kobalte/utils/LICENSE.md',
  ],
  calendar: ['vendor/corvu-calendar/LICENSE'],
  virtual: ['vendor/virtual-core/LICENSE'],
  charts: ['vendor/charts/LICENSE'],
  matching: [
    'vendor/match-sorter/LICENSE',
    'vendor/match-sorter/LICENSE-remove-accents',
  ],
  icons: ['vendor/icons/LICENSE'],
  dnd: ['vendor/dnd-kit/LICENSE'],
}
export const vendorNoticePaths = Object.values(vendorNotices).flat()
// Compiled and preserved JSX modules share the flat directory.
export const componentDeliveryModes = ['', 'server']

export async function copyVendorNotices(source, outputs) {
  for (const path of vendorNoticePaths) {
    for (const output of outputs) {
      const destination = resolve(output, path)
      await mkdir(dirname(destination), { recursive: true })
      await copyFile(resolve(source, path), destination)
    }
  }
}

/** Used for both dist-only directories and an extracted local package archive. */
export async function verifyVendorNotices(source, outputs) {
  for (const path of vendorNoticePaths) {
    const original = await readFile(resolve(source, path))
    for (const output of outputs) {
      const delivered = await readFile(resolve(output, path))
      assert.deepEqual(
        delivered,
        original,
        `Vendor notice bytes differ: ${resolve(output, path)}`,
      )
    }
  }
}
