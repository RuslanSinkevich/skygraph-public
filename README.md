# SkyGraph

**UI components for React and Vue on a shared engine. One install, one CSS, the same look.**

78+ ready-made components — forms, tables, trees, charts, calendars,
diagrams, dashboards. Same DOM, same `.sg-*` classes, same behaviour on
both adapters. Free, MIT.

[![CI](https://github.com/RuslanSinkevich/skygraph-public/actions/workflows/ci.yml/badge.svg)](https://github.com/RuslanSinkevich/skygraph-public/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Quick Start (React)

```bash
npm install skygraph-react
```

```tsx
import { Form, Field, SubmitButton } from 'skygraph-react'

function App() {
  return (
    <Form
      defaultValues={{ username: '', email: '' }}
      onSubmit={async (values) => {
        await saveUser(values)
      }}
    >
      <Field name="username" label="Username" rules={[{ required: true }]} />
      <Field name="email" label="Email" rules={[{ type: 'email' }]} />
      <SubmitButton>Submit</SubmitButton>
    </Form>
  )
}
```

Styles are pulled in automatically — no extra `import '@skygraph/styles'`,
no separate `@skygraph/core` install.

## Quick Start (Vue 3)

```bash
npm install skygraph-vue
```

```vue
<script setup lang="ts">
import { SgForm, SgField, SgSubmitButton } from 'skygraph-vue'

async function onSubmit(values: Record<string, unknown>) {
  await saveUser(values)
}
</script>

<template>
  <SgForm :default-values="{ username: '', email: '' }" @submit="onSubmit">
    <SgField name="username" label="Username" :rules="[{ required: true }]" />
    <SgField name="email"    label="Email"    :rules="[{ type: 'email' }]" />
    <SgSubmitButton>Submit</SgSubmitButton>
  </SgForm>
</template>
```

The same DOM, the same CSS classes — switching framework doesn't change
the look. See [`docs/multi-framework.md`](./docs/multi-framework.md).

## Features

- **78+ React components / 66+ Vue components** — Button, Input, Select,
  DatePicker, Table, DataGrid, Tree, Transfer, TreeSelect, Cascader,
  Diagram, Charts (Line / Bar / Area / Pie), Dashboard, Gantt,
  EventTimeline, ResourceCalendar, SchemaFormEditor and the rest of an
  AntD-shaped surface.
- **Same engine for React and Vue** — one runtime (`@skygraph/core`)
  holds the state, both adapters subscribe to it. Update the engine
  once, both stay in sync.
- **Same look out of the box** — React and Vue render the same DOM and
  the same `.sg-*` classes. Switching framework doesn't change the UI.
- **Light, predictable CSS** — ~25 KB gzipped, no CSS-in-JS, no runtime
  injection. Dark and light themes via a single attribute on `<html>`.
- **TypeScript first** — strict types end-to-end. Form schemas from JSON
  Schema or Zod. No `any` in the public API.
- **Accessible by default** — keyboard navigation, ARIA roles and focus
  management are built in.
- **Print / PDF** — tables, diagrams and charts have a `printable` prop
  and a `ref.print()` method that opens a clean native print dialog.

## Theming

CSS Variables only — zero JS runtime overhead.

```css
:root {
  --sg-color-primary: #7c3aed;
  --sg-border-radius: 8px;
}
```

Switch to dark mode:

```html
<div data-sg-theme="dark">
  <!-- all children use dark theme -->
</div>
```

Four levels of customization:

1. **Global theme** — override `--sg-color-*` tokens
2. **Component type** — override `--sg-btn-*` variables
3. **Instance** — `unstyled` prop + render props for custom UI
4. **Headless** — skip CSS, use only hooks (`useField`, `useForm`, etc.)

Reference:

- [`docs/styling-contract.md`](./docs/styling-contract.md) — stable tokens, root classes, slots, `classNames` / `styles` API, versioning policy.
- [`docs/styling-recipes.md`](./docs/styling-recipes.md) — practical recipes: custom brand, dark mode, per-component overrides, conditional row/cell styling, full `unstyled` mode.

## Component List (React adapter — 78+ components)

**Data Entry (18):** Button, Input, InputNumber, Textarea, Select, Checkbox, Radio, Switch, Slider, DatePicker, TimePicker, AutoComplete, Rate, Upload, ColorPicker, Cascader, TreeSelect, Mentions

**Data Display (17):** Table, DataGrid, Tree, List, Tabs, Collapse, Descriptions, Badge, Tag, Avatar, Calendar, Carousel, Timeline, Steps, Segmented, Skeleton, Diagram

**Visualization (9):** LineChart, BarChart, AreaChart, PieChart, Dashboard, DashboardEditor, Gantt, EventTimeline, ResourceCalendar

**Feedback (9):** Modal, Drawer, Notification, Popconfirm, Tooltip, Progress, Spin, Result, Empty

**Navigation (5):** Menu, Breadcrumb, Dropdown, Pagination, Transfer

**Form (8):** Form, Field, FormList, FormProvider, SchemaForm, SchemaFormEditor, AutoField, SubmitButton

**Utility (1):** Transition (CSS-class-based animations)

The Vue adapter ships the same surface with the `Sg*` prefix — `SgButton`,
`SgInput`, `SgForm`, `SgTable`, `SgDiagram`, `SgDashboard`,
`SgSchemaFormEditor`, etc.

## Architecture overview

`skygraph-react` and `skygraph-vue` are meta-packages — they re-export the
adapter and pull in the runtime + CSS as transitive dependencies. The
underlying split looks like this:

```
@skygraph/core         — pure-TS runtime + engines (forms, tables, ...)
@skygraph/styles       — framework-agnostic CSS (tokens, themes, ~64 component sheets)
@skygraph/react        — React hooks + components (peer: core + react)
@skygraph/vue          — Vue 3 composables + components (peer: core + vue)
skygraph-react         — meta-package: react adapter + core + styles
skygraph-vue           — meta-package: vue adapter + core + styles
```

You can still install the underlying packages directly if you want
fine-grained control (e.g. ship only the CSS into one app and the
adapter into another). See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for
the full breakdown.

## Development

```bash
pnpm install           # install all workspace deps (packages/* + examples/*)
pnpm build             # build all packages
pnpm test              # run tests (1672+ across core + react + vue)
pnpm lint              # eslint
pnpm typecheck         # tsc --noEmit (recursive)
pnpm format            # prettier
pnpm check:styles      # tokens / !important / classes audit (CI gate)

# React demo (interactive docs + benchmarks)
cd examples/demo
pnpm dev               # → http://localhost:5173/skygraph/

# Vue 3 demo (mirror of React docs)
cd examples/demo-vue
pnpm dev

# Showcases (12 mini-apps — CRM, Helpdesk, Inbox, Dashboard, …)
cd examples/showcases
pnpm dev
```

### Multi-framework deploy

The `deploy/` folder ships a subdirectory layout (Caddy + Docker) for
serving React and Vue interactive docs under one domain (`/react/`,
`/vue/`, plus a static landing). See [`deploy/README.md`](./deploy/README.md).

```bash
node deploy/build-all.mjs                         # local static build
docker build -f deploy/Dockerfile -t skygraph .   # containerised
```

## Documentation

- [Live demos](https://skygraph.ruslansinkevich.ru/) — landing + React (`/react/`), Vue (`/vue/`) interactive docs and React showcases (`/react/showcases/`)
- [Architecture](ARCHITECTURE.md) — internal design decisions
- [Multi-framework strategy](docs/multi-framework.md) — React ↔ Vue adapter contract
- [Styling contract](docs/styling-contract.md) / [recipes](docs/styling-recipes.md)
- [Changelog](CHANGELOG.md)

## Author's projects

SkyGraph is one of several pet projects by [Ruslan Sinkevich](https://ruslansinkevich.ru/):

- [GitBor](https://gitbor.ru/) — cross-platform desktop Git client (Electron, [github.com/RuslanSinkevich/gitbor](https://github.com/RuslanSinkevich/gitbor))
- [SkyGraph](https://skygraph.ruslansinkevich.ru/) — multi-framework UI library (this repo, [github.com/RuslanSinkevich/skygraph-public](https://github.com/RuslanSinkevich/skygraph-public))
- [Skycode](https://github.com/RuslanSinkevich/skycode) — VS Code fork with built-in AI assistant

Contacts: [ruslansinkevich.ru](https://ruslansinkevich.ru/), [Telegram](https://t.me/ruslansinkevich), [GitHub](https://github.com/RuslanSinkevich).

## License

[MIT](LICENSE)
