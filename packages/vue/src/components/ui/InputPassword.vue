<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CSSProperties } from 'vue'
import type { SizeType } from '../../types'
import type { InputPasswordLocale } from '../../types'
import { useConfig, useConfigWithDefaults } from './ConfigProvider.vue'
import SgSpin from './Spin.vue'

export type PasswordStrength = 'weak' | 'medium' | 'strong' | 'very-strong'

export interface InputPasswordProps {
  modelValue?: string
  value?: string
  defaultValue?: string
  placeholder?: string
  visibilityToggle?: boolean
  showStrength?: boolean
  strengthLabels?: Partial<Record<PasswordStrength, string>>
  size?: SizeType
  disabled?: boolean
  loading?: boolean
  unstyled?: boolean
  style?: CSSProperties
  'aria-invalid'?: boolean | 'false' | 'true' | 'grammar' | 'spelling'
  'aria-required'?: boolean | 'false' | 'true'
}

const props = withDefaults(defineProps<InputPasswordProps>(), {
  visibilityToggle: true,
  showStrength: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'change', v: string): void
  (e: 'focus', ev: FocusEvent): void
  (e: 'blur', ev: FocusEvent): void
}>()

const { resolvedSize, resolvedDisabled } = useConfigWithDefaults(props, {})

const cfg = useConfig()

const lp = computed<InputPasswordLocale>(() => ({
  showPassword: 'Show password',
  hidePassword: 'Hide password',
  strengthWeak: 'Weak',
  strengthMedium: 'Medium',
  strengthStrong: 'Strong',
  strengthVeryStrong: 'Very strong',
  ...cfg.value.locale?.inputPassword,
}))

const visible = ref(false)
const internal = ref(props.defaultValue ?? '')

const current = computed(() => props.modelValue ?? props.value ?? internal.value)

function strengthOf(password: string): PasswordStrength {
  if (!password || password.length < 4) return 'weak'
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++
  if (score <= 1) return 'weak'
  if (score <= 2) return 'medium'
  if (score <= 3) return 'strong'
  return 'very-strong'
}

const strength = computed(() => strengthOf(current.value))

const labels = computed(() => ({
  weak: lp.value.strengthWeak!,
  medium: lp.value.strengthMedium!,
  strong: lp.value.strengthStrong!,
  'very-strong': lp.value.strengthVeryStrong!,
  ...props.strengthLabels,
}))

function handleChange(v: string) {
  internal.value = v
  emit('update:modelValue', v)
  emit('change', v)
}

const disabledEff = computed(() => resolvedDisabled.value || !!props.loading)

const wrapperClasses = computed(() =>
  props.unstyled
    ? ''
    : [
        'sg-input-password-wrapper',
        `sg-input-password-wrapper-${resolvedSize.value}`,
        props.loading ? 'sg-input-wrapper-loading' : '',
      ]
        .filter(Boolean)
        .join(' '),
)

const inputClasses = computed(() =>
  props.unstyled
    ? ''
    : ['sg-input', 'sg-input-password', `sg-input-${resolvedSize.value}`].join(' '),
)

const toggleAria = computed(() => (visible.value ? lp.value.hidePassword : lp.value.showPassword))
</script>

<template>
  <div v-if="!unstyled" :style="style">
    <span :class="wrapperClasses">
      <input
        :type="visible ? 'text' : 'password'"
        :class="inputClasses"
        :value="current"
        :placeholder="placeholder"
        :disabled="disabledEff"
        :aria-invalid="props['aria-invalid']"
        :aria-required="props['aria-required']"
        @input="handleChange(($event.target as HTMLInputElement).value)"
        @focus="emit('focus', $event)"
        @blur="emit('blur', $event)"
      />
      <SgSpin v-if="loading" size="small" />
      <button
        v-if="visibilityToggle && !loading"
        type="button"
        class="sg-input-password-toggle"
        tabindex="-1"
        :aria-label="toggleAria"
        @click="visible = !visible"
      >
        {{ visible ? '◉' : '○' }}
      </button>
    </span>
    <div v-if="showStrength && current.length > 0" class="sg-input-password-strength">
      <div class="sg-input-password-strength-bar">
        <span :class="`sg-input-password-strength-fill sg-input-password-strength-${strength}`" />
      </div>
      <span :class="`sg-input-password-strength-label sg-input-password-strength-${strength}`">
        {{ labels[strength] }}
      </span>
    </div>
  </div>
  <span v-else :style="style">
    <input
      :type="visible ? 'text' : 'password'"
      :value="current"
      :placeholder="placeholder"
      :disabled="disabledEff"
      @input="handleChange(($event.target as HTMLInputElement).value)"
      @focus="emit('focus', $event)"
      @blur="emit('blur', $event)"
    />
    <button v-if="visibilityToggle" type="button" @click="visible = !visible">
      {{ visible ? lp.hidePassword : lp.showPassword }}
    </button>
  </span>
</template>
