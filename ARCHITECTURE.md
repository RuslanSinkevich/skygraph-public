# SkyGraph — Architecture Constitution

> Этот документ фиксирует решения, которые **нельзя менять** после начала разработки.
> Всё остальное — детали реализации, их можно менять свободно.

---

## 1. Слои системы и границы

```
@skygraph/core (чистый TS, 0 зависимостей)
┌─────────────────────────────────────────────┐
│  runtime/                                   │
│    Store         — path-based хранилище     │
│    Subscribe     — granular per-path        │
│    Transaction   — stage → commit → notify  │
│    Batch         — N writes → 1 notify      │
│    Computed      — граф зависимостей        │
│    Scheduler     — micro/macro/render queue  │
│    Middleware    — pluggable pipeline        │
│                                             │
│  engines/                                   │
│    form/         — FormEngine               │
│    table/        — TableEngine              │
│    tree/         — TreeEngine               │
│    virtual/      — VirtualScroll engine     │
│    graph/        — GraphEngine (diagrams)   │
│    calendar/     — CalendarEngine           │
│                                             │
│  Валидация живёт внутри `engines/form/`     │
│  (FormEngine + middleware/validation.ts) —  │
│  отдельного `validation/` пакета нет.       │
│                                             │
│  engines/ использует runtime/ internal API  │
│  runtime/ НИКОГДА не импортирует engines/   │
└─────────────────────────────────────────────┘
          ▲ public API only
          │
@skygraph/react (peer: core + react) — канонический адаптер
@skygraph/vue   (peer: core + vue ^3.4) — полный паритет API/CSS
@skygraph/angular (планируется) — тот же контракт
┌─────────────────────────────────────────────┐
│  hooks/                                     │
│    useField, useForm, useFieldArray         │
│    useWatch, useComputed, useHistory        │
│    useTable (+pinning), useTree             │
│    useVirtualScroll, useGraph               │
│                                             │
│  hooks/a11y/                                │
│    useFocusTrap, useRovingTabIndex          │
│    useListNavigation                        │
│                                             │
│  components/complex/    (используют core)   │
│    Form, Field, FormList, FormProvider      │
│    SchemaForm, AutoField, SubmitButton      │
│    Table, DataGrid, Tree, List              │
│    TreeSelect, Cascader, Calendar           │
│    Transfer, VirtualList                    │
│                                             │
│  components/ui/         (чистый React, 44)  │
│    Button, Input, Select, Modal, Drawer     │
│    Tabs, Menu, Notification, Tooltip, ...   │
│    Transfer, Calendar, Mentions, Transition │
│                                             │
│  ConfigProvider — size, disabled, locale     │
│  adapters/ — zodAdapter, jsonSchemaAdapter  │
│                                             │
│  styles/                                    │
│    tokens.css, transitions.css              │
│    components/*.css (49 files)              │
│    themes/ (default, dark)                  │
└─────────────────────────────────────────────┘
```

### Правила границ (нарушение = баг архитектуры)

- `runtime/` **НЕ** импортирует из `engines/`
- `engines/` используют **публичный** `Core` интерфейс (`../../types`)
- Если engine-у действительно нужен доступ к runtime-примитивам — только через `@skygraph/core/runtime-internal` (нестабильный API)
- `engines/` **НЕ** импортируют друг друга (form не знает про table и наоборот)
- `@skygraph/react` импортирует из `@skygraph/core` только через **public API**
- `components/ui/` (Spin, Button) **НЕ** импортирует из `runtime/` и `engines/`

Эти правила **статически enforced** через ESLint (`no-restricted-imports` в `eslint.config.js`). Попытка нарушить — ошибка сборки, а не code review pending.

### Engine path namespaces

Engine, который пишет в `Core` store под `$`-префиксом, **обязан** зарезервировать свой префикс через `reservePrefix(engineName, prefix)` из `engines/namespaces.ts`. Коллизия между двумя engines бросает исключение на загрузке модуля, а не молча перетирает данные.

Зарезервированные префиксы (`packages/core/src/engines/namespaces.ts`):

