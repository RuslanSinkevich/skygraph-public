# SkyGraph — Styling Contract

> Русская версия: [ru/styling-contract.md](./ru/styling-contract.md)

> This document is the library's public promise about styles.
> Everything marked here as "stable" does not break in minor or patch
> versions. Everything explicitly marked as "internal" may change without
> notice.

---

## 1. Goal

A SkyGraph user must be able to **override any visual aspect** of a
component without diving into internals or fighting CSS specificity.
This is the library's main differentiator versus Ant Design / Arco /
Mantine.

In practice this means:

- any styling task is solved by **one of three levels** (below);
- if a task is solved by none — that's an **API bug**, not a user problem;
- the contract is fixed, breaking it = breaking change = major version.

---

## 2. Three styling levels

The user applies the **first one that fits**:

### 2.1. Theme via tokens (global)

Override a CSS custom property — it changes everywhere it is read.

```css
:root {
  --sg-color-primary: #e91e63;
  --sg-border-radius: 4px;
  --sg-font-size: 15px;
}
```

This is the primary path for branding and dark mode.

### 2.2. `classNames` / `styles` per slot (scoped)

Complex components expose **named slots** for each visual node.

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
/>
```

Classes and styles are applied to stable nodes **inside** the markup
(see section 4).

### 2.3. `unstyled` + your own CSS (full control)

The component renders without library styles (`@skygraph/styles` is not
imported, or is disabled per component):

```tsx
<Table unstyled className="my-table" ... />
```

The markup stays semantic (ARIA roles preserved), but no visual default
is shipped.

---

## 3. What is in the contract (stable)

The following API surface is **public** and does not change without a
major version bump:

### 3.1. Token names in `tokens.css`

- **Palette**: `--sg-blue-1 … --sg-blue-10`, `--sg-gray-1 … --sg-gray-10`, `--sg-red-*`, `--sg-green-*`, `--sg-orange-*`.
- **Semantic**: `--sg-color-bg*`, `--sg-color-text*`, `--sg-color-border*`, `--sg-color-primary*`, `--sg-color-error*`, `--sg-color-success*`, `--sg-color-warning*`, `--sg-shadow*`, `--sg-color-overlay`, `--sg-color-tooltip-*`.
- **Sizing**: `--sg-font-size*`, `--sg-line-height`, `--sg-height-*`, `--sg-border-radius*`, `--sg-padding-*`, `--sg-margin-*`, `--sg-transition-*`, `--sg-z-*`.
- **Component-level**: `--sg-btn-*`, `--sg-table-*`, `--sg-list-*` and so on (full list — section 4).

### 3.2. Root classes and slot classes

Every component has a fixed **root class** and a set of **slot
classes**. See section 4.

### 3.3. Public styling props

- `className`, `style` — on the root of any component.
- `unstyled` — on any component.
- `classNames`, `styles` — on components that declare them (see section 4).
- `prefixCls` via `ConfigProvider` — **not part** of the public API. To
  isolate class names, use an isolated host scope (Shadow DOM or a
  separate container with its own tokens).

### 3.4. Theme behaviour

- Theme switch: the attribute `data-sg-theme="light" | "dark"` on any container.
- Semantic tokens are overridden through this attribute.
- The palette does not depend on the theme.

---

## 4. Slots per component

For each component the **root class** and the **slots** are listed. Slot
keys are the property names in `classNames` / `styles` when supported.

> In the current version some components do not yet expose
> `classNames`/`styles` props — they are added per plan. Slot classes in
> the DOM are already stable (or become stable after the first audit pass).

### 4.1. Table

Root: `.sg-table-wrapper`

Slots:

| Key | DOM class | Description |
|---|---|---|
| `root` | `.sg-table-wrapper` | Outer container. |
| `toolbar` | `.sg-table-toolbar` | Top toolbar (search, export, density). |
| `scroll` | `.sg-table-scroll` | Table scroll area. |
| `grid` | `.sg-table-grid` | Header + body grid. |
| `headerRow` | (header row root) | Header row. |
| `headerCell` | `.sg-table-th` | Header cell. |
| `headerCellContent` | `.sg-table-th-content` | Header cell content (no sort/icon chrome). |
| `row` | `.sg-table-row` | Body row (row root). |
| `bodyCell` | `.sg-table-td` | Body cell. |
| `empty` | `.sg-table-empty` | Empty state. |
| `pagination` | `.sg-table-pagination` | Pagination container. |
| `footer` | `.sg-table-footer` | Footer with aggregates. |

Column-level hooks:

- `column.cellClassName` — class on the body cell in that column.
- `column.headerClassName` — class on the header cell in that column.
- `column.render` — custom cell content renderer.
- `column.title: ReactNode` — custom header content.

Table-level:

- `rowClassName: string | (row, id) => string` — class on the row root.

Component tokens (subset, full list in `tokens.css` and the table CSS):

- `--sg-table-row-height`, `--sg-table-row-bg`, `--sg-table-row-hover-bg`, `--sg-table-header-bg`, `--sg-table-border-color`, `--sg-table-cell-padding`.

### 4.2. List

Root: `.sg-list`

Slots:

| Key | DOM class | Description |
|---|---|---|
| `root` | `.sg-list` | Root. |
| `header` | `.sg-list-header` | Top area. |
| `footer` | `.sg-list-footer` | Bottom area. |
| `items` | `.sg-list-items` | Items container. |
| `item` | `.sg-list-item` | Item. |
| `empty` | `.sg-list-empty` | Empty state. |
| `pagination` | `.sg-list-pagination` | Pagination container. |

Hooks:

- `rowClassName: string | (item, index) => string` — class on the row wrapper.
- `renderItem(item, index)` — custom item renderer.
- `List.Item.Meta` with `title`/`description` as `ReactNode`.

### 4.3. Button

Root: `.sg-button`.
Modifiers: `.sg-button-primary`, `.sg-button-dashed`, `.sg-button-text`, `.sg-button-link`, `.sg-button-small`, `.sg-button-large`, `.sg-button-loading`.
Component tokens: `--sg-btn-bg`, `--sg-btn-color`, `--sg-btn-border`, `--sg-btn-height`, `--sg-btn-padding`, `--sg-btn-radius`, `--sg-btn-font-size`.

### 4.4. Form / Field

*(section is filled in as the audit progresses)*

### 4.5. Tree / DatePicker / Upload / …

*(section is filled in as the audit progresses)*

---

## 5. What is **not** in the contract (internal)

The user must not rely on these — they may break in any version.

- The `div` nesting inside a component (except for nodes marked as slots in section 4).
- Classes that do not start with the `.sg-` prefix, and classes explicitly marked in code as internal (for example `.sg-i-*`).
- The order of CSS rules, cascade, specificity inside the package.
- The name and set of utility CSS variables not listed in the top of `tokens.css`.
- The exact HTML tag of a node, unless it's a component root or a slot.
- Helper `data-sg-*` attributes not documented here (for example internal `data-sg-state-*`).

---

## 6. Versioning policy

- **major**: renaming a token, removing a slot, renaming a root class, switching the DOM node a slot hooks onto, removing `unstyled`, breaking the semantics of `classNames`/`styles`.
- **minor**: adding a token, adding a slot, adding a new component, extending `classNames` with new keys.
- **patch**: refactoring internals without breaking the contract, visual tweaks to the default theme within "the same look".

A user who relies only on documented tokens and slots does not break in
minor/patch. That is the core difference versus Ant.

---

## 7. Library-side requirements

Checked in CI (see implementation plan):

1. In `packages/styles/**/*.css`, `var(--sg-…)` names that are not in `tokens.css` are **forbidden**.
2. Every component from section 4 has a snapshot test that asserts the declared slot classes are present in the DOM.
3. Every token in `tokens.css` is documented in section 3.1 or 4 (auto-generated or by a manual checklist on release).
4. No `!important` and no "magic" hex colors in component CSS — only tokens (exceptions are documented separately).

---

## 8. How a user should read this document

- Need to change colour/brand/size globally — section 2.1 + token list 3.1.
- Need to style one component scoped — section 2.2 + component slots in section 4.
- Need to "go fully custom" — section 2.3.
- Need to know what is safe to depend on long-term — sections 3 and 5.
- Need to know when breakage may happen — section 6.
