<script setup lang="ts">
import { computed, inject } from 'vue'
import { formContextKey } from '../Form/context'

export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'email'
  | 'url'
  | 'date'
  | 'time'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'password'
  | 'color'
  | 'slider'
  | 'rate'
  | 'file'
  | 'switch'
  | 'radio'

export interface AutoFieldOption {
  label: string
  value: string | number
}

export interface AutoFieldProps {
  name: string
  label?: string
  type?: FieldType
  options?: AutoFieldOption[]
  placeholder?: string
  min?: number
  max?: number
  step?: number
  accept?: string
  multiple?: boolean
  disabled?: boolean
}

const props = defineProps<AutoFieldProps>()

const injected = inject(formContextKey, null)
if (!injected) {
  throw new Error('[skygraph/vue] <SgAutoField> must be used inside an <SgForm>')
}
const ctx = injected

const value = computed(() => ctx.form.getValue(props.name))
const meta = computed(() => ctx.form.getFieldState(props.name))

const inferredType = computed<FieldType>(() => {
  if (props.type) return props.type
  if (props.options && props.options.length > 0) return 'select'
  const v = value.value
  if (typeof v === 'boolean') return 'boolean'
  if (typeof v === 'number') return 'number'
  if (typeof v === 'string') {
    if (v.includes('@')) return 'email'
    if (v.startsWith('http')) return 'url'
  }
  return 'string'
})

const handleChange = (newValue: unknown) => {
  ctx.form.setValue(props.name, newValue)
}

const isDisabled = computed(() => props.disabled ?? ctx.disabled)

const hasErrors = computed(() => meta.value.errors.length > 0)
const hasWarnings = computed(() => meta.value.warnings.length > 0)
const errorId = computed(() => `${props.name}-error`)

const fieldStateClass = computed(() => ({
  'sg-autofield-input-error': hasErrors.value,
  'sg-autofield-input-warning': !hasErrors.value && hasWarnings.value,
}))
</script>

<style>
/*
 * AutoField inputs use plain HTML elements (no `SgInput` wrapping) so they
 * stay framework-agnostic and round-trip native form behaviour. Painting
 * them through `<style>` blocks keeps the CSS scoped to the SchemaForm
 * package while still mirroring the React reference (`AutoField.tsx`
 * inline `inputStyle`).
 */
