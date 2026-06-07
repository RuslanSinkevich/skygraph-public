import React, { useState } from 'react'
import type { UseHistoryReturn } from '../../hooks/useHistory'
import type { BaseComponentProps } from '../../types'

/** Props for the devtools time-travel history panel (base layout props come from `BaseComponentProps`). */
export interface HistoryPanelProps extends BaseComponentProps {
  /** History controller from `useHistory` (entries, cursor, undo/redo, jump, clear). */
  history: UseHistoryReturn
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    fontFamily: 'ui-monospace, "Cascadia Code", "Fira Code", monospace',
    fontSize: 12,
    border: '1px solid var(--sg-color-border, #d9d9d9)',
    borderRadius: 8,
    background: 'var(--sg-color-bg-elevated, #fff)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderBottom: '1px solid var(--sg-color-border, #d9d9d9)',
    fontWeight: 600,
    fontSize: 13,
  },
  controls: {
    display: 'flex',
    gap: 4,
  },
  btn: {
    padding: '2px 8px',
    border: '1px solid var(--sg-color-border, #d9d9d9)',
    borderRadius: 4,
    background: 'var(--sg-color-bg-secondary, #fafafa)',
    cursor: 'pointer',
    fontSize: 11,
  },
  btnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  list: {
    maxHeight: 300,
    overflowY: 'auto' as const,
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  entry: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 12px',
    cursor: 'pointer',
    borderBottom: '1px solid var(--sg-color-border-secondary, #f0f0f0)',
    transition: 'background 0.15s',
  },
  entryActive: {
    background: 'var(--sg-color-primary-bg, #e6f4ff)',
    fontWeight: 600,
  },
  entryFuture: {
    opacity: 0.5,
  },
  badge: {
    display: 'inline-block',
    padding: '1px 6px',
    borderRadius: 4,
    fontSize: 10,
    background: 'var(--sg-color-primary-bg, #e6f4ff)',
    color: 'var(--sg-color-primary, #1677ff)',
  },
  patches: {
    padding: '4px 12px 8px 32px',
    background: 'var(--sg-color-bg-secondary, #fafafa)',
    fontSize: 11,
    lineHeight: 1.6,
  },
  empty: {
    padding: '24px 12px',
    textAlign: 'center' as const,
    color: 'var(--sg-color-text-tertiary, #999)',
  },
}

/**
 * Time-travel UI listing history entries with undo/redo controls and expandable patch details.
 */
export function HistoryPanel({ history, className, style }: HistoryPanelProps) {
  const { entries, cursor, canUndo, canRedo, undo, redo, jumpTo, clear } = history
  const [expanded, setExpanded] = useState<number | null>(null)

  return (
    <div className={className} style={{ ...styles.root, ...style }}>
      <div style={styles.header}>
        <span>Time-Travel ({entries.length})</span>
        <div style={styles.controls}>
          <button
            style={{ ...styles.btn, ...(canUndo ? {} : styles.btnDisabled) }}
            disabled={!canUndo}
            onClick={undo}
          >
            Undo
          </button>
          <button
            style={{ ...styles.btn, ...(canRedo ? {} : styles.btnDisabled) }}
            disabled={!canRedo}
            onClick={redo}
          >
            Redo
          </button>
          <button style={styles.btn} onClick={clear}>
            Clear
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <div style={styles.empty}>No history yet</div>
      ) : (
        <ul style={styles.list}>
          {entries.map((entry, i) => {
            const isCurrent = i === cursor
            const isFuture = i > cursor

            return (
              <li key={i}>
                <div
                  style={{
                    ...styles.entry,
                    ...(isCurrent ? styles.entryActive : {}),
                    ...(isFuture ? styles.entryFuture : {}),
                  }}
                  onClick={() => jumpTo(i)}
                  onDoubleClick={() => setExpanded(expanded === i ? null : i)}
                >
                  <span style={styles.badge}>{i}</span>
                  <span>
                    {entry.patches.length} write{entry.patches.length !== 1 ? 's' : ''}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.6 }}>
                    {formatTime(entry.timestamp)}
                  </span>
                </div>

                {expanded === i && (
                  <div style={styles.patches}>
                    {entry.patches.map((p, pi) => (
                      <div key={pi}>
                        <code>{p.path}</code>:{' '}
                        <span style={{ opacity: 0.5 }}>{formatValue(p.oldValue)}</span>
                        {' → '}
                        <span>{formatValue(p.value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatValue(v: unknown): string {
  if (v === undefined) return 'undefined'
  if (v === null) return 'null'
  if (typeof v === 'string') return `"${v}"`
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}
