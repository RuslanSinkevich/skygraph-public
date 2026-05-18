# SkyGraph — Migration notes

This file tracks breaking and notable changes for downstream consumers
of the published packages. Sections are added on top so the freshest
entry is first.

---

## 2026-05-18 — meta-packages: one install per framework

### What changed

Two new packages let consumers install SkyGraph with a single command:

- `skygraph-react` — re-exports the full public API of `@skygraph/react`
  and pulls in `@skygraph/core` + `@skygraph/styles` as transitive
  dependencies.
- `skygraph-vue` — re-exports the full public API of `@skygraph/vue` and
  pulls in `@skygraph/core` + `@skygraph/styles` as transitive
  dependencies.

Both meta-packages do a side-effect `import '@skygraph/styles'` at the
top of their entry, so consumers no longer need a separate stylesheet
import.

### Migration (optional)

The change is **purely additive**. Existing imports keep working:

```ts
// Still supported, unchanged
import '@skygraph/styles'
import { Form, Field } from '@skygraph/react'
```

If you want the shorter form:

```ts
// New: single install, single import path, styles auto-loaded
import { Form, Field } from 'skygraph-react'
```

Same for Vue (`@skygraph/vue` → `skygraph-vue`).

### Install commands

Before:

```bash
npm install @skygraph/core @skygraph/react @skygraph/styles
```

After:

```bash
npm install skygraph-react
# or for Vue:
npm install skygraph-vue
```

The repository now lives at
[github.com/RuslanSinkevich/skygraph-public](https://github.com/RuslanSinkevich/skygraph-public).

---

## 2026-05-10 — Wave 2 cleanup

### `@skygraph/react` — public exports (`packages/react/src/index.ts`)

**No symbols were removed in this wave.** A full audit of 187 candidate
exports without internal references concluded that all of them belong to
one of the documented public contracts (component `*Props`, hook
`Use*Options` / `Use*Return`, Charts extension helpers, schema-editor
helpers, sub-components for advanced composition). The decision and the
audit are documented at:

- `docs/_streams/decisions/T-React-Cleanup.md`
- `docs/_audit/react-dead-exports.md`

Any future tightening of the public surface needs to be paired with a
regenerated `packages/react/etc/react.api.md` baseline (`pnpm --filter
@skygraph/react run api:update`), which Wave 2 was not allowed to do.

### `@skygraph/styles` — removed dead `.sg-*` rules

The following CSS rules had no DOM consumer in any of the React or Vue
component files, demos, showcases, or tests, and were removed:

- `.sg-modal-body-loading` — was an unused loading-state placeholder in
  `packages/styles/components/modal.css`. **Replacement:** wrap modal body
  with your own spinner component (e.g. `<Spin />` from `@skygraph/react`).
- `.sg-dp-footer-link` (and `:hover`) — leftover footer-link styling in
  `packages/styles/components/datepicker.css`. The DOM that emitted this
  class was removed in an earlier round; the CSS lingered.
  **Replacement:** none — pass your own button into the DatePicker
  `extraFooter` slot if you need a link-styled action.

Reserved-but-unused classes (`.sg-diagram-toolbar`, `.sg-diagram-minimap`,
`.sg-diagram-controls`) are intentionally kept in `print.css` as
documented user-extension hooks for `@media print`.

### `@skygraph/react` — TSDoc only

- 6 unresolved `{@link Foo}` references in TSDoc comments were rewritten
  in plain back-ticks because the referenced symbol is either internal
  (`FormContextValue`), lives in `@skygraph/core` (`createGraph`,
  `GraphNode`, `routeOrthogonal`), refers to a sibling property
  (`length` in `PinInputProps`), or refers to a same-file local interface
  (`NodeAction` in `Diagram/HoverActions.tsx`). No public types changed.
- `packages/react/api-extractor.json` no longer suppresses
  `ae-unresolved-link`; `pnpm --filter @skygraph/react api:check` now
  passes without that masking.