.sg-autofield-input {
  width: 100%;
  padding: 6px 12px;
  border: 1px solid var(--sg-color-border, #d9d9d9);
  border-radius: var(--sg-border-radius, 6px);
  background: var(--sg-color-bg-container, #fff);
  color: var(--sg-color-text);
  font-size: 14px;
  font-family: inherit;
  line-height: 1.4;
  box-sizing: border-box;
  outline: none;
  transition: border-color var(--sg-transition-duration) var(--sg-transition-timing);
}

.sg-autofield-input:disabled {
  background: var(--sg-color-bg-disabled, #f5f5f5);
  color: var(--sg-color-text-disabled);
  cursor: not-allowed;
}

.sg-autofield-input:focus,
.sg-autofield-input:focus-visible {
  border-color: var(--sg-color-primary);
  box-shadow: 0 0 0 2px var(--sg-color-primary-bg);
}

.sg-autofield-input-error {
  border-color: var(--sg-color-error, #ff4d4f);
}

.sg-autofield-input-warning {
  border-color: var(--sg-color-warning, #faad14);
}

.sg-autofield-input-textarea {
  min-height: 80px;
  resize: vertical;
}

.sg-autofield-input-color {
  width: 48px;
  height: 32px;
  padding: 2px;
}
</style>

<template>
  <div class="sg-autofield">
    <label
      v-if="inferredType !== 'boolean' && inferredType !== 'switch' && label"
      style="font-weight: 500; font-size: 14px"
    >
      {{ label }}
    </label>
    <template v-if="inferredType === 'boolean' || inferredType === 'switch'">
      <label style="display: flex; align-items: center; gap: 8px; cursor: pointer">
        <input
          type="checkbox"
          :checked="!!value"
          :disabled="isDisabled"
          :role="inferredType === 'switch' ? 'switch' : undefined"
          @change="(e) => handleChange((e.target as HTMLInputElement).checked)"
        />
        {{ label }}
      </label>
    </template>
    <input
      v-else-if="inferredType === 'number'"
      type="number"
      class="sg-autofield-input"
      :class="fieldStateClass"
      :value="value == null ? '' : String(value)"
      :placeholder="placeholder"
      :disabled="isDisabled"
      :min="min"
      :max="max"
      :step="step"
      :aria-invalid="hasErrors || undefined"
      :aria-describedby="hasErrors ? errorId : undefined"
      @input="
        (e) => {
          const raw = (e.target as HTMLInputElement).value
          handleChange(raw === '' ? null : Number(raw))
        }
      "
      @blur="ctx.form.onFieldBlur(name)"
    />
    <textarea
      v-else-if="inferredType === 'textarea'"
      class="sg-autofield-input sg-autofield-input-textarea"
      :class="fieldStateClass"
      :value="value == null ? '' : String(value)"
      :placeholder="placeholder"
      :disabled="isDisabled"
      :aria-invalid="hasErrors || undefined"
      :aria-describedby="hasErrors ? errorId : undefined"
      @input="(e) => handleChange((e.target as HTMLTextAreaElement).value)"
      @blur="ctx.form.onFieldBlur(name)"
    />
    <select
      v-else-if="inferredType === 'select'"
      class="sg-autofield-input"
      :class="fieldStateClass"
      :value="value == null ? '' : String(value)"
      :disabled="isDisabled"
      :aria-invalid="hasErrors || undefined"
      :aria-describedby="hasErrors ? errorId : undefined"
      @change="(e) => handleChange((e.target as HTMLSelectElement).value)"
    >
      <option value="">{{ placeholder ?? '-- Select --' }}</option>
      <option v-for="opt in options" :key="opt.value" :value="opt.value">
        {{ opt.label }}
      </option>
    </select>
    <select
      v-else-if="inferredType === 'multiselect'"
      multiple
      class="sg-autofield-input"
      :class="fieldStateClass"
      :value="Array.isArray(value) ? (value as (string | number)[]).map(String) : []"
      :disabled="isDisabled"
      :aria-invalid="hasErrors || undefined"
      @change="
        (e) => {
          const sel = Array.from((e.target as HTMLSelectElement).selectedOptions, (o) => o.value)
          handleChange(sel)
        }
      "
    >
      <option v-for="opt in options" :key="opt.value" :value="opt.value">
        {{ opt.label }}
      </option>
    </select>
    <div
      v-else-if="inferredType === 'radio'"
      role="radiogroup"
      style="display: flex; gap: 12px; flex-wrap: wrap"
    >
      <label
        v-for="opt in options"
        :key="opt.value"
        style="display: flex; align-items: center; gap: 4px; cursor: pointer"
      >
        <input
          type="radio"
          :name="name"
          :value="opt.value"
          :checked="value === opt.value"
          :disabled="isDisabled"
          @change="handleChange(opt.value)"
        />
        {{ opt.label }}
      </label>
    </div>
    <input
      v-else-if="inferredType === 'date'"
      type="date"
      class="sg-autofield-input"
      :class="fieldStateClass"
      :value="value == null ? '' : String(value)"
      :disabled="isDisabled"
      :aria-invalid="hasErrors || undefined"
      @input="(e) => handleChange((e.target as HTMLInputElement).value)"
    />
    <input
      v-else-if="inferredType === 'time'"
      type="time"
      class="sg-autofield-input"
      :class="fieldStateClass"
      :value="value == null ? '' : String(value)"
      :disabled="isDisabled"
      :aria-invalid="hasErrors || undefined"
      @input="(e) => handleChange((e.target as HTMLInputElement).value)"
    />
    <input
      v-else-if="inferredType === 'password'"
      type="password"
      class="sg-autofield-input"
      :class="fieldStateClass"
      :value="value == null ? '' : String(value)"
      :placeholder="placeholder"
      :disabled="isDisabled"
      :aria-invalid="hasErrors || undefined"
      @input="(e) => handleChange((e.target as HTMLInputElement).value)"
      @blur="ctx.form.onFieldBlur(name)"
    />
    <input
      v-else-if="inferredType === 'color'"
      type="color"
      class="sg-autofield-input sg-autofield-input-color"
      :value="value == null ? '#000000' : String(value)"
      :disabled="isDisabled"
      @input="(e) => handleChange((e.target as HTMLInputElement).value)"
    />
    <div v-else-if="inferredType === 'slider'" style="display: flex; align-items: center; gap: 8px">
      <input
        type="range"
        :value="value == null ? (min ?? 0) : Number(value)"
        :min="min ?? 0"
        :max="max ?? 100"
        :step="step ?? 1"
        :disabled="isDisabled"
        style="flex: 1"
        @input="(e) => handleChange(Number((e.target as HTMLInputElement).value))"
      />
      <span style="min-width: 32px; text-align: right; font-size: 14px">{{
        String(value ?? min ?? 0)
      }}</span>
    </div>
    <div v-else-if="inferredType === 'rate'" style="display: flex; gap: 2px">
      <button
        v-for="i in max ?? 5"
        :key="i"
        type="button"
        :disabled="isDisabled"
        :aria-label="`${i} star${i !== 1 ? 's' : ''}`"
        :style="{
          background: 'none',
          border: 'none',
          cursor: isDisabled ? 'default' : 'pointer',
          fontSize: '20px',
          color:
            i <= (typeof value === 'number' ? value : 0)
              ? 'var(--sg-warning, #faad14)'
              : 'var(--sg-border, #d9d9d9)',
          padding: 0,
        }"
        @click="!isDisabled && handleChange(i)"
      >
        ★
      </button>
    </div>
    <input
      v-else-if="inferredType === 'file'"
      type="file"
      class="sg-autofield-input"
      :class="fieldStateClass"
      :accept="accept"
      :multiple="multiple"
      :disabled="isDisabled"
      @change="
        (e) => {
          const files = (e.target as HTMLInputElement).files
          if (files) handleChange(multiple ? Array.from(files) : (files[0] ?? null))
        }
      "
    />
    <input
      v-else
      :type="inferredType === 'email' ? 'email' : inferredType === 'url' ? 'url' : 'text'"
      class="sg-autofield-input"
      :class="fieldStateClass"
      :value="value == null ? '' : String(value)"
      :placeholder="placeholder"
      :disabled="isDisabled"
      :aria-invalid="hasErrors || undefined"
      :aria-describedby="hasErrors ? errorId : undefined"
      @input="(e) => handleChange((e.target as HTMLInputElement).value)"
      @blur="ctx.form.onFieldBlur(name)"
    />
    <span
      v-if="hasErrors"
      :id="errorId"
      role="alert"
      style="color: var(--sg-error, #ff4d4f); font-size: 12px"
    >
      {{ meta.errors.join('; ') }}
    </span>
    <span v-else-if="hasWarnings" style="color: var(--sg-warning, #faad14); font-size: 12px">
      {{ meta.warnings.join('; ') }}
    </span>
  </div>
</template>
