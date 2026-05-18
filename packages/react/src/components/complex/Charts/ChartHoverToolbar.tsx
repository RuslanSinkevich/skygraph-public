import type { CSSProperties, ReactNode } from 'react'
import { downloadSvg, downloadSvgAsPng } from './chartExport'
import { printElement } from '../../../utils/print'
import { useConfig } from '../../ConfigProvider'

/**
 * Контекст, передаваемый в `onClick` каждой `ChartAction`. Содержит ссылку
 * на корневой `<svg>` чарта, опциональное имя файла для экспортов и
 * утилиты сброса brush / переключения легенды (если эти сценарии включены
 * вызывающей стороной).
 */
export interface ChartActionContext {
  /** Корневой SVG-элемент текущего чарта. */
  svg: SVGSVGElement
  /** Базовое имя файла без расширения (используется print / SVG / PNG). */
  fileName?: string
  /** Сбросить активный brush — определён только если у чарта `brush` включён. */
  brushReset?: () => void
  /** Переключить отображение легенды — userland-сценарий, не определён по умолчанию. */
  toggleLegend?: () => void
}

/**
 * Декларативное описание одной кнопки в hover-toolbar чарта. UI-аватар
 * (`icon`) — любой `ReactNode` (обычно inline-SVG 16×16 stroke 1.5).
 */
export interface ChartAction {
  /** Уникальный id (попадает в `data-sg-action`). */
  id: string
  /** Иконка кнопки (рекомендуется inline SVG 16×16, stroke 1.5). */
  icon: ReactNode
  /** Текст для `aria-label` / `title`. */
  label: string
  /** Обработчик клика. Получает контекст с SVG-ссылкой. */
  onClick: (ctx: ChartActionContext) => void
  /** Скрыть кнопку (но оставить в массиве — для условной логики). */
  hidden?: boolean
}

/**
 * Допустимые значения prop-а `actions`:
 * - `false` / `undefined` — toolbar не рендерится.
 * - `true` — рендерится дефолтный набор (print + SVG + PNG + reset brush, если включён).
 * - массив `ChartAction[]` — кастомный набор.
 */
export type ChartActionsProp = boolean | readonly ChartAction[]

/**
 * Иконки для дефолтных кнопок. Намеренно inline-SVG, без `lucide-react` /
 * других runtime-зависимостей. Все 16×16, `stroke="currentColor"`,
 * `stroke-width="1.5"`, без заливок — следуют конвенции SkyGraph.
 */
function IconStroke(props: { d: string; extra?: ReactNode }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={props.d} />
      {props.extra}
    </svg>
  )
}

const PRINT_ICON = (
  <IconStroke
    d="M4 6V2.5h8V6"
    extra={
      <>
        <rect x={3} y={6} width={10} height={6} rx={1} />
        <path d="M4.5 10h7v3.5h-7z" />
      </>
    }
  />
)

const SVG_ICON = (
  <IconStroke
    d="M3 8.5v3.25A1.25 1.25 0 0 0 4.25 13h7.5A1.25 1.25 0 0 0 13 11.75V8.5"
    extra={
      <>
        <path d="M8 2.5v7" />
        <path d="M5 6.5l3 3 3-3" />
      </>
    }
  />
)

const PNG_ICON = (
  <IconStroke
    d="M2.5 3.5h11v9h-11z"
    extra={
      <>
        <circle cx={5.5} cy={6.5} r={0.9} />
        <path d="M2.5 11l3-3 2.5 2.5L10.5 8l3 3" />
      </>
    }
  />
)

const RESET_ICON = (
  <IconStroke
    d="M3 8a5 5 0 1 0 1.5-3.5"
    extra={
      <>
        <path d="M3 3v3h3" />
      </>
    }
  />
)

/**
 * Возвращает дефолтный набор `ChartAction`-ов для toolbar-а. Используется
 * чартами, когда `actions=true` (sugar-форма).
 */
