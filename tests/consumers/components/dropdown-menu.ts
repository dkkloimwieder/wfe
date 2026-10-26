// Generated from built declarations by tests/consumers/generate.mjs.
// Resolve only public package exports through the workspace node_modules links.
import type {
  Arrow,
  CheckboxItem,
  Content,
  DropdownMenu,
  DropdownMenuArrowCommonProps,
  DropdownMenuArrowOptions,
  DropdownMenuArrowProps,
  DropdownMenuArrowRenderProps,
  DropdownMenuCheckboxItem,
  DropdownMenuCheckboxItemCommonProps,
  DropdownMenuCheckboxItemOptions,
  DropdownMenuCheckboxItemProps,
  DropdownMenuCheckboxItemRenderProps,
  DropdownMenuContent,
  DropdownMenuContentCommonProps,
  DropdownMenuContentOptions,
  DropdownMenuContentProps,
  DropdownMenuContentRenderProps,
  DropdownMenuGroupCommonProps,
  DropdownMenuGroupLabel,
  DropdownMenuGroupLabelCommonProps,
  DropdownMenuGroupLabelOptions,
  DropdownMenuGroupLabelProps,
  DropdownMenuGroupLabelRenderProps,
  DropdownMenuGroupOptions,
  DropdownMenuGroupProps,
  DropdownMenuGroupRenderProps,
  DropdownMenuIcon,
  DropdownMenuIconCommonProps,
  DropdownMenuIconOptions,
  DropdownMenuIconProps,
  DropdownMenuIconRenderProps,
  DropdownMenuItem,
  DropdownMenuItemCommonProps,
  DropdownMenuItemDescription,
  DropdownMenuItemDescriptionCommonProps,
  DropdownMenuItemDescriptionOptions,
  DropdownMenuItemDescriptionProps,
  DropdownMenuItemDescriptionRenderProps,
  DropdownMenuItemIndicatorCommonProps,
  DropdownMenuItemIndicatorOptions,
  DropdownMenuItemIndicatorProps,
  DropdownMenuItemIndicatorRenderProps,
  DropdownMenuItemLabelCommonProps,
  DropdownMenuItemLabelOptions,
  DropdownMenuItemLabelProps,
  DropdownMenuItemLabelRenderProps,
  DropdownMenuItemOptions,
  DropdownMenuItemProps,
  DropdownMenuItemRenderProps,
  DropdownMenuPortal,
  DropdownMenuPortalProps,
  DropdownMenuRadioGroupCommonProps,
  DropdownMenuRadioGroupOptions,
  DropdownMenuRadioGroupProps,
  DropdownMenuRadioGroupRenderProps,
  DropdownMenuRadioItem,
  DropdownMenuRadioItemCommonProps,
  DropdownMenuRadioItemOptions,
  DropdownMenuRadioItemPRenderrops,
  DropdownMenuRadioItemProps,
  DropdownMenuRoot,
  DropdownMenuRootOptions,
  DropdownMenuRootProps,
  DropdownMenuSeparator,
  DropdownMenuSeparatorCommonProps,
  DropdownMenuSeparatorOptions,
  DropdownMenuSeparatorProps,
  DropdownMenuSeparatorRenderProps,
  DropdownMenuSubContent,
  DropdownMenuSubContentCommonProps,
  DropdownMenuSubContentOptions,
  DropdownMenuSubContentProps,
  DropdownMenuSubContentRenderProps,
  DropdownMenuSubOptions,
  DropdownMenuSubProps,
  DropdownMenuSubTrigger,
  DropdownMenuSubTriggerCommonProps,
  DropdownMenuSubTriggerOptions,
  DropdownMenuSubTriggerProps,
  DropdownMenuSubTriggerRenderProps,
  DropdownMenuTrigger,
  DropdownMenuTriggerCommonProps,
  DropdownMenuTriggerOptions,
  DropdownMenuTriggerProps,
  DropdownMenuTriggerRenderProps,
  Group,
  GroupLabel,
  Icon,
  Item,
  ItemDescription,
  ItemIndicator,
  ItemLabel,
  Portal,
  RadioGroup,
  RadioItem,
  Root,
  Separator,
  Sub,
  SubContent,
  SubTrigger,
  Trigger,
} from '@wfe/components/dropdown-menu'
import type { AllTyped, Assert } from '../assertions.js'

