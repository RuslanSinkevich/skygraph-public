<script setup lang="ts">
import { computed } from 'vue'
import SgForm from '../Form/Form.vue'
import SgField from '../Form/Field.vue'
import SgAutoField from './AutoField.vue'
import SgButton from '../../ui/Button.vue'
import { useForm, type UseFormReturn } from '../../../composables/useForm'
import {
  jsonSchemaToFields,
  jsonSchemaToRules,
  jsonSchemaToDefaults,
  type JSONSchema,
} from '../../../adapters/jsonSchemaAdapter'

export interface SchemaFormProps {
  /** JSON Schema object. */
  schema: JSONSchema
  /** External form instance; otherwise an internal `useForm` is created with schema defaults. */
  form?: UseFormReturn
  /** Layout passed through to the inner Form. */
  layout?: 'horizontal' | 'vertical' | 'inline'
  /** Field/control size for context consumers. */
  size?: 'small' | 'middle' | 'large'
  /** Disables generated controls and the inner Form. */
  disabled?: boolean
  /** Label column grid for horizontal layout. */
  labelCol?: { span?: number; offset?: number }
  /** Wrapper column grid for horizontal layout. */
  wrapperCol?: { span?: number; offset?: number }
  /** Label for the default submit button when slot is empty. */
  submitText?: string
}

const props = withDefaults(defineProps<SchemaFormProps>(), {
  layout: 'vertical',
  size: 'middle',
  disabled: false,
  submitText: 'Submit',
})

const emit = defineEmits<{
  (e: 'submit', values: Record<string, unknown>): void
}>()

defineSlots<{
  default(props: Record<string, never>): unknown
}>()

const fields = computed(() => jsonSchemaToFields(props.schema))
const rulesMap = computed(() => jsonSchemaToRules(props.schema))
const defaults = computed(() => jsonSchemaToDefaults(props.schema))

const internalForm = useForm({
  defaultValues: defaults.value,
  onSubmit: (values) => emit('submit', values),
})
const formInstance = computed(() => props.form ?? internalForm)
</script>

<template>
  <SgForm
    :form="formInstance"
    :layout="layout"
    :size="size"
    :disabled="disabled"
    :label-col="labelCol"
    :wrapper-col="wrapperCol"
  >
    <SgField
      v-for="fieldConfig in fields"
      :key="fieldConfig.name"
      :name="fieldConfig.name"
      :label="fieldConfig.label"
      :rules="rulesMap[fieldConfig.name]"
    >
      <SgAutoField
        :name="fieldConfig.name"
        :type="fieldConfig.type"
        :options="fieldConfig.options"
        :placeholder="fieldConfig.placeholder"
        :min="fieldConfig.min"
        :max="fieldConfig.max"
        :disabled="disabled"
      />
    </SgField>
    <slot>
      <SgButton type="primary" html-type="submit">{{ submitText }}</SgButton>
    </slot>
  </SgForm>
</template>
