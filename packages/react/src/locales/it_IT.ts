import type { SgLocale } from '../types/locale'

/** Italian (Italy) locale preset for {@link ConfigProvider}. */
export const it_IT: SgLocale = {
  empty: {
    description: 'Nessun dato',
  },
  pagination: {
    totalPrefix: 'Totale',
    itemsPerPage: '/ pagina',
    jump: 'Vai a',
    page: 'pagina',
    ariaLabel: 'Paginazione',
  },
  popconfirm: {
    okText: 'Sì',
    cancelText: 'No',
  },
  modal: {
    okText: 'OK',
    cancelText: 'Annulla',
    closeAriaLabel: 'Chiudi',
  },
  form: {
    required: '*',
    optional: '(facoltativo)',
    submitText: 'Invia',
    resetText: 'Reimposta',
  },
  upload: {
    uploadText: 'Carica',
    removeFile: 'Rimuovi file',
    uploadError: 'Caricamento non riuscito',
    previewFile: 'Anteprima',
    uploadAriaLabel: 'Carica file',
  },
  transfer: {
    titles: ['Origine', 'Destinazione'],
    searchPlaceholder: 'Cerca',
    itemUnit: 'elemento',
    itemsUnit: 'elementi',
    notFoundContent: 'Non trovato',
    selectAll: 'Seleziona tutto',
    deselectAll: 'Deseleziona tutto',
  },
  calendar: {
    monthNames: [
      'Gennaio',
      'Febbraio',
      'Marzo',
      'Aprile',
      'Maggio',
      'Giugno',
      'Luglio',
      'Agosto',
      'Settembre',
      'Ottobre',
      'Novembre',
      'Dicembre',
    ],
    dayNames: ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'],
    today: 'Oggi',
    now: 'Adesso',
    week: 'Set',
    prevYear: 'Anno precedente',
    nextYear: 'Anno successivo',
    prevMonth: 'Mese precedente',
    nextMonth: 'Mese successivo',
  },
  input: {
    clear: 'Cancella',
  },
  inputPassword: {
    showPassword: 'Mostra password',
    hidePassword: 'Nascondi password',
  },
  searchInput: {
    clear: 'Cancella',
  },
  inlineEdit: {
    save: 'Salva',
    cancel: 'Annulla',
  },
  tagInput: {
    removeTag: (tag) => `Rimuovi ${tag}`,
  },
  drawer: {
    closeAriaLabel: 'Chiudi',
  },
  notification: {
    closeAriaLabel: 'Chiudi',
  },
  tag: {
    closeAriaLabel: 'Chiudi',
  },
  spin: {
    loading: 'Caricamento',
  },
  skeleton: {
    loading: 'Caricamento',
  },
  breadcrumb: {
    ariaLabel: 'Percorso di navigazione',
  },
  carousel: {
    slide: (index) => `Diapositiva ${index}`,
  },
  rate: {
    ariaLabel: 'Valutazione',
    star: (n) => `${n} ${n > 1 ? 'stelle' : 'stella'}`,
  },
  charts: {
    lineChart: 'Grafico a linee',
    barChart: 'Grafico a barre',
    areaChart: 'Grafico ad area',
    pieChart: 'Grafico a torta',
    legend: 'Legenda del grafico',
    actions: 'Azioni del grafico',
  },
  datePicker: {
    prevYear: 'Anno precedente',
    nextYear: 'Anno successivo',
    prevMonth: 'Mese precedente',
    nextMonth: 'Mese successivo',
  },
  cascader: {
    searchPlaceholder: 'Cerca...',
    noMatches: 'Nessuna corrispondenza',
  },
  treeSelect: {
    searchPlaceholder: 'Cerca...',
    noMatches: 'Nessuna corrispondenza',
  },
  dashboard: {
    ariaLabel: 'Dashboard',
    editorAriaLabel: 'Editor dashboard',
    resizeWidget: 'Ridimensiona widget',
    widgetActions: 'Azioni widget',
  },
  gantt: {
    ariaLabel: 'Diagramma di Gantt',
    resizeTask: 'Ridimensiona attività',
  },
  resourceCalendar: {
    ariaLabel: 'Calendario risorse',
    resource: (name) => `Risorsa ${name}`,
    capacity: (n) => `capacità ${n} per slot`,
    resizeStart: 'Ridimensiona inizio',
    resizeEnd: 'Ridimensiona fine',
    conflictSuffix: ' (conflitto)',
  },
  timeline: {
    ariaLabel: 'Cronologia',
  },
  schemaFormEditor: {
    undo: 'Annulla',
    redo: 'Ripeti',
    removeOption: 'Rimuovi opzione',
    schemaView: 'JSON Schema generato',
    optionLabelPlaceholder: 'Etichetta',
    optionValuePlaceholder: 'Valore',
    moveFieldUp: 'Sposta campo su',
    moveFieldDown: 'Sposta campo giù',
    duplicateField: 'Duplica campo',
    deleteField: 'Elimina campo',
  },
  table: {
    emptyText: 'Nessun dato',
    searchPlaceholder: 'Cerca...',
  },
  dataGrid: {
    noData: 'Nessun dato',
    selectAll: 'Seleziona tutto',
  },
  tree: {
    emptyText: 'Nessun dato',
    searchPlaceholder: 'Cerca...',
    clearSearch: 'Cancella ricerca',
  },
  list: {
    loading: 'Caricamento',
  },
  diagram: {
    ariaLabel: 'Diagramma',
  },
  colorPicker: {
    pickColor: 'Scegli colore',
  },
  pinInput: {
    ariaLabel: 'Inserimento PIN',
  },
}
