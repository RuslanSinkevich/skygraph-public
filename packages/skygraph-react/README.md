# skygraph-react

[![npm](https://img.shields.io/npm/v/skygraph-react.svg)](https://www.npmjs.com/package/skygraph-react)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/RuslanSinkevich/skygraph-public/blob/master/LICENSE)

UI components for React — tables, forms, charts, calendars, diagrams and more. One install, styles included. The same DOM and `.sg-*` CSS contract is shared with the Vue adapter, so the look stays identical across frameworks.

```bash
npm install skygraph-react
```

```tsx
import { Form, Field, SubmitButton } from 'skygraph-react'

function App() {
  return (
    <Form defaultValues={{ email: '' }}>
      <Field name="email" label="Email" rules={[{ type: 'email' }]} />
      <SubmitButton>Submit</SubmitButton>
    </Form>
  )
}
```

That's it. No extra `@skygraph/styles` import, no separate `@skygraph/core` install. The styles are pulled in automatically as a side effect of importing from `skygraph-react`.

## What's inside

`skygraph-react` re-exports the full public API of [`@skygraph/react`](https://www.npmjs.com/package/@skygraph/react) and ships [`@skygraph/core`](https://www.npmjs.com/package/@skygraph/core) and [`@skygraph/styles`](https://www.npmjs.com/package/@skygraph/styles) as transitive dependencies. Existing imports from `@skygraph/*` keep working — this package is purely additive.

## Components

Button, Input, Select, DatePicker, Table, DataGrid, Tree, Transfer, Modal, Drawer, Notification, Tabs, Form, FormList, SchemaForm, SchemaFormEditor, Diagram, LineChart, BarChart, AreaChart, PieChart, Dashboard, Gantt, EventTimeline, ResourceCalendar — and the rest of an AntD-shaped surface.

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
- Vue version — [skygraph-vue](https://www.npmjs.com/package/skygraph-vue)
- Author — [ruslansinkevich.ru](https://ruslansinkevich.ru/)

## License

MIT
