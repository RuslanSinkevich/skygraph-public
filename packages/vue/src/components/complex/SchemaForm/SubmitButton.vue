<script setup lang="ts">
import SgButton from '../../ui/Button.vue'

export interface SubmitButtonProps {
  /** Disables the button. */
  disabled?: boolean
  /** Shows a loading state on the button. */
  loading?: boolean
  /** Strips built-in button styles on the underlying button. */
  unstyled?: boolean
}

withDefaults(defineProps<SubmitButtonProps>(), {
  disabled: false,
  loading: false,
  unstyled: false,
})

defineSlots<{
  default(props: Record<string, never>): unknown
}>()
</script>

<template>
  <SgButton
    type="primary"
    htmlType="submit"
    :disabled="disabled"
    :loading="loading"
    :unstyled="unstyled"
  >
    <slot>Submit</slot>
  </SgButton>
</template>
