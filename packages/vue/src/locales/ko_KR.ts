import type { SgLocale } from '../types'

/** Korean (South Korea) preset for {@link SgConfigProvider} `locale`. */
export const ko_KR: SgLocale = {
  modal: {
    okText: '확인',
    cancelText: '취소',
    closeAriaLabel: '닫기',
  },
  popconfirm: {
    okText: '예',
    cancelText: '아니오',
  },
  empty: {
    description: '데이터 없음',
  },
  pagination: {
    totalPrefix: '합계',
    itemsPerPage: '/ 페이지',
    jump: '이동',
    page: '페이지',
    ariaLabel: '페이지네이션',
  },
  inputPassword: {
    showPassword: '비밀번호 표시',
    hidePassword: '비밀번호 숨기기',
    strengthWeak: '약함',
    strengthMedium: '보통',
    strengthStrong: '강함',
    strengthVeryStrong: '매우 강함',
  },
  searchInput: {
    placeholder: '검색…',
    clear: '지우기',
    search: '검색',
  },
  tagInput: {
    placeholder: '태그 추가…',
    removeTag: '삭제',
  },
  pinInput: {
    ariaLabel: 'PIN 입력',
  },
  inlineEdit: {
    placeholder: '클릭하여 편집…',
    save: '저장',
    cancel: '취소',
  },
  calendar: {
    monthNames: [
      '1월',
      '2월',
      '3월',
      '4월',
      '5월',
      '6월',
      '7월',
      '8월',
      '9월',
      '10월',
      '11월',
      '12월',
    ],
    dayNames: ['일', '월', '화', '수', '목', '금', '토'],
    today: '오늘',
    now: '지금',
    week: '주',
    prevYear: '이전 해',
    nextYear: '다음 해',
    prevMonth: '이전 달',
    nextMonth: '다음 달',
    month: '월',
    year: '년',
  },
  datePicker: {
    prevYear: '이전 해',
    nextYear: '다음 해',
    prevMonth: '이전 달',
    nextMonth: '다음 달',
  },
  form: {
    required: '*',
    optional: '(선택)',
    submitText: '제출',
    resetText: '초기화',
  },
  upload: {
    uploadText: '업로드',
    removeFile: '파일 삭제',
    uploadError: '업로드 실패',
    previewFile: '미리보기',
    uploadAriaLabel: '파일 업로드',
  },
  transfer: {
    titles: ['원본', '대상'],
    searchPlaceholder: '검색',
    itemUnit: '개',
    itemsUnit: '개',
    notFoundContent: '없음',
    selectAll: '전체 선택',
    deselectAll: '전체 선택 해제',
  },
  drawer: {
    closeAriaLabel: '닫기',
  },
  notification: {
    closeAriaLabel: '닫기',
  },
  tag: {
    closeAriaLabel: '닫기',
  },
  spin: {
    loading: '로딩 중',
  },
  skeleton: {
    loading: '로딩 중',
  },
  breadcrumb: {
    ariaLabel: '경로 탐색',
  },
  carousel: {
    slide: (index) => `슬라이드 ${index}`,
  },
  rate: {
    ariaLabel: '평점',
    star: (n) => `별 ${n}개`,
  },
  charts: {
    lineChart: '선 차트',
    barChart: '막대 차트',
    areaChart: '영역 차트',
    pieChart: '원형 차트',
    legend: '차트 범례',
    actions: '차트 작업',
  },
  cascader: {
    searchPlaceholder: '검색...',
    noMatches: '일치 항목 없음',
    clear: '지우기',
    removeTag: '삭제',
  },
  treeSelect: {
    searchPlaceholder: '검색...',
    noMatches: '일치 항목 없음',
  },
  tree: {
    clearSearch: '검색 지우기',
  },
  dashboard: {
    ariaLabel: '대시보드',
    editorAriaLabel: '대시보드 편집기',
    resizeWidget: '위젯 크기 조정',
    widgetActions: '위젯 작업',
  },
  gantt: {
    ariaLabel: '간트 차트',
    resizeTask: '작업 크기 조정',
  },
  resourceCalendar: {
    ariaLabel: '리소스 캘린더',
    resource: (name) => `리소스 ${name}`,
    capacity: (n) => `슬롯당 용량 ${n}`,
    resizeStart: '시작 크기 조정',
    resizeEnd: '종료 크기 조정',
    conflictSuffix: ' (충돌)',
  },
  timeline: {
    ariaLabel: '타임라인',
  },
  diagram: {
    ariaLabel: '다이어그램',
  },
  dataGrid: {
    selectAllRows: '모든 행 선택',
    selectRow: '행 선택',
  },
  schemaFormEditor: {
    undo: '실행 취소',
    redo: '다시 실행',
    removeOption: '옵션 삭제',
    schemaView: '생성된 JSON 스키마',
    optionLabelPlaceholder: '레이블',
    optionValuePlaceholder: '값',
    moveFieldUp: '필드 위로 이동',
    moveFieldDown: '필드 아래로 이동',
    duplicateField: '필드 복제',
    deleteField: '필드 삭제',
  },
  list: {
    loading: '로딩 중',
  },
  table: {
    selectAll: '전체 선택',
  },
  input: {
    clear: '지우기',
  },
  colorPicker: {
    pickColor: '색상 선택',
  },
}
