// `@skygraph/styles` is a CSS-only package — every entrypoint is a stylesheet
// and is consumed via side-effect import (`import '@skygraph/styles'` /
// `import '@skygraph/styles/components/button'`). This declaration file exists
// solely so TypeScript with `moduleResolution: bundler` can resolve a typed
// "module" for those side-effect imports.
//
// There is no JS / TS API to type — the package contributes only style rules.

export {}
