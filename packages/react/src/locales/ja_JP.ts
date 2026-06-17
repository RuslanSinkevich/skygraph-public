import type { SgLocale } from '../types/locale'

/** Japanese (Japan) locale preset for {@link ConfigProvider}. */
export const ja_JP: SgLocale = {
  empty: {
    description: 'データがありません',
  },
  pagination: {
    totalPrefix: '合計',
    itemsPerPage: '/ ページ',
    jump: '移動',
    page: 'ページ',
    ariaLabel: 'ページネーション',
  },
  popconfirm: {
    okText: 'はい',
    cancelText: 'いいえ',
  },
  modal: {
    okText: 'OK',
    cancelText: 'キャンセル',
    closeAriaLabel: '閉じる',
  },
  form: {
    required: '*',
    optional: '(任意)',
    submitText: '送信',
    resetText: 'リセット',
  },
  upload: {
    uploadText: 'アップロード',
    removeFile: 'ファイルを削除',
    uploadError: 'アップロードに失敗しました',
    previewFile: 'プレビュー',
    uploadAriaLabel: 'ファイルをアップロード',
  },
  transfer: {
    titles: ['ソース', 'ターゲット'],
    searchPlaceholder: '検索',
    itemUnit: '件',
    itemsUnit: '件',
    notFoundContent: '見つかりません',
    selectAll: 'すべて選択',
    deselectAll: 'すべて選択解除',
  },
  calendar: {
    monthNames: [
      '1月',
      '2月',
      '3月',
      '4月',
      '5月',
      '6月',
      '7月',
      '8月',
      '9月',
      '10月',
      '11月',
      '12月',
    ],
    dayNames: ['日', '月', '火', '水', '木', '金', '土'],
    today: '今日',
    now: '現在',
    week: '週',
    prevYear: '前年',
    nextYear: '翌年',
    prevMonth: '前月',
    nextMonth: '翌月',
  },
  input: {
    clear: 'クリア',
  },
  inputPassword: {
    showPassword: 'パスワードを表示',
    hidePassword: 'パスワードを非表示',
  },
  searchInput: {
    clear: 'クリア',
  },
  inlineEdit: {
    save: '保存',
    cancel: 'キャンセル',
  },
  tagInput: {
    removeTag: (tag) => `${tag} を削除`,
  },
  drawer: {
    closeAriaLabel: '閉じる',
  },
  notification: {
    closeAriaLabel: '閉じる',
  },
  tag: {
    closeAriaLabel: '閉じる',
  },
  spin: {
    loading: '読み込み中',
  },
  skeleton: {
    loading: '読み込み中',
  },
  breadcrumb: {
    ariaLabel: 'パンくずリスト',
  },
  carousel: {
    slide: (index) => `スライド ${index}`,
  },
  rate: {
    ariaLabel: '評価',
    star: (n) => `${n} つ星`,
  },
  charts: {
    lineChart: '折れ線グラフ',
    barChart: '棒グラフ',
    areaChart: 'エリアグラフ',
    pieChart: '円グラフ',
    legend: '凡例',
    actions: 'グラフ操作',
  },
  datePicker: {
    prevYear: '前年',
    nextYear: '翌年',
    prevMonth: '前月',
    nextMonth: '翌月',
  },
  cascader: {
    searchPlaceholder: '検索...',
    noMatches: '一致なし',
  },
  treeSelect: {
    searchPlaceholder: '検索...',
    noMatches: '一致なし',
  },
  dashboard: {
    ariaLabel: 'ダッシュボード',
    editorAriaLabel: 'ダッシュボードエディター',
    resizeWidget: 'ウィジェットのサイズ変更',
    widgetActions: 'ウィジェット操作',
  },
  gantt: {
    ariaLabel: 'ガントチャート',
    resizeTask: 'タスクのサイズ変更',
  },
  resourceCalendar: {
    ariaLabel: 'リソースカレンダー',
    resource: (name) => `リソース ${name}`,
    capacity: (n) => `スロットあたりの容量 ${n}`,
    resizeStart: '開始をサイズ変更',
    resizeEnd: '終了をサイズ変更',
    conflictSuffix: '（競合）',
  },
  timeline: {
    ariaLabel: 'タイムライン',
  },
  schemaFormEditor: {
    undo: '元に戻す',
    redo: 'やり直し',
    removeOption: 'オプションを削除',
    schemaView: '生成された JSON スキーマ',
    optionLabelPlaceholder: 'ラベル',
    optionValuePlaceholder: '値',
    moveFieldUp: 'フィールドを上へ',
    moveFieldDown: 'フィールドを下へ',
    duplicateField: 'フィールドを複製',
    deleteField: 'フィールドを削除',
  },
  table: {
    emptyText: 'データがありません',
    searchPlaceholder: '検索...',
  },
  dataGrid: {
    noData: 'データがありません',
    selectAll: 'すべて選択',
  },
  tree: {
    emptyText: 'データがありません',
    searchPlaceholder: '検索...',
    clearSearch: '検索をクリア',
  },
  list: {
    loading: '読み込み中',
  },
  diagram: {
    ariaLabel: '図',
  },
  colorPicker: {
    pickColor: '色を選択',
  },
  pinInput: {
    ariaLabel: 'PIN 入力',
  },
}
