import type { Middleware, WriteEvent, NextFn } from '../types'

export type Validator = (event: WriteEvent) => boolean | string

export interface ValidationMiddlewareOptions {
  validators: Record<string, Validator>
  onReject?: (event: WriteEvent, reason: string) => void
}

/**
 * Validates writes against a map of path -> validator.
 * If the validator returns false or a string (error message),
 * the write is rejected and onReject is called (if provided).
 */
export function validationMiddleware(
  optionsOrValidators: ValidationMiddlewareOptions | Record<string, Validator>,
): Middleware {
  const isOptions = 'validators' in optionsOrValidators
  const validators: Record<string, Validator> = isOptions
    ? (optionsOrValidators as ValidationMiddlewareOptions).validators
    : (optionsOrValidators as Record<string, Validator>)
  const onReject = isOptions
    ? (optionsOrValidators as ValidationMiddlewareOptions).onReject
    : undefined

  return (event: WriteEvent, next: NextFn) => {
    const validator = validators[event.path]
    if (validator) {
      const result = validator(event)
      if (result === false || typeof result === 'string') {
        onReject?.(event, typeof result === 'string' ? result : 'Validation failed')
        return
      }
    }
    next(event)
  }
}
