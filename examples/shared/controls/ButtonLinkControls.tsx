import { Button, ButtonLink } from '@wfe/components'
import { For } from 'solid-js'

export function ButtonLinkControls() {
  return (
    <section data-button-link-review="">
      <For each={['outline', 'filled', 'inverted', 'ghost'] as const}>
        {(variant) => (
          <div>
            <Button variant={variant} tone="accent">
              {variant} reference
            </Button>
            <ButtonLink
              id={`button-link-${variant}`}
              href="#button-link-destination"
              variant={variant}
              tone="accent"
            >
              {variant} destination
            </ButtonLink>
          </div>
        )}
      </For>
      <ButtonLink href="about:blank" target="_blank" rel="noopener">
        New tab destination
      </ButtonLink>
      <ButtonLink href="data:text/plain,example" download="example.txt">
        Download example
      </ButtonLink>
      <p id="button-link-destination">Link destination</p>
    </section>
  )
}
