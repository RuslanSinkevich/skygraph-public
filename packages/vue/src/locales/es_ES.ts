import type { SgLocale } from '../types'

/** Spanish (es-ES) preset for {@link SgConfigProvider} `locale`. */
export const es_ES: SgLocale = {
  modal: {
    okText: 'Aceptar',
    cancelText: 'Cancelar',
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
  },
  datePicker: {
    prevYear: 'Año anterior',
    nextYear: 'Año siguiente',
    prevMonth: 'Mes anterior',
    nextMonth: 'Mes siguiente',
  },
}
