import React, { createContext, useContext, useMemo } from 'react'
import type { SizeType, SgLocale } from '../types'

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
export type RenderEmptyHandler = (componentName?: string) => React.ReactNode

/**
 * Global Skygraph component configuration merged through React context.
 *
 * По `prefixCls`: сознательно НЕ входит в публичный API до реализации
 * (вариант A в `docs/styling-plan.md`, фаза 4). На практике все корневые классы
 * имеют стабильный префикс `.sg-*`; если нужна изоляция — используйте изолированный
 * скоуп на хосте (шадоу-рут/отдельный контейнер со своими токенами).
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

const SgConfigContext = createContext<SgConfig>({})

/** Props for `ConfigProvider`, extending `SgConfig` with React children. */
export interface ConfigProviderProps extends SgConfig {
  /** Tree of components that consume merged configuration from this provider. */
  children: React.ReactNode
}

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
 * Merges Skygraph configuration with any parent provider and exposes it via context.
 * Descendants read values through `useConfig` or `useConfigWithDefaults`.
 *
 * When `theme` or `direction` is set, children are wrapped in a `display: contents`
 * element that carries the `dir`/`data-sg-theme` attributes and CSS variables, so
 * the scope inherits without introducing an extra layout box.
 */
export function ConfigProvider({ children, ...config }: ConfigProviderProps) {
  const parent = useContext(SgConfigContext)

  const merged = useMemo<SgConfig>(
    () => ({
      size: config.size ?? parent.size,
      disabled: config.disabled ?? parent.disabled,
      bordered: config.bordered ?? parent.bordered,
      direction: config.direction ?? parent.direction,
      locale: config.locale
        ? parent.locale
          ? { ...parent.locale, ...config.locale }
          : config.locale
        : parent.locale,
      theme: mergeTheme(parent.theme, config.theme),
      getPopupContainer: config.getPopupContainer ?? parent.getPopupContainer,
      getTargetContainer: config.getTargetContainer ?? parent.getTargetContainer,
      renderEmpty: config.renderEmpty ?? parent.renderEmpty,
      csp: config.csp ?? parent.csp,
    }),
    [
      config.size,
      config.disabled,
      config.bordered,
      config.direction,
      config.locale,
      config.theme,
      config.getPopupContainer,
      config.getTargetContainer,
      config.renderEmpty,
      config.csp,
      parent,
    ],
  )

  // Only the *own* props are emitted to the DOM scope; CSS variables and the
  // `dir` attribute cascade to descendants, so nested providers stay correct.
  const ownVars = useMemo(() => buildThemeVars(config.theme), [config.theme])
  const mode = config.theme?.mode
  const direction = config.direction
  const needsScope = Boolean(direction || mode || Object.keys(ownVars).length > 0)

  const content = needsScope ? (
    <div
      className="sg-config-provider"
      style={{ display: 'contents', ...ownVars } as React.CSSProperties}
      dir={direction}
      data-sg-theme={mode}
    >
      {children}
    </div>
  ) : (
    children
  )

  return <SgConfigContext.Provider value={merged}>{content}</SgConfigContext.Provider>
}

/** Returns the merged `SgConfig` from the nearest ancestor `ConfigProvider`. */
export function useConfig(): SgConfig {
  return useContext(SgConfigContext)
}

/**
 * Resolves effective `size`, `disabled`, and `direction` from props, context,
 * and explicit defaults. Returns the original props plus the resolved values.
 */
export function useConfigWithDefaults<T extends Record<string, unknown>>(
  props: T,
  defaults: { size?: SizeType; disabled?: boolean; bordered?: boolean; direction?: Direction },
): T & { resolvedSize: SizeType; resolvedDisabled: boolean; resolvedDirection: Direction } {
  const config = useContext(SgConfigContext)

  return useMemo(() => {
    const resolvedSize =
      ((props as Record<string, unknown>).size as SizeType | undefined) ??
      config.size ??
      defaults.size ??
      'middle'
    const resolvedDisabled =
      ((props as Record<string, unknown>).disabled as boolean | undefined) ??
      config.disabled ??
      defaults.disabled ??
      false
    const resolvedDirection =
      ((props as Record<string, unknown>).direction as Direction | undefined) ??
      config.direction ??
      defaults.direction ??
      'ltr'

    return { ...props, resolvedSize, resolvedDisabled, resolvedDirection }
  }, [
    props,
    config.size,
    config.disabled,
    config.direction,
    defaults.size,
    defaults.disabled,
    defaults.direction,
  ])
}
