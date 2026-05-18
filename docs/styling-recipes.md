# SkyGraph — Styling Recipes

> Практический справочник по стилизации SkyGraph. 80% реальных задач
> закрываются одним из рецептов ниже. Контракт, на который они опираются,
> зафиксирован в [`styling-contract.md`](./styling-contract.md).

Все рецепты используют публичные механизмы:

1. **Токены** — CSS custom properties из `@skygraph/styles/tokens.css`.
2. **Слоты** — `classNames` / `styles` по заявленным ключам.
3. **`unstyled`** — полный отказ от дефолтного CSS.

---

## 1. Поменять бренд за 30 секунд

Достаточно переопределить несколько токенов в любом CSS поверх библиотеки:

```css
@import '@skygraph/styles';

:root {
  --sg-color-primary: #e91e63;
  --sg-color-primary-hover: #c2185b;
  --sg-border-radius: 4px;
  --sg-font-size: 15px;
}
```

Токены читаются во всех компонентах — правка попадает и в кнопку, и в заголовок
таблицы, и в бордер инпута. Полный список стабильных токенов — в
`styling-contract.md` §3.1.

---

## 2. Тёмная тема

На любом контейнере ставится атрибут `data-sg-theme="dark"`, и семантические
токены перевешиваются:

```tsx
<div data-sg-theme="dark">
  <Table ... />
</div>
```

Или глобально:

```html
<html data-sg-theme="dark">
```

Палитра при этом не меняется — меняются только семантические имена
(`--sg-color-bg*`, `--sg-color-text*`, `--sg-color-border*` и т. п.).
Чтобы сделать свою тему, переопределите нужные токены под тем же селектором:

```css
[data-sg-theme='dark'] {
  --sg-color-bg: #0d1117;
  --sg-color-bg-elevated: #161b22;
  --sg-color-text: #c9d1d9;
}
```

---

## 3. Стилизовать только одну таблицу

### 3.1. Через `className` на корне

```tsx
<Table className="orders-table" ... />
```

```css
.orders-table {
  --sg-table-header-bg: #fafafa;
  --sg-table-row-hover-bg: #fff4e5;
}
.orders-table .sg-table-th {
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
```

Внутри своего скоупа можно писать что угодно — хоть переопределять компонентные
токены (`--sg-table-*`), хоть цепляться к публичным слотам (`.sg-table-th`,
`.sg-table-td`, `.sg-table-row`).

### 3.2. Через `classNames` / `styles` (рекомендуемый путь)

```tsx
<Table
  classNames={{
    root: 'orders-table',
    toolbar: 'orders-table__toolbar',
    headerCell: 'orders-table__th',
    bodyCell: 'orders-table__td',
    row: 'orders-table__row',
    empty: 'orders-table__empty',
  }}
  styles={{
    headerCell: { fontSize: 16 },
  }}
  ...
/>
```

Классы и стили доезжают до ровно тех узлов, что описаны в контракте.
Ничего лишнего рендерить и стилизовать не требуется.

Полный список слотов — в `styling-contract.md` §4.

---

## 4. Покрасить строки и ячейки по условию

```tsx
<Table
  columns={[
    {
      key: 'status',
      title: 'Status',
      cellClassName: 'status-cell',
      render: (value) => <span className={`status-${value}`}>{value}</span>,
    },
  ]}
  rowClassName={(row) => (row.overdue ? 'row-overdue' : '')}
/>
```

```css
.row-overdue {
  background: var(--sg-color-error-bg);
}
.status-cell {
  font-weight: 600;
}
```

`rowClassName` и `column.cellClassName` — стабильные крючки контракта.
`!important` не нужен: достаточно специфичности корневого класса
(`.orders-table .row-overdue`).

---

## 5. Точечно поменять заголовок колонки

Вариант с классом (паритет с `cellClassName`):

```tsx
<Table
  columns={[
    { key: 'name', title: 'Name', headerClassName: 'th-name' },
    { key: 'age', title: 'Age' },
  ]}
/>
```

Вариант с произвольной разметкой:

```tsx
<Table
  columns={[
    {
      key: 'status',
      title: <span className="th-status">Status&nbsp;?</span>,
    },
  ]}
/>
```

---

## 6. Список: второй элемент другого цвета

```tsx
<List
  dataSource={items}
  rowClassName={(_, index) => (index === 1 ? 'list-item-featured' : '')}
  renderItem={(item) => <List.Item>{item.name}</List.Item>}
/>
```

```css
.list-item-featured {
  background: var(--sg-color-primary-bg);
}
```

Кроме `rowClassName`, доступны `classNames`/`styles` по слотам List
(`root`, `header`, `footer`, `items`, `item`, `empty`, `pagination`).

---

## 7. Свой CSS полностью (`unstyled`)

Если дефолтный вид не нужен — `unstyled` отключает стили библиотеки для
конкретного экземпляра. Семантика (роли, aria-атрибуты, табуляция) сохраняется.

```tsx
<Modal unstyled open onClose={close} className="my-modal">
  ...
</Modal>
```

```css
.my-modal {
  border: 1px solid hotpink;
  padding: 16px;
  background: white;
}
```

Работает на любом компоненте, у которого в пропах есть `unstyled`.

---

## 8. Когда чего хватит — в одной таблице

| Задача | Уровень | Что использовать |
|---|---|---|
| Сменить бренд, размер, радиусы везде | Токены | `:root` / `--sg-*` |
| Переключить тему | Токены | `data-sg-theme="dark"` |
| Стилизовать один компонент | `className` / `classNames` | корневой класс + слоты |
| Оформить строку или ячейку по условию | Крючки | `rowClassName`, `cellClassName`, `column.render` |
| Сделать компонент полностью своим | `unstyled` | `unstyled` + свой CSS |

---

## 9. Что стабильно, что нет

Опираться можно только на то, что заявлено в `styling-contract.md`:

- имена токенов из §3.1;
- корневые классы и ключи слотов из §4;
- пропы `className`, `style`, `classNames`, `styles`, `unstyled`;
- крючки вида `rowClassName`, `cellClassName`, `renderItem`, `render`;
- атрибут темы `data-sg-theme`.

Вложенность внутренних `div`-ов, порядок CSS-правил, вспомогательные
`data-sg-*`-атрибуты — внутреннее. Попытка цепляться за это = поломка
в ближайшем patch-релизе.
