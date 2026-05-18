import React, { useRef } from 'react'
import { Button } from './Button'
import { Spin } from './Spin'
import { useConfig } from '../ConfigProvider'
import type { BaseComponentProps, InteractiveProps } from '../../types'

/** File entry shown in the upload list after selection or simulated progress. */
export interface UploadFile {
  /** Stable unique id for list keys and remove callbacks. */
  uid: string
  /** Display file name. */
  name: string
  /** File size in bytes. */
  size: number
  /** Visual state in the file list row. */
  status: 'uploading' | 'done' | 'error'
}

/** Props for the file picker trigger, optional custom trigger, and file list UI. */
export interface UploadProps extends BaseComponentProps, InteractiveProps {
  /** Passed to the hidden `<input type="file">` accept attribute. */
  accept?: string
  /** Allows selecting more than one file per dialog when supported. */
  multiple?: boolean
  /** Files to render in the list below the trigger. @default [] */
  fileList?: UploadFile[]
  /** Caps how many new files are passed to `onUpload` relative to current list length. */
  maxCount?: number
  /** Called with chosen files after the user confirms the native picker. */
  onUpload?: (files: File[]) => void
  /** Called when the user removes a completed or errored list item. */
  onRemove?: (file: UploadFile) => void
  /** Custom trigger; defaults to a primary Upload button. */
  children?: React.ReactNode
}

/**
 * Hidden file input with a clickable trigger and optional controlled file list with remove actions.
 */
export function Upload({
  accept,
  multiple,
  disabled: disabledProp,
  loading,
  fileList = [],
  maxCount,
  onUpload,
  onRemove,
  children,
  className,
  style,
  unstyled,
}: UploadProps) {
  const config = useConfig()
  const disabled = disabledProp ?? config.disabled
  const uploadLocale = config.locale?.upload
  const uploadText = uploadLocale?.uploadText ?? 'Upload'
  const removeLabel = uploadLocale?.removeFile ?? 'Remove file'
  const uploadAriaLabel = uploadLocale?.uploadAriaLabel ?? 'Upload file'
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => {
    if (disabled || loading) return
    inputRef.current?.click()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (maxCount) {
      const remaining = maxCount - fileList.length
      onUpload?.(files.slice(0, Math.max(0, remaining)))
    } else {
      onUpload?.(files)
    }
    if (inputRef.current) inputRef.current.value = ''
  }

  const wrapperClass = unstyled
    ? (className ?? '')
    : ['sg-upload', loading ? 'sg-upload-loading' : '', className].filter(Boolean).join(' ')

  return (
    <div className={wrapperClass} style={style}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        style={{ display: 'none' }}
        aria-label={uploadAriaLabel}
        onChange={handleChange}
      />
      <div onClick={handleClick}>
        {children ?? (
          <Button disabled={disabled} loading={loading}>
            {uploadText}
          </Button>
        )}
      </div>
      {fileList.length > 0 && (
        <div className={unstyled ? '' : 'sg-upload-list'}>
          {fileList.map((file) => (
            <div
              key={file.uid}
              className={
                unstyled
                  ? ''
                  : ['sg-upload-item', `sg-upload-item-${file.status}`].filter(Boolean).join(' ')
              }
            >
              <span className={unstyled ? '' : 'sg-upload-item-name'}>
                {file.status === 'uploading' && <Spin size="small" unstyled={unstyled} />}
                {file.name}
              </span>
              {file.status !== 'uploading' && (
                <button
                  type="button"
                  className={unstyled ? '' : 'sg-upload-item-remove'}
                  onClick={() => onRemove?.(file)}
                  aria-label={`${removeLabel}: ${file.name}`}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