| Engine    | Префикс       |
|---|---|
| form      | `$meta.`     |
| table     | `$table.`    |
| tree      | `$tree.`     |
| graph     | `$graph.`    |
| calendar  | `$calendar.` |

`virtual/` работает в памяти (без записи в Core store) и префикс не резервирует.

Пользовательские данные не должны жить под `$` — эта зона для engines.

---

## 2. Core API — неизменяемый контракт

После первого релиза — только расширение. Удаление или изменение сигнатур запрещено.

```typescript
// === Создание ===

function createCore(): Core

// === Core API ===

interface Core {
  /** Получить значение по path */
  get(path: string): unknown

  /** Установить значение по path */
  set(path: string, value: unknown): void

  /** Подписаться на изменения path, возвращает функцию отписки */
  subscribe(path: string, cb: (value: unknown) => void): () => void

  /** Сгруппировать записи: N set() → 1 notify */
  batch(fn: () => void): void

  /** Атомарное обновление: либо всё применилось, либо ничего */
  transaction(fn: () => void): void

  /** Зарегистрировать вычисляемое значение с зависимостями */
  computed(
    target: string,
    deps: string[],
    fn: (...values: unknown[]) => unknown
  ): void
}
```

### Почему `unknown`, а не generics

Ядро обобщённое. Типы — внешний слой (compile-time only):

```typescript
// Типизированная обёртка — отдельный модуль, не влияет на runtime
type TypedCore<T> = {
  get<K extends Path<T>>(path: K): PathValue<T, K>
  set<K extends Path<T>>(path: K, value: PathValue<T, K>): void
}
```

---

## 3. FormEngine API — неизменяемый контракт

```typescript
// === Создание ===

function createForm(core: Core, options?: FormOptions): FormEngine

// === FormEngine API ===

interface FormEngine {
  /** Зарегистрировать поле */
  register(name: string, options?: FieldOptions): void

  /** Снять регистрацию поля */
  unregister(name: string): void

  /** Установить значение поля */
  setValue(name: string, value: unknown): void

  /** Получить значение поля */
  getValue(name: string): unknown

  /** Получить мета-состояние поля */
  getFieldState(name: string): FieldMeta

  /** Получить состояние всей формы */
  getFormState(): FormState

  /** Добавить правило валидации */
  addRule(name: string, rule: Rule): void

  /** Объявить зависимость между полями */
  depends(target: string, deps: string[]): void

  /** Валидировать поле или всю форму */
  validate(name?: string): Promise<ValidationResult>

  /** Отправить форму */
  submit(
    handler: (values: Record<string, unknown>) => Promise<void>
  ): Promise<void>

  /** Сбросить форму */
  reset(values?: Record<string, unknown>): void

  /** Установить множество значений за раз */
  setFieldsValue(values: Record<string, unknown>): void

  /** Получить все значения */
  getValues(): Record<string, unknown>

  /** Операции с массивами полей */
  listAdd(name: string, value: unknown, index?: number): void
  listRemove(name: string, indices: number | number[]): void
  listReplace(name: string, index: number, value: unknown): void
}

// === Типы ===

interface FieldMeta {
  touched: boolean
  dirty: boolean
  errors: string[]
  warnings: string[]
  status: 'idle' | 'validating' | 'success' | 'error' | 'warning'
  validating: boolean
}

interface FormState {
  isDirty: boolean
  isValid: boolean
  isSubmitting: boolean
  isValidating: boolean
}

type Rule = (value: unknown) => string | null | Promise<string | null>

interface ValidationResult {
  valid: boolean
  errors: Record<string, string[]>
}
```

### Расширение FieldMeta

Встроенные поля (`touched`, `dirty`, `errors`, `warnings`, `validating`, `status`) **заморожены**: их нельзя убирать, переименовывать или менять типы — это breaking change.

Плагины добавляют свои поля через TypeScript declaration merging на интерфейс `FieldMetaExtensions`:

```typescript
// my-plugin.d.ts
declare module '@skygraph/core' {
  interface FieldMetaExtensions {
    submittedAt?: number
    serverValidationId?: string
  }
}
```

После этого `getFieldState(name).submittedAt` строго типизирован во всём проекте.

