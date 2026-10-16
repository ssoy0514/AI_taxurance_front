<!--
  ════════════════════════════════════════════════════════════════════════
  [설명본] pages/sales/coaching-track.vue 를 이해하기 위한 주석 포함 사본입니다.
  실제 반영 파일은 pages/sales/coaching-track.vue (주석 없음) 이며, 이 파일은 내부망에 옮기지 않습니다.
  ※ pages/ 밖(docs/)에 두어 Nuxt 페이지(주소)로 잡히지 않게 했습니다.

  ■ 화면 흐름
    1) 선택 화면 (?mode=list)
       상품 선택 → 고객 정보(연령·성별·특이사항) → 특약 선택(분류 칩, 선택 특약만 보기, 더보기)
       → "맞춤 화법 생성하기" (submitFilter)
         - 준비 중 상품이면 준비 중 화면 (isComingSoon)
    2) 결과 화면 (?mode=view)
       상담 오프닝 → 탭[특약별 화법 | 예상 Q&A]
       데스크톱: 왼쪽 사이드바(고객 프로파일, 특약 추가/수정, 화법 업데이트) ※ 현재 "시험" CSS 로 숨김
       태블릿·모바일: 상단 요약(되돌아가기, 고객정보, 특약 목록)
    브라우저 뒤로/앞으로가기로 두 화면을 오간다. ?mode=view 로 바로 들어오면 결과 데이터가 없어 list 로 돌린다.

  ■ 데이터 흐름 (백엔드: asp-fc-search-back /coaching/*,  → /api 프록시)
    - 진입 시   GET  /coaching/map/product          → 상품 목록·상품코드 (fetchProductCodes)
                GET  /coaching/map/rider/{상품코드}  → 화면 특약 목록·특약코드 (fetchRiders)
                실패하면 utils/coachingTrackData.ts 정적 데이터로 동작
    - 생성 시   POST /coaching/riders/resolve        → 지심검 지급사유 (resolveRiders)
                POST /coaching/generate/stats | scripts | qna (동시 요청, 도착하는 대로 표시)

  ■ 파일 구성
    <script>   Options API (data → computed → watch → created/mounted/beforeDestroy → methods)
    <template> 선택 화면 / 준비 중 화면 / 결과 화면
    <style>    00~12 legacy(원본 코칭트랙 디자인) → 20~25 adapter(.app-root 하위, 현재 디자인 토큰 --so-*)
               순서대로 덮어쓰는 구조. 맨 끝 "시험" 블록은 데스크톱 결과 사이드바 숨김.
  ════════════════════════════════════════════════════════════════════════
-->
<script>
// [1006 수정] 다른 서비스(taxurance, design-bible)와 같은 Options API 구조로 정리.
// API는 $axios(/api 프록시 + 쿠키 세션 + 공통 에러 처리)로 호출하고,
// 세션(/auth/self/)은 auth 미들웨어가 페이지 진입 시 처리하므로 여기서 따로 부르지 않는다.
import { riders as staticRiders, READY_PRODUCTS } from '@/utils/coachingTrackData'

const DEFAULT_PRODUCT = '가족대표건강보험'

// 분류 칩 표시 순서. 목록에 없는 분류는 가나다순으로 뒤에 붙는다.
const CATEGORY_ORDER = [
  '암진단', '암치료', '순환계진단', '순환계치료',
  '수술', '입원', '입원/수술', '시니어', '재해', '사망/장해', '기타',
]

// 3열 미만 그리드에서 한 번에 보여 줄 특약 수
const RIDER_BATCH_SIZE = 10
// 결과 화면 상단 요약에서 접힘 상태로 보여 줄 특약 수
const SUMMARY_VISIBLE_RIDERS = 3

const BAR_COLORS = ['#2563eb', '#0891b2', '#6366f1', '#0d9488', '#7c3aed', '#1d4ed8']
const COMPARISON_COLORS = ['#2563eb', '#8b5cf6']

// 배열에 있으면 빼고, 없으면 넣은 새 배열을 돌려준다
function toggleItem(list, item) {
  return list.includes(item) ? list.filter((v) => v !== item) : [...list, item]
}

// 특약명을 「핵심어 + 상품표기」로 나눈다. 끝에 붙은 괄호만 상품표기로 본다.
function splitRiderName(name) {
  const m = name.match(/^(.*?)\s*\(([^()]*)\)\s*$/)
  if (!m || !m[1]) return { main: name, sub: '' }
  return { main: m[1], sub: m[2].split(',').map((x) => x.trim()).filter(Boolean).join(', ') }
}

export default {
  name: 'CoachingTrack',

  data() {
    return {
      // ── 화면 단계 ──
      isComingSoon: false, // 준비 중인 상품을 고른 경우 (mode=list 안에서만 보임)
      returningToEdit: false,

      // ── 선택 화면 ──
      // 처음엔 정적 데이터로 그렸다가, 특약 매핑 API(/coaching/map/rider) 응답이 오면 교체한다
      riders: staticRiders, // API(/coaching/map/rider) 응답 전·실패 시 대비용
      ridersFromApi: false, // 현재 특약 목록이 매핑 API 응답인지 (생성 시 지심검 조회 여부 결정)
      apiProducts: [], // 백엔드에 데이터가 준비된 상품명
      selectedProduct: DEFAULT_PRODUCT,
      filters: { age: '30대', gender: '남성', notes: '' }, // 입력 중인 고객 정보
      ageOptions: ['20대', '30대', '40대', '50대', '60대+'],
      genderOptions: ['남성', '여성'],
      ageSelectId: 'profile-age-select',
      selectedRiders: [],
      activeCategory: '전체',
      showSelectedOnly: false, // [1006 수정] 선택 특약만 보기
      categoryExpanded: false,
      categoryOverflow: false,
      riderGridHasThreeColumns: false,
      visibleRiderLimit: RIDER_BATCH_SIZE,

      // ── 상품/특약 코드 매핑 (generate 시 지급사유 조회용) ──
      productCodeByName: {}, // 상품명 → 앱 상품코드(jar_code)
      riderCodeByName: {}, // 특약명 → 앱 특약코드(jar_rd_code)

      // ── 결과 화면 ──
      isGenerating: false,
      generatedScript: null,
      // 결과는 생성 시점의 선택을 설명한다. 편집 중인 선택과 섞지 않는다.
      resultRiders: [],
      resultFilters: { age: '30대', gender: '남성', notes: '' }, // 생성 시점의 고객 정보
      resultConditionKey: '',
      activeTab: 'script', // 'script' | 'points'
      summaryExpanded: false,
      expandedScriptNames: [],
      expandedDescNames: [],
      expandedClaimNames: [],

      // ── 결과 화면 사이드바 특약 검색 ──
      sidebarSearchTerm: '',
      sidebarComboboxOpen: false,
      sidebarActiveIndex: -1,
      sidebarComposing: false,
      sidebarListboxId: 'sidebar-rider-search-listbox',

      // ── 토스트 ──
      toasts: [],

      COMPARISON_COLORS,
    }
  },

  computed: {
    // URL 쿼리 ?mode= 값. list=선택 화면, view=결과 화면 (taxurance/design-bible 과 같은 방식)
    currentMode() {
      return this.$route.query.mode || 'list'
    },
    // 화면 단계: 선택(list) / 준비 중 / 결과(view). 레이아웃 관찰 등 내부 로직에서 쓴다
    currentStep() {
      if (this.isComingSoon) return 'coming-soon'
      return this.currentMode === 'view' ? 'result' : 'selection'
    },

    // ── 상품/특약 ──
    // [1006 수정] 상품 API(/coaching/map/product) 결과를 우선 쓰고, 실패 시에만 정적 데이터에서 뽑는다.
    // (특약 목록이 한 상품의 API 응답으로 바뀌어도 드롭다운에서 다른 상품을 고를 수 있게)
    availableProducts() {
      if (this.apiProducts.length > 0) return this.apiProducts
      return [...new Set(staticRiders.map((r) => r.product ?? DEFAULT_PRODUCT))]
    },
    // 선택한 상품에 속한 특약만 추린 목록 (분류 칩·특약 그리드·사이드바 검색의 기준)
    productRiders() {
      return this.riders.filter((r) => (r.product ?? DEFAULT_PRODUCT) === this.selectedProduct)
    },
    // 선택한 상품이 화법 생성 가능한 상품인지. 상품 API 가 있으면 그 목록, 없으면 READY_PRODUCTS 로 판단 (false 면 준비 중 화면)
    isCurrentProductReady() {
      if (this.apiProducts.length > 0) return this.apiProducts.includes(this.selectedProduct)
      return READY_PRODUCTS.includes(this.selectedProduct)
    },
    // 선택한 특약 id 목록을 실제 특약 객체 목록으로 바꾼 것 (현재 상품 기준)
    selectedDataFull() {
      return this.productRiders.filter((r) => this.selectedRiders.includes(r.id))
    },

    // 연령과 성별이 모두 있어야 기준 문구를 보여 준다
    profileSummary() {
      const { age, gender } = this.filters
      return age && gender ? `${age} ${gender}` : ''
    },

    // ── 분류/특약 그리드 ──
    groupedRiders() {
      const groups = {}
      this.productRiders.forEach((rider) => {
        if (!groups[rider.category]) groups[rider.category] = []
        groups[rider.category].push(rider)
      })
      const rank = (cat) => {
        const i = CATEGORY_ORDER.indexOf(cat)
        return i === -1 ? CATEGORY_ORDER.length : i
      }
      return Object.keys(groups)
        .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
        .map((cat) => [cat, groups[cat]])
    },
    // 분류 칩과 "선택 특약만 보기" 를 적용한 특약 목록
    filteredRiders() {
      const pool = this.activeCategory === '전체'
        ? this.productRiders
        : (this.groupedRiders.find(([cat]) => cat === this.activeCategory)?.[1] ?? [])
      return this.showSelectedOnly ? pool.filter((r) => this.selectedRiders.includes(r.id)) : pool
    },
    // 실제로 그릴 특약 카드. 3열 이상이면 전부, 그보다 좁으면 RIDER_BATCH_SIZE 단위로 "더보기"
    visibleRiders() {
      return this.riderGridHasThreeColumns
        ? this.filteredRiders
        : this.filteredRiders.slice(0, this.visibleRiderLimit)
    },
    // "더보기" 로 아직 안 보이는 특약 수
    remainingRiderCount() {
      return Math.max(0, this.filteredRiders.length - this.visibleRiders.length)
    },
    // "더보기" 버튼을 보여줄지 (3열 미만이고 특약이 한 묶음보다 많을 때)
    showRiderLoadMore() {
      return !this.riderGridHasThreeColumns && this.filteredRiders.length > RIDER_BATCH_SIZE
    },
    // 선택 개수는 버튼이 아니라 별도 상태 텍스트로 알린다 (스크린리더용)
    selectionStatusText() {
      const count = this.selectedRiders.length
      return count === 0 ? '선택한 특약 없음' : `선택한 특약 ${count}개`
    },

    // ── 결과 화면 상단 요약 ──
    summaryRiders() {
      return this.selectedDataFull.map((r, i) => ({ id: r.id, no: i + 1, ...splitRiderName(r.name) }))
    },
    // 결과 화면 상단 요약에서 접혀 있을 때 숨겨지는 특약 수 ("N건 더보기")
    summaryHiddenCount() {
      return Math.max(0, this.summaryRiders.length - SUMMARY_VISIBLE_RIDERS)
    },
    // 되돌아가기 버튼의 접근 가능한 이름 (화면엔 "30대 남성"만 보임)
    summaryReturnLabel() {
      return `${this.filters.age} ${this.filters.gender}, 고객 정보와 특약 다시 선택하기`
    },

    // ── 결과 갱신 필요 여부 ──
    currentConditionKey() {
      return JSON.stringify({
        product: this.selectedProduct,
        filters: this.filters,
        riders: [...this.selectedRiders].sort(),
      })
    },
    // 결과를 만든 뒤 선택 조건(상품·고객정보·특약)이 바뀌었는지 → "화법 업데이트" 안내 노출
    resultNeedsUpdate() {
      return Boolean(this.resultConditionKey) && this.resultConditionKey !== this.currentConditionKey
    },

    // ── 상담 오프닝 ──
    consultationCategoryLabel() {
      const categories = [...new Set(this.resultRiders.map((r) => r.category).filter(Boolean))]
      if (categories.length === 0) return '선택한 보장'
      if (categories.length <= 3) return categories.join('·')
      return `${categories.slice(0, 3).join('·')} 등 ${categories.length}개 영역`
    },
    // API 응답을 해석하지 않는 page-local 상담 초안. 실제 보장 판단은 약관 확인에 맡긴다.
    consultationOpening() {
      const count = this.resultRiders.length
      const riderLabel = count > 0 ? `선택하신 ${count}개 특약` : '선택하신 특약'
      return `고객님, 오늘은 ${riderLabel}을 ${this.consultationCategoryLabel} 관점에서 함께 살펴보겠습니다. 보장을 하나씩 나열하기보다 먼저 가장 신경 쓰이는 상황을 확인하고, 각 특약이 언제 도움이 될 수 있는지와 꼭 확인할 조건을 차례로 설명드릴게요.`
    },

    // ── 예상 Q&A 특약별 묶음 ──
    qnaByRider() {
      const groups = new Map()
      for (const item of this.generatedScript?.qna ?? []) {
        const rider = item.rider ?? '기타'
        if (!groups.has(rider)) groups.set(rider, { rider, items: [] })
        groups.get(rider).items.push(item)
      }
      return [...groups.values()]
    },
    // 생성된 특약별 화법의 특약명 목록 (펼침 상태 정리용 watch 대상)
    riderScriptNames() {
      return this.generatedScript?.riderScripts.map((s) => s.name) ?? []
    },

    // ── 사이드바 특약 검색 ──
    // 현재 상품의 원본 순서를 유지하고, 이미 선택한 특약은 후보에서 제외한다
    sidebarCandidateRiders() {
      const query = this.sidebarSearchTerm.trim().toLocaleLowerCase('ko-KR')
      return this.productRiders.filter((rider) => {
        if (this.selectedRiders.includes(rider.id)) return false
        return !query || rider.name.toLocaleLowerCase('ko-KR').includes(query)
      })
    },
    // 키보드로 가리키는 검색 후보의 DOM id (aria-activedescendant 용)
    sidebarActiveOptionId() {
      const rider = this.sidebarCandidateRiders[this.sidebarActiveIndex]
      return rider ? this.sidebarOptionId(rider) : undefined
    },
    // 스크린리더에 읽어줄 검색 결과 개수 문구
    sidebarSearchStatus() {
      if (!this.sidebarComboboxOpen) return ''
      const count = this.sidebarCandidateRiders.length
      if (count === 0) return '일치하는 특약이 없습니다.'
      return this.sidebarSearchTerm.trim() ? `검색 결과 ${count}개` : `추가할 수 있는 특약 ${count}개`
    },
  },

  watch: {
    // 브라우저 뒤로/앞으로가기로 mode 가 바뀌면 화면 단계를 맞춘다
    currentMode(mode, prevMode) {
      if (mode === 'view') this.isComingSoon = false
      else if (prevMode === 'view') this.returningToEdit = true
    },
    // 상품을 바꾸면 선택·필터·검색을 처음 상태로 되돌리고 특약코드를 다시 조회한다
    selectedProduct() {
      this.selectedRiders = []
      this.activeCategory = '전체'
      this.showSelectedOnly = false
      this.visibleRiderLimit = RIDER_BATCH_SIZE
      this.sidebarSearchTerm = ''
      this.closeSidebarCombobox()
      this.fetchRiders()
    },
    // 범위를 바꾸면 새 결과의 첫 batch로 돌아간다
    activeCategory() {
      this.visibleRiderLimit = RIDER_BATCH_SIZE
    },
    // "선택 특약만 보기" 를 켜고 끌 때: 더보기 개수 초기화, 켜면 분류를 "전체" 로
    showSelectedOnly(on) {
      this.visibleRiderLimit = RIDER_BATCH_SIZE
      if (on) this.activeCategory = '전체'
    },
    // 선택이 모두 해제되면 선택 특약만 보기도 해제
    'selectedRiders.length'(count) {
      if (count === 0) this.showSelectedOnly = false
    },
    // 결과 화면에서 수정하러 돌아오면 선택한 특약부터 보여 준다
    returningToEdit(on) {
      if (!on) return
      this.activeCategory = '전체'
      if (this.selectedRiders.length > 0) this.showSelectedOnly = true
    },
    // 선택 화면을 떠나면 그리드/분류 관찰을 멈추고, 돌아오면 다시 잰다
    currentStep(step) {
      this.disconnectObservers()
      if (step !== 'selection') {
        this.riderGridHasThreeColumns = false
        return
      }
      this.$nextTick(this.observeSelectionLayout)
    },
    // 분류 목록이 바뀌면(상품 변경 등) 렌더 뒤에 다시 잰다
    'groupedRiders.length'() {
      this.$nextTick(this.measureCategoryOverflow)
    },
    // 새 결과에 존재하지 않는 특약의 펼침 상태가 남지 않게 정리한다
    riderScriptNames(names) {
      const available = new Set(names)
      this.expandedScriptNames = this.expandedScriptNames.filter((n) => available.has(n))
      this.expandedDescNames = this.expandedDescNames.filter((n) => available.has(n))
    },
    // 검색 후보 목록이 바뀌면(입력·선택 변경) 키보드 위치를 범위 안으로 맞춘다
    sidebarCandidateRiders() {
      if (this.sidebarComboboxOpen) this.syncSidebarActiveIndex(this.sidebarActiveIndex)
    },
  },

  created() {
    // 결과 데이터는 새로고침하면 사라지므로 결과 화면(mode=view)으로 바로 들어오면 선택 화면으로 돌린다
    if (this.$route.query.mode === 'view') {
      this.$router.replace({ query: { ...this.$route.query, mode: 'list' } })
    }
    // 반응형이 필요 없는 인스턴스 값
    this.riderGridRO = null
    this.categoryRO = null
    this.toastCounter = 0
  },

  mounted() {
    this.fetchProductCodes()
    this.$nextTick(this.observeSelectionLayout)
    document.addEventListener('pointerdown', this.handleSidebarPointerDown)
  },

  beforeDestroy() {
    this.disconnectObservers()
    document.removeEventListener('pointerdown', this.handleSidebarPointerDown)
  },

  methods: {
    // ── 토스트 ──
    showToast(message, type = 'info', duration = 4000) {
      const id = ++this.toastCounter
      this.toasts.push({ id, message, type })
      setTimeout(() => {
        this.toasts = this.toasts.filter((t) => t.id !== id)
      }, duration)
    },

    // ── 상품/특약 코드 조회 ──
    async fetchProductCodes() {
      try {
        const { items } = await this.$axios.get('/coaching/map/product')
        if (Array.isArray(items)) {
          this.apiProducts = items.map((item) => item.jar_nm)
          this.productCodeByName = Object.fromEntries(items.map((item) => [item.jar_nm, item.jar_code]))
        }
        await this.fetchRiders()
      } catch {
        // 실패하면 utils/coachingTrackData 의 정적 특약 + READY_PRODUCTS 로 동작
      }
    },
    // [1006 수정] 하드코딩된 상품코드(A01) 대신 선택한 상품의 코드로 특약 매핑을 조회
    // [1006 수정] 매핑 API 응답으로 화면 특약 목록 자체를 교체한다 (지급사유는 생성 시점에 지심검에서 받음).
    // 상품코드가 없거나 조회에 실패하면 정적 데이터(utils/coachingTrackData)로 대비한다.
    async fetchRiders() {
      const jarCode = this.productCodeByName[this.selectedProduct]
      try {
        if (!jarCode) throw new Error('상품코드 없음')
        const { items } = await this.$axios.get(`/coaching/map/rider/${jarCode}`)
        if (!Array.isArray(items) || items.length === 0) throw new Error('특약 매핑 없음')
        this.riders = items.map((item) => ({
          id: item.jar_rd_code,
          product: item.jar_nm,
          name: item.jar_rd_nm,
          category: item.category,
          description: '', // 생성 시 /coaching/riders/resolve 로 지심검 지급사유를 채운다
        }))
        this.riderCodeByName = Object.fromEntries(this.riders.map((r) => [r.name, r.id]))
        this.ridersFromApi = true
      } catch {
        this.riders = staticRiders
        this.riderCodeByName = {}
        this.ridersFromApi = false
      }
    },

    // ── 선택 화면 ──
    updateFilter(field, value) {
      this.filters = { ...this.filters, [field]: value }
    },
    // 분류 칩 클릭: 해당 분류로 필터하고 "선택 특약만 보기" 는 해제
    selectCategory(cat) {
      this.activeCategory = cat
      this.showSelectedOnly = false
    },
    // 분류 칩 줄이 넘칠 때 한 줄 ↔ 전체 펼치기 전환
    toggleCategoryExpand() {
      this.categoryExpanded = !this.categoryExpanded
    },
    // 특약 카드 클릭: 선택/해제 토글
    toggleRider(id) {
      this.selectedRiders = toggleItem(this.selectedRiders, id)
    },
    // 사이드바 칩의 × 버튼: 선택 해제
    removeRider(id) {
      this.selectedRiders = this.selectedRiders.filter((r) => r !== id)
    },
    // "더보기": 다음 RIDER_BATCH_SIZE 개를 더 보여준다
    showMoreRiders() {
      this.visibleRiderLimit = Math.min(this.filteredRiders.length, this.visibleRiderLimit + RIDER_BATCH_SIZE)
    },

    // ── 선택 화면 레이아웃 관찰 (특약 그리드 열 수, 분류 칩 넘침) ──
    observeSelectionLayout() {
      this.disconnectObservers()
      const { riderListEl, categoryRail } = this.$refs
      this.measureRiderGridColumns()
      this.measureCategoryOverflow()
      if (typeof ResizeObserver === 'undefined') return
      if (riderListEl) {
        this.riderGridRO = new ResizeObserver(() => this.measureRiderGridColumns())
        this.riderGridRO.observe(riderListEl)
      }
      if (categoryRail) {
        this.categoryRO = new ResizeObserver(() => this.measureCategoryOverflow())
        this.categoryRO.observe(categoryRail)
      }
    },
    // ResizeObserver 해제 (선택 화면을 떠날 때·컴포넌트 제거 시)
    disconnectObservers() {
      this.riderGridRO?.disconnect()
      this.categoryRO?.disconnect()
      this.riderGridRO = null
      this.categoryRO = null
    },
    // viewport 숫자를 추정하지 않고 실제 렌더된 grid track 수를 따른다
    measureRiderGridColumns() {
      const el = this.$refs.riderListEl
      if (!el) {
        this.riderGridHasThreeColumns = false
        return
      }
      const template = window.getComputedStyle(el).gridTemplateColumns.trim()
      const columnCount = template && template !== 'none' ? template.split(/\s+/).length : 1
      const nextHasThreeColumns = columnCount >= 3
      const previousHasThreeColumns = this.riderGridHasThreeColumns
      if (nextHasThreeColumns === previousHasThreeColumns) return

      // 열 수가 바뀌며 포커스가 있던 카드/버튼이 사라지면 목록으로 포커스를 옮긴다
      const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null
      const focusedCard = activeElement?.closest('.rider-card-large')
      const focusedCardIndex = focusedCard
        ? Array.from(el.querySelectorAll('.rider-card-large')).indexOf(focusedCard)
        : -1
      const shouldRestoreFocus =
        (!previousHasThreeColumns && nextHasThreeColumns && activeElement === this.$refs.riderLoadMoreBtn) ||
        (previousHasThreeColumns && !nextHasThreeColumns && focusedCardIndex >= this.visibleRiderLimit)

      this.riderGridHasThreeColumns = nextHasThreeColumns
      if (shouldRestoreFocus) {
        this.$nextTick(() => this.$refs.riderListEl?.focus({ preventScroll: true }))
      }
    },
    // 개수가 아니라 실제 rail 폭으로 넘침을 판단한다.
    // 펼친 상태에서는 wrap 이라 잠깐 한 줄로 되돌려 재고 원래대로 복구한다.
    measureCategoryOverflow() {
      const el = this.$refs.categoryRail
      if (!el) return
      const probing = this.categoryExpanded
      if (probing) el.classList.add('is-measuring')
      const over = el.scrollWidth > el.clientWidth + 1
      if (probing) el.classList.remove('is-measuring')
      this.categoryOverflow = over
      // 넘치지 않게 되면 접힌 상태로 돌아간다
      if (!over && this.categoryExpanded) this.categoryExpanded = false
    },
    // 선택한 칩이 보이도록 rail 안에서만 스크롤한다 (scrollIntoView 는 문서 전체가 움직임)
    revealCategoryChip(el) {
      const rail = this.$refs.categoryRail
      if (!rail || this.categoryExpanded || !(el instanceof HTMLElement)) return
      const railBox = rail.getBoundingClientRect()
      const chipBox = el.getBoundingClientRect()
      const startPad = 12
      const endPad = this.categoryOverflow ? 58 : 12
      if (chipBox.left < railBox.left + startPad) {
        rail.scrollLeft -= railBox.left + startPad - chipBox.left
      } else if (chipBox.right > railBox.right - endPad) {
        rail.scrollLeft += chipBox.right - (railBox.right - endPad)
      }
    },

    // ── 화면 전환 (taxurance 와 같이 ?mode=list|view 쿼리로 전환해 브라우저 뒤로가기를 지원) ──
    handleChangeView(view) {
      if (this.currentMode === view) return
      this.$router.push({ query: { ...this.$route.query, mode: view } })
    },
    // 결과/준비중 화면에서 특약 선택으로 돌아간다
    handleBackToSelection() {
      if (this.currentMode === 'view') {
        this.handleChangeView('list')
        return
      }
      this.isComingSoon = false
      this.returningToEdit = true
    },

    // ── 화법 생성 ──
    async submitFilter() {
      if (this.isGenerating) return
      if (this.selectedRiders.length === 0) {
        this.showToast('특약을 하나 이상 선택해 주세요.', 'error', 5000)
        return
      }
      if (!this.isCurrentProductReady) {
        this.isComingSoon = true
        return
      }
      if (this.currentMode !== 'view') this.activeTab = 'script'
      this.isComingSoon = false
      this.returningToEdit = false
      this.handleChangeView('view')
      this.resultRiders = this.selectedDataFull.map((rider) => ({ ...rider }))
      this.resultFilters = { ...this.filters }
      this.resultConditionKey = this.currentConditionKey
      this.expandedClaimNames = []
      this.expandedScriptNames = []
      this.expandedDescNames = []
      // 결과 화면으로 먼저 진입한 뒤 생성한다
      await this.generate()
    },
    // [1006 수정] 생성 API 에 넘길 특약(ResolvedRider) 목록을 만든다.
    // 매핑 API 특약이면 /coaching/riders/resolve 로 지심검 지급사유를 받아 그대로 넘기고,
    // 화면의 "지급사유 보기"에도 같은 결과를 표시한다. 지심검에 지급사유가 없는 특약은
    // has_reason=false 로 와서 백엔드가 화법 생성에서 뺀다.
    async resolveRiders() {
      const jarCode = this.productCodeByName[this.selectedProduct]
      if (this.ridersFromApi && jarCode) {
        try {
          const { riders } = await this.$axios.post('/coaching/riders/resolve', {
            jar_code: jarCode,
            jar_rd_codes: this.resultRiders.map((r) => r.id),
          })
          if (Array.isArray(riders)) {
            this.resultRiders = this.resultRiders.map((r) => ({
              ...r,
              description: riders.find((x) => x.jar_rd_code === r.id)?.description ?? '',
            }))
            return riders
          }
        } catch {
          // 지심검 조회 실패 시 아래 정적 방식으로 보낸다
        }
      }
      // 대비: 정적 지급사유를 넣어 보낸다. has_reason=true 로 보내야 화법 생성이 걸러내지 않는다.
      return this.resultRiders.map((r) => ({
        name: r.name,
        jar_rd_code: this.riderCodeByName[r.name] ?? '',
        category: r.category,
        description: r.description,
        has_reason: true,
      }))
    },
    // 통계·화법·Q&A 를 동시에 요청하고, 도착하는 대로 결과에 채운다.
    // 생성 중에는 submitFilter 가 막혀 있어 요청이 겹치지 않는다.
    async generate() {
      this.isGenerating = true
      this.generatedScript = { designSummary: undefined, riderScripts: [], qna: [] }

      const payload = { profile: { ...this.resultFilters }, riders: await this.resolveRiders() }

      // 통계·Q&A 는 실패해도 화법은 보여 주도록 조용히 넘긴다
      const statsP = this.$axios.post('/coaching/generate/stats', payload)
        .then((st) => {
          this.generatedScript = {
            ...this.generatedScript,
            designSummary: {
              highlights: st.highlights ?? [],
              statistics: st.statistics ?? [],
              tips: this.generatedScript.designSummary?.tips ?? [],
            },
          }
        })
        .catch(() => {})

      const scriptsP = this.$axios.post('/coaching/generate/scripts', payload)
        .then((s2) => {
          const prev = this.generatedScript.designSummary ?? { highlights: [], statistics: [] }
          this.generatedScript = {
            ...this.generatedScript,
            riderScripts: s2.riderScripts ?? [],
            designSummary: { ...prev, tips: s2.tips ?? [] },
          }
        })

      const qnaP = this.$axios.post('/coaching/generate/qna', payload)
        .then((s3) => {
          this.generatedScript = { ...this.generatedScript, qna: s3.qna ?? [] }
        })
        .catch(() => {})

      try {
        await Promise.all([statsP, scriptsP, qnaP])
      } catch (e) {
        const msg = e?.response?.data?.detail ?? e?.message ?? String(e)
        console.error('[coaching-track] 화법 생성 실패:', msg)
        this.showToast(`화법 생성에 실패했습니다: ${msg}`, 'error', 5000)
      } finally {
        this.isGenerating = false
      }
    },

    // ── 결과 화면 ──
    handleResultTabKeydown(event) {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
      event.preventDefault()
      if (event.key === 'Home') this.activeTab = 'script'
      else if (event.key === 'End') this.activeTab = 'points'
      else this.activeTab = this.activeTab === 'script' ? 'points' : 'script'
      this.$nextTick(() => document.getElementById(`result-tab-${this.activeTab}`)?.focus())
    },
    // 결과 화면 "특약별 화법" 아코디언 펼침/접힘
    toggleScript(name) {
      // 화법을 접으면 그 안의 지급사유도 함께 접는다
      if (this.expandedScriptNames.includes(name)) {
        this.expandedDescNames = this.expandedDescNames.filter((n) => n !== name)
      }
      this.expandedScriptNames = toggleItem(this.expandedScriptNames, name)
    },
    // 화법 안의 "지급사유 보기" 펼침/접힘
    toggleDesc(name) {
      this.expandedDescNames = toggleItem(this.expandedDescNames, name)
    },
    // 예상 Q&A 탭의 "지급사유 보기" 펼침/접힘
    toggleClaim(name) {
      this.expandedClaimNames = toggleItem(this.expandedClaimNames, name)
    },
    // 아코디언 버튼 DOM id (aria-controls / aria-labelledby 연결용)
    scriptTriggerId(index) {
      return `rider-script-trigger-${index}`
    },
    // 아코디언 패널 DOM id
    scriptPanelId(index) {
      return `rider-script-panel-${index}`
    },
    // 지급사유 영역 DOM id
    scriptDescriptionId(index) {
      return `rider-script-description-${index}`
    },
    // 지급사유 텍스트의 줄바꿈을 정리 (□, ※ 로 시작하는 항목 앞 줄바꿈만 유지)
    formatDesc(text) {
      return text.replace(/\n(?![□※])/g, ' ')
    },
    // 막대/비교 차트에서 최댓값 대비 비율(%)
    barWidth(item, chartData) {
      const max = Math.max(...chartData.map((d) => d.value), 1)
      return ((item.value / max) * 100).toFixed(1) + '%'
    },
    // 막대 차트 색 (순서대로 순환)
    barColor(index) {
      return BAR_COLORS[index % BAR_COLORS.length]
    },
    // 숫자 천 단위 콤마
    formatNumber(value) {
      return value.toLocaleString('ko-KR')
    },

    // ── 사이드바 특약 검색 (combobox) ──
    sidebarOptionId(rider) {
      return `sidebar-rider-option-${rider.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`
    },
    // 검색 후보에서 키보드로 가리키는 위치를 후보 범위 안으로 맞춘다
    syncSidebarActiveIndex(preferred = 0) {
      const last = this.sidebarCandidateRiders.length - 1
      this.sidebarActiveIndex = last < 0 ? -1 : Math.min(Math.max(preferred, 0), last)
    },
    // 키보드로 이동한 후보가 목록 스크롤 밖이면 보이게 스크롤
    revealSidebarActiveOption() {
      this.$nextTick(() => {
        const list = this.$refs.sidebarListbox
        const option = list?.children[this.sidebarActiveIndex]
        if (!list || !option) return
        const optionBottom = option.offsetTop + option.offsetHeight
        if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop
        else if (optionBottom > list.scrollTop + list.clientHeight) list.scrollTop = optionBottom - list.clientHeight
      })
    },
    // 검색창 포커스: 후보 목록 열기
    openSidebarCombobox() {
      this.sidebarComboboxOpen = true
      this.syncSidebarActiveIndex(Math.max(this.sidebarActiveIndex, 0))
    },
    // 후보 목록 닫기
    closeSidebarCombobox() {
      this.sidebarComboboxOpen = false
      this.sidebarActiveIndex = -1
    },
    // 검색어 입력: 목록을 열고 첫 후보를 가리킨다
    handleSidebarSearchInput() {
      this.sidebarComboboxOpen = true
      this.$nextTick(() => this.syncSidebarActiveIndex(0))
    },
    // 후보 선택: 특약을 추가하고 검색어를 비운 뒤 계속 검색할 수 있게 포커스 유지
    addSidebarRider(rider) {
      if (!this.selectedRiders.includes(rider.id)) this.selectedRiders.push(rider.id)
      this.sidebarSearchTerm = ''
      this.sidebarComboboxOpen = true
      this.$nextTick(() => {
        this.syncSidebarActiveIndex(0)
        this.$refs.sidebarSearchInput?.focus()
      })
    },
    // 검색창 키보드 조작: ↑↓ Home End 로 이동, Enter 로 추가, Esc 로 닫기 (한글 조합 중에는 무시)
    handleSidebarSearchKeydown(event) {
      if (event.isComposing || this.sidebarComposing) return

      if (event.key === 'Escape') {
        if (this.sidebarComboboxOpen) {
          event.preventDefault()
          this.closeSidebarCombobox()
        }
        return
      }

      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault()
        const wasClosed = !this.sidebarComboboxOpen
        if (wasClosed) this.openSidebarCombobox()
        const count = this.sidebarCandidateRiders.length
        if (count === 0) return
        if (event.key === 'Home' || (wasClosed && event.key === 'ArrowDown')) this.sidebarActiveIndex = 0
        else if (event.key === 'End' || (wasClosed && event.key === 'ArrowUp')) this.sidebarActiveIndex = count - 1
        else if (event.key === 'ArrowDown') this.sidebarActiveIndex = (this.sidebarActiveIndex + 1) % count
        else this.sidebarActiveIndex = (this.sidebarActiveIndex - 1 + count) % count
        this.revealSidebarActiveOption()
        return
      }

      if (event.key === 'Enter' && this.sidebarComboboxOpen && this.sidebarActiveIndex >= 0) {
        const rider = this.sidebarCandidateRiders[this.sidebarActiveIndex]
        if (rider) {
          event.preventDefault()
          this.addSidebarRider(rider)
        }
      }
    },
    // 검색창에서 포커스가 콤보박스 밖으로 나가면 목록 닫기
    handleSidebarSearchBlur() {
      this.$nextTick(() => {
        if (!this.$refs.sidebarComboboxRoot?.contains(document.activeElement)) this.closeSidebarCombobox()
      })
    },
    // 콤보박스 바깥을 클릭하면 목록 닫기
    handleSidebarPointerDown(event) {
      if (!(event.target instanceof Node) || this.$refs.sidebarComboboxRoot?.contains(event.target)) return
      this.closeSidebarCombobox()
    },
  },
}
</script>


<template>
  <div class="app-root">

    <!-- ── Toast ─────────────────────────────────────────────────────────── -->
    <div class="toast-container" role="status" aria-live="polite" aria-relevant="additions text">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="toast.type"
      >
        {{ toast.message }}
      </div>
    </div>

    <!-- ── Header ────────────────────────────────────────────────────────── -->
    <header class="header">
      <div class="service-bar">
        <div class="logo">
          <svg class="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M10.6 3.6a5.9 5.9 0 0 0-3.5 10.6c.5.4.9 1.1.9 1.8h5.2c0-.7.4-1.4.9-1.8a5.9 5.9 0 0 0-3.5-10.6Z" />
            <path d="M8.2 18.6h4.8" />
            <path d="M9.2 21h2.8" />
            <path d="m19.7 3.4.55 1.55 1.55.55-1.55.55-.55 1.55-.55-1.55-1.55-.55 1.55-.55.55-1.55Z" />
          </svg>
          <span class="logo-main">특약피터</span>
          <span class="header-tagline">영업 준비를 <strong>핏(fit)하게</strong></span>
        </div>
      </div>

      <!-- 화면별 되돌아가기는 헤더가 아니라 각 화면 안에 둔다.
           결과 화면은 상단 요약의 뒤로가기, coming-soon 은 카드 안 버튼이다 -->
    </header>

    <!-- ── STEP 1: Selection View ─────────────────────────────────────────── -->
    <div v-if="currentMode === 'list' && !isComingSoon" class="selection-view">

      <!-- 상품 선택 -->
      <div class="product-selector-bar">
        <div class="product-selector-heading">
          <div class="product-selector-title">상품을 선택해 주세요</div>
        </div>
        <select class="product-selector-select" aria-label="상품 선택" v-model="selectedProduct">
          <option v-for="p in availableProducts" :key="p" :value="p">{{ p }}</option>
        </select>
      </div>

      <!-- ProfileForm -->
      <div class="selection-header-section">
        <div class="card profile-card-step1">
            <div class="card-title">고객 정보</div>

            <section class="profile-selector">
              <div class="profile-selector__fields">
                <div class="profile-selector__field">
                  <select
                    :id="ageSelectId"
                    class="profile-selector__select"
                    aria-label="연령대"
                    :value="filters.age"
                    @change="updateFilter('age', $event.target.value)"
                  >
                    <option v-for="opt in ageOptions" :key="opt" :value="opt">{{ opt }}</option>
                  </select>
                </div>

                <fieldset class="profile-selector__group" aria-label="성별">
                  <div class="profile-segment">
                    <label v-for="opt in genderOptions" :key="opt" class="profile-segment__option">
                      <input
                        type="radio"
                        name="profile-gender"
                        :value="opt"
                        :checked="filters.gender === opt"
                        @change="updateFilter('gender', opt)"
                      />
                      <span class="profile-segment__surface">
                        <span class="profile-segment__indicator" aria-hidden="true">
                          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="3"
                               stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4.5 10.5l4 4 7-8" />
                          </svg>
                        </span>
                        <span>{{ opt }}</span>
                      </span>
                    </label>
                  </div>
                </fieldset>
              </div>

              <p class="profile-selector__result" role="status" aria-live="polite">
                <span v-if="profileSummary"><strong>{{ profileSummary }}</strong> 기준으로 맞춤 결과를 보여드려요.</span>
              </p>
            </section>

            <div class="profile-notes-row">
              <span class="field-label">특이사항</span>
              <input
                class="notes-input"
                placeholder="예시) 사무직, 고혈압 약 복용"
                :value="filters.notes"
                @input="updateFilter('notes', $event.target.value)"
                @click.stop
              />
            </div>
        </div>
      </div>

      <!-- RiderGrid -->
      <div>
        <!-- [1006 수정] 특약을 선택하면 맨 위에 '선택 특약만 보기' 체크 노출 -->
        <label v-if="selectedRiders.length > 0" class="selected-only-toggle">
          <input v-model="showSelectedOnly" type="checkbox" />
          <span>선택 특약만 보기 ({{ selectedRiders.length }}개)</span>
        </label>

        <div
          class="category-filter"
          :class="{ 'is-expanded': categoryExpanded, 'has-overflow': categoryOverflow }"
        >
          <div id="category-rail" ref="categoryRail" class="category-pills-wrap">
            <button
              class="cat-pill"
              :class="{ active: activeCategory === '전체' }"
              :aria-pressed="activeCategory === '전체' ? 'true' : 'false'"
              @click="selectCategory('전체'); revealCategoryChip($event.currentTarget)"
            >
              전체 <span class="cat-count">{{ productRiders.length }}</span>
            </button>
            <button
              v-for="[category, items] in groupedRiders"
              :key="category"
              class="cat-pill"
              :class="{ active: activeCategory === category }"
              :aria-pressed="activeCategory === category ? 'true' : 'false'"
              @click="selectCategory(category); revealCategoryChip($event.currentTarget)"
            >
              {{ category }} <span class="cat-count">{{ items.length }}</span>
            </button>
          </div>
          <button
            v-if="categoryOverflow"
            type="button"
            class="category-expand-toggle"
            aria-controls="category-rail"
            :aria-expanded="categoryExpanded ? 'true' : 'false'"
            :aria-label="categoryExpanded ? '필터 항목 한 줄로 접기' : '필터 항목 모두 펼치기'"
            @click="toggleCategoryExpand"
          >
            <svg class="category-expand-icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
              <path
                d="M5 8l5 5 5-5"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>

        <!-- 선택 개수는 보이는 문구가 아니라 상태 텍스트로 알린다.
             floating 버튼이 사라져도 이 자리는 항상 남아 있어야 알림이 이어진다 -->
        <p class="sr-only" role="status" aria-live="polite">{{ selectionStatusText }}</p>

        <div class="selection-main-grid">
          <div id="rider-selection-list" ref="riderListEl" tabindex="-1" class="rider-grid-large">
            <!-- RiderCard 인라인 -->
            <div
              v-for="rider in visibleRiders"
              :key="rider.id"
              class="rider-card-large"
              :class="{ selected: selectedRiders.includes(rider.id) }"
              @click="toggleRider(rider.id)"
            >
              <div class="rider-card-header">
                <input
                  type="checkbox"
                  class="rider-checkbox-large"
                  :checked="selectedRiders.includes(rider.id)"
                  :aria-label="rider.name"
                  @click.stop="toggleRider(rider.id)"
                />
              </div>
              <div class="rider-name-large">{{ rider.name }}</div>
            </div>
            <div v-if="filteredRiders.length === 0" style="padding: 20px; color: #94a3b8; text-align: center;">
              검색 결과가 없습니다.
            </div>
          </div>
          <button
            v-if="showRiderLoadMore"
            ref="riderLoadMoreBtn"
            type="button"
            class="rider-load-more"
            aria-controls="rider-selection-list"
            :aria-disabled="remainingRiderCount === 0 ? 'true' : 'false'"
            @click="remainingRiderCount > 0 && showMoreRiders()"
          >
            <span>{{ remainingRiderCount > 0 ? `전체 ${filteredRiders.length}개 더보기` : `전체 ${filteredRiders.length}개 표시됨` }}</span>
          </button>
        </div>
      </div>

      <div class="selection-footer">
        <button
          class="main-generate-btn"
          @click="submitFilter"
          :disabled="selectedRiders.length === 0"
        >
          맞춤 화법 생성하기 ({{ selectedRiders.length }}개)
        </button>
      </div>

    </div>

    <!-- ── STEP: Coming Soon ──────────────────────────────────────────────── -->
    <div v-else-if="isComingSoon" class="coming-soon-view">
      <div class="coming-soon-card">
        <div class="coming-soon-icon">🚧</div>
        <h2 class="coming-soon-title">준비 중인 상품입니다</h2>
        <p class="coming-soon-desc">
          <strong>{{ selectedProduct }}</strong> 상품의 화법 데이터를 준비하고 있습니다.<br>
          빠른 시일 내에 제공될 예정입니다.
        </p>
        <button class="coming-soon-back-btn" @click="handleBackToSelection">
          ← 특약 선택으로 돌아가기
        </button>
      </div>
    </div>

    <!-- ── STEP 2: Result View ────────────────────────────────────────────── -->
    <div v-else class="container">

      <!-- 모바일 상단 요약. 접힘 높이는 항상 같고 펼침은 사용자가 누를 때만이다 -->
      <div class="mobile-top-summary" :data-expanded="summaryExpanded ? 'true' : 'false'">
        <!-- 화살표와 조건 pill 은 같은 곳으로 간다. 인접한 두 버튼으로 나누지 않는다.
             pill 이 눌러서 고칠 수 있게 보이므로 실제로 눌리게 하고, 하나의 실제 button 으로 묶는다.
             중첩 button 을 만들지 않기 위해 안쪽은 전부 span 이다 -->
        <div class="summary-lead">
          <button
            class="summary-return"
            type="button"
            :aria-label="summaryReturnLabel"
            @click="handleBackToSelection"
          >
            <span class="summary-return__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m14.5 5-7 7 7 7"/></svg>
            </span>
            <span class="summary-profile">
              <span class="summary-profile__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.4"/><path d="M5.5 20c.7-4 3.2-6 6.5-6s5.8 2 6.5 6"/></svg></span>
              <span class="summary-profile__value">{{ filters.age }} {{ filters.gender }}</span>
            </span>
          </button>
        </div>

        <p v-if="filters.notes" class="summary-notes">{{ filters.notes }}</p>

        <div class="summary-riders">
          <span class="summary-riders__count">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4 4 10-10"/></svg>
            특약 <b>{{ summaryRiders.length }}건</b>
          </span>
          <button
            v-if="summaryHiddenCount > 0"
            class="rider-headlink"
            type="button"
            aria-controls="summary-rider-list"
            :aria-expanded="summaryExpanded ? 'true' : 'false'"
            @click="summaryExpanded = !summaryExpanded"
          >
            {{ summaryExpanded ? '접기' : '전체보기' }}
            <svg class="summary-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 10 6 6 6-6"/></svg>
          </button>
        </div>

        <div id="summary-rider-list" class="rider-list">
          <div v-for="r in summaryRiders" :key="r.id" class="rider-list__item">
            <span class="rider-list__no">{{ r.no }}</span>
            <span class="rider-list__name">{{ r.main }}<span v-if="r.sub" class="rider-list__sub">{{ r.sub }}</span></span>
          </div>
          <button
            v-if="summaryHiddenCount > 0"
            class="rider-more"
            type="button"
            aria-controls="summary-rider-list"
            :aria-expanded="summaryExpanded ? 'true' : 'false'"
            @click="summaryExpanded = !summaryExpanded"
          >
            {{ summaryExpanded ? '접기' : `${summaryHiddenCount}건 더보기` }}
            <svg class="summary-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 10 6 6 6-6"/></svg>
          </button>
        </div>
      </div>

      <!-- ResultView -->
      <main class="content">
        <section class="consultation-opening" aria-labelledby="consultation-opening-title">
          <div class="consultation-opening__header">
            <div>
              <p class="consultation-opening__eyebrow">상담 시작 가이드</p>
              <h1 id="consultation-opening-title" class="consultation-opening__title">맞춤 상담 오프닝</h1>
            </div>
          </div>

          <div v-if="isGenerating && !generatedScript?.riderScripts.length" class="consultation-opening__loading" role="status">
            <div class="loader"></div>
            <span>선택한 특약을 연결하는 상담 흐름을 구성 중입니다.</span>
          </div>
          <template v-else>
            <blockquote class="consultation-opening__copy">“{{ consultationOpening }}”</blockquote>
            <p class="consultation-opening__notice">
              선택 조건을 바탕으로 구성한 상담 참고용 초안입니다. 실제 보장 범위와 지급 조건은 약관과 상품설명서를 확인해 주세요.
            </p>
          </template>
        </section>

        <p v-if="resultNeedsUpdate" class="result-update-notice" role="status">
          선택 조건이 바뀌었습니다. 현재 상담 자료는 이전 조건의 결과입니다. ‘화법 업데이트’로 다시 생성해 주세요.
        </p>

        <div class="tabs" role="tablist" aria-label="상담 자료" @keydown="handleResultTabKeydown">
          <button id="result-tab-script" type="button" role="tab" aria-controls="result-panel" :aria-selected="activeTab === 'script'" :tabindex="activeTab === 'script' ? 0 : -1" class="tab" :class="{ active: activeTab === 'script' }" @click="activeTab = 'script'">
            특약별 화법
          </button>
          <button id="result-tab-points" type="button" role="tab" aria-controls="result-panel" :aria-selected="activeTab === 'points'" :tabindex="activeTab === 'points' ? 0 : -1" class="tab" :class="{ active: activeTab === 'points' }" @click="activeTab = 'points'">
            예상 Q&A
          </button>
        </div>

        <div id="result-panel" role="tabpanel" :aria-labelledby="`result-tab-${activeTab}`" tabindex="0" :aria-busy="isGenerating ? 'true' : 'false'">
        <div v-if="isGenerating && !generatedScript?.designSummary && !generatedScript?.qna?.length" class="loader-container">
          <div class="loader"></div>
          <p style="text-align: center; color: #64748b; line-height: 1.6">
            <strong>설계 요약을 분석 중입니다...</strong><br />
            통계 자료와 핵심 수치를 구성하고 있습니다.
          </p>
        </div>

        <div v-else-if="generatedScript" class="script-box">
          <!-- 설계 요약 -->
          <template v-if="activeTab === 'script' && generatedScript.designSummary">
            <div class="design-summary">
              <div class="summary-header">설계 요약</div>

              <div v-if="generatedScript.designSummary.highlights && generatedScript.designSummary.highlights.length" class="highlight-grid">
                <div
                  v-for="(h, hi) in generatedScript.designSummary.highlights"
                  :key="hi"
                  class="highlight-card"
                >
                  <div class="highlight-headline">{{ h.headline }}</div>
                  <div class="highlight-detail">{{ h.detail }}</div>
                  <div class="highlight-source">{{ h.source }}</div>
                </div>
              </div>

              <details v-if="generatedScript.designSummary.statistics?.length" class="result-disclosure">
                <summary class="result-disclosure__trigger">상담에 참고할 통계</summary>
                <div class="stats-row">
                <div
                  v-for="(stat, si) in generatedScript.designSummary.statistics"
                  :key="si"
                  class="stat-block"
                >
                  <div class="stat-title">
                    {{ stat.title }}
                    <span v-if="stat.unit" class="stat-unit-label">{{ stat.unit }}</span>
                  </div>
                  <div v-if="stat.reason" class="stat-reason">{{ stat.reason }}</div>

                  <div class="stat-body">
                    <div v-if="stat.chartType === 'bar' && stat.chartData" class="stat-chart">
                      <div v-for="(item, ii) in stat.chartData" :key="ii" class="stat-bar-row">
                        <div class="bar-header">
                          <span class="bar-label">{{ item.label }}</span>
                          <span class="bar-value">{{ formatNumber(item.value) }}</span>
                        </div>
                        <div class="bar-track">
                          <div
                            class="bar-fill"
                            :style="{ width: barWidth(item, stat.chartData), background: barColor(ii) }"
                          ></div>
                        </div>
                      </div>
                    </div>

                    <div v-else-if="stat.chartType === 'donut'" class="donut-wrapper">
                      <svg viewBox="0 0 36 36" class="donut-svg">
                        <circle class="donut-ring" cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" stroke-width="3.5"/>
                        <circle
                          class="donut-segment"
                          cx="18" cy="18" r="15.9"
                          fill="none"
                          stroke="var(--primary-color)"
                          stroke-width="3.5"
                          :stroke-dasharray="`${stat.percent ?? 0} ${100 - (stat.percent ?? 0)}`"
                          stroke-dashoffset="25"
                          stroke-linecap="round"
                        />
                      </svg>
                      <div class="donut-center">
                        <div class="donut-center-label">{{ stat.centerLabel }}</div>
                        <div class="donut-center-sub">{{ stat.centerSub }}</div>
                      </div>
                    </div>

                    <div v-else-if="stat.chartType === 'comparison' && stat.chartData" class="comparison-chart">
                      <div v-for="(item, ii) in stat.chartData" :key="ii" class="comparison-col">
                        <div class="comparison-val">{{ formatNumber(item.value) }}</div>
                        <div class="comparison-bar-outer">
                          <div
                            class="comparison-bar-inner"
                            :style="{
                              height: barWidth(item, stat.chartData),
                              background: COMPARISON_COLORS[ii % COMPARISON_COLORS.length],
                            }"
                          ></div>
                        </div>
                        <div class="comparison-label">{{ item.label }}</div>
                      </div>
                    </div>

                    <div class="stat-description">{{ stat.description || '' }}</div>
                  </div>

                  <div class="stat-source">출처: {{ stat.source }} · {{ stat.period }}</div>
                </div>
                </div>
              </details>

              <details v-if="generatedScript.designSummary.tips?.length || isGenerating" class="result-disclosure">
                <summary class="result-disclosure__trigger">영업 꿀팁<span v-if="isGenerating && !generatedScript.designSummary.tips?.length"> · 생성 중</span></summary>
                <div class="summary-tips-block">
                <div v-if="isGenerating && !generatedScript.designSummary.tips?.length" class="phase-loader">
                  <div class="loader"></div>
                  <span>영업 꿀팁을 생성 중입니다...</span>
                </div>
                <div
                  v-for="(tip, ti) in generatedScript.designSummary.tips"
                  :key="ti"
                  class="summary-tip-item"
                >
                  {{ tip }}
                </div>
                </div>
              </details>
            </div>
          </template>

          <template v-if="activeTab === 'script'">
            <div v-if="isGenerating && !generatedScript.riderScripts.length" class="phase-loader">
              <div class="loader"></div>
              <span>특약별 화법을 생성 중입니다...</span>
            </div>

            <div v-if="generatedScript.riderScripts.length" class="scripts-wrap">
              <div class="scripts-list-heading">
                <div>
                  <h2>특약별 화법 상세보기</h2>
                </div>
                <span class="scripts-list-heading__count">{{ generatedScript.riderScripts.length }}건</span>
              </div>

              <section
                v-for="(rs, index) in generatedScript.riderScripts"
                :key="rs.name"
                class="script-accordion-item"
                :class="{ open: expandedScriptNames.includes(rs.name) }"
              >
                <h3 class="script-accordion-heading">
                  <button
                    :id="scriptTriggerId(index)"
                    type="button"
                    class="script-accordion-trigger"
                    :aria-expanded="expandedScriptNames.includes(rs.name) ? 'true' : 'false'"
                    :aria-controls="scriptPanelId(index)"
                    @click="toggleScript(rs.name)"
                  >
                    <span class="script-accordion-trigger__number">{{ index + 1 }}</span>
                    <span class="script-accordion-trigger__name">{{ rs.name }}</span>
                    <span class="script-accordion-trigger__action">
                      <span class="script-accordion-trigger__label">{{ expandedScriptNames.includes(rs.name) ? '접기' : '화법 보기' }}</span>
                      <svg
                        class="script-accordion-trigger__chevron"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                      ><path d="m6 10 6 6 6-6"/></svg>
                    </span>
                  </button>
                </h3>

                <div
                  v-if="expandedScriptNames.includes(rs.name)"
                  :id="scriptPanelId(index)"
                  class="script-accordion-panel"
                  role="region"
                  :aria-labelledby="scriptTriggerId(index)"
                >
                  <div class="qna-tag-row">
                    <button
                      type="button"
                      class="qna-claim-btn"
                      :class="{ open: expandedDescNames.includes(rs.name) }"
                      :aria-expanded="expandedDescNames.includes(rs.name) ? 'true' : 'false'"
                      :aria-controls="scriptDescriptionId(index)"
                      @click="toggleDesc(rs.name)"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      <span>지급사유<span class="script-claim-action-label"> {{ expandedDescNames.includes(rs.name) ? '닫기' : '보기' }}</span></span>
                      <svg
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"
                        :style="{ transform: expandedDescNames.includes(rs.name) ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.2s' }"
                      ><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                  </div>

                  <div
                    v-if="expandedDescNames.includes(rs.name)"
                    :id="scriptDescriptionId(index)"
                    class="qna-claim-detail"
                    v-text="formatDesc(resultRiders.find((r) => r.name === rs.name)?.description ?? '지급사유 정보가 없습니다.')"
                  ></div>

                  <div class="script-talk-block">{{ rs.talk }}</div>
                </div>
              </section>
            </div>
          </template>

          <template v-else>
            <div v-if="isGenerating && !generatedScript.qna.length" class="phase-loader">
              <div class="loader"></div>
              <span>예상 질문을 생성 중입니다...</span>
            </div>

            <div v-if="generatedScript.qna.length" class="qna-wrap">
              <div class="qna-notice">
                본 예상 Q&A는 AI가 특약 및 지급사유를 기반으로 작성한 상담 참고용 자료입니다.
                상세한 확인이 필요한 경우 정확한 내용은 <strong style="color: #dc2626;">약관</strong>과 <strong style="color: #dc2626;">상품설명서</strong>를 확인하세요.
              </div>

              <div
                v-for="(group, gi) in qnaByRider"
                :key="gi"
                class="qna-section"
              >
                <div class="qna-tag-row">
                  <span class="qna-rider-tag">{{ group.rider }}</span>
                  <button
                    class="qna-claim-btn"
                    type="button"
                    :aria-expanded="expandedClaimNames.includes(group.rider) ? 'true' : 'false'"
                    :aria-controls="`qna-claim-${gi}`"
                    :class="{ open: expandedClaimNames.includes(group.rider) }"
                    @click="toggleClaim(group.rider)"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    {{ expandedClaimNames.includes(group.rider) ? '지급사유 닫기' : '지급사유 보기' }}
                    <svg
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                      :style="{ transform: expandedClaimNames.includes(group.rider) ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.2s' }"
                    ><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                </div>

                <div
                  v-if="expandedClaimNames.includes(group.rider)"
                  :id="`qna-claim-${gi}`" class="qna-claim-detail"
                  v-text="formatDesc(resultRiders.find((r) => r.name === group.rider)?.description ?? '지급사유 정보가 없습니다.')"
                ></div>

                <div v-for="(item, ii) in group.items" :key="ii" class="qna-block">
                  <div class="qna-question">Q{{ ii + 1 }}. {{ item.q }}</div>
                  <div class="qna-tip">
                    <span class="qna-tip-icon qna-answer-label">A</span>
                    <div>{{ item.a }}</div>
                  </div>
                </div>

                <hr v-if="gi < qnaByRider.length - 1" class="qna-divider" />
              </div>
            </div>
          </template>
        </div>
        </div>
      </main>

      <!-- ResultSidebar -->
      <aside class="sidebar">
        <button class="back-btn desktop-only" @click="handleBackToSelection">← 메인 선택화면으로</button>

        <div class="card desktop-only">
          <div class="card-title">고객 프로파일</div>
          <div class="profile-compact-grid">
            <div class="profile-compact-item">
              <div class="label-small">나이/성별</div>
              <div class="value-small">{{ filters.age }} {{ filters.gender }}</div>
            </div>
            <div class="profile-compact-item" style="grid-column: span 2">
              <div class="label-small">특이사항</div>
              <div class="value-small">{{ filters.notes || '없음' }}</div>
            </div>
          </div>
        </div>

        <div class="card rider-edit-card">
          <div class="card-title">
            특약 추가/수정 <span>{{ selectedRiders.length }}개</span>
          </div>

          <div class="chips-sidebar">
            <div v-for="rider in selectedDataFull" :key="rider.id" class="chip-sidebar">
              {{ rider.name }}
              <button type="button" class="chip-remove-sidebar" :aria-label="`${rider.name} 선택 해제`" @click="removeRider(rider.id)">&times;</button>
            </div>
          </div>

          <div ref="sidebarComboboxRoot" class="sidebar-search-container sidebar-combobox">
            <input
              ref="sidebarSearchInput"
              class="sidebar-search-input"
              placeholder="특약 검색 및 추가"
              v-model="sidebarSearchTerm"
              role="combobox"
              aria-label="추가할 특약 검색"
              aria-autocomplete="list"
              aria-haspopup="listbox"
              :aria-expanded="sidebarComboboxOpen ? 'true' : 'false'"
              :aria-controls="sidebarListboxId"
              :aria-activedescendant="sidebarActiveOptionId"
              autocomplete="off"
              :spellcheck="false"
              @focus="openSidebarCombobox"
              @input="handleSidebarSearchInput"
              @keydown="handleSidebarSearchKeydown"
              @blur="handleSidebarSearchBlur"
              @compositionstart="sidebarComposing = true"
              @compositionend="sidebarComposing = false; handleSidebarSearchInput()"
            />
            <span class="sr-only" role="status" aria-live="polite">{{ sidebarSearchStatus }}</span>

            <div v-if="sidebarComboboxOpen" class="sidebar-search-popover">
              <ul
                v-if="sidebarCandidateRiders.length > 0"
                :id="sidebarListboxId"
                ref="sidebarListbox"
                class="sidebar-search-listbox"
                role="listbox"
                aria-label="추가할 특약"
              >
                <li
                  v-for="(rider, index) in sidebarCandidateRiders"
                  :id="sidebarOptionId(rider)"
                  :key="rider.id"
                  class="sidebar-search-option"
                  :class="{ active: index === sidebarActiveIndex }"
                  role="option"
                  aria-selected="false"
                  @mouseenter="sidebarActiveIndex = index"
                  @mousedown.prevent
                  @click="addSidebarRider(rider)"
                >
                  <span class="sidebar-search-option__name">{{ rider.name }}</span>
                  <span v-if="rider.badge === 'popular'" class="badge popular">인기</span>
                  <span v-if="rider.badge === 'ai'" class="badge ai">AI추천</span>
                </li>
              </ul>
              <p v-else :id="sidebarListboxId" class="sidebar-search-empty" role="status">
                일치하는 특약이 없습니다.
              </p>
            </div>
          </div>

          <button
            class="sidebar-update-btn"
            @click="submitFilter"
            :disabled="isGenerating || selectedRiders.length === 0"
          >
            {{ isGenerating ? '분석 중...' : '변경된 내용으로 화법 업데이트' }}
          </button>
        </div>
      </aside>
    </div>

  </div>
</template>

<style lang="scss" scoped>
/* ── 00-legacy-foundation-selection.scss ── */

/* ============================================================
   보험피터(코칭트랙) 전용 스타일
   원본: Channel_AI_Solution-Coaching_track/frontend/assets/styles/coaching-track.css
   변경점: 전역(:root, body, *) 선택자를 이 페이지의 루트 요소인 .app-root
   기준으로 옮겨, scoped 스타일 범위 안에서만 적용되도록 격리했습니다.
   (Vue의 scoped 스타일은 컴포넌트가 렌더링한 요소에만 속성 선택자를
   붙이기 때문에, 사이트 전역 body/：root 규칙과 절대 충돌하지 않습니다.)
   ============================================================ */

.app-root {
  --primary-color: #2563eb;
  --bg-color: #f5f7ff;
  --card-bg: #ffffff;
  --text-main: #1e293b;
  --text-muted: #64748b;
  --border-color: #dde5f5;
  --blue-section: #1976d2;
  --green-section: #1b8d57;
  --orange-section: #f5a623;
  --selection-bg: #eef2ff;
  position: fixed;
  inset: 0;
  height: 100vh;
  height: 100dvh;
  /* iOS Safari: 주소창 포함 계산 버그 방지 */
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-color);
  color: var(--text-main);
  font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif;
  z-index: 500;
}
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.header {
  display: flex;
  font-weight: 700;
}

