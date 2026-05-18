# SkyGraph — Документация

## Навигация

| Документ | Для кого | Описание |
|---|---|---|
| [Быстрый старт](./quick-start.md) | Новый разработчик | Как поднять проект, запустить, начать работать |
| [Архитектура](./architecture.md) | Все | Слои, пакеты, правила, как всё связано |
| [Multi-framework стратегия](./multi-framework.md) | Maintainers | React → Vue → Angular: контракт адаптеров, CSS-контракт, версионирование, паритет composables |
| [Core Engine](./core-engine.md) | Разработчик ядра | Runtime, Store, 6 engines (form/table/tree/virtual/graph/calendar) |
| [Компоненты](./components.md) | Разработчик UI | Как устроены компоненты, паттерны, как добавить новый |
| [Стили и темы](./styling.md) | Разработчик UI | Токены, CSS, темы, как стилизовать |
| [Стилевой контракт](./styling-contract.md) | Пользователь библиотеки | Публичные токены, `classNames` / `styles`, `unstyled` |
| [Стилевые рецепты](./styling-recipes.md) | Пользователь библиотеки | Бренд, dark mode, conditional row/cell styling |
| [Конвенции](./conventions.md) | Все | Именование, структура файлов, код-стайл |
| [Стилевой план](./styling-plan.md) | Maintainers | Многофазный план приведения CSS к контракту |

## Audit-отчёты (point-in-time)

| Документ | Когда | Описание |
|---|---|---|
| [`_audit/styling-audit.md`](./_audit/styling-audit.md) | auto, на каждом `pnpm audit:styles` | Токены, классы, magic hex, dead-code candidates. Часть CI gate. |
| [`_audit/vue-ui-primitives-port.md`](./_audit/vue-ui-primitives-port.md) | round 13 (`e504766`) | Отчёт по порту 27 ui primitives на Vue: список компонентов, тесты, отклонения от спеки. |
| [`../_audit/architecture-drift-2026-05-09.md`](../_audit/architecture-drift-2026-05-09.md) | round 13 (`9d45ab8`) | Drift `core` + `styles` против инвариантов архитектуры (9 findings). |

## Корневые документы

- [`README.md`](../README.md) — пользовательский overview, установка, фичи.
- [`ARCHITECTURE.md`](../ARCHITECTURE.md) — конституция архитектуры (заморозка API).
- [`CHANGELOG.md`](../CHANGELOG.md) — журнал релизов.
- [`TODO.md`](../TODO.md) — открытые хвосты (большие задачи, расширения, тех. долг).
- [`deploy/README.md`](../deploy/README.md) — Caddy + Docker multi-framework subdir деплой (`/`, `/vue/`, `/angular/`).