Для runtime-уровня без типов есть `extra?: Record<string, unknown>` — bag для произвольных данных, если declaration merging не подходит (например, динамические ключи).

---

## 4. Pipeline изменения — неизменяемый протокол

```
SET → STAGE → RESOLVE → PROPAGATE → COMMIT → NOTIFY
```

| Шаг | Что происходит |
|---|---|
| **SET** | Вызов `core.set(path, value)` или `form.setValue(name, value)` |
| **STAGE** | Запись в staging area. Ничего не мутируется. |
| **RESOLVE** | Сравнение с текущим значением. Drop если не изменилось. |
| **PROPAGATE** | Обход графа зависимостей. Пересчёт dirty computed nodes. |
| **COMMIT** | `node.value = newValue`, `node.version++` |
| **NOTIFY** | Уведомление только подписчиков изменённых paths. |

Новые шаги можно добавлять между существующими.
Существующие нельзя убирать или менять порядок.

---

## 5. Стилевая система — 3-слойные tokens

```
Слой 1: Palette          Слой 2: Semantic           Слой 3: Component
(не зависят от темы)     (переключаются по теме)    (per-component override)
                                                     
--sg-blue-6: #1677ff  →  --sg-color-primary  →  --sg-btn-bg
--sg-gray-3: #f5f5f5  →  --sg-color-bg       →  --sg-input-bg
--sg-red-5: #ff4d4f   →  --sg-color-error    →  --sg-field-error-color
```

### Tokens — palette (не зависят от темы)

```css
:root {
  --sg-blue-1: #e6f4ff;
  --sg-blue-5: #4096ff;
  --sg-blue-6: #1677ff;
  --sg-blue-7: #0958d9;

  --sg-gray-1: #ffffff;
  --sg-gray-2: #fafafa;
  --sg-gray-3: #f5f5f5;
  --sg-gray-9: #262626;
  --sg-gray-10: #141414;

  --sg-red-5: #ff4d4f;
  --sg-green-6: #52c41a;
  --sg-orange-5: #faad14;
}
```

### Tokens — semantic (переключаются по теме)

```css
:root, [data-sg-theme="light"] {
  --sg-color-bg:              var(--sg-gray-1);
  --sg-color-bg-secondary:    var(--sg-gray-2);
  --sg-color-bg-elevated:     var(--sg-gray-1);
  --sg-color-text:            rgba(0, 0, 0, 0.88);
  --sg-color-text-secondary:  rgba(0, 0, 0, 0.65);
  --sg-color-text-disabled:   rgba(0, 0, 0, 0.25);
  --sg-color-border:          var(--sg-gray-3);
  --sg-color-primary:         var(--sg-blue-6);
  --sg-color-primary-hover:   var(--sg-blue-5);
  --sg-color-primary-active:  var(--sg-blue-7);
  --sg-color-error:           var(--sg-red-5);
  --sg-color-success:         var(--sg-green-6);
  --sg-color-warning:         var(--sg-orange-5);
  --sg-shadow:                0 2px 8px rgba(0, 0, 0, 0.08);
  --sg-shadow-elevated:       0 6px 16px rgba(0, 0, 0, 0.12);
}

[data-sg-theme="dark"] {
  --sg-color-bg:              var(--sg-gray-10);
  --sg-color-bg-secondary:    var(--sg-gray-9);
  --sg-color-bg-elevated:     #1f1f1f;
  --sg-color-text:            rgba(255, 255, 255, 0.88);
  --sg-color-text-secondary:  rgba(255, 255, 255, 0.65);
  --sg-color-text-disabled:   rgba(255, 255, 255, 0.25);
  --sg-color-border:          #424242;
  --sg-color-primary:         var(--sg-blue-5);
  --sg-color-primary-hover:   var(--sg-blue-6);
  --sg-color-primary-active:  var(--sg-blue-7);
  --sg-color-error:           #dc4446;
  --sg-color-success:         #49aa19;
  --sg-color-warning:         #d89614;
  --sg-shadow:                0 2px 8px rgba(0, 0, 0, 0.32);
  --sg-shadow-elevated:       0 6px 16px rgba(0, 0, 0, 0.48);
}
```

### Tokens — sizing (не зависят от темы)

