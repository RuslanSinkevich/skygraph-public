# Changelog

All notable user-facing changes to SkyGraph are documented here.

Each version uses the same cycle: `Core`, `Components`, `Styles`, `Fixes`, and `Breaking / Removed`.
Demo implementation details, docs routing, tests, generated reports, and dead adapters are intentionally omitted.

## [0.6.4] - 2026-06-17

### Core

- No runtime core changes.

### Components

- React `ConfigProvider` `locale` now reaches `DataGrid`, `List`, `Transfer`, `Tree`, `TimePicker`, `PinInput`, and `ColorPicker`.
- React `Table` now reads `locale.table` from `ConfigProvider` in addition to its own `locale` prop.
- Vue `ConfigProvider` `disabled` now propagates to every interactive control (`Select`, `Checkbox`, `Switch`, `Radio`, `Input`, `Textarea`, `InputNumber`, `Slider`, `DatePicker`, `Upload`, `Rate`, `ColorPicker`, `AutoComplete`, `Cascader`).
- Vue `Field` required/optional markers now come from the active `locale` instead of being hardcoded.
- Locales gained a shared key superset across React and Vue, and four new presets: `ja_JP`, `ko_KR`, `pt_BR`, and `it_IT`.

### Styles

- Vue `Table` filter and search icons now render as SVG, matching React.
- Range `DatePicker` dropdown no longer clips the second calendar when presets are shown.

### Fixes

- React `Table` multi-sort: a repeated click on an already sorted column cycles its direction again instead of being ignored.
- React `Table` resizable columns no longer jump left on the first drag (the real rendered width is measured).
- Vue `Table` empty state is now centered.

### Breaking / Removed

- No user-facing removals.

## [0.6.3] - 2026-06-09

### Core

- No runtime core changes.

### Components

- Public React and Vue demos now have dedicated production pages for docs and showcases.
- React `Notification` accepts per-toast `className` and `style` for scoped theming.
- React `Table` row selection no longer double-toggles when checkbox or radio controls are clicked.
- Vue `Menu` collapsed items without icons now show a first-letter fallback.

### Styles

- Landing, React, Vue, and showcase pages gained canonical metadata, social previews, favicons, manifest, robots, and sitemap coverage.
- `Table`, `Tabs`, `Rate`, `Spin`, `List`, `Menu`, and `EventTimeline` received visual polish for tokens, sizing, dark theme, and collapsed states.

### Fixes

- Vue `Table` custom filter dropdowns now appear only on filterable columns.
- Vue `List` and `Tree` drag-and-drop now start reliably in Firefox and keep the move cursor during drag.

### Breaking / Removed

- Vue demo pages removed unfinished unstyled examples from the public catalog.

## [0.5.1] - 2026-06-07

### Core

- `ConfigProvider` now controls theme mode, design tokens, direction, popup containers, empty states, and CSP nonce from one place.

### Components

- React `Input` added a clear button, prefix/suffix slots, and error/warning status.
- React `Upload` added drag mode, validation hooks, custom request, and upload progress.
- Vue `Pagination`, `Select`, `ColorPicker`, `Carousel`, `Cascader`, and `Empty` moved closer to React parity.
- The examples catalog replaced `Org Chart` with `Project Tracker` to show table-driven task tracking in React and Vue.

### Styles

- `AutoField` now uses the shared `@skygraph/styles` CSS contract in React and Vue.
- Public token names were aligned around `--sg-color-*`, `--sg-border-radius`, and shared component classes.
- `Input`, `Select`, and `Cascader` now share the same `--sg-input-*` token family for scoped restyling.
- `Rate` inactive symbols are easier to read when custom glyphs or emoji are used.

### Fixes

- React `Pagination` buttons no longer submit parent forms.
- Vue `Modal.width` now flows through `--sg-modal-width`, matching React and token overrides.

### Breaking / Removed

- No user-facing removals.

## [0.5.0] - 2026-05-31

### Core

- The TypeScript target moved to ES2022 for a newer runtime baseline.
- Print support was added through `printElement()` and printable table, diagram, and chart surfaces.

### Components

- `@skygraph/vue` shipped as the Vue 3 adapter with the same public component set as React.
- `ResourceCalendar`, `Gantt`, `EventTimeline`, and `SchemaFormEditor` added major planning and form-building surfaces.
- `Diagram`, charts, `Dashboard`, and `Table` received stronger editing, export, and interaction features.

### Styles

- `@skygraph/styles` became the shared stylesheet package for React, Vue, and vanilla usage.
- `skygraph-react` and `skygraph-vue` now include the adapter, core engine, and styles in one install.

### Fixes

- `Tooltip`, `Progress`, `Tree`, `Slider`, and `Rate` received visual and layout fixes.
- Vue `Collapse`, `Checkbox`, and `Radio` fixed incorrect initial or click behavior.

### Breaking / Removed

- `@skygraph/react/styles` imports were removed in favor of `@skygraph/styles`.
- Deprecated flat `ui/TreeSelect` and `ui/Transfer` exports were removed from the public path.

## [0.4.0] - 2026-05-01

### Core

- `GraphEngine` added graph state, hierarchy, geometry, anchors, and bounds.
- Table column pinning was added to the core table store.

### Components

- `Diagram` and `useGraph` added the first visual layer for `GraphEngine`.
- `AreaChart`, `PieChart`, `ChartLegend`, and `Dashboard` expanded the visual component set.

### Styles

- The public styling contract documented stable tokens, root classes, slot keys, and style override APIs.

### Fixes

- `SchemaForm` stopped calling `useConfig()` conditionally.
- Default submit button styling was corrected from `sg-btn` to `sg-button`.

### Breaking / Removed

- `TreeSelect`, `Transfer`, and `Calendar` main exports moved to the richer complex implementations.

## [0.3.0] - 2026-04-14

### Core

- No runtime core changes.

### Components

- No public component API changes.

### Styles

- No public styling contract changes.

### Fixes

- No product fixes recorded.

### Breaking / Removed

- No user-facing removals.

## [0.2.0] - 2026-04-13

### Core

- Core gained a middleware pipeline and `useHistory()` for undo and redo.

### Components

- `Transfer`, `Calendar`, `TreeSelect`, `Mentions`, `Transition`, `DataGrid`, and expanded form/table APIs were added.
- Accessibility improved across the component set with ARIA attributes and keyboard navigation.

### Styles

- Class-based animations were added for overlays and interactive components.

### Fixes

- No product fixes recorded.

### Breaking / Removed

- No user-facing removals.

## [0.1.0] - 2026-04-13

### Core

- `@skygraph/core` introduced the reactive runtime with `Store`, `Batch`, `Transaction`, `Computed`, and `Scheduler`.
- `FormEngine`, `TableEngine`, `TreeEngine`, and `TypedCore` shipped as the first core engines.

### Components

- `@skygraph/react` shipped with the first hooks, complex components, and UI components.

### Styles

- CSS design tokens, light/dark themes, and per-component styles shipped with the first release.

### Fixes

- No product fixes recorded.

### Breaking / Removed

- No user-facing removals.
