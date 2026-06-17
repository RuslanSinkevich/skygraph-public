<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useConfig, useConfigWithDefaults } from './ConfigProvider.vue'
import SgButton from './Button.vue'
import SgSpin from './Spin.vue'

export interface UploadFile {
  uid: string
  name: string
  status: 'uploading' | 'done' | 'error' | 'removed'
  size?: number
  type?: string
  url?: string
  percent?: number
  error?: unknown
  raw?: File
}

export interface UploadProps {
  /** v-model binding (Vue idiom). */
  modelValue?: UploadFile[]
  /** Compat alias for `modelValue`. */
  fileList?: UploadFile[]
  /** Initial file list when uncontrolled. */
  defaultFileList?: UploadFile[]
  /** Accepts multiple files. */
  multiple?: boolean
  /** `accept` attr forwarded to input. */
  accept?: string
  /** Disables interaction. */
  disabled?: boolean
  /** Show drag area instead of click trigger. */
  drag?: boolean
  /** Layout: text list, picture row, picture-card grid. */
  listType?: 'text' | 'picture' | 'picture-card'
  /** Hide the built-in list. */
  showUploadList?: boolean
  /** Maximum number of files. */
  maxCount?: number
  /** Maximum file size in bytes. */
  maxSize?: number
  /** beforeUpload hook (return false/Promise<false> to skip). */
  beforeUpload?: (file: File, fileList: File[]) => boolean | Promise<boolean | File>
  /** Custom upload handler. */
  customRequest?: (options: {
    file: File
    onProgress: (percent: number) => void
    onSuccess: (response?: unknown) => void
    onError: (err: unknown) => void
  }) => void
  /** Strips built-in styling. */
  unstyled?: boolean
}

const props = withDefaults(defineProps<UploadProps>(), {
  multiple: false,
  disabled: undefined,
  drag: false,
  listType: 'text',
  showUploadList: true,
})

const emit = defineEmits<{
  (e: 'update:modelValue', files: UploadFile[]): void
  (e: 'change', files: UploadFile[]): void
  (e: 'remove', file: UploadFile): void
}>()

const { resolvedDisabled } = useConfigWithDefaults({ disabled: props.disabled }, {})

const internal = ref<UploadFile[]>(
  props.modelValue ?? props.fileList ?? props.defaultFileList ?? [],
)
watch(
  () => props.modelValue ?? props.fileList,
  (v) => {
    if (v !== undefined) internal.value = v
  },
)
const files = computed(() => props.modelValue ?? props.fileList ?? internal.value)

const inputRef = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

function genUid() {
  return `up_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function commit(next: UploadFile[]) {
  internal.value = next
  emit('update:modelValue', next)
  emit('change', next)
}

async function handleFiles(input: FileList | null) {
  if (!input) return
  const incoming: File[] = Array.from(input)
  const accepted: UploadFile[] = []
  for (const file of incoming) {
    if (props.maxSize !== undefined && file.size > props.maxSize) continue
    if (props.beforeUpload) {
      const r = await props.beforeUpload(file, incoming)
      if (r === false) continue
    }
    accepted.push({
      uid: genUid(),
      name: file.name,
      status: 'uploading',
      size: file.size,
      type: file.type,
      percent: 0,
      raw: file,
    })
  }
  let next = props.multiple ? [...files.value, ...accepted] : accepted.slice(0, 1)
  if (props.maxCount !== undefined) next = next.slice(0, props.maxCount)
  commit(next)

  for (const f of accepted) {
    if (props.customRequest && f.raw) {
      props.customRequest({
        file: f.raw,
        onProgress: (percent) => updateFile(f.uid, { percent }),
        onSuccess: () => updateFile(f.uid, { status: 'done', percent: 100 }),
        onError: (err) => updateFile(f.uid, { status: 'error', error: err }),
      })
    } else {
      updateFile(f.uid, { status: 'done', percent: 100 })
    }
  }
}

function updateFile(uid: string, patch: Partial<UploadFile>) {
  const next = files.value.map((f) => (f.uid === uid ? { ...f, ...patch } : f))
  commit(next)
}

function handleRemove(file: UploadFile) {
  const next = files.value.filter((f) => f.uid !== file.uid)
  commit(next)
  emit('remove', file)
}

function openPicker() {
  if (resolvedDisabled.value) return
  inputRef.value?.click()
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  if (resolvedDisabled.value) return
  void handleFiles(e.dataTransfer?.files ?? null)
}
function onDragOver(e: DragEvent) {
  e.preventDefault()
  if (resolvedDisabled.value) return
  isDragging.value = true
}
function onDragLeave() {
  isDragging.value = false
}

function onInputChange(e: Event) {
  const target = e.target as HTMLInputElement
  void handleFiles(target.files)
  target.value = ''
}

const cfg = useConfig()
const uploadAriaLabel = computed(() => cfg.value.locale?.upload?.uploadAriaLabel ?? 'Upload file')
const uploadText = computed(() => cfg.value.locale?.upload?.uploadText ?? 'Upload')
const removeFileLabel = computed(() => cfg.value.locale?.upload?.removeFile ?? 'Remove file')

const wrapperCls = computed(() =>
  props.unstyled
    ? ''
    : [
        'sg-upload',
        `sg-upload-${props.listType}`,
        props.drag ? 'sg-upload-drag' : 'sg-upload-select',
        resolvedDisabled.value ? 'sg-upload-disabled' : '',
        isDragging.value ? 'sg-upload-dragging' : '',
      ]
        .filter(Boolean)
        .join(' '),
)

function itemClasses(file: UploadFile) {
  return props.unstyled
    ? ''
    : ['sg-upload-item', `sg-upload-item-${file.status}`].filter(Boolean).join(' ')
}
</script>

<template>
  <div :class="wrapperCls">
    <input
      ref="inputRef"
      type="file"
      class="sg-upload-input"
      :multiple="multiple"
      :accept="accept"
      :disabled="resolvedDisabled"
      :aria-label="uploadAriaLabel"
      style="display: none"
      @change="onInputChange"
    />
    <div
      v-if="drag"
      class="sg-upload-drag-area"
      role="button"
      tabindex="0"
      @click="openPicker"
      @drop="onDrop"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
    >
      <slot name="drag">
        <p class="sg-upload-drag-icon">⬆</p>
        <p class="sg-upload-drag-text">Click or drag file to this area to upload</p>
      </slot>
    </div>
    <div v-else class="sg-upload-select-trigger" @click="openPicker">
      <slot>
        <SgButton :disabled="resolvedDisabled">{{ uploadText }}</SgButton>
      </slot>
    </div>
    <div v-if="showUploadList && files.length > 0" :class="unstyled ? '' : 'sg-upload-list'">
      <div v-for="file in files" :key="file.uid" :class="itemClasses(file)">
        <span :class="unstyled ? '' : 'sg-upload-item-name'">
          <SgSpin v-if="file.status === 'uploading'" size="small" :unstyled="unstyled" />
          {{ file.name }}
        </span>
        <span v-if="file.status === 'uploading'" :class="unstyled ? '' : 'sg-upload-item-progress'"
          >{{ file.percent ?? 0 }}%</span
        >
        <button
          v-if="file.status !== 'uploading'"
          type="button"
          :class="unstyled ? '' : 'sg-upload-item-remove'"
          :aria-label="`${removeFileLabel}: ${file.name}`"
          @click="handleRemove(file)"
        >
          ×
        </button>
      </div>
    </div>
  </div>
</template>
