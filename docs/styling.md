# Стили и темы

> Этот документ — внутренний гайд для разработчиков библиотеки. Публичный контракт стилизации (что обещаем потребителям) — в [`./styling-contract.md`](./styling-contract.md). Практические рецепты — в [`./styling-recipes.md`](./styling-recipes.md). Свежий автоотчёт по токенам/классам/dead-CSS — `pnpm audit:styles` → [`./_audit/styling-audit.md`](./_audit/styling-audit.md).

## Дизайн-токены

Все токены определены в `packages/styles/tokens.css` через CSS-переменные. Пакет `@skygraph/styles` фреймворк-агностичный — те же токены подхватят будущие `@skygraph/vue` / `@skygraph/angular` адаптеры без дублирования.

### Палитра (не зависит от темы)

```css
--sg-blue-1 .. --sg-blue-10    /* основной цвет */
--sg-gray-1 .. --sg-gray-10    /* серые */
--sg-red-1, --sg-red-5, --sg-red-6
--sg-green-1, --sg-green-5, --sg-green-6
--sg-orange-1, --sg-orange-5, --sg-orange-6
```

### Семантические токены (зависят от темы)

```css
/* Фоны */
--sg-color-bg              /* основной фон */
--sg-color-bg-secondary    /* вторичный */
--sg-color-bg-hover        /* при наведении */
--sg-color-bg-disabled     /* отключённый */

/* Текст */
--sg-color-text            /* основной */
--sg-color-text-secondary  /* вторичный */
--sg-color-text-tertiary   /* третичный */
--sg-color-text-disabled   /* отключённый */

/* Границы */
--sg-color-border
--sg-color-border-secondary

/* Основной цвет (primary) */
--sg-color-primary
--sg-color-primary-hover
--sg-color-primary-active
--sg-color-primary-bg

/* Статусы */
--sg-color-error / --sg-color-error-bg
--sg-color-success / --sg-color-success-bg
--sg-color-warning / --sg-color-warning-bg

/* Тени */
--sg-shadow-sm / --sg-shadow / --sg-shadow-lg
```

### Размеры

```css
--sg-font-size-sm: 12px
--sg-font-size: 14px
--sg-font-size-lg: 16px

--sg-height-sm: 24px
--sg-height-md: 32px
--sg-height-lg: 40px

--sg-border-radius-sm: 4px
--sg-border-radius: 6px
--sg-border-radius-lg: 8px

--sg-padding-xs: 4px
--sg-padding-sm: 8px
--sg-padding-md: 12px
--sg-padding-lg: 16px
--sg-padding-xl: 24px

--sg-transition-duration: 0.2s
--sg-transition-timing: cubic-bezier(0.645, 0.045, 0.355, 1)
```

## Темы

Светлая тема — по умолчанию (`:root`).
Тёмная тема — через `[data-sg-theme="dark"]`.

Переключение в приложении:
```typescript
document.documentElement.setAttribute('data-sg-theme', 'dark')
```

## Правила написания CSS

### Именование

- Префикс `sg-` для всех классов
- BEM-подобное: `sg-component`, `sg-component-variant`, `sg-component-child`
- Модификаторы: `sg-component-disabled`, `sg-component-active`

### Структура файла

```css
/* === ComponentName === */

.sg-component {
  /* базовые стили */
}

.sg-component-variant {
  /* вариант */
}

.sg-component:hover {
  /* интерактив */
}

.sg-component-disabled {
  /* отключённое состояние */
}
```

### Обязательно

- Использовать токены, не хардкодить цвета/размеры
- `transition` через `--sg-transition-duration` и `--sg-transition-timing`
- Поддержка dark темы через семантические токены (они переключаются автоматически)
- Не использовать `!important`

### Подключение

Каждый CSS-файл подключается в `styles/index.css`:
```css
@import './components/mycomponent.css';
```

## Структура файлов стилей

```
packages/styles/             ← workspace-пакет @skygraph/styles
├── tokens.css              ← дизайн-токены
├── reset.css               ← базовый сброс
├── index.css               ← импортирует всё
├── themes/
│   ├── default.css         ← (пустой, для расширения)
│   └── dark.css            ← (пустой, для расширения)
└── components/
    ├── button.css
    ├── input.css
    ├── table.css
    ├── tree.css
    └── ... (по файлу на компонент)
```