.container {
  display: flex;
  flex: 1;
  width: 100%;
  overflow: hidden;
}

/* Common Card Styles */

.card {
  background: white;
}

.card-title {
  @include flexbox(space-between, center);
}

/* === Selection View (Full Screen) === */

.selection-view {
  display: flex;
  flex-direction: column;
  margin: 0 auto;
  width: 100%;
}

.selection-header-section {
  display: flex;
  align-items: stretch;
  gap: rem(12);
  margin-bottom: rem(16);
  .card {
    flex: 1;
    margin-bottom: 0;
    padding: rem(8) rem(12);
  }
}

.profile-notes-row {
  display: flex;
  flex-direction: column;
}

.notes-input {
  border: none;
  background: transparent;
  outline: none;
  width: 100%;
  &::placeholder {
    font-weight: 400;
  }
}

/* ── 01-legacy-selection-list.scss ── */

/* Category Tabs (Horizontal Scroll) */

.category-pills-wrap {
  display: flex;
  flex-wrap: wrap;
}

.cat-pill {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  white-space: nowrap;
  &:hover {
    background: #eff6ff;
  }
}

.rider-grid-large {
  display: grid;
}

.rider-card-large {
  cursor: pointer;
  flex-direction: column;
  position: relative;
  &:hover {
    background: #f8fafc;
  }
}

