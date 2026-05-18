<script setup lang="ts">
export interface BreadcrumbItem {
  /** Segment label. */
  title: string
  /** When set, the segment renders as a link with this URL. */
  href?: string
}

export interface BreadcrumbProps {
  /** Ordered trail from root to current location. */
  items: BreadcrumbItem[]
  /** Node rendered between segments. @default '/' */
  separator?: string
  /** Strips built-in styles when true. */
  unstyled?: boolean
}

withDefaults(defineProps<BreadcrumbProps>(), {
  separator: '/',
})

const emit = defineEmits<{
  (e: 'itemClick', item: BreadcrumbItem, index: number): void
}>()

defineSlots<{
  item(props: { item: BreadcrumbItem; index: number }): unknown
}>()

function onClick(item: BreadcrumbItem, idx: number, e: Event) {
  if (item.href) {
    // Allow navigation by default; consumers may emit too.
  } else {
    e.preventDefault()
  }
  emit('itemClick', item, idx)
}
</script>

<template>
  <nav v-if="unstyled" aria-label="Breadcrumb">
    <span v-for="(item, i) in items" :key="i">
      <a v-if="item.href" :href="item.href" @click="onClick(item, i, $event)">
        <slot name="item" :item="item" :index="i">{{ item.title }}</slot>
      </a>
      <span v-else>
        <slot name="item" :item="item" :index="i">{{ item.title }}</slot>
      </span>
      <span v-if="i < items.length - 1">{{ separator }}</span>
    </span>
  </nav>
  <nav v-else class="sg-breadcrumb" aria-label="Breadcrumb">
    <template v-for="(item, i) in items" :key="i">
      <a
        v-if="item.href"
        class="sg-breadcrumb-link"
        :href="item.href"
        @click="onClick(item, i, $event)"
      >
        <slot name="item" :item="item" :index="i">{{ item.title }}</slot>
      </a>
      <span v-else :class="i === items.length - 1 ? 'sg-breadcrumb-current' : 'sg-breadcrumb-link'">
        <slot name="item" :item="item" :index="i">{{ item.title }}</slot>
      </span>
      <span v-if="i < items.length - 1" class="sg-breadcrumb-separator">{{ separator }}</span>
    </template>
  </nav>
</template>
