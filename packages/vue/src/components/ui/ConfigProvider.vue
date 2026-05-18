<script lang="ts">
import { computed, inject, provide, type ComputedRef, type InjectionKey } from 'vue'
import type { SizeType, SgLocale } from '../../types'

/**
 * Global Skygraph component configuration merged through Vue provide/inject.
 *
 * По `prefixCls`: сознательно НЕ входит в публичный API до реализации
 * (вариант A в `docs/styling-plan.md`). На практике все корневые классы
 * имеют стабильный префикс `.sg-*`; если нужна изоляция — используйте
 * отдельный контейнер со своими токенами.
 */
export interface SgConfig {
  /** Default size token for nested components. */
  size?: SizeType
  /** Disables interactions for nested components when true. */
  disabled?: boolean
  /** Enables bordered styling for nested components when true. */
  bordered?: boolean
  /** Locale messages shallow-merged with the parent provider when set. */
  locale?: SgLocale
}

export const sgConfigKey = Symbol('sg-config') as InjectionKey<ComputedRef<SgConfig>>

const EMPTY: SgConfig = {}
const EMPTY_REF = computed(() => EMPTY)

/**
 * Returns a `ComputedRef` of the merged `SgConfig` from the nearest ancestor
 * `ConfigProvider`. Always reactive: re-reads `.value` when ancestors update.
 */
export function useConfig(): ComputedRef<SgConfig> {
  const ref = inject(sgConfigKey, undefined)
  return ref ?? EMPTY_REF
}

/**
 * Resolves effective `size` and `disabled` from props, context, and explicit defaults.
 */
export function useConfigWithDefaults(
  props: { size?: SizeType; disabled?: boolean },
  defaults: { size?: SizeType; disabled?: boolean; bordered?: boolean } = {},
): { resolvedSize: ComputedRef<SizeType>; resolvedDisabled: ComputedRef<boolean> } {
  const cfgRef = inject(sgConfigKey, undefined)
  const resolvedSize = computed<SizeType>(
    () => props.size ?? cfgRef?.value.size ?? defaults.size ?? 'middle',
  )
  const resolvedDisabled = computed<boolean>(
    () => props.disabled ?? cfgRef?.value.disabled ?? defaults.disabled ?? false,
  )
  return { resolvedSize, resolvedDisabled }
}
</script>

<script setup lang="ts">
import type { PropType } from 'vue'

export interface ConfigProviderProps {
  /** Default size token for nested components. */
  size?: SizeType
  /** Disables interactions for nested components when true. */
  disabled?: boolean
  /** Enables bordered styling for nested components when true. */
  bordered?: boolean
  /** Locale messages shallow-merged with the parent provider when set. */
  locale?: SgLocale
}

const props = defineProps({
  size: { type: String as PropType<SizeType>, default: undefined },
  disabled: { type: Boolean, default: undefined },
  bordered: { type: Boolean, default: undefined },
  locale: { type: Object as PropType<SgLocale>, default: undefined },
})

defineSlots<{
  default(props: Record<string, never>): unknown
}>()

const parentRef = inject(sgConfigKey, undefined)

const merged = computed<SgConfig>(() => {
  const parent = parentRef?.value ?? EMPTY
  return {
    size: props.size ?? parent.size,
    disabled: props.disabled ?? parent.disabled,
    bordered: props.bordered ?? parent.bordered,
    locale: props.locale
      ? parent.locale
        ? { ...parent.locale, ...props.locale }
        : props.locale
      : parent.locale,
  }
})

provide(sgConfigKey, merged)
</script>

<template>
  <slot />
</template>
