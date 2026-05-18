import React, { useState, useEffect, useRef, useCallback } from 'react'

/** Props for class-based enter/leave animation on a single child element. */
export interface TransitionProps {
  /** When `true`, runs enter; when `false`, runs leave (and may unmount). */
  visible: boolean
  /** Base class name prefix for default enter/leave classes (e.g. `sg-fade-enter-from`). @default 'sg-fade' */
  name?: string
  /** Animation length in ms before idle phase and after callbacks. @default 200 */
  duration?: number
  /** Custom initial class for the enter frame (with `-enter-active`). */
  enterFrom?: string
  /** Custom final class for the enter-active frame. */
  enterTo?: string
  /** Custom initial class for the leave frame (with `-leave-active`). */
  leaveFrom?: string
  /** Custom final class for the leave-active frame. */
  leaveTo?: string
  /** Fires once the enter transition timer completes. */
  onAfterEnter?: () => void
  /** Fires once the leave transition timer completes. */
  onAfterLeave?: () => void
  /** Single React element whose `className` will be merged with transition classes. */
  children: React.ReactElement<{ className?: string; ref?: React.Ref<HTMLElement> }>
  /** When `true`, removes the child from the tree after leave; when `false`, keeps it mounted. @default true */
  unmountOnExit?: boolean
}

type Phase = 'idle' | 'enter' | 'enter-active' | 'leave' | 'leave-active'

/**
 * Clones a single child and toggles CSS classes over `duration` when `visible` changes, optionally unmounting after leave.
 */
export function Transition({
  visible,
  name = 'sg-fade',
  duration = 200,
  enterFrom,
  enterTo,
  leaveFrom,
  leaveTo,
  onAfterEnter,
  onAfterLeave,
  children,
  unmountOnExit = true,
}: TransitionProps) {
  const [mounted, setMounted] = useState(visible)
  const [phase, setPhase] = useState<Phase>(visible ? 'idle' : 'idle')
  const nodeRef = useRef<HTMLElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const prevVisible = useRef(visible)

  const getEnterClasses = useCallback(() => {
    if (enterFrom && enterTo) return { from: enterFrom, active: `${name}-enter-active`, to: enterTo }
    return { from: `${name}-enter-from`, active: `${name}-enter-active`, to: `${name}-enter-to` }
  }, [name, enterFrom, enterTo])

  const getLeaveClasses = useCallback(() => {
    if (leaveFrom && leaveTo) return { from: leaveFrom, active: `${name}-leave-active`, to: leaveTo }
    return { from: `${name}-leave-from`, active: `${name}-leave-active`, to: `${name}-leave-to` }
  }, [name, leaveFrom, leaveTo])

  useEffect(() => {
    if (visible === prevVisible.current) return
    prevVisible.current = visible
    clearTimeout(timerRef.current)

    if (visible) {
      setMounted(true)
      setPhase('enter')
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setPhase('enter-active'))
      })
      timerRef.current = setTimeout(() => {
        setPhase('idle')
        onAfterEnter?.()
      }, duration)
    } else {
      setPhase('leave')
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setPhase('leave-active'))
      })
      timerRef.current = setTimeout(() => {
        setPhase('idle')
        if (unmountOnExit) setMounted(false)
        onAfterLeave?.()
      }, duration)
    }
  }, [visible, duration, unmountOnExit, onAfterEnter, onAfterLeave])

  useEffect(() => {
    return () => clearTimeout(timerRef.current)
  }, [])

  if (!mounted && unmountOnExit) return null

  const enterC = getEnterClasses()
  const leaveC = getLeaveClasses()

  let transitionClass = ''
  switch (phase) {
    case 'enter':
      transitionClass = `${enterC.from} ${enterC.active}`
      break
    case 'enter-active':
      transitionClass = `${enterC.to} ${enterC.active}`
      break
    case 'leave':
      transitionClass = `${leaveC.from} ${leaveC.active}`
      break
    case 'leave-active':
      transitionClass = `${leaveC.to} ${leaveC.active}`
      break
  }

  return React.cloneElement(children, {
    ref: nodeRef,
    className: [children.props.className, transitionClass].filter(Boolean).join(' '),
  })
}
