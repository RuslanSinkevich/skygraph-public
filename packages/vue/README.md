# @skygraph/vue

Vue 3 adapter for [SkyGraph](https://skygraph.ruslansinkevich.ru/) — components and composables built on the framework-agnostic [`@skygraph/core`](../core) engine. Shares the `.sg-*` CSS contract with the React adapter via [`@skygraph/styles`](../styles).

> **Easier path — the meta-package:**
>
> ```bash
> npm install skygraph-vue
> ```
>
> The meta-package re-exports everything below and auto-loads the CSS as a side effect. No separate `@skygraph/core` install, no manual `import '@skygraph/styles'`. Use this package directly only when you need fine-grained control over the install set.

## Install (direct)

```bash
npm install @skygraph/vue @skygraph/core vue
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

- the remaining React components (Select, Table, Diagram, Charts, …)
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
