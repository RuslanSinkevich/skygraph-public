import React, { useRef, useState } from 'react'
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
  /** Upload progress percentage (0–100). */
  percent?: number
  /** MIME type of the source file. */
  type?: string
  /** Original `File` reference (only set for newly picked files). */
  raw?: File
}

/** Options forwarded to `customRequest`. */
export interface UploadCustomRequestOptions {
  /** The picked file. */
  file: File
  /** Reports incremental upload progress (0–100). */
  onProgress: (percent: number) => void
  /** Marks the file as successfully uploaded. */
  onSuccess: (response?: unknown) => void
  /** Marks the file as failed with an arbitrary payload. */
  onError: (err: unknown) => void
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
  /** Maximum allowed file size in bytes — files larger than this are skipped. */
  maxSize?: number
  /**
   * Pre-validation hook invoked per file. Return `false` (or a resolved
   * `false`) to skip the file. Mirrors the Vue adapter's
   * `beforeUpload` prop.
   */
  beforeUpload?: (file: File, fileList: File[]) => boolean | Promise<boolean>
  /**
   * Custom upload implementation. When provided, SkyGraph stops faking the
   * upload pipeline — the caller controls progress/success/error via the
   * callbacks. Mirrors the Vue adapter's `customRequest` prop.
   */
  customRequest?: (options: UploadCustomRequestOptions) => void
  /** Visual layout for the file list. @default 'text' */
  listType?: 'text' | 'picture' | 'picture-card'
  /** Hide the built-in list when `false`. @default true */
  showUploadList?: boolean
  /**
   * Renders a drag-and-drop area instead of a click trigger. Files dropped
   * on the area go through the same `beforeUpload` / `customRequest`
   * pipeline as the click trigger.
   */
  drag?: boolean
  /** Called with chosen files after the user confirms the native picker. */
  onUpload?: (files: File[]) => void
  /** Called when the user removes a completed or errored list item. */
  onRemove?: (file: UploadFile) => void
  /** Custom trigger; defaults to a primary Upload button (or drag-area content when `drag`). */
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
  fileList,
  maxCount,
  maxSize,
  beforeUpload,
  customRequest,
  listType = 'text',
  showUploadList = true,
  drag = false,
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

  // Internal list backs `customRequest` progress and uncontrolled removal.
  const isControlled = fileList !== undefined
  const [internalList, setInternalList] = useState<UploadFile[]>(fileList ?? [])
  const list = isControlled ? fileList! : internalList
  const [isDragging, setIsDragging] = useState(false)

  const updateList = (next: UploadFile[] | ((prev: UploadFile[]) => UploadFile[])) => {
    if (!isControlled) {
      setInternalList((prev) => (typeof next === 'function' ? next(prev) : next))
    }
  }

  const patchFile = (uid: string, patch: Partial<UploadFile>) => {
    updateList((prev) => prev.map((f) => (f.uid === uid ? { ...f, ...patch } : f)))
  }

  const handleClick = () => {
    if (disabled || loading) return
    inputRef.current?.click()
  }

  const handleFiles = async (rawFiles: File[]) => {
    if (rawFiles.length === 0) return
    const accepted: File[] = []
    for (const file of rawFiles) {
      if (maxSize !== undefined && file.size > maxSize) continue
      if (beforeUpload) {
        const ok = await beforeUpload(file, rawFiles)
        if (ok === false) continue
      }
      accepted.push(file)
    }
    if (accepted.length === 0) return

    let trimmed = accepted
    if (maxCount) {
      const remaining = maxCount - list.length
      trimmed = accepted.slice(0, Math.max(0, remaining))
    }

    if (customRequest) {
      const newItems: UploadFile[] = trimmed.map((file) => ({
        uid: `sg-upl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: file.name,
        size: file.size,
        status: 'uploading' as const,
        percent: 0,
        type: file.type,
        raw: file,
      }))
      updateList((prev) => [...prev, ...newItems])
      for (const item of newItems) {
        if (!item.raw) continue
        customRequest({
          file: item.raw,
          onProgress: (percent) => patchFile(item.uid, { percent }),
          onSuccess: () => patchFile(item.uid, { status: 'done', percent: 100 }),
          onError: () => patchFile(item.uid, { status: 'error' }),
        })
      }
    }

    onUpload?.(trimmed)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    void handleFiles(files)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled || loading) return
    const files = Array.from(e.dataTransfer.files ?? [])
    void handleFiles(files)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (disabled || loading) return
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleRemove = (file: UploadFile) => {
    updateList((prev) => prev.filter((f) => f.uid !== file.uid))
    onRemove?.(file)
  }

  const wrapperClass = unstyled
    ? (className ?? '')
    : [
        'sg-upload',
        `sg-upload-${listType}`,
        drag ? 'sg-upload-drag' : 'sg-upload-select',
        disabled ? 'sg-upload-disabled' : '',
        loading ? 'sg-upload-loading' : '',
        isDragging ? 'sg-upload-dragging' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')

  const renderTrigger = () => {
    if (drag) {
      return (
        <div
          className={unstyled ? '' : 'sg-upload-drag-area'}
          role="button"
          tabIndex={0}
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {children ?? (
            <>
              <p className={unstyled ? '' : 'sg-upload-drag-icon'}>⬆</p>
              <p className={unstyled ? '' : 'sg-upload-drag-text'}>
                Click or drag file to this area to upload
              </p>
            </>
          )}
        </div>
      )
    }
    return (
      <div className={unstyled ? '' : 'sg-upload-select-trigger'} onClick={handleClick}>
        {children ?? (
          <Button disabled={disabled} loading={loading}>
            {uploadText}
          </Button>
        )}
      </div>
    )
  }

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
      {renderTrigger()}
      {showUploadList && list.length > 0 && (
        <div className={unstyled ? '' : 'sg-upload-list'}>
          {list.map((file) => (
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
              {file.status === 'uploading' && (
                <span className={unstyled ? '' : 'sg-upload-item-progress'}>
                  {file.percent ?? 0}%
                </span>
              )}
              {file.status !== 'uploading' && (
                <button
                  type="button"
                  className={unstyled ? '' : 'sg-upload-item-remove'}
                  onClick={() => handleRemove(file)}
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
