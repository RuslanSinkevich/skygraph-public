import React, { useState, useEffect, useCallback, Children } from 'react'
import { useConfig } from '../ConfigProvider'
import type { BaseComponentProps } from '../../types'

/** Props for a simple slide carousel with dots and optional autoplay. */
export interface CarouselProps extends BaseComponentProps {
  /** Advances to the next slide on an interval when there is more than one slide. @default false */
  autoplay?: boolean
  /** Interval in ms between autoplay steps. @default 3000 */
  autoplaySpeed?: number
  /** Shows dot controls to jump between slides (hidden when only one slide in styled mode). @default true */
  dots?: boolean
  /** Where dot navigation is placed relative to the track. @default 'bottom' */
  dotPosition?: 'top' | 'bottom' | 'left' | 'right'
  /** Transition between slides: horizontal offset or crossfade. @default 'slide' */
  effect?: 'slide' | 'fade'
  /** Each direct child is treated as one slide. */
  children: React.ReactNode
}

/**
 * Cycles through child slides with optional autoplay, dot navigation, and slide or fade transitions.
 */
export function Carousel({
  autoplay = false,
  autoplaySpeed = 3000,
  dots = true,
  dotPosition = 'bottom',
  effect = 'slide',
  children,
  className,
  style,
  unstyled,
}: CarouselProps) {
  const slides = Children.toArray(children)
  const count = slides.length
  const [current, setCurrent] = useState(0)
  const slideLabel = useConfig().locale?.carousel?.slide ?? ((index: number) => `Slide ${index}`)

  const goTo = useCallback(
    (index: number) => {
      setCurrent(((index % count) + count) % count)
    },
    [count],
  )

  useEffect(() => {
    if (!autoplay || count <= 1) return
    const id = setInterval(() => goTo(current + 1), autoplaySpeed)
    return () => clearInterval(id)
  }, [autoplay, autoplaySpeed, current, count, goTo])

  if (unstyled) {
    return (
      <div className={className} style={style}>
        {slides[current]}
        {dots && (
          <div>
            {slides.map((_, i) => (
              <button key={i} onClick={() => goTo(i)} aria-current={i === current}>
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  const isVertical = dotPosition === 'left' || dotPosition === 'right'

  return (
    <div
      className={[
        'sg-carousel',
        `sg-carousel-dots-${dotPosition}`,
        isVertical ? 'sg-carousel-vertical' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      <div className="sg-carousel-container">
        <div className="sg-carousel-track">
          {slides.map((slide, i) => (
            <div
              key={i}
              className={[
                'sg-carousel-slide',
                i === current ? 'sg-carousel-slide-active' : '',
                `sg-carousel-effect-${effect}`,
              ]
                .filter(Boolean)
                .join(' ')}
              style={
                effect === 'slide'
                  ? { transform: `translateX(${(i - current) * 100}%)` }
                  : undefined
              }
              aria-hidden={i !== current}
            >
              {slide}
            </div>
          ))}
        </div>
      </div>

      {dots && count > 1 && (
        <div
          className={['sg-carousel-dots', isVertical ? 'sg-carousel-dots-vertical' : '']
            .filter(Boolean)
            .join(' ')}
        >
          {slides.map((_, i) => (
            <button
              key={i}
              className={['sg-carousel-dot', i === current ? 'sg-carousel-dot-active' : '']
                .filter(Boolean)
                .join(' ')}
              onClick={() => goTo(i)}
              aria-label={slideLabel(i + 1)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
