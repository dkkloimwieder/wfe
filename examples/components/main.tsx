import { DefaultAppearance } from '../shared/appearance/DefaultAppearance'
import { Card } from '@wfe/components'
import {
  BreadcrumbControls,
  breadcrumbLifecycle,
} from '../shared/controls/BreadcrumbControls'
import { TabsControls, tabsLifecycle } from '../shared/controls/TabsControls'
import {
  NumberControls,
  numberLifecycle,
} from '../shared/controls/NumberControls'
import {
  CollapsibleControls,
  collapsibleLifecycle,
} from '../shared/controls/CollapsibleControls'
import { IconControls } from './IconControls'
import {
  StructuredClasses,
  classLifecycle,
} from '../shared/controls/StructuredClasses'
import { ConsistencyControls } from './ConsistencyControls'
import { OverlayButtonControls } from './OverlayButtonControls'
import './style.css'
import { action, flush } from 'solid-js'
import { render } from '@solidjs/web'
import { mountEditingFixture } from '../table-editing/fixture'
import { popupFields } from '../table-editing/fields'
import { PopupPriorityEditor } from './PopupPriorityEditor'
import { Standalone } from './Standalone'
import { ChoiceControls } from './ChoiceControls'
import { ComboboxSmoke } from './ComboboxSmoke'
import { NativeFieldsFixture } from './NativeFieldsFixture'
import { BooleanControls } from './BooleanControls'
import { DialogControls } from './DialogControls'
import { OverlayControls } from './OverlayControls'
import { DisplayControls } from './DisplayControls'
import { GenericConsumer } from './GenericConsumer'

if (new URLSearchParams(location.search).has('breadcrumbs')) {
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
  // eslint-disable-next-line require-yield -- Dispose through the qualified runtime path.
  const cleanup = action(function* () {
    dispose()
  })
  breadcrumbLifecycle.stop = () => {
    cleanup()
    flush()
  }
  window.breadcrumbFixture = breadcrumbLifecycle
} else if (new URLSearchParams(location.search).has('tabs')) {
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
  // eslint-disable-next-line require-yield -- Dispose through the qualified runtime path.
  const cleanup = action(function* () {
    dispose()
  })
  tabsLifecycle.stop = () => {
    cleanup()
    flush()
  }
  window.tabsFixture = tabsLifecycle
} else if (new URLSearchParams(location.search).has('number')) {
  const dispose = render(
    () => <NumberControls />,
    document.getElementById('root')!,
  )
  // eslint-disable-next-line require-yield -- Dispose synchronously through the qualified runtime path.
  const cleanup = action(function* () {
    dispose()
  })
  numberLifecycle.stop = () => {
    cleanup()
    flush()
  }
  window.numberFixture = numberLifecycle
} else if (new URLSearchParams(location.search).has('collapsible')) {
  const dispose = render(
    () => <CollapsibleControls />,
    document.getElementById('root')!,
  )
  // eslint-disable-next-line require-yield -- Dispose synchronously through the qualified runtime path.
  const cleanup = action(function* () {
    dispose()
  })
  collapsibleLifecycle.stop = () => {
    cleanup()
    flush()
  }
  window.collapsibleFixture = collapsibleLifecycle
} else if (new URLSearchParams(location.search).has('icons')) {
  render(() => <IconControls />, document.getElementById('root')!)
} else if (new URLSearchParams(location.search).has('classes')) {
  const dispose = render(
    () => <StructuredClasses />,
    document.getElementById('root')!,
  )
  // eslint-disable-next-line require-yield -- Dispose the fixture synchronously.
  const cleanup = action(function* () {
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
  const dispose = render(
    () => <ConsistencyControls />,
    document.getElementById('root')!,
  )
  // eslint-disable-next-line require-yield -- Use the qualified synchronous runtime disposal path.
  const cleanup = action(function* () {
    dispose()
  })
  window.consistencyFixture.stop = () => {
    cleanup()
    flush()
  }
} else if (new URLSearchParams(location.search).has('overlayButtons')) {
  const dispose = render(
    () => <OverlayButtonControls />,
    document.getElementById('root')!,
  )
  // eslint-disable-next-line require-yield -- Use the qualified synchronous runtime disposal path.
  const cleanup = action(function* () {
    dispose()
  })
  window.overlayButtonFixture.stop = () => {
    cleanup()
    flush()
  }
} else if (new URLSearchParams(location.search).has('consumer')) {
  const start = () => {
    const dispose = render(
      () => <GenericConsumer />,
      document.getElementById('root')!,
    )
    let active = true
    // eslint-disable-next-line require-yield -- Use the qualified synchronous runtime disposal path.
    const cleanup = action(function* () {
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
  const dispose = render(
    () => <DisplayControls />,
    document.getElementById('root')!,
  )
  // eslint-disable-next-line require-yield -- Use the qualified synchronous runtime disposal path.
  const cleanup = action(function* () {
    dispose()
  })
  window.displayFixture.stop = () => {
    cleanup()
    flush()
  }
} else if (new URLSearchParams(location.search).has('overlays')) {
  const dispose = render(
    () => <OverlayControls />,
    document.getElementById('root')!,
  )
  // eslint-disable-next-line require-yield -- Use the qualified synchronous runtime disposal path.
  const cleanup = action(function* () {
    dispose()
  })
  window.overlayFixture.stop = () => {
    cleanup()
    flush()
  }
} else if (new URLSearchParams(location.search).has('dialogs')) {
  const dispose = render(
    () => <DialogControls />,
    document.getElementById('root')!,
  )
  // eslint-disable-next-line require-yield -- Use the qualified synchronous runtime disposal path.
  const cleanup = action(function* () {
    dispose()
  })
  window.dialogFixture.stop = () => {
    cleanup()
    flush()
  }
} else if (new URLSearchParams(location.search).has('booleans')) {
  const dispose = render(
    () => <BooleanControls />,
    document.getElementById('root')!,
  )
  // eslint-disable-next-line require-yield -- Use the qualified synchronous runtime disposal path.
  const cleanup = action(function* () {
    dispose()
  })
  window.booleanFixture.stop = () => {
    cleanup()
    flush()
  }
} else if (new URLSearchParams(location.search).has('fields')) {
  const dispose = render(
    () => <NativeFieldsFixture />,
    document.getElementById('root')!,
  )
  // eslint-disable-next-line require-yield -- Use the qualified synchronous runtime disposal path.
  const cleanup = action(function* () {
    dispose()
  })
  window.nativeFieldFixture.stop = () => {
    cleanup()
    flush()
  }
} else if (new URLSearchParams(location.search).has('choices')) {
  const dispose = render(
    () => <ChoiceControls />,
    document.getElementById('root')!,
  )
  // eslint-disable-next-line require-yield -- Use the qualified synchronous runtime disposal path.
  const cleanup = action(function* () {
    dispose()
  })
  window.choiceFixture.stop = () => {
    cleanup()
    flush()
  }
} else if (new URLSearchParams(location.search).has('combobox'))
  render(() => <ComboboxSmoke />, document.getElementById('root')!)
else if (new URLSearchParams(location.search).has('standalone'))
  render(() => <Standalone />, document.getElementById('root')!)
else mountEditingFixture(PopupPriorityEditor, popupFields)

declare global {
  interface Window {
    classFixture: typeof classLifecycle & { stop: () => void }
  }
}
