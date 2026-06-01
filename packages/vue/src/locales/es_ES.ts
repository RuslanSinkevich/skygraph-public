import type { SgLocale } from '../types'

/** Spanish (es-ES) preset for {@link SgConfigProvider} `locale`. */
export const es_ES: SgLocale = {
  modal: {
    okText: 'Aceptar',
    cancelText: 'Cancelar',
    closeAriaLabel: 'Cerrar',
  },
  popconfirm: {
    okText: 'Sí',
    cancelText: 'No',
  },
  empty: {
    description: 'Sin datos',
  },
  pagination: {
    totalPrefix: 'Total',
    itemsPerPage: ' / pág.',
    jump: 'Ir a',
    page: 'pág.',
    ariaLabel: 'Paginación',
  },
  inputPassword: {
    showPassword: 'Mostrar contraseña',
    hidePassword: 'Ocultar contraseña',
    strengthWeak: 'Débil',
    strengthMedium: 'Medio',
    strengthStrong: 'Fuerte',
    strengthVeryStrong: 'Muy fuerte',
  },
  searchInput: {
    placeholder: 'Buscar…',
    clear: 'Limpiar',
    search: 'Buscar',
  },
  tagInput: {
    placeholder: 'Añadir etiqueta…',
    removeTag: 'Eliminar',
  },
  pinInput: {
    ariaLabel: 'Entrada de PIN',
  },
  inlineEdit: {
    placeholder: 'Haga clic para editar…',
    save: 'Guardar',
    cancel: 'Cancelar',
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
    month: 'Mes',
    year: 'Año',
  },
  datePicker: {
    prevYear: 'Año anterior',
    nextYear: 'Año siguiente',
    prevMonth: 'Mes anterior',
    nextMonth: 'Mes siguiente',
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
  cascader: {
    searchPlaceholder: 'Buscar...',
    noMatches: 'Sin coincidencias',
    clear: 'Limpiar',
    removeTag: 'Eliminar',
  },
  treeSelect: {
    searchPlaceholder: 'Buscar...',
    noMatches: 'Sin coincidencias',
  },
  tree: {
    clearSearch: 'Limpiar búsqueda',
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
  diagram: {
    ariaLabel: 'Diagrama',
  },
  dataGrid: {
    selectAllRows: 'Seleccionar todas las filas',
    selectRow: 'Seleccionar fila',
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
  list: {
    loading: 'Cargando',
  },
  table: {
    selectAll: 'Seleccionar todo',
  },
  input: {
    clear: 'Limpiar',
  },
  colorPicker: {
    pickColor: 'Elegir color',
  },
}
