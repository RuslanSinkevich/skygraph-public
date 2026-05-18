#!/usr/bin/env node
import { execSync } from 'node:child_process'
import { mkdirSync, cpSync, rmSync, existsSync, copyFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')
const output = join(__dirname, 'output')

function run(cmd, cwd = repoRoot) {
  console.log(`> ${cmd}`)
  execSync(cmd, { stdio: 'inherit', cwd, shell: true })
}

function copyDir(src, dst) {
  if (!existsSync(src)) {
    throw new Error(`Source not found: ${src}`)
  }
  mkdirSync(dst, { recursive: true })
  cpSync(src, dst, { recursive: true })
}

console.log('=== SkyGraph multi-framework build ===')

if (existsSync(output)) {
  rmSync(output, { recursive: true, force: true })
}
mkdirSync(output, { recursive: true })

console.log('\n[1/8] Building workspace packages...')
run('pnpm -r --filter "./packages/*" build')

console.log('\n[2/8] Building landing page...')
copyFileSync(join(repoRoot, 'landing/index.html'), join(output, 'index.html'))

console.log('\n[3/8] Type-checking React demo...')
run('pnpm --filter demo exec tsc -b')

// vite.config.ts in demo uses base: '/skygraph/' (legacy GitHub Pages
// path). For root-domain deploy we override via CLI flag without
// touching the demo source.
console.log('\n[4/8] Building React demo (vite, base=/react/)...')
run('pnpm --filter demo exec vite build --base=/react/')
copyDir(join(repoRoot, 'examples/demo/dist'), join(output, 'react'))

console.log('\n[5/8] Building React showcases (vite, base=/react/showcases/)...')
run('pnpm --filter showcases exec vite build --base=/react/showcases/')
copyDir(join(repoRoot, 'examples/showcases/dist'), join(output, 'react/showcases'))

console.log('\n[6/8] Building Vue demo (vite, base=/vue/)...')
run('pnpm --filter demo-vue exec vite build --base=/vue/')
copyDir(join(repoRoot, 'examples/demo-vue/dist'), join(output, 'vue'))

console.log('\n[7/8] Building Vue showcases (vite, base=/vue/showcases/)...')
run('pnpm --filter showcases-vue exec vite build --base=/vue/showcases/')
copyDir(join(repoRoot, 'examples/showcases-vue/dist'), join(output, 'vue/showcases'))

console.log('\n[8/8] Copying Angular stub...')
copyDir(join(__dirname, 'stubs/angular'), join(output, 'angular'))

console.log('\n=== Build done ===')
console.log(`Output: ${output}`)