.rider-card-header {
  justify-content: space-between;
  align-items: center;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  letter-spacing: -0.02em;
  line-height: 1;
  white-space: nowrap;
  &.popular {
    background: #fff0f6;
    color: #eb2f96;
  }
}

.selection-footer {
  position: sticky;
  bottom: 0;
  display: flex;
  align-items: center;
  z-index: 5;
}

.main-generate-btn {
  cursor: pointer;
}

/* ── 10-legacy-result-shell.scss ── */

/* === Result View === */

.sidebar {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.back-btn {
  cursor: pointer;
  margin-bottom: rem(16);
  font-weight: 700;
  @include flexbox(center, center);
  gap: rem(8);
}

.profile-compact-grid {
  grid-template-columns: repeat(2, 1fr);
}

.profile-compact-item {
  font-size: 12px;
  border-radius: 6px;
}

.label-small {
  margin-bottom: rem(2);
}

.value-small {
  font-weight: 700;
  line-height: 1.3;
}

.content {
  flex: 1;
  overflow-y: auto;
  background: white;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #eee;
}

.tab {
  cursor: pointer;
  &.active {
    font-weight: 800;
  }
}

.script-box {
  background: white;
  overflow: hidden;
}

.sidebar-search-input {
  outline: none;
}

.sidebar-update-btn {
  width: 100%;
  color: white;
  border: none;
  margin-top: rem(12);
}

.chips-sidebar {
  flex-wrap: wrap;
}

.chip-sidebar {
  display: flex;
  gap: rem(4);
}

.chip-remove-sidebar {
  cursor: pointer;
}

.script-talk-block {
  margin-bottom: rem(10);
  word-break: keep-all;
}

/* ── 11-legacy-result-insights.scss ── */

/* === Design Summary === */

.summary-header {
  border-bottom: 1px solid #e2e8f0;
}

.highlight-card {
  min-width: 0;
  overflow: hidden;
}

.highlight-headline {
  margin-bottom: rem(6);
  word-break: keep-all;
}

.highlight-detail {
  margin-bottom: rem(6);
  word-break: keep-all;
}

.stat-block {
  border: 1px solid #e2e8f0;
}

.stat-title {
  display: flex;
  align-items: center;
  gap: rem(6);
  flex-wrap: wrap;
}

.stat-unit-label {
  font-weight: 500;
  padding: rem(2) rem(6);
  border-radius: 4px;
}

.stat-reason {
  margin-bottom: rem(14);
  word-break: keep-all;
}

.stat-chart {
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  gap: rem(8);
}

.stat-bar-row {
  display: flex;
  flex-direction: column;
  gap: rem(4);
  margin-bottom: rem(8);
  &:last-child {
    margin-bottom: 0;
  }
}

.bar-header {
  @include flexbox(space-between, baseline);
  gap: rem(8);
}

.bar-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 70%;
}

