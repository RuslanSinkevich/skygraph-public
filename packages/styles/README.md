# @skygraph/styles

Framework-agnostic CSS for SkyGraph — design tokens, themes, transitions, print
layer and 60+ component stylesheets. Zero JS, no runtime, just CSS Variables.

This package is the styling foundation shared by **all** SkyGraph adapters
(`@skygraph/react`, future `@skygraph/vue`, `@skygraph/angular`, …). The CSS
selectors target `.sg-*` class names, which are emitted identically by every
adapter — so a single import gives you consistent visuals regardless of the
framework you ship the components in.

## Install

```bash
pnpm add @skygraph/styles
# or: npm install @skygraph/styles
```

If you install one of the meta-packages (`skygraph-react`, `skygraph-vue`)
or an adapter directly (`@skygraph/react`, `@skygraph/vue`,
`@skygraph/angular`), this package is a transitive dependency — you don't
need to install or import it separately.

## Usage

The simplest path is to import the bundle once at the entry of your app:

```ts
import '@skygraph/styles'
```

That ships tokens, reset, themes, transitions, print layer and every component
stylesheet (≈ one CSS file per component).

### Cherry-pick component stylesheets

If you only use a subset of components and want a smaller payload, import per
slice:

```ts
import '@skygraph/styles/tokens'
import '@skygraph/styles/reset'
import '@skygraph/styles/components/button'
import '@skygraph/styles/components/input'
import '@skygraph/styles/components/table'
import '@skygraph/styles/transitions'
import '@skygraph/styles/print'
```

### Themes

Both light and dark semantic tokens live in `tokens.css` — switch by setting a
data attribute on any wrapper element:

```html
<html data-sg-theme="dark"> ... </html>
```

The dedicated `./themes/default` and `./themes/dark` entrypoints are
convenience re-exports of the same `tokens.css` (kept for parity with older
docs and tutorials).

## Subpath exports

| Subpath                          | What it ships                       |
| -------------------------------- | ----------------------------------- |
| `@skygraph/styles`               | full bundle (`index.css`)           |
| `@skygraph/styles/tokens`        | design tokens only                  |
| `@skygraph/styles/reset`         | minimal CSS reset                   |
| `@skygraph/styles/transitions`   | transition keyframes / classes      |
| `@skygraph/styles/print`         | global `@media print` layer         |
| `@skygraph/styles/themes/*`      | theme presets (`default`, `dark`)   |
| `@skygraph/styles/components/*`  | one stylesheet per component        |

## Customisation

Stylesheets only read CSS Variables — override tokens to re-skin globally or
per-component, no `!important` wars:

```css
:root {
  --sg-color-primary: #7c3aed;
  --sg-border-radius: 8px;
}

.dashboard-area {
  /* component-scoped override */
  --sg-table-row-hover-bg: rgba(124, 58, 237, 0.06);
}
```

Full reference of stable tokens, slot classes and `classNames` / `styles` API
contract lives in the root repo:
[`docs/styling-contract.md`](../../docs/styling-contract.md).

## License

MIT — same as the rest of SkyGraph.