```css
:root {
  --sg-font-size-sm: 12px;
  --sg-font-size: 14px;
  --sg-font-size-lg: 16px;

  --sg-height-sm: 24px;
  --sg-height-md: 32px;
  --sg-height-lg: 40px;

  --sg-border-radius-sm: 4px;
  --sg-border-radius: 6px;
  --sg-border-radius-lg: 8px;

  --sg-padding-xs: 4px;
  --sg-padding-sm: 8px;
  --sg-padding-md: 12px;
  --sg-padding-lg: 16px;
  --sg-padding-xl: 24px;

  --sg-transition-duration: 0.2s;
}
```

### Tokens — component level (пример для Button)

```css
.sg-button {
  --sg-btn-bg: transparent;
  --sg-btn-color: var(--sg-color-text);
  --sg-btn-border: var(--sg-color-border);
  --sg-btn-height: var(--sg-height-md);
  --sg-btn-padding: 0 var(--sg-padding-md);
  --sg-btn-radius: var(--sg-border-radius);
  --sg-btn-font-size: var(--sg-font-size);
}

.sg-button-primary {
  --sg-btn-bg: var(--sg-color-primary);
  --sg-btn-color: #fff;
  --sg-btn-border: var(--sg-color-primary);
}
```

### Принцип стилевой композиции (КЛЮЧЕВОЕ)

Каждый UI-компонент (Spin, Input, Select, Checkbox...) — **автономный**.
Работает сам по себе и внутри других компонентов.

Когда компонент используется внутри другого, **родитель НЕ пишет вложенные селекторы**
(`.sg-button .sg-spin` — ЗАПРЕЩЕНО). Вместо этого родитель **переопределяет CSS Variables** дочернего:

```css
/* ПРАВИЛЬНО: родитель меняет переменные, ребёнок подхватывает */
.sg-button {
  --sg-spin-size: 1em;
  --sg-spin-color: currentColor;
}

/* НЕПРАВИЛЬНО: родитель лезет в структуру ребёнка */
.sg-button .sg-spin { width: 1em; color: currentColor; }
```

Каждый компонент объявляет свои `--sg-xxx-*` переменные с дефолтами.
Родитель может их переопределить. Ребёнок подхватывает через `var(--sg-xxx-*, default)`.

Это исключает комбинаторный взрыв вложенных селекторов.

### Неизменяемые решения

- CSS Variables, не CSS-in-JS. Без рантайма. Статические файлы.
- Тема переключается через `data-sg-theme="light|dark"` на **любом** DOM-элементе.
- Вложенные темы работают через CSS inheritance (ближайший `data-sg-theme` побеждает).
- Prefix `--sg-` для всех переменных.
- Prefix `.sg-` для всех CSS-классов.
- Каждый компонент = отдельный CSS-файл.
- **Стилевая композиция через CSS Variables, не через вложенные селекторы.**
- **Каждый компонент автономный — работает сам по себе и внутри других.**

---

## 6. Кастомизация — 4 уровня

| Уровень | Что делает | Как | Пример |
|---|---|---|---|
| 1 | Меняет глобальную тему | Переопределяет `--sg-color-*` | `:root { --sg-color-primary: #7c3aed; }` |
| 2 | Меняет один тип компонента | Переопределяет `--sg-btn-*` | `.sg-button { --sg-btn-radius: 20px; }` |
| 3 | Свой рендер одного экземпляра | `unstyled` + render props | `<Field unstyled>{(f) => <MyInput />}</Field>` |
| 4 | Полностью headless | Не импортирует CSS, только hooks | `import { useField } from '@skygraph/react'` |

### `unstyled` проп

Компонент с `unstyled` не навешивает CSS-классы `.sg-*`. Логика (value, error, onChange, валидация) работает. Стили — ответственность пользователя.

```tsx
<Field name="bio" unstyled>
  {(field) => (
    <textarea
      className="my-custom-textarea"
      value={field.value}
      onChange={e => field.onChange(e.target.value)}
    />
  )}
</Field>
```

---

## 7. Кросс-фреймворк совместимость

### Переиспользуется между фреймворками (100%)

