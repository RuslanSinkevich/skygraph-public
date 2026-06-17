import type { SgLocale } from '../types'

/** Japanese (Japan) preset for {@link SgConfigProvider} `locale`. */
export const ja_JP: SgLocale = {
  modal: {
    okText: 'OK',
    cancelText: 'キャンセル',
    closeAriaLabel: '閉じる',
  },
  popconfirm: {
    okText: 'はい',
    cancelText: 'いいえ',
  },
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
  inputPassword: {
    showPassword: 'パスワードを表示',
    hidePassword: 'パスワードを非表示',
    strengthWeak: '弱い',
    strengthMedium: '普通',
    strengthStrong: '強い',
    strengthVeryStrong: '非常に強い',
  },
  searchInput: {
    placeholder: '検索…',
    clear: 'クリア',
    search: '検索',
  },
  tagInput: {
    placeholder: 'タグを追加…',
    removeTag: '削除',
  },
  pinInput: {
    ariaLabel: 'PIN 入力',
  },
  inlineEdit: {
    placeholder: 'クリックして編集…',
    save: '保存',
    cancel: 'キャンセル',
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
    month: '月',
    year: '年',
  },
  datePicker: {
    prevYear: '前年',
    nextYear: '翌年',
    prevMonth: '前月',
    nextMonth: '翌月',
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
  cascader: {
    searchPlaceholder: '検索...',
    noMatches: '一致なし',
    clear: 'クリア',
    removeTag: '削除',
  },
  treeSelect: {
    searchPlaceholder: '検索...',
    noMatches: '一致なし',
  },
  tree: {
    clearSearch: '検索をクリア',
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
  diagram: {
    ariaLabel: '図',
  },
  dataGrid: {
    selectAllRows: '全行を選択',
    selectRow: '行を選択',
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
  list: {
    loading: '読み込み中',
  },
  table: {
    selectAll: 'すべて選択',
  },
  input: {
    clear: 'クリア',
  },
  colorPicker: {
    pickColor: '色を選択',
  },
}
