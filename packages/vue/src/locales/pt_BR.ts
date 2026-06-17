import type { SgLocale } from '../types'

/** Portuguese (Brazil) preset for {@link SgConfigProvider} `locale`. */
export const pt_BR: SgLocale = {
  modal: {
    okText: 'OK',
    cancelText: 'Cancelar',
    closeAriaLabel: 'Fechar',
  },
  popconfirm: {
    okText: 'Sim',
    cancelText: 'Não',
  },
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
  inputPassword: {
    showPassword: 'Mostrar senha',
    hidePassword: 'Ocultar senha',
    strengthWeak: 'Fraca',
    strengthMedium: 'Média',
    strengthStrong: 'Forte',
    strengthVeryStrong: 'Muito forte',
  },
  searchInput: {
    placeholder: 'Buscar…',
    clear: 'Limpar',
    search: 'Buscar',
  },
  tagInput: {
    placeholder: 'Adicionar tag…',
    removeTag: 'Remover',
  },
  pinInput: {
    ariaLabel: 'Entrada de PIN',
  },
  inlineEdit: {
    placeholder: 'Clique para editar…',
    save: 'Salvar',
    cancel: 'Cancelar',
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
    month: 'Mês',
    year: 'Ano',
  },
  datePicker: {
    prevYear: 'Ano anterior',
    nextYear: 'Próximo ano',
    prevMonth: 'Mês anterior',
    nextMonth: 'Próximo mês',
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
  cascader: {
    searchPlaceholder: 'Buscar...',
    noMatches: 'Nenhuma correspondência',
    clear: 'Limpar',
    removeTag: 'Remover',
  },
  treeSelect: {
    searchPlaceholder: 'Buscar...',
    noMatches: 'Nenhuma correspondência',
  },
  tree: {
    clearSearch: 'Limpar busca',
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
  diagram: {
    ariaLabel: 'Diagrama',
  },
  dataGrid: {
    selectAllRows: 'Selecionar todas as linhas',
    selectRow: 'Selecionar linha',
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
  list: {
    loading: 'Carregando',
  },
  table: {
    selectAll: 'Selecionar tudo',
  },
  input: {
    clear: 'Limpar',
  },
  colorPicker: {
    pickColor: 'Escolher cor',
  },
}
