// Generated from built declarations by tests/consumers/generate.mjs.
// Resolve only public package exports through the workspace node_modules links.
import type {
  Accordion,
  AccordionItem,
  AccordionItemProps,
  AccordionRoot,
  AccordionRootProps,
} from '@wfe/components/accordion'
import type { AllTyped, Assert } from '../assertions.js'

export type ExportedTypes = Assert<
  AllTyped<{
    Accordion: typeof Accordion
    AccordionItem: typeof AccordionItem
    AccordionItemProps: AccordionItemProps
    AccordionRoot: typeof AccordionRoot
    AccordionRootProps: AccordionRootProps
  }>
>
