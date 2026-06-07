<script lang="ts">
import {
  computed,
  inject,
  provide,
  type ComputedRef,
  type InjectionKey,
  type VNodeChild,
} from 'vue'
import type { SizeType, SgLocale } from '../../types'

/** Text/layout direction shared by descendant components. */
export type Direction = 'ltr' | 'rtl'

/**
 * Friendly design-token overrides. Each entry is mapped to a `--sg-*` CSS
 * custom property and emitted onto a `display: contents` scope wrapper, so
 * overrides cascade to every descendant without affecting layout.
 *
 * Numeric values for length-like tokens (`borderRadius`, `fontSize`) are
 * suffixed with `px`; everything else is emitted verbatim.
 */
export interface SgThemeToken {
  /** Brand / primary color → `--sg-color-primary`. */
  colorPrimary?: string
  /** Success color → `--sg-color-success`. */
  colorSuccess?: string
  /** Warning color → `--sg-color-warning`. */
  colorWarning?: string
  /** Error / danger color → `--sg-color-error`. */
  colorError?: string
  /** Base text color → `--sg-color-text`. */
  colorText?: string
  /** Base background color → `--sg-color-bg`. */
  colorBg?: string
  /** Base border color → `--sg-color-border`. */
  colorBorder?: string
  /** Base corner radius → `--sg-border-radius` (number ⇒ px). */
  borderRadius?: number | string
  /** Base font size → `--sg-font-size` (number ⇒ px). */
  fontSize?: number | string
  /** Base font family → `--sg-font-sans`. */
  fontFamily?: string
}

/**
 * Theme configuration. Combines a built-in light/dark preset (`mode`),
 * friendly token overrides (`token`), and an escape hatch for raw CSS
 * variables (`cssVars`). All three are applied to a scope wrapper.
 */
export interface ThemeConfig {
  /** Built-in palette preset applied via `data-sg-theme`. */
  mode?: 'light' | 'dark'
  /** Friendly token overrides mapped to `--sg-*` variables. */
  token?: SgThemeToken
  /** Raw CSS variable overrides (full names, e.g. `{ '--sg-color-link': '#f50' }`). */
  cssVars?: Record<string, string>
}

/** Content-Security-Policy options for runtime-injected styles. */
export interface CSPConfig {
  /** `nonce` attribute applied to dynamically created `<style>` tags. */
  nonce?: string
}

/** Customizes the empty state rendered by data components (`Empty`, `Table`, …). */
export type RenderEmptyHandler = (componentName?: string) => VNodeChild

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
  /** Text / layout direction (`ltr` by default) applied via the `dir` attribute. */
  direction?: Direction
  /** Locale messages shallow-merged with the parent provider when set. */
  locale?: SgLocale
  /** Theme preset + token overrides applied to a scope wrapper. */
  theme?: ThemeConfig
  /**
   * Returns the mount node for popups (dropdowns, tooltips, pickers). Defaults
   * to `document.body` in consumers. Useful to keep overlays inside a scrolling
   * or scoped container.
   */
  getPopupContainer?: (triggerNode?: HTMLElement) => HTMLElement
  /** Returns the scroll/target container for affix-like positioning. */
  getTargetContainer?: () => HTMLElement
  /** Global override for the default empty state. */
  renderEmpty?: RenderEmptyHandler
  /** Content-Security-Policy options for injected styles. */
  csp?: CSPConfig
}

export const sgConfigKey = Symbol('sg-config') as InjectionKey<ComputedRef<SgConfig>>

const EMPTY: SgConfig = {}
const EMPTY_REF = computed(() => EMPTY)

/** Maps friendly token names to their `--sg-*` CSS variable. */
const TOKEN_TO_CSS_VAR: Record<keyof SgThemeToken, string> = {
  colorPrimary: '--sg-color-primary',
  colorSuccess: '--sg-color-success',
  colorWarning: '--sg-color-warning',
  colorError: '--sg-color-error',
  colorText: '--sg-color-text',
  colorBg: '--sg-color-bg',
  colorBorder: '--sg-color-border',
  borderRadius: '--sg-border-radius',
  fontSize: '--sg-font-size',
  fontFamily: '--sg-font-sans',
}

/** Token keys whose numeric values should be emitted as `px` lengths. */
const PX_TOKENS = new Set<keyof SgThemeToken>(['borderRadius', 'fontSize'])

/** Builds a CSS-variable map from a theme's `token` + `cssVars`. */
export function buildThemeVars(theme?: ThemeConfig): Record<string, string> {
  const vars: Record<string, string> = {}
  if (!theme) return vars
  if (theme.token) {
    for (const key of Object.keys(theme.token) as Array<keyof SgThemeToken>) {
      const value = theme.token[key]
      if (value == null) continue
      const cssVar = TOKEN_TO_CSS_VAR[key]
      if (!cssVar) continue
      vars[cssVar] = typeof value === 'number' && PX_TOKENS.has(key) ? `${value}px` : String(value)
    }
  }
  if (theme.cssVars) {
    for (const [name, value] of Object.entries(theme.cssVars)) {
      if (value == null) continue
      vars[name.startsWith('--') ? name : `--${name}`] = String(value)
    }
  }
  return vars
}

