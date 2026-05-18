// Side-effect import: pulls the shared CSS into the consumer's bundle so
// `npm install skygraph-react` is the only step required to render styled
// components. The explicit `.css` suffix matters — without it, Vite's
// dev-mode esbuild pre-bundle drops the side-effect import as "unused",
// which leaves consumers staring at unstyled HTML on `npm run dev`.
// Re-exports below mirror the entire public API of `@skygraph/react`,
// so existing imports from `@skygraph/react` keep working unchanged.
import '@skygraph/styles/index.css'

export * from '@skygraph/react'
