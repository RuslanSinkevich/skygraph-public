import type { SgLocale } from '../types'

/** Chinese (Simplified, zh-CN) preset for {@link SgConfigProvider} `locale`. */
export const zh_CN: SgLocale = {
  modal: {
    okText: '确定',
    cancelText: '取消',
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
  },
  datePicker: {
    prevYear: '上一年',
    nextYear: '下一年',
    prevMonth: '上个月',
    nextMonth: '下个月',
  },
}
