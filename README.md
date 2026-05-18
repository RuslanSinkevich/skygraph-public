# SkyGraph

**Reactive UI library with a state graph engine at its core. Multi-framework — React and Vue adapters.**

AntD-level components + reactive state management out of the box. Forms, tables, trees — no boilerplate. CSS Variables, zero runtime, framework-agnostic styles. Pixel-identical components across React and Vue adapters.

[![CI](https://github.com/RuslanSinkevich/skygraph/actions/workflows/ci.yml/badge.svg)](https://github.com/RuslanSinkevich/skygraph/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Features

- **Reactive Core** — path-based store with granular subscriptions, transactions, batching, computed values, cycle detection, middleware pipeline, time-travel debugging
- **Six Domain Engines** in one family `form / table / tree / virtual / graph / calendar`:
  FormEngine (validation, dependencies, multiple errors/warnings, preserve),
  TableEngine (sort, filter, pagination, virtual scroll, **column pinning + width persistence**, advanced filters, grouping + aggregates),
  TreeEngine (check cascade, drag & drop, async load),
  **GraphEngine** (nodes / edges / hierarchy / anchors / **orthogonal routing with obstacle avoidance** + OBB + **undo/redo**),
  **CalendarEngine** (`packages/core/calendar`: resources, assignments, **availability rules + conflict detection + capacity**)
- **78+ React Components** — Button (`type` × `danger` × `block`) to DataGrid, Calendar, Tree, Transfer, Mentions, TreeSelect, Cascader, Select (single/**multiple**), Input (**readOnly**), **Diagram** (visual layer of GraphEngine, **draggable nodes**, **zoom/pan**, **snap-to-grid**, **context menu**, **hover actions**, **multi-select / lasso**), **responsive interactive Charts** (Line / Bar / Area / Pie + **ResizeObserver-based SVG sizing** + **axes** + **legend** + **tooltips** + **brush** + **crosshair** + **animations** + **hover toolbar** with print / SVG / PNG export + **context menu**), **Dashboard** + **DashboardEditor** (drag/resize widgets + **widget hover actions** + **context menu**), **ResourceCalendar** (lane planner with drag/resize/conflict overlay), **SchemaFormEditor** (visual form builder with palette + inspector + undo/redo)
- **Print / PDF** — `printable` prop + `ref.print()` on Table / Diagram / all Charts (popup + native browser print dialog, no runtime deps), `@media print` global layer, `data-sg-page-break` attribute API
- **ConfigProvider** — centralized defaults for size, disabled, locale (React Context, not CSS)
- **Schema Forms** — auto-generate forms from JSON Schema or Zod schemas; **visual builder** via `SchemaFormEditor`
- **Zero-runtime CSS** — 3-layer token system (palette → semantic → component), dark mode via `data-sg-theme`
- **Accessible** — ARIA roles/attributes on all components, keyboard navigation, focus traps, roving tabindex, axe-core smoke tests
- **Animations** — `Transition` component with CSS-class transitions (fade, slide, zoom, collapse)
- **Ant-style Documentation** — interactive bilingual (en/ru) demos with live preview, code toggle, and API prop tables. 27+ pro-feature demos for Charts / Diagram / Dashboard / Table.
- **Type-safe** — TypedCore wrapper for compile-time path validation
- **Benchmarks** — interactive page comparing SkyGraph vs `react-hook-form`, AntD `Table`, and Recharts under identical workloads (mount + per-change + submit bytes)

## Quick Start (React)

```bash
npm install @skygraph/core @skygraph/react
```

```tsx
import '@skygraph/styles'
import { Form, Field, SubmitButton } from '@skygraph/react'

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

## Quick Start (Vue 3)

```bash
npm install @skygraph/core @skygraph/vue
```

```vue
<script setup lang="ts">
import '@skygraph/styles'
import { SgForm, SgField, SgSubmitButton } from '@skygraph/vue'

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

The same `.sg-*` classes are emitted on rendered DOM, the same CSS file is loaded — Vue and React render pixel-identical UI. See [`docs/multi-framework.md`](./docs/multi-framework.md).

## Packages

| Package | Description | Size |
|---------|------------|------|
| `@skygraph/core` | Reactive runtime + 6 engines (form/table/tree/virtual/graph/calendar) | ~32 KB (ESM) |
| `@skygraph/react` | React adapter — hooks, 47 UI primitives, 17 complex (Form/Table/Tree/Diagram/Charts/Dashboard/Gantt/Timeline/ResourceCalendar/SchemaFormEditor/…) | ~440 KB (ESM main, before tree-shake) |
| `@skygraph/vue` | Vue 3 adapter — 14 composables, 52 SFC primitives, 14 complex SFCs. Pixel-identical to React, same `.sg-*` classes. | ~300 KB / ~65 KB gzip (ESM) |
| `@skygraph/styles` | Framework-agnostic CSS — 91 tokens, light/dark themes, transitions, print, 64 component stylesheets | ~234 KB raw / ~25 KB gzip |

`@skygraph/styles` is shared 1:1 across every adapter (`@skygraph/react`, `@skygraph/vue`) and pulled in transitively (declared in `dependencies`, not `peerDependencies` — installing the adapter is enough). The single import path is `'@skygraph/styles'`; per-component / per-token subpaths live under `@skygraph/styles/...`. The class-name surface is a hard public contract — see [`docs/styling-contract.md`](./docs/styling-contract.md).

## Architecture

```
@skygraph/core (pure TS, 0 dependencies)
┌─────────────────────────────────────────────┐
│  runtime/                                   │
│    Store, Batch, Transaction,               │
│    Computed, Scheduler, Middleware          │
│                                             │
│  engines/                                   │
│    FormEngine     — validation, deps, lists │
│    TableEngine    — sort, filter, group     │
│    TreeEngine     — check, expand, drag     │
│    VirtualScroll  — windowed rendering      │
│    GraphEngine    — nodes, edges, routing   │
│    CalendarEngine — assignments, conflicts  │
└─────────────────────────────────────────────┘
          ▲ public API only
          │
   ┌──────┴───────┬──────────────────┐
   │              │                  │
@skygraph/react   @skygraph/vue
(peer: core +     (peer: core +
 react)            vue ^3.4)
┌──────────────┐  ┌──────────────┐
│ hooks +      │  │ composables +│
│ ConfigProvi- │  │ provide/     │
│ der + 47 ui  │  │ inject + 52  │
│ + 17 complex │  │ ui + 14      │
│ + adapters   │  │ complex +    │
│   (zod / json│  │ adapters     │
│    schema)   │  │   (jsonSchema│
└──────────────┘  └──────────────┘
          ▲ side-effect import only
          │
@skygraph/styles (framework-agnostic CSS, 0 deps)
┌─────────────────────────────────────────────┐
│  index.css   — full bundle                  │
│  tokens.css  — 91 design tokens             │
│  reset.css                                  │
│  transitions.css                            │
│  print.css                                  │
│  themes/    — light + dark presets          │
│  components/ — 64 component stylesheets     │
└─────────────────────────────────────────────┘
```

Both adapters emit identical `.sg-*` class names and identical DOM shape — the
shared CSS file styles them transparently. A `styling-contract.parity.test.ts`
suite (≈725 lines, 30+ component snapshots) keeps Vue and React in sync on
every PR. Documented contract exceptions live in
[`docs/multi-framework.md`](./docs/multi-framework.md#documented-dom-contract-exceptions-vue-adapter).

## Theming

SkyGraph uses CSS Variables for theming — zero JS runtime overhead:

```css
/* Custom theme — just override tokens */
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

4 levels of customization:

1. **Global theme** — override `--sg-color-*` tokens
2. **Component type** — override `--sg-btn-*` variables
3. **Instance** — `unstyled` prop + render props for custom UI
4. **Headless** — skip CSS, use only hooks (`useField`, `useForm`, etc.)

SkyGraph treats styling as a public contract. Full reference:

- [`docs/styling-contract.md`](./docs/styling-contract.md) — stable tokens, root classes, slots, `classNames` / `styles` API, versioning policy.
- [`docs/styling-recipes.md`](./docs/styling-recipes.md) — practical recipes: custom brand, dark mode, per-component overrides, conditional row/cell styling, full `unstyled` mode.

## Component List (React adapter — 78+ components)

**Data Entry (18):** Button, Input, InputNumber, Textarea, Select, Checkbox, Radio, Switch, Slider, DatePicker, TimePicker, AutoComplete, Rate, Upload, ColorPicker, Cascader, TreeSelect, Mentions

**Data Display (17):** Table, DataGrid, Tree, List, Tabs, Collapse, Descriptions, Badge, Tag, Avatar, Calendar, Carousel, Timeline, Steps, Segmented, Skeleton, **Diagram**

**Visualization (9):** **LineChart**, **BarChart**, **AreaChart**, **PieChart**, **Dashboard**, **DashboardEditor**, **Gantt**, **EventTimeline**, **ResourceCalendar**

**Feedback (9):** Modal, Drawer, Notification, Popconfirm, Tooltip, Progress, Spin, Result, Empty

**Navigation (5):** Menu, Breadcrumb, Dropdown, Pagination, Transfer

**Form (8):** Form, Field, FormList, FormProvider, SchemaForm, **SchemaFormEditor**, AutoField, SubmitButton

**Utility (1):** Transition (CSS-class-based animations)

The Vue adapter (`@skygraph/vue`) ships the same surface (52 SFC primitives + 14 complex), prefixed with `Sg*` — `SgButton`, `SgInput`, `SgForm`, `SgTable`, `SgDiagram`, `SgDashboard`, `SgSchemaFormEditor`, etc.

## Tests

```
1672 active tests across core + react + vue (+ 1 bench-gated skipped)
  @skygraph/core:  388 tests (runtime, form, table+pinning+widths+advanced-filters+grouping,
                              tree, virtual, graph+routing+OBB+history,
                              calendar+availability+conflicts+capacity,
                              middleware, time-travel, typed, subpath-exports, benchmarks)
  @skygraph/react: 625 tests (components, hooks, adapters, a11y hooks + axe-core smoke, styling contract,
                              diagram+drag+zoom+pan+snap+context-menu+hover-actions+multi-select+lasso,
                              charts+legend+axes+tooltip+animations+crosshair+brush+responsive+toolbar+export+context-menu,
                              dashboard+editor+hover-actions+context-menu,
                              gantt+drag+resize+dependencies+resources,
                              event-timeline+groupBy+orientation+custom-renderers,
                              resource-calendar+drag+resize+conflicts+capacity,
                              schema-form-editor+palette+inspector+undo-redo,
                              print+ref.print()+@media print, table-virtual+dynamic-height,
                              ui-extended)
  @skygraph/vue:   659 tests (composables, ui primitives feedback/navigation/display/extended,
                              ConfigProvider provide/inject, focus-trap, roving-tabindex,
                              styling-contract.parity vs React adapter,
                              forms (SgForm/SgField/SgFormList/SgSchemaForm/SgSchemaFormEditor),
                              data-display (SgTable/SgDataGrid/SgTree/SgList/SgVirtualList),
                              visualization (SgDiagram/charts/dashboard/gantt/timeline/resource-calendar),
                              print utility)
```

## Development

```bash
pnpm install           # install all workspace deps (packages/* + examples/*)
pnpm build             # build all packages
pnpm test              # run tests (1672 across core + react + vue)
pnpm lint              # eslint
pnpm typecheck         # tsc --noEmit (recursive)
pnpm format            # prettier
pnpm check:styles      # tokens / !important / classes audit (CI gate)
pnpm audit:styles      # regenerate docs/_audit/styling-audit.md

# React demo (Ant-style interactive docs + benchmarks)
cd examples/demo
pnpm dev               # → http://localhost:5173/skygraph/

# Vue 3 demo (mirror of React docs, ant-style shell)
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
- [Architecture](ARCHITECTURE.md) — immutable design decisions
- [Multi-framework strategy](docs/multi-framework.md) — React ↔ Vue adapter contract
- [Styling contract](docs/styling-contract.md) / [recipes](docs/styling-recipes.md)
- [Changelog](CHANGELOG.md)

## Author's projects

SkyGraph is one of several pet projects by [Ruslan Sinkevich](https://ruslansinkevich.ru/):

- [GitBor](https://gitbor.ru/) — cross-platform desktop Git client (Electron, public repo: [github.com/RuslanSinkevich/gitbor](https://github.com/RuslanSinkevich/gitbor))
- [SkyGraph](https://skygraph.ruslansinkevich.ru/) — multi-framework reactive UI library (this repo, [github.com/RuslanSinkevich/skygraph](https://github.com/RuslanSinkevich/skygraph))
- [Skycode](https://github.com/RuslanSinkevich/skycode) — VS Code fork with built-in AI assistant

More at [ruslansinkevich.ru](https://ruslansinkevich.ru/).

## License

[MIT](LICENSE)
