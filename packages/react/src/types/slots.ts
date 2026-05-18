import type React from 'react'

/**
 * Слот-API: публичный контракт для точечной стилизации сложных компонентов.
 * См. `docs/styling-contract.md` §2.2, §4.
 *
 * - `classNames?: XxxClassNames` — дополнительный класс на конкретный слот;
 * - `styles?: XxxStyles` — инлайн-стили на конкретный слот;
 * - `className` / `style` (на корне) — применяются дополнительно к `classNames.root` / `styles.root`;
 * - порядок: дефолтный класс библиотеки → пользовательский слот-класс → корневой `className`.
 */

/** Мапа `слот → className`. */
export type SlotClassNames<K extends string> = Partial<Record<K, string>>

/** Мапа `слот → React.CSSProperties`. */
export type SlotStyles<K extends string> = Partial<Record<K, React.CSSProperties>>

/**
 * Объединяет базовый класс, пользовательский класс для слота и (опционально)
 * дополнительные модификаторы в один className.
 *
 * ```ts
 * const cls = slotClass('sg-table-th', classNames?.headerCell, extraMod && 'sg-table-th-sortable')
 * ```
 */
export function slotClass(
  ...parts: Array<string | false | null | undefined>
): string | undefined {
  const filtered = parts.filter((p): p is string => typeof p === 'string' && p.length > 0)
  return filtered.length ? filtered.join(' ') : undefined
}

/**
 * Мержит пользовательские стили слота с базовым `style`.
 * Пользовательские стили переопределяют базовые.
 */
export function slotStyle(
  base: React.CSSProperties | undefined,
  custom: React.CSSProperties | undefined,
): React.CSSProperties | undefined {
  if (!base && !custom) return undefined
  if (!base) return custom
  if (!custom) return base
  return { ...base, ...custom }
}
