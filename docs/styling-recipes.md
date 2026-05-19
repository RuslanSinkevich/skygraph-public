# SkyGraph — Styling Recipes

> Русская версия: [ru/styling-recipes.md](./ru/styling-recipes.md)

> Practical SkyGraph styling cookbook. 80% of real tasks are covered by
> one of the recipes below. The contract they rely on is fixed in
> [`styling-contract.md`](./styling-contract.md).

All recipes use public mechanisms:

1. **Tokens** — CSS custom properties from `@skygraph/styles/tokens.css`.
2. **Slots** — `classNames` / `styles` against declared keys.
3. **`unstyled`** — opting out of the default CSS entirely.

---

## 1. Change the brand in 30 seconds

Override a few tokens in any CSS layered on top of the library:

```css
@import '@skygraph/styles';

:root {
  --sg-color-primary: #e91e63;
  --sg-color-primary-hover: #c2185b;
  --sg-border-radius: 4px;
  --sg-font-size: 15px;
}
```

Tokens are read by every component — your edit lands in the button, in
the table header, and in the input border. The full list of stable
tokens is in [`styling-contract.md`](./styling-contract.md) §3.1.

---

## 2. Dark theme

Put the attribute `data-sg-theme="dark"` on any container, and semantic
tokens swap:

```tsx
<div data-sg-theme="dark">
  <Table ... />
</div>
```

Or globally:

```html
<html data-sg-theme="dark">
```

The palette does not change — only the semantic names swap
(`--sg-color-bg*`, `--sg-color-text*`, `--sg-color-border*` and so on).
To roll your own theme, override the tokens you need under the same
selector:

```css
[data-sg-theme='dark'] {
  --sg-color-bg: #0d1117;
  --sg-color-bg-elevated: #161b22;
  --sg-color-text: #c9d1d9;
}
```

---

## 3. Style a single table

### 3.1. Via `className` on the root

```tsx
<Table className="orders-table" ... />
```

```css
.orders-table {
  --sg-table-header-bg: #fafafa;
  --sg-table-row-hover-bg: #fff4e5;
}
.orders-table .sg-table-th {
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
```

Inside your own scope, write whatever you need — override component
tokens (`--sg-table-*`) or target public slots (`.sg-table-th`,
`.sg-table-td`, `.sg-table-row`).

### 3.2. Via `classNames` / `styles` (recommended)

```tsx
<Table
  classNames={{
    root: 'orders-table',
    toolbar: 'orders-table__toolbar',
    headerCell: 'orders-table__th',
    bodyCell: 'orders-table__td',
    row: 'orders-table__row',
    empty: 'orders-table__empty',
  }}
  styles={{
    headerCell: { fontSize: 16 },
  }}
  ...
/>
```

Classes and styles land exactly on the nodes described in the contract.
Nothing extra needs to be rendered or styled.

The full list of slots is in [`styling-contract.md`](./styling-contract.md) §4.

---

## 4. Colour rows and cells conditionally

```tsx
<Table
  columns={[
    {
      key: 'status',
      title: 'Status',
      cellClassName: 'status-cell',
      render: (value) => <span className={`status-${value}`}>{value}</span>,
    },
  ]}
  rowClassName={(row) => (row.overdue ? 'row-overdue' : '')}
/>
```

```css
.row-overdue {
  background: var(--sg-color-error-bg);
}
.status-cell {
  font-weight: 600;
}
```

`rowClassName` and `column.cellClassName` are stable contract hooks.
`!important` is not needed: the specificity of a root class is enough
(`.orders-table .row-overdue`).

---

## 5. Tweak one column header

With a class (matches `cellClassName`):

```tsx
<Table
  columns={[
    { key: 'name', title: 'Name', headerClassName: 'th-name' },
    { key: 'age', title: 'Age' },
  ]}
/>
```

With custom markup:

```tsx
<Table
  columns={[
    {
      key: 'status',
      title: <span className="th-status">Status&nbsp;?</span>,
    },
  ]}
/>
```

---

## 6. List: highlight the second item

```tsx
<List
  dataSource={items}
  rowClassName={(_, index) => (index === 1 ? 'list-item-featured' : '')}
  renderItem={(item) => <List.Item>{item.name}</List.Item>}
/>
```

```css
.list-item-featured {
  background: var(--sg-color-primary-bg);
}
```

In addition to `rowClassName`, List exposes `classNames`/`styles` per
slot (`root`, `header`, `footer`, `items`, `item`, `empty`,
`pagination`).

---

## 7. Fully custom CSS (`unstyled`)

If the default look is not needed, `unstyled` disables library styles
for a single instance. Semantics (roles, aria attributes, tab order) is
preserved.

```tsx
<Modal unstyled open onClose={close} className="my-modal">
  ...
</Modal>
```

```css
.my-modal {
  border: 1px solid hotpink;
  padding: 16px;
  background: white;
}
```

Works on any component whose props include `unstyled`.

---

## 8. What's enough — at a glance

| Task | Level | What to use |
|---|---|---|
| Change brand, size, radii everywhere | Tokens | `:root` / `--sg-*` |
| Toggle theme | Tokens | `data-sg-theme="dark"` |
| Style one component | `className` / `classNames` | Root class + slots |
| Style a row or cell conditionally | Hooks | `rowClassName`, `cellClassName`, `column.render` |
| Make a component fully your own | `unstyled` | `unstyled` + your CSS |

---

## 9. What is stable, what is not

You can only depend on what is declared in
[`styling-contract.md`](./styling-contract.md):

- token names from §3.1;
- root classes and slot keys from §4;
- props `className`, `style`, `classNames`, `styles`, `unstyled`;
- hooks like `rowClassName`, `cellClassName`, `renderItem`, `render`;
- the theme attribute `data-sg-theme`.

Internal `div` nesting, CSS rule ordering, helper `data-sg-*`
attributes — internal. Reaching for them = breakage in the next patch
release.
