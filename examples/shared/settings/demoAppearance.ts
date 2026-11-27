import { createSignal, onSettled } from 'solid-js'
import type { ThemePreset } from '@wfe/components/theme'
import type { SchemeSetting } from './SettingsStore'
import { useDemoSetting } from './useDemoSetting'
import { demoSettings } from './demoSettings'

export const demoThemeChoices = [
  { value: 'default', label: 'Sketchy' },
  { value: 'vanilla', label: 'Vanilla' },
  { value: 'laser', label: 'Laser' },
] as const

export type AppearanceChoice = SchemeSetting | 'monochrome'

export const schemeIndex = { monochrome: 0, light: 1, dark: 2 } as const
export function previewScheme(
  value: string | null,
): keyof typeof schemeIndex | undefined {
  if (value === null || !/^\d+$/.test(value)) return undefined
  return (['monochrome', 'light', 'dark'] as const)[Number(value)]
}

export function useDemoAppearance() {
  const preset = useDemoSetting('theme', 'default')
  const savedScheme = useDemoSetting('scheme', undefined)
  const [systemDark, setSystemDark] = createSignal(false)
  const [failure, setFailure] = createSignal('')

  onSettled(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => setSystemDark(media.matches)
    media.addEventListener('change', update)
    update()
    return () => media.removeEventListener('change', update)
  })

  const resolveMode = (choice: AppearanceChoice) =>
    choice === 'system' ? (systemDark() ? 'dark' : 'light') : choice

  async function persist(write: () => Promise<void>) {
    try {
      await write()
      setFailure('')
      return true
    } catch {
      setFailure('Could not save the appearance.')
      return false
    }
  }

  return {
    preset,
    savedScheme,
    resolveMode,
    failure,
    savePreset: (value: ThemePreset) =>
      persist(() => demoSettings.set('theme', value)),
    saveScheme: (value: SchemeSetting) =>
      persist(() => demoSettings.set('scheme', value)),
  }
}
