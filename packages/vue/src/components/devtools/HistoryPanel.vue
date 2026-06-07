<script setup lang="ts">
/**
 * Time-travel devtool panel — Vue port of React's `HistoryPanel`.
 *
 * Listens to `useHistory()` reactivity (entries / cursor / canUndo /
 * canRedo) and renders the same inline-styled UI as the React adapter.
 * No `sg-*` classes are emitted — React's panel doesn't ship any either,
 * the layout lives entirely in inline styles so the devtool drops cleanly
 * into any host page without theming.
 *
 * Locale strings (`Time-Travel`, `Undo`, `Redo`, `Clear`, `No history yet`,
 * `write/writes`) are hard-coded — `SgLocale` does not expose a
 * `devtools.historyPanel` key today.
 */
import type { CSSProperties } from 'vue'
import { ref } from 'vue'
import type { UseHistoryReturn } from '../../composables/useHistory'

export interface HistoryPanelProps {
  /** History controller from `useHistory` (entries, cursor, undo/redo, jump, clear). */
  history: UseHistoryReturn
  /** Inline style merged onto the root. */
  style?: CSSProperties
}

const props = defineProps<HistoryPanelProps>()

const expanded = ref<number | null>(null)

function toggleExpanded(i: number) {
  expanded.value = expanded.value === i ? null : i
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

const styles: Record<string, CSSProperties> = {
  root: {
    fontFamily: 'ui-monospace, "Cascadia Code", "Fira Code", monospace',
    fontSize: '12px',
    border: '1px solid var(--sg-color-border, #d9d9d9)',
    borderRadius: '8px',
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
    fontSize: '13px',
  },
  controls: {
    display: 'flex',
    gap: '4px',
  },
  btn: {
    padding: '2px 8px',
    border: '1px solid var(--sg-color-border, #d9d9d9)',
    borderRadius: '4px',
    background: 'var(--sg-color-bg-secondary, #fafafa)',
    cursor: 'pointer',
    fontSize: '11px',
  },
  btnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  list: {
    maxHeight: '300px',
    overflowY: 'auto',
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  entry: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
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
    borderRadius: '4px',
    fontSize: '10px',
    background: 'var(--sg-color-primary-bg, #e6f4ff)',
    color: 'var(--sg-color-primary, #1677ff)',
  },
  patches: {
    padding: '4px 12px 8px 32px',
    background: 'var(--sg-color-bg-secondary, #fafafa)',
    fontSize: '11px',
    lineHeight: 1.6,
  },
  empty: {
    padding: '24px 12px',
    textAlign: 'center',
    color: 'var(--sg-color-text-tertiary, #999)',
  },
}
</script>

<template>
  <div :style="{ ...styles.root, ...(props.style ?? {}) }">
    <div :style="styles.header">
      <span>Time-Travel ({{ props.history.entries.value.length }})</span>
      <div :style="styles.controls">
        <button
          type="button"
          :style="{
            ...styles.btn,
            ...(props.history.canUndo.value ? {} : styles.btnDisabled),
          }"
          :disabled="!props.history.canUndo.value"
          @click="props.history.undo()"
        >
          Undo
        </button>
        <button
          type="button"
          :style="{
            ...styles.btn,
            ...(props.history.canRedo.value ? {} : styles.btnDisabled),
          }"
          :disabled="!props.history.canRedo.value"
          @click="props.history.redo()"
        >
          Redo
        </button>
        <button type="button" :style="styles.btn" @click="props.history.clear()">Clear</button>
      </div>
    </div>

    <div v-if="props.history.entries.value.length === 0" :style="styles.empty">No history yet</div>
    <ul v-else :style="styles.list">
      <li v-for="(entry, i) in props.history.entries.value" :key="i">
        <div
          :style="{
            ...styles.entry,
            ...(i === props.history.cursor.value ? styles.entryActive : {}),
            ...(i > props.history.cursor.value ? styles.entryFuture : {}),
          }"
          @click="props.history.jumpTo(i)"
          @dblclick="toggleExpanded(i)"
        >
          <span :style="styles.badge">{{ i }}</span>
          <span> {{ entry.patches.length }} write{{ entry.patches.length !== 1 ? 's' : '' }} </span>
          <span :style="{ marginLeft: 'auto', fontSize: '10px', opacity: 0.6 }">
            {{ formatTime(entry.timestamp) }}
          </span>
        </div>

        <div v-if="expanded === i" :style="styles.patches">
          <div v-for="(p, pi) in entry.patches" :key="pi">
            <code>{{ p.path }}</code
            >:
            <span :style="{ opacity: 0.5 }">{{ formatValue(p.oldValue) }}</span>
            {{ ' → ' }}
            <span>{{ formatValue(p.value) }}</span>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>
