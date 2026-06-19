# SkyGraph — Multi-framework strategy

> Why this document exists. SkyGraph started as React-only, but the runtime
> (`@skygraph/core`) was designed framework-agnostic from day one (pure TS,
> 0 deps). After round 12 the CSS layer is also framework-agnostic
> (`@skygraph/styles`, no JS). This file fixes how new framework adapters
> (`@skygraph/vue`, `@skygraph/angular` later) plug into the existing
> foundations without forking, duplicating, or coupling adapters to one
> another.

## Goals

1. **React stays the canonical adapter** — `@skygraph/react` keeps shipping
   today's API and demos as-is. No regressions for existing users.
2. **Vue is the second canonical adapter** ✅ (full surface shipped, alpha
   towards `1.0`). It reuses `@skygraph/core` and `@skygraph/styles` 1:1
   — no per-framework CSS, no per-framework engine implementations.
   `styling-contract.parity.test.ts` keeps DOM/class output pixel-aligned
   with React on every PR.
3. **Angular is optional later**. Same contract.
4. **Shared documentation** — public docs (component pages, recipes) show
   `React | Vue | Angular` tabs once an adapter exists. Source of truth
   lives in each adapter's demo package; the doc surface does cross-linking,
   not bundle merging.

## Foundations (already framework-agnostic)

- `@skygraph/core` — pure TS, 0 deps. Runtime (`Store`, `Batch`,
  `Transaction`, `Computed`, `Scheduler`, `Middleware`) plus 6 engines
  (form, table, tree, virtual, graph, calendar). Public API is consumed
  directly: hooks / composables / services in adapters are thin wrappers
  that subscribe to the engine's stores.
- `@skygraph/styles` — CSS-only package (extracted in round 12). Tokens,
  reset, themes, transitions, print layer and per-component stylesheets.
  Selectors target `.sg-*` class names; theming via `data-sg-theme`.
  No JS, no runtime, just CSS Variables. Imported by every adapter as
  `import '@skygraph/styles'`.

## Per-framework adapter packages

| Package              | Status                | Wraps                                       | Distribution             |
| -------------------- | --------------------- | ------------------------------------------- | ------------------------ |
| `@skygraph/react`    | ✅ shipping (canonical)| core engines via `useX` hooks               | `dependencies: styles`   |
| `@skygraph/vue`      | ✅ full surface (alpha → 1.0) | core engines via `useX` composables   | `dependencies: styles`   |
| `@skygraph/angular`  | ⚪ later               | core engines via `XService` (DI)            | `dependencies: styles`   |

### Adapter contract

Every adapter:

1. **Peer-depends on `@skygraph/core`** (`>=0.1.0`) and the framework
   itself (`react`, `vue`, `@angular/core`, …).
2. **Depends transitively on `@skygraph/styles`** (declared in
   `dependencies`, not peer — installing the adapter is enough; users
   don't need to add `@skygraph/styles` separately unless they want
   cherry-pick CSS subpaths).
3. **Mirrors the same API surface** under idiomatic framework names.
   Symmetric examples (full Vue parity as of round 13):

   | Capability       | React              | Vue                       | Angular (planned)        |
   | ---------------- | ------------------ | ------------------------- | ------------------------ |
   | Form binding     | `useForm`          | `useForm` ✅              | `FormService`            |
   | Single field     | `useField`         | `useField` ✅             | `FieldDirective`         |
   | Field array      | `useFieldArray`    | `useFieldArray` ✅        | (TBD)                    |
   | Watch values     | `useWatch`         | `useWatch` ✅             | `select()` (RxJS)        |
   | Table data       | `useTable`         | `useTable` ✅             | `TableService`           |
   | Tree data        | `useTree`          | `useTree` ✅              | `TreeService`            |
   | Graph engine     | `useGraph`         | `useGraph` ✅             | `GraphService`           |
   | Virtual list     | `useVirtualScroll` | `useVirtualScroll` ✅     | `VirtualService`         |
   | History          | `useHistory`       | `useHistory` ✅           | `HistoryService`         |
   | Computed         | `useComputed`      | `useComputed` ✅          | `ComputedService`        |
   | Chart sizing     | `useChartSize`     | `useChartSize` ✅         | (TBD)                    |
   | Focus trap (a11y)| `useFocusTrap`     | `useFocusTrap` ✅         | `FocusTrapDirective`     |
   | Roving tabindex  | `useRovingTabIndex`| `useRovingTabIndex` ✅    | (TBD)                    |
   | List navigation  | `useListNavigation`| `useListNavigation` ✅    | (TBD)                    |

   Component surface parity (Vue vs React, all `Sg*`-prefixed): the
   complex components (Form/Table/Tree/Diagram/Charts/Dashboard/Gantt/
   Timeline/ResourceCalendar/SchemaForm/SchemaFormEditor/…) and the ui
   primitives are ported (Vue splits `Input` into
   `Input/InputNumber/InputPassword/InputGroup/SearchInput/PinInput/TagInput/InlineEdit`
   variants which are all shapes of the same engine).

4. **Emits the exact same `.sg-*` class names** on rendered DOM as
   `@skygraph/react`. This is a hard contract — see
   [`docs/styling-contract.md`](./styling-contract.md). Pixel-identical
   visuals across adapters is a product requirement.
5. **Renders the same DOM structure** for each component (same number
   of nodes, same data attributes, same ARIA roles). Without this, the
   shared CSS layer cannot work.

### Framework-specific code lives only in adapters

Anything that touches `React.useState`, `Vue.ref()`, `Subject` /
`computed`, or framework-specific lifecycle goes into the adapter. Core
remains framework-free forever.

## Demo strategy

