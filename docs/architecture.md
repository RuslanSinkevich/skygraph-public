# Архитектура

## Два пакета

```
@skygraph/core (чистый TS, 0 зависимостей)
    ↑ public API
@skygraph/react (peer: core + react)
```

**Core** — реактивный runtime + domain engines. Не знает про React.
**React** — хуки-мосты к engines + UI-компоненты.

## Core: внутренняя структура

```
core/src/
├── runtime/              ← универсальный реактивный движок
│   ├── Store.ts          — path-based key-value хранилище
│   ├── SubscriptionEngine.ts — per-path подписки
│   ├── Transaction.ts    — stage → commit → rollback
│   ├── Batch.ts          — N записей → 1 уведомление
│   ├── ComputedEngine.ts — граф вычисляемых значений
│   ├── Scheduler.ts      — очереди micro/macro/render
│   └── Node.ts           — узел графа
├── engines/              ← предметная логика
│   ├── form/             — FormEngine (валидация, поля, списки)
│   ├── table/            — TableEngine (строки, сортировка, фильтры, пагинация, **column pinning**)
│   ├── tree/             — TreeEngine (expand, check, select, drag, filter)
│   ├── virtual/          — VirtualEngine (windowed rendering)
│   └── graph/            — GraphEngine (узлы / рёбра / иерархия / якоря + **routeOrthogonal** для диаграмм)
├── Core.ts               — CoreImpl (собирает runtime)
├── typed.ts              — TypedCore (типизированные пути)
├── types.ts              — Core interface
└── index.ts              — public API
```

### Правила

- `runtime/` **никогда** не импортирует `engines/`
- `engines/` использует `runtime/` через `Core` interface
- Каждый engine получает `Core` в конструкторе и работает через `core.get()`, `core.set()`, `core.batch()`
- Engine хранит данные в store по префиксу (`$table.`, `$tree.`, `$form.`)

## React: внутренняя структура

```
react/src/
├── hooks/                ← мосты core → React state
│   ├── useForm.ts        — создаёт Core + FormEngine, отдаёт React state
│   ├── useField.ts       — подписка на одно поле
│   ├── useTable.ts       — создаёт Core + TableEngine
│   ├── useTree.ts        — создаёт Core + TreeEngine
│   ├── useComputed.ts    — подписка на computed
│   └── useWatch.ts       — наблюдение за полями формы
├── components/
│   ├── complex/          ← используют core через хуки
│   │   ├── Form.tsx, Field.tsx, FormList.tsx, SubmitButton.tsx
│   │   ├── Table/        — папка (разбит на файлы)
│   │   └── Tree/         — папка (разбит на файлы)
│   └── ui/               ← чистый React, без core
│       ├── Button.tsx, Input.tsx, Modal.tsx, ...
│       └── (28 компонентов)
├── styles/
│   ├── tokens.css        — дизайн-токены
│   ├── themes/           — light.css, dark.css
│   └── components/       — по файлу на компонент
└── index.ts              — public API
```

### Правила

- `ui/` компоненты **никогда** не импортируют `@skygraph/core`
- `complex/` компоненты используют core **только** через хуки из `hooks/`
- Каждый complex-компонент больше 300 строк — разбивать на папку

## Стили как контракт

Стилевой слой SkyGraph — такой же публичный API, как пропы и типы: токены в
`tokens.css`, корневые классы `.sg-*`, ключи `classNames` / `styles` и политика
версий зафиксированы в [`styling-contract.md`](./styling-contract.md).
Нарушение контракта = breaking change. Практические рецепты для пользователей
библиотеки — в [`styling-recipes.md`](./styling-recipes.md). CI проверяет оба
правила: неизвестные `var(--sg-...)` и `!important` в компонентных CSS
отвергаются.

## Паттерн создания engine

```
Core → createEngine(core, options) → Engine interface
                                          ↓
                                    useEngine(options) → React state
                                          ↓
                                    <Component> (оркестратор)
```

Конкретно:
1. `createCore()` → `Core`
2. `createTable(core, opts)` → `TableEngine`
3. `useTable(opts)` → `{ visibleRows, tableState, setSort, ... }`
4. `<Table>` — рендерит, вызывает хук, передаёт в подкомпоненты
