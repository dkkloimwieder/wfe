import { createMemo, createSignal } from 'solid-js'
import type { ThemePreset } from '@wfe/components/theme'
import {
  schemeIndex,
  useDemoAppearance,
} from '../../shared/settings/demoAppearance'
import type { AppearanceChoice } from '../../shared/settings/demoAppearance'
import { presetDefaults } from '../../shared/appearance/appearance'
import { galleryOverrides, readRoute } from './catalog'

export function useGalleryAppearance() {
  const [url, setUrl] = createSignal(new URL(window.location.href))
  const appearance = useDemoAppearance()
  const overrides = createMemo(() => galleryOverrides(url()))
  const preset = () => overrides().preset ?? appearance.preset()
  const choice = (): AppearanceChoice => {
    const { scheme, preset } = overrides()
    // Earlier direct links used the preset's mode when they omitted the scheme.
    return (
      scheme ??
      appearance.savedScheme() ??
      (preset ? presetDefaults[preset].mode : 'system')
    )
  }
  const mode = () => appearance.resolveMode(choice())
  const route = createMemo(() =>
    readRoute(url(), { preset: preset(), scheme: schemeIndex[mode()] }),
  )

  function replaceUrl(change: (params: URLSearchParams) => void) {
    const next = new URL(window.location.href)
    change(next.searchParams)
    if (next.href !== window.location.href)
      window.history.replaceState(null, '', next)
    setUrl(next)
  }

  async function setPreset(value: ThemePreset) {
    if (await appearance.savePreset(value)) {
      replaceUrl((params) => {
        for (const key of ['preset', 'canvas', 'pane', 'content'])
          params.delete(key)
      })
    }
  }

  async function setChoice(value: AppearanceChoice) {
    if (value === 'monochrome') {
      replaceUrl((params) => params.set('scheme', '0'))
    } else if (await appearance.saveScheme(value)) {
      replaceUrl((params) => params.delete('scheme'))
    }
  }

  return {
    url,
    setUrl,
    overrides,
    route,
    choice,
    mode,
    setPreset,
    setChoice,
    failure: appearance.failure,
  }
}

export type GalleryAppearance = ReturnType<typeof useGalleryAppearance>
