# SkyGraph

> English version: [README.md](../../README.md)

**UI-компоненты для React и Vue на общем движке. Одна установка, один CSS, одинаковый внешний вид.**

78+ готовых компонентов — формы, таблицы, деревья, графики, календари,
диаграммы, дашборды. Одинаковый DOM, одинаковые `.sg-*` классы, одинаковое
поведение в обоих адаптерах. Бесплатно, MIT.

[![CI](https://github.com/RuslanSinkevich/skygraph-public/actions/workflows/ci.yml/badge.svg)](https://github.com/RuslanSinkevich/skygraph-public/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](../../LICENSE)

---

## Быстрый старт (React)

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

Стили подтягиваются автоматически — отдельный `import '@skygraph/styles'`
не нужен, как и отдельная установка `@skygraph/core`.

## Быстрый старт (Vue 3)

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

Тот же DOM, те же CSS-классы — смена фреймворка не меняет внешний вид.
См. [`multi-framework.md`](../multi-framework.md) *(только EN)*.

## Возможности

- **78+ React-компонентов / 66+ Vue-компонентов** — Button, Input, Select,
  DatePicker, Table, DataGrid, Tree, Transfer, TreeSelect, Cascader,
  Diagram, Charts (Line / Bar / Area / Pie), Dashboard, Gantt,
  EventTimeline, ResourceCalendar, SchemaFormEditor и весь остальной
  набор в стиле AntD.
- **Один движок для React и Vue** — общий runtime (`@skygraph/core`)
  хранит состояние, оба адаптера подписываются на него.
- **Одинаковый внешний вид из коробки** — React и Vue рендерят одинаковый
  DOM и одинаковые `.sg-*` классы. Смена фреймворка не меняет UI.
- **Лёгкий, предсказуемый CSS** — ~25 КБ gzipped, без CSS-in-JS, без
  runtime-инжекции. Светлая и тёмная темы через один атрибут на `<html>`.
- **TypeScript first** — строгие типы end-to-end. Схемы форм из JSON
  Schema или Zod. Никакого `any` в публичном API.
- **Доступность по умолчанию** — клавиатурная навигация, ARIA-роли,
  управление фокусом встроены.
- **Печать / PDF** — таблицы, диаграммы и графики имеют проп `printable`
  и метод `ref.print()`, открывающий чистый системный диалог печати.

## Темы

Только CSS Variables — нулевой runtime-оверхед.

```css
:root {
  --sg-color-primary: #7c3aed;
  --sg-border-radius: 8px;
}
```

Переключение на тёмную тему:

```html
<div data-sg-theme="dark">
  <!-- все потомки используют тёмную тему -->
</div>
```

Четыре уровня кастомизации:

1. **Глобальная тема** — переопределение `--sg-color-*` токенов
2. **Тип компонента** — переопределение `--sg-btn-*` переменных
3. **Экземпляр** — проп `unstyled` + render props для своего UI
4. **Headless** — без CSS, только хуки (`useField`, `useForm` и т. д.)

Справочники:

- [`styling-contract.md`](./styling-contract.md) — стабильные токены, корневые классы, слоты, API `classNames` / `styles`, политика версий.
- [`styling-recipes.md`](./styling-recipes.md) — практические рецепты: свой бренд, тёмная тема, переопределения по компоненту, условные стили строк/ячеек, полный `unstyled`.

## Список компонентов (React-адаптер — 78+ компонентов)

**Data Entry (18):** Button, Input, InputNumber, Textarea, Select, Checkbox, Radio, Switch, Slider, DatePicker, TimePicker, AutoComplete, Rate, Upload, ColorPicker, Cascader, TreeSelect, Mentions

**Data Display (17):** Table, DataGrid, Tree, List, Tabs, Collapse, Descriptions, Badge, Tag, Avatar, Calendar, Carousel, Timeline, Steps, Segmented, Skeleton, Diagram

**Visualization (9):** LineChart, BarChart, AreaChart, PieChart, Dashboard, DashboardEditor, Gantt, EventTimeline, ResourceCalendar

**Feedback (9):** Modal, Drawer, Notification, Popconfirm, Tooltip, Progress, Spin, Result, Empty

**Navigation (5):** Menu, Breadcrumb, Dropdown, Pagination, Transfer

**Form (8):** Form, Field, FormList, FormProvider, SchemaForm, SchemaFormEditor, AutoField, SubmitButton

**Utility (1):** Transition (анимации через CSS-классы)

Vue-адаптер предоставляет тот же набор с префиксом `Sg*` — `SgButton`,
`SgInput`, `SgForm`, `SgTable`, `SgDiagram`, `SgDashboard`,
`SgSchemaFormEditor` и т. д.

## Обзор архитектуры

`skygraph-react` и `skygraph-vue` — мета-пакеты: они реэкспортируют
адаптер и подтягивают runtime + CSS как транзитивные зависимости. Под
ними лежит такая структура:

```
@skygraph/core         — чистый TS-runtime + движки (формы, таблицы, ...)
@skygraph/styles       — фреймворк-агностичный CSS (токены, темы, ~64 файла стилей)
@skygraph/react        — React-хуки + компоненты (peer: core + react)
@skygraph/vue          — Vue 3 composables + компоненты (peer: core + vue)
skygraph-react         — мета-пакет: react-адаптер + core + styles
skygraph-vue           — мета-пакет: vue-адаптер + core + styles
```

При необходимости можно поставить пакеты под капотом напрямую (например,
доставить только CSS в одно приложение, а адаптер — в другое). Подробности
в [`ARCHITECTURE.md`](../../ARCHITECTURE.md) *(только EN)*.

## Документация

- [Живые демо](https://skygraph.ruslansinkevich.ru/) — лендинг + React (`/react/`), Vue (`/vue/`) интерактивные доки и React-витрины (`/react/showcases/`)
- [Контракт стилизации](./styling-contract.md)
- [Рецепты стилизации](./styling-recipes.md)
- [Multi-framework стратегия](../multi-framework.md) *(только EN)*
- [Архитектура](../../ARCHITECTURE.md) *(только EN)*
- [Changelog](../../CHANGELOG.md)
- [Migration notes](../../MIGRATION.md) *(только EN)*
- [Contributing](../../CONTRIBUTING.md) *(только EN)*

## Проекты автора

SkyGraph — один из нескольких pet-проектов [Руслана Синкевича](https://ruslansinkevich.ru/):

- [GitBor](https://gitbor.ru/) — кросс-платформенный десктоп Git-клиент (Electron, [github.com/RuslanSinkevich/gitbor](https://github.com/RuslanSinkevich/gitbor))
- [SkyGraph](https://skygraph.ruslansinkevich.ru/) — multi-framework UI-библиотека (этот репо, [github.com/RuslanSinkevich/skygraph-public](https://github.com/RuslanSinkevich/skygraph-public))
- [Skycode](https://github.com/RuslanSinkevich/skycode) — форк VS Code со встроенным AI-ассистентом

Контакты: [ruslansinkevich.ru](https://ruslansinkevich.ru/), [Telegram](https://t.me/ruslansinkevich), [GitHub](https://github.com/RuslanSinkevich).

## Лицензия

[MIT](../../LICENSE)
