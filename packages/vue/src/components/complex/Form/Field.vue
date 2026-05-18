<script setup lang="ts">
import { computed, inject, onBeforeUnmount, useSlots, watch } from 'vue'
import { useField } from '../../../composables/useField'
import { formContextKey } from './context'
import type { Rule, ValidationMode } from '@skygraph/core'

export interface FieldProps {
  /** Path of this field in the form store (required). */
  name: string
  /** Visible label text. */
  label?: string
  /** Validation rules. */
  rules?: Rule[]
  /** Warning rules — produce warnings without failing validation. */
  warningRules?: Rule[]
  /** When `true`, prepends a required rule in addition to `rules`. */
  required?: boolean
  /** Re-validates this field when any listed field changes. */
  dependencies?: string[]
  /** Events that trigger validation. */
  trigger?: ValidationMode | ValidationMode[]
  /** Helper text shown below the control when there are no errors / warnings. */
  help?: string
  /** Supplementary content below the control area. */
  extra?: string
  /** When `true`, value is preserved on unregister. */
  preserve?: boolean
  /** When `true`, the field renders nothing. */
  hidden?: boolean
  /** Disables the control; falls back to form context `disabled`. */
  disabled?: boolean
  /** Manual validation status badge. */
  validateStatus?: 'success' | 'warning' | 'error' | 'validating'
  /** Renders only the control without layout chrome. */
  noStyle?: boolean
  /** Maps raw change values before committing to the store. */
  normalize?: (value: unknown, prevValue: unknown) => unknown
  /** Stops after the first failing rule when validating. */
  validateFirst?: boolean
  /** Tooltip title wrapping the label text. */
  tooltip?: string
  /** Overrides form `labelCol` for this field in horizontal layout. */
  labelCol?: { span?: number; offset?: number }
  /** Overrides form `wrapperCol` for this field in horizontal layout. */
  wrapperCol?: { span?: number; offset?: number }
}

const props = withDefaults(defineProps<FieldProps>(), {
  rules: () => [],
  required: false,
  hidden: false,
  noStyle: false,
})

defineSlots<{
  default(props: {
    value: unknown
    onChange: (v: unknown) => void
    onBlur: () => void
    errors: string[]
    error: string | null
    warnings: string[]
    touched: boolean
    dirty: boolean
    validating: boolean
    status: string | undefined
  }): unknown
  label(props: Record<string, never>): unknown
}>()

const injected = inject(formContextKey, null)
if (!injected) {
  throw new Error('[skygraph/vue] <SgField> must be used inside an <SgForm>')
}
const ctx = injected

const field = useField(ctx.core, ctx.form, props.name)

const disabled = computed(() => props.disabled ?? ctx.disabled)

let prevValue: unknown = field.value.value
const wrappedOnChange = (v: unknown) => {
  if (props.normalize) {
    const normalized = props.normalize(v, prevValue)
    prevValue = normalized
    field.onChange(normalized)
  } else {
    prevValue = v
    field.onChange(v)
  }
}

function registerField() {
  const allRules: Rule[] = [...(props.rules ?? [])]
  if (props.required) {
    allRules.unshift({ required: true })
  }
  ctx.form.register(props.name, {
    rules: allRules,
    warningRules: props.warningRules,
    dependencies: props.dependencies,
    validateOn: Array.isArray(props.trigger) ? props.trigger[0] : props.trigger,
    validateFirst: props.validateFirst,
    label: props.label,
    preserve: props.preserve ?? ctx.preserve,
  })
}

registerField()

watch(
  () => [props.rules, props.required, props.warningRules, props.dependencies],
  () => {
    registerField()
  },
  { deep: true },
)

onBeforeUnmount(() => {
  ctx.form.unregister(props.name)
})

const hasErrors = computed(() => field.errors.value.length > 0)
const hasWarnings = computed(() => field.warnings.value.length > 0)
const effectiveStatus = computed(() => props.validateStatus ?? field.status.value)

const fieldClasses = computed(() =>
  [
    'sg-field',
    ctx.layout === 'horizontal' ? 'sg-field-horizontal' : '',
    hasErrors.value ? 'sg-field-has-error' : '',
    hasWarnings.value && !hasErrors.value ? 'sg-field-has-warning' : '',
    effectiveStatus.value ? `sg-field-status-${effectiveStatus.value}` : '',
  ]
    .filter(Boolean)
    .join(' '),
)

const slots = useSlots()
const hasLabelSlot = computed(() => Boolean(slots.label))
</script>

<template>
  <template v-if="!hidden">
    <template v-if="noStyle">
      <slot
        :value="field.value.value"
        :on-change="wrappedOnChange"
        :on-blur="field.onBlur"
        :errors="field.errors.value"
        :error="field.error.value"
        :warnings="field.warnings.value"
        :touched="field.touched.value"
        :dirty="field.dirty.value"
        :validating="field.validating.value"
        :status="effectiveStatus"
      />
    </template>
    <div v-else :class="fieldClasses" :data-field-name="name">
      <label v-if="label || hasLabelSlot" class="sg-field-label">
        <slot name="label">{{ label }}</slot>
        <span v-if="required" class="sg-field-required">*</span>
        <template v-if="ctx.colon">:</template>
      </label>
      <div class="sg-field-control">
        <slot
          :value="field.value.value"
          :on-change="wrappedOnChange"
          :on-blur="field.onBlur"
          :errors="field.errors.value"
          :error="field.error.value"
          :warnings="field.warnings.value"
          :touched="field.touched.value"
          :dirty="field.dirty.value"
          :validating="field.validating.value"
          :status="effectiveStatus"
        >
          <input
            class="sg-input"
            type="text"
            :value="(field.value.value as string) ?? ''"
            :disabled="disabled"
            @input="(e) => wrappedOnChange((e.target as HTMLInputElement).value)"
            @blur="field.onBlur"
          />
        </slot>
      </div>
      <div v-if="hasErrors" class="sg-field-error" role="alert">
        <div v-for="(err, i) in field.errors.value" :key="i">{{ err }}</div>
      </div>
      <div v-else-if="hasWarnings" class="sg-field-warning">
        <div v-for="(w, i) in field.warnings.value" :key="i">{{ w }}</div>
      </div>
      <div v-else-if="help" class="sg-field-help">{{ help }}</div>
      <div v-if="extra" class="sg-field-extra">{{ extra }}</div>
    </div>
  </template>
</template>
