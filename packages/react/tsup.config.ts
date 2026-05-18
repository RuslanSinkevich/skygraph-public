import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    form: 'src/form.ts',
    table: 'src/table.ts',
    tree: 'src/tree.ts',
    datagrid: 'src/datagrid.ts',
    virtual: 'src/virtual.ts',
    devtools: 'src/devtools.ts',
  },
  format: ['esm', 'cjs'],
  // Relax noUnusedLocals/noUnusedParameters for the bundled .d.ts pass —
  // src/__tests__ and the strict source build still enforce them, but the
  // declaration emit must not fail just because a development-time prop is
  // currently unused.
  dts: {
    compilerOptions: {
      noUnusedLocals: false,
      noUnusedParameters: false,
    },
  },
  clean: true,
  sourcemap: true,
  external: ['react', 'react-dom', '@skygraph/core'],
})
