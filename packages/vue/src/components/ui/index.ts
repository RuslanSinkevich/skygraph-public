export { default as SgConfigProvider } from './ConfigProvider.vue'
export {
  useConfig,
  useConfigWithDefaults,
  buildThemeVars,
  sgConfigKey,
  type SgConfig,
  type ConfigProviderProps,
  type ThemeConfig,
  type SgThemeToken,
  type CSPConfig,
  type RenderEmptyHandler,
  type Direction,
} from './ConfigProvider.vue'

export { default as SgTransition } from './Transition.vue'
export type { TransitionProps } from './Transition.vue'

export { default as SgButton } from './Button.vue'
export type { ButtonProps } from './Button.vue'

export { default as SgSpin } from './Spin.vue'
export type { SpinProps } from './Spin.vue'

export { default as SgModal } from './Modal.vue'
export type { ModalProps } from './Modal.vue'

export { default as SgDrawer } from './Drawer.vue'
export type { DrawerProps } from './Drawer.vue'

export {
  notification,
  useNotification,
  NotificationContainer as SgNotificationContainer,
  type NotificationConfig,
  type NotificationContainerProps,
  type NotificationType,
} from './Notification.vue'

export { default as SgPopconfirm } from './Popconfirm.vue'
export type { PopconfirmProps } from './Popconfirm.vue'

export { default as SgTooltip } from './Tooltip.vue'
export type { TooltipProps } from './Tooltip.vue'

export { default as SgProgress } from './Progress.vue'
export type { ProgressProps } from './Progress.vue'

export { default as SgResult } from './Result.vue'
export type { ResultProps } from './Result.vue'

export { default as SgEmpty } from './Empty.vue'
export type { EmptyProps } from './Empty.vue'

export { default as SgSkeleton } from './Skeleton.vue'
export type { SkeletonProps } from './Skeleton.vue'

export { default as SgTabs } from './Tabs.vue'
export type { TabsProps, TabItem } from './Tabs.vue'

export { default as SgMenu } from './Menu.vue'
export type { MenuItem } from './Menu.vue'

export { default as SgBreadcrumb } from './Breadcrumb.vue'
export type { BreadcrumbProps, BreadcrumbItem } from './Breadcrumb.vue'

export { default as SgDropdown } from './Dropdown.vue'
export type { DropdownProps, DropdownItem } from './Dropdown.vue'

export { default as SgPagination } from './Pagination.vue'
export type { PaginationProps } from './Pagination.vue'

export { default as SgSteps } from './Steps.vue'
export type { StepsProps, StepItem } from './Steps.vue'

export { default as SgSegmented } from './Segmented.vue'
export type { SegmentedProps, SegmentedOption } from './Segmented.vue'

export { default as SgBadge } from './Badge.vue'
export type { BadgeProps } from './Badge.vue'

export { default as SgTag } from './Tag.vue'
export type { TagProps } from './Tag.vue'

export { default as SgAvatar } from './Avatar.vue'
export type { AvatarProps } from './Avatar.vue'

export { default as SgCarousel } from './Carousel.vue'
export type { CarouselProps } from './Carousel.vue'

export { default as SgTimeline } from './Timeline.vue'
export type { TimelineProps, TimelineItem } from './Timeline.vue'

export { default as SgDescriptions } from './Descriptions.vue'
export type { DescriptionsProps, DescriptionsItem } from './Descriptions.vue'

export { default as SgCollapse } from './Collapse.vue'
export type { CollapseProps, CollapseItem } from './Collapse.vue'

// Note: SgInputPassword / SgSearchInput / SgTagInput / SgPinInput /
// SgInlineEdit / SgInputGroup are exported directly from the package
// entry (`packages/vue/src/index.ts`) — they don't need to participate
// in this internal `components/ui` barrel which feeds the public
// primitives re-export and the `ui-*.test.ts` suites.
