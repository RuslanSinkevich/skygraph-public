import type { SgLocale } from '../types/locale'

/**
 * English (US) locale preset for {@link ConfigProvider}.
 *
 * Covers the strings consumed by all React-adapter components: hidden
 * helper aria-labels, button tooltips, placeholders, modal/drawer/notification
 * close buttons, chart aria roles, date-picker / calendar navigation,
 * dashboard / gantt / resource-calendar / timeline accessibility names,
 * and schema-form-editor toolbar.
 */
export const en_US: SgLocale = {
  empty: {
    description: 'No Data',
  },
  pagination: {
    totalPrefix: 'Total',
    itemsPerPage: '/ page',
    jump: 'Go to',
    page: 'page',
    ariaLabel: 'Pagination',
  },
  popconfirm: {
    okText: 'Yes',
    cancelText: 'No',
  },
  modal: {
    okText: 'OK',
    cancelText: 'Cancel',
    closeAriaLabel: 'Close',
  },
  form: {
    required: '*',
    optional: '(optional)',
    submitText: 'Submit',
    resetText: 'Reset',
  },
  upload: {
    uploadText: 'Upload',
    removeFile: 'Remove file',
    uploadError: 'Upload failed',
    previewFile: 'Preview',
    uploadAriaLabel: 'Upload file',
  },
  transfer: {
    titles: ['Source', 'Target'],
    searchPlaceholder: 'Search',
    itemUnit: 'item',
    itemsUnit: 'items',
    notFoundContent: 'Not found',
    selectAll: 'Select all',
    deselectAll: 'Deselect all',
  },
  calendar: {
    monthNames: [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
    dayNames: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
    today: 'Today',
    now: 'Now',
    week: 'W',
    prevYear: 'Previous year',
    nextYear: 'Next year',
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
  },
  input: {
    clear: 'Clear',
  },
  inputPassword: {
    showPassword: 'Show password',
    hidePassword: 'Hide password',
  },
  searchInput: {
    clear: 'Clear',
  },
  inlineEdit: {
    save: 'Save',
    cancel: 'Cancel',
  },
  tagInput: {
    removeTag: (tag) => `Remove ${tag}`,
  },
  drawer: {
    closeAriaLabel: 'Close',
  },
  notification: {
    closeAriaLabel: 'Close',
  },
  tag: {
    closeAriaLabel: 'Close',
  },
  spin: {
    loading: 'Loading',
  },
  skeleton: {
    loading: 'Loading',
  },
  breadcrumb: {
    ariaLabel: 'Breadcrumb',
  },
  carousel: {
    slide: (index) => `Slide ${index}`,
  },
  rate: {
    ariaLabel: 'Rating',
    star: (n) => `${n} star${n > 1 ? 's' : ''}`,
  },
  charts: {
    lineChart: 'Line chart',
    barChart: 'Bar chart',
    areaChart: 'Area chart',
    pieChart: 'Pie chart',
    legend: 'Chart legend',
    actions: 'Chart actions',
  },
  datePicker: {
    prevYear: 'Previous year',
    nextYear: 'Next year',
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
  },
  cascader: {
    searchPlaceholder: 'Search...',
    noMatches: 'No matches',
  },
  treeSelect: {
    searchPlaceholder: 'Search...',
    noMatches: 'No matches',
  },
  dashboard: {
    ariaLabel: 'Dashboard',
    editorAriaLabel: 'Dashboard editor',
    resizeWidget: 'Resize widget',
    widgetActions: 'Widget actions',
  },
  gantt: {
    ariaLabel: 'Gantt chart',
    resizeTask: 'Resize task',
  },
  resourceCalendar: {
    ariaLabel: 'Resource calendar',
    resource: (name) => `Resource ${name}`,
    capacity: (n) => `capacity ${n} per slot`,
    resizeStart: 'Resize start',
    resizeEnd: 'Resize end',
    conflictSuffix: ' (conflict)',
  },
  timeline: {
    ariaLabel: 'Timeline',
  },
  schemaFormEditor: {
    undo: 'Undo',
    redo: 'Redo',
    removeOption: 'Remove option',
    schemaView: 'Generated JSON Schema',
    optionLabelPlaceholder: 'Label',
    optionValuePlaceholder: 'Value',
    moveFieldUp: 'Move field up',
    moveFieldDown: 'Move field down',
    duplicateField: 'Duplicate field',
    deleteField: 'Delete field',
  },
}
