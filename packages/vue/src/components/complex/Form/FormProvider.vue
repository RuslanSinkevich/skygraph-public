<script setup lang="ts">
import { provide } from 'vue'
import { formProviderContextKey } from './providerContext'
import type { FormEngine } from '@skygraph/core'

export interface FormProviderProps {
  /** Tree of forms and other UI that may register with this provider. */
}

defineProps<FormProviderProps>()

const emit = defineEmits<{
  (
    e: 'formFinish',
    name: string,
    info: { values: Record<string, unknown>; forms: Record<string, FormEngine> },
  ): void
  (
    e: 'formChange',
    name: string,
    info: { changedFields: string[]; forms: Record<string, FormEngine> },
  ): void
}>()

defineSlots<{
  default(props: Record<string, never>): unknown
}>()

const forms: Record<string, FormEngine> = {}

provide(formProviderContextKey, {
  registerForm: (name, form) => {
    forms[name] = form
  },
  unregisterForm: (name) => {
    delete forms[name]
  },
  onFormFinish: (name, info) => emit('formFinish', name, info),
  onFormChange: (name, info) => emit('formChange', name, info),
  forms,
})

defineExpose({ forms })
</script>

<template>
  <slot />
</template>
