// Generated from built declarations by tests/consumers/generate.mjs.
// Resolve only public package exports through the workspace node_modules links.
import type {
  Arrow,
  Combobox,
  ComboboxArrowOptions,
  ComboboxArrowProps,
  ComboboxContent,
  ComboboxContentCommonProps,
  ComboboxContentOptions,
  ComboboxContentProps,
  ComboboxContentRenderProps,
  ComboboxContextValue,
  ComboboxControl,
  ComboboxControlCommonProps,
  ComboboxControlOptions,
  ComboboxControlProps,
  ComboboxControlRenderProps,
  ComboboxDescription,
  ComboboxDescriptionCommonProps,
  ComboboxDescriptionOptions,
  ComboboxDescriptionProps,
  ComboboxDescriptionRenderProps,
  ComboboxErrorMessage,
  ComboboxErrorMessageCommonProps,
  ComboboxErrorMessageOptions,
  ComboboxErrorMessageProps,
  ComboboxErrorMessageRenderProps,
  ComboboxHiddenSelect,
  ComboboxHiddenSelectProps,
  ComboboxIcon,
  ComboboxIconProps,
  ComboboxInput,
  ComboboxInputCommonProps,
  ComboboxInputOptions,
  ComboboxInputProps,
  ComboboxInputRenderProps,
  ComboboxItem,
  ComboboxItemCommonProps,
  ComboboxItemDescriptionCommonProps,
  ComboboxItemDescriptionOptions,
  ComboboxItemDescriptionProps,
  ComboboxItemDescriptionRenderProps,
  ComboboxItemIndicator,
  ComboboxItemIndicatorCommonProps,
  ComboboxItemIndicatorOptions,
  ComboboxItemIndicatorProps,
  ComboboxItemIndicatorRenderProps,
  ComboboxItemLabelCommonProps,
  ComboboxItemLabelOptions,
  ComboboxItemLabelProps,
  ComboboxItemLabelRenderProps,
  ComboboxItemOptions,
  ComboboxItemProps,
  ComboboxItemRenderProps,
  ComboboxLabel,
  ComboboxLabelCommonProps,
  ComboboxLabelOptions,
  ComboboxLabelProps,
  ComboboxLabelRenderProps,
  ComboboxListbox,
  ComboboxListboxCommonProps,
  ComboboxListboxOptions,
  ComboboxListboxProps,
  ComboboxListboxRenderProps,
  ComboboxMultipleSelectionOptions,
  ComboboxPortal,
  ComboboxPortalProps,
  ComboboxRoot,
  ComboboxRootCommonProps,
  ComboboxRootItemComponentProps,
  ComboboxRootOptions,
  ComboboxRootProps,
  ComboboxRootRenderProps,
  ComboboxRootSectionComponentProps,
  ComboboxSectionCommonProps,
  ComboboxSectionOptions,
  ComboboxSectionProps,
  ComboboxSectionRenderProps,
  ComboboxSingleSelectionOptions,
  ComboboxTrigger,
  ComboboxTriggerCommonProps,
  ComboboxTriggerMode,
  ComboboxTriggerOptions,
  ComboboxTriggerProps,
  ComboboxTriggerRenderProps,
  Content,
  Control,
  Description,
  ErrorMessage,
  HiddenSelect,
  Icon,
  Input,
  Item,
  ItemDescription,
  ItemIndicator,
  ItemLabel,
  Label,
  Listbox,
  Portal,
  Root,
  Section,
  Trigger,
  useComboboxContext,
} from '@wfe/components/combobox'
import type { AllTyped, Assert } from '../assertions.js'

