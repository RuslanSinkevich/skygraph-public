import React from 'react'
import { Button } from '../ui/Button'

/** Props for a primary-styled submit {@link Button} used inside {@link Form}. */
export interface SubmitButtonProps {
  /** Button label; falls back when omitted in destructuring.
   * @default 'Submit'
   */
  children?: React.ReactNode
  /** Disables the button. */
  disabled?: boolean
  /** Shows a loading state on the button. */
  loading?: boolean
  /** Extra class names passed to {@link Button}. */
  className?: string
  /** Inline styles forwarded to the underlying {@link Button}. */
  style?: React.CSSProperties
  /** Strips built-in button styles on the underlying {@link Button}. */
  unstyled?: boolean
}

/**
 * `type="submit"` primary button; forwards disabled/loading and styling to {@link Button}.
 */
export function SubmitButton({
  children = 'Submit',
  disabled,
  loading,
  className,
  style,
  unstyled,
}: SubmitButtonProps) {
  return (
    <Button
      type="primary"
      htmlType="submit"
      disabled={disabled}
      loading={loading}
      className={className}
      style={style}
      unstyled={unstyled}
    >
      {children}
    </Button>
  )
}
