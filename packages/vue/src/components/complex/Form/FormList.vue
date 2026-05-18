<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from 'vue'
import { formContextKey } from './context'
import type { FormListOperation } from '@skygraph/core'

let listUid = 0
function genKey(): string {
  return `fl_${++listUid}`
}

export interface FormListField {
  /** Stable key for v-for reconciliation. */
  key: string
  /** Zero-based index in the list value array. */
  index: number
}

export interface FormListProps {
  /** Field path in the form store holding the array value. */
  name: string
  /** Seeds the store when the path is unset on first mount. */
  initialValue?: unknown[]
}

const props = defineProps<FormListProps>()

defineSlots<{
  default(props: {
    fields: FormListField[]
    operation: FormListOperation
    meta: { errors: string[] }
  }): unknown
}>()

const injected = inject(formContextKey, null)
if (!injected) {
  throw new Error('[skygraph/vue] <SgFormList> must be used inside an <SgForm>')
}
const ctx = injected

onMounted(() => {
  if (props.initialValue && !Array.isArray(ctx.core.get(props.name))) {
    ctx.core.set(props.name, props.initialValue)
  }
})

const items = ref<unknown[]>(
  Array.isArray(ctx.core.get(props.name)) ? (ctx.core.get(props.name) as unknown[]) : [],
)
const keys = ref<string[]>(items.value.map(() => genKey()))

const unsub = ctx.core.subscribe(props.name, (v) => {
  const arr = Array.isArray(v) ? v : []
  items.value = arr
})

watch(items, (newItems) => {
  if (newItems.length > keys.value.length) {
    const diff = newItems.length - keys.value.length
    keys.value = [...keys.value, ...Array.from({ length: diff }, () => genKey())]
  } else if (newItems.length < keys.value.length) {
    keys.value = keys.value.slice(0, newItems.length)
  }
})

const fields = computed<FormListField[]>(() =>
  keys.value.slice(0, items.value.length).map((key, index) => ({ key, index })),
)

const add = (defaultValue?: unknown, insertIndex?: number) => {
  ctx.form.listAdd(props.name, defaultValue, insertIndex)
  const k = genKey()
  if (insertIndex !== undefined && insertIndex >= 0 && insertIndex <= keys.value.length) {
    const next = [...keys.value]
    next.splice(insertIndex, 0, k)
    keys.value = next
  } else {
    keys.value = [...keys.value, k]
  }
}

const remove = (index: number | number[]) => {
  ctx.form.listRemove(props.name, index)
  if (Array.isArray(index)) {
    const indices = new Set(index)
    keys.value = keys.value.filter((_, i) => !indices.has(i))
  } else {
    keys.value = keys.value.filter((_, i) => i !== index)
  }
}

const move = (from: number, to: number) => {
  ctx.form.listMove(props.name, from, to)
  const next = [...keys.value]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  keys.value = next
}

const replace = (values: unknown[]) => {
  ctx.form.listReplace(props.name, values)
  keys.value = values.map(() => genKey())
}

const operation: FormListOperation = { add, remove, move, replace }

const meta = computed(() => ({ errors: ctx.form.getFieldErrors(props.name) }))

import { onBeforeUnmount } from 'vue'
onBeforeUnmount(() => unsub())
</script>

<template>
  <slot :fields="fields" :operation="operation" :meta="meta" />
</template>
