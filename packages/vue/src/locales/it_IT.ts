import type { SgLocale } from '../types'

/** Italian (Italy) preset for {@link SgConfigProvider} `locale`. */
export const it_IT: SgLocale = {
  modal: {
    okText: 'OK',
    cancelText: 'Annulla',
    closeAriaLabel: 'Chiudi',
  },
  popconfirm: {
    okText: 'Sì',
    cancelText: 'No',
  },
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
  inputPassword: {
    showPassword: 'Mostra password',
    hidePassword: 'Nascondi password',
    strengthWeak: 'Debole',
    strengthMedium: 'Media',
    strengthStrong: 'Forte',
    strengthVeryStrong: 'Molto forte',
  },
  searchInput: {
    placeholder: 'Cerca…',
    clear: 'Cancella',
    search: 'Cerca',
  },
  tagInput: {
    placeholder: 'Aggiungi tag…',
    removeTag: 'Rimuovi',
  },
  pinInput: {
    ariaLabel: 'Inserimento PIN',
  },
  inlineEdit: {
    placeholder: 'Clicca per modificare…',
    save: 'Salva',
    cancel: 'Annulla',
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
    month: 'Mese',
    year: 'Anno',
  },
  datePicker: {
    prevYear: 'Anno precedente',
    nextYear: 'Anno successivo',
    prevMonth: 'Mese precedente',
    nextMonth: 'Mese successivo',
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
  cascader: {
    searchPlaceholder: 'Cerca...',
    noMatches: 'Nessuna corrispondenza',
    clear: 'Cancella',
    removeTag: 'Rimuovi',
  },
  treeSelect: {
    searchPlaceholder: 'Cerca...',
    noMatches: 'Nessuna corrispondenza',
  },
  tree: {
    clearSearch: 'Cancella ricerca',
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
  diagram: {
    ariaLabel: 'Diagramma',
  },
  dataGrid: {
    selectAllRows: 'Seleziona tutte le righe',
    selectRow: 'Seleziona riga',
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
  list: {
    loading: 'Caricamento',
  },
  table: {
    selectAll: 'Seleziona tutto',
  },
  input: {
    clear: 'Cancella',
  },
  colorPicker: {
    pickColor: 'Scegli colore',
  },
}