.bar-value {
  white-space: nowrap;
  flex-shrink: 0;
}

.bar-track {
  overflow: hidden;
  width: 100%;
}

.bar-fill {
  height: 100%;
  transition: width 0.6s ease;
}

.stat-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: stretch;
  gap: rem(16);
  margin-bottom: rem(4);
  > .stat-chart,
  > .donut-wrapper,
  > .comparison-chart {
    width: 100%;
    min-width: 0;
  }
}

.stat-description {
  word-break: keep-all;
}

/* Donut chart */

.donut-wrapper {
  position: relative;
  @include flexbox(center, center);
  width: 100%;
  min-height: 100px;
}

.donut-svg {
  width: min(110px, 80%);
  height: auto;
  aspect-ratio: 1;
  transform: rotate(-90deg);
}

.donut-center {
  position: absolute;
  text-align: center;
  pointer-events: none;
}

.donut-center-label {
  font-weight: 800;
  line-height: 1;
}

.donut-center-sub {
  margin-top: rem(3);
  white-space: pre-line;
  line-height: 1.4;
}

/* Comparison chart */

.comparison-chart {
  @include flexbox(center, flex-end);
  gap: rem(28);
  padding: rem(8) 0 rem(4);
  min-height: 100px;
}

.comparison-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: rem(5);
  width: 60px;
}

.comparison-val {
  font-weight: 800;
}

.comparison-bar-outer {
  width: 36px;
  height: 90px;
  border-radius: 6px 6px 0 0;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}

.comparison-bar-inner {
  width: 100%;
  border-radius: 6px 6px 0 0;
  transition: height 0.6s ease;
  min-height: 4px;
}

.comparison-label {
  font-weight: 600;
}

.loader-container {
  padding: rem(60) 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: rem(16);
}

.loader {
  width: 28px;
  height: 28px;
  display: inline-block;
  border: 3px solid #e2e8f0;
  border-radius: 50%;
  animation: coaching-track-spin 0.8s linear infinite;
}
@keyframes coaching-track-spin { to { transform: rotate(360deg); } }

/* ── 12-legacy-result-responsive.scss ── */

.phase-loader {
  display: flex;
  align-items: center;
  gap: rem(10);
  border-bottom: 1px solid #f1f5f9;
}

.mobile-top-summary {
  display: none;
}

/* ==========================================================================
   Mobile Responsive Design (max-width: 850px)
   ========================================================================== */

@media (max-width: 850px) {
  .app-root {
    height: auto;
    min-height: 100vh;
    min-height: 100dvh;
    overflow-y: auto;
  }
  .container {
    flex-direction: column;
    height: auto;
    overflow: visible;
  }
  /* --- Step 1: Selection View --- */
  .selection-header-section {
    flex-direction: column;
    gap: rem(12);
    .card {
      width: 100%;
    }
  }
  .selection-footer {
    flex-direction: column;
    gap: rem(6);
    position: fixed;
    bottom: 0;
    left: 0;
    box-shadow: 0 -4px 15px rgba(37,99,235,0.1);
    z-index: 100;
  }
  /* Provide padding at the bottom of the main content so the fixed footer doesn't hide items */
  .selection-main-grid {
    padding-bottom: rem(140);
  }
  /* --- Step 2: Result View --- */
  /* Show Mobile Summary at top */
  /* display 에 !important 를 쓰지 않는다. 데스크톱의 display:none 은 이 미디어 블록보다
     앞에 있어 소스 순서로 이미 덮인다. !important 가 있으면 어댑터의 display:flex 를
     막아 정보군 사이 gap 이 통째로 무시된다 */
  /* Hide Desktop specific things */
  .desktop-only {
    display: none !important;
  }
  .sidebar {
    display: none !important;
    /* Completely hide sidebar on mobile/tablet */
  }
  .content {
    overflow-y: visible;
    order: 1;
  }
  .stats-row {
    flex-direction: column;
  }
  .stat-body {
    grid-template-columns: 1fr;
  }
  .stat-block {
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
    &:last-child {
      border-bottom: none;
    }
  }
  .stat-bar-row {
    grid-template-columns: 60px 1fr 72px;
    gap: rem(6);
  }
  .tabs {
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }
  }
  .tab {
    flex: 0 0 auto;
    text-align: center;
  }
}

