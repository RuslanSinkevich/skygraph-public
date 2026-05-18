# Contributing to SkyGraph

Thanks for your interest in contributing!

## Getting Started

```bash
# Clone the repo
git clone https://github.com/RuslanSinkevich/skygraph-public.git
cd skygraph-public

# Install dependencies (requires pnpm)
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Run linter
pnpm lint
```

## Project Structure

```
skygraph/
├── packages/
│   ├── core/          # @skygraph/core — reactive runtime + engines
│   ├── react/         # @skygraph/react — hooks, components
│   ├── vue/           # @skygraph/vue — composables, components
│   ├── angular/       # @skygraph/angular — standalone components (planned)
│   └── styles/        # @skygraph/styles — framework-agnostic CSS
├── examples/
│   ├── demo/          # React Ant-style live docs (Vite)
│   ├── demo-vue/      # Vue 3 mirror of the React demo (Vite)
│   ├── demo-angular/  # Angular mirror (Analog/Vite)
│   └── showcases/     # Cross-framework mini-apps
├── deploy/            # Caddy + Docker scaffold for the live site
└── docs/              # Documentation
```

## Development Workflow

1. Create a branch from `main`
2. Make your changes
3. Ensure `pnpm lint`, `pnpm build`, and `pnpm test` all pass
4. Submit a pull request

## Git Hooks (husky + lint-staged)

Hooks are wired through [husky](https://github.com/typicode/husky) and
[lint-staged](https://github.com/lint-staged/lint-staged). They're installed
automatically by `pnpm install` (via the `prepare` script), or you can
re-install them manually:

```bash
pnpm prepare:hooks
```

What runs on each commit:

- `pre-commit` — `pnpm lint-staged` (ESLint + Prettier on staged files only)
  followed by `pnpm typecheck` (per-package `tsc --noEmit`).
- `commit-msg` — Conventional Commits header validation
  (`<type>(<scope>): <subject>`).

If a hook misfires and blocks an emergency commit you can bypass it with
`git commit --no-verify`, but please open a PR with the fix afterwards.

## CI Matrix

Every push and PR runs the `CI` workflow (`.github/workflows/ci.yml`) across:

- `ubuntu-latest` × Node 18, 20, 22
- `windows-latest` × Node 22 (catches path-related regressions)

Plus a dedicated `smoke` job that builds both demos and runs Playwright
smoke tests against `vite preview`.

## Conventions

### Code Style

- TypeScript strict mode
- ESLint + Prettier enforced (run `pnpm lint` and `pnpm format`)
- No default exports — use named exports
- CSS classes: `.sg-*` prefix
- CSS variables: `--sg-*` prefix

### Architecture Rules

These are non-negotiable (see `ARCHITECTURE.md`):

- `runtime/` never imports from `engines/`
- `engines/` uses `runtime/` via internal API
- `@skygraph/react` imports `@skygraph/core` via public API only
- `components/ui/` never imports from `runtime/` or `engines/`
- Styling composition via CSS Variables, not nested selectors

### Commit Messages

Use conventional format:

```
feat(core): add computed node garbage collection
fix(react): fix focus trap in Modal
docs: update theming guide
test(core): add TreeEngine unit tests
```

### Tests

- Core: Vitest, located in `packages/core/src/__tests__/`
- React: Vitest + @testing-library/react, in `packages/react/src/__tests__/`
- New features should include tests
- New engines require unit tests before merge

## Pull Request Process

1. Fill out the PR template
2. Ensure CI passes
3. Request review from a maintainer
4. Squash and merge

## Reporting Issues

- Use GitHub Issues
- Include reproduction steps
- Specify browser/Node.js version if relevant
