# skygraph-vue

[![npm](https://img.shields.io/npm/v/skygraph-vue.svg)](https://www.npmjs.com/package/skygraph-vue)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/RuslanSinkevich/skygraph-public/blob/master/LICENSE)

UI components for Vue 3 — tables, forms, charts, calendars, diagrams and more. One install, styles included. The same DOM and `.sg-*` CSS contract is shared with the React adapter, so the look stays identical across frameworks.

```bash
npm install skygraph-vue
```

```vue
<script setup lang="ts">
import { SgForm, SgField, SgSubmitButton } from 'skygraph-vue'
</script>

<template>
  <SgForm :default-values="{ email: '' }">
    <SgField name="email" label="Email" />
    <SgSubmitButton>Submit</SgSubmitButton>
  </SgForm>
</template>
```

That's it. No extra `@skygraph/styles` import, no separate `@skygraph/core` install. The styles are pulled in automatically as a side effect of importing from `skygraph-vue`.

## What's inside

`skygraph-vue` re-exports the full public API of [`@skygraph/vue`](https://www.npmjs.com/package/@skygraph/vue) and ships [`@skygraph/core`](https://www.npmjs.com/package/@skygraph/core) and [`@skygraph/styles`](https://www.npmjs.com/package/@skygraph/styles) as transitive dependencies. Existing imports from `@skygraph/*` keep working — this package is purely additive.

## Components

SgButton, SgInput, SgSelect, SgDatePicker, SgTable, SgDataGrid, SgTree, SgList, SgModal, SgDrawer, SgNotification, SgTabs, SgForm, SgFormList, SgSchemaForm, SgSchemaFormEditor, SgDiagram, SgLineChart, SgBarChart, SgAreaChart, SgPieChart, SgDashboard, SgGantt, SgEventTimeline, SgResourceCalendar — and the rest of an AntD-shaped surface with the `Sg*` prefix.

## Theming

CSS Variables, no CSS-in-JS:

```css
:root {
  --sg-color-primary: #7c3aed;
  --sg-border-radius: 8px;
}
```

Dark mode via one attribute:

```html
<html data-sg-theme="dark"> ... </html>
```

## Links

- Docs & live demos — [skygraph.ruslansinkevich.ru](https://skygraph.ruslansinkevich.ru/)
- Source — [github.com/RuslanSinkevich/skygraph-public](https://github.com/RuslanSinkevich/skygraph-public)
- React version — [skygraph-react](https://www.npmjs.com/package/skygraph-react)
- Author — [ruslansinkevich.ru](https://ruslansinkevich.ru/)

## License

MIT