/* ── 20-feature-qna-product.scss ── */

/* ── QA 섹션 ────────────────────────────── */

.qna-notice {
  border: 1px solid #fcd34d;
}

.qna-tag-row {
  display: flex;
  align-items: center;
  gap: rem(8);
  margin-bottom: rem(16);
  flex-wrap: wrap;
}

.qna-rider-tag {
  border: 1px solid #dde5f5;
  word-break: keep-all;
}

.qna-claim-btn {
  display: flex;
  align-items: center;
  gap: rem(5);
  background: #fff;
  border: 1px solid #d1d5db;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  svg {
    width: 13px;
    height: 13px;
  }
  &:hover {
    background: #f9fafb;
  }
}

.qna-claim-detail {
  border: 1px solid #e5e7eb;
  margin-bottom: rem(16);
  white-space: pre-wrap;
  word-break: keep-all;
  overflow-wrap: break-word;
}

.qna-block {
  margin-bottom: rem(22);
}

.qna-question {
  margin-bottom: rem(10);
  word-break: keep-all;
}

.qna-answer-label {
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
}

.qna-tip {
  display: flex;
  gap: rem(8);
  word-break: keep-all;
}

.qna-tip-icon {
  flex-shrink: 0;
}

.qna-divider {
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: rem(2) 0 0;
}

/* Product selector */

.product-selector-bar {
  display: flex;
}

.product-selector-select {
  background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E") no-repeat right 10px center;
  min-width: 200px;
  &:focus {
    outline: none;
    border-color: #6366f1;
  }
}

/* Coming soon page */

.coming-soon-view {
  @include flexbox(center, center);
  min-height: calc(100vh - 60px);
  padding: rem(40) rem(20);
}

.coming-soon-card {
  text-align: center;
  max-width: 420px;
  padding: rem(48) rem(40);
  background: #fff;
  border: 1px solid #e5e7eb;
}

.coming-soon-icon {
  font-size: 52px;
  margin-bottom: rem(20);
}

.coming-soon-title {
  font-weight: 700;
  margin: 0 0 rem(14);
}

.coming-soon-desc {
  margin: 0 0 rem(28);
}

.coming-soon-back-btn {
  display: inline-block;
  color: #fff;
  border: none;
  cursor: pointer;
  transition: background 0.15s;
}

/* ── 21-toast-adapter-header.scss ── */

/* ── 이 페이지(coaching-track.vue) 자체 스타일 ───────────────────────── */

.toast-container {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: rem(8);
  z-index: 9999;
  pointer-events: none;
}

.toast {
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: coaching-track-slideUp 0.2s ease;
  max-width: 400px;
  text-align: center;
  &.info {
    background: #334155;
  }
}
@keyframes coaching-track-slideUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ══════════════════════════════════════════════════════════════════════
   UIUX 표준 컴포넌트·패턴 라이브러리 v0.2.2 — Adapter 계층
   정본: 00_UIUX_의미보존_내재화_시스템/02_UIUX_표준_컴포넌트_패턴
   갤러리 컴포넌트의 형태·색·상태를 기존 selector 에 연결한다.
   원칙적으로 scoped CSS 안에서만 동작한다(02_사용가이드 5절).
   예외는 상품 선택 라벨 삭제 하나이고 사용자 지시에 따른 것이다.
   기준선은 05_레이아웃_안정성_검수가이드를 따른다.
   Page edge 는 .selection-view 하나만 소유하고 자식은 좌우 여백을 갖지 않는다.
   Content edge 는 카드 padding 16px 이며 Page edge 와 억지로 맞추지 않는다.
   토큰을 px 로 고정한 이유: main.scss 가 html 을 최대 65% 로 줄이는데
   전역 수정은 HC-03 blocking 이다. 정본 01_토큰가이드 4절과 같은 결과를 얻는다.
   타이포 하한은 00_디자인원칙_필수.md 갱신본을 따른다.
   라벨·탭 15px, 메타·출처 13px, 12px 이하 금지. 라이브러리 가이드보다 엄격하다.
   ══════════════════════════════════════════════════════════════════════ */

