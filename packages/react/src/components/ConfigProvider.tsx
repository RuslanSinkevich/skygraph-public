import React, { createContext, useContext, useMemo } from 'react'
import type { SizeType, SgLocale } from '../types'

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
  /** Locale messages shallow-merged with the parent provider when set. */
  locale?: SgLocale
}

const SgConfigContext = createContext<SgConfig>({})

/** Props for `ConfigProvider`, extending `SgConfig` with React children. */
export interface ConfigProviderProps extends SgConfig {
  /** Tree of components that consume merged configuration from this provider. */
  children: React.ReactNode
}

/**
 * Merges Skygraph configuration with any parent provider and exposes it via context.
 * Descendants read values through `useConfig` or `useConfigWithDefaults`.
 */
export function ConfigProvider({ children, ...config }: ConfigProviderProps) {
  const parent = useContext(SgConfigContext)

  const merged = useMemo<SgConfig>(
    () => ({
      size: config.size ?? parent.size,
      disabled: config.disabled ?? parent.disabled,
      bordered: config.bordered ?? parent.bordered,
      locale: config.locale
        ? parent.locale
          ? { ...parent.locale, ...config.locale }
          : config.locale
        : parent.locale,
    }),
    [config.size, config.disabled, config.bordered, config.locale, parent],
  )

  return <SgConfigContext.Provider value={merged}>{children}</SgConfigContext.Provider>
}

/** Returns the merged `SgConfig` from the nearest ancestor `ConfigProvider`. */
export function useConfig(): SgConfig {
  return useContext(SgConfigContext)
}

/**
 * Resolves effective `size` and `disabled` from props, context, and explicit defaults.
 * Returns the original props plus `resolvedSize` and `resolvedDisabled` for consumers.
 */
export function useConfigWithDefaults<T extends Record<string, unknown>>(
  props: T,
  defaults: { size?: SizeType; disabled?: boolean; bordered?: boolean },
): T & { resolvedSize: SizeType; resolvedDisabled: boolean } {
  const config = useContext(SgConfigContext)

  return useMemo(() => {
    const resolvedSize =
      (props as Record<string, unknown>).size as SizeType | undefined ??
      config.size ??
      defaults.size ??
      'middle'
    const resolvedDisabled =
      ((props as Record<string, unknown>).disabled as boolean | undefined) ??
      config.disabled ??
      defaults.disabled ??
      false

    return { ...props, resolvedSize, resolvedDisabled }
  }, [props, config.size, config.disabled, defaults.size, defaults.disabled])
}