export function defaultChartActions(opts: {
  /** Передаётся в `printElement` как `fileName`. */
  fileName?: string
  /** Если задан — добавляется кнопка `resetBrush`. */
  brushReset?: () => void
}): ChartAction[] {
  const list: ChartAction[] = [
    {
      id: 'print',
      label: 'Print',
      icon: PRINT_ICON,
      onClick: ({ svg }) => {
        printElement(svg, opts.fileName ? { fileName: opts.fileName } : {})
      },
    },
    {
      id: 'downloadSvg',
      label: 'Download SVG',
      icon: SVG_ICON,
      onClick: ({ svg, fileName }) => {
        downloadSvg(svg, `${fileName ?? 'chart'}.svg`)
      },
    },
    {
      id: 'downloadPng',
      label: 'Download PNG',
      icon: PNG_ICON,
      onClick: ({ svg, fileName }) => {
        // Игнорим ошибку декодирования (browser-only) — пользователь
        // увидит, что файл не появился; ронять рантайм здесь смысла нет.
        downloadSvgAsPng(svg, `${fileName ?? 'chart'}.png`).catch(() => {})
      },
    },
  ]
  if (opts.brushReset) {
    list.push({
      id: 'resetBrush',
      label: 'Reset zoom',
      icon: RESET_ICON,
      onClick: ({ brushReset }) => brushReset?.(),
    })
  }
  return list
}

export interface ChartHoverToolbarProps {
  /** Видимая ли панель сейчас (родитель прокидывает по hover/focus). */
  visible: boolean
  /** Список кнопок. */
  actions: readonly ChartAction[]
  /** Базовое имя файла для экспортов / print. */
  fileName?: string
  /** Возвращает текущий SVG-элемент чарта (на момент клика). */
  getSvg: () => SVGSVGElement | null
  /** Сбросить brush (если в чарте он есть). */
  brushReset?: () => void
  /** Переключить легенду — userland решает. */
  toggleLegend?: () => void
  /** Сбросить дефолтные классы `.sg-chart-toolbar*` — headless-режим. */
  unstyled?: boolean
  /** Опциональный `className` для контейнера. */
  className?: string
  /** Опциональный inline-style на контейнере. */
  style?: CSSProperties
}

/**
 * Floating-панель действий, плавающая поверх чарта в правом верхнем углу.
 *
 * Появляется на hover/focus родителя — родитель сам управляет prop-ом
 * `visible` (через `data-sg-toolbar="visible|hidden"`). CSS-анимация
 * `opacity 180ms` живёт в `charts.css`. Сама обёртка имеет `pointer-events:
 * none`, кнопки — `pointer-events: auto`, чтобы не перехватывать события
 * crosshair / brush на пустом overlay.
 */
export function ChartHoverToolbar({
  visible,
  actions,
  fileName,
  getSvg,
  brushReset,
  toggleLegend,
  unstyled,
  className,
  style,
}: ChartHoverToolbarProps) {
  const chartsLocale = useConfig().locale?.charts
  const visibleActions = actions.filter((a) => !a.hidden)
  if (visibleActions.length === 0) return null

  const wrapperClass = unstyled
    ? className
    : ['sg-chart-toolbar', className].filter(Boolean).join(' ')

  const buttonClass = unstyled ? undefined : 'sg-chart-toolbar-button'

  return (
    <div
      className={wrapperClass}
      style={style}
      data-sg-chart-toolbar=""
      data-sg-toolbar={visible ? 'visible' : 'hidden'}
      role="toolbar"
      aria-label={chartsLocale?.actions ?? 'Chart actions'}
      aria-hidden={visible ? undefined : true}
    >
      {visibleActions.map((a) => (
        <button
          key={a.id}
          type="button"
          className={buttonClass}
          data-sg-action={a.id}
          aria-label={a.label}
          title={a.label}
          tabIndex={visible ? 0 : -1}
          onClick={(e) => {
            e.stopPropagation()
            const svg = getSvg()
            if (!svg) return
            a.onClick({ svg, fileName, brushReset, toggleLegend })
          }}
        >
          {a.icon}
        </button>
      ))}
    </div>
  )
}

/**
 * Резолвит prop `actions` (boolean | array) в актуальный массив с учётом
 * дефолтных кнопок и опциональной кнопки `resetBrush`. Возвращает `null`,
 * если toolbar в принципе не должен рендериться.
 */
export function resolveChartActions(
  actions: ChartActionsProp | undefined,
  opts: { fileName?: string; brushReset?: () => void },
): readonly ChartAction[] | null {
  if (!actions) return null
  if (actions === true) return defaultChartActions(opts)
  return actions
}