.app-root {
  /* 타이포 */
  --so-type-page: 26px;
  --so-type-section: 22px;
  --so-type-card: 18px;
  --so-type-body-lg: 17px;
  --so-type-body: 16px;
  --so-type-label: 15px;
  --so-type-meta: 13px;
  --so-leading-tight: 1.3;
  --so-leading-body: 1.62;
  --so-leading-relaxed: 1.75;
  /* 간격 */
  --so-space-1: 4px;
  --so-space-2: 8px;
  --so-space-3: 12px;
  --so-space-4: 16px;
  --so-space-5: 20px;
  --so-space-6: 24px;
  --so-space-8: 32px;
  /* 형태 */
  --so-radius-xs: 6px;
  --so-radius-sm: 10px;
  --so-radius-md: 14px;
  --so-radius-lg: 18px;
  /* 라벤더 뉴트럴. 순백·회색 대비 대신 눈의 피로를 낮춘다 */
  --so-page: #f9f9ff;
  --so-surface: #ffffff;
  --so-surface-subtle: #f7f6fc;
  --so-surface-inset: #edecf7;
  --so-text-title: #16151f;
  --so-text: #2c2b3a;
  --so-text-secondary: #57566b;
  --so-text-tertiary: #6c6b81;
  --so-text-disabled: #929bad;
  --so-border: #deddea;
  --so-border-subtle: #eae9f3;
  --so-border-strong: #cbc9dc;
  /* 행동과 선택은 역할이 다르다 */
  --so-control-selected: #677de4;
  /* radio·switch checked 전용 */
  --so-action: #4457d6;
  --so-action-hover: #3644b3;
  --so-action-subtle: #ebedfd;
  --so-action-text: #3b4cc4;
  --so-selected-ring: #c4cbf8;
  --so-selected-bg: #fbfbff;
  /* 헤더와 상품 선택 전용 */
  /* Utility 경계. 공통 라이브러리의 --so-*-utility-* 와 같은 의미다.
  밝은 보조 컨트롤이 밝은 페이지(#f9f9ff) 위에서 형태를 잃지 않게 만드는 경계이지
  success 같은 상태색이 아니다. 한 hue로 읽히지 않도록 blue-gray·aqua·lilac을 낮은 채도로 섞는다. */
  --so-utility-border: #9aa8c9;
  --so-utility-border-hover: #7f90b8;
  --so-utility-text: #16151f;
  --so-utility-text-active: #384b63;
  --so-gradient-utility-border: linear-gradient(120deg, #a6b3d5 0%, #8fb4bd 52%, #b5acd4 100%);
  --so-gradient-utility-border-hover: linear-gradient(120deg, #8597c4 0%, #72a0aa 52%, #9d91c5 100%);
  --so-gradient-utility-surface: linear-gradient(135deg, #ffffff 0%, #f8f9fd 54%, #f3f8f8 100%);
  --so-gradient-utility-surface-hover: linear-gradient(135deg, #ffffff 0%, #f2f5fb 52%, #eaf5f4 100%);
  --so-gradient-utility-surface-active: linear-gradient(135deg, #f6f7fc 0%, #edf1fa 50%, #e6f2f1 100%);
  --so-shadow-utility-floating: 0 10px 28px rgba(54, 65, 96, 0.14), 0 2px 8px rgba(70, 111, 116, 0.08);
  --so-shadow-utility-floating-hover: 0 12px 30px rgba(54, 65, 96, 0.17), 0 3px 10px rgba(70, 111, 116, 0.1);
  --so-brand-mark: #3d4fe0;
  /* 서비스 아이콘 */
  --so-brand-ink: #2b39b8;
  /* 홈 아이콘, 상품 select 꺾쇠 */
  --so-brand-ring: rgba(91, 106, 217, 0.22);
  --so-gradient-ai-border: linear-gradient(105deg, #2b39b8, #4f5fe6 48%, #8b96ff);
  /* 브랜드 그라데이션. 핵심 행동과 활성 chip 처럼 제한된 면적에만 */
  --so-gradient-brand: linear-gradient(105deg, #7a5fd8 0%, #5b6ad9 48%, #3576bb 100%);
  --so-gradient-brand-hover: linear-gradient(105deg, #6d51cd 0%, #4f5ecf 48%, #2c69ab 100%);
  --so-gradient-selected-surface: linear-gradient(135deg, #fcfaff 0%, #f8f9ff 58%, #f8fbff 100%);
  /* 상태. 그라데이션으로 바꾸지 않는다 */
  --so-ai: #6d51cd;
  --so-ai-subtle: #faf7fc;
  --so-success: #11734f;
  --so-success-subtle: #effaf5;
  --so-warning: #7a4d00;
  --so-warning-subtle: #fff8e8;
  --so-danger: #94404c;
  --so-danger-subtle: #fff5f6;
  --so-danger-border: #f1cfd5;
  /* 효과와 모션 */
  --so-shadow-1: 0 1px 2px rgba(62, 56, 108, 0.055);
  --so-shadow-2: 0 8px 26px rgba(62, 56, 108, 0.085);
  --so-shadow-brand: 0 8px 22px rgba(91, 106, 217, 0.2);
  --so-ring: 0 0 0 3px rgba(68, 87, 214, 0.18);
  --so-fast: 120ms;
  --so-base: 180ms;
  --so-ease: cubic-bezier(0.2, 0, 0, 1);
  /* 레이아웃 */
  /* [1006 수정] 작업 영역 최대 폭: 쇼츠 보기(.refer-list max-width 900px)와 같이 콘텐츠 폭 900px 로 가운데 둔다.
  좌우 gutter 를 뺀 실제 콘텐츠 폭이 900px 이 되도록 gutter 만큼 더한다 */
  --so-content-work: calc(900px + var(--so-gutter) * 2);
  --so-content-reading: 760px;
  --so-gutter: clamp(16px, 1.8vw + 8.8px, 32px);
  --so-control-h: 44px;
  /* 본문은 max-width 안쪽에 gutter 가 한 번 더 들어간다. 기준선을 맞추려면 그만큼 더한다 */
  --so-edge: max(var(--so-gutter), calc((100% - var(--so-content-work)) / 2 + var(--so-gutter)));
  background: var(--so-page);
  color: var(--so-text);
  /* Variant A 헤더까지 포함한 페이지 전체가 하나의 세로 흐름을 소유한다.
  자식 화면만 스크롤시키면 relative 헤더도 viewport에 남아 sticky처럼 보인다. */
  overflow-x: hidden;
  overflow-y: auto;
  /* [1006 수정] 기본 레이아웃(공통 Header + LNB) 안에 배치.
  원래는 layout 'blank' 에서 화면 전체를 덮는 fixed 루트였다. 공통 헤더(60px) 아래,
  LNB 오른쪽 main 영역을 채우는 스크롤 컨테이너로 쓴다.
  width 0 + flex-grow: 안쪽 콘텐츠의 최소 폭이 공통 main 을 밀어 가로 스크롤이 생기지 않게 */
  position: relative;
  inset: auto;
  z-index: auto;
  flex: 1 1 0;
  width: 0;
  align-self: stretch;
  min-width: 0;
  height: auto;
  min-height: 0;
}

.app-root {
  :focus-visible {
    outline: none;
    box-shadow: var(--so-ring);
    border-radius: var(--so-radius-xs);
  }
  /* ══ App header ══ 서비스명과 브랜드 설명을 하나의 정체성 그룹으로 둔다.
     identity-tagline Variant A는 문서 흐름형이다. 화면 상태·상품 맥락 문구와
     홈 액션을 넣지 않고, 서비스명과 태그라인이 본문과 함께 스크롤된다. */
  .header {
    position: relative;
    top: auto;
    /* .app-root 가 세로 flex 라 기본 flex-shrink 로 헤더가 찌그러진다.
    모바일에서 태그라인이 본문과 겹치던 원인이다 */
    flex: 0 0 auto;
    height: auto;
    min-height: 64px;
    flex-direction: column;
    flex-wrap: nowrap;
    align-items: stretch;
    gap: 0;
    padding: 14px var(--so-edge);
    background: rgba(255, 255, 255, 0.94);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--so-border-subtle);
    font-size: var(--so-type-body);
  }
  .service-bar {
    @include flexbox(space-between, center);
    gap: var(--so-space-3);
    padding-bottom: 0;
    flex-wrap: nowrap;
  }
  .logo {
    display: flex;
    align-items: center;
    gap: rem(12);
    min-width: 0;
    flex: 1 1 auto;
  }
  .logo-icon {
    width: 22px;
    height: 22px;
    flex: 0 0 auto;
    color: var(--so-brand-mark);
  }
  .logo-main {
    flex: 0 0 auto;
    font-size: 19px;
    font-weight: 760;
    letter-spacing: -0.025em;
    color: var(--so-text-title);
  }
  .header-tagline {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding-left: rem(12);
    border-left: 1px solid var(--so-border-strong);
    color: var(--so-text-secondary);
    font-size: 15px;
    font-weight: 520;
    line-height: 1.4;
    letter-spacing: -0.02em;
    strong {
      color: var(--so-brand-ink);
      font-weight: 680;
    }
  }
  /* ══ 업무 컨테이너 ══ 헤더·본문·CTA 가 같은 기준선에서 시작한다 */
  .selection-view {
    flex: 0 0 auto;
    min-height: calc(100dvh - 60px - 64px);
    overflow-y: visible;
    /* [1006 수정] 공통 헤더(60px) 만큼 뺌 */
    max-width: var(--so-content-work);
    padding: var(--so-space-6) var(--so-gutter) 0;
    gap: 0;
  }
  .product-selector-bar,
  .selection-header-section {
    width: 100%;
  }
  /* [1006 수정] 880px 상한 제거: 아래 특약 그리드와 같은 폭으로 늘어나게 */
  .product-selector-bar {
    flex-direction: column;
    align-items: flex-start;
    padding: 0;
    background: transparent;
    border-bottom: 0;
    margin-bottom: var(--so-space-6);
    gap: var(--so-space-3);
  }
  .product-selector-heading {
    @include flexbox(space-between, baseline);
    flex-wrap: wrap;
    gap: var(--so-space-2) var(--so-space-4);
    width: 100%;
  }
  .product-selector-title {
    width: auto;
    color: var(--so-text-title);
    font-size: var(--so-type-card);
    font-weight: 750;
    line-height: var(--so-leading-tight);
  }
  .selection-view > *,
  .selection-header-section > .card {
    margin-left: 0;
    margin-right: 0;
  }
  .selection-header-section,
  .selection-main-grid,
  .rider-grid-large,
  .category-pills-wrap {
    padding-left: 0;
    padding-right: 0;
    margin-left: 0;
    margin-right: 0;
  }
  .product-selector-bar > .product-selector-select {
    width: 100%;
    margin-left: 0;
    min-width: 0;
    max-width: none;
    flex: none;
  }
  /* ── 22-adapter-controls-profile.scss ── */
  /* ══ Field / Input / Select ══ 꺾쇠는 우측 경계에서 약 20px 안쪽 */
  .sidebar-search-input {
    min-height: var(--so-control-h);
    height: auto;
    border: 1px solid var(--so-border-strong);
    border-radius: var(--so-radius-sm);
    background-color: var(--so-surface);
    color: var(--so-text-title);
    font-size: var(--so-type-body);
    transition: border-color var(--so-fast) var(--so-ease), box-shadow var(--so-fast) var(--so-ease);
  }
  .product-selector-select {
    appearance: none;
    -webkit-appearance: none;
    height: auto;
    cursor: pointer;
    transition: box-shadow var(--so-fast) var(--so-ease);
  }
  /* 상품 선택은 AI 그라데이션 테두리를 두른 큰 컨트롤이다.
     테두리 그라데이션은 padding-box / border-box 두 겹으로 만든다.
     꺾쇠는 인라인 SVG 를 data URI 로 넣는다. 외부 리소스가 아니다 */
  .product-selector-select {
    width: 100%;
    min-height: 60px;
    padding: 0 rem(52) 0 rem(16);
    border: 2px solid transparent;
    border-radius: 16px;
    color: var(--so-text-title);
    font-size: 18px;
    font-weight: 650;
    line-height: 1.3;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%232b39b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 10 6 6 6-6'/%3E%3C/svg%3E"), linear-gradient(var(--so-surface), var(--so-surface)), var(--so-gradient-ai-border);
    background-origin: border-box, padding-box, border-box;
    background-clip: border-box, padding-box, border-box;
    background-repeat: no-repeat;
    background-position: calc(100% - 16px) 50%, 0 0, 0 0;
    background-size: 20px 20px, auto, auto;
    box-shadow: 0 2px 14px var(--so-brand-ring);
    &:hover {
      box-shadow: 0 3px 18px var(--so-brand-ring);
    }
  }
  .sidebar-search-input {
    padding: 0 var(--so-space-4);
  }
  .sidebar-search-input:focus,
  .notes-input:focus {
    border-color: var(--so-action);
    box-shadow: var(--so-ring);
  }
  /* 상품 select 는 테두리가 그라데이션이라 border-color 로 포커스를 표시할 수 없다.
     FIX-01b 요구대로 보이는 링을 주되 그라데이션 테두리와 주변 그림자를 함께 유지한다 */
  .product-selector-bar .product-selector-select:focus-visible,
  .product-selector-bar .product-selector-select:focus {
    outline: 3px solid var(--so-brand-ring);
    outline-offset: 2px;
  }
  .profile-notes-row {
    min-height: var(--so-control-h);
    justify-content: center;
    gap: rem(2);
    padding: var(--so-space-2) var(--so-space-4);
    border: 1px solid var(--so-border);
    border-radius: var(--so-radius-sm);
    background: var(--so-surface);
    transition: border-color var(--so-fast) var(--so-ease), box-shadow var(--so-fast) var(--so-ease);
  }
  .field-label {
    font-size: var(--so-type-meta);
    font-weight: 650;
    color: var(--so-text-secondary);
    text-transform: none;
    letter-spacing: 0;
    line-height: var(--so-leading-tight);
  }
  .notes-input {
    min-height: 26px;
    font-size: var(--so-type-body);
    font-weight: 400;
    color: var(--so-text-title);
    &::placeholder {
      color: var(--so-text-disabled);
    }
  }
  /* ══ 연령·성별 profile selector ══ 공통 age-gender-profile-selector 매핑.
     .so-profile-selector / __header / __fields / .so-profile-segment 형태를
     서비스 selector 로 옮겨 왔다. template 에 .so-* 를 넣지 않는다 */
  .profile-selector {
    display: grid;
    gap: var(--so-space-3);
    margin: 0 0 var(--so-space-4);
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    /* grid 자식의 기본 min-width: auto 가 좁은 폭에서 축소를 막는다 */
    > * {
      min-width: 0;
    }
    &__fields {
      display: grid;
      gap: var(--so-space-4);
    }
    &__field {
      display: grid;
      gap: var(--so-space-2);
      min-width: 0;
    }
    /* 가시 라벨은 두지 않는다. 접근 가능한 이름은 select 와 fieldset 의 aria-label 이 갖는다 */
    &__group {
      min-width: 0;
      margin: 0;
      padding: 0;
      border: 0;
    }
    /* 연령은 native select. 값 뒤에 붙은 문자 ▾ 대신 우측 고정 꺾쇠를 쓴다 */
    &__select {
      width: 100%;
      min-height: var(--so-control-h);
      appearance: none;
      -webkit-appearance: none;
      padding: 0 48px 0 var(--so-space-4);
      border: 1px solid var(--so-border-strong);
      border-radius: var(--so-radius-sm);
      background-color: var(--so-surface);
      color: var(--so-text-title);
      font-size: var(--so-type-body);
      font-weight: 650;
      background-image: linear-gradient(45deg, transparent 50%, var(--so-text-tertiary) 50%), linear-gradient(135deg, var(--so-text-tertiary) 50%, transparent 50%);
      background-position: calc(100% - 25px) 50%, calc(100% - 20px) 50%;
      background-repeat: no-repeat;
      background-size: 5px 5px;
      transition: border-color var(--so-fast) var(--so-ease), box-shadow var(--so-fast) var(--so-ease);
    }
    &__select:hover {
      border-color: var(--so-text-tertiary);
    }
    &__select:disabled {
      background-color: var(--so-surface-inset);
      color: var(--so-text-disabled);
      cursor: not-allowed;
    }
  }
  /* 성별은 native radio 2분할. 두 칸 너비가 같다 */
  .profile-segment {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--so-space-2);
    &__option {
      position: relative;
      min-width: 0;
      cursor: pointer;
    }
    &__option input {
      position: absolute;
      width: 1px;
      height: 1px;
      opacity: 0;
      pointer-events: none;
    }
    &__surface {
      @include flexbox(center, center);
      min-height: 52px;
      gap: var(--so-space-2);
      padding-inline: var(--so-space-4);
      border: 1px solid var(--so-border);
      border-radius: var(--so-radius-sm);
      background: var(--so-surface);
      color: var(--so-text-secondary);
      font-size: var(--so-type-body);
      font-weight: 650;
      transition: border-color var(--so-fast) var(--so-ease), background var(--so-fast) var(--so-ease), box-shadow var(--so-fast) var(--so-ease), color var(--so-fast) var(--so-ease);
    }
    /* 선택을 색 하나로만 알리지 않는다. check + 면 + 테두리 + 글자색을 함께 쓴다 */
    &__indicator {
      display: grid;
      place-items: center;
      width: 18px;
      height: 18px;
      flex: 0 0 auto;
      border: 1px solid var(--so-border-strong);
      border-radius: 50%;
      background: var(--so-surface);
      color: transparent;
    }
    &__indicator svg {
      width: 11px;
      height: 11px;
    }
    &__option:hover .profile-segment__surface {
      border-color: var(--so-selected-ring);
    }
    &__option input:focus-visible + .profile-segment__surface {
      border-color: var(--so-action);
      box-shadow: var(--so-ring);
    }
    &__option input:checked + .profile-segment__surface {
      border-color: var(--so-selected-ring);
      background: var(--so-gradient-selected-surface);
      color: var(--so-action-text);
      box-shadow: 0 5px 16px rgba(91, 106, 217, 0.11);
    }
    &__option input:checked + .profile-segment__surface .profile-segment__indicator {
      border-color: transparent;
      background: var(--so-control-selected);
      color: #fff;
    }
    &__option input:disabled + .profile-segment__surface {
      border-color: var(--so-border-subtle);
      background: var(--so-surface-inset);
      color: var(--so-text-disabled);
      cursor: not-allowed;
    }
  }
  /* 결과 기준 요약. alert가 아닌 보조 status이므로 카드 안에 또 표면을 만들지 않는다.
     문구가 비어도 자리를 지켜 아래가 밀리지 않는다 */
  .profile-selector {
    &__result {
      display: flex;
      align-items: center;
      min-height: 32px;
      margin: 0;
      padding: 0 var(--so-space-1);
      border: 0;
      border-radius: 0;
      background: transparent;
      color: var(--so-text-secondary);
      font-size: var(--so-type-label);
      line-height: 1.55;
      word-break: keep-all;
      overflow-wrap: anywhere;
    }
    &__result strong {
      color: var(--so-text-title);
      font-weight: 750;
    }
  }
  /* ══ Card ══ 역할에 따라 위계를 둔다. 그림자와 테두리를 동시에 과하게 쓰지 않는다 */
  .card {
    padding: var(--so-space-4);
    margin-bottom: var(--so-space-4);
    border: 1px solid var(--so-border-subtle);
    border-radius: var(--so-radius-md);
    box-shadow: var(--so-shadow-1);
  }
  .card-title {
    font-size: var(--so-type-card);
    font-weight: 750;
    color: var(--so-text-title);
    line-height: var(--so-leading-tight);
    margin-bottom: var(--so-space-4);
  }
  /* ══ Chip filter ══ 선택은 gradient + 흰 글자, 비선택은 흰 surface + 중성 border */
  .category-pills-wrap {
    gap: var(--so-space-2);
    padding: 0 0 var(--so-space-5);
  }
  .cat-pill {
    min-height: 38px;
    gap: var(--so-space-2);
    padding: 0 var(--so-space-4);
    border: 1px solid var(--so-border);
    border-radius: 999px;
    background: var(--so-surface);
    color: var(--so-text-secondary);
    font-size: var(--so-type-label);
    font-weight: 500;
    transition: border-color var(--so-fast) var(--so-ease), background var(--so-fast) var(--so-ease), color var(--so-fast) var(--so-ease), box-shadow var(--so-fast) var(--so-ease);
    &:hover {
      border-color: var(--so-border-strong);
      color: var(--so-text-title);
    }
    &.active {
      border-color: transparent;
      background: var(--so-gradient-brand);
      color: #fff;
      font-weight: 650;
      box-shadow: 0 4px 12px rgba(91, 106, 217, 0.18);
    }
  }
  .cat-count {
    padding: 1px var(--so-space-2);
    border-radius: 999px;
    background: var(--so-surface-inset);
    color: var(--so-text-secondary);
    font-size: var(--so-type-meta);
    font-weight: 650;
  }
  .cat-pill.active .cat-count {
    background: rgba(255, 255, 255, 0.22);
    color: rgba(255, 255, 255, 0.92);
  }
  /* ── 23-adapter-floating-selection.scss ── */
  /* 스크린리더 전용. 화면에서 보이지 않지만 읽힌다 */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: rem(-1);
    padding: 0;
    overflow: hidden;
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }
  /* ══ 분류 필터 Case B ══ 접힘은 한 줄 스크롤, 펼침은 같은 DOM 을 여러 줄로.
     꺾쇠는 rail 밖에 있어야 chip 과 함께 스크롤되지 않는다 */
  /* [1006 수정] 선택 특약만 보기 체크 (8/31 버전 .selected-only-toggle 스타일을 현재 토큰에 맞춤) */
  .selected-only-toggle {
    display: inline-flex;
    align-items: center;
    gap: rem(6);
    margin-bottom: var(--so-space-3);
    font-size: var(--so-type-meta);
    font-weight: 600;
    color: var(--so-action-text);
    cursor: pointer;
    white-space: nowrap;
    user-select: none;
    input[type='checkbox'] {
      width: 15px;
      height: 15px;
      margin: 0;
      accent-color: var(--so-action);
      cursor: pointer;
      flex-shrink: 0;
    }
  }
  .category-filter {
    position: relative;
    isolation: isolate;
    min-width: 0;
    padding-bottom: var(--so-space-5);
    padding-left: rem(4);
    .category-pills-wrap {
      min-height: var(--so-control-h);
      align-items: center;
      padding: rem(2) 0;
    }
  }
  .category-expand-toggle {
    position: absolute;
    z-index: 10;
    top: 0;
    right: 0;
    display: grid;
    place-items: center;
    width: var(--so-control-h);
    min-width: var(--so-control-h);
    height: var(--so-control-h);
    border: 1px solid var(--so-selected-ring);
    border-radius: 50%;
    background: linear-gradient(145deg, #fff 0%, #f1f3ff 100%);
    color: var(--so-action);
    cursor: pointer;
    box-shadow: -10px 0 18px rgba(69, 72, 112, 0.08), 0 6px 16px rgba(91, 106, 217, 0.16);
    transition: border-color var(--so-fast) var(--so-ease), background var(--so-fast) var(--so-ease), box-shadow var(--so-fast) var(--so-ease), transform var(--so-fast) var(--so-ease);
    &:hover {
      border-color: #aeb9f3;
      background: linear-gradient(145deg, #fff 0%, #e9edff 100%);
      color: var(--so-action-hover);
      transform: translateY(-1px);
    }
    &:active {
      transform: scale(0.96);
    }
  }
  .category-expand-icon {
    width: 18px;
    height: 18px;
    transition: transform var(--so-fast) var(--so-ease);
  }
  .category-filter.is-expanded .category-expand-icon {
    transform: rotate(180deg);
  }
  /* ══ Selection card ══ 선택은 색 하나가 아니라 check·면·테두리·굵기로 함께 표현 */
  .rider-grid-large {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: var(--so-space-3);
    padding-bottom: 0;
  }
  .rider-card-large {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: start;
    gap: var(--so-space-3);
    min-height: 92px;
    padding: var(--so-space-4);
    border: 1px solid var(--so-border);
    border-radius: var(--so-radius-md);
    background: var(--so-surface);
    transition: border-color var(--so-base) var(--so-ease), background var(--so-base) var(--so-ease), box-shadow var(--so-base) var(--so-ease), transform var(--so-base) var(--so-ease);
    &:hover {
      border-color: var(--so-selected-ring);
      box-shadow: var(--so-shadow-2);
      transform: translateY(-1px);
    }
    &.selected {
      border-color: var(--so-selected-ring);
      background: var(--so-gradient-selected-surface);
      box-shadow: 0 0 0 1px var(--so-selected-ring), var(--so-shadow-1);
    }
    &.selected .rider-name-large {
      font-weight: 650;
      color: var(--so-text-title);
    }
  }
  .rider-card-header {
    width: auto;
    display: block;
  }
  .rider-load-more {
    @include flexbox(center, center);
    gap: var(--so-space-3);
    width: 100%;
    min-height: 52px;
    margin-top: var(--so-space-3);
    padding: 0 var(--so-space-5);
    border: 1px solid var(--so-border);
    border-radius: var(--so-radius-md);
    background: var(--so-surface);
    color: var(--so-action-text);
    font-size: var(--so-type-label);
    font-weight: 700;
    cursor: pointer;
    transition: border-color var(--so-fast) var(--so-ease), background var(--so-fast) var(--so-ease), box-shadow var(--so-fast) var(--so-ease);
    &:hover:not([aria-disabled='true']) {
      border-color: var(--so-selected-ring);
      background: var(--so-action-subtle);
      box-shadow: var(--so-shadow-1);
    }
    &[aria-disabled='true'] {
      cursor: default;
      color: var(--so-text-secondary);
      background: var(--so-surface-subtle);
    }
  }
  /* 네이티브 체크박스를 갤러리 형태로 다시 그린다 */
  .rider-checkbox-large {
    appearance: none;
    -webkit-appearance: none;
    width: 22px;
    height: 22px;
    margin: rem(1) 0 0;
    flex-shrink: 0;
    position: relative;
    border: 1px solid var(--so-border-strong);
    border-radius: 6px;
    background: var(--so-surface);
    cursor: pointer;
    transition: border-color var(--so-fast) var(--so-ease), background var(--so-fast) var(--so-ease);
    &:hover {
      border-color: var(--so-text-tertiary);
    }
    &:checked {
      border-color: transparent;
      background: var(--so-gradient-brand);
    }
    &:checked::after {
      content: '';
      position: absolute;
      left: 7px;
      top: 3px;
      width: 5px;
      height: 10px;
      border-right: 2px solid #fff;
      border-bottom: 2px solid #fff;
      transform: rotate(45deg);
    }
  }
  .rider-name-large {
    min-width: 0;
    font-size: var(--so-type-body);
    font-weight: 500;
    line-height: 1.45;
    color: var(--so-text-title);
    word-break: keep-all;
    overflow-wrap: anywhere;
  }
  /* ══ Primary action ══ 모든 폭에서 목록 다음 하단 중앙을 유지한다 */
  .selection-footer {
    justify-content: center;
    width: 100%;
    padding: var(--so-space-4) 0;
    background: rgba(249, 249, 255, 0.9);
    backdrop-filter: blur(12px);
    border-top: 1px solid var(--so-border-subtle);
  }
  .main-generate-btn {
    width: min(100%, clamp(480px, 48vw, 680px));
    min-width: 0;
    min-height: 52px;
    margin-inline: auto;
    padding: 0 var(--so-space-8);
    border-radius: var(--so-radius-sm);
    border: 1px solid transparent;
    background: var(--so-gradient-brand);
    color: #fff;
    font-size: var(--so-type-body-lg);
    font-weight: 750;
    letter-spacing: -0.01em;
    white-space: nowrap;
    box-shadow: var(--so-shadow-brand);
    transition: background var(--so-base) var(--so-ease), box-shadow var(--so-base) var(--so-ease), transform var(--so-fast) var(--so-ease);
    &:hover:not(:disabled) {
      background: var(--so-gradient-brand-hover);
      box-shadow: 0 10px 26px rgba(91, 106, 217, 0.24);
    }
    &:active:not(:disabled) {
      box-shadow: 0 4px 12px rgba(91, 106, 217, 0.17);
      transform: translateY(1px);
    }
    &:disabled {
      background: var(--so-surface-inset);
      color: var(--so-text-disabled);
      border-color: var(--so-border);
      box-shadow: none;
      cursor: not-allowed;
    }
  }
  /* ── 24-adapter-result.scss ── */
  /* ══ 결과 화면 ══ */
  .content {
    --result-inset: 24px;
    padding: var(--so-space-6) var(--so-gutter);
    min-width: 0;
    /* [1006 수정] 본문 760px 상한 제거: 태블릿·데스크톱 모두 본문이 화면 폭을 따라 늘어나게 */
    > * {
      max-width: none;
      margin-left: 0;
      margin-right: auto;
    }
  }
  .sidebar {
    width: 340px;
    flex-shrink: 0;
    padding: var(--so-space-5);
    border-right: 0;
    border-left: 1px solid var(--so-border-subtle);
    background: var(--so-surface-subtle);
  }
  .tabs {
    gap: var(--so-space-6);
    padding-inline: calc(var(--result-inset) + 1px);
    margin-bottom: var(--so-space-5);
    border-bottom-color: var(--so-border-subtle);
  }
  .tab {
    position: relative;
    min-height: var(--so-control-h);
    display: inline-flex;
    align-items: center;
    padding: 0;
    border: 0;
    background: none;
    font-family: inherit;
    font-size: var(--so-type-body);
    font-weight: 650;
    color: var(--so-text-secondary);
    &::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: -1px;
      height: 3px;
      border-radius: 3px 3px 0 0;
      background: transparent;
      transition: background var(--so-base) var(--so-ease);
    }
    &:hover {
      color: var(--so-text-title);
    }
    &.active {
      color: var(--so-action-text);
      border-color: transparent;
    }
    &.active::after {
      background: var(--so-gradient-brand);
    }
    &:focus-visible {
      outline: 2px solid var(--so-action);
      outline-offset: -2px;
      box-shadow: none;
    }
  }
  .script-box {
    border: 1px solid var(--so-border-subtle);
    border-radius: var(--so-radius-lg);
    box-shadow: var(--so-shadow-1);
  }
  .design-summary {
    background: var(--so-surface-subtle);
    border-bottom: 1px solid var(--so-border-subtle);
  }
  /* 조합 전체를 먼저 설명하는 대표 화법. 상태색이 아닌 cool lavender/blue 정보면이다 */
  .consultation-opening {
    display: grid;
    gap: var(--so-space-4);
    margin-bottom: var(--so-space-5);
    padding: var(--result-inset);
    border: 1px solid var(--so-selected-ring);
    border-radius: var(--so-radius-lg);
    background: radial-gradient(circle at 100% 0, rgba(139, 150, 255, 0.14), transparent 42%), linear-gradient(135deg, #fcfbff 0%, #f5f7ff 56%, #f5fafb 100%);
    box-shadow: var(--so-shadow-2);
    &__header {
      @include flexbox(space-between, flex-start);
      gap: var(--so-space-4);
      flex-wrap: wrap;
    }
    &__eyebrow {
      margin: 0 0 var(--so-space-1);
      color: var(--so-action-text);
      font-size: var(--so-type-label);
      font-weight: 750;
      letter-spacing: 0.02em;
    }
    &__title {
      display: block;
      margin: 0;
      color: var(--so-text-title);
      font-size: 24px;
      font-weight: 780;
      line-height: var(--so-leading-tight);
      letter-spacing: -0.035em;
    }
    &__copy {
      margin: 0;
      padding: var(--so-space-5);
      border: 1px solid rgba(103, 125, 228, 0.16);
      border-radius: var(--so-radius-md);
      background: rgba(255, 255, 255, 0.82);
      color: var(--so-text-title);
      font-size: var(--so-type-body-lg);
      font-weight: 520;
      line-height: var(--so-leading-relaxed);
      word-break: keep-all;
      overflow-wrap: anywhere;
    }
    &__notice {
      margin: 0;
      color: var(--so-text-secondary);
      font-size: var(--so-type-body);
      line-height: var(--so-leading-body);
    }
    &__loading {
      display: flex;
      align-items: center;
      gap: var(--so-space-3);
      min-height: 72px;
      color: var(--so-text-secondary);
      font-size: var(--so-type-body);
    }
  }
  /* 섹션 제목 3종이 모두 13px 이라 위계가 없었다 */
  .summary-header {
    padding: var(--so-space-5) var(--result-inset) var(--so-space-3);
    font-size: var(--so-type-section);
    font-weight: 750;
    color: var(--so-text-title);
    letter-spacing: 0;
    text-transform: none;
    line-height: var(--so-leading-tight);
    border-bottom-color: var(--so-border-subtle);
  }
  .scripts-wrap {
    display: grid;
    gap: var(--so-space-3);
    margin-top: 0;
    padding: var(--so-space-6) var(--result-inset);
  }
  .scripts-list-heading {
    @include flexbox(space-between, flex-start);
    gap: var(--so-space-4);
    padding: 0 0 var(--so-space-2);
    h2 {
      margin: 0;
      color: var(--so-text-title);
      font-size: var(--so-type-section);
      font-weight: 760;
      line-height: var(--so-leading-tight);
    }
    &__count {
      flex: 0 0 auto;
      padding: rem(5) rem(9);
      border-radius: 999px;
      background: var(--so-action-subtle);
      color: var(--so-action-text);
      font-size: var(--so-type-meta);
      font-weight: 700;
    }
  }
  .script-accordion-item {
    overflow: hidden;
    border: 1px solid var(--so-border);
    border-radius: var(--so-radius-md);
    background: var(--so-surface);
    box-shadow: var(--so-shadow-1);
    transition: border-color var(--so-base) var(--so-ease), box-shadow var(--so-base) var(--so-ease);
    &.open,
    &:focus-within {
      border-color: var(--so-selected-ring);
      box-shadow: 0 8px 22px rgba(73, 81, 145, 0.09);
    }
  }
  .script-accordion-heading {
    margin: 0;
  }
  .script-accordion-trigger {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--so-space-3);
    width: 100%;
    min-height: 64px;
    padding: var(--so-space-3) var(--so-space-4);
    border: 0;
    background: var(--so-surface);
    color: var(--so-text-title);
    text-align: left;
    cursor: pointer;
    transition: background var(--so-fast) var(--so-ease);
    &:hover {
      background: var(--so-surface-subtle);
    }
    &:focus-visible {
      outline: 3px solid var(--so-action);
      outline-offset: -3px;
      box-shadow: none;
    }
  }
  .script-accordion-item.open .script-accordion-trigger {
    background: var(--so-gradient-selected-surface);
  }
  .script-accordion-trigger {
    &__number {
      display: grid;
      place-items: center;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: var(--so-action-subtle);
      color: var(--so-action-text);
      font-size: var(--so-type-meta);
      font-weight: 750;
    }
    &__name {
      min-width: 0;
      color: var(--so-text-title);
      font-size: var(--so-type-body);
      font-weight: 680;
      line-height: 1.5;
      word-break: keep-all;
      overflow-wrap: anywhere;
    }
    &__action {
      display: inline-flex;
      align-items: center;
      gap: rem(5);
      color: var(--so-action-text);
      font-size: var(--so-type-label);
      font-weight: 680;
      white-space: nowrap;
    }
    &__chevron {
      width: 16px;
      height: 16px;
      transition: transform var(--so-base) var(--so-ease);
    }
  }
  .script-accordion-item.open .script-accordion-trigger__chevron {
    transform: rotate(180deg);
  }
  .script-accordion-panel {
    display: grid;
    gap: var(--so-space-3);
    padding: 0 var(--so-space-4) var(--so-space-4) 58px;
    background: var(--so-gradient-selected-surface);
    .qna-tag-row {
      justify-content: flex-end;
      margin: 0;
    }
  }
  .stat-title {
    font-size: var(--so-type-card);
    font-weight: 650;
    color: var(--so-text-title);
    line-height: var(--so-leading-tight);
    margin-bottom: var(--so-space-3);
  }
  .qna-rider-tag {
    padding: var(--so-space-2) var(--so-space-3);
    border-radius: var(--so-radius-xs);
    border-color: var(--so-border-subtle);
    background: var(--so-surface-subtle);
    font-size: var(--so-type-body-lg);
    font-weight: 650;
    color: var(--so-text-title);
    line-height: var(--so-leading-tight);
  }
  /* 본문과 데이터 */
  .highlight-grid {
    display: flex;
    flex-wrap: wrap;
    gap: var(--so-space-4);
    padding: var(--so-space-5) var(--result-inset);
    background: var(--so-surface-subtle);
    border-bottom: 0;
  }
  /* FIX-X3. 한쪽 면 색선(Border Accent)을 걷고 연한 면과 얇은 전체 테두리로 구분한다.
     가운데 정렬도 해제한다. 업무 화면을 가운데 정렬하지 않는다 */
  .highlight-card {
    flex: 1 1 190px;
    border: 1px solid var(--so-border-subtle);
    border-top: 1px solid var(--so-border-subtle);
    border-radius: var(--so-radius-md);
    padding: var(--so-space-4);
    background: var(--so-surface);
    text-align: left;
    &:nth-child(2),
    &:nth-child(3) {
      border-top-color: var(--so-border-subtle);
    }
  }
  .highlight-headline {
    font-size: var(--so-type-card);
    font-weight: 750;
    color: var(--so-text-title);
    line-height: var(--so-leading-tight);
  }
  .highlight-detail {
    font-size: var(--so-type-body);
    color: var(--so-text);
    line-height: var(--so-leading-body);
    overflow-wrap: anywhere;
  }
  .highlight-source {
    font-size: var(--so-type-meta);
    color: var(--so-text-secondary);
  }
  .stats-row {
    display: grid;
    gap: var(--so-space-4);
    padding: 0 0 var(--so-space-4);
    border-bottom: 0;
  }
  .stat-block {
    border-radius: var(--so-radius-md);
    padding: var(--so-space-5);
    border-color: var(--so-border-subtle);
    background: var(--so-surface);
  }
  .stat-reason {
    font-size: var(--so-type-body);
    line-height: var(--so-leading-body);
    color: var(--so-action-text);
    background: var(--so-action-subtle);
    border: 1px solid var(--so-selected-ring);
    border-left-width: 1px;
    border-radius: var(--so-radius-sm);
    padding: var(--so-space-3) var(--so-space-4);
  }
  .stat-description {
    font-size: var(--so-type-body);
    color: var(--so-text);
    line-height: var(--so-leading-relaxed);
    border-left: 0;
    padding-left: 0;
    padding-top: var(--so-space-3);
    border-top: 1px solid var(--so-border-subtle);
  }
  .stat-source {
    font-size: var(--so-type-meta);
    color: var(--so-text-secondary);
    margin-top: var(--so-space-3);
  }
  .stat-unit-label {
    font-size: var(--so-type-meta);
    color: var(--so-text-secondary);
    background: var(--so-surface-inset);
  }
  .bar-label {
    font-size: var(--so-type-label);
    color: var(--so-text);
    font-weight: 500;
  }
  .bar-value {
    font-size: var(--so-type-label);
    color: var(--so-text-title);
    font-weight: 650;
  }
  .bar-track {
    height: 10px;
    border-radius: 999px;
    background: var(--so-surface-inset);
  }
  .bar-fill {
    border-radius: 999px;
  }
  .donut-center-label {
    font-size: var(--so-type-section);
    color: var(--so-text-title);
  }
  .donut-center-sub {
    font-size: var(--so-type-meta);
    color: var(--so-text-secondary);
  }
  .comparison-val {
    font-size: var(--so-type-body);
    color: var(--so-text-title);
  }
  .comparison-label {
    font-size: var(--so-type-label);
    color: var(--so-text);
  }
  .comparison-bar-outer {
    background: var(--so-surface-inset);
  }
  .script-talk-block {
    font-size: var(--so-type-body-lg);
    color: var(--so-text);
    line-height: var(--so-leading-relaxed);
    border-left: 0;
    padding: var(--so-space-4);
    border: 1px solid var(--so-border-subtle);
    border-radius: var(--so-radius-sm);
    background: var(--so-surface-subtle);
  }
  .summary-tips-block {
    padding: 0 0 var(--so-space-4);
    background: none;
  }
  .result-disclosure {
    margin-inline: var(--result-inset);
    border-top: 1px solid var(--so-border-subtle);
    &__trigger {
      @include flexbox(space-between, center);
      gap: var(--so-space-3);
      min-height: 60px;
      padding-block: var(--so-space-3);
      list-style: none;
      cursor: pointer;
      font-size: var(--so-type-body);
      font-weight: 700;
      color: var(--so-text-title);
      line-height: 1.5;
    }
    &__trigger::-webkit-details-marker {
      display: none;
    }
    &__trigger::after {
      content: '';
      flex: 0 0 auto;
      width: 8px;
      height: 8px;
      margin-right: rem(4);
      border-right: 2px solid currentColor;
      border-bottom: 2px solid currentColor;
      transform: rotate(45deg);
    }
    &[open] > .result-disclosure__trigger::after {
      transform: rotate(225deg);
    }
    &__trigger:focus-visible {
      outline: 2px solid var(--so-action);
      outline-offset: 2px;
      box-shadow: none;
    }
  }
  .result-update-notice {
    margin: 0 0 var(--so-space-5);
    padding: var(--so-space-4) var(--result-inset);
    border-radius: var(--so-radius-md);
    background: var(--so-warning-subtle);
    color: var(--so-warning);
    font-size: var(--so-type-body);
    line-height: var(--so-leading-body);
  }
  .summary-tip-item {
    font-size: var(--so-type-body);
    color: var(--so-text);
    line-height: var(--so-leading-relaxed);
    border-left: 0;
    padding: var(--so-space-3) var(--so-space-4);
    border: 1px solid rgba(109, 81, 205, 0.16);
    border-radius: var(--so-radius-sm);
    background: var(--so-surface);
    margin-bottom: var(--so-space-2);
  }
  .qna-question {
    font-size: var(--so-type-body-lg);
    color: var(--so-text-title);
    font-weight: 650;
    line-height: var(--so-leading-body);
  }
  .qna-tip {
    font-size: var(--so-type-body);
    line-height: var(--so-leading-body);
    padding: var(--so-space-3) var(--so-space-4);
    border-radius: var(--so-radius-sm);
    background: var(--so-success-subtle);
    color: var(--so-success);
  }
  .qna-claim-detail {
    font-size: var(--so-type-body);
    line-height: var(--so-leading-relaxed);
    border-radius: var(--so-radius-sm);
    padding: var(--so-space-4);
    background: var(--so-surface-subtle);
    border-color: var(--so-border-subtle);
    color: var(--so-text);
  }
  .qna-wrap {
    padding: var(--so-space-5) var(--result-inset);
  }
  .qna-section {
    padding: var(--so-space-5) 0 0;
  }
  .qna-notice {
    margin: 0;
    font-size: var(--so-type-body);
    line-height: var(--so-leading-body);
    border-radius: var(--so-radius-sm);
    padding: var(--so-space-4);
    background: var(--so-warning-subtle);
    border-color: #f0dcb0;
    color: var(--so-warning);
  }
  .qna-claim-btn {
    min-height: 44px;
    padding: 0 var(--so-space-3);
    border-radius: var(--so-radius-sm);
    font-size: var(--so-type-label);
    color: var(--so-text-secondary);
    border-color: var(--so-border);
    &:hover {
      border-color: var(--so-border-strong);
      color: var(--so-text-title);
    }
    &.open {
      border-color: var(--so-selected-ring);
      background: var(--so-action-subtle);
      color: var(--so-action-text);
    }
  }
  .qna-divider {
    border-top-color: var(--so-border-subtle);
  }
  /* ══ 결과 편집 패널 ══ 선택 목록은 높이를 자르지 않고 sidebar 한 곳에서만 스크롤한다 */
  .rider-edit-card {
    display: flex;
    flex: 0 0 auto;
    flex-direction: column;
    min-height: auto;
    margin-bottom: 0;
  }
  .chips-sidebar {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--so-space-2);
    max-height: none;
    overflow: visible;
    margin: 0;
  }
  .chip-sidebar {
    align-items: flex-start;
    width: 100%;
    min-width: 0;
    padding: rem(9) rem(10);
    border: 1px solid var(--so-border-subtle);
    border-radius: var(--so-radius-sm);
    background: linear-gradient(135deg, #fbfbff 0%, #f5f7ff 56%, #f4f9f9 100%);
    color: var(--so-text);
    font-size: var(--so-type-label);
    font-weight: 560;
    line-height: 1.48;
    word-break: keep-all;
    overflow-wrap: anywhere;
  }
  .chip-remove-sidebar {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    margin: rem(-3) rem(-3) rem(-3) auto;
    flex: 0 0 auto;
    border: 0;
    background: none;
    border-radius: 50%;
    color: var(--so-text-secondary);
    font-size: 22px;
    line-height: 1;
    &:hover {
      background: var(--so-danger-subtle);
      color: var(--so-danger);
    }
  }
  .sidebar-combobox {
    position: relative;
    margin-top: var(--so-space-4);
  }
  .sidebar-search-input {
    width: 100%;
    padding-right: rem(40);
  }
  .sidebar-search-popover {
    position: absolute;
    z-index: 100;
    top: calc(100% + var(--so-space-2));
    left: 0;
    right: 0;
    overflow: hidden;
    border: 1px solid var(--so-border-strong);
    border-radius: var(--so-radius-md);
    background: var(--so-surface);
    box-shadow: 0 14px 36px rgba(53, 61, 96, 0.16);
  }
  .sidebar-search-listbox {
    max-height: min(416px, 54vh);
    margin: 0;
    padding: var(--so-space-1);
    overflow-y: auto;
    list-style: none;
  }
  .sidebar-search-option {
    display: flex;
    align-items: flex-start;
    gap: var(--so-space-2);
    min-height: 48px;
    padding: rem(11) rem(12);
    border-radius: var(--so-radius-sm);
    color: var(--so-text);
    font-size: var(--so-type-label);
    line-height: 1.45;
    cursor: pointer;
    + .sidebar-search-option {
      margin-top: rem(2);
    }
    &:hover,
    &.active {
      background: var(--so-action-subtle);
      color: var(--so-text-title);
      box-shadow: inset 0 0 0 1px var(--so-selected-ring);
      font-weight: 620;
    }
    &__name {
      flex: 1 1 auto;
      min-width: 0;
      word-break: keep-all;
      overflow-wrap: anywhere;
    }
    .badge {
      flex: 0 0 auto;
      margin-top: rem(1);
    }
  }
  .sidebar-search-empty {
    margin: 0;
    padding: var(--so-space-5);
    color: var(--so-text-secondary);
    font-size: var(--so-type-label);
    line-height: var(--so-leading-body);
    text-align: center;
  }
  .badge {
    font-size: var(--so-type-meta);
    padding: 3px var(--so-space-2);
    border-radius: var(--so-radius-xs);
    font-weight: 650;
    &.ai {
      background: var(--so-ai-subtle);
      color: var(--so-ai);
    }
  }
  .label-small {
    font-size: var(--so-type-label);
    color: var(--so-text-secondary);
  }
  .value-small {
    font-size: var(--so-type-body);
    color: var(--so-text-title);
  }
  .profile-compact-grid {
    display: flex;
    flex-direction: column;
    gap: var(--so-space-4);
  }
  .profile-compact-item {
    padding: 0;
    border: 0;
    background: none;
  }
  .back-btn {
    min-height: var(--so-control-h);
    padding: 0 var(--so-space-4);
    border: 1px solid var(--so-border);
    border-radius: var(--so-radius-sm);
    font-size: var(--so-type-label);
    color: var(--so-text-secondary);
    background: var(--so-surface);
  }
  .sidebar-update-btn {
    min-height: var(--so-control-h);
    padding: 0 var(--so-space-4);
    border-radius: var(--so-radius-sm);
    font-size: var(--so-type-body);
    font-weight: 750;
    background: var(--so-gradient-brand);
    box-shadow: var(--so-shadow-brand);
    transition: background var(--so-base) var(--so-ease), box-shadow var(--so-base) var(--so-ease);
    &:hover:not(:disabled) {
      background: var(--so-gradient-brand-hover);
    }
    &:disabled {
      background: var(--so-surface-inset);
      color: var(--so-text-disabled);
      box-shadow: none;
      cursor: not-allowed;
    }
  }
  /* ══ 상태와 피드백 ══ 문구와 의미는 바꾸지 않는다 */
  .toast {
    padding: var(--so-space-3) var(--so-space-5);
    border-radius: var(--so-radius-sm);
    font-size: var(--so-type-body);
    font-weight: 500;
    &.error {
      background: var(--so-danger);
    }
    &.success {
      background: var(--so-success);
    }
  }
  .phase-loader {
    font-size: var(--so-type-body);
    color: var(--so-text);
    padding: var(--so-space-5) var(--so-space-6);
    border-bottom-color: var(--so-border-subtle);
  }
  .loader {
    border-color: var(--so-border);
    border-top-color: var(--so-action);
  }
  .coming-soon-card {
    border-radius: var(--so-radius-lg);
    border-color: var(--so-border-subtle);
    box-shadow: var(--so-shadow-2);
  }
  .coming-soon-title {
    font-size: var(--so-type-page);
    color: var(--so-text-title);
    line-height: var(--so-leading-tight);
  }
  .coming-soon-desc {
    font-size: var(--so-type-body);
    color: var(--so-text);
    line-height: var(--so-leading-body);
  }
  .coming-soon-back-btn {
    min-height: var(--so-control-h);
    padding: 0 var(--so-space-6);
    border-radius: var(--so-radius-sm);
    background: var(--so-gradient-brand);
    font-size: var(--so-type-body);
    font-weight: 650;
    box-shadow: var(--so-shadow-brand);
    &:hover {
      background: var(--so-gradient-brand-hover);
    }
  }
}

/* ── 25-adapter-responsive.scss ── */

/* ══ 반응형 ══ 글자를 줄이지 않는다. 열 수와 여백만 조정한다 */

@media (max-width: 1027px) {
  .app-root {
    .logo-main {
      font-size: 19px;
    }
    .tab {
      font-size: var(--so-type-body);
      padding: 0;
    }
    .highlight-headline {
      font-size: var(--so-type-card);
    }
    .highlight-detail {
      font-size: var(--so-type-body);
    }
    .bar-label,
    .bar-value {
      font-size: var(--so-type-label);
    }
    .summary-tip-item {
      font-size: var(--so-type-body);
    }
    /* ── 결과 화면 상단 요약 (표준 detail-top-summary) ──────────────────
       가로로 잘린 칩 대신 이름 전체를 세로로 보여 준다.
       접힘 높이는 항상 같고, 펼침은 사용자가 눌렀을 때만이다.
       헤더와 요약 모두 사용자 지시대로 flow이며 고정 chrome을 만들지 않는다 */
    /* 세로 리듬: 서로 다른 정보군 사이는 16px, 같은 정보군 내부는 8px.
       네 정보군은 프로필/뒤로가기 · 특이사항 · 건수/펼침 제어 · 특약 목록이다.
       자식마다 margin 을 덧붙이지 않고 부모 gap 하나로 맞춘다.
       그래야 특이사항이 없어도 남은 정보군 사이 간격이 그대로 16px 이다 */
    .mobile-top-summary {
      padding: var(--so-space-4) var(--so-gutter);
      background: var(--so-surface);
      border-bottom: 1px solid var(--so-border-subtle);
      display: flex;
      flex-direction: column;
      gap: var(--so-space-4);
    }
    .summary-lead {
      display: flex;
      align-items: center;
      gap: var(--so-space-2);
      min-width: 0;
    }
    /* 조건 변경은 결국 이전 화면으로 돌아가는 일이다. 문구 버튼 대신 되돌아가기 하나로 둔다.
       화살표와 조건 pill 을 하나의 button 에 묶어 어느 쪽을 눌러도 같은 곳으로 간다.
       인접한 두 버튼으로 나누면 접근성 트리에 같은 목적지가 둘로 보인다.
       버튼 기본 border·background·font 를 지우고 pill 의 기존 외형을 그대로 유지한다.
       width: auto 와 align-self: flex-start 로 모바일에서 전체 폭을 먹지 않게 한다 */
    .summary-return {
      display: inline-flex;
      align-items: center;
      gap: var(--so-space-2);
      align-self: flex-start;
      width: auto;
      max-width: 100%;
      min-width: 0;
      min-height: var(--so-control-h);
      margin-left: rem(-10);
      padding: 0;
      border: 0;
      border-radius: var(--so-radius-md);
      background: none;
      color: var(--so-text-secondary);
      font: inherit;
      text-align: left;
      cursor: pointer;
      transition: color var(--so-fast) var(--so-ease);
      /* 눌러서 고칠 수 있는 요소임을 은은하게만 드러낸다. 새 Primary 색을 넣지 않는다 */
      &__icon {
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        width: var(--so-control-h);
        height: var(--so-control-h);
        border-radius: var(--so-radius-sm);
        transition: background var(--so-fast) var(--so-ease), color var(--so-fast) var(--so-ease);
      }
      &__icon svg {
        width: 22px;
        height: 22px;
      }
      &:hover {
        color: var(--so-text-title);
      }
      &:hover .summary-return__icon {
        background: var(--so-surface-subtle);
      }
      &:hover .summary-profile {
        border-color: var(--so-action-text);
      }
      &:active .summary-profile {
        transform: translateY(1px);
      }
      /* focus ring 은 화살표와 pill 을 함께 감싼다. 클릭 영역 전체가 하나임을 보여 준다 */
      &:focus-visible {
        outline: 3px solid var(--so-brand-ring);
        outline-offset: 2px;
      }
    }
    .summary-profile {
      display: inline-flex;
      align-items: center;
      gap: var(--so-space-2);
      min-width: 0;
      padding: rem(6) rem(12) rem(6) rem(8);
      border-radius: 999px;
      background: var(--so-gradient-selected-surface);
      border: 1px solid var(--so-selected-ring);
      &__icon {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        flex: 0 0 auto;
        background: var(--so-gradient-brand);
        color: #fff;
        display: grid;
        place-items: center;
      }
      &__icon svg {
        width: 14px;
        height: 14px;
      }
      &__value {
        font-size: var(--so-type-label);
        font-weight: 700;
        color: var(--so-action-text);
        white-space: nowrap;
      }
    }
    /* 특이사항도 고객 조건의 일부다. 요약에서 빠지면 안 된다 */
    .summary-notes {
      margin: 0;
      font-size: var(--so-type-body);
      color: var(--so-text-secondary);
      line-height: var(--so-leading-body);
      overflow-wrap: anywhere;
    }
    .summary-riders {
      display: flex;
      align-items: center;
      gap: var(--so-space-2);
      &__count {
        display: inline-flex;
        align-items: center;
        gap: rem(5);
        font-size: var(--so-type-label);
        font-weight: 700;
        color: var(--so-text-secondary);
        white-space: nowrap;
      }
      &__count b {
        color: var(--so-action-text);
      }
      &__count svg {
        width: 15px;
        height: 15px;
        color: var(--so-action);
        flex: 0 0 auto;
      }
    }
    /* 여는 길 1. 목록 길이와 무관하게 늘 같은 자리에 있다 */
    .rider-headlink {
      position: relative;
      margin-left: auto;
      flex: 0 0 auto;
      min-height: 32px;
      padding: 0 rem(10);
      border-radius: var(--so-radius-xs);
      border: 1px solid var(--so-selected-ring);
      background: var(--so-gradient-selected-surface);
      color: var(--so-action-text);
      font-size: var(--so-type-label);
      font-weight: 650;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: rem(5);
      white-space: nowrap;
      /* 보이는 크기는 32px 로 가볍게 두되 실제로 눌리는 영역은 44px 을 채운다 */
      &::after {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        top: 50%;
        height: var(--so-control-h);
        transform: translateY(-50%);
      }
      &:hover {
        background: var(--so-action-subtle);
      }
    }
    .rider-list {
      display: flex;
      flex-direction: column;
      gap: var(--so-space-2);
    }
    /* 접힘은 4번째 항목부터. DOM 에서 빠지지는 않는다 */
    .mobile-top-summary[data-expanded='false'] .rider-list__item:nth-child(n + 4) {
      display: none;
    }
    .rider-list {
      &__item {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: var(--so-space-2);
        align-items: start;
        padding: rem(9) rem(12);
        border-radius: var(--so-radius-sm);
        background: var(--so-surface-subtle);
        border: 1px solid var(--so-border);
      }
      &__no {
        font-size: var(--so-type-meta);
        font-weight: 700;
        color: var(--so-action-text);
        background: var(--so-action-subtle);
        border-radius: var(--so-radius-xs);
        padding: rem(1) rem(6);
        margin-top: rem(2);
      }
      /* 이름은 두 조각. 핵심어는 굵게, 상품표기는 작고 옅게 */
      &__name {
        font-size: var(--so-type-label);
        line-height: 1.45;
        color: var(--so-text-title);
        font-weight: 650;
        overflow-wrap: anywhere;
      }
      &__sub {
        display: block;
        font-weight: 400;
        color: var(--so-text-tertiary);
        font-size: var(--so-type-meta);
      }
    }
    /* 여는 길 2. 잘린 지점 바로 옆에서 남은 건수를 글자로 알린다 */
    .rider-more {
      align-self: stretch;
      min-height: var(--so-control-h);
      border-radius: var(--so-radius-sm);
      border: 1px dashed var(--so-selected-ring);
      background: none;
      color: var(--so-action-text);
      font-size: var(--so-type-label);
      font-weight: 650;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--so-space-2);
      &:hover {
        background: var(--so-gradient-selected-surface);
      }
    }
    .summary-chevron {
      width: 15px;
      height: 15px;
      flex: 0 0 auto;
      transition: transform var(--so-base) var(--so-ease);
    }
    .mobile-top-summary {
      &[data-expanded='true'] .summary-chevron {
        transform: rotate(180deg);
      }
      :focus-visible {
        outline: 3px solid var(--so-brand-ring);
        outline-offset: 2px;
      }
    }
    .selection-view {
      padding: var(--so-space-5) var(--so-gutter) 0;
    }
    .content {
      padding: var(--so-space-5) var(--so-gutter);
    }
    .rider-grid-large {
      grid-template-columns: 1fr;
    }
    .profile-selector {
      padding: 0;
      gap: var(--so-space-3);
    }
    .selection-footer {
      padding: var(--so-space-3) var(--so-gutter);
      padding-bottom: max(var(--so-space-3), env(safe-area-inset-bottom, 0px));
    }
    .main-generate-btn {
      padding: 0;
    }
    /* 필터는 벽처럼 쌓지 않고 한 줄 가로 스크롤로 훑게 한다 */
    .category-pills-wrap {
      flex-wrap: nowrap;
      overflow-x: auto;
      scroll-snap-type: x proximity;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      &::-webkit-scrollbar {
        display: none;
      }
    }
    .cat-pill {
      scroll-snap-align: start;
      flex: 0 0 auto;
    }
    /* 마지막 chip 이 꺾쇠 아래에 숨지 않도록 끝 여백을 준다 */
    .category-filter {
      &.has-overflow .category-pills-wrap {
        padding-right: rem(58);
        scroll-padding-inline-end: 58px;
      }
      /* 원형 제어의 둥근 모서리 밖으로 뒤 chip이 비치지 않게 먼저 불투명 면으로 차폐한다. */
      &.has-overflow::before {
        content: '';
        position: absolute;
        z-index: 5;
        top: 0;
        right: 0;
        width: calc(var(--so-control-h) + var(--so-space-2));
        height: var(--so-control-h);
        background: var(--so-page);
        pointer-events: none;
      }
      &.has-overflow::after {
        content: '';
        position: absolute;
        z-index: 5;
        top: 0;
        right: calc(var(--so-control-h) + var(--so-space-2));
        height: var(--so-control-h);
        width: 28px;
        background: linear-gradient(90deg, transparent, var(--so-page));
        pointer-events: none;
      }
      &.is-expanded::before,
      &.is-expanded::after {
        opacity: 0;
      }
      /* 펼침. chip 을 복제하지 않고 같은 DOM 을 여러 줄로 흘린다 */
      &.is-expanded .category-pills-wrap {
        flex-wrap: wrap;
        overflow-x: visible;
        scroll-snap-type: none;
        row-gap: var(--so-space-2);
        padding-right: rem(58);
      }
      /* overflow 측정용. 펼침 규칙(.is-expanded)보다 특정도가 높아야 한다.
      낮으면 펼친 상태를 그대로 재서 넘치지 않는다고 오판하고 즉시 접힌다 */
      &.is-expanded .category-pills-wrap.is-measuring,
      .category-pills-wrap.is-measuring {
        flex-wrap: nowrap;
        overflow-x: auto;
      }
    }
  }
}

/* 상품·고객정보만 읽기 좋은 넓이로 제한하고 내부 필드는 공간을 나눠 쓴다 */

@media (min-width: 760px) {
  .app-root .profile-selector__fields {
    grid-template-columns: minmax(220px, 0.8fr) minmax(320px, 1.2fr);
    align-items: start;
  }
}

/* compact 결과는 한 열, 선택 목록은 태블릿 공간에서 다시 두 열을 허용한다 */

@media (min-width: 851px) and (max-width: 1027px) {
  .app-root {
    .container {
      flex: 0 0 auto;
      flex-direction: column;
      min-height: calc(100dvh - 60px - 64px);
      overflow: visible;
      /* [1006 수정] 공통 헤더(60px) 만큼 뺌 */
    }
    .desktop-only {
      display: none !important;
    }
    .sidebar {
      display: none !important;
    }
    .content {
      flex: 0 0 auto;
      min-height: 0;
      order: 1;
      padding: var(--so-space-5) var(--so-gutter);
      overflow-y: visible;
    }
    .rider-grid-large {
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    }
  }
}

/* 1028px부터 편집 패널을 왼쪽, 읽기 본문을 오른쪽에 둔다 */

@media (min-width: 1028px) {
  /* 넓은 화면에서도 우측 마지막 열에 붙이지 않고 작업 영역 하단 중앙에 둔다. */
  .app-root {
    .selection-footer {
      align-self: stretch;
      width: 100%;
      padding: var(--so-space-4) 0;
      padding-bottom: max(var(--so-space-3), env(safe-area-inset-bottom, 0px));
      border: 0;
      border-top: 1px solid var(--so-border-subtle);
      border-radius: 0;
      background: rgba(249, 249, 255, 0.92);
      box-shadow: none;
      backdrop-filter: blur(12px);
    }
    .main-generate-btn {
      min-height: 56px;
      padding: 0 var(--so-space-6);
      border-radius: var(--so-radius-md);
    }
    .container {
      display: grid;
      /* [1006 수정] 사이드바는 작업 영역 기준 27%(240~300px)로 줄이고 본문(화법)에 폭을 더 준다 */
      gap: var(--so-space-6);
      width: calc(100% - var(--so-edge) - var(--so-edge));
      flex: 0 0 auto;
      align-items: start;
      min-height: calc(100dvh - 60px - 64px);
      /* [1006 수정] 공통 헤더(60px) 만큼 뺌 */
      max-width: none;
      margin: 0 auto;
      padding: 0;
      overflow: visible;
    }
    .sidebar {
      grid-column: 1;
      grid-row: 1;
      order: 1;
      width: auto;
      min-width: 0;
      padding: var(--so-space-6) var(--so-space-3);
      overflow-y: visible;
      /* [1006 수정] 좌우 여백 20px → 12px: 좁아진 사이드바 안쪽 공간 확보 */
      border: 0;
      border-right: 1px solid var(--so-border-subtle);
      background: var(--so-surface-subtle);
    }
    .content {
      grid-row: 1;
      order: 2;
      min-width: 0;
      padding: var(--so-space-6) 0 var(--so-space-8);
      overflow-y: visible;
    }
    /* 편집 패널 하단 입력창에서는 목록을 위로 열어 viewport 아래 잘림을 피한다 */
    .sidebar-search-popover {
      top: auto;
      bottom: calc(100% + var(--so-space-2));
    }
  }
}

@media (max-width: 560px) {
  .app-root {
    .content {
      --result-inset: 16px;
    }
    .main-generate-btn {
      width: 100%;
      max-width: none;
    }
    .consultation-opening {
      padding: var(--so-space-5) var(--result-inset);
      &__header {
        display: grid;
        gap: var(--so-space-3);
      }
      &__copy {
        padding: var(--so-space-4);
        font-size: var(--so-type-body);
      }
    }
    .scripts-list-heading {
      align-items: flex-start;
    }
    .script-accordion-trigger {
      grid-template-columns: auto minmax(0, 1fr) 20px;
      align-items: start;
      gap: var(--so-space-2);
      padding: var(--so-space-3);
      &__action {
        justify-self: center;
        padding-block: rem(4);
      }
    }
    /* 전체 헤더가 터치 대상이다. 조작명은 화면에서만 숨기고 접근성 이름에는 남긴다. */
    .script-accordion-trigger__label,
    .script-accordion-panel .script-claim-action-label {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: rem(-1);
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
      border: 0;
    }
    .script-accordion-panel {
      grid-template-columns: minmax(0, 1fr);
      min-width: 0;
      padding: 0 var(--so-space-3) var(--so-space-3);
      .qna-claim-btn {
        width: 100%;
        min-width: 0;
        justify-content: center;
        gap: var(--so-space-2);
      }
      .qna-claim-btn svg {
        flex: 0 0 auto;
      }
      .qna-claim-detail {
        margin-bottom: 0;
      }
      .script-talk-block {
        min-width: 0;
        overflow-wrap: anywhere;
      }
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-root {
    .rider-card-large,
    .main-generate-btn,
    .tab::after {
      transition: none;
    }
    .category-expand-toggle,
    .category-expand-icon {
      transition: none;
    }
    .category-expand-toggle:hover {
      transform: none;
    }
    .rider-card-large:hover {
      transform: none;
    }
    .summary-return {
      transition: none;
      &__icon {
        transition: none;
      }
      &:active .summary-profile {
        transform: none;
      }
    }
    .script-accordion-item,
    .script-accordion-trigger,
    .script-accordion-trigger__chevron {
      transition: none;
    }
  }
}

/* ── [1006 수정] 시험: 데스크톱 결과 화면 사이드바 숨김 (되돌리려면 이 블록만 지우면 됨) ── */

@media (min-width: 1028px) {
  .app-root {
    .sidebar {
      display: none;
    }
    .container {
      grid-template-columns: minmax(0, 1fr);
    }
    .content {
      grid-column: 1;
    }
  }
}
</style>
