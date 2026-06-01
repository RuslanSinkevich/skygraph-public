import type { SgLocale } from '../types'

/** German (de-DE) preset for {@link SgConfigProvider} `locale`. */
export const de_DE: SgLocale = {
  modal: {
    okText: 'OK',
    cancelText: 'Abbrechen',
    closeAriaLabel: 'Schließen',
  },
  popconfirm: {
    okText: 'Ja',
    cancelText: 'Nein',
  },
  empty: {
    description: 'Keine Daten',
  },
  pagination: {
    totalPrefix: 'Gesamt',
    itemsPerPage: ' / Seite',
    jump: 'Gehe zu',
    page: 'Seite',
    ariaLabel: 'Seitennavigation',
  },
  inputPassword: {
    showPassword: 'Passwort anzeigen',
    hidePassword: 'Passwort verbergen',
    strengthWeak: 'Schwach',
    strengthMedium: 'Mittel',
    strengthStrong: 'Stark',
    strengthVeryStrong: 'Sehr stark',
  },
  searchInput: {
    placeholder: 'Suchen…',
    clear: 'Leeren',
    search: 'Suchen',
  },
  tagInput: {
    placeholder: 'Tag hinzufügen…',
    removeTag: 'Entfernen',
  },
  pinInput: {
    ariaLabel: 'PIN-Eingabe',
  },
  inlineEdit: {
    placeholder: 'Klicken zum Bearbeiten…',
    save: 'Speichern',
    cancel: 'Abbrechen',
  },
  calendar: {
    monthNames: [
      'Januar',
      'Februar',
      'März',
      'April',
      'Mai',
      'Juni',
      'Juli',
      'August',
      'September',
      'Oktober',
      'November',
      'Dezember',
    ],
    dayNames: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
    today: 'Heute',
    now: 'Jetzt',
    week: 'KW',
    prevYear: 'Vorheriges Jahr',
    nextYear: 'Nächstes Jahr',
    prevMonth: 'Vorheriger Monat',
    nextMonth: 'Nächster Monat',
    month: 'Monat',
    year: 'Jahr',
  },
  datePicker: {
    prevYear: 'Vorheriges Jahr',
    nextYear: 'Nächstes Jahr',
    prevMonth: 'Vorheriger Monat',
    nextMonth: 'Nächster Monat',
  },
  form: {
    required: '*',
    optional: '(optional)',
    submitText: 'Senden',
    resetText: 'Zurücksetzen',
  },
  upload: {
    uploadText: 'Hochladen',
    removeFile: 'Datei entfernen',
    uploadError: 'Hochladen fehlgeschlagen',
    previewFile: 'Vorschau',
    uploadAriaLabel: 'Datei hochladen',
  },
  transfer: {
    titles: ['Quelle', 'Ziel'],
    searchPlaceholder: 'Suchen',
    itemUnit: 'Element',
    itemsUnit: 'Elemente',
    notFoundContent: 'Nicht gefunden',
    selectAll: 'Alle auswählen',
    deselectAll: 'Auswahl aufheben',
  },
  drawer: {
    closeAriaLabel: 'Schließen',
  },
  notification: {
    closeAriaLabel: 'Schließen',
  },
  tag: {
    closeAriaLabel: 'Schließen',
  },
  spin: {
    loading: 'Wird geladen',
  },
  skeleton: {
    loading: 'Wird geladen',
  },
  breadcrumb: {
    ariaLabel: 'Brotkrümelnavigation',
  },
  carousel: {
    slide: (index) => `Folie ${index}`,
  },
  rate: {
    ariaLabel: 'Bewertung',
    star: (n) => `${n} ${n === 1 ? 'Stern' : 'Sterne'}`,
  },
  charts: {
    lineChart: 'Liniendiagramm',
    barChart: 'Balkendiagramm',
    areaChart: 'Flächendiagramm',
    pieChart: 'Tortendiagramm',
    legend: 'Diagrammlegende',
    actions: 'Diagrammaktionen',
  },
  cascader: {
    searchPlaceholder: 'Suchen...',
    noMatches: 'Keine Treffer',
    clear: 'Leeren',
    removeTag: 'Entfernen',
  },
  treeSelect: {
    searchPlaceholder: 'Suchen...',
    noMatches: 'Keine Treffer',
  },
  tree: {
    clearSearch: 'Suche leeren',
  },
  dashboard: {
    ariaLabel: 'Dashboard',
    editorAriaLabel: 'Dashboard-Editor',
    resizeWidget: 'Widget-Größe ändern',
    widgetActions: 'Widget-Aktionen',
  },
  gantt: {
    ariaLabel: 'Gantt-Diagramm',
    resizeTask: 'Aufgabendauer ändern',
  },
  resourceCalendar: {
    ariaLabel: 'Ressourcenkalender',
    resource: (name) => `Ressource ${name}`,
    capacity: (n) => `Kapazität ${n} pro Slot`,
    resizeStart: 'Anfang verschieben',
    resizeEnd: 'Ende verschieben',
    conflictSuffix: ' (Konflikt)',
  },
  timeline: {
    ariaLabel: 'Zeitleiste',
  },
  diagram: {
    ariaLabel: 'Diagramm',
  },
  dataGrid: {
    selectAllRows: 'Alle Zeilen auswählen',
    selectRow: 'Zeile auswählen',
  },
  schemaFormEditor: {
    undo: 'Rückgängig',
    redo: 'Wiederholen',
    removeOption: 'Option entfernen',
    schemaView: 'Generiertes JSON-Schema',
    optionLabelPlaceholder: 'Bezeichnung',
    optionValuePlaceholder: 'Wert',
    moveFieldUp: 'Feld nach oben verschieben',
    moveFieldDown: 'Feld nach unten verschieben',
    duplicateField: 'Feld duplizieren',
    deleteField: 'Feld löschen',
  },
  list: {
    loading: 'Wird geladen',
  },
  table: {
    selectAll: 'Alle auswählen',
  },
  input: {
    clear: 'Leeren',
  },
  colorPicker: {
    pickColor: 'Farbe auswählen',
  },
}
