# @skygraph/react

React adapter for [SkyGraph](https://skygraph.ruslansinkevich.ru/) — 78+ components, hooks and `ConfigProvider` built on the framework-agnostic [`@skygraph/core`](../core) engine. Shares the `.sg-*` CSS contract with the Vue and Angular adapters via [`@skygraph/styles`](../styles).

> **Easier path — the meta-package:**
>
> ```bash
> npm install skygraph-react
> ```
>
> The meta-package re-exports everything below and auto-loads the CSS as a side effect. No separate `@skygraph/core` install, no manual `import '@skygraph/styles'`. Use this package directly only when you need fine-grained control over the install set.

## Install (direct)

```bash
npm install @skygraph/react @skygraph/core
```

```ts
import '@skygraph/styles'
import { Form, Field, SubmitButton } from '@skygraph/react'

export function App() {
  return (
    <Form
      defaultValues={{ email: '' }}
      onSubmit={(values) => console.log(values)}
    >
      <Field name="email" label="Email" rules={[{ type: 'email' }]} />
      <SubmitButton>Submit</SubmitButton>
    </Form>
  )
}
```

## Components (78+)

**Data entry:** Button, Input, InputNumber, Textarea, Select, Checkbox, Radio, Switch, Slider, DatePicker, TimePicker, AutoComplete, Rate, Upload, ColorPicker, Cascader, TreeSelect, Mentions

**Data display:** Table, DataGrid, Tree, List, Tabs, Collapse, Descriptions, Badge, Tag, Avatar, Calendar, Carousel, Timeline, Steps, Segmented, Skeleton, Diagram

**Visualization:** LineChart, BarChart, AreaChart, PieChart, Dashboard, DashboardEditor, Gantt, EventTimeline, ResourceCalendar

**Feedback:** Modal, Drawer, Notification, Popconfirm, Tooltip, Progress, Spin, Result, Empty

**Navigation:** Menu, Breadcrumb, Dropdown, Pagination, Transfer

**Form:** Form, Field, FormList, FormProvider, SchemaForm, SchemaFormEditor, AutoField, SubmitButton

**Utility:** Transition (CSS-class-based animations)

## Subpath exports

| Subpath | Use |
|---|---|
| `@skygraph/react` | Full bundle |
| `@skygraph/react/form` | Form primitives only |
| `@skygraph/react/table` | Table primitives only |
| `@skygraph/react/tree` | Tree primitives only |
| `@skygraph/react/virtual` | Virtual-scroll helpers |
| `@skygraph/react/datagrid` | DataGrid |
| `@skygraph/react/devtools` | Optional devtools panel |

## Repository

[github.com/RuslanSinkevich/skygraph-public](https://github.com/RuslanSinkevich/skygraph-public)

## License

MIT
