import type { SgLocale } from '../types/locale'

/** Portuguese (Brazil) locale preset for {@link ConfigProvider}. */
export const pt_BR: SgLocale = {
  empty: {
    description: 'Sem dados',
  },
  pagination: {
    totalPrefix: 'Total',
    itemsPerPage: '/ página',
    jump: 'Ir para',
    page: 'página',
    ariaLabel: 'Paginação',
  },
  popconfirm: {
    okText: 'Sim',
    cancelText: 'Não',
  },
  modal: {
    okText: 'OK',
    cancelText: 'Cancelar',
    closeAriaLabel: 'Fechar',
  },
  form: {
    required: '*',
    optional: '(opcional)',
    submitText: 'Enviar',
    resetText: 'Redefinir',
  },
  upload: {
    uploadText: 'Enviar',
    removeFile: 'Remover arquivo',
    uploadError: 'Falha no envio',
    previewFile: 'Visualizar',
    uploadAriaLabel: 'Enviar arquivo',
  },
  transfer: {
    titles: ['Origem', 'Destino'],
    searchPlaceholder: 'Buscar',
    itemUnit: 'item',
    itemsUnit: 'itens',
    notFoundContent: 'Não encontrado',
    selectAll: 'Selecionar tudo',
    deselectAll: 'Desmarcar tudo',
  },
  calendar: {
    monthNames: [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro',
    ],
    dayNames: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
    today: 'Hoje',
    now: 'Agora',
    week: 'Sem',
    prevYear: 'Ano anterior',
    nextYear: 'Próximo ano',
    prevMonth: 'Mês anterior',
    nextMonth: 'Próximo mês',
  },
  input: {
    clear: 'Limpar',
  },
  inputPassword: {
    showPassword: 'Mostrar senha',
    hidePassword: 'Ocultar senha',
  },
  searchInput: {
    clear: 'Limpar',
  },
  inlineEdit: {
    save: 'Salvar',
    cancel: 'Cancelar',
  },
  tagInput: {
    removeTag: (tag) => `Remover ${tag}`,
  },
  drawer: {
    closeAriaLabel: 'Fechar',
  },
  notification: {
    closeAriaLabel: 'Fechar',
  },
  tag: {
    closeAriaLabel: 'Fechar',
  },
  spin: {
    loading: 'Carregando',
  },
  skeleton: {
    loading: 'Carregando',
  },
  breadcrumb: {
    ariaLabel: 'Trilha de navegação',
  },
  carousel: {
    slide: (index) => `Slide ${index}`,
  },
  rate: {
    ariaLabel: 'Avaliação',
    star: (n) => `${n} estrela${n > 1 ? 's' : ''}`,
  },
  charts: {
    lineChart: 'Gráfico de linhas',
    barChart: 'Gráfico de barras',
    areaChart: 'Gráfico de área',
    pieChart: 'Gráfico de pizza',
    legend: 'Legenda do gráfico',
    actions: 'Ações do gráfico',
  },
  datePicker: {
    prevYear: 'Ano anterior',
    nextYear: 'Próximo ano',
    prevMonth: 'Mês anterior',
    nextMonth: 'Próximo mês',
  },
  cascader: {
    searchPlaceholder: 'Buscar...',
    noMatches: 'Nenhuma correspondência',
  },
  treeSelect: {
    searchPlaceholder: 'Buscar...',
    noMatches: 'Nenhuma correspondência',
  },
  dashboard: {
    ariaLabel: 'Painel',
    editorAriaLabel: 'Editor de painel',
    resizeWidget: 'Redimensionar widget',
    widgetActions: 'Ações do widget',
  },
  gantt: {
    ariaLabel: 'Gráfico de Gantt',
    resizeTask: 'Redimensionar tarefa',
  },
  resourceCalendar: {
    ariaLabel: 'Calendário de recursos',
    resource: (name) => `Recurso ${name}`,
    capacity: (n) => `capacidade ${n} por intervalo`,
    resizeStart: 'Redimensionar início',
    resizeEnd: 'Redimensionar fim',
    conflictSuffix: ' (conflito)',
  },
  timeline: {
    ariaLabel: 'Linha do tempo',
  },
  schemaFormEditor: {
    undo: 'Desfazer',
    redo: 'Refazer',
    removeOption: 'Remover opção',
    schemaView: 'JSON Schema gerado',
    optionLabelPlaceholder: 'Rótulo',
    optionValuePlaceholder: 'Valor',
    moveFieldUp: 'Mover campo para cima',
    moveFieldDown: 'Mover campo para baixo',
    duplicateField: 'Duplicar campo',
    deleteField: 'Excluir campo',
  },
  table: {
    emptyText: 'Sem dados',
    searchPlaceholder: 'Buscar...',
  },
  dataGrid: {
    noData: 'Sem dados',
    selectAll: 'Selecionar tudo',
  },
  tree: {
    emptyText: 'Sem dados',
    searchPlaceholder: 'Buscar...',
    clearSearch: 'Limpar busca',
  },
  list: {
    loading: 'Carregando',
  },
  diagram: {
    ariaLabel: 'Diagrama',
  },
  colorPicker: {
    pickColor: 'Escolher cor',
  },
  pinInput: {
    ariaLabel: 'Entrada de PIN',
  },
}
