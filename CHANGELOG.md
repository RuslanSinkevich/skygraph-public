# Changelog

All notable changes to SkyGraph are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2026-05-31

### Added

- **`@skygraph/vue`** — Vue 3 adapter with the same components and the same
  `.sg-*` CSS classes as React. Install `skygraph-vue` and you get the whole
  set styled out of the box.
- **`skygraph-react` / `skygraph-vue` meta-packages** — one install brings
  the adapter, the core engine and the stylesheet. No separate
  `@skygraph/styles` import needed.
- **`@skygraph/styles`** — CSS extracted into its own package. Same classes,
  same tokens, can be cherry-picked from any framework or from vanilla
  HTML.
- **`ResourceCalendar`** — schedule resources against a timeline with
  drag/resize, capacity limits, working-hours rules and automatic conflict
  detection.
- **`Gantt`** — task bars over a discrete time axis with drag, resize,
  dependency arrows and resource lanes.
- **`EventTimeline`** — date-anchored event stream, horizontal or vertical,
  optional grouping by day / month / year.
- **`SchemaFormEditor`** — visual form builder on top of `SchemaForm`:
  palette, canvas, inspector, undo/redo, JSON-Schema round-trip.
- **Print / PDF** — `printElement(node)` helper plus a `printable` prop
  and a `.print()` method on `Table`, `Diagram` and every chart.
  PDF export is handled by the browser's native print dialog.
- **Diagram** — context menu and hover-actions per node / edge / canvas,
  multi-select with Ctrl+click and lasso, undo/redo, snap-to-grid,
  zoom and pan, orthogonal routing that avoids obstacles.
- **Charts** — responsive SVG (auto-resize), interactive crosshair,
  range brushing, animations, hover toolbar with print / SVG / PNG export,
  per-series and per-chart context menus.
- **Dashboard** — widget hover actions, context menu, editor mode for
  drag-resize layout.
- **Table** — dynamic-height virtualization, advanced filters (operator
  picker), row grouping with aggregates, column pinning persistence.
- **Telegram contact** surfaced on the landing page and author card.

### Changed

- Public repository moved to
  [github.com/RuslanSinkevich/skygraph-public](https://github.com/RuslanSinkevich/skygraph-public).
- Diagram edge routing rewritten on the floating-edges algorithm used by
  xyflow / mxGraph. Edges now slide along node perimeters as nodes are
  dragged — no more bunching at a single corner on dense graphs.
- Landing page and README rewritten in plain language; contributor-only
  jargon moved into `ARCHITECTURE.md`.
- TypeScript target raised to ES2022. `Array.prototype.at()` and other
  recent additions are now usable from source without polyfills.

### Fixed

- `Tooltip` rich content no longer collapses to zero width.
- `Progress` bar no longer flashes empty on the first frame.
- `Tree` virtualization scrollbar reflects the full tree height,
  not only the visible window.
- `Slider` stretches correctly inside flex/grid containers.
- `Rate` inactive symbols are now visually distinguishable when using
  colour emoji as the character.
- `Collapse` (Vue) — clicking the header now actually expands the panel.
- `Checkbox` / `Radio` (Vue) — initial mount no longer ignores
  `checked` / `defaultChecked`.

### Removed

- `import '@skygraph/react/styles'` and all its subpaths. Replace with
  `import '@skygraph/styles'` (or a `@skygraph/styles/components/*`
  subpath). The styles travel transitively when you install
  `@skygraph/react`, so no separate install is required.
- Deprecated `ui/TreeSelect` and `ui/Transfer` (the complex versions
  have been the canonical implementations since 0.4.0).

## [0.4.0] - 2026-05-01

### Added

- **`GraphEngine`** — fourth domain engine alongside form / table / tree.
  Models a directed graph with parent-child hierarchy, outline-based
  geometry (rect / ellipse / polygon), stable anchors and AABB bounds.
- **`<Diagram>`** + **`useGraph`** — visual layer for `GraphEngine`
  with DOM nodes, SVG edges, custom `renderNode`, draggable nodes and
  orthogonal edge routing.
- **`AreaChart`**, **`PieChart`** (and donut via `innerRadius`), shared
  **`ChartLegend`**.
- **`Dashboard`** — CSS-grid widget layout with per-widget `(x, y, w, h)`
  placement, plus an editable counterpart with drag and resize.
- **Public styling contract** — `docs/styling-contract.md` documents
  stable tokens, root classes, slot keys and the `classNames` / `styles`
  API. CI scripts (`check:tokens`, `check:no-important`, `audit:styles`)
  keep the contract honest.
- **Table column pinning** — `pinColumn(column, side)`, `clearPinned()`;
  persisted in the core store.

### Changed

- `TreeSelect`, `Transfer` and `Calendar` main exports now point at the
  richer `complex/` implementations. The flat `ui/` versions remain on
  disk for tests and are scheduled for removal.
- `package-lock.json` removed — pnpm is the single source of truth.

### Fixed

- `SchemaForm` no longer calls `useConfig()` conditionally.
- Default submit button styling (`sg-btn` → `sg-button`).

## [0.3.0] - 2026-04-14

### Added

- Interactive documentation surface for every component:
  - `DemoBox` — live preview with collapsible source.
  - `PropsTable` — API reference tables.
  - `ComponentDoc` — page layout with title, description, "When to use"
    and examples.
- All 40 demo pages migrated to the new documentation format.

## [0.2.0] - 2026-04-13

### Added

- **Accessibility** — ARIA attributes on 24+ components; keyboard
  navigation for `Select`, `Dropdown`, `AutoComplete`, `Menu`, `Tabs`,
  `Rate`, `Slider`. New hooks `useFocusTrap`, `useRovingTabIndex`,
  `useListNavigation`.
- **New components** — `Transfer`, `Calendar`, `TreeSelect`, `Mentions`,
  `Transition`.
- **Animations** — class-based transitions (fade, slide, zoom, collapse)
  used by `Modal`, `Drawer`, `Dropdown`, `Tooltip`, `Popconfirm`,
  `Notification`, `Select`.
- **`ConfigProvider`** — size / disabled / locale, propagated through
  every UI and complex component.
- **Form** — `scrollToFirstError`, `onValuesChange`, `preserve`,
  `warningRules`, `feedbackIcons`, `FormProvider` (multi-form
  coordination), `SchemaForm`, expanded `AutoField` (ten new types),
  `jsonSchemaAdapter`, `zodToJsonSchema`.
- **Table** — multi-sort UI, row drag-and-drop, context menus, column
  visibility, column pinning, virtual scroll, CSV / clipboard export,
  selection summary, zebra striping, advanced pagination.
- **`DataGrid`** — Excel-like component with inline editing, selection
  and formulas.
- **Core** — pluggable middleware pipeline and a `useHistory` hook for
  undo / redo.

## [0.1.0] - 2026-04-13

### Added

- **`@skygraph/core`** — reactive runtime (`Store`, `Batch`,
  `Transaction`, `Computed`, `Scheduler`).
- **`FormEngine`** — fields, validation, submit, reset, cross-field
  dependencies.
- **`TableEngine`** — CRUD, sorting, filtering, pagination.
- **`TreeEngine`** — expand, check, select, drag, async load, filter.
- **`TypedCore`** wrapper for type-safe paths.
- **`@skygraph/react`** — hooks (`useForm`, `useField`, `useWatch`,
  `useComputed`, `useTable`, `useTree`), 11 complex components, 39 UI
  components.
- CSS design tokens, light / dark themes, per-component styles.
- Demo application with 41 interactive examples.
- CI pipeline (GitHub Actions), ESLint + Prettier configuration.