- `@skygraph/core` целиком (runtime + engines) — чистый TS, без DOM
- `@skygraph/styles` целиком (tokens, themes, transitions, print, 60+
  компонент-CSS) — нет JS, framework-agnostic из коробки

### Пишется под каждый фреймворк

- Hooks/bindings: `useField` (React), `useSkyField` (Vue), `SkyFieldService` (Angular)
- Компонентные обёртки: JSX (React), SFC (Vue), ng-template (Angular)

### Правило

Если что-то зависит от `React.useState`, `Vue.ref()`, `BehaviorSubject` — оно в адаптере, **не в core**.

### Подробнее

Полная стратегия (контракт адаптеров, demo, версионирование, не-цели) —
в [`docs/multi-framework.md`](./docs/multi-framework.md). Этот документ
обязателен к прочтению перед добавлением нового адаптера
(`@skygraph/vue`, `@skygraph/angular`).

---

## 8. Структура файлов

```
skygraph/
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   ├── runtime/
│   │   │   │   ├── Store.ts, Node.ts
│   │   │   │   ├── SubscriptionEngine.ts
│   │   │   │   ├── Transaction.ts, Batch.ts
│   │   │   │   ├── Scheduler.ts
│   │   │   │   ├── ComputedEngine.ts, CycleDetector.ts
│   │   │   │   ├── Middleware.ts
│   │   │   │   └── index.ts
│   │   │   ├── engines/
│   │   │   │   ├── form/       — FormEngine, FieldModel, MetaStore, ValidationEngine
│   │   │   │   ├── table/      — TableEngine (sort, filter, pagination, pinning, group)
│   │   │   │   ├── tree/       — TreeEngine (expand, check, drag, async)
│   │   │   │   ├── virtual/    — VirtualScroll engine (windowed rendering)
│   │   │   │   ├── graph/      — GraphEngine (nodes/edges/anchors/orthogonal routing)
│   │   │   │   ├── calendar/   — CalendarEngine (resources/assignments/conflicts)
│   │   │   │   └── namespaces.ts — `$meta. $table. $tree. $graph. $calendar.`
│   │   │   ├── __tests__/      — 388 unit tests (+ 1 bench-gated)
│   │   │   ├── types.ts
│   │   │   ├── Core.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── react/                  — @skygraph/react (канонический адаптер)
│   │   ├── src/
│   │   │   ├── hooks/
│   │   │   │   ├── useField.ts, useForm.ts, useFieldArray.ts
│   │   │   │   ├── useWatch.ts, useComputed.ts, useHistory.ts
│   │   │   │   ├── useTable.ts, useTree.ts, useGraph.ts
│   │   │   │   ├── useVirtualScroll.ts, useChartSize.ts
│   │   │   │   └── a11y/       — useFocusTrap, useRovingTabIndex, useListNavigation
│   │   │   ├── components/
│   │   │   │   ├── complex/    — Form, Field, FormList, FormProvider,
│   │   │   │   │                 SchemaForm, SchemaFormEditor, AutoField, SubmitButton,
│   │   │   │   │                 Table, DataGrid, Tree, List, TreeSelect, Cascader,
│   │   │   │   │                 Calendar, Transfer, VirtualList,
│   │   │   │   │                 Diagram, LineChart, BarChart, AreaChart, PieChart,
│   │   │   │   │                 Dashboard/DashboardEditor,
│   │   │   │   │                 Gantt, EventTimeline, ResourceCalendar
│   │   │   │   ├── ui/         — 47 standalone components
│   │   │   │   └── ConfigProvider.tsx
│   │   │   ├── adapters/       — zodAdapter, jsonSchemaAdapter
│   │   │   ├── types/          — shared types (BaseComponentProps, SgLocale, …)
│   │   │   ├── __tests__/      — 625 component/hook/adapter tests
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── vue/                    — @skygraph/vue (полный паритет API/CSS)
│   │   ├── src/
│   │   │   ├── composables/    — useForm/useField/useFieldArray/useWatch,
│   │   │   │                     useTable/useTree/useGraph/useVirtualScroll,
│   │   │   │                     useHistory/useChartSize, useFocusTrap,
│   │   │   │                     useRovingTabIndex/useListNavigation
│   │   │   ├── components/
│   │   │   │   ├── ui/         — 52 SFC primitives (Button, Input, Modal, Drawer,
│   │   │   │   │                 Tabs, Menu, Notification, Tooltip, Transition,
│   │   │   │   │                 ConfigProvider, Pagination, Steps, Carousel, …)
│   │   │   │   └── complex/    — SgForm/SgField/SgFormList/SgFormProvider,
│   │   │   │                     SgSchemaForm/SgSchemaFormEditor,
│   │   │   │                     SgTable/SgDataGrid/SgTree/SgList/SgVirtualList,
│   │   │   │                     SgDiagram/SgLineChart/SgBarChart/SgAreaChart/SgPieChart,
│   │   │   │                     SgDashboard/SgDashboardEditor,
│   │   │   │                     SgGantt/SgEventTimeline/SgResourceCalendar
│   │   │   ├── adapters/       — jsonSchemaAdapter
│   │   │   ├── locales/        — locale dictionaries
│   │   │   ├── utils/          — print
│   │   │   ├── __tests__/      — 659 vitest cases (+ styling-contract.parity.test.ts)
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── styles/                 — @skygraph/styles (framework-agnostic CSS, 0 deps)
│       ├── tokens.css, reset.css, index.css
│       ├── transitions.css     — fade, slide, zoom, collapse
│       ├── print.css           — @media print layer
│       ├── components/         — 64 component CSS files
│       ├── themes/             — default.css, dark.css
│       └── package.json
│
├── examples/
│   ├── _shared/                — @skygraph-examples/shared (vanilla TS)
│   │                              parsers (changelog/todo), constants (stats),
│   │                              showcasesLocale, types
│   ├── _shared-react/          — @skygraph-examples/shared-react
│   │                              AppShell, Header, Footer, Sidebar, theme/lang switchers
│   ├── demo/                   — Ant-style React demo (live docs + benchmarks page)
│   │   └── src/
│   │       ├── components/     — DemoBox, PropsTable, ComponentDoc, FrameworkSwitcher
│   │       ├── demos/          — 50+ component demo pages
│   │       │   └── benchmarks/ — Form/Table/LineChart benchmarks (vs RHF/AntD/Recharts)
│   │       └── pages/          — Landing, Roadmap, About, Benchmarks, Showcases (embedded)
│   ├── demo-vue/               — Ant-style Vue demo (23 pages, ant-style shell)
│   └── showcases/              — 12 mini-apps (CRM, Helpdesk, Inbox, Dashboard, …)
│
├── deploy/                     — Docker/Caddy multi-framework deploy
│   ├── Caddyfile, Dockerfile, build-all.mjs
│   └── stubs/                  — placeholders for `/vue/` and `/angular/`
│
├── _audit/                     — point-in-time architecture/styles drift reports
├── package.json
├── tsconfig.base.json
├── ARCHITECTURE.md
├── CHANGELOG.md
└── README.md
```

---

## 9. Что МОЖНО менять без ломки

- Внутренняя реализация Store (Map, WeakMap) — пока API тот же
- Алгоритм Scheduler (microtask, RAF) — пока batch/transaction работают
- Добавление новых engines (table/, list/)
- Добавление новых UI-компонентов
- Добавление новых CSS tokens
- Добавление новых полей в FieldMeta
- Внутренняя структура Node

---

## 10. Что НЕЛЬЗЯ менять после старта

- Сигнатуры `core.get / set / subscribe / batch / transaction / computed`
- Сигнатуры `form.register / setValue / getValue / getFieldState / validate / submit`
- Принцип: `runtime/` не знает про `engines/`
- Принцип: `@skygraph/core` не знает про React / Vue / Angular
- CSS prefix `--sg-` и `.sg-`
- Механизм тем через `data-sg-theme`
- 3-слойная token система: palette → semantic → component
- Pipeline: SET → STAGE → RESOLVE → PROPAGATE → COMMIT → NOTIFY
- `unstyled` проп для отключения стилей per-component
- 4 уровня кастомизации стилей
- Стилевая композиция через CSS Variables, не через вложенные селекторы
- Каждый UI-компонент автономный (работает сам и внутри других)
