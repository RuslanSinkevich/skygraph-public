import type { SgLocale } from '../types'

/** Русская локаль для {@link SgConfigProvider} `locale`. */
export const ru_RU: SgLocale = {
  modal: {
    okText: 'ОК',
    cancelText: 'Отмена',
  },
  popconfirm: {
    okText: 'Да',
    cancelText: 'Нет',
  },
  empty: {
    description: 'Нет данных',
  },
  pagination: {
    totalPrefix: 'Всего',
    itemsPerPage: ' / стр.',
    jump: 'Перейти',
    page: 'стр.',
  },
  inputPassword: {
    showPassword: 'Показать пароль',
    hidePassword: 'Скрыть пароль',
    strengthWeak: 'Слабый',
    strengthMedium: 'Средний',
    strengthStrong: 'Сильный',
    strengthVeryStrong: 'Очень сильный',
  },
  searchInput: {
    placeholder: 'Поиск…',
    clear: 'Очистить',
    search: 'Найти',
  },
  tagInput: {
    placeholder: 'Добавить тег…',
    removeTag: 'Удалить',
  },
  pinInput: {
    ariaLabel: 'Ввод PIN-кода',
  },
  inlineEdit: {
    placeholder: 'Нажмите для редактирования…',
    save: 'Сохранить',
    cancel: 'Отмена',
  },
  calendar: {
    monthNames: [
      'Январь',
      'Февраль',
      'Март',
      'Апрель',
      'Май',
      'Июнь',
      'Июль',
      'Август',
      'Сентябрь',
      'Октябрь',
      'Ноябрь',
      'Декабрь',
    ],
    dayNames: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
    today: 'Сегодня',
    now: 'Сейчас',
    week: 'Нед',
    prevYear: 'Предыдущий год',
    nextYear: 'Следующий год',
    prevMonth: 'Предыдущий месяц',
    nextMonth: 'Следующий месяц',
  },
  datePicker: {
    prevYear: 'Предыдущий год',
    nextYear: 'Следующий год',
    prevMonth: 'Предыдущий месяц',
    nextMonth: 'Следующий месяц',
  },
}
