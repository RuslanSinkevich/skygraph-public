import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: {
    compilerOptions: {
      noUnusedLocals: false,
      noUnusedParameters: false,
    },
  },
  clean: true,
  sourcemap: true,
  external: [
    'react',
    'react-dom',
    '@skygraph/core',
    '@skygraph/react',
    '@skygraph/styles',
    '@skygraph/styles/index.css',
  ],
})
