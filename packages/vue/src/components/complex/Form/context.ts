import type { InjectionKey, VNode } from 'vue'
import type { Core, FormEngine } from '@skygraph/core'
import type { UseFormReturn } from '../../../composables/useForm'

export interface FormContextValue {
  core: Core
  form: FormEngine
  formApi: UseFormReturn
  layout: 'horizontal' | 'vertical' | 'inline'
  size: 'small' | 'middle' | 'large'
  disabled: boolean
  colon?: boolean
  requiredMark?: boolean | 'optional'
  labelCol?: { span?: number; offset?: number }
  wrapperCol?: { span?: number; offset?: number }
  labelAlign?: 'left' | 'right'
  preserve?: boolean
  feedbackIcons?: {
    success?: VNode | string
    warning?: VNode | string
    error?: VNode | string
    validating?: VNode | string
  }
}

export const formContextKey = Symbol('sg-form-context') as InjectionKey<FormContextValue>