/** Shallow-merges a parent and child theme (`token` / `cssVars` merged key-wise). */
function mergeTheme(parent?: ThemeConfig, child?: ThemeConfig): ThemeConfig | undefined {
  if (!parent) return child
  if (!child) return parent
  return {
    mode: child.mode ?? parent.mode,
    token: { ...parent.token, ...child.token },
    cssVars: { ...parent.cssVars, ...child.cssVars },
  }
}

/**
 * Returns a `ComputedRef` of the merged `SgConfig` from the nearest ancestor
 * `ConfigProvider`. Always reactive: re-reads `.value` when ancestors update.
 */
export function useConfig(): ComputedRef<SgConfig> {
  const ref = inject(sgConfigKey, undefined)
  return ref ?? EMPTY_REF
}

/**
 * Resolves effective `size`, `disabled`, and `direction` from props, context,
 * and explicit defaults.
 */
export function useConfigWithDefaults(
  props: { size?: SizeType; disabled?: boolean; direction?: Direction },
  defaults: { size?: SizeType; disabled?: boolean; bordered?: boolean; direction?: Direction } = {},
): {
  resolvedSize: ComputedRef<SizeType>
  resolvedDisabled: ComputedRef<boolean>
  resolvedDirection: ComputedRef<Direction>
} {
  const cfgRef = inject(sgConfigKey, undefined)
  const resolvedSize = computed<SizeType>(
    () => props.size ?? cfgRef?.value.size ?? defaults.size ?? 'middle',
  )
  const resolvedDisabled = computed<boolean>(
    () => props.disabled ?? cfgRef?.value.disabled ?? defaults.disabled ?? false,
  )
  const resolvedDirection = computed<Direction>(
    () => props.direction ?? cfgRef?.value.direction ?? defaults.direction ?? 'ltr',
  )
  return { resolvedSize, resolvedDisabled, resolvedDirection }
}
</script>

<script setup lang="ts">
import type { PropType, CSSProperties } from 'vue'

export interface ConfigProviderProps {
  /** Default size token for nested components. */
  size?: SizeType
  /** Disables interactions for nested components when true. */
  disabled?: boolean
  /** Enables bordered styling for nested components when true. */
  bordered?: boolean
  /** Text / layout direction applied via the `dir` attribute. */
  direction?: Direction
  /** Locale messages shallow-merged with the parent provider when set. */
  locale?: SgLocale
  /** Theme preset + token overrides applied to a scope wrapper. */
  theme?: ThemeConfig
  /** Returns the mount node for popups. */
  getPopupContainer?: (triggerNode?: HTMLElement) => HTMLElement
  /** Returns the scroll/target container for affix-like positioning. */
  getTargetContainer?: () => HTMLElement
  /** Global override for the default empty state. */
  renderEmpty?: RenderEmptyHandler
  /** Content-Security-Policy options for injected styles. */
  csp?: CSPConfig
}

const props = defineProps({
  size: { type: String as PropType<SizeType>, default: undefined },
  disabled: { type: Boolean, default: undefined },
  bordered: { type: Boolean, default: undefined },
  direction: { type: String as PropType<Direction>, default: undefined },
  locale: { type: Object as PropType<SgLocale>, default: undefined },
  theme: { type: Object as PropType<ThemeConfig>, default: undefined },
  getPopupContainer: {
    type: Function as PropType<(triggerNode?: HTMLElement) => HTMLElement>,
    default: undefined,
  },
  getTargetContainer: { type: Function as PropType<() => HTMLElement>, default: undefined },
  renderEmpty: { type: Function as PropType<RenderEmptyHandler>, default: undefined },
  csp: { type: Object as PropType<CSPConfig>, default: undefined },
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
    direction: props.direction ?? parent.direction,
    locale: props.locale
      ? parent.locale
        ? { ...parent.locale, ...props.locale }
        : props.locale
      : parent.locale,
    theme: mergeTheme(parent.theme, props.theme),
    getPopupContainer: props.getPopupContainer ?? parent.getPopupContainer,
    getTargetContainer: props.getTargetContainer ?? parent.getTargetContainer,
    renderEmpty: props.renderEmpty ?? parent.renderEmpty,
    csp: props.csp ?? parent.csp,
  }
})

provide(sgConfigKey, merged)

// Only the *own* props are emitted to the DOM scope; CSS variables and the
// `dir` attribute cascade to descendants, so nested providers stay correct.
const ownVars = computed(() => buildThemeVars(props.theme))
const mode = computed(() => props.theme?.mode)
const needsScope = computed(() =>
  Boolean(props.direction || props.theme?.mode || Object.keys(ownVars.value).length > 0),
)
const scopeStyle = computed<CSSProperties>(
  () => ({ display: 'contents', ...ownVars.value }) as CSSProperties,
)
</script>

<template>
  <div
    v-if="needsScope"
    class="sg-config-provider"
    :style="scopeStyle"
    :dir="props.direction"
    :data-sg-theme="mode"
  >
    <slot />
  </div>
  <slot v-else />
</template>
