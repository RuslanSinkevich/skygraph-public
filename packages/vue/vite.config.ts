import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [
    vue(),
    dts({
      rollupTypes: true,
      // `bundledPackages` tells api-extractor to inline core's types into the
      // rolled `dist/index.d.ts` instead of leaving external `import` lines.
      bundledPackages: ['@skygraph/core'],
      tsconfigPath: path.resolve(__dirname, 'tsconfig.json'),
      // Strip workspace `paths` while generating .d.ts so the dts plugin
      // resolves `@skygraph/core` through node_modules (its built
      // `dist/index.d.ts`). Without this override the alias resolves
      // `@skygraph/core` to `../core/src/index.ts` and api-extractor emits
      // relative imports like `from '../../core/src/index.ts'` into the rolled
      // output instead of inlining core's types via `bundledPackages`.
      compilerOptions: {
        paths: {},
      },
      include: ['src/**/*.ts', 'src/**/*.vue'],
      exclude: ['src/__tests__/**'],
    }),
  ],
  resolve: {
    alias: {
      '@skygraph/core': path.resolve(__dirname, '../core/src/index.ts'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    emptyOutDir: true,
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
    },
    rollupOptions: {
      external: ['vue', '@skygraph/core', '@skygraph/styles'],
      output: {
        globals: {
          vue: 'Vue',
        },
      },
    },
  },
})
