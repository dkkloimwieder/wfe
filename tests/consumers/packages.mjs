import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = fileURLToPath(new URL('../../', import.meta.url))
export const packages = [
  'components',
  'form',
  'generator',
  'shell',
  'sync',
].map((name) => {
  const directory = resolve(root, 'packages', name)
  const manifest = JSON.parse(
    readFileSync(resolve(directory, 'package.json'), 'utf8'),
  )
  return { name, directory, manifest }
})
