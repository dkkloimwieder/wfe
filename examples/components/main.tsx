import { createFixtureDisposal } from '../shared/fixtureDisposal'
import { DefaultAppearance } from '../shared/appearance/DefaultAppearance'
import type { classLifecycle } from '../shared/controls/StructuredClasses'
import './style.css'
import { flush } from 'solid-js'
import { render } from '@solidjs/web'
import { preloadBlockView } from './gallery/BlocksPreviews'

function componentPreviewDisposal(dispose: () => void) {
  document.body.setAttribute('data-component-preview', '')
  return createFixtureDisposal(() => {
    dispose()
    document.body.removeAttribute('data-component-preview')
  })
}

if (new URLSearchParams(location.search).has('contexts')) {
  const { ContextControls } = await import('../shared/controls/ContextControls')
  const dispose = render(
    () => (
      <DefaultAppearance>
        <ContextControls />
      </DefaultAppearance>
    ),
    document.getElementById('root')!,
  )
  const cleanup = createFixtureDisposal(() => {
    dispose()
  })
  window.contextFixture = {
    stop: () => {
      cleanup()
      flush()
    },
  }
} else if (new URLSearchParams(location.search).has('theme')) {
  const { ThemeConsumer } = await import('../shared/appearance/ThemeConsumer')
  render(() => <ThemeConsumer />, document.getElementById('root')!)
} else if (new URLSearchParams(location.search).has('galleryPreview')) {
  document.body.setAttribute('data-gallery-page', '')
  const { GalleryPreview } = await import('./gallery/Preview')
  render(() => <GalleryPreview />, document.getElementById('root')!)
} else if (new URLSearchParams(location.search).has('gallery')) {
  await mountGallery()
} else if (new URLSearchParams(location.search).has('files')) {
  const [{ FileControls, fileLifecycle }, { Card }] = await Promise.all([
    import('../shared/controls/FileControls'),
    import('@wfe/components/display'),
  ])
  const dispose = render(
    () => (
      <DefaultAppearance class="component-preview">
        <Card>
          <FileControls />
        </Card>
      </DefaultAppearance>
    ),
    document.getElementById('root')!,
  )
  const cleanup = componentPreviewDisposal(dispose)
  fileLifecycle.stop = () => {
    cleanup()
    flush()
  }
  window.fileFixture = fileLifecycle
} else if (new URLSearchParams(location.search).has('resizable')) {
  const [{ ResizableControls, resizableLifecycle }, { Card }] =
    await Promise.all([
      import('../shared/controls/ResizableControls'),
      import('@wfe/components/display'),
    ])
  const dispose = render(
    () => (
      <DefaultAppearance class="component-preview">
        <Card>
          <ResizableControls />
        </Card>
      </DefaultAppearance>
    ),
    document.getElementById('root')!,
  )
  const cleanup = componentPreviewDisposal(dispose)
  resizableLifecycle.stop = () => {
    cleanup()
    flush()
  }
  window.resizableFixture = resizableLifecycle
} else if (new URLSearchParams(location.search).has('accordion')) {
  const [{ AccordionControls, accordionLifecycle }, { Card }] =
    await Promise.all([
      import('../shared/controls/AccordionControls'),
      import('@wfe/components/display'),
    ])
  const dispose = render(
    () => (
      <DefaultAppearance class="component-preview">
        <Card>
          <AccordionControls />
        </Card>
      </DefaultAppearance>
    ),
    document.getElementById('root')!,
  )
  const cleanup = componentPreviewDisposal(dispose)
  accordionLifecycle.stop = () => {
    cleanup()
    flush()
  }
  window.accordionFixture = accordionLifecycle
} else if (new URLSearchParams(location.search).has('breadcrumbs')) {
  const [{ BreadcrumbControls, breadcrumbLifecycle }, { Card }] =
    await Promise.all([
      import('../shared/controls/BreadcrumbControls'),
      import('@wfe/components/display'),
    ])
  const dispose = render(
    () => (
      <DefaultAppearance class="component-preview">
        <Card>
          <BreadcrumbControls />
        </Card>
      </DefaultAppearance>
    ),
    document.getElementById('root')!,
  )
  const cleanup = componentPreviewDisposal(dispose)
  breadcrumbLifecycle.stop = () => {
    cleanup()
    flush()
  }
  window.breadcrumbFixture = breadcrumbLifecycle
} else if (new URLSearchParams(location.search).has('tabs')) {
  const [{ TabsControls, tabsLifecycle }, { Card }] = await Promise.all([
    import('../shared/controls/TabsControls'),
    import('@wfe/components/display'),
  ])
  const dispose = render(
    () => (
      <DefaultAppearance class="component-preview">
        <Card>
          <TabsControls />
        </Card>
      </DefaultAppearance>
    ),
    document.getElementById('root')!,
  )
  const cleanup = componentPreviewDisposal(dispose)
  tabsLifecycle.stop = () => {
    cleanup()
    flush()
  }
  window.tabsFixture = tabsLifecycle
} else if (new URLSearchParams(location.search).has('number')) {
  const { NumberControls, numberLifecycle } =
    await import('../shared/controls/NumberControls')
  const dispose = render(
    () => <NumberControls />,
    document.getElementById('root')!,
  )
  const cleanup = createFixtureDisposal(() => {
    dispose()
  })
  numberLifecycle.stop = () => {
    cleanup()
    flush()
  }
  window.numberFixture = numberLifecycle
} else if (new URLSearchParams(location.search).has('collapsible')) {
  const { CollapsibleControls, collapsibleLifecycle } =
    await import('../shared/controls/CollapsibleControls')
  const dispose = render(
    () => <CollapsibleControls />,
    document.getElementById('root')!,
  )
  const cleanup = createFixtureDisposal(() => {
    dispose()
  })
  collapsibleLifecycle.stop = () => {
    cleanup()
    flush()
  }
  window.collapsibleFixture = collapsibleLifecycle
} else if (new URLSearchParams(location.search).has('icons')) {
  const { IconControls } = await import('./IconControls')
  render(() => <IconControls />, document.getElementById('root')!)
} else if (new URLSearchParams(location.search).has('classes')) {
  const { StructuredClasses, classLifecycle } =
    await import('../shared/controls/StructuredClasses')
  const dispose = render(
    () => <StructuredClasses />,
    document.getElementById('root')!,
  )
  const cleanup = createFixtureDisposal(() => {
    dispose()
  })
  window.classFixture = {
    ...classLifecycle,
    stop: () => {
      cleanup()
      flush()
    },
  }
} else if (new URLSearchParams(location.search).has('consistency')) {
  const { ConsistencyControls } = await import('./ConsistencyControls')
  const dispose = render(
    () => <ConsistencyControls />,
    document.getElementById('root')!,
  )
  const cleanup = createFixtureDisposal(() => {
    dispose()
  })
  window.consistencyFixture.stop = () => {
    cleanup()
    flush()
  }
} else if (new URLSearchParams(location.search).has('overlayButtons')) {
  const { OverlayButtonControls } = await import('./OverlayButtonControls')
  const dispose = render(
    () => <OverlayButtonControls />,
    document.getElementById('root')!,
  )
  const cleanup = createFixtureDisposal(() => {
    dispose()
  })
  window.overlayButtonFixture.stop = () => {
    cleanup()
    flush()
  }
} else if (new URLSearchParams(location.search).has('consumer')) {
  const { GenericConsumer } = await import('./GenericConsumer')
  const start = () => {
    const dispose = render(
      () => <GenericConsumer />,
      document.getElementById('root')!,
    )
    let active = true
    const cleanup = createFixtureDisposal(() => {
      dispose()
    })
    window.consumerFixture.start = start
    window.consumerFixture.stop = () => {
      if (!active) return
      active = false
      cleanup()
      flush()
    }
  }
  start()
} else if (new URLSearchParams(location.search).has('display')) {
  const { DisplayControls } = await import('./DisplayControls')
  const dispose = render(
    () => <DisplayControls />,
    document.getElementById('root')!,
  )
  const cleanup = createFixtureDisposal(() => {
    dispose()
  })
  window.displayFixture.stop = () => {
    cleanup()
    flush()
  }
} else if (new URLSearchParams(location.search).has('overlays')) {
  const { OverlayControls } = await import('./OverlayControls')
  const dispose = render(
    () => <OverlayControls />,
    document.getElementById('root')!,
  )
  const cleanup = createFixtureDisposal(() => {
    dispose()
  })
  window.overlayFixture.stop = () => {
    cleanup()
    flush()
  }
} else if (new URLSearchParams(location.search).has('dialogs')) {
  const { DialogControls } = await import('./DialogControls')
  const dispose = render(
    () => <DialogControls />,
    document.getElementById('root')!,
  )
  const cleanup = createFixtureDisposal(() => {
    dispose()
  })
  window.dialogFixture.stop = () => {
    cleanup()
    flush()
  }
} else if (new URLSearchParams(location.search).has('booleans')) {
  const { BooleanControls } = await import('./BooleanControls')
  const dispose = render(
    () => <BooleanControls />,
    document.getElementById('root')!,
  )
  const cleanup = createFixtureDisposal(() => {
    dispose()
  })
  window.booleanFixture.stop = () => {
    cleanup()
    flush()
  }
} else if (new URLSearchParams(location.search).has('fields')) {
  const { NativeFieldsFixture } = await import('./NativeFieldsFixture')
  const dispose = render(
    () => <NativeFieldsFixture />,
    document.getElementById('root')!,
  )
  const cleanup = createFixtureDisposal(() => {
    dispose()
  })
  window.nativeFieldFixture.stop = () => {
    cleanup()
    flush()
  }
} else if (new URLSearchParams(location.search).has('choices')) {
  const { ChoiceControls } = await import('./ChoiceControls')
  const dispose = render(
    () => <ChoiceControls />,
    document.getElementById('root')!,
  )
  const cleanup = createFixtureDisposal(() => {
    dispose()
  })
  window.choiceFixture.stop = () => {
    cleanup()
    flush()
  }
} else if (new URLSearchParams(location.search).has('combobox')) {
  const { ComboboxSmoke } = await import('./ComboboxSmoke')
  render(() => <ComboboxSmoke />, document.getElementById('root')!)
} else if (new URLSearchParams(location.search).has('standalone')) {
  const { Standalone } = await import('./Standalone')
  render(() => <Standalone />, document.getElementById('root')!)
} else if (new URLSearchParams(location.search).has('editing')) {
  const [{ mountEditingFixture }, { popupFields }, { PopupPriorityEditor }] =
    await Promise.all([
      import('../table-editing/fixture'),
      import('../shared/editingFields'),
      import('./PopupPriorityEditor'),
    ])
  mountEditingFixture(PopupPriorityEditor, popupFields)
} else await mountGallery()

// The gallery is the default page. `?gallery=<id>` selects one of its pages.
async function mountGallery() {
  document.body.setAttribute('data-gallery-page', '')
  preloadBlockView(new URLSearchParams(location.search).get('gallery'))
  const { Gallery } = await import('./gallery/Gallery')
  const dispose = render(() => <Gallery />, document.getElementById('root')!)
  const cleanup = createFixtureDisposal(() => {
    dispose()
    document.body.removeAttribute('data-gallery-page')
  })
  window.galleryFixture = {
    stop: () => {
      cleanup()
      flush()
    },
  }
}

declare global {
  interface Window {
    contextFixture: { stop: () => void }
    galleryFixture: { stop: () => void }
    classFixture: typeof classLifecycle & { stop: () => void }
  }
}
