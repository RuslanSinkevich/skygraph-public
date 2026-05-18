# Core Engine — руководство по разработке

> Текущие встроенные движки: **FormEngine**, **TableEngine**, **TreeEngine**, **VirtualEngine**, **GraphEngine**.
> Каждый владеет namespace `$<name>.` в Store (см. `engines/namespaces.ts`) и предоставляет фокусированный API.

## Как устроен runtime

### Store

Path-based key-value хранилище. Пути — строки через точку: `$form.f0.fields.name.value`.

```typescript
core.get('$form.f0.fields.name.value')  // unknown
core.set('$form.f0.fields.name.value', 'John')
```

### Подписки

Per-path. Подписчик получает новое значение при изменении.

```typescript
const unsub = core.subscribe('$form.f0.fields.name.value', (val) => { ... })
```

### Batch

Группирует N записей → 1 уведомление подписчикам.

```typescript
core.batch(() => {
  core.set(path1, val1)
  core.set(path2, val2)
  // подписчики получат уведомление один раз, после batch
})
```

### Transaction

Stage → commit (применяет всё) или rollback (откатывает).

### Computed

Граф зависимостей. Автоматический пересчёт при изменении deps.

```typescript
core.computed('$total', ['$price', '$qty'], (price, qty) => price * qty)
```

## Как создать новый Engine

### 1. Создать папку

```
packages/core/src/engines/myengine/
├── types.ts
├── MyEngine.ts
└── index.ts
```

### 2. types.ts — определить интерфейсы

```typescript
export interface MyEngineOptions {
  // опции создания
}

export interface MyEngineState {
  // состояние для React
}

export interface MyEngine {
  // методы
  getState(): MyEngineState
  reset(): void
}
```

### 3. MyEngine.ts — реализация

```typescript
import type { Core } from '../../types'
import type { MyEngine, MyEngineOptions, MyEngineState } from './types'

const PREFIX = '$myengine.'
let counter = 0

export function createMyEngine(core: Core, options?: MyEngineOptions): MyEngine {
  const id = `me${counter++}`

  function statePath(key: string): string {
    return `${PREFIX}${id}.${key}`
  }

  function publishState(): void {
    core.batch(() => {
      core.set(statePath('someKey'), someValue)
    })
  }

  const engine: MyEngine = {
    getState(): MyEngineState {
      return { /* ... */ }
    },
    reset(): void {
      // очистить всё
      publishState()
    },
  }

  publishState()
  return engine
}
```

### 4. index.ts — реэкспорт

```typescript
export { createMyEngine } from './MyEngine'
export type { MyEngine, MyEngineOptions, MyEngineState } from './types'
```

### 5. Обновить core/src/index.ts

Добавить экспорт нового engine.

### 6. Пересобрать core

```bash
cd packages/core && npm run build
```

### 7. Если нужно — обновить tsup.config.ts

Если engine должен быть отдельным entry point (как `@skygraph/core/form`).

## Существующие engines

### FormEngine

- Путь: `engines/form/`
- Префикс: `$form.`
- Что делает: управление полями, валидация (sync/async), FormList, dirty/touched/errors
- Фабрика: `createForm(core, options)`

### TableEngine

- Путь: `engines/table/`
- Префикс: `$table.`
- Что делает: строки данных, сортировка, фильтры (column + custom fn), пагинация
- Фабрика: `createTable(core, options)`

### TreeEngine

- Путь: `engines/tree/`
- Префикс: `$tree.`
- Что делает: expand/collapse, check/uncheck (cascade + strict), select, drag & drop, async loading, filter, virtual flat list
- Фабрика: `createTree(core, options)`

## Тестирование

```bash
cd packages/core
npm test              # vitest run
npm run test:watch    # vitest watch
```

Тесты лежат в `src/__tests__/`. Формат: `*.test.ts`.
