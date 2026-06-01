import type { SgLocale } from '../types'

/** English (US) preset for {@link SgConfigProvider} `locale`. */
export const en_US: SgLocale = {
  modal: {
    okText: 'OK',
    cancelText: 'Cancel',
    closeAriaLabel: 'Close',
  },
  popconfirm: {
    okText: 'Yes',
    cancelText: 'No',
  },
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
  inputPassword: {
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    strengthWeak: 'Weak',
    strengthMedium: 'Medium',
    strengthStrong: 'Strong',
    strengthVeryStrong: 'Very strong',
  },
  searchInput: {
    placeholder: 'Search…',
    clear: 'Clear',
    search: 'Search',
  },
  tagInput: {
    placeholder: 'Add tag…',
    removeTag: 'Remove',
  },
  pinInput: {
    ariaLabel: 'PIN input',
  },
  inlineEdit: {
    placeholder: 'Click to edit…',
    save: 'Save',
    cancel: 'Cancel',
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
    month: 'Month',
    year: 'Year',
  },
  datePicker: {
    prevYear: 'Previous year',
    nextYear: 'Next year',
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
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
  cascader: {
    searchPlaceholder: 'Search...',
    noMatches: 'No matches',
    clear: 'Clear',
    removeTag: 'Remove',
  },
  treeSelect: {
    searchPlaceholder: 'Search...',
    noMatches: 'No matches',
  },
  tree: {
    clearSearch: 'Clear search',
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
  diagram: {
    ariaLabel: 'Diagram',
  },
  dataGrid: {
    selectAllRows: 'Select all rows',
    selectRow: 'Select row',
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
  list: {
    loading: 'Loading',
  },
  table: {
    selectAll: 'Select all',
  },
  input: {
    clear: 'Clear',
  },
  colorPicker: {
    pickColor: 'Pick color',
  },
}
