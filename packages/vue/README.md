# @skygraph/vue

Vue 3 adapter for [`@skygraph/core`](../core). MVP: 5 composables and 4 base
components built on top of the framework-agnostic engines, sharing the same
`.sg-*` CSS contract as `@skygraph/react` via `@skygraph/styles`.

## Status

- 5 composables: `useForm`, `useField`, `useTable`, `useTree`, `useGraph`
- 4 components: `SgButton`, `SgInput`, `SgForm`, `SgField`
- Vue 3 only, Composition API only, `<script setup>` SFCs
- ~48 vitest tests via `@vue/test-utils` + `jsdom`
- Built with `vite` library mode + `vite-plugin-dts`

## Install

```bash
pnpm add @skygraph/vue @skygraph/core @skygraph/styles vue
```

## Usage

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { SgButton, SgInput, SgForm, SgField } from '@skygraph/vue'
import '@skygraph/styles'

const text = ref('')

function onSubmit(payload: {
  values: Record<string, unknown>
  valid: boolean
}) {
  console.log(payload)
}
</script>

<template>
  <SgInput v-model="text" placeholder="Type here…" />

  <SgForm
    :default-values="{ email: '' }"
    @submit="onSubmit"
  >
    <SgField
      name="email"
      label="Email"
      :rules="[{ required: true }, { type: 'email' }]"
      v-slot="{ value, onChange, errors }"
    >
      <SgInput
        :model-value="String(value ?? '')"
        :status="errors.length ? 'error' : undefined"
        @update:model-value="onChange"
      />
    </SgField>
    <SgButton type="primary" html-type="submit">Submit</SgButton>
  </SgForm>
</template>
```

## Mapping to `@skygraph/react`

| React                     | Vue                       |
| ------------------------- | ------------------------- |
| `useForm()`               | `useForm()`               |
| `useField(core, form, n)` | `useField(core, form, n)` |
| `useTable()`              | `useTable()`              |
| `useTree()`               | `useTree()`               |
| `useGraph()`              | `useGraph()`              |
| `<Button />`              | `<SgButton />`            |
| `<Input />`               | `<SgInput v-model />`     |
| `<Form />`                | `<SgForm />`              |
| `<Field />`               | `<SgField v-slot />`      |

The `Sg` prefix avoids clashing with the React names *and* with native HTML
elements / globally-registered Vue components (e.g. `Form`, `Input`).

CSS class names (`.sg-button`, `.sg-input`, `.sg-form`, `.sg-field`, …) are
**identical** between the React and Vue adapters — both consume the same
[`@skygraph/styles`](../styles) package, which is the single source of
truth for visual styling.

## Scope of MVP

This package is a foundation, not a full port. It deliberately does not
yet ship Vue equivalents for:

- the other ~74 React components (Select, Table, Diagram, Charts, …)
- chart / dashboard / calendar / tree-view widgets
- per-component i18n
- per-component documentation pages

Those land in subsequent Vue streams.

## Development

```bash
pnpm install
pnpm --filter @skygraph/vue typecheck
pnpm --filter @skygraph/vue test
pnpm --filter @skygraph/vue build
```

To explore a live demo:

```bash
pnpm --filter demo-vue dev
```
