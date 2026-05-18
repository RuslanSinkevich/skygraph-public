import type { SgLocale } from '../types/locale'

/**
 * Russian (RU) locale preset for {@link ConfigProvider}.
 */
export const ru_RU: SgLocale = {
  empty: {
    description: 'Нет данных',
  },
  pagination: {
    totalPrefix: 'Всего',
    itemsPerPage: '/ стр.',
    jump: 'Перейти',
    page: 'стр.',
    ariaLabel: 'Постраничная навигация',
  },
  popconfirm: {
    okText: 'Да',
    cancelText: 'Нет',
  },
  modal: {
    okText: 'OK',
    cancelText: 'Отмена',
    closeAriaLabel: 'Закрыть',
  },
  form: {
    required: '*',
    optional: '(необязательно)',
    submitText: 'Отправить',
    resetText: 'Сбросить',
  },
  upload: {
    uploadText: 'Загрузить',
    removeFile: 'Удалить файл',
    uploadError: 'Ошибка загрузки',
    previewFile: 'Просмотр',
    uploadAriaLabel: 'Загрузить файл',
  },
  transfer: {
    titles: ['Источник', 'Цель'],
    searchPlaceholder: 'Поиск',
    itemUnit: 'элемент',
    itemsUnit: 'элементов',
    notFoundContent: 'Ничего не найдено',
    selectAll: 'Выбрать все',
    deselectAll: 'Снять выделение',
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
  inputPassword: {
    showPassword: 'Показать пароль',
    hidePassword: 'Скрыть пароль',
  },
  searchInput: {
    clear: 'Очистить',
  },
  inlineEdit: {
    save: 'Сохранить',
    cancel: 'Отмена',
  },
  tagInput: {
    removeTag: (tag) => `Удалить ${tag}`,
  },
  drawer: {
    closeAriaLabel: 'Закрыть',
  },
  notification: {
    closeAriaLabel: 'Закрыть',
  },
  tag: {
    closeAriaLabel: 'Закрыть',
  },
  spin: {
    loading: 'Загрузка',
  },
  skeleton: {
    loading: 'Загрузка',
  },
  breadcrumb: {
    ariaLabel: 'Хлебные крошки',
  },
  carousel: {
    slide: (index) => `Слайд ${index}`,
  },
  rate: {
    ariaLabel: 'Рейтинг',
    star: (n) => `${n} ${n === 1 ? 'звезда' : n < 5 ? 'звезды' : 'звёзд'}`,
  },
  charts: {
    lineChart: 'Линейная диаграмма',
    barChart: 'Столбчатая диаграмма',
    areaChart: 'Диаграмма с областями',
    pieChart: 'Круговая диаграмма',
    legend: 'Легенда',
    actions: 'Действия с диаграммой',
  },
  datePicker: {
    prevYear: 'Предыдущий год',
    nextYear: 'Следующий год',
    prevMonth: 'Предыдущий месяц',
    nextMonth: 'Следующий месяц',
  },
  cascader: {
    searchPlaceholder: 'Поиск...',
    noMatches: 'Совпадений не найдено',
  },
  treeSelect: {
    searchPlaceholder: 'Поиск...',
    noMatches: 'Совпадений не найдено',
  },
  dashboard: {
    ariaLabel: 'Дашборд',
    editorAriaLabel: 'Редактор дашборда',
    resizeWidget: 'Изменить размер виджета',
    widgetActions: 'Действия виджета',
  },
  gantt: {
    ariaLabel: 'Диаграмма Ганта',
    resizeTask: 'Изменить длительность задачи',
  },
  resourceCalendar: {
    ariaLabel: 'Календарь ресурсов',
    resource: (name) => `Ресурс ${name}`,
    capacity: (n) => `${n} на слот`,
    resizeStart: 'Изменить начало',
    resizeEnd: 'Изменить конец',
    conflictSuffix: ' (конфликт)',
  },
  timeline: {
    ariaLabel: 'Хронология',
  },
  schemaFormEditor: {
    undo: 'Отменить',
    redo: 'Повторить',
    removeOption: 'Удалить опцию',
    schemaView: 'Сгенерированная JSON-схема',
    optionLabelPlaceholder: 'Подпись',
    optionValuePlaceholder: 'Значение',
    moveFieldUp: 'Переместить вверх',
    moveFieldDown: 'Переместить вниз',
    duplicateField: 'Дублировать поле',
    deleteField: 'Удалить поле',
  },
}
