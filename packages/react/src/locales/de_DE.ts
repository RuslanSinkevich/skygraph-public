import type { SgLocale } from '../types/locale'

/**
 * German (de-DE) locale preset for {@link ConfigProvider}.
 *
 * Mirrors the structure of {@link en_US}; values translated for general
 * UI use. Identifiers, `sg-*` class names and unicode glyphs are not
 * translated (see CHARTER §10).
 */
export const de_DE: SgLocale = {
  empty: {
    description: 'Keine Daten',
  },
  pagination: {
    totalPrefix: 'Gesamt',
    itemsPerPage: '/ Seite',
    jump: 'Gehe zu',
    page: 'Seite',
    ariaLabel: 'Seitennavigation',
  },
  popconfirm: {
    okText: 'Ja',
    cancelText: 'Nein',
  },
  modal: {
    okText: 'OK',
    cancelText: 'Abbrechen',
    closeAriaLabel: 'Schließen',
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
  },
  input: {
    clear: 'Leeren',
  },
  inputPassword: {
    showPassword: 'Passwort anzeigen',
    hidePassword: 'Passwort verbergen',
  },
  searchInput: {
    clear: 'Leeren',
  },
  inlineEdit: {
    save: 'Speichern',
    cancel: 'Abbrechen',
  },
  tagInput: {
    removeTag: (tag) => `${tag} entfernen`,
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
  datePicker: {
    prevYear: 'Vorheriges Jahr',
    nextYear: 'Nächstes Jahr',
    prevMonth: 'Vorheriger Monat',
    nextMonth: 'Nächster Monat',
  },
  cascader: {
    searchPlaceholder: 'Suchen...',
    noMatches: 'Keine Treffer',
  },
  treeSelect: {
    searchPlaceholder: 'Suchen...',
    noMatches: 'Keine Treffer',
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
}
