import type { SgLocale } from '../types/locale'

/**
 * Spanish (es-ES) locale preset for {@link ConfigProvider}.
 *
 * Mirrors the structure of {@link en_US}; values translated for general
 * UI use. Identifiers, `sg-*` class names and unicode glyphs are not
 * translated (see CHARTER §10).
 */
export const es_ES: SgLocale = {
  empty: {
    description: 'Sin datos',
  },
  pagination: {
    totalPrefix: 'Total',
    itemsPerPage: '/ pág.',
    jump: 'Ir a',
    page: 'pág.',
    ariaLabel: 'Paginación',
  },
  popconfirm: {
    okText: 'Sí',
    cancelText: 'No',
  },
  modal: {
    okText: 'Aceptar',
    cancelText: 'Cancelar',
    closeAriaLabel: 'Cerrar',
  },
  form: {
    required: '*',
    optional: '(opcional)',
    submitText: 'Enviar',
    resetText: 'Restablecer',
  },
  upload: {
    uploadText: 'Subir',
    removeFile: 'Eliminar archivo',
    uploadError: 'Error al subir',
    previewFile: 'Vista previa',
    uploadAriaLabel: 'Subir archivo',
  },
  transfer: {
    titles: ['Origen', 'Destino'],
    searchPlaceholder: 'Buscar',
    itemUnit: 'elemento',
    itemsUnit: 'elementos',
    notFoundContent: 'No encontrado',
    selectAll: 'Seleccionar todo',
    deselectAll: 'Deseleccionar todo',
  },
  calendar: {
    monthNames: [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ],
    dayNames: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'],
    today: 'Hoy',
    now: 'Ahora',
    week: 'Sem',
    prevYear: 'Año anterior',
    nextYear: 'Año siguiente',
    prevMonth: 'Mes anterior',
    nextMonth: 'Mes siguiente',
  },
  inputPassword: {
    showPassword: 'Mostrar contraseña',
    hidePassword: 'Ocultar contraseña',
  },
  searchInput: {
    clear: 'Limpiar',
  },
  inlineEdit: {
    save: 'Guardar',
    cancel: 'Cancelar',
  },
  tagInput: {
    removeTag: (tag) => `Eliminar ${tag}`,
  },
  drawer: {
    closeAriaLabel: 'Cerrar',
  },
  notification: {
    closeAriaLabel: 'Cerrar',
  },
  tag: {
    closeAriaLabel: 'Cerrar',
  },
  spin: {
    loading: 'Cargando',
  },
  skeleton: {
    loading: 'Cargando',
  },
  breadcrumb: {
    ariaLabel: 'Ruta de navegación',
  },
  carousel: {
    slide: (index) => `Diapositiva ${index}`,
  },
  rate: {
    ariaLabel: 'Calificación',
    star: (n) => `${n} estrella${n > 1 ? 's' : ''}`,
  },
  charts: {
    lineChart: 'Gráfico de líneas',
    barChart: 'Gráfico de barras',
    areaChart: 'Gráfico de áreas',
    pieChart: 'Gráfico circular',
    legend: 'Leyenda del gráfico',
    actions: 'Acciones del gráfico',
  },
  datePicker: {
    prevYear: 'Año anterior',
    nextYear: 'Año siguiente',
    prevMonth: 'Mes anterior',
    nextMonth: 'Mes siguiente',
  },
  cascader: {
    searchPlaceholder: 'Buscar...',
    noMatches: 'Sin coincidencias',
  },
  treeSelect: {
    searchPlaceholder: 'Buscar...',
    noMatches: 'Sin coincidencias',
  },
  dashboard: {
    ariaLabel: 'Panel',
    editorAriaLabel: 'Editor del panel',
    resizeWidget: 'Cambiar tamaño del widget',
    widgetActions: 'Acciones del widget',
  },
  gantt: {
    ariaLabel: 'Diagrama de Gantt',
    resizeTask: 'Cambiar duración de la tarea',
  },
  resourceCalendar: {
    ariaLabel: 'Calendario de recursos',
    resource: (name) => `Recurso ${name}`,
    capacity: (n) => `capacidad ${n} por franja`,
    resizeStart: 'Mover el inicio',
    resizeEnd: 'Mover el final',
    conflictSuffix: ' (conflicto)',
  },
  timeline: {
    ariaLabel: 'Línea de tiempo',
  },
  schemaFormEditor: {
    undo: 'Deshacer',
    redo: 'Rehacer',
    removeOption: 'Eliminar opción',
    schemaView: 'Esquema JSON generado',
    optionLabelPlaceholder: 'Etiqueta',
    optionValuePlaceholder: 'Valor',
    moveFieldUp: 'Mover campo arriba',
    moveFieldDown: 'Mover campo abajo',
    duplicateField: 'Duplicar campo',
    deleteField: 'Eliminar campo',
  },
}
