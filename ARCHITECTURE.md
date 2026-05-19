# SkyGraph — Architecture

> Русская версия (полная конституция): [docs/ru/ARCHITECTURE.md](./docs/ru/ARCHITECTURE.md)

This document is the short, user-facing overview. The full design
constitution with every frozen interface lives in the Russian version
above.

---

## 1. Layers

```
@skygraph/core        (pure TS, 0 dependencies)
  runtime/            Store, Subscribe, Transaction, Batch,
                      Computed, Scheduler, Middleware
  engines/            form, table, tree, virtual, graph, calendar
        ↑ public API only
@skygraph/styles      (CSS-only, no JS)
  tokens.css, reset.css, themes/, components/ (~64 sheets)

@skygraph/react       (peer: core + react)         — canonical adapter
@skygraph/vue         (peer: core + vue ^3.4)      — full parity, alpha → 1.0
@skygraph/angular     (planned)                    — same contract

skygraph-react        meta-package: react + core + styles
skygraph-vue          meta-package: vue + core + styles
```

Hard rules:

- `runtime/` never imports from `engines/`.
- `engines/` uses `runtime/` via its internal API.
- Adapters import `@skygraph/core` via **public API only**.
- `components/ui/` never imports from `runtime/` or `engines/`.
- Every adapter emits the same DOM and the same `.sg-*` class names —
  the CSS layer (`@skygraph/styles`) is shared, not forked per adapter.

---

## 2. Public surfaces (stable)

- **Component API** — props, slots, refs of every shipped component.
- **Hooks / composables** — `useForm`, `useField`, `useTable`, `useTree`,
  `useGraph`, `useVirtualScroll`, `useComputed`, `useHistory`,
  `useChartSize`, `useFocusTrap`, `useRovingTabIndex`,
  `useListNavigation`.
- **CSS contract** — tokens, root classes and slot classes (see
  [`docs/styling-contract.md`](./docs/styling-contract.md)).
- **`@skygraph/core` exports** — `createCore`, engine factories
  (`createForm`, `createTable`, `createTree`, `createGraph`,
  `createVirtualScroll`, `createCalendar`), their `*Engine` interfaces,
  and the runtime primitives (`Store`, `batch`, `computed`,
  `transaction`).

Breaking any of these requires a major version bump for the whole
monorepo.

---

## 3. Internal (free to change)

- The exact `div` nesting inside a component (unless the node is a slot
  in the styling contract).
- File layout inside `runtime/`, `engines/`, and adapter `components/`.
- Implementation of the engines (algorithms, internal data structures).
- Helper `data-sg-*` attributes not listed in the styling contract.

---

## 4. Multi-framework adapters

`@skygraph/react` is the canonical adapter. `@skygraph/vue` is at full
surface parity (verified by
`packages/vue/src/__tests__/styling-contract.parity.test.ts`).
`@skygraph/angular` is planned and follows the same contract.

Every adapter:

1. Peer-depends on `@skygraph/core` and the host framework.
2. Depends transitively on `@skygraph/styles`.
3. Mirrors the same API surface under idiomatic framework names
   (hooks for React, composables for Vue, services / directives for
   Angular).
4. Emits identical `.sg-*` class names and identical DOM shape — the
   CSS layer cannot work otherwise.

Details and the per-capability parity table live in
[`docs/multi-framework.md`](./docs/multi-framework.md).

---

## 5. CSS as a contract

The class-name surface is a **stable public contract** between
adapters. A class like `.sg-button-primary` is emitted identically by
every adapter. A token like `--sg-color-primary` is defined once in
`@skygraph/styles/tokens.css` and overridden by users via
`:root { --sg-color-primary: … }`.

Full contract, including slot tables per component:
[`docs/styling-contract.md`](./docs/styling-contract.md).

---

## 6. Versioning

- Monorepo-wide semver. Every release advances `@skygraph/core`,
  `@skygraph/styles`, and every adapter to the same version.
- A breaking change in `@skygraph/core` is breaking in every adapter
  and in `@skygraph/styles` (DOM-contract changes count as breaking).
- A non-breaking CSS-only change (new component stylesheet) bumps
  minor everywhere.
- Adapters do **not** pin each other. They share `@skygraph/core`
  (peer) and `@skygraph/styles` (regular dep) only.

---

## 7. Where to read next

- [`docs/multi-framework.md`](./docs/multi-framework.md) — adapter contract, per-framework parity, CSS exceptions.
- [`docs/styling-contract.md`](./docs/styling-contract.md) — public tokens, slots, versioning policy.
- [`docs/styling-recipes.md`](./docs/styling-recipes.md) — practical recipes for end users.
- [`docs/ru/ARCHITECTURE.md`](./docs/ru/ARCHITECTURE.md) — full Russian constitution (every frozen interface, FormEngine API, Core API).