- **`examples/demo`** stays React. It is the canonical demo package
  (Ant-style live docs + component pages + benchmarks page comparing
  SkyGraph vs `react-hook-form` / AntD `Table` / Recharts).
- **`examples/demo-vue`** ✅ exists today as a separate workspace
  package, also Vite-powered, mounting showcases against
  `@skygraph/vue`. Ships an Ant-style shell + component
  pages; URL paths and component slugs are kept identical to the React
  demo so cross-linking works (e.g. `/components/form` exists in both).
- **`examples/demo-angular`** (later) follows the same pattern.
- **No bundle merging.** Each demo package is its own SPA. A
  `FrameworkSwitcher` widget in the React demo header lets the reader
  jump between `/`, `/vue/`, `/angular/` deploy paths.
- **`deploy/`** ships a Caddy + Docker scaffold to host React/Vue/
  Angular under one domain. Production deploy
  (`infra/scripts/deploy-skygraph.ps1`) currently publishes the static
  landing at `/`, React at `/react/` (+ `/react/showcases/`) and Vue at
  `/vue/` on `skygraph.ruslansinkevich.ru`; Angular ships as a
  Coming-Soon stub at `/angular/` until the Angular demo is wired into
  the deploy pipeline. The local `deploy/build-all.mjs` builds React
  only and drops stubs into `vue/` and `angular/` for offline checks.

### Shared demo content (`examples/_shared/`)

Cross-framework content lives in `examples/_shared/` (vanilla TS, no
React / Vue / Angular imports):

- CHANGELOG / TODO parsers (drive the "what's new" page).
- Fixture data (rows, trees, schemas) used by Table / Tree / Form demos.
- Static assets (illustrations, icons, screenshots).
- Stat constants (test counts, package sizes).

Each demo package imports from `@skygraph-examples/shared` (workspace
package). Adding new shared content here keeps demos in sync without
copy-paste.

## CSS contract (hard, public API)

The class-name surface is the **stable public contract** between
adapters. Documented in [`docs/styling-contract.md`](./styling-contract.md);
the audit script (`pnpm audit:styles`) keeps it honest.

- A class like `.sg-button-primary` is **emitted identically** by every
  adapter.
- A token like `--sg-color-primary` is **defined once** in
  `@skygraph/styles/tokens.css` and overridden globally by users via
  `:root { --sg-color-primary: … }`.
- DOM structure is part of the contract — adding a wrapper `<div>`
  inside an adapter component is a breaking change unless every adapter
  ships it simultaneously.

If a future adapter cannot emit a particular class (e.g. Angular's
template syntax forces a different DOM), the resolution is to update
`@skygraph/styles` and **all** adapters together — never to fork CSS
per framework.

### Documented DOM-contract exceptions (Vue adapter)

The Vue adapter is verified against the React adapter by
`packages/vue/src/__tests__/styling-contract.parity.test.ts`. The
following minor host-element differences are accepted:

1. **Input `status` modifier classes (Vue super-set).** Vue
   `<SgInput status="error">` adds `sg-input-wrapper-status-error` /
   `sg-input-status-error` on top of the React contract. The React
   adapter encodes the same state via `aria-invalid` only. Both adapters
   honour `aria-invalid="true"` and `aria-readonly="true"`.
2. **Textarea root tag.** React renders `<span class="sg-textarea-wrapper">`,
   Vue renders `<div class="sg-textarea-wrapper">` with the same children.
   Visual styling is identical because the wrapper is `display: block` on
   both adapters. The class set is identical.
3. **Tooltip wrapper tag.** React renders `<div class="sg-tooltip-wrapper">`,
   Vue keeps `<span class="sg-tooltip-wrapper">` to preserve inline flow
   under default browser CSS. The wrapper class, ARIA wiring (`role="tooltip"`
   on the popover, `aria-describedby` linkage) and CSS variables are
   identical.

## Versioning

- Monorepo-wide semver. Every release advances `@skygraph/core`,
  `@skygraph/styles` and every adapter package to the same version.
- A breaking change in `@skygraph/core` is breaking in every adapter and
  in `@skygraph/styles` (DOM-contract changes count as breaking).
- A non-breaking CSS-only change (e.g. new component stylesheet) bumps
  minor everywhere.
- Adapters do **not** pin each other (`@skygraph/react` does not depend
  on `@skygraph/vue`). They share `@skygraph/core` (peer) and
  `@skygraph/styles` (regular dep) only.

## Migration check-list (when adding a new adapter)

1. New workspace package `packages/<framework>/` with its own
   `package.json`, `tsconfig.json`, build (Vite library mode + dts).
2. `peerDependencies`: `@skygraph/core` + the framework runtime.
   `dependencies`: `@skygraph/styles`.
3. Implement the API surface listed in the table above. Re-use core
   engines verbatim; do not re-implement form / table / tree logic in
   the adapter.
4. Run the `styling-contract.test.*` parity suite (port from React) —
   it asserts that every component renders the same `.sg-*` classes
   and the same DOM shape.
5. New demo package `examples/demo-<framework>/` driving the same
   showcases against the adapter. Pull fixtures and parsers from
   `@skygraph-examples/shared`.
6. Cross-link from the central docs site (component pages, recipes).
7. Bump every package to the same minor version, release.

## Non-goals

- **Single super-bundle** that ships React + Vue + Angular together. No
  user wants three frameworks in one app.
- **Automatic adapter generation** from a DSL. Each adapter is hand-
  written idiomatically; mechanical translation produces unidiomatic
  APIs in every target.
- **CSS-in-JS layer.** Tokens and class names stay CSS — that is what
  lets the styles package ship one file regardless of framework.
