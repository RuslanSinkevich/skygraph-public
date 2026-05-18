<script setup lang="ts">
import { computed, inject, onMounted, onBeforeUnmount, provide, ref } from 'vue'
import { useForm, type UseFormReturn, type UseFormOptions } from '../../../composables/useForm'
import { formContextKey } from './context'
import { formProviderContextKey } from './providerContext'
import type { ValidationMode } from '@skygraph/core'

export interface FormProps {
  /** Pre-existing form instance from `useForm()`. When provided, the
   *  internal one is not created. */
  form?: UseFormReturn
  /** `name` attribute on the native `<form>` element. */
  name?: string
  /** Initial field values; passed straight to the underlying engine. */
  defaultValues?: Record<string, unknown>
  /** Antd-style alias for `defaultValues`. */
  initialValues?: Record<string, unknown>
  /** Layout of label / control. */
  layout?: 'horizontal' | 'vertical' | 'inline'
  /** Field/control size for context consumers. */
  size?: 'small' | 'middle' | 'large'
  /** Disables fields that read this value from form context. */
  disabled?: boolean
  /** When `true`, appends a colon after labels that support it. */
  colon?: boolean
  /** How required fields are marked. */
  requiredMark?: boolean | 'optional'
  /** Label column grid for horizontal layout. */
  labelCol?: { span?: number; offset?: number }
  /** Wrapper column grid for horizontal layout. */
  wrapperCol?: { span?: number; offset?: number }
  /** Text alignment for the label column. */
  labelAlign?: 'left' | 'right'
  /** Validation mode forwarded to the engine. */
  validateOn?: ValidationMode
  /** After submit, scroll the first invalid field into view. */
  scrollToFirstError?: boolean
  /** Keeps unmounted field values in the form store. */
  preserve?: boolean
}

const props = withDefaults(defineProps<FormProps>(), {
  layout: 'vertical',
  size: 'middle',
  disabled: false,
})

const emit = defineEmits<{
  (e: 'submit', payload: { values: Record<string, unknown>; valid: boolean }): void
  (e: 'finish', values: Record<string, unknown>): void
  (e: 'finishFailed', errors: Record<string, string[]>): void
  (e: 'valuesChange', values: Record<string, unknown>): void
}>()

defineSlots<{
  default(props: { form: UseFormReturn }): unknown
}>()

const formOptions = computed<UseFormOptions>(() => ({
  defaultValues: props.defaultValues ?? props.initialValues,
  validateOn: props.validateOn,
  onValuesChange: (_changed, all) => {
    emit('valuesChange', all)
  },
}))

const internalForm = props.form ?? useForm(formOptions.value)
const formApi = internalForm

const formRef = ref<HTMLFormElement | null>(null)

const classes = computed(() =>
  [
    'sg-form',
    `sg-form-${props.layout}`,
    `sg-form-${props.size}`,
    props.disabled ? 'sg-form-disabled' : '',
  ]
    .filter(Boolean)
    .join(' '),
)

provide(formContextKey, {
  core: formApi.core,
  form: formApi.form,
  formApi,
  layout: props.layout,
  size: props.size,
  disabled: props.disabled,
  colon: props.colon,
  requiredMark: props.requiredMark,
  labelCol: props.labelCol,
  wrapperCol: props.wrapperCol,
  labelAlign: props.labelAlign,
  preserve: props.preserve,
})

const provider = inject(formProviderContextKey, null)
onMounted(() => {
  if (provider && props.name) {
    provider.registerForm(props.name, formApi.form)
  }
})
onBeforeUnmount(() => {
  if (provider && props.name) {
    provider.unregisterForm(props.name)
  }
})

async function handleSubmit(e: Event) {
  e.preventDefault()
  await formApi.submit()
  const result = await formApi.validateFields()
  const values = formApi.getFieldsValue()

  emit('submit', { values, valid: result.valid })

  if (result.valid) {
    emit('finish', values)
    if (provider && props.name) {
      provider.onFormFinish?.(props.name, { values, forms: provider.forms })
    }
  } else {
    emit('finishFailed', result.errors)
    if (props.scrollToFirstError && formRef.value) {
      const firstErrorField = Object.keys(result.errors)[0]
      if (firstErrorField) {
        const el =
          formRef.value.querySelector(`[data-field-name="${firstErrorField}"]`) ??
          formRef.value.querySelector(`[name="${firstErrorField}"]`)
        if (el && 'scrollIntoView' in el) {
          (el as Element).scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
    }
  }
}

defineExpose({
  formApi,
  submit: () => formApi.submit(),
  reset: (values?: Record<string, unknown>) => formApi.reset(values),
  validate: () => formApi.validateFields(),
  getFieldsValue: () => formApi.getFieldsValue(),
  setFieldsValue: (values: Record<string, unknown>) => formApi.setFieldsValue(values),
})
</script>

<template>
  <form
    ref="formRef"
    :name="name"
    :class="classes"
    novalidate
    @submit="handleSubmit"
  >
    <slot :form="formApi" />
  </form>
</template>