export type ExportedTypes = Assert<
  AllTyped<{
    Arrow: typeof Arrow
    Combobox: typeof Combobox
    ComboboxArrowOptions: ComboboxArrowOptions
    ComboboxArrowProps: ComboboxArrowProps
    ComboboxContent: typeof ComboboxContent
    ComboboxContentCommonProps: ComboboxContentCommonProps
    ComboboxContentOptions: ComboboxContentOptions
    ComboboxContentProps: ComboboxContentProps
    ComboboxContentRenderProps: ComboboxContentRenderProps
    ComboboxContextValue: ComboboxContextValue
    ComboboxControl: typeof ComboboxControl
    ComboboxControlCommonProps: ComboboxControlCommonProps
    ComboboxControlOptions: ComboboxControlOptions<unknown>
    ComboboxControlProps: ComboboxControlProps<unknown>
    ComboboxControlRenderProps: ComboboxControlRenderProps
    ComboboxDescription: typeof ComboboxDescription
    ComboboxDescriptionCommonProps: ComboboxDescriptionCommonProps
    ComboboxDescriptionOptions: ComboboxDescriptionOptions
    ComboboxDescriptionProps: ComboboxDescriptionProps
    ComboboxDescriptionRenderProps: ComboboxDescriptionRenderProps
    ComboboxErrorMessage: typeof ComboboxErrorMessage
    ComboboxErrorMessageCommonProps: ComboboxErrorMessageCommonProps
    ComboboxErrorMessageOptions: ComboboxErrorMessageOptions
    ComboboxErrorMessageProps: ComboboxErrorMessageProps
    ComboboxErrorMessageRenderProps: ComboboxErrorMessageRenderProps
    ComboboxHiddenSelect: typeof ComboboxHiddenSelect
    ComboboxHiddenSelectProps: ComboboxHiddenSelectProps
    ComboboxIcon: typeof ComboboxIcon
    ComboboxIconProps: ComboboxIconProps
    ComboboxInput: typeof ComboboxInput
    ComboboxInputCommonProps: ComboboxInputCommonProps
    ComboboxInputOptions: ComboboxInputOptions
    ComboboxInputProps: ComboboxInputProps
    ComboboxInputRenderProps: ComboboxInputRenderProps
    ComboboxItem: typeof ComboboxItem
    ComboboxItemCommonProps: ComboboxItemCommonProps
    ComboboxItemDescriptionCommonProps: ComboboxItemDescriptionCommonProps
    ComboboxItemDescriptionOptions: ComboboxItemDescriptionOptions
    ComboboxItemDescriptionProps: ComboboxItemDescriptionProps
    ComboboxItemDescriptionRenderProps: ComboboxItemDescriptionRenderProps
    ComboboxItemIndicator: typeof ComboboxItemIndicator
    ComboboxItemIndicatorCommonProps: ComboboxItemIndicatorCommonProps
    ComboboxItemIndicatorOptions: ComboboxItemIndicatorOptions
    ComboboxItemIndicatorProps: ComboboxItemIndicatorProps
    ComboboxItemIndicatorRenderProps: ComboboxItemIndicatorRenderProps
    ComboboxItemLabelCommonProps: ComboboxItemLabelCommonProps
    ComboboxItemLabelOptions: ComboboxItemLabelOptions
    ComboboxItemLabelProps: ComboboxItemLabelProps
    ComboboxItemLabelRenderProps: ComboboxItemLabelRenderProps
    ComboboxItemOptions: ComboboxItemOptions
    ComboboxItemProps: ComboboxItemProps
    ComboboxItemRenderProps: ComboboxItemRenderProps
    ComboboxLabel: typeof ComboboxLabel
    ComboboxLabelCommonProps: ComboboxLabelCommonProps
    ComboboxLabelOptions: ComboboxLabelOptions
    ComboboxLabelProps: ComboboxLabelProps
    ComboboxLabelRenderProps: ComboboxLabelRenderProps
    ComboboxListbox: typeof ComboboxListbox
    ComboboxListboxCommonProps: ComboboxListboxCommonProps
    ComboboxListboxOptions: ComboboxListboxOptions<unknown>
    ComboboxListboxProps: ComboboxListboxProps
    ComboboxListboxRenderProps: ComboboxListboxRenderProps
    ComboboxMultipleSelectionOptions: ComboboxMultipleSelectionOptions<unknown>
    ComboboxPortal: typeof ComboboxPortal
    ComboboxPortalProps: ComboboxPortalProps
    ComboboxRoot: typeof ComboboxRoot
    ComboboxRootCommonProps: ComboboxRootCommonProps
    ComboboxRootItemComponentProps: ComboboxRootItemComponentProps<unknown>
    ComboboxRootOptions: ComboboxRootOptions<unknown>
    ComboboxRootProps: ComboboxRootProps<unknown>
    ComboboxRootRenderProps: ComboboxRootRenderProps
    ComboboxRootSectionComponentProps: ComboboxRootSectionComponentProps<unknown>
    ComboboxSectionCommonProps: ComboboxSectionCommonProps
    ComboboxSectionOptions: ComboboxSectionOptions
    ComboboxSectionProps: ComboboxSectionProps
    ComboboxSectionRenderProps: ComboboxSectionRenderProps
    ComboboxSingleSelectionOptions: ComboboxSingleSelectionOptions<unknown>
    ComboboxTrigger: typeof ComboboxTrigger
    ComboboxTriggerCommonProps: ComboboxTriggerCommonProps
    ComboboxTriggerMode: ComboboxTriggerMode
    ComboboxTriggerOptions: ComboboxTriggerOptions
    ComboboxTriggerProps: ComboboxTriggerProps
    ComboboxTriggerRenderProps: ComboboxTriggerRenderProps
    Content: typeof Content
    Control: typeof Control
    Description: typeof Description
    ErrorMessage: typeof ErrorMessage
    HiddenSelect: typeof HiddenSelect
    Icon: typeof Icon
    Input: typeof Input
    Item: typeof Item
    ItemDescription: typeof ItemDescription
    ItemIndicator: typeof ItemIndicator
    ItemLabel: typeof ItemLabel
    Label: typeof Label
    Listbox: typeof Listbox
    Portal: typeof Portal
    Root: typeof Root
    Section: typeof Section
    Trigger: typeof Trigger
    useComboboxContext: typeof useComboboxContext
  }>
>
