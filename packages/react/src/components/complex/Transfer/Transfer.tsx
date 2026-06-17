import React from 'react'
import { Button } from '../../ui/Button'
import { useConfig } from '../../ConfigProvider'
import { TransferList } from './TransferList'
import type { TransferProps } from './types'
import { DEFAULT_TRANSFER_LOCALE } from './types'

function cls(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(' ')
}

/**
 * Two-column shuttle to move items between source and target key sets.
 * Supports search, pagination, one-way mode, and unstyled rendering.
 */
export function Transfer({
  dataSource,
  targetKeys,
  onChange,
  selectedKeys: controlledSelectedKeys,
  onSelectChange,
  titles,
  render,
  showSearch = false,
  filterOption,
  searchPlaceholder,
  showSelectAll = true,
  disabled = false,
  oneWay = false,
  pagination,
  locale,
  className,
  style,
  unstyled,
  footer,
  operations,
  operationsStyle,
  sortable,
  onSort,
  onSearch,
  listHeight,
  listClassName,
}: TransferProps) {
  const config = useConfig()
  const mergedLocale = React.useMemo(
    () => ({
      ...DEFAULT_TRANSFER_LOCALE,
      ...config.locale?.transfer,
      ...locale,
    }),
    [config.locale?.transfer, locale],
  )
  const resolvedTitles = titles ?? config.locale?.transfer?.titles

  const [internalSourceSelected, setInternalSourceSelected] = React.useState<string[]>([])
  const [internalTargetSelected, setInternalTargetSelected] = React.useState<string[]>([])

  const sourceSelected = controlledSelectedKeys
    ? controlledSelectedKeys.filter((k) => !targetKeys.includes(k))
    : internalSourceSelected
  const targetSelected = controlledSelectedKeys
    ? controlledSelectedKeys.filter((k) => targetKeys.includes(k))
    : internalTargetSelected

  const setSourceSelected = (keys: string[]) => {
    if (!controlledSelectedKeys) setInternalSourceSelected(keys)
    onSelectChange?.(keys, targetSelected)
  }

  const setTargetSelected = (keys: string[]) => {
    if (!controlledSelectedKeys) setInternalTargetSelected(keys)
    onSelectChange?.(sourceSelected, keys)
  }

  const targetKeySet = React.useMemo(() => new Set(targetKeys), [targetKeys])

  const sourceItems = React.useMemo(
    () => dataSource.filter((item) => !targetKeySet.has(item.key)),
    [dataSource, targetKeySet],
  )

  const targetItems = React.useMemo(
    () => dataSource.filter((item) => targetKeySet.has(item.key)),
    [dataSource, targetKeySet],
  )

  const moveToRight = () => {
    const moveKeys = sourceSelected.filter((k) => {
      const item = dataSource.find((i) => i.key === k)
      return item && !item.disabled
    })
    if (moveKeys.length === 0) return

    const newTargetKeys = [...targetKeys, ...moveKeys]
    onChange?.(newTargetKeys, 'right', moveKeys)
    setSourceSelected([])
  }

  const moveToLeft = () => {
    const moveKeys = targetSelected.filter((k) => {
      const item = dataSource.find((i) => i.key === k)
      return item && !item.disabled
    })
    if (moveKeys.length === 0) return

    const moveKeySet = new Set(moveKeys)
    const newTargetKeys = targetKeys.filter((k) => !moveKeySet.has(k))
    onChange?.(newTargetKeys, 'left', moveKeys)
    setTargetSelected([])
  }

  const canMoveRight = sourceSelected.some((k) => {
    const item = dataSource.find((i) => i.key === k)
    return item && !item.disabled
  })

  const canMoveLeft =
    !oneWay &&
    targetSelected.some((k) => {
      const item = dataSource.find((i) => i.key === k)
      return item && !item.disabled
    })

  const resolveFooter = (dir: 'left' | 'right'): React.ReactNode => {
    if (!footer) return undefined
    if (typeof footer === 'function') return footer({ direction: dir })
    return dir === 'left' ? footer[0] : footer[1]
  }

  const listCommonProps = {
    render,
    showSearch,
    filterOption,
    searchPlaceholder,
    showSelectAll,
    disabled,
    pagination,
    locale: mergedLocale,
    sortable,
    onSort,
    onSearch,
    listHeight,
    listClassName,
  }

  if (unstyled) {
    return (
      <div className={className} style={style}>
        <TransferList
          unstyled
          items={sourceItems}
          selectedKeys={sourceSelected}
          onSelect={setSourceSelected}
          title={resolvedTitles?.[0]}
          direction="left"
          footer={resolveFooter('left')}
          {...listCommonProps}
        />
        <div>
          {operations ? (
            operations[0]
          ) : (
            <button disabled={disabled || !canMoveRight} onClick={moveToRight}>
              →
            </button>
          )}
          {!oneWay &&
            (operations ? (
              operations[1]
            ) : (
              <button disabled={disabled || !canMoveLeft} onClick={moveToLeft}>
                ←
              </button>
            ))}
        </div>
        <TransferList
          unstyled
          items={targetItems}
          selectedKeys={targetSelected}
          onSelect={setTargetSelected}
          title={resolvedTitles?.[1]}
          direction="right"
          footer={resolveFooter('right')}
          {...listCommonProps}
        />
      </div>
    )
  }

  return (
    <div
      className={cls('sg-transfer', disabled && 'sg-transfer-disabled', className)}
      style={style}
    >
      <TransferList
        items={sourceItems}
        selectedKeys={sourceSelected}
        onSelect={setSourceSelected}
        title={resolvedTitles?.[0] ?? 'Source'}
        direction="left"
        footer={resolveFooter('left')}
        {...listCommonProps}
      />

      <div className="sg-transfer-operations" style={operationsStyle}>
        {operations ? (
          operations[0]
        ) : (
          <Button
            type="primary"
            size="small"
            disabled={disabled || !canMoveRight}
            onClick={moveToRight}
          >
            →
          </Button>
        )}
        {!oneWay &&
          (operations ? (
            operations[1]
          ) : (
            <Button
              type="primary"
              size="small"
              disabled={disabled || !canMoveLeft}
              onClick={moveToLeft}
            >
              ←
            </Button>
          ))}
      </div>

      <TransferList
        items={targetItems}
        selectedKeys={targetSelected}
        onSelect={setTargetSelected}
        title={resolvedTitles?.[1] ?? 'Target'}
        direction="right"
        footer={resolveFooter('right')}
        {...listCommonProps}
      />
    </div>
  )
}
