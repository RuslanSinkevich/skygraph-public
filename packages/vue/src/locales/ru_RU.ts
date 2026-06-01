import type { SgLocale } from '../types'

/** Русская локаль для {@link SgConfigProvider} `locale`. */
export const ru_RU: SgLocale = {
  modal: {
    okText: 'ОК',
    cancelText: 'Отмена',
    closeAriaLabel: 'Закрыть',
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
    ariaLabel: 'Постраничная навигация',
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
    month: 'Месяц',
    year: 'Год',
  },
  datePicker: {
    prevYear: 'Предыдущий год',
    nextYear: 'Следующий год',
    prevMonth: 'Предыдущий месяц',
    nextMonth: 'Следующий месяц',
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
  cascader: {
    searchPlaceholder: 'Поиск...',
    noMatches: 'Совпадений не найдено',
    clear: 'Очистить',
    removeTag: 'Удалить',
  },
  treeSelect: {
    searchPlaceholder: 'Поиск...',
    noMatches: 'Совпадений не найдено',
  },
  tree: {
    clearSearch: 'Очистить поиск',
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
  diagram: {
    ariaLabel: 'Диаграмма',
  },
  dataGrid: {
    selectAllRows: 'Выбрать все строки',
    selectRow: 'Выбрать строку',
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
  list: {
    loading: 'Загрузка',
  },
  table: {
    selectAll: 'Выбрать все',
  },
  input: {
    clear: 'Очистить',
  },
  colorPicker: {
    pickColor: 'Выбрать цвет',
  },
}