export type ExportedTypes = Assert<
  AllTyped<{
    Arrow: typeof Arrow
    CheckboxItem: typeof CheckboxItem
    Content: typeof Content
    DropdownMenu: typeof DropdownMenu
    DropdownMenuArrowCommonProps: DropdownMenuArrowCommonProps
    DropdownMenuArrowOptions: DropdownMenuArrowOptions
    DropdownMenuArrowProps: DropdownMenuArrowProps
    DropdownMenuArrowRenderProps: DropdownMenuArrowRenderProps
    DropdownMenuCheckboxItem: typeof DropdownMenuCheckboxItem
    DropdownMenuCheckboxItemCommonProps: DropdownMenuCheckboxItemCommonProps
    DropdownMenuCheckboxItemOptions: DropdownMenuCheckboxItemOptions
    DropdownMenuCheckboxItemProps: DropdownMenuCheckboxItemProps
    DropdownMenuCheckboxItemRenderProps: DropdownMenuCheckboxItemRenderProps
    DropdownMenuContent: typeof DropdownMenuContent
    DropdownMenuContentCommonProps: DropdownMenuContentCommonProps
    DropdownMenuContentOptions: DropdownMenuContentOptions
    DropdownMenuContentProps: DropdownMenuContentProps
    DropdownMenuContentRenderProps: DropdownMenuContentRenderProps
    DropdownMenuGroupCommonProps: DropdownMenuGroupCommonProps
    DropdownMenuGroupLabel: typeof DropdownMenuGroupLabel
    DropdownMenuGroupLabelCommonProps: DropdownMenuGroupLabelCommonProps
    DropdownMenuGroupLabelOptions: DropdownMenuGroupLabelOptions
    DropdownMenuGroupLabelProps: DropdownMenuGroupLabelProps
    DropdownMenuGroupLabelRenderProps: DropdownMenuGroupLabelRenderProps
    DropdownMenuGroupOptions: DropdownMenuGroupOptions
    DropdownMenuGroupProps: DropdownMenuGroupProps
    DropdownMenuGroupRenderProps: DropdownMenuGroupRenderProps
    DropdownMenuIcon: typeof DropdownMenuIcon
    DropdownMenuIconCommonProps: DropdownMenuIconCommonProps
    DropdownMenuIconOptions: DropdownMenuIconOptions
    DropdownMenuIconProps: DropdownMenuIconProps
    DropdownMenuIconRenderProps: DropdownMenuIconRenderProps
    DropdownMenuItem: typeof DropdownMenuItem
    DropdownMenuItemCommonProps: DropdownMenuItemCommonProps
    DropdownMenuItemDescription: typeof DropdownMenuItemDescription
    DropdownMenuItemDescriptionCommonProps: DropdownMenuItemDescriptionCommonProps
    DropdownMenuItemDescriptionOptions: DropdownMenuItemDescriptionOptions
    DropdownMenuItemDescriptionProps: DropdownMenuItemDescriptionProps
    DropdownMenuItemDescriptionRenderProps: DropdownMenuItemDescriptionRenderProps
    DropdownMenuItemIndicatorCommonProps: DropdownMenuItemIndicatorCommonProps
    DropdownMenuItemIndicatorOptions: DropdownMenuItemIndicatorOptions
    DropdownMenuItemIndicatorProps: DropdownMenuItemIndicatorProps
    DropdownMenuItemIndicatorRenderProps: DropdownMenuItemIndicatorRenderProps
    DropdownMenuItemLabelCommonProps: DropdownMenuItemLabelCommonProps
    DropdownMenuItemLabelOptions: DropdownMenuItemLabelOptions
    DropdownMenuItemLabelProps: DropdownMenuItemLabelProps
    DropdownMenuItemLabelRenderProps: DropdownMenuItemLabelRenderProps
    DropdownMenuItemOptions: DropdownMenuItemOptions
    DropdownMenuItemProps: DropdownMenuItemProps
    DropdownMenuItemRenderProps: DropdownMenuItemRenderProps
    DropdownMenuPortal: typeof DropdownMenuPortal
    DropdownMenuPortalProps: DropdownMenuPortalProps
    DropdownMenuRadioGroupCommonProps: DropdownMenuRadioGroupCommonProps
    DropdownMenuRadioGroupOptions: DropdownMenuRadioGroupOptions
    DropdownMenuRadioGroupProps: DropdownMenuRadioGroupProps
    DropdownMenuRadioGroupRenderProps: DropdownMenuRadioGroupRenderProps
    DropdownMenuRadioItem: typeof DropdownMenuRadioItem
    DropdownMenuRadioItemCommonProps: DropdownMenuRadioItemCommonProps
    DropdownMenuRadioItemOptions: DropdownMenuRadioItemOptions
    DropdownMenuRadioItemPRenderrops: DropdownMenuRadioItemPRenderrops
    DropdownMenuRadioItemProps: DropdownMenuRadioItemProps
    DropdownMenuRoot: typeof DropdownMenuRoot
    DropdownMenuRootOptions: DropdownMenuRootOptions
    DropdownMenuRootProps: DropdownMenuRootProps
    DropdownMenuSeparator: typeof DropdownMenuSeparator
    DropdownMenuSeparatorCommonProps: DropdownMenuSeparatorCommonProps
    DropdownMenuSeparatorOptions: DropdownMenuSeparatorOptions
    DropdownMenuSeparatorProps: DropdownMenuSeparatorProps
    DropdownMenuSeparatorRenderProps: DropdownMenuSeparatorRenderProps
    DropdownMenuSubContent: typeof DropdownMenuSubContent
    DropdownMenuSubContentCommonProps: DropdownMenuSubContentCommonProps
    DropdownMenuSubContentOptions: DropdownMenuSubContentOptions
    DropdownMenuSubContentProps: DropdownMenuSubContentProps
    DropdownMenuSubContentRenderProps: DropdownMenuSubContentRenderProps
    DropdownMenuSubOptions: DropdownMenuSubOptions
    DropdownMenuSubProps: DropdownMenuSubProps
    DropdownMenuSubTrigger: typeof DropdownMenuSubTrigger
    DropdownMenuSubTriggerCommonProps: DropdownMenuSubTriggerCommonProps
    DropdownMenuSubTriggerOptions: DropdownMenuSubTriggerOptions
    DropdownMenuSubTriggerProps: DropdownMenuSubTriggerProps
    DropdownMenuSubTriggerRenderProps: DropdownMenuSubTriggerRenderProps
    DropdownMenuTrigger: typeof DropdownMenuTrigger
    DropdownMenuTriggerCommonProps: DropdownMenuTriggerCommonProps
    DropdownMenuTriggerOptions: DropdownMenuTriggerOptions
    DropdownMenuTriggerProps: DropdownMenuTriggerProps
    DropdownMenuTriggerRenderProps: DropdownMenuTriggerRenderProps
    Group: typeof Group
    GroupLabel: typeof GroupLabel
    Icon: typeof Icon
    Item: typeof Item
    ItemDescription: typeof ItemDescription
    ItemIndicator: typeof ItemIndicator
    ItemLabel: typeof ItemLabel
    Portal: typeof Portal
    RadioGroup: typeof RadioGroup
    RadioItem: typeof RadioItem
    Root: typeof Root
    Separator: typeof Separator
    Sub: typeof Sub
    SubContent: typeof SubContent
    SubTrigger: typeof SubTrigger
    Trigger: typeof Trigger
  }>
>
