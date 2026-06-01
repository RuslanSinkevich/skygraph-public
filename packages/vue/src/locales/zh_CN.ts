import type { SgLocale } from '../types'

/** Chinese (Simplified, zh-CN) preset for {@link SgConfigProvider} `locale`. */
export const zh_CN: SgLocale = {
  modal: {
    okText: '确定',
    cancelText: '取消',
    closeAriaLabel: '关闭',
  },
  popconfirm: {
    okText: '确定',
    cancelText: '取消',
  },
  empty: {
    description: '暂无数据',
  },
  pagination: {
    totalPrefix: '共',
    itemsPerPage: ' 条/页',
    jump: '跳至',
    page: '页',
    ariaLabel: '分页',
  },
  inputPassword: {
    showPassword: '显示密码',
    hidePassword: '隐藏密码',
    strengthWeak: '弱',
    strengthMedium: '中',
    strengthStrong: '强',
    strengthVeryStrong: '非常强',
  },
  searchInput: {
    placeholder: '搜索…',
    clear: '清除',
    search: '搜索',
  },
  tagInput: {
    placeholder: '添加标签…',
    removeTag: '删除',
  },
  pinInput: {
    ariaLabel: 'PIN 输入',
  },
  inlineEdit: {
    placeholder: '点击编辑…',
    save: '保存',
    cancel: '取消',
  },
  calendar: {
    monthNames: [
      '一月',
      '二月',
      '三月',
      '四月',
      '五月',
      '六月',
      '七月',
      '八月',
      '九月',
      '十月',
      '十一月',
      '十二月',
    ],
    dayNames: ['日', '一', '二', '三', '四', '五', '六'],
    today: '今天',
    now: '此刻',
    week: '周',
    prevYear: '上一年',
    nextYear: '下一年',
    prevMonth: '上个月',
    nextMonth: '下个月',
    month: '月',
    year: '年',
  },
  datePicker: {
    prevYear: '上一年',
    nextYear: '下一年',
    prevMonth: '上个月',
    nextMonth: '下个月',
  },
  form: {
    required: '*',
    optional: '（可选）',
    submitText: '提交',
    resetText: '重置',
  },
  upload: {
    uploadText: '上传',
    removeFile: '删除文件',
    uploadError: '上传失败',
    previewFile: '预览',
    uploadAriaLabel: '上传文件',
  },
  transfer: {
    titles: ['源', '目标'],
    searchPlaceholder: '搜索',
    itemUnit: '项',
    itemsUnit: '项',
    notFoundContent: '未找到',
    selectAll: '全选',
    deselectAll: '取消全选',
  },
  drawer: {
    closeAriaLabel: '关闭',
  },
  notification: {
    closeAriaLabel: '关闭',
  },
  tag: {
    closeAriaLabel: '关闭',
  },
  spin: {
    loading: '加载中',
  },
  skeleton: {
    loading: '加载中',
  },
  breadcrumb: {
    ariaLabel: '面包屑',
  },
  carousel: {
    slide: (index) => `第 ${index} 张`,
  },
  rate: {
    ariaLabel: '评分',
    star: (n) => `${n} 星`,
  },
  charts: {
    lineChart: '折线图',
    barChart: '柱状图',
    areaChart: '面积图',
    pieChart: '饼图',
    legend: '图例',
    actions: '图表操作',
  },
  cascader: {
    searchPlaceholder: '搜索...',
    noMatches: '无匹配项',
    clear: '清除',
    removeTag: '删除',
  },
  treeSelect: {
    searchPlaceholder: '搜索...',
    noMatches: '无匹配项',
  },
  tree: {
    clearSearch: '清除搜索',
  },
  dashboard: {
    ariaLabel: '仪表板',
    editorAriaLabel: '仪表板编辑器',
    resizeWidget: '调整组件大小',
    widgetActions: '组件操作',
  },
  gantt: {
    ariaLabel: '甘特图',
    resizeTask: '调整任务时长',
  },
  resourceCalendar: {
    ariaLabel: '资源日历',
    resource: (name) => `资源 ${name}`,
    capacity: (n) => `每槽 ${n}`,
    resizeStart: '调整开始',
    resizeEnd: '调整结束',
    conflictSuffix: '（冲突）',
  },
  timeline: {
    ariaLabel: '时间线',
  },
  diagram: {
    ariaLabel: '图表',
  },
  dataGrid: {
    selectAllRows: '全选',
    selectRow: '选择行',
  },
  schemaFormEditor: {
    undo: '撤销',
    redo: '重做',
    removeOption: '删除选项',
    schemaView: '生成的 JSON Schema',
    optionLabelPlaceholder: '标签',
    optionValuePlaceholder: '值',
    moveFieldUp: '上移字段',
    moveFieldDown: '下移字段',
    duplicateField: '复制字段',
    deleteField: '删除字段',
  },
  list: {
    loading: '加载中',
  },
  table: {
    selectAll: '全选',
  },
  input: {
    clear: '清除',
  },
  colorPicker: {
    pickColor: '选择颜色',
  },
}
