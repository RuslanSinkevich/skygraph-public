# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Public surface — meta-packages + skygraph-public repo

- **New packages:** `skygraph-react` and `skygraph-vue` ship as
  meta-packages. Each one depends on `@skygraph/core` +
  `@skygraph/styles` + the matching adapter, and does a side-effect
  `import '@skygraph/styles'` at the top of its entry. A single
  `npm install skygraph-react` (or `skygraph-vue`) is now enough to get
  styled components rendering — no extra `@skygraph/core` /
  `@skygraph/styles` install, no separate stylesheet import.
- **Public repository moved** to
  [github.com/RuslanSinkevich/skygraph-public](https://github.com/RuslanSinkevich/skygraph-public).
  `repository.url` / `bugs.url` updated in every package's
  `package.json`, plus all `RuslanSinkevich/skygraph` URLs in README,
  CONTRIBUTING, deploy stubs, landing, demo apps and the
  `examples/_shared` constants are now pointing at `skygraph-public`.
- **Landing page (`landing/index.html`):** the package table was
  removed; quickstart blocks switched to a single `npm install
  skygraph-react` / `skygraph-vue`; the GitHub item is dropped from the
  top navigation and the hero "GitHub" button is replaced with
  "Telegram" (https://t.me/ruslansinkevich); the footer "Packages"
  column and the version badge are gone, leaving three columns
  (Demos / Project / Author); a Telegram link was added to the Author
  card and footer.
- **Demo apps (`examples/demo`, `examples/demo-vue`,
  `examples/showcases`, `examples/showcases-vue`):** quickstart
  snippets and `INSTALL_COMMAND` rewritten to use `skygraph-react` /
  `skygraph-vue` (existing `@skygraph/*` imports inside the demo source
  are kept, the meta-packages are additive — both styles work). The
  header `GitHub` item is removed across all four apps; the nav order
  is now uniform (`components → guide → showcases → [benchmarks] →
  roadmap → about` for `demo` / `demo-vue`, `docs → showcases` for the
  showcases apps).
- **Telegram contact:** `TELEGRAM_URL` constant added to
  `examples/_shared/src/constants/stats.ts`; the author Telegram is
  surfaced on the landing footer + author card.
- **Tone pass:** the landing page, README, and `skyplatform` project
  copy were rewritten to drop contributor-only jargon ("headless core",
  "path-based store", "axe-core", "roving tabindex", "pixel-identical
  adapters"). Architectural details still live in `ARCHITECTURE.md`.

This change is purely additive — `@skygraph/core`, `@skygraph/react`,
`@skygraph/vue` and `@skygraph/styles` continue to ship as before and
existing imports keep working. See `MIGRATION.md` for the optional
migration.

### Stream 4 — Vue audit polish (critical bugfixes + visual parity)

Stream 4 закрыл 19 пунктов аудита Vue-адаптера против React reference.
Все 762 vitest-кейса остаются зелёными, typecheck/build чистые.

#### Critical (broken functionality)

- **`SgTable` virtualization** — `Virtual` / `VirtualDynamic` демо
  показывали только первые ~50 строк, дальше пусто. Корень: `useTable`
  дефолтит `pageSize=50`, `visibleRows` возвращает страницу, а движок
  виртуализации работает только с `flatRows`. Фикс: при `virtual` и
  отсутствующем `pageSize` Table автоматически выставляет
  `pageSize = data.length`, и обе демо явно передают это значение для
  1:1 совпадения с React.
- **`SgCollapse`** — клик по заголовку не разворачивал панель. Корень:
  `v-if="isOpen"` монтировал/демонтировал содержимое, CSS-переменная
  `--sg-collapse-content-max-height` никогда не получала значение.
  Перенесли логику на React-pattern: контент всегда смонтирован, при
  toggle снимаем измерение `scrollHeight` и анимируем через CSS-переменную;
  по `transitionend` для открытой панели сбрасываем lock на `none`.
- **`SgTreeSelect`** — компонент был полностью сломан (несовпадение
  классов, чужой API `value/label`). Переписан под React API
  (`TreeNodeData` с `key/title`, `treeCheckable`, `treeDefaultExpandAll`,
  `showCheckedStrategy`, поиск с автоэкспандом), внутри использует
  `SgTree`. Все 7 demos и `data.ts` обновлены под новый API.
- **`SgDropdown` keyboard navigation** — DOM-инспектор подтвердил, что
  `ArrowDown` / `Enter` работают 1:1 с React.

#### Visual styling

- **`SgCheckbox` / `SgRadio`** — на initial mount Vue нормализовал
  optional boolean props в `false`, из-за чего цепочка
  `props.modelValue ?? props.checked ?? props.defaultChecked` всегда
  возвращала false, и input оставался пустым. Зафиксили `undefined`
  как дефолт через `withDefaults`, а `indeterminate` / `checked`
  свойство теперь синхронизируется напрямую через ref в `onMounted` +
  `watch(flush: 'post')`.
- **`Tooltip` Rich content** — `.sg-tooltip-content` получил
  `display: inline-block`, иначе `<span>` с `white-space: nowrap`
  схлопывал блочного ребёнка до 0px. Vue теперь рендерит rich slot 1:1
  с React.
- **`Progress`** — убран `transition: width` на `.sg-progress-bg`.
  Анимация интерполировала от 0 до целевого процента, в результате на
  первом кадре полоса выглядела пустой и пользователь видел только
  цифры. Width теперь применяется мгновенно (live-updates сохраняют
  тот же эффект, что и React-эталон).
- **`SgMenu`** иконки — `p.item.icon` (VNode) передавался как
  slot-object `{ default: () => p.item.icon }`, что валидно для
  компонентов, но `<span>` (native) трактует третий аргумент `h()` как
  children. Теперь иконки рендерятся корректно.
- **`Gantt` sidebar text** — убран inline `padding: 0 8px`,
  перебивавший токен `--sg-padding-md`; пустой sidebar header
  (React-эталон) без жёстко вшитого «Task».
- **`Tabs`** — стабильная высота nav при смене таба. Убрана
  кратковременная 1px-jitter, активный таб больше не «раздвигает»
  стрипу через `padding-bottom + margin-bottom: -1px`.
- **`SchemaForm` AutoField** — добавлен `sg-autofield-input` CSS class
  + scoped `<style>` (mirror React `inputStyle`). Native `<input>` /
  `<select>` / `<textarea>` теперь получают полную ширину, padding,
  border и состояния error/warning.

#### Functional improvements

- **Charts** — `LineChart` demos `MultiSeries` / `Responsive` /
  `Realtime` / `HoverActions` добавлен `crosshair` prop под паритет с
  React: hover показывает crosshair-tooltip со значениями серий.
- **`ResourceCalendar`** — `range` теперь трактуется как минимум
  viewport; при drag-resize задания за правую границу шкала автоматически
  расширяется по `assignmentMax + step`, бар больше не уходит в
  «пустоту».
- **`Pagination`** — стабильный 7-slot strip (`[1][2][3][4][5][…][N]`
  → `[1][…][c-1][c][c+1][…][N]` → `[1][…][N-4][N-3][N-2][N-1][N]`).
  `sg-pagination-item` зафиксирован на square min/width = height,
  layout больше не прыгает при переходе 1 → 8 → 50. Тот же алгоритм
  применён к React, чтобы держать паритет.

#### Tests / build

- `pnpm --filter @skygraph/vue typecheck` ✓
- `pnpm --filter @skygraph/vue test` ✓ (762/762)
- `pnpm --filter @skygraph/react typecheck` ✓
- `pnpm --filter @skygraph/react test` ✓ (626 passed, 2 skipped)
- `pnpm --filter @skygraph/vue build` ✓
- `pnpm --filter demo-vue build` ✓

### Round 13 — `@skygraph/vue` full port + benchmarks + showcases dedup + deploy

Round 13 закрылся 19 коммитами на master в две фазы. Фаза 1 (7 коммитов
`e504766` … `b20dddc`) дотащила `@skygraph/vue` от round-12 MVP-уровня
до полного API/CSS-паритета с React-адаптером. Фаза 2 (12 коммитов
`9d45ab8` … `907d89d`) — параллельные side-quests: visual polish viz,
showcases dedup, demo benchmarks page, multi-framework deploy scaffold,
demo-vue ant-style shell, audit drift report. Этот sync-коммит
синхронизирует `TODO.md` / `CHANGELOG.md` / `README.md` /
`ARCHITECTURE.md` / `docs/multi-framework.md` под новую реальность.

#### `@skygraph/vue` — full port (Фаза 1)

После round-12 MVP в `@skygraph/vue` лежало 5 composables и 4 components.
Round 13 довёл это до полного паритета с React-адаптером.

- **`e504766` feat(vue/ui)** — 27 ui primitives:
  - Feedback (10): `Modal`, `Drawer`, `Notification` (+ `NotificationContainer` +
    `useNotification` синглтон), `Popconfirm`, `Tooltip`, `Progress`, `Spin`,
    `Result`, `Empty`, `Skeleton`.
  - Navigation (7): `Tabs`, `Menu`, `Breadcrumb`, `Dropdown`, `Pagination`,
    `Steps`, `Segmented`.
  - Display (7): `Badge`, `Tag`, `Avatar`, `Carousel`, `Timeline`,
    `Descriptions`, `Collapse`.
  - Misc (3): `Button` (moved from `components/Button/` into `components/ui/`),
    `Transition` (CSS-class enter/leave контракт идентичен React, **не**
    Vue built-in `<Transition>`), `ConfigProvider` (`provide`/`inject` +
    реактивный `ComputedRef<SgConfig>` через `useConfig()` /
    `useConfigWithDefaults()`).
  - Поддержка: composable `useFocusTrap` для `Modal`/`Drawer`/`Popconfirm`,
    shared types (`SizeType`, `BaseComponentProps`, `SgLocale`).
  - Тесты: 271 vitest case (ui-config / ui-button / ui-feedback /
    ui-navigation / ui-display / ui-a11y / ui-extended). axe-core
    отсутствует в воркспейсе — вместо него structural a11y assertions
    (ARIA roles / атрибуты / focus traps), эквивалент React `a11y-axe.test.tsx`.
  - Подробнее: `docs/_audit/vue-ui-primitives-port.md`.
- **`177e946` feat(vue/forms)** — composables (полный set вокруг form
  engine) + `<SgForm>` + `<SgField>` + `<SgFormList>` + `<SgFormProvider>` +
  `<SgSchemaForm>` (auto-generation из JSON Schema через
  `jsonSchemaAdapter`).
- **`4a4d5b7` feat(vue/forms)** — `<SgSchemaFormEditor>` (palette + canvas
  + inspector + Preview/Schema toggle). `useSchemaEditor()` с bounded
  undo/redo, round-trip адаптеры `jsonSchemaToEditorSchema` /
  `editorSchemaToJsonSchema` — paritet с React-версией.
- **`b1b12b6` feat(vue/forms)** — 19 ui form controls (`Input`,
  `InputNumber`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Switch`,
  `Slider`, `DatePicker`, `TimePicker`, `AutoComplete`, `Rate`, `Upload`,
  `ColorPicker`, `Cascader`, `TreeSelect`, `Mentions`, `Calendar`).
- **`7f3111f` feat(vue/data-display)** — table/tree/list/virtual domain:
  `<SgTable>` (sort/filter/pagination/grouping/row-selection) +
  `<SgDataGrid>` + `<SgTree>` + `<SgList>` + `<SgVirtualList>`.
  Composables `useTable` / `useTree` / `useVirtualScroll` с api-symmetry
  React-хукам.
- **`0507750` feat(vue/visualization)** — visualization domain:
  `<SgLineChart>` / `<SgBarChart>` / `<SgAreaChart>` / `<SgPieChart>` +
  `<SgChartLegend>` / `<SgChartAxes>` (responsive SVG через
  `useChartSize` + `ResizeObserver`), `<SgDiagram>` (visual layer of
  `GraphEngine` с draggable nodes / zoom / pan / orthogonal routing /
  context menu / hover actions / multi-select / lasso),
  `<SgDashboard>` + `<SgDashboardEditor>`, `<SgGantt>`, `<SgEventTimeline>`,
  `<SgResourceCalendar>`. Print utility (`printElement`, `buildPrintHtml`,
  `buildPageRule`, `PrintOptions`, `PrintableProp`).
- **`b20dddc` test(vue)** — `styling-contract.parity.test.ts` (≈725
  строк, 30+ component snapshots) — для каждого ported компонента
  монтирует Vue-версию и React-версию в jsdom, сравнивает class set и
  DOM shape. Документированные exceptions (Input `status`-классы как
  superset, Textarea root tag `<div>` vs React `<span>`, Tooltip
  wrapper `<span>` vs React `<div>`) зафиксированы в
  `docs/multi-framework.md` § "Documented DOM-contract exceptions".

Финальные цифры пакета на закрытии round 13:
- `@skygraph/vue`: 14 composables, 52 ui SFCs (Input разбит на
  Input/InputNumber/InputPassword/InputGroup/SearchInput/PinInput/
  TagInput/InlineEdit вариации одного движка), 14 complex SFCs,
  print utility, jsonSchemaAdapter.
- 659 vitest cases (`pnpm --filter @skygraph/vue test` зелёный).
- ESM bundle ≈300 KB / 65 KB gzip.
- `vue-tsc --noEmit` clean для всей portированной поверхности.

#### Visual polish (Фаза 2)

- **`dfd02d0` style(diagram)** — `packages/styles/components/diagram.css`
  +168 строк, `tokens.css` +149 строк новых семантических токенов
  (selection / drop / connection / node-state). Без изменений API.
- **`54fdd2f` style(charts)** — `packages/styles/components/charts.css`
  +121 строки: tooltip / crosshair / brush refinement, лучше дефолты
  z-index для interactive overlays.
- **`5f03284` style(dashboard)** — `packages/styles/components/dashboard.css`
  +97 строк: editor mode affordances (drop targets / drag handles /
  empty placeholder).
- **`b2a2cfc` style(viz-secondary)** — gantt/timeline/resource-calendar/
  event-timeline polish (axes, milestone markers, conflict overlays).

#### Showcases dedup + modernize (Фаза 2)

- **`47c8ff1` refactor(showcases)** — physical merge: `analytics/` влит
  в `dashboard/` (одна и та же тема операционной аналитики), `project-
  tracker/` влит в `crm/` (deals/timeline/calendar = CRM workflow).
  Было 14 шоукейсов → стало **12**. Удалено: `analytics/AlertsTab.tsx`,
  `analytics/AnalyticsApp.tsx`, `analytics/ChannelsTab.tsx`,
  `analytics/ChartsTab.tsx`, `analytics/OverviewTab.tsx`,
  `analytics/ProductsTab.tsx`, `analytics/data.ts`, и весь
  `project-tracker/` (`BoardTab`, `CalendarTab`, `ProjectsTab`,
  `ProjectTrackerApp`, `TaskForm`, `TasksTab`, `common.ts`, `data.ts`).
  Перевезено: `crm/DeadlinesTab.tsx` (новый), `crm/HierarchyTab.tsx`
  (новый), `dashboard/data.ts` (расширен), `dashboard/DashboardApp.tsx`
  (+547 строк — теперь 4 встроенные KPI-секции с charts/tables/drill-down).
- **`302e241` feat(showcases)** — модернизация уцелевших шоукейсов под
  round-11/12 фичи: `crm` использует `<ResourceCalendar>` для дедлайнов,
  `dashboard` — hover-toolbars и context menu на charts, `workflow-editor`
  — orthogonal routing с препятствиями + multi-select / lasso,
  `helpdesk` — обновлённый conversation timeline, `hr-portal` — leave
  calendar с conflict detection, `admin` — обновлённая audit-вкладка,
  `ecommerce` — inventory-вкладка.
- **`687afde` feat(react-side)** — embed showcases в demo через
  `examples/demo/src/pages/Showcases/ShowcasesPage.tsx`, общий
  `examples/showcases/src/ShowcasesViews.tsx` (split на Hub view +
  Detail view), `showcaseLoaders.ts` / `showcaseMeta.ts` /
  `showcaseRouting.ts`, `hub-fragment.css` для embedded mode. Hash-
  routing работает в обоих режимах: `#/crm` (legacy standalone) и
  `#/showcases/crm` (embedded в demo).
  - Стрингы шоукейсов вынесены в `examples/_shared/src/showcasesLocale.ts`
    (en/ru); `SHOWCASE_COUNT` в `examples/_shared/src/constants/stats.ts`
    bumped 14 → 12.

#### Demo benchmarks page (Фаза 2)

- **`b7fc719` feat(demo)** — новая страница `/#/benchmarks` (1713 строк).
  - `FormBenchmark` — SkyGraph `<Form>` + `<Field>` vs `react-hook-form` +
    plain `<input>`, 100 полей × 6 запусков (1 warmup + 5 measured),
    три метрики: median mount (ms), per-change (ms), submit bytes
    (`new Blob([JSON.stringify(values)]).size`).
  - `TableBenchmark` — SkyGraph `<Table>` vs AntD `<Table>`, sort/filter
    workload.
  - `LineChartBenchmark` — SkyGraph `<LineChart>` vs Recharts, mount +
    re-render.
  - Helper `benchUtils.ts` (172 строки) — runner с warmup/iterations/
    sleepMs/AbortSignal, медиана/min/max + extras.
  - Live-preview под бенчмарком (один из вариантов рендерится в
    скроллируемом фрейме рядом с результатами).
  - `examples/demo/package.json` тянет `react-hook-form`, `antd`,
    `recharts` как devDependencies, чтобы фреймворки сравнения были
    локальные.

#### Multi-framework deploy scaffold (Фаза 2)

- **`11e2c2e` chore** — `deploy/{Caddyfile,Dockerfile,build-all.mjs,
  README.md,stubs/}`. Layout:
  - `/` — React demo (main).
  - `/vue/` — Vue demo (Coming-Soon stub пока demo-vue не подцеплен в
    общий билд; шаблон уже в `build-all.mjs` закомментирован).
  - `/angular/` — Angular demo (placeholder).
  - `node deploy/build-all.mjs` локально: builds packages → tsc -b demo →
    `vite build --base=/` (overrides legacy `/skygraph/` base без
    редактирования source) → копирует `examples/demo/dist` в
    `deploy/output/` → копирует stubs.
  - `Dockerfile` тащит multi-stage build (Node 22 builder + Caddy 2
    runtime), Caddy auto-issues Let's Encrypt cert на первом
    запросе по доменному имени.
  - Корневой `.dockerignore` тримит docker context.
  - `deploy/output/` gitignored.
- **Demo SEO** (`11e2c2e`) — `examples/demo/index.html` получил title /
  description / Open Graph / Twitter card meta-tags.
- **`FrameworkSwitcher`** (`11e2c2e`) — компонент в хедере demo (`React`
  / `Vue` / `Angular`), текущий tab подсвечен (`active="react"`),
  кликом уводит на соответствующий deploy path. В demo-vue идентичный
  компонент с `active="vue"`.

#### Demo-vue ant-style shell (Фаза 2)

- **`bfc1505` feat(demo-vue)** — ant-style shell + 22 компонент-
  страницы (стало 23 с Landing): `App.vue` redesign (sidebar +
  header + main + footer), компоненты `ComponentDoc.vue`, `DemoBox.vue`,
  `Header.vue`, `LanguageToggle.vue`, `PropsTable.vue`, `Sidebar.vue`,
  `ThemeToggle.vue`, hash-router (`router/hashRouter.ts`,
  `router/index.ts`), i18n (`I18nProvider.ts`, `dict-en.ts`,
  `dict-ru.ts`, `useDemoStrings.ts`), nav (`nav.ts`).
  - Pages: `Landing`, `AvatarPage`, `BadgePage`, `ButtonPage`,
    `CheckboxPage`, `DatePickerPage`, `DrawerPage`, `InputNumberPage`,
    `InputPage`, `MenuPage`, `ModalPage`, `PaginationPage`,
    `ProgressPage`, `RadioPage`, `SelectPage`, `SkeletonPage`,
    `SliderPage`, `SpinPage`, `SwitchPage`, `TabsPage`, `TagPage`,
    `TextareaPage`, `TooltipPage`. URL-схема одинаковая с React-demo
    (`/components/<slug>`) — cross-linking из FrameworkSwitcher работает.
  - `style.css` +650 строк — общий ant-style layout (sidebar 240px,
    header 56px, page content max-width 960px, dark theme через
    `data-sg-theme="dark"`).
- **`907d89d` feat(demo)** — `LanguageSwitcher` перенесён из Footer в
  Header (рядом с FrameworkSwitcher / ThemeSwitcher), Footer остаётся
  чистым со ссылками. Всего 25 строк изменений (Header.tsx,
  LanguageSwitcher.tsx, App.tsx).

#### Architecture drift audit (Фаза 2)

- **`9d45ab8` audit** — `_audit/architecture-drift-2026-05-09.md`
  (новый file, 127 строк). Read-only обход `packages/core/` и
  `packages/styles/` против инвариантов из ARCHITECTURE.md /
  `docs/multi-framework.md` / `docs/styling-contract.md`. Никаких
  правок в коде не сделано.
  - core: PASS (с оговорками) — 6 findings (2 warn / 4 note).
  - styles: PASS — 3 findings (3 note).
  - Все 388 unit-тестов `@skygraph/core` проходят.
  - Документационный дрейф (validation-engine ghost в ARCHITECTURE.md,
    calendar/graph не упомянуты в namespaces/file-structure) починен в
    sync-коммите этого round 13 (`ARCHITECTURE.md` §1 диаграмма + §1
    namespaces table + §8 file structure обновлены).
  - `engines/virtual/` структурная неединообразность (нет `types.ts` /
    отдельного `VirtualEngine.ts`) и DOM-aware defaults в
    `runtime/Scheduler.ts` (`requestAnimationFrame`) /
    `middleware/persistence.ts` (`localStorage`) — оставлены как
    есть, не блокеры.
  - Magic `#fff` в `colorpicker.css:139,173` — note, не блокер.
  - 20 dead-CSS-классов кандидатов и 108 DOM-only классов без CSS —
    note, не блокер, разбираются батчами.

#### Tests / Build / Gates на закрытии round 13

- `pnpm -r test`: **388 + 1 skipped** (core, bench-gated) + **625**
  (react) + **659** (vue) = **1672 active**.
- `pnpm -r build`: все четыре пакета (`core`, `react`, `vue`,
  `styles`) + demo + demo-vue + showcases собираются.
- `pnpm exec eslint packages/`: 0 errors / 0 warnings.
- `pnpm lint:examples`: 0 errors / 27 warnings (baseline).
- `pnpm check:styles`: OK (91 tokens, 70 файлов; 71 файл без
  unjustified `!important`).
- `pnpm exec tsc --noEmit`: clean в `core` / `react` / `styles`.
- `pnpm --filter @skygraph/vue exec vue-tsc --noEmit`: clean для
  portированной поверхности (pre-existing type-debt в
  `Form/Checkbox/list/virtual-list/table` тестах остаётся вне scope
  round 13 — мигрируется отдельным стримом).

#### Размеры на закрытии round 13

- `@skygraph/core` ESM main: ≈32 KB.
- `@skygraph/react` ESM main: ≈440 KB (без tree-shake).
- `@skygraph/vue` ESM main: ≈300 KB / ≈65 KB gzip.
- `@skygraph/styles` raw: ≈234 KB (`*.css` суммарно), gzipped
  в showcases-bundle ≈25 KB.

#### API break / migration

Round 13 — **без breaking changes** для существующих React-пользователей.
Vue-адаптер по-прежнему alpha (path к `1.0`), публичные API могут
меняться; CSS-контракт стабилен.

### Round 12 — `@skygraph/styles` extraction + Vue MVP + Foundation finalisation

Round 12 закрылся тремя коммитами на master: `13a695e` (CSS extraction),
`c3489b4` (Vue MVP-адаптер), `e9888e1` (Foundation finalisation).
Описание ниже сводное — сначала суть extraction'а, затем что добавлено
в Vue-стрим, затем какие хвосты закрыл финальный коммит.

#### Что переехало

- `packages/react/styles/` → `packages/styles/` через `git mv` (вся
  history сохранилась). Содержимое CSS не редактировалось — ни классы,
  ни токены, ни ABI стилей не поменялись.
- 5 root-файлов (`index.css`, `tokens.css`, `reset.css`,
  `transitions.css`, `print.css`), `themes/` (`default.css` / `dark.css`)
  и `components/` (63 файла) живут теперь в новом пакете.

#### Новый пакет

- `name: @skygraph/styles`, `version: 0.1.0`, `license: MIT`,
  `sideEffects: ["*.css"]`.
- `exports` map покрывает: `.` (full bundle), `./tokens`, `./reset`,
  `./transitions`, `./print`, `./themes/*`, `./components/*` — каждый с
  `types` (указывает на `index.d.ts` — пустой module-shim для
  `moduleResolution: bundler`) и `default` (CSS-файл).
- `tsconfig.json` минимальный (только `noEmit: true`, `lib: ES2020 + DOM`,
  `include: []`) — пакет CSS-only, типов нет.
- `README.md` коротко: что внутри, варианты импорта (full / cherry-pick),
  тема через `data-sg-theme`.

#### `@skygraph/react`

- В `package.json` добавлено `dependencies["@skygraph/styles"]:
  "workspace:*"` — установка `@skygraph/react` притаскивает CSS
  транзитивно. Решение: `dependencies`, не `peerDependencies` — юзер
  ставит один пакет, не возится с manual install. (Плюсы: меньше
  пользовательской боли. Минусы: чуть больше strict peer-dep шуму у
  адепта монорепо, но это исключение.)
- В extraction-коммите `13a695e` `exports."./styles*"` оставались как
  shim `@import '@skygraph/styles/...'` — для сохранения rename-
  detection при `git mv` и плавной миграции апп. В finalisation-
  коммите `e9888e1` shim удалён целиком: папка
  `packages/react/styles/` снесена, `exports."./styles"` и
  `"styles"` из `files` убраны. Единственный публичный путь CSS
  теперь `@skygraph/styles` / `@skygraph/styles/<subpath>`.
- Subpath-пути под `@skygraph/react/styles/<...>` (любые) больше не
  работают. Миграция строго механическая (см. секцию **API break**
  ниже).
- В finalisation-коммите `e9888e1` `tsconfig.base.json` `target` и
  `lib` подняты до `ES2022` + `DOM` + `DOM.Iterable` (раньше каждый
  пакет переопределял свой lib индивидуально, теперь всё унифицировано
  через base). `Array.prototype.at` в тестах `diagram.test.tsx` /
  `resource-calendar.test.tsx` перестал падать на `tsc --noEmit`.

#### Examples

- `examples/demo/src/App.tsx` и `examples/showcases/src/main.tsx`:
  `import '../../../packages/react/styles/index.css'` →
  `import '@skygraph/styles'`.
- `package.json` обоих apps: добавлено
  `"@skygraph/styles": "workspace:*"`.
- `vite.config.ts` обоих apps: `@skygraph/styles` резолвится через
  pnpm-workspace symlink + package.json `exports` (alias не нужен и был
  бы вреден — сломал бы subpath-импорты типа
  `@skygraph/styles/components/button`). Legacy-alias
  `@skygraph/react/styles` тоже удалён в `e9888e1` — путь больше не
  публичный.
- `examples/demo/src/demos/GettingStartedPage.tsx`: рекомендованный в
  доках import path в "Quick Start" блоке обновлён на
  `'@skygraph/styles'`.

#### Скрипты / CI

- `scripts/check-tokens.mjs`, `scripts/check-no-important.mjs`,
  `scripts/audit-styles.mjs` — все три пути `packages/react/styles/...`
  переехали на `packages/styles/...`. Allowlist в `check-no-important`
  тоже обновлён (`packages/styles/transitions.css`,
  `packages/styles/components/{table,charts}.css`,
  `packages/styles/print.css`).
- `docs/_audit/styling-audit.md` regenerated (только пути сменились —
  unknown tokens, dead-code classes и magic colors остались те же).
- `.github/workflows/ci.yml` в extraction-коммите не менялся; в
  finalisation-коммите `e9888e1` добавлен step `pnpm typecheck`
  (alias for `pnpm -r exec tsc --noEmit`) после `pnpm lint` и до
  `pnpm check:styles`. Корневой `package.json` получил соответствующий
  script.
- `scripts/audit-styles.mjs` в `e9888e1` пропатчен: `TEMPLATE_PREFIX_RE`
  использует negative-lookbehind вместо привязки к открывающему
  бэктику, поэтому распознаёт template prefix внутри multi-class
  literal (`\`sg-foo-container sg-foo-${placement}\``). «Возможно
  мёртвый код» снизился `57 → 20`. Ни одного класса не удалено —
  это чистый false-positive fix.

#### Тесты / Build

- `packages/react/src/__tests__/print.test.tsx`: `path.resolve(__dirname,
  '../../styles/print.css')` → `'../../../styles/print.css'` (поднялись
  на уровень выше из `packages/react/` → `packages/styles/print.css`).
- `pnpm -r test`: **388 + 1 skipped** (core) + **625** (react) =
  **1013 active** — без изменений.
- `pnpm -r build`: core + react + demo (`tsc -b && vite build`) +
  showcases (`vite build`) собираются.
- `pnpm exec eslint packages/`: 0 errors / 0 warnings.
- `pnpm lint:examples`: 0 errors / 27 warnings (baseline).
- `pnpm check:styles`: OK (91 tokens, 69 files / 70 files).
- `pnpm exec tsc --noEmit`: чисто в `core`, `react` (после ES2022 bump)
  и `styles`.

#### Размеры

- `@skygraph/core` ESM main: ≈32 KB, без изменений.
- `@skygraph/react` ESM main: 440.25 KB (было 280 KB в README — стало
  актуальное значение из tsup-вывода).
- `@skygraph/styles` raw: ≈234 KB (`*.css` суммарно), gzipped в
  showcases-bundle ≈25 KB. `index.css` сам по себе мал — он только
  `@import`-цепочка; реальные килобайты идут из `components/*`.

#### `@skygraph/vue` MVP (`c3489b4`)

- Новый workspace-пакет `packages/vue/` — Vue 3 адаптер,
  `peer: @skygraph/core + vue^3.4`, `dep: @skygraph/styles`.
- 5 composables (`useForm`, `useField`, `useTable`, `useTree`,
  `useGraph`) поверх `@skygraph/core`, API симметрично React-хукам.
- 4 SFC-компонента (`SgButton`, `SgInput`, `SgForm`, `SgField`),
  выдают идентичные `.sg-*` классы — общий CSS-контракт через
  `@skygraph/styles`.
- `examples/demo-vue/` — минимальный showcase (forms + buttons).
- Vite library build, `vue-tsc --noEmit`, 48 vitest тестов.

#### Foundation finalisation (`e9888e1`)

- `docs/multi-framework.md` — публичная стратегия React → Vue →
  Angular: контракт адаптеров (peer:core, dep:styles, symmetric
  API surface, identical `.sg-*` classes + DOM), demo strategy,
  shared-content через `examples/_shared/`, CSS contract как hard
  public API, monorepo-wide semver, чек-лист для нового адаптера.
- `ARCHITECTURE.md` §7 (cross-framework) и §8 (структура) обновлены:
  `@skygraph/styles` указан как 100%-shared между фреймворками,
  ссылка на `multi-framework.md` объявлена обязательным prerequisite.
- `docs/README.md` — новая ссылка в навигации.
- `packages/styles/components/context-menu.css` — новый файл,
  закрывает Round-11 hole: `.sg-context-menu*` и
  `.sg-datagrid-context-menu*` лежали в TSX без CSS, визуал держался
  на inline `style={...}` с hard-coded hex и неверными именами
  CSS-vars (`--sg-bg-elevated`, `--sg-border` — таких токенов нет в
  `tokens.css`). Через `:is()`-группировку покрывает обе namespace'ы,
  читает только реальные токены.
- `Table/ContextMenu.tsx` и `DataGrid/DataGrid.tsx` — inline-стили
  вырезаны (кроме координат `top`/`left` — runtime). Добавлены
  классы-модификаторы `--{danger,disabled}` вместо style props.
- Audit: 13 классов переехали из «только в DOM» в «совпадают»;
  «возможно мёртвый код» 57 → 20 (cm. секцию **Скрипты / CI** выше).

#### API break / migration

- `import '@skygraph/react/styles'` (и любые subpath под этим
  префиксом) **больше не работают**. Миграция строго механическая:
  `@skygraph/react/styles` → `@skygraph/styles`,
  `@skygraph/react/styles/tokens.css` → `@skygraph/styles/tokens`,
  `@skygraph/react/styles/components/button.css` →
  `@skygraph/styles/components/button` и т.д. Контент идентичный —
  тот же CSS, просто из соседнего пакета.
- `@skygraph/styles` объявлен в `dependencies` `@skygraph/react`,
  поэтому `pnpm add @skygraph/react` тащит его транзитивно;
  отдельная установка не нужна (но возможна, если хочется
  cherry-pick subpaths без React-адаптера).
- Имена `.sg-*` классов и `--sg-*` токенов не менялись.
- DOM-разметка React-компонентов не менялась.
- Vue-адаптер (`@skygraph/vue`) идёт MVP — публичные API могут
  меняться до `1.0`. CSS-контракт стабилен.

### Round 11 — UX полишинг + demo expansion + 3 новых фичи + i18n batch

После round 9.1 (`c89c6ea`) на master приехали 15 коммитов двумя волнами:
сначала три больших отложенных пункта из `TODO.md` (Print/PDF, Resource
Calendar, SchemaForm визуальный редактор) + Tree fix + i18n-batch на
page-level `ComponentDoc`, затем пять параллельных табов (A/B/C/D/F) с
UX-полишингом Charts / Diagram / Dashboard и demo-expansion для Charts /
Table.

#### Charts UX (`6bad1f9`, `cee9b9a`) — таб A

- **`useChartSize`** (`packages/react/src/components/complex/Charts/useChartSize.ts`)
  — измеряет контейнер через `ResizeObserver`. `viewBox` строится из
  реальных пикселей вместо хардкоженных `600 × height`,
  `preserveAspectRatio` убран, чтобы линии / бары не растягивались.
  `vector-effect="non-scaling-stroke"` на `line` / `path` / baseline —
  стабильная толщина при печати и зуме.
- **`ChartHoverToolbar`** (`ChartHoverToolbar.tsx`) — floating-панель в
  правом верхнем углу с действиями `print` / `downloadSvg` /
  `downloadPng` / `resetBrush` и custom `actions: ChartAction[]`. Иконки
  inline-SVG 16×16 (без runtime-deps типа lucide-react). `pointer-events`
  на overlay — `none`, на кнопках — `auto`, чтобы не блокировать pointerdown
  на брашинге / hover-line.
- **`chartExport`** (`chartExport.ts`) — `downloadSvg` +
  `downloadSvgAsPng` (XMLSerializer + Image + `canvas.toBlob`, без
  внешних зависимостей), хелперы `serializeSvg` / `measureSvg` /
  `triggerDownload`.
- **`chartContextMenu`** (`chartContextMenu.ts`) —
  `onSeriesContextMenu(series, point, ev)` (вешается на line / marker /
  bar / area-path / pie-slice) + `onChartContextMenu(plot, ev)` (плот в
  целом). Если коллбэки не заданы — `preventDefault` не вызывается,
  нативное меню работает.
- **Public API** — `actions` / `fileName` / `onSeriesContextMenu` /
  `onChartContextMenu` добавлены в `BaseChartProps`; `PieChart` получил
  аналогичные props индивидуально (вне Base, потому что у него нет
  series-axis).
- **`charts.css`** — `.sg-chart-toolbar*`, `.sg-chart-wrapper`, локальные
  `--sg-chart-toolbar-*` токены через глобальные `--sg-color-*`.
- **+28 тестов** в `charts.test.tsx` (resize, toolbar visibility / print /
  svg / png / resetBrush / custom actions, context menu series / chart /
  stopPropagation, export utils). Итого **91** в файле (было 63).
- `cee9b9a` — fix дублирующих type-импортов в `Charts/types.ts`
  (последствия параллельного редактирования с табом B).

#### Diagram UX (`ef617a6`) — таб B

- **Context menu** — `onNodeContextMenu(node, ev)` /
  `onEdgeContextMenu(edge, ev)` / `onCanvasContextMenu(point, ev)`.
  `preventDefault` подавляется только если зарегистрирован коллбэк, без
  него нативное меню работает.
- **Hover actions** — `nodeActions: DiagramAction[]` /
  `edgeActions: DiagramAction[]` рендерят mini-toolbar при наведении
  (`200ms enter / 150ms grace`). Toolbar в screen-space: не уезжает с
  zoom / pan, всегда читаемый. Иконки inline-SVG.
- **Multi-select** — `selection` / `defaultSelection` /
  `onSelectionChange` / `selectionMode: 'single' | 'multi' | 'lasso'`.
  - `'single'` сохраняет legacy drag поведение.
  - `'multi'`: Ctrl+click toggle, plain click clears.
  - `'lasso'`: rubber-band прямоугольником, выбор по AABB-intersection.
  - Multi-drag выделенных нод коммитится в одной `transaction()` — undo
    откатит все одним шагом.
- **`HoverActions.tsx`** + **`selection.ts`** — новые модули в `Diagram/`.
- **`diagram.css` polish** — тени, transitions, `.sg-diagram-node-selected`
  ring, `[data-sg-dragging="true"]` grab cursor, lasso & hover-toolbar
  токены.
- **+14 тестов** в `diagram.test.tsx` (40 total, было 26).
- **10 новых demos** в `examples/demo/src/demos/diagram/` (Draggable,
  Zoomable, Pannable, SnapToGrid, OrthogonalRouting, UndoRedo,
  ContextMenu, MultiSelect, OBB, LargeGraph) + полная en/ru локализация
  через `diagram-doc/`.

#### Dashboard UX (`6e0c15f`) — таб D

- **Widget hover actions** — `widget.actions?: DashboardAction[]` (или
  глобальные `widgetActions` на `<Dashboard>`). Mini-toolbar в правом
  верхнем углу карточки с timeout-grace, такой же паттерн как в Charts /
  Diagram.
- **Context menu** — `onWidgetContextMenu(widget, ev)` /
  `onDashboardContextMenu(point, ev)`. Совместимо с DashboardEditor
  (drag / resize не блокируется).
- **Visual polish** — тени, transitions, hover-state, новые локальные
  токены `--sg-dashboard-*` в `dashboard.css` (+160 строк).
- **`Dashboard/types.ts`** — публичные `DashboardAction`, `DashboardWidget`
  расширены, ref-тип `DashboardRef` (для будущего `print()` на дашборде).
- **+12 тестов** в `dashboard.test.tsx` (31 total, было 19).
- **6 новых demos** в `examples/demo/src/demos/dashboard/` (Editor,
  WithActions, Mixed, LargeGrid, Realtime, Responsive).

#### Charts demo expansion (`8e7b8ad`) — таб F

- **11 новых demo-файлов** в `examples/demo/src/demos/charts/`:
  `WithAxes`, `WithLegend`, `Animations`, `Crosshair`, `Brush`, `Stacked`,
  `Realtime`, `HoverActions`, `ContextMenu`, `Responsive`, `MultiSeries`.
- **`charts/_data/index.ts`** — общие фикстуры (sales / users / revenue
  series), переиспользуются между демо для консистентности.
- **`ChartsDemo.tsx`** + `charts-doc/{en,ru}.ts` — все pro-фичи теперь
  визуально показаны в demo-app, en/ru локализация добавлена для каждого
  блока.

#### Table demo (`9289acc`)

- **5 новых demo-файлов** в `examples/demo/src/demos/table/`:
  `AdvancedFilters` (operator picker), `Grouping` (groupBy + aggregates
  sum/avg/min/max/count), `VirtualDynamic` (dynamic row height с
  ResizeObserver), `LargeDataset` (10k rows + virtualization), `Realtime`
  (push-обновления через store).
- **`table/_data/generators.ts`** — фабрики данных (orders / users /
  products) с reproducible random seed.
- **`TableDemo.tsx`** + `table-doc/{en,ru}.ts` обновлены, `table/styles.css`
  получил локальные классы для каждой demo (`.demo-table-*`, токенами).

#### Print pipeline (`158da10`) — закрывает TODO 1.3

- **`packages/react/src/utils/print/`** — `printElement(node, opts?)`
  открывает popup, инжектит текущие SkyGraph stylesheets + `node.outerHTML`,
  дёргает `window.print()`. Сохранение в PDF выполняет нативный диалог
  браузера. Без рантайм-зависимостей.
- **`packages/react/styles/print.css`** — общий `@media print` слой:
  скрывает `.sg-no-print`, разворачивает скролл-контейнеры
  (`.sg-table-scroll`, `.sg-diagram`, `.sg-chart-wrapper`), сбрасывает
  `transform` на `.sg-diagram-canvas`, скрывает `.sg-chart-crosshair` /
  `.sg-chart-brush-overlay` / `.sg-diagram-toolbar`, держит строки таблицы
  вместе через `page-break-inside: avoid`.
  `data-sg-page-break` / `data-sg-page-break-before` — атрибутный API.
- **`Table` / `Diagram` / `LineChart` / `BarChart` / `AreaChart` / `PieChart`**
  переписаны на `forwardRef + useImperativeHandle`. Каждый принимает
  `printable?: boolean | { fileName? }` и экспортирует ref-тип
  (`TableRef`, `DiagramRef`, `LineChartRef` и т.д.) с методом
  `print(opts?: PrintOptions)`. Опции `PrintOptions = { fileName?,
  orientation?, pageSize?, customStyles? }`.
- **`scripts/check-no-important.mjs`** — `MEDIA_ALLOWLIST` расширен на
  `@media print`.
- **+17 тестов** в `print.test.tsx`.

#### ResourceCalendar — шестой движок (`f9b7af2`) — закрывает TODO 1.1 хвост

- **`packages/core/src/engines/calendar/`** — новый движок в семействе
  `form / table / tree / virtual / graph / calendar`. State зеркалится в
  core-store под `$calendar.<id>.*`, `CALENDAR_PREFIX = '$calendar.'`
  зарезервирован в `engines/namespaces.ts`. Subpath
  `@skygraph/core/calendar`.
  - `types.ts` — `Resource` / `Assignment` / `Conflict` /
    `AvailabilityRule` / `CalendarScale`. Внутреннее представление в
    epoch-ms — snapshots round-trip-ятся без `Date`.
  - `availability.ts` — `isAvailable(resource, range, rules)` —
    посуточный UTC-sweep, мерджит overlapping HH:MM окна.
  - `conflicts.ts` — `detectConflicts(state, opts)` — три независимых
    прохода (overlap sweep / capacity counter / availability check),
    de-duplicated по `(reason, sorted-ids)`. Capacity — простой bucket
    по слотам (interval-tree избыточен для входа ≤10⁵ assignments).
  - `CalendarEngine.ts` — `addResource` / `updateResource` /
    `removeResource`, `addAssignment` / `updateAssignment` /
    `removeAssignment`, `moveAssignment(deltaMs)`,
    `resizeAssignment(side, deltaMs)` (min-1ms clamp), `setRules` /
    `setScale`, `subscribe()`, `clear()`. Status задействованных
    assignments авто-промоутится в `'conflict'`.
- **`packages/react/src/components/complex/ResourceCalendar/`** —
  тонкий React-адаптер: sidebar ресурсов, header tick row по `scale`,
  lane-grid с slot-разделителями, блоки assignments со status-модификаторами
  (`-tentative` / `-confirmed` / `-conflict`), полосы `availability-off`.
  `draggable` / `resizable` / keyboard nudge стрелками.
  `onAssignmentChange` — на каждом snapped tick, `onConflict` — только
  при реальном изменении `Conflict[]` (stable key dedup). `unstyled`
  сбрасывает `sg-rcal-*`. ARIA `role="region"` / `role="row"` / `role="button"`.
- **`resource-calendar.css`** — глобальные `--sg-color-*`, локальные
  `--sg-rcal-*` на `.sg-rcal`.
- **+35 core / +2 subpath / +18 react тестов**.
- 2 demos: `Basic.demo.tsx` (overlap → conflict overlay) и
  `WithCapacity.demo.tsx` (capacity=2, three concurrent).

#### SchemaFormEditor — визуальный редактор форм (`111dfe8`) — закрывает TODO 1.2

- **`packages/react/src/components/complex/SchemaFormEditor/`** —
  palette + canvas + inspector + Preview/Schema toggle поверх `SchemaForm`.
- **`useSchemaEditor()`** — hook-store на `@skygraph/core` с bounded
  undo/redo (`HISTORY_LIMIT = 100`), `onChange(schema)` callback,
  imperative `addField` / `updateField` / `moveField` / `duplicateField` /
  `setSchema`. Используется внутри редактора и снаружи.
- **Round-trip адаптеры** `jsonSchemaToEditorSchema` /
  `editorSchemaToJsonSchema` + per-type `createFieldFromPaletteType`.
  Публичные типы: `EditorSchema`, `EditorField`, `EditorAction`,
  `EditorState`, `PaletteItem`.
- **Drag-and-drop** — native HTML5, custom MIME
  `application/x-sg-sfe-palette-type` (внешние file-drop не конфликтуют).
- **`schema-form-editor.css`** — `.sg-sfe-*`, локальные `--sg-sfe-*` →
  глобальные токены.
- **+27 тестов** (palette, store + undo/redo, JSON-Schema round-trip,
  click-to-select, inspector → canvas, toolbar, drop-from-palette via
  `DataTransfer`, schema-view, external `setSchema`).
- 2 demos: `Builder.demo.tsx` (пустой canvas) и `Prefilled.demo.tsx`
  (5-field стартовая схема + Reset).

#### Tree virtualization fix (`668c45b`)

- **`Tree/Tree.tsx`** — top/bottom inserts при виртуализации переехали
  с `position: absolute` на `padding-top` / `padding-bottom` родителя.
  Без этого scrollbar показывал диапазон только видимых строк, а не
  полной высоты дерева. Заодно убрана избыточная декларация `width: 100%`.

#### Demo i18n — page-level ComponentDoc batch

После round 9.1 (`ButtonDemo` — первая локализованная ComponentDoc-страница)
паттерн прокатан по основной массе:

- `b655c4a` — form controls × 10: `Input`, `InputNumber`, `Select`,
  `Checkbox`, `Radio`, `Switch`, `Slider`, `DatePicker`, `TimePicker`,
  `AutoComplete`.
- `ceea720` — data display × 10: `Table`, `Tree`, `List`, `Tabs`,
  `Collapse`, `Descriptions`, `Badge`, `Tag`, `Avatar`, `Calendar`.
- `9008db1` — form helpers × 10: `Form`, `FormComponents`, `Cascader`,
  `TreeSelect`, `Transfer`, `Mentions`, `ColorPicker`, `Rate`, `Upload`,
  `Segmented`.
- `0d10478` — `Diagram`, `Gantt`, `EventTimeline`, `StylingShowcasePage`.
- `4b71626` — `Breadcrumb`, `Tabs`, `SchemaFormEditor` (+ навигация
  редактора в demo App).

Каждой странице добавлена пара `<comp>-doc/{en,ru}.ts` + хук
`use<Comp>DocStrings.ts`. На `*Page.tsx` уровне теперь **~46 ComponentDoc-страниц**
локализованы (была 1).

#### Round 11 totals

- **+153 теста**: core 351 → 388 (+37: calendar 35, subpath +2),
  react 509 → 625 (+116: print 17, resource-calendar 18,
  schema-form-editor 27, charts +28 (63→91), diagram +14 (26→40),
  dashboard +12 (19→31)). Skipped — 1 (bench-gated).
- **`pnpm exec eslint packages/`** — 0 errors / 0 warnings.
- **`pnpm lint:examples`** — 0 errors / 27 warnings (без изменений,
  это relaxed `no-console` + `_`-prefixed unused).
- **`pnpm check:styles`** — OK (91 tokens, 69 файлов; 70 файлов без
  unjustified `!important`).
- **`pnpm -r build`** — все пакеты + demo + showcases собираются.

### Round 9.1 — closeout sweep (ESLint type-aware roots, Slider/Rate fixes, doc i18n primer)

After all four round-9 tabs (A/B/C/D) and the i18n batches landed, a small
follow-up sweep was needed:

#### Infra — ESLint type-aware lint roots

- `eslint.config.js`, `examples-eslint.config.js`,
  `examples/demo/eslint.config.js` — switched to `defineConfig` from
  `eslint/config` and pinned `parserOptions.tsconfigRootDir` +
  `project: './tsconfig.json'` (or `./tsconfig.app.json` for the demo
  apps) per package / per app. Without this the parser auto-detected
  the closest `tsconfig.json` and got confused between the repo root
  and `examples/*/`.
- Added `**/vitest.config.ts` and `**/tsup.config.ts` to the root
  `ignores` list — those files live next to `package.json`, not under
  `src/`, so type-aware parsing was failing on them.
- Result: `pnpm exec eslint packages/` is 0 errors, `pnpm lint:examples`
  is 0 errors / 27 warnings (the warnings are the relaxed
  `no-console` and intentionally-unused vars in demo code).

#### UI fixes

- **`Slider`** — `.sg-slider` now declares `box-sizing: border-box`,
  `width: 100%` and `min-inline-size: var(--sg-slider-min-inline-size)`
  (default `calc(8 * var(--sg-font-size))`); the inner
  `.sg-slider-track` also gets `width: 100%`. Without these the rail
  collapsed to its intrinsic width inside flex/grid containers. New
  component-local CSS variable `--sg-slider-min-inline-size`
  documented in `SliderDemo.tsx`. The `slider/TokensOverride.demo.tsx`
  no longer caps the wrapper to 360px so the new responsive width is
  visible by default.
- **`Rate`** — `.sg-rate` now declares
  `--sg-rate-symbol-empty-opacity: 0.42` (component-local). Inactive
  `.sg-rate-star` applies `opacity: var(...)` and
  `.sg-rate-star-full` resets it to `1`. Rationale: when `character`
  is a colour emoji (e.g. ❤️), CSS `color` has no visual effect; the
  opacity signal is the only way to distinguish active from inactive.
  Override to `1` for monochrome glyphs to get the previous flat look.

#### Demo polish

- **`ButtonDemo`** — first ComponentDoc page migrated off English
  hardcode. New `examples/demo/src/demos/button-doc/{en,ru}.ts` declare
  the `ButtonDocStrings` shape, new hook `useButtonDocStrings.ts`
  returns the active-locale dictionary. `buttonProps` and
  `buttonCssVars` are derived via `useMemo` from the hook. Sets the
  pattern for the remaining ComponentDoc pages.
- **Form** — new `form/DistributedComposition.demo.tsx` showing three
  nested components composing one form (root holds `<Form>`, middle
  adds section chrome, leaf only registers `<Field>` nodes — same
  store throughout, no value prop-drilling). Mounted into `FormDemo`
  after `NestedFieldsForm`. New `.demo-distributed-panel*` and
  `.demo-form-grid-2` classes in `form/styles.css` (token-only).

### Tab D round 9 — core subpaths + examples-eslint + slow-tests bench + audit drift CI

Note: Tab D round 9 commit (`a5c72b7`) landed before round 9.1 and
already documented elsewhere in this file. Summary for completeness:

- `@skygraph/core/{table,tree,virtual,graph}` subpaths advertised in
  `tsup.config.ts` + `package.json#exports`. New
  `subpath-exports.test.ts` (9 tests) guards each barrel's factory +
  helpers can be imported and instantiated.
- `examples-eslint.config.js` companion with `react-hooks/exhaustive-deps`
  → warn, `no-console` → warn, `no-unused-vars` → warn-with-`_`-ignore.
  New `pnpm lint:examples` script.
- `table.test.ts > scalability > 100k rows` (~7s on dev hw) gated behind
  `describe.runIf(process.env.RUN_BENCH === '1')`. Default
  `pnpm --filter @skygraph/core test` now runs in ~2s. New
  `pnpm --filter @skygraph/core test:bench` via `cross-env`.
- `pnpm audit:styles` regenerated; magical-color cleanup in `form.css`
  (three `var(--sg-color-error, #ff4d4f)` fallbacks dropped).
- `.github/workflows/ci.yml` — `audit:styles drift check` step (fails
  if `_audit/styling-audit.md` is stale) + opt-in coverage step
  (`continue-on-error: true`, node 22 matrix slot only).

### i18n batches — per-demo `useDemoStrings` migration

Two commits landed during round 9 to start migrating the ~480 demo
`Variant.demo.tsx` files off the English hardcode using the
`useDemoStrings` helper (added in round 8.1):

- `009747f` — first batch, ~37 demos across `autocomplete/`, `badge/`,
  `breadcrumb/`, `button/`, `radio/`, `tag/` plus the legacy
  `TableDemo.tsx` / `TreeSelectDemo.tsx`.
- `e38a678` — second batch covering `dropdown/`, `select/`, `switch/`,
  `segmented/`, `rate/`.
- Round 9.1 ButtonDemo migration (above) extends the same pattern to
  the page-level ComponentDoc strings (props/cssVars descriptions),
  not just the in-demo English copy.

Roughly 60–70 demos out of ~480 are now bilingual. The remaining bulk
is mechanical and can be migrated incrementally without coordination
(each demo is self-contained — copy its `STRINGS` block alongside the
component code).

### Tab B round 9 — TableEngine virtual rows + Charts brushing

#### VirtualEngine — динамическая высота строк

- **`packages/core/src/engines/virtual/measure.ts`** — новый модуль `MeasureCache` с `Map<index, number>` поверх эстимейта. Префикс-сумма offsets пересобирается лениво при первом запросе после инвалидации. API: `setMeasuredHeight`, `clearMeasured`, `reset`, `getItemSize`, `getItemOffset`, `getItemAtOffset`, `getTotalHeight`, `subscribe`. События — `'measure' | 'reset' | 'resize'`.
- **`VirtualEngine`** расширен: `setMeasuredHeight(index, height)`, `clearMeasuredHeight(index)`, `resetMeasurements()`, `hasMeasured(index)`, `getEstimatedSize(index)`, `getItemSize(index)`, `subscribe(listener)`, `measuredCount`. Кэш создаётся лениво — пока никто не записал измерение, сохраняем O(1) арифметику для миллионов строк (тест на 1M items < 5ms по-прежнему проходит).
- **`createMeasureCache`** экспортируется наружу через `@skygraph/core` и `@skygraph/react`.
- **`TableEngine.getEstimatedRowHeight(id)`** + `TableOptions.estimateRowHeight: (row, id) => number` — пробрасывает callback в core, чтобы React-адаптер мог инициализировать движок без дублирования сигнатуры.

#### React — VirtualTableBody с ResizeObserver

- **`<Table virtual={{ rowHeight: 40 | (row, id) => h, estimateRowHeight?: (row, id) => h, overscan?, height? }}>`** — теперь принимает функцию для высоты. Динамика включается, если хоть один из `rowHeight` / `estimateRowHeight` — функция.
- **`VirtualTableBody`** переехал на `createVirtual()` под капотом. Скролл-listener + `ResizeObserver` на родительском `.sg-table-scroll`; на каждой видимой строке — RO на первой ячейке (CSS Grid: высота ячейки == высота строки), которая через `data-sg-virtual-row-index` репортит размер обратно в движок. `subscribe` поднимает re-render. В средах без `ResizeObserver` (jsdom без полифилла) — фоллбэк на одноразовое измерение через `getBoundingClientRect`.
- **`TableBody`** теперь принимает `rowIndexOffset?: number` и пишет `data-sg-virtual-row-index` на row-контейнер. Атрибут отсутствует, если виртуализация не активна.

#### Charts — brushing

- **`<ChartBrush>`** (`packages/react/src/components/complex/Charts/ChartBrush.tsx`) — общий overlay для drag-выбора диапазона по X. Полностью на React pointer events + `setPointerCapture`, без window-listeners. Двойной клик по overlay → reset (`onRangeChange(null)`). API: `plotX/Y/W/H`, `categoryCount`, `range`, `onRangeChange`, `unstyled?`, `fill?`, `disabled?`. Selection-rect — `pointer-events: none`, чтобы не блокировать pointerdown на overlay.
- **`brush?: boolean | ChartBrushConfig`** — добавлен в `LineChart`, `BarChart`, `AreaChart`. Конфиг поддерживает controlled (`range`) и uncontrolled (`defaultRange`) режимы, плюс `onRangeChange`, `fill`, `disabled`. `resolveBrushConfig` нормализует `boolean | object | undefined`.
- **`ChartBrush` + `resolveBrushConfig`** + типы `ChartBrushProps`, `ChartBrushConfig`, `ChartBrushRange` экспортируются из `@skygraph/react`.
- **`packages/react/styles/components/charts.css`** — секция `.sg-chart-brush*` (overlay, selection). Цвета остаются inline через токены, чтобы re-theme работал без правки CSS.

#### Round totals

- **+30 тестов:** core `virtual.test.ts` (+11, dynamic measured heights / measure cache invariants / subscribe events), react `table-virtual.test.tsx` (+10, новый файл — virtual={true} regression, dynamic height callback, controlled vs uncontrolled, ResizeObserver fallback), react `charts.test.tsx` (+9, brush block — drag/release, controlled range, double-click reset, disabled, BarChart/AreaChart parity).
- TypeScript на `packages/core` чисто, ESLint `packages/core packages/react` — 0 errors / 0 warnings, `check:styles` (tokens + no-important) — OK.

> Известный pre-existing TS-error в `packages/react/src/components/complex/Table/useTableState.ts:163` (`expandable?.defaultExpandedRowKeys` — поле отсутствует в `ExpandableConfig`) пришёл из round-8.1 / round-2 и не относится к этому стриму. Закроется чистым 1-line патчем в `ExpandableConfig` в следующем спринте.

### Tab A round 9 — Gantt + EventTimeline (new complex components)

#### Components

- **`Gantt`** (`packages/react/src/components/complex/Gantt/`) — task-as-bar chart over a discrete time axis. Props: `tasks`, `resources?`, `scale?: 'day' | 'week' | 'month' | 'quarter'`, `range?`, `rowHeight?`, `columnWidth?`, `sidebarWidth?`, `draggable?`, `resizable?`, `onTaskChange?`, `unstyled?`. Tasks may declare `progress`, `parentId`, `dependencies`, `resourceId`, `color`. CSS-grid sidebar + scrollable timeline grid. Header ticks generated from `range` × `scale`. Default range is derived from `min(start)` / `max(end)` with one `scale`-step of padding.
- **`EventTimeline`** (`packages/react/src/components/complex/Timeline/`) — chronological event stream. Props: `events`, `orientation?: 'horizontal' | 'vertical'`, `groupBy?: 'day' | 'month' | 'year'`, `renderMarker?`, `renderEvent?`, `unstyled?`. Events sorted by date; optional dividers per UTC bucket. Distinct from the simpler step-based `Timeline` in `components/ui/Timeline.tsx` (which stays as-is, used by 7+ demos and showcases) — this one is for date-anchored items where each entry has a `Date`.

#### Drag / resize

- **`Gantt draggable`** — left-click on a bar moves it horizontally; pixel delta divided by `columnWidth`, rounded to whole `scale` steps, applied to both `start` and `end`. `onTaskChange` fires once per snap step (no callbacks while the pointer stays inside the same cell).
- **`Gantt resizable`** — drag the right edge of a bar to extend `end`; `start` is preserved. End is clamped to `start + step` minimum.

#### Dependencies

- **Dependency arrows** — for every `task.dependencies` entry, an SVG path is routed from the upstream task's right edge to the dependent task's left edge using `routeOrthogonal(...)` from `@skygraph/core`. Arrowheads via SVG `<marker>`, color via `currentColor` on `.sg-gantt-deps`.

#### Resources

- **Resource lanes** — when `resources` is provided, every row in the chart corresponds to one resource and tasks are placed in the row matching their `resourceId`. Without `resources`, every task gets its own row in declaration order.

#### Tests

- **+38 tests** (target was +25): `gantt.test.tsx` (21 cases — render / scale switching / drag-move / resize-end / dependency arrows / resource lane placement) and `timeline.test.tsx` (17 cases — render / orientation / sort / groupBy day-month-year / unstyled / `renderMarker` + `renderEvent` overrides). Total: **523** active tests in `@skygraph/react` (+ pre-existing core tests).

#### Styles

- `packages/react/styles/components/gantt.css` (new) — `.sg-gantt`, `.sg-gantt-sidebar*`, `.sg-gantt-header`, `.sg-gantt-tick`, `.sg-gantt-grid`, `.sg-gantt-row`, `.sg-gantt-bar*`, `.sg-gantt-deps`, `.sg-gantt-dep`. Token-only.
- `packages/react/styles/components/event-timeline.css` (new) — `.sg-event-timeline`, `.sg-event-timeline-vertical/-horizontal`, `.sg-event-timeline-group`, `.sg-event-timeline-item`, `.sg-event-timeline-marker`, `.sg-event-timeline-dot`, `.sg-event-timeline-content`, `.sg-event-timeline-title`, `.sg-event-timeline-description`. Token-only.
- `packages/react/styles/index.css` — two new `@import` lines.

#### Demos

- `examples/demo/src/demos/Gantt/Basic.demo.tsx` — three resource lanes with progress, color and an arrow chain `spec → mocks → core → qa-pass`. Drag + resize both enabled.
- `examples/demo/src/demos/Gantt/Scale.demo.tsx` — runtime scale switcher (`day` / `week` / `month` / `quarter`) over a 9-month plan.
- `examples/demo/src/demos/timeline/Events.demo.tsx` — vertical event stream grouped by month.
- `examples/demo/src/demos/timeline/Horizontal.demo.tsx` — horizontal release timeline with custom card body via `renderEvent`.

#### Public API

- `@skygraph/react` exports: `Gantt`, `GanttProps`, `GanttTask`, `GanttResource`, `GanttScale`, `GanttRange`, `EventTimeline`, `EventTimelineProps`, `TimelineEvent`, `TimelineOrientation`, `TimelineGroupBy`. Existing `Timeline` (step-based) remains exported from `components/ui/Timeline` unchanged.

### Tab C round 9 — a11y axe coverage + deprecated cleanup

#### a11y (closes 2 `it.todo` from round 2)

- **`ColorPicker`** — trigger is now a `<button type="button">` (was a `<div tabIndex=0>` with `aria-haspopup` / `aria-expanded`, which axe flagged as `aria-allowed-attr` critical). New props `aria-label` / `aria-labelledby` are forwarded to the trigger so the control gets a programmatic name (axe `button-name`).
- **`TimePicker`** — accepts `aria-label` / `aria-labelledby`, forwarded to the `role="combobox"` element. Closes axe `aria-input-field-name` (serious) — the styled trigger is not a form element so a wrapping `<label>` cannot associate.
- **`a11y-axe.test.tsx`** — both round-2 `it.todo` placeholders replaced with active assertions: `ColorPicker` (closed) × `aria-label` / `aria-labelledby`, `TimePicker` (closed) × `aria-label` / `aria-labelledby`. Added `Cascader (open)` (panel mounted on click) and `VirtualList` (generic scroll container with custom `renderItem`) cases.
- CSS: `.sg-colorpicker-trigger` now resets `color`, `font` and styles `:disabled`; `.sg-colorpicker-trigger` markup change from `<div>` to `<button>` keeps the same selector / focus-visible behaviour.

#### Deprecated UI removal

- **`packages/react/src/components/ui/TreeSelect.tsx`** deleted. The complex (`@skygraph/core`-backed) `TreeSelect` is the only export from `@skygraph/react`.
- **`packages/react/src/components/ui/Transfer.tsx`** deleted. The complex `Transfer` (pagination, sortable, locale, footer) is the only export.
- **`packages/react/src/index.ts`** — removed `TreeSelectNode` re-export (`@deprecated` since round 6) and the legacy comment blocks.
- **`packages/react/styles/components/treeselect.css`** — removed `~110` lines of dead CSS that backed the flat ui/TreeSelect rows (`.sg-treeselect-tree`, `.sg-treeselect-node*`, `.sg-treeselect-switcher*`, `.sg-treeselect-title`, `.sg-treeselect-checkbox`, `.sg-treeselect-search` wrapper). The complex variant uses the embedded `<Tree>` and reuses `.sg-tree-*` selectors.
- **`__tests__/new-components.test.tsx`** rewritten: 5 `Transfer` + 5 `TreeSelect` cases now use the complex API. Test count preserved (20 cases in the file). API differences captured in inline notes (`targetKeys` is required for `Transfer`; default `placeholder` for `TreeSelect` is `'Please select'`; `onChange(value, labels, extra)`).
- **`examples/demo/src/demos/TreeSelectDemo.tsx`** — props table updated from `TreeSelectNode` to `TreeNodeData`, `value` type from `string | string[]` to `TreeKey | TreeKey[]`, default placeholder `'Select...'` → `'Please select'`. The demo `treeselect/*.demo.tsx` files already used the complex API.
- **`docs/conventions.md`** — new section *ui/ vs complex/* documents the split and the removed shims.

#### Notes

- No SemVer bump implied: both files were marked `@deprecated` since round 6 and the public exports already pointed at the complex implementations. The `TreeSelectNode` type alias is the only removed export; consumers move to `TreeNodeData` from `@skygraph/core` (re-exported by `@skygraph/react`).

### Added — parallel-tabs round 2 (Tab A / B / C / D) + regression sweep

#### Tab A round 2 — Showcases decomposition

- **`forms/FormsApp.tsx` (1131 lines)** split into `BasicTab`, `ValidationTab`, `LayoutsTab`, `DynamicTab`, `SchemaTab` + shared `styles.ts`. Top-level component is a thin tab container.
- **`ecommerce/EcommerceApp.tsx` (1080 lines)** split into `ProductsTab`, `OrdersTab`, `CustomersTab`, `InventoryTab`, `AnalyticsTab`.
- **`table-kitchen-sink/TableKitchenSinkApp.tsx` (814 lines)** split into `BasicTab`, `SortingFilteringTab`, `EditingTab`, `VirtualTab`, `PinnedTab`, `GroupedTab` + `common.tsx`.
- **`crm/CrmApp.tsx` (545 lines)** split into `LeadsTab`, `DealsTab` (joining the existing `ContactsTab`, `ActivityTab`, `PipelineTab`).

#### Tab B round 2 — GraphEngine pro

- **`routeOrthogonal(start, end, options)`** now accepts `options.obstacles?: AABB[]`. A* over a 5px grid avoids obstacle bounds; falls back to the simple L-route when no path is found within `options.maxNodes` (default 5000).
- **OBB (oriented bounding box)** — new module `engines/graph/obb.ts`. `getNodeOBB(id)`, `aabbFromOBB(obb)`, `obbCorners(obb)`, `obbContainsPoint(obb, p)`. Used by `Diagram` for hit-testing rotated nodes and by routing to derive obstacle AABBs.
- **`<Diagram zoomable pannable>`** — Ctrl+wheel zooms (clamped 0.1× — 5×), middle-mouse-button drag pans. The internal `.sg-diagram-canvas` carries the SVG transform so nodes and edges move as one.
- **`<Diagram snapToGrid={N}>`** — drag positions round to the nearest multiple of `N`. CSS hook `.sg-diagram-grid` shows the corresponding grid pattern; the step is exposed via the `--sg-grid-size` component-local CSS variable.
- Refactor: routing helpers moved out of `GraphEngine.ts` into `engines/graph/router.ts`. History helpers extracted into `engines/graph/history.ts`. No public-API changes.

#### Tab C round 2 — TableEngine pro

- **Advanced filters** — new `filter.ts` module. `AdvancedFilter = { op, value }` with operators `eq | neq | lt | lte | gt | gte | between | in | notIn | contains | startsWith | endsWith | isEmpty | isNotEmpty`. `TableEngine.setColumnFilter(key, filter)` accepts both legacy plain values and the new `AdvancedFilter` shape. UI: `<FilterDropdown mode="advanced">` with operator picker.
- **Row grouping + aggregations** — `TableEngine.groupBy(field)`, `getGroups()`. Columns may declare `aggregate: 'sum' | 'avg' | 'min' | 'max' | 'count' | (values, rows) => ReactNode`. New `<TableGroupRow>` component renders the group header with expand / collapse and aggregate cells.

#### Tab D round 2 — Charts pro + a11y

- **Chart animations** — `animate?: boolean | { duration?: number }` on `LineChart`, `BarChart`, `AreaChart`, `PieChart`. Pure-CSS `@keyframes` (no rAF loops). Picks up `--sg-chart-anim-duration` (default 600ms). Honours `prefers-reduced-motion: reduce` (no animation, no transform).
- **Interactive crosshair** — `<LineChart crosshair />` activates `<ChartCrosshair>`: vertical hover line + per-series value labels at the nearest data X. Pointer-events on a transparent overlay rect.
- **`Select` accessible name** — `aria-label?` and `aria-labelledby?` props in `SelectPropsBase` are now forwarded to the `role="combobox"` element. Fixes the styled-Select axe gap; `it.todo` was removed and replaced with an active assertion.
- **`Tree.handleKeyDown`** — `scrollToFocused` and `isNodeEditable` now wrapped in `useCallback`, full deps in the `useCallback` array.
- **`DatePicker.tsx`** — removed unused `eslint-disable` directive.
- **`packages/core` and `packages/react`** — public `index.ts` updated to re-export new types: `OBB`, `RouteOrthogonalOptions`, `AdvancedFilter`, `FilterOperator`, `AggregateFn`, `ColumnAggregate`, `TableGroup`, chart `ChartAnimation`, `ChartCrosshairProps`, `DashboardEditor` (carry-over).

#### Round 8.1 — regression sweep after the round 2 commits

- Local CSS variables `--sg-grid-size` (in `.sg-diagram`) and `--sg-chart-anim-duration` (in `.sg-chart`) declared with defaults so `var()` always resolves. Required by `check:tokens`.
- `MEDIA_ALLOWLIST` in `scripts/check-no-important.mjs` extended for `prefers-reduced-motion` blocks in `charts.css`. Same a11y pattern as `@media print` in `table.css`.
- `useTableState.ts` — `persistColumnWidth` now actually invoked from `handleResizeStart.onUp`. Fixes the `tsc --noEmit` "declared but never read" error introduced by Tab C round 1.
- Lint cleanup: `prefer-const` errors in `diagram.test.tsx`, `react-hooks/exhaustive-deps` warnings in `Table/Table.tsx` (`rowNumConfig` → `useMemo`) and `useFieldArray.ts` (`genKey` in deps). `eslint packages/` is now 0 errors / 0 warnings.

#### Round totals

- **+84 tests** in round 2: TableEngine advanced-filter operators (+24), grouping/aggregates (+10), GraphEngine OBB / routing-with-obstacles (+12), Charts crosshair / animations / axes (+8), Diagram zoom/pan/snap/grid (+8), `a11y-axe` Carousel/Cascader/Mentions/Rate/ColorPicker/TimePicker partial (+8 with 2 todo), plus showcase decomposition test fixes. **779** active (332 core + 447 react) + 2 todo.
- `tsc --noEmit` — clean (was 1 error in `useTableState.ts` after round 1).
- `eslint packages/` — 0 errors, 0 warnings.
- `check:tokens` — 91 tokens, 64 files.
- `check:no-important` — 65 files OK.

### Added — parallel-tabs round 1 (Tab A / B / C / D)

#### Tab A — UI props finalization

- **`Button.danger`** — destructive variant. Combines with `type` (e.g. `danger primary` → solid red, `danger text` → red link). Adds `sg-button-danger` modifier.
- **`Button.block`** — stretches the button to its container width (`sg-button-block`).
- **`Input.readOnly`** — explicit read-only mode with HTML `readonly` + `aria-readonly`. Distinct from `disabled` (focusable, copyable). New `sg-input-readonly` modifier.
- **`Select.multiple`** — multi-select mode. `value: (string | number)[]`, `onChange: (vals: (string | number)[]) => void`, chips inside the trigger, dropdown stays open while picking.

#### Tab B — Charts axes + Dashboard.Editor

- **Charts axes (X / Y)** — opt-in `xAxis` / `yAxis` props on `LineChart`, `BarChart`, `AreaChart`. Configurable: `tickCount`, `tickFormatter`, `label`, `gridLines`. New shared `<ChartAxes>` SVG component renders ticks + labels + gridlines inside the plot area. Off by default (backward-compat).
- **`<DashboardEditor>`** — editable Dashboard with drag (header) and resize (corner handle) for widgets. `onLayoutChange(widgets)` fires on drop. Snaps to the column / row grid. CSS hooks: `sg-dashboard-editor`, `sg-dashboard-widget-dragging`, `sg-dashboard-widget-resizing`.

#### Tab C — Engine history & persistence

- **`GraphEngine.undo / redo / canUndo / canRedo / pushHistory(label?)`** — full mutation history (add / remove / move / setParent / addEdge / removeEdge). New `transaction(fn)` groups multiple mutations into one history entry. History capped at 100 entries.
- **`TableEngine.setColumnWidth(key, width)` + `getColumnWidth(key)`** — column-width persistence in the Core store under `$table.<id>.state.columnWidths`. React `useTable()` exposes `columnWidths` (reactive `Record`) and `setColumnWidth`. `Table` resize handles automatically read / write this state, so resized widths survive page reloads when the store is persisted.

#### Tab D — Infra + a11y + locale unification

- **Automated a11y smoke tests** — `packages/react/src/__tests__/a11y-axe.test.tsx`. Covers Button, Input, Checkbox, Switch, RadioGroup, Select(unstyled), Modal, Tabs via `axe-core`. Color-contrast / region-only rules disabled in jsdom. 8 passing + 1 `it.todo` for the styled `Select` aria-name gap (tracked in TODO).
- **`@vitest/coverage-v8`** dev-dep installed in `@skygraph/core` and `@skygraph/react`. `pnpm -F @skygraph/core test:coverage` and the react equivalent now run end-to-end.
- **`@axe-core/react` + `axe-core`** dev-deps in `@skygraph/react`.
- **`pnpm-workspace.yaml`** extended with `examples/*`. `examples/demo` and `examples/showcases` now use `@skygraph/core: workspace:*` and `@skygraph/react: workspace:*` (was `file:../../packages/...`).
- **Lockfile cleanup** — deleted `examples/demo/package-lock.json` and `examples/showcases/package-lock.json`. Only `pnpm-lock.yaml` remains.
- **`TableLocale` unified** — single canonical declaration in `packages/react/src/types/locale.ts`. The `complex/Table/types.ts` declaration is now a re-export of the same type. Both import paths still work; previous duplicate-with-different-keys split is gone.

#### Round totals (round 1)

- **+78 tests** across all four tabs in round 1: Tab A `ui-extended.test.tsx` (+30), Tab B `charts.test.tsx` axes (+10) and `dashboard.test.tsx` editor (+10), Tab C `graph.test.ts` undo/redo (+10) and `table.test.ts` widths (+5), Tab D `a11y-axe.test.tsx` (+8 + 1 todo) plus smaller additions in `diagram.test.tsx`. Total at end of round 1: **695** active (288 core + 407 react) + 1 todo.

### Added — earlier this cycle (pre-tabs)

- **Dashboard component** — minimal CSS-grid widget layout. `<Dashboard widgets={...} columns={12} rowHeight={80} gap={16}>`. Each widget pins to `(x, y, w, h)` cells; supports `title`, `children`/`render`, `unstyled`. (Tab B added the editable counterpart, see above.) +9 tests, demo with Charts integration.
- **Diagram draggable nodes** — `<Diagram draggable />` enables click-and-drag to move nodes (calls `graph.moveNode`). Pass a function for custom drag handlers. CSS hooks: `sg-diagram-node-draggable`, `:hover` raises shadow, `:active` switches cursor to grabbing.
- **Charts native tooltips** — `<title>` elements on Line markers, Bar rects, Pie slices. Tooltip text: `"<series> · <category>: <value>"` (Pie: `"<label>: <value>"`).
- **`useTable` pinning hook** — exposes `pinColumn(column, side)`, `clearPinned()`, and `pinnedColumns: { left, right }` state from `useTable()`. Reactive bridge over the `TableEngine.pinColumn` API.
- **GraphEngine orthogonal routing** — new `routeOrthogonal(start, end)` and `pointsToPath(points)` helpers exported from `@skygraph/core`. `<Diagram>` now renders edges differently based on `edge.routing` (`'straight' | 'orthogonal' | 'manual'`); manual mode uses the edge's `waypoints`.
- **TableEngine column pinning** — `pinColumn(column, side)`, `getPinnedColumns()`, `clearPinned()`. State mirrored into the Core store under `$table.<id>.state.pinnedLeft|pinnedRight`.
- **Diagram component** + **useGraph** hook in `@skygraph/react` — visual layer for `GraphEngine` (DOM nodes + SVG-overlay edges, custom renderNode, outline-kind modifier classes).
- **GraphEngine.subscribe(cb)** — public engine-level subscription used by the React adapter to avoid path-prefix lookups.
- **AreaChart** — stacked / non-stacked SVG area chart with strokeWidth + fillOpacity props.
- **PieChart** — pie / donut chart (innerRadius), clockwise from 12 o'clock, `<title>` for accessibility, palette color resolution.
- **ChartLegend** — shared component, opt-in via `legend` prop on Line/Bar/Area charts.
- **+65 tests** in this round: GraphEngine edge cases (+15), Diagram + useGraph integration (+11), Charts incl. Area/Pie/legend (+26), a11y hooks (+13). Total now **584** (254 + 330).
- Localized in demo (en/ru): App shell, system components (PropsTable, CssVarsTable, DemoBox, ComponentDoc), and 4 *Page.tsx (GettingStarted, Theming, CoreApi, **DesignTokens**).
- `docs/conventions.md` updated: modern demo pattern (DemoBox + raw imports), i18n schema, stream artifacts, commit prefixes.

### Changed

- `audit-styles.mjs` — detects template-literal classes (`` `sg-X-${var}` ``) and excludes them from the dead-code count. Result: 201 → **53** possibly-dead classes (3.8x more accurate).
- `useGraph` snapshot caching via `useRef` + `graph.subscribe()` — fixes infinite-loop with `useSyncExternalStore`.
- `charts.css` — replaced unknown `var(--sg-font-family, inherit)` with plain `inherit`.

### Changed

- `useGraph` now caches snapshot via `useRef` and subscribes through the new `graph.subscribe()` API — fixes infinite-loop issue with `useSyncExternalStore`.
- `charts.css` — replaced unknown `var(--sg-font-family, inherit)` with plain `inherit` (token wasn't declared in `tokens.css`, broke `check:tokens`).

## [0.4.0] - 2026-05-01

### Added — GraphEngine (diagram domain engine)

- `@skygraph/core` — **GraphEngine** as the fourth member of the `form / table / tree / graph` family. Models a directed graph with parent-child hierarchy, outline-based geometry (rect / ellipse / polygon / flattened path), stable anchor IDs, and AABB bounds. Operations: `addNode`, `removeNode`, `updateNode`, `moveNode`, `setParent`, `addEdge`, `removeEdge`. State mirror under `$graph.snapshot.<engineId>`.
- `@skygraph/core` — `GRAPH_PREFIX = '$graph.'` reserved in `engines/namespaces.ts`.
- `@skygraph/react` — `useGraph()` hook + `<Diagram>` component (DOM nodes + SVG-overlay edges) for visualising a `GraphEngine`.
- `@skygraph/react/styles/components/diagram.css` — default styling for `Diagram` (token-only, dark-theme aware).
- 22 new unit tests for `GraphEngine` (now **497 → 519** total tests across both packages).

### Changed — public API consolidations

- `TreeSelect` main export now points to `components/complex/TreeSelect` (uses `@skygraph/core` types `TreeNodeData` / `TreeKey` / `TreeFieldNames`). The legacy `components/ui/TreeSelect` is still on disk for tests; type alias `TreeSelectNode` is kept as `@deprecated` for migration.
- `Transfer` main export now points to `components/complex/Transfer` (richer surface — pagination, sortable, locale, footer, operations, custom search).
- `Calendar` main export now comes directly from `components/complex/Calendar` (the `components/ui/Calendar.tsx` re-export shim was removed — it violated the "ui has no core" boundary).
- `package.json` — removed legacy npm `workspaces` field (pnpm workspace already declared in `pnpm-workspace.yaml`).
- `package-lock.json` — removed; only `pnpm-lock.yaml` remains. Both `package-lock.json` and `yarn.lock` added to `.gitignore`.

### Fixed

- `SchemaForm.tsx` — `useConfig()` was being called conditionally, violating `react-hooks/rules-of-hooks`. Hoisted to top of the function.
- `SchemaForm.tsx` — submit button used `sg-btn sg-btn-primary` which had no styles (CSS only declares `sg-button-*`). Changed to `sg-button sg-button-primary`.
- `TagInput.tsx` — replaced `let next = [...tags]` with `const` (`prefer-const`).
- Demo: `PropDef` now accepts `required?: boolean` (was missing, caused TS errors in CollapseDemo / ProgressDemo / ResultDemo).
- Demo: `treeselect/*.demo.tsx` migrated from `TreeSelectNode` to `TreeNodeData` after the public API change.
- Demo: `Bordered.demo.tsx` row ids switched from `number` to `string` to match Table's contract.
- Demo: `transfer/CustomRender.demo.tsx` — `listStyle` prop dropped (not on the new complex `Transfer`); replaced with `listHeight`.

### Tooling

- `scripts/audit-styles.mjs` — added allowlist for runtime-generated transition classes (`sg-fade-*`, `sg-slide-*`, `sg-zoom-*`, `sg-collapse-*`). Reduces "possibly dead" CSS class count by 41 false positives.
- `eslint.config.js` — clarified the rationale for ignoring `examples/` (oversized demo set) and pointed at a targeted `npx eslint examples/...` workflow.
- `themes/default.css` and `themes/dark.css` — clarified in JSDoc that both are convenience re-exports of the full `tokens.css`; theme activation is via `data-sg-theme` attribute, not via importing one or the other.
- `STREAM-PLAN.md` v1 — terminology corrected: "stream" = entire continuous turn, "task" = individual unit of work (was conflated in v0).

### Added — Public styling contract established

- [`docs/styling-contract.md`](docs/styling-contract.md) — публичный стилевой контракт: стабильные токены, корневые классы `.sg-*`, перечень слотов, `classNames` / `styles` API, политика версий.
- [`docs/styling-recipes.md`](docs/styling-recipes.md) — практические рецепты для пользователя: бренд, тёмная тема, стилизация одной таблицы, условный цвет строк/ячеек, `unstyled`.
- `classNames` / `styles` API (слоты) для `Table` и `List`. Ключи слотов перечислены в `styling-contract.md` §4.
- `TableColumn.headerClassName` — паритет с `cellClassName`.
- Общие утилиты `SlotClassNames` / `SlotStyles` / `slotClass` / `slotStyle` в `@skygraph/react` для будущих компонентов.
- CI: `scripts/check-tokens.mjs` — проверка, что все `var(--sg-*)` задекларированы в `tokens.css` или локально в компонентной CSS.
- CI: `scripts/check-no-important.mjs` — запрет `!important` в компонентных CSS (с явным allowlist для accessibility и print).
- CI: `scripts/audit-styles.mjs` — разовый аудит `var(--sg-*)`, `.sg-*` классов и «магических» hex-цветов.
- Npm-скрипты `audit:styles`, `check:tokens`, `check:no-important`, `check:styles`; `check:styles` подключён в GitHub Actions.

### Changed

- Нормализованы токены в `mentions.css`, `spin.css`, `input.css`, `table.css`, `tree.css` — убраны «чужие» имена, все ссылки идут через `tokens.css` или локальные `--sg-<component>-*`.
- Убраны все `!important` из компонентных CSS, где они были неоправданы: `input-password.css`, `search-input.css`, `table.css` (fullscreen, group cell), `tree.css`, `list.css` (responsive grid через каскад CSS-переменных).
- `SgConfig.prefixCls` убран из публичного API до корректной реализации (вариант A из `styling-plan.md`, фаза 4). Для изоляции классов — изолированный скоуп на хосте.

## [0.3.0] - 2026-04-14

### Added

- **Demo Documentation** — Ant-style interactive docs for all 40+ components
  - `DemoBox` — live preview + collapsible source code
  - `PropsTable` — API reference tables for every component
  - `ComponentDoc` — page layout with title, description, "When To Use", examples
- All 40 demo pages converted to documentation format

## [0.2.0] - 2026-04-13

### Added

- **Tests** — 282 new tests across UI components, hooks, and adapters (428 total)
- **Accessibility** — ARIA attributes on 24+ components, keyboard navigation for Select, Dropdown, AutoComplete, Menu, Tabs, Rate, Slider
- **A11y hooks** — `useFocusTrap`, `useRovingTabIndex`, `useListNavigation`
- **New components** — Transfer, Calendar, TreeSelect, Mentions, Transition
- **Animations** — `Transition` component with CSS class-based transitions (fade, slide-up/down/left/right, zoom, collapse)
- **Transition integration** — Modal, Drawer, Dropdown, Tooltip, Popconfirm, Notification, Select use `Transition`
- **ConfigProvider completion** — full integration across all UI and complex components (size, disabled, locale)
- **Form Super Universal** — `scrollToFirstError`, `onValuesChange`, `preserve`, `warningRules`, `feedbackIcons`, `FormProvider` (multi-form coordination), `SchemaForm`, expanded `AutoField` (10 new types), `jsonSchemaAdapter`, `zodToJsonSchema`
- **Table Ant-killer** — multi-sort UI, row drag & drop, context menus, column visibility, column pinning, virtual scroll, CSV/clipboard export, selection summary, zebra striping, advanced pagination
- **DataGrid** — Excel-like component with inline editing, selection, formulas
- **Middleware pipeline** — pluggable middleware for core store
- **Time-travel debugging** — `useHistory` hook with undo/redo

## [0.1.0] - 2026-04-13

### Added

- `@skygraph/core` — reactive runtime (Store, Batch, Transaction, Computed, Scheduler)
- `@skygraph/core` — FormEngine (fields, validation, submit, reset, dependencies)
- `@skygraph/core` — TableEngine (CRUD, sorting, filtering, pagination)
- `@skygraph/core` — TreeEngine (expand, check, select, drag, async load, filter)
- `@skygraph/core` — TypedCore wrapper for type-safe paths
- `@skygraph/react` — hooks: useForm, useField, useWatch, useComputed, useTable, useTree
- `@skygraph/react` — 11 complex components (Form, Field, Table, Tree, List, Transfer, etc.)
- `@skygraph/react` — 39 UI components (Button, Input, Modal, Select, etc.)
- `@skygraph/react` — CSS design tokens, light/dark themes, per-component styles
- Demo application with 41 interactive examples
- CI pipeline (GitHub Actions)
- ESLint + Prettier configuration
