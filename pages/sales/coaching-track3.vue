<script>
import { renderMarkdown } from '@/utils/markdown'
import { throws } from 'assert'
import DOMPurify from 'dompurify'

const CATEGORY_ORDER = [
  '암진단', '암치료', '순환계진단', '순환계치료',
  '수술', '입원', '입원/수술', '시니어', '재해', '사망/장해', '기타',
]

const RIDER_BATCH_SIZE = 10
const SCRIPT_BATCH_SIZE = 9
const SCRIPT_PAGE_SIZE = SCRIPT_BATCH_SIZE
const SUMMARY_VISIBLE_RIDERS = 3

const BAR_COLORS = ['#2563eb', '#0891b2', '#6366f1', '#0d9488', '#7c3aed', '#1d4ed8']
const COMPARISON_COLORS = ['#2563eb', '#8b5cf6']

function toggleItem(list, item) {
  return list.includes(item) ? list.filter((v) => v !== item) : [...list, item]
}

function splitRiderName(name) {
  const m = name.match(/^(.*?)\s*\(([^()]*)\)\s*$/)
  if (!m || !m[1]) return { main: name, sub: '' }
  return { main: m[1], sub: m[2].split(',').map((x) => x.trim()).filter(Boolean).join(', ') }
}

export default {
  name: 'CoachingTrack',

  data() {
    return {
      isComingSoon: false,
      returningToEdit: false,

      riders: [],
      apiProducts: [],
      selectedProduct: '',
      isPresetting: false,
      filters: { age: '50대', gender: '남성', notes: '' },
      ageOptions: ['~10대', '20대', '30대', '40대', '50대', '60대', '70대', '80대~'],
      genderOptions: ['남성', '여성'],
      ageSelectId: 'profile-age-select',
      openDropdown: null,
      dropdownActiveIndex: -1,
      selectedRiders: [],
      activeCategory: '전체',
      showSelectedOnly: false,
      categoryExpanded: false,
      categoryOverflow: false,
      riderGridHasThreeColumns: false,
      visibleRiderLimit: RIDER_BATCH_SIZE,

      productCodeByName: {},
      productNameByJar: {},
      riderIdByCode: {},

      isGenerating: false,
      scriptTotalCount: 0,
      scriptPageCount: 0,
      scriptPages: [],
      scriptRevealedPages: 1,
      generatedScript: null,
      resultRiders: [],
      resultFilters: {},
      resultConditionKey: '',
      activeTab: 'script',
      summaryExpanded: false,
      expandedScriptNames: [],
      expandedDescNames: [],
      expandedClaimNames: [],

      sidebarSearchTerm: '',
      sidebarComboboxOpen: false,
      sidebarActiveIndex: -1,
      sidebarComposing: false,
      sidebarListboxId: 'sidebar-rider-search-listbox',

      toasts: [],

      COMPARISON_COLORS,
    }
  },

  computed: {
    currentMode() {
      return this.$route.query.mode || 'list'
    },
    currentStep() {
      if (this.isComingSoon) return 'coming-soon'
      return this.currentMode === 'view' ? 'result' : 'selection'
    },

    availableProducts() {
      return this.apiProducts
    },
    productRiders() {
      return this.riders.filter((r) => r.product === this.selectedProduct)
    },
    isCurrentProductReady() {
      return this.apiProducts.includes(this.selectedProduct)
    },
    selectedDataFull() {
      return this.productRiders.filter((r) => this.selectedRiders.includes(r.id))
    },

    profileSummary() {
      const { age, gender } = this.filters
      return age && gender ? `${age} ${gender}` : ''
    },

    groupedRiders() {
      const groups = {}
      this.productRiders.forEach((rider) => {
        if (!rider.category) return
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
    filteredRiders() {
      const pool = this.activeCategory === '전체'
        ? this.productRiders
        : (this.groupedRiders.find(([cat]) => cat === this.activeCategory)?.[1] ?? [])
      return this.showSelectedOnly ? pool.filter((r) => this.selectedRiders.includes(r.id)) : pool
    },
    visibleRiders() {
      return this.riderGridHasThreeColumns
        ? this.filteredRiders
        : this.filteredRiders.slice(0, this.visibleRiderLimit)
    },
    remainingRiderCount() {
      return Math.max(0, this.filteredRiders.length - this.visibleRiders.length)
    },
    firstScriptPageReady() {
      return Array.isArray(this.scriptPages[0])
    },
    visibleRiderScripts() {
      return this.scriptPages.slice(0, this.scriptRevealedPages).flatMap((page) => page ?? [])
    },
    hasMoreScriptPages() {
      return this.scriptRevealedPages < this.scriptPageCount
    },
    isNextScriptPageReady() {
      return Array.isArray(this.scriptPages[this.scriptRevealedPages])
    },
    showRiderLoadMore() {
      return !this.riderGridHasThreeColumns && this.filteredRiders.length > RIDER_BATCH_SIZE
    },
    selectionStatusText() {
      const count = this.selectedRiders.length
      return count === 0 ? '선택한 특약 없음' : `선택한 특약 ${count}개`
    },

    summaryRiders() {
      return this.selectedDataFull.map((r, i) => ({ id: r.id, no: i + 1, ...splitRiderName(r.name) }))
    },
    summaryHiddenCount() {
      return Math.max(0, this.summaryRiders.length - SUMMARY_VISIBLE_RIDERS)
    },
    summaryReturnLabel() {
      return `${this.filters.age} ${this.filters.gender}, 고객 정보와 특약 다시 선택하기`
    },

    currentConditionKey() {
      return JSON.stringify({
        product: this.selectedProduct,
        filters: this.filters,
        riders: [...this.selectedRiders].sort(),
      })
    },
    resultNeedsUpdate() {
      return Boolean(this.resultConditionKey) && this.resultConditionKey !== this.currentConditionKey
    },

    consultationCategoryLabel() {
      const categories = [...new Set(this.resultRiders.map((r) => r.category).filter(Boolean))]
      if (categories.length === 0) return '선택한 보장'
      if (categories.length <= 3) return categories.join('·')
      return `${categories.slice(0, 3).join('·')} 등 ${categories.length}개 영역`
    },
    consultationOpening() {
      const count = this.resultRiders.length
      const riderLabel = count > 0 ? `선택하신 ${count}개 특약` : '선택하신 특약'
      return `고객님, 오늘은 ${riderLabel}을 ${this.consultationCategoryLabel} 관점에서 함께 살펴보겠습니다. 보장을 하나씩 나열하기보다 먼저 가장 신경 쓰이는 상황을 확인하고, 각 특약이 언제 도움이 될 수 있는지와 꼭 확인할 조건을 차례로 설명드릴게요.`
    },

    qnaByRider() {
      const groups = new Map()
      for (const item of this.generatedScript?.qna ?? []) {
        const rider = item.rider ?? '기타'
        if (!groups.has(rider)) groups.set(rider, { rider, items: [] })
        groups.get(rider).items.push(item)
      }
      return [...groups.values()]
    },
    riderScriptNames() {
      return this.generatedScript?.riderScripts.map((s) => s.name) ?? []
    },

    sidebarCandidateRiders() {
      const query = this.sidebarSearchTerm.trim().toLocaleLowerCase('ko-KR')
      return this.productRiders.filter((rider) => {
        if (this.selectedRiders.includes(rider.id)) return false
        return !query || rider.name.toLocaleLowerCase('ko-KR').includes(query)
      })
    },
    sidebarActiveOptionId() {
      const rider = this.sidebarCandidateRiders[this.sidebarActiveIndex]
      return rider ? this.sidebarOptionId(rider) : undefined
    },
    sidebarSearchStatus() {
      if (!this.sidebarComboboxOpen) return ''
      const count = this.sidebarCandidateRiders.length
      if (count === 0) return '일치하는 특약이 없습니다.'
      return this.sidebarSearchTerm.trim() ? `검색 결과 ${count}개` : `추가할 수 있는 특약 ${count}개`
    },
  },

  watch: {
    currentMode(mode, prevMode) {
      if (mode === 'view') this.isComingSoon = false
      else if (prevMode === 'view') this.returningToEdit = true
    },
    selectedProduct() {
      this.selectedRiders = []
      this.activeCategory = '전체'
      this.showSelectedOnly = false
      this.visibleRiderLimit = RIDER_BATCH_SIZE
      this.sidebarSearchTerm = ''
      this.closeSidebarCombobox()
      if (!this.isPresetting) this.fetchRiders()
    },
    activeCategory() {
      this.visibleRiderLimit = RIDER_BATCH_SIZE
    },
    showSelectedOnly(on) {
      this.visibleRiderLimit = RIDER_BATCH_SIZE
      if (on) this.activeCategory = '전체'
    },
    'selectedRiders.length'(count) {
      if (count === 0) this.showSelectedOnly = false
    },
    returningToEdit(on) {
      if (!on) return
      this.activeCategory = '전체'
      if (this.selectedRiders.length > 0) this.showSelectedOnly = true
    },
    currentStep(step) {
      this.disconnectObservers()
      if (step !== 'selection') {
        this.riderGridHasThreeColumns = false
        return
      }
      this.$nextTick(this.observeSelectionLayout)
    },
    'groupedRiders.length'() {
      this.$nextTick(this.measureCategoryOverflow)
    },
    riderScriptNames(names) {
      const available = new Set(names)
      this.expandedScriptNames = this.expandedScriptNames.filter((n) => available.has(n))
      this.expandedDescNames = this.expandedDescNames.filter((n) => available.has(n))
    },
    sidebarCandidateRiders() {
      if (this.sidebarComboboxOpen) this.syncSidebarActiveIndex(this.sidebarActiveIndex)
    },
  },

  created() {
    if (this.$route.query.mode === 'view') {
      this.$router.replace({ query: { ...this.$route.query, mode: 'list' } })
    }
    this.riderGridRO = null
    this.categoryRO = null
    this.toastCounter = 0
  },

  async mounted() {
    this.$nextTick(this.observeSelectionLayout)
    document.addEventListener('pointerdown', this.handleSidebarPointerDown)
    await this.fetchProductCodes()
    const { presetKey, sarangOnDataKey } = this.$route.query
    const key = presetKey || sarangOnDataKey
    if (key) await this.applyPreset(String(key))
  },

  beforeDestroy() {
    this.disconnectObservers()
    document.removeEventListener('pointerdown', this.handleSidebarPointerDown)
  },

  methods: {
        showToast(message, type = 'info', duration = 4000) {
      const id = ++this.toastCounter
      this.toasts.push({ id, message, type })
      setTimeout(() => {
        this.toasts = this.toasts.filter((t) => t.id !== id)
      }, duration)
    },

    async fetchProductCodes() {
      try {
        const { items } = await this.$axios.get('/coaching/map/product')
        if (Array.isArray(items)) {
          // 앱 상품 하나가 지심검 판매버전 여러 개에 걸치면 최근 버전 이름을 쓴다
          const pdNmByJar = {}
          for (const item of items) {
            const name = item.pd_nm || item.jar_nm
            if (!pdNmByJar[item.jar_code] || name > pdNmByJar[item.jar_code]) pdNmByJar[item.jar_code] = name
          }
          this.productNameByJar = pdNmByJar
          this.productCodeByName = {}
          for (const [jarCode, name] of Object.entries(pdNmByJar)) {
            if (!this.productCodeByName[name]) this.productCodeByName[name] = jarCode
          }
          this.apiProducts = Object.keys(this.productCodeByName)
          if (this.apiProducts.length === 0) {
            this.showToast('해당 상품을 지원하지 않습니다.', 'error', 5000)
            return
          }
          if (!this.apiProducts.includes(this.selectedProduct)) {
            this.isPresetting = true
            this.selectedProduct = this.apiProducts[0]
            await this.$nextTick()
            this.isPresetting = false
          }
        }
        await this.fetchRiders()
      } catch {
        this.showToast('해당 상품을 지원하지 않습니다.', 'error', 5000)
      }
    },
    async fetchRiders() {
      const jarCode = this.productCodeByName[this.selectedProduct]
      try {
        if (!jarCode) throw new Error('상품코드 없음')
        const { items } = await this.$axios.get(`/coaching/map/rider/${jarCode}`)
        if (!Array.isArray(items) || items.length === 0) throw new Error('특약 매핑 없음')
        const now = new Date()
        const today = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
        const onSale = (x) => (!x.from_date || x.from_date <= today) && (!x.to_date || today <= x.to_date)
        const byCode = new Map()
        for (const item of items) {
          const prev = byCode.get(item.jar_rd_code)
          const better = !prev
            || (onSale(item) && !onSale(prev))
            || (onSale(item) === onSale(prev) && (item.from_date || '') > (prev.from_date || ''))
          if (better) byCode.set(item.jar_rd_code, item)
        }
        const byAcsName = new Map()
        for (const item of byCode.values()) {
          const name = item.pd_rd_nm || item.jar_rd_nm
          const group = byAcsName.get(name)
          if (group) {
            group.codes.push(item.jar_rd_code)
            continue
          }
          byAcsName.set(name, {
          id: item.jar_rd_code,
            codes: [item.jar_rd_code],
            product: this.selectedProduct,
            name,
          category: item.category,
          description: '',
          })
        }
        this.riders = [...byAcsName.values()]
        this.riderIdByCode = Object.fromEntries(this.riders.flatMap((r) => r.codes.map((code) => [code, r.id])))
      } catch {
        this.riders = []
        this.riderIdByCode = {}
        if (jarCode) this.showToast('특약 정보를 불러오지 못했습니다.', 'error', 5000)
      }
    },
    async applyPreset(presetKey) {
      try {
        const res = await this.$axios.post(`/coaching/preset`, {token : presetKey},{
          validateStatus: (status) => (status >= 200 && status < 300) || status === 400 || status === 404,
      })
        if (res.status_code === 404) {
          this.showToast(res.detail || '가입설계 정보가 없거나 만료되었습니다.', 'error', 5000)
          return
        }
        if (res.status_code === 400) {
          this.showToast('가입설계 정보가 올바르지 않습니다. 사랑온에서 다시 진입해 주세요.', 'error', 5000)
          return
        }

        const product = this.productNameByJar[res.jar_code]
        if (!product) {
          this.showToast(`지원하지 않는 상품입니다: ${res.products?.[0]?.pd_nm || res.jar_code}`, 'error', 5000)
          return
        }
        if (product !== this.selectedProduct) {
          this.isPresetting = true
          this.selectedProduct = product
          await this.$nextTick()
          await this.fetchRiders()
          this.isPresetting = false
        }

        const available = new Set(this.productRiders.map((r) => r.id))
        const toId = (code) => this.riderIdByCode[code] ?? (available.has(code) ? code : undefined)
        const presetCodes = (res.riders ?? []).map((r) => r.jar_rd_code)
        const ids = presetCodes.map(toId).filter((id) => id && available.has(id))
        this.selectedRiders = [...new Set(ids)]
        if (this.selectedRiders.length > 0) this.showSelectedOnly = true

        const { age, gender, job } = res.profile ?? {}
        // const presetAge = /^([6-9]\d|1\d\d)대$/.test(age ?? '') ? '60대+' : age
        this.filters = {
          ...this.filters,
          age: this.ageOptions.includes(presetAge) ? presetAge : this.filters.age,
          gender: this.genderOptions.includes(gender) ? gender : this.filters.gender,
          ...(job ? { notes : job } : {}),
        }

        const missing = presetCodes.filter((code) => !toId(code)).length + (res.unmapped ?? []).length
        if (!res.succ || this.selectedRiders.length === 0) {
          this.showToast('가입설계의 특약을 불러오지 못했습니다. 특약을 직접 선택해 주세요.', 'error', 5000)
        } else if (missing > 0) {
          this.showToast(`가입설계 특약 중 ${missing}건은 코칭트랙에서 지원하지 않아 제외되었습니다.`, 'info', 5000)
        }
      } catch {
        console.error('[c-t] preset 실패' , e?.response?.status, e?.message, e)
        this.showToast('가입설계 정보를 불러오지 못했습니다.', 'error', 5000)
      } finally {
        this.isPresetting = false
        const { presetKey: _p, sarangOnDataKey: _s, ...rest } = this.$route.query
        this.$router.replace({ query: rest })
      }
    },

    updateFilter(field, value) {
      this.filters = { ...this.filters, [field]: value }
    },
    dropdownOptions(key) {
      return key === 'product' ? this.availableProducts : this.ageOptions
    },
    dropdownValue(key) {
      return key === 'product' ? this.selectedProduct : this.filters.age
    },
    dropdownActiveId(key) {
      if (this.openDropdown !== key || this.dropdownActiveIndex < 0) return undefined
      return `dropdown-option-${key}-${this.dropdownActiveIndex}`
    },
    openDropdownList(key) {
      this.openDropdown = key
      this.dropdownActiveIndex = Math.max(this.dropdownOptions(key).indexOf(this.dropdownValue(key)), 0)
      this.revealDropdownActiveOption()
    },
    toggleDropdown(key) {
      if (this.openDropdown === key) this.closeDropdown(key)
      else this.openDropdownList(key)
    },
    closeDropdown(key) {
      if (this.openDropdown !== key) return
      this.openDropdown = null
      this.dropdownActiveIndex = -1
    },
    chooseDropdownOption(key, value) {
      if (key === 'product') this.selectedProduct = value
      else this.updateFilter('age', value)
      this.closeDropdown(key)
    },
    handleDropdownKeydown(key, event) {
      const isOpen = this.openDropdown === key
      if (event.key === 'Escape') {
        if (isOpen) {
          event.preventDefault()
          this.closeDropdown(key)
        }
        return
      }
      if (event.key === 'Tab') {
        this.closeDropdown(key)
        return
      }
      if (!isOpen) {
        if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
          event.preventDefault()
          this.openDropdownList(key)
        }
        return
      }

      const options = this.dropdownOptions(key)
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        const value = options[this.dropdownActiveIndex]
        if (value === undefined) this.closeDropdown(key)
        else this.chooseDropdownOption(key, value)
        return
      }
      const last = options.length - 1
      const next = {
        ArrowDown: Math.min(this.dropdownActiveIndex + 1, last),
        ArrowUp: Math.max(this.dropdownActiveIndex - 1, 0),
        Home: 0,
        End: last,
      }[event.key]
      if (next === undefined) return
      event.preventDefault()
      this.dropdownActiveIndex = next
      this.revealDropdownActiveOption()
    },
    revealDropdownActiveOption() {
      this.$nextTick(() => {
        const list = this.$refs[`dropdownListbox-${this.openDropdown}`]
        const option = list?.children[this.dropdownActiveIndex]
        if (!list || !option) return
        const optionBottom = option.offsetTop + option.offsetHeight
        if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop
        else if (optionBottom > list.scrollTop + list.clientHeight) list.scrollTop = optionBottom - list.clientHeight
      })
    },
    selectCategory(cat) {
      this.activeCategory = cat
      this.showSelectedOnly = false
    },
    toggleCategoryExpand() {
      this.categoryExpanded = !this.categoryExpanded
    },
    toggleRider(id) {
      this.selectedRiders = toggleItem(this.selectedRiders, id)
    },
    removeRider(id) {
      this.selectedRiders = this.selectedRiders.filter((r) => r !== id)
    },
    showMoreRiders() {
      this.visibleRiderLimit = Math.min(this.filteredRiders.length, this.visibleRiderLimit + RIDER_BATCH_SIZE)
    },

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
    disconnectObservers() {
      this.riderGridRO?.disconnect()
      this.categoryRO?.disconnect()
      this.riderGridRO = null
      this.categoryRO = null
    },
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
    measureCategoryOverflow() {
      const el = this.$refs.categoryRail
      if (!el) return
      const probing = this.categoryExpanded
      if (probing) el.classList.add('is-measuring')
      const over = el.scrollWidth > el.clientWidth + 1
      if (probing) el.classList.remove('is-measuring')
      this.categoryOverflow = over
      if (!over && this.categoryExpanded) this.categoryExpanded = false
    },
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

    handleChangeView(view) {
      if (this.currentMode === view) return
      this.$router.push({ query: { ...this.$route.query, mode: view } })
    },
    handleBackToSelection() {
      if (this.currentMode === 'view') {
        this.handleChangeView('list')
        return
      }
      this.isComingSoon = false
      this.returningToEdit = true
    },

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
      await this.generate()
    },
    async resolveRiders() {
      const jarCode = this.productCodeByName[this.selectedProduct]
      if (!jarCode) throw new Error('지원하지 않는 상품정보입니다.')
          const { riders } = await this.$axios.post('/coaching/riders/resolve', {
            jar_code: jarCode,
            jar_rd_codes: this.resultRiders.map((r) => r.id),
          })
      if (!Array.isArray(riders) || riders.length === 0) throw new Error('지급사유를 조회하지 못했습니다.')
      const nameById = Object.fromEntries(this.resultRiders.map((r) => [r.id, r.name]))
      this.resultRiders = this.resultRiders.map((r) => {
        const found = riders.find((x) => x.jar_rd_code === r.id)
        return { ...r, descriptionHtml: found?.description_html ?? '' }
      })
      return riders.map((x) => ({ ...x, name: nameById[x.jar_rd_code] ?? x.name }))
    },
    async generate() {
      this.isGenerating = true
      this.generatedScript = { designSummary: undefined, riderScripts: [], qna: [] }
      this.scriptTotalCount = 0
      this.scriptPageCount = 0
      this.scriptPages = []
      this.scriptRevealedPages = 1

      let riders
      try {
        riders = await this.resolveRiders()
      } catch (e) {
        const msg = e?.response?.data?.detail ?? e?.message ?? String(e)
        this.showToast(`지급사유 조회에 실패했습니다: ${msg}`, 'error', 5000)
        this.isGenerating = false
        this.handleChangeView('list')
        return
      }
      const payload = { profile: { ...this.resultFilters }, riders }

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

      const scriptsP = this.generateScriptsInPages(payload)
        .then((riderScripts) => this.fetchTips(payload.profile, riderScripts))

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
    // 특약별 화법: 9개씩 잘라 /generate/scripts 
    async generateScriptsInPages(payload) {
      const usable = payload.riders.filter((r) => r.has_reason)
      if (usable.length === 0) throw new Error('지급사유가 있는 특약이 없어 화법을 생성할 수 없습니다.')

      const pages = []
      for (let i = 0; i < usable.length; i += SCRIPT_PAGE_SIZE) pages.push(usable.slice(i, i + SCRIPT_PAGE_SIZE))
      this.scriptTotalCount = usable.length
      this.scriptPageCount = pages.length
      this.scriptPages = new Array(pages.length).fill(undefined)

      const received = []
      const errors = []
      for (let i = 0; i < pages.length; i++) {
        let list = []
        try {
          // 공통 에러 처리(404 → 에러 페이지, 422/500 → 재접속)를 타지 않도록 상태는 직접 처리
          const res = await this.$axios.post('/coaching/generate/scripts', { ...payload, riders: pages[i] }, { validateStatus: () => true })
          list = Array.isArray(res?.riderScripts) ? res.riderScripts : []
          if (list.length === 0) errors.push(res?.detail || '화법 응답이 비어 있습니다.')
        } catch (e) {
          errors.push(e?.message ?? String(e))
        }
        received.push(...list)
        this.scriptPages = this.scriptPages.map((page, idx) => (idx === i ? list : page))
        this.generatedScript = { ...this.generatedScript, riderScripts: [...received] }
      }

      if (errors.length) console.error('[coaching-track] 화법 페이지 실패:', errors)
      // 빈 페이지(실패)는 건너뛰고 받은 화법만으로 다시 9개씩 나눔
      this.scriptTotalCount = received.length
      const regrouped = []
      for (let i = 0; i < received.length; i += SCRIPT_PAGE_SIZE) regrouped.push(received.slice(i, i + SCRIPT_PAGE_SIZE))
      this.scriptPages = regrouped
      this.scriptPageCount = regrouped.length
      if (received.length === 0) throw new Error(typeof errors[0] === 'string' ? errors[0] : '화법을 생성하지 못했습니다.')
      return received
    },
    // 영업 꿀팁. 실패해도 화법 결과에는 영향 없이 섹션만 숨김 (tips 가 비면 v-if 로 안 보임)
    async fetchTips(profile, riderScripts) {
      try {
        // 공통 에러 처리(404 → 에러 페이지, 422/500 → 재접속)를 타지 않도록 모든 상태를 직접 처리
        const res = await this.$axios.post('/coaching/generate/tips', { profile, riderScripts }, { validateStatus: () => true })
        const tips = Array.isArray(res?.tips) ? res.tips.filter((t) => typeof t === 'string' && t.trim()) : []
        const prev = this.generatedScript.designSummary ?? { highlights: [], statistics: [] }
        this.generatedScript = { ...this.generatedScript, designSummary: { ...prev, tips } }
      } catch (e) {
        console.error('[coaching-track] 영업 꿀팁 생성 실패:', e)
      }
    },

    handleResultTabKeydown(event) {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
      event.preventDefault()
      if (event.key === 'Home') this.activeTab = 'script'
      else if (event.key === 'End') this.activeTab = 'points'
      else this.activeTab = this.activeTab === 'script' ? 'points' : 'script'
      this.$nextTick(() => document.getElementById(`result-tab-${this.activeTab}`)?.focus())
    },
    toggleScript(name) {
      if (this.expandedScriptNames.includes(name)) {
        this.expandedDescNames = this.expandedDescNames.filter((n) => n !== name)
      }
      this.expandedScriptNames = toggleItem(this.expandedScriptNames, name)
    },
    toggleDesc(name) {
      this.expandedDescNames = toggleItem(this.expandedDescNames, name)
    },
    toggleClaim(name) {
      this.expandedClaimNames = toggleItem(this.expandedClaimNames, name)
    },
    scriptTriggerId(index) {
      return `rider-script-trigger-${index}`
    },
    scriptPanelId(index) {
      return `rider-script-panel-${index}`
    },
    scriptDescriptionId(index) {
      return `rider-script-description-${index}`
    },

    claimHtml(name) {
      const html = this.resultRiders.find((r) => r.name === name)?.descriptionHtml
      return renderMarkdown(html || '지급사유 정보가 없습니다.')
    },
    barWidth(item, chartData) {
      const max = Math.max(...chartData.map((d) => d.value), 1)
      return ((item.value / max) * 100).toFixed(1) + '%'
    },
    barColor(index) {
      return BAR_COLORS[index % BAR_COLORS.length]
    },
    formatNumber(value) {
      return value.toLocaleString('ko-KR')
    },

    sidebarOptionId(rider) {
      return `sidebar-rider-option-${rider.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`
    },
    syncSidebarActiveIndex(preferred = 0) {
      const last = this.sidebarCandidateRiders.length - 1
      this.sidebarActiveIndex = last < 0 ? -1 : Math.min(Math.max(preferred, 0), last)
    },
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
    openSidebarCombobox() {
      this.sidebarComboboxOpen = true
      this.syncSidebarActiveIndex(Math.max(this.sidebarActiveIndex, 0))
    },
    closeSidebarCombobox() {
      this.sidebarComboboxOpen = false
      this.sidebarActiveIndex = -1
    },
    handleSidebarSearchInput() {
      this.sidebarComboboxOpen = true
      this.$nextTick(() => this.syncSidebarActiveIndex(0))
    },
    addSidebarRider(rider) {
      if (!this.selectedRiders.includes(rider.id)) this.selectedRiders.push(rider.id)
      this.sidebarSearchTerm = ''
      this.sidebarComboboxOpen = true
      this.$nextTick(() => {
        this.syncSidebarActiveIndex(0)
        this.$refs.sidebarSearchInput?.focus()
      })
    },
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
    handleSidebarSearchBlur() {
      this.$nextTick(() => {
        if (!this.$refs.sidebarComboboxRoot?.contains(document.activeElement)) this.closeSidebarCombobox()
      })
    },
    handleSidebarPointerDown(event) {
      if (!(event.target instanceof Node) || this.$refs.sidebarComboboxRoot?.contains(event.target)) return
      this.closeSidebarCombobox()
    },
  },
}
</script>


<template>
  <div class="app-root">

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

    </header>

    <div v-if="currentMode === 'list' && !isComingSoon" class="selection-view">

      <div class="product-selector-bar">
        <div class="product-selector-heading">
          <div class="product-selector-title">상품을 선택해 주세요</div>
        </div>
        <button
          ref="dropdownTrigger-product"
          type="button"
          class="product-selector-select"
          role="combobox"
          aria-label="상품 선택"
          aria-haspopup="listbox"
          :aria-expanded="openDropdown === 'product' ? 'true' : 'false'"
          aria-controls="dropdown-listbox-product"
          :aria-activedescendant="dropdownActiveId('product')"
          @click="toggleDropdown('product')"
          @keydown="handleDropdownKeydown('product', $event)"
          @blur="closeDropdown('product')"
        >{{ selectedProduct }}</button>
        <ul
          v-show="openDropdown === 'product'"
          id="dropdown-listbox-product"
          ref="dropdownListbox-product"
          class="select-listbox"
          role="listbox"
          aria-label="상품"
        >
          <li
            v-for="(p, index) in availableProducts"
            :id="`dropdown-option-product-${index}`"
            :key="p"
            class="select-option"
            :class="{ active: index === dropdownActiveIndex, selected: p === selectedProduct }"
            role="option"
            :aria-selected="p === selectedProduct ? 'true' : 'false'"
            @mouseenter="dropdownActiveIndex = index"
            @mousedown.prevent
            @click="chooseDropdownOption('product', p)"
          >{{ p }}</li>
        </ul>
      </div>

      <div class="selection-header-section">
        <div class="card profile-card-step1">
            <div class="card-title">고객 정보</div>

            <section class="profile-selector">
              <div class="profile-selector__fields">
                <div class="profile-selector__field">
                  <button
                    :id="ageSelectId"
                    ref="dropdownTrigger-age"
                    type="button"
                    class="profile-selector__select"
                    role="combobox"
                    aria-label="연령대"
                    aria-haspopup="listbox"
                    :aria-expanded="openDropdown === 'age' ? 'true' : 'false'"
                    aria-controls="dropdown-listbox-age"
                    :aria-activedescendant="dropdownActiveId('age')"
                    @click="toggleDropdown('age')"
                    @keydown="handleDropdownKeydown('age', $event)"
                    @blur="closeDropdown('age')"
                  >{{ filters.age }}</button>
                  <ul
                    v-show="openDropdown === 'age'"
                    id="dropdown-listbox-age"
                    ref="dropdownListbox-age"
                    class="select-listbox"
                    role="listbox"
                    aria-label="연령대"
                  >
                    <li
                      v-for="(opt, index) in ageOptions"
                      :id="`dropdown-option-age-${index}`"
                      :key="opt"
                      class="select-option"
                      :class="{ active: index === dropdownActiveIndex, selected: opt === filters.age }"
                      role="option"
                      :aria-selected="opt === filters.age ? 'true' : 'false'"
                      @mouseenter="dropdownActiveIndex = index"
                      @mousedown.prevent
                      @click="chooseDropdownOption('age', opt)"
                    >{{ opt }}</li>
                  </ul>
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

      <div>
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

        <p class="sr-only" role="status" aria-live="polite">{{ selectionStatusText }}</p>

        <div class="selection-main-grid">
          <div id="rider-selection-list" ref="riderListEl" tabindex="-1" class="rider-grid-large">
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

    <div v-else class="container">

      <div class="mobile-top-summary" :data-expanded="summaryExpanded ? 'true' : 'false'">
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

      <main class="content">
        <section class="consultation-opening" aria-labelledby="consultation-opening-title">
          <div class="consultation-opening__header">
            <div>
              <p class="consultation-opening__eyebrow">상담 시작 가이드</p>
              <div class="consultation-opening__title-row">
                <h1 id="consultation-opening-title" class="consultation-opening__title">설계 요약</h1>
                <p class="consultation-opening__notice">* 선택 조건을 바탕으로 구성한 상담 참고용 초안입니다. 실제 보장 범위와 지급 조건은 약관과 상품설명서를 확인해 주세요.</p>
            </div>
          </div>
          </div>

          <div v-if="isGenerating && !generatedScript?.designSummary" class="consultation-opening__loading" role="status">
          <div class="loader"></div>
            <span>설계 요약을 분석 중입니다. 통계 자료와 핵심 수치를 구성하고 있습니다.</span>
        </div>
          <div v-else-if="generatedScript?.designSummary" class="design-summary">

              <details v-if="generatedScript.designSummary.statistics?.length" class="result-disclosure" open>
                <summary class="result-disclosure__trigger">상담에 참고할 통계</summary>

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
        </section>

        <p v-if="resultNeedsUpdate" class="result-update-notice" role="status">
          선택 조건이 바뀌었습니다. ‘화법 업데이트’로 다시 생성해 주세요.
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
        <div v-if="generatedScript" class="script-box">
          <template v-if="activeTab === 'script'">
            <div v-if="isGenerating && !firstScriptPageReady" class="phase-loader">
              <div class="loader"></div>
              <span>특약별 화법을 생성 중입니다...</span>
            </div>

            <div v-if="firstScriptPageReady && (visibleRiderScripts.length || hasMoreScriptPages)" class="scripts-wrap">
              <div class="scripts-list-heading">
                <div>
                  <h2>특약별 화법 상세보기</h2>
                </div>
                <span class="scripts-list-heading__count">{{ scriptTotalCount || generatedScript.riderScripts.length }}건</span>
              </div>

              <section
                v-for="(rs, index) in visibleRiderScripts"
                :key="rs.jar_rd_code || rs.name"
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
                    v-html="claimHtml(rs.name)"
                  ></div>

                  <div class="script-talk-block">{{ rs.talk }}</div>
                </div>
              </section>

              <!-- 다음 9개가 준비됐으면 "더보기"(선택 화면의 .rider-load-more 재사용)-->
              <button
                v-if="hasMoreScriptPages && isNextScriptPageReady"
                type="button"
                class="rider-load-more"
                @click="scriptRevealedPages++"
              >
                <span>더보기</span>
              </button>
              <div v-else-if="hasMoreScriptPages" class="phase-loader">
                <div class="loader"></div>
                <span>특약별 화법을 생성 중입니다...</span>
              </div>
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
                  v-html="claimHtml(group.rider)"
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

.card {
  background: white;
}

.card-title {
  @include flexbox(space-between, center);
}

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

.sidebar {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

// 결과 화면 상단 "특약 N건 + 전체보기" 줄과 그 아래 특약 목록 숨김
.summary-riders,
#summary-rider-list {
  display: none !important;
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
  flex-shrink: 0;
  display: inline-block;
  border: 3px solid #e2e8f0;
  border-radius: 50%;
  animation: coaching-track-spin 0.8s linear infinite;
}
@keyframes coaching-track-spin { to { transform: rotate(360deg); } }

.phase-loader {
  display: flex;
  align-items: center;
  gap: rem(10);
  border-bottom: 1px solid #f1f5f9;
}

.mobile-top-summary {
  display: none;
}

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
  .selection-main-grid {
    padding-bottom: rem(140);
  }
  .desktop-only {
    display: none !important;
  }
  .sidebar {
    display: none !important;
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
  white-space: normal;
  word-break: keep-all;
  overflow-wrap: break-word;
  overflow-x : auto;

    ::v-deep table {
      width: 100%;
      border-collapse: collapse;
      margin: rem(8) 0;
    }

    ::v-deep td,
    ::v-deep th {
      border: 1px solid #e5e7eb;
      padding: rem(6) rem(8);
      vertical-align: top;
      text-align: left;
    }

    ::v-deep p {
      margin: 0 0 rem(6);
    }
  
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

.app-root {
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
  --so-space-1: 4px;
  --so-space-2: 8px;
  --so-space-3: 12px;
  --so-space-4: 16px;
  --so-space-5: 20px;
  --so-space-6: 24px;
  --so-space-8: 32px;
  --so-radius-xs: 6px;
  --so-radius-sm: 10px;
  --so-radius-md: 14px;
  --so-radius-lg: 18px;
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
  --so-control-selected: #677de4;
  --so-action: #4457d6;
  --so-action-hover: #3644b3;
  --so-action-subtle: #ebedfd;
  --so-action-text: #3b4cc4;
  --so-selected-ring: #c4cbf8;
  --so-selected-bg: #fbfbff;
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
  --so-brand-ink: #2b39b8;
  --so-brand-ring: rgba(91, 106, 217, 0.22);
  --so-gradient-ai-border: linear-gradient(105deg, #2b39b8, #4f5fe6 48%, #8b96ff);
  --so-gradient-brand: linear-gradient(105deg, #7a5fd8 0%, #5b6ad9 48%, #3576bb 100%);
  --so-gradient-brand-hover: linear-gradient(105deg, #6d51cd 0%, #4f5ecf 48%, #2c69ab 100%);
  --so-gradient-selected-surface: linear-gradient(135deg, #fcfaff 0%, #f8f9ff 58%, #f8fbff 100%);
  --so-ai: #6d51cd;
  --so-ai-subtle: #faf7fc;
  --so-success: #11734f;
  --so-success-subtle: #effaf5;
  --so-warning: #7a4d00;
  --so-warning-subtle: #fff8e8;
  --so-danger: #94404c;
  --so-danger-subtle: #fff5f6;
  --so-danger-border: #f1cfd5;
  --so-shadow-1: 0 1px 2px rgba(62, 56, 108, 0.055);
  --so-shadow-2: 0 8px 26px rgba(62, 56, 108, 0.085);
  --so-shadow-brand: 0 8px 22px rgba(91, 106, 217, 0.2);
  --so-ring: 0 0 0 3px rgba(68, 87, 214, 0.18);
  --so-fast: 120ms;
  --so-base: 180ms;
  --so-ease: cubic-bezier(0.2, 0, 0, 1);
  --so-content-work: calc(900px + var(--so-gutter) * 2);
  --so-content-reading: 760px;
  --so-gutter: clamp(16px, 1.8vw + 8.8px, 32px);
  --so-control-h: 44px;
  --so-edge: max(var(--so-gutter), calc((100% - var(--so-content-work)) / 2 + var(--so-gutter)));
  background: var(--so-page);
  color: var(--so-text);
  overflow-x: hidden;
  overflow-y: auto;
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
  .header {
    position: relative;
    top: auto;
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
  .selection-view {
    flex: 0 0 auto;
    min-height: calc(100dvh - 60px - 64px);
    overflow-y: visible;
    max-width: var(--so-content-work);
    padding: var(--so-space-6) var(--so-gutter) 0;
    gap: 0;
  }
  .product-selector-bar,
  .selection-header-section {
    width: 100%;
  }
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
  .profile-selector {
    display: grid;
    gap: var(--so-space-3);
    margin: 0 0 var(--so-space-4);
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
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
    &__group {
      min-width: 0;
      margin: 0;
      padding: 0;
      border: 0;
    }
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
  .content {
    --result-inset: 24px;
    padding: var(--so-space-6) var(--so-gutter);
    min-width: 0;
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
      font-size: var(--so-type-label);
      line-height: var(--so-leading-body);
      word-break: keep-all;
    }
    &__loading {
      display: flex;
      align-items: center;
      gap: var(--so-space-3);
      min-height: 72px;
      color: var(--so-text-secondary);
      font-size: var(--so-type-body);
    }
    .design-summary {
      background: transparent;
      border-bottom: 0;
    }
    .highlight-grid {
      padding: 0 0 var(--so-space-2);
      background: transparent;
    }
    .result-disclosure {
      margin-inline: 0;
    }
    .result-disclosure:last-child {
      &:not([open]) > .result-disclosure__trigger {
        min-height: 0;
        padding-bottom: 0;
      }
      .summary-tips-block {
        padding-bottom: 0;
      }
      .summary-tip-item:last-child {
        margin-bottom: 0;
      }
    }
  }
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
  .highlight-grid {
    display: flex;
    flex-wrap: wrap;
    gap: var(--so-space-4);
    padding: var(--so-space-5) var(--result-inset);
    background: var(--so-surface-subtle);
    border-bottom: 0;
  }
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
    .phase-loader {
      padding: var(--so-space-3) 0;
      border-bottom: 0;
    }
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
  .product-selector-bar,
  .profile-selector__field {
    position: relative;
  }
  .product-selector-select,
  .profile-selector__select {
    display: block;
    overflow: hidden;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .profile-selector__select {
    line-height: calc(var(--so-control-h) - 2px);
  }
  .profile-selector__select[aria-expanded='true'] {
    border-color: var(--so-action);
    box-shadow: var(--so-ring);
  }
  .select-listbox {
    position: absolute;
    z-index: 100;
    top: calc(100% + var(--so-space-2));
    left: 0;
    right: 0;
    max-height: min(416px, 54vh);
    margin: 0;
    padding: var(--so-space-1);
    overflow-y: auto;
    list-style: none;
    border: 1px solid var(--so-border-strong);
    border-radius: var(--so-radius-md);
    background: var(--so-surface);
    box-shadow: 0 14px 36px rgba(53, 61, 96, 0.16);
  }
  .select-option {
    display: flex;
    align-items: center;
    gap: var(--so-space-2);
    min-height: 48px;
    padding: rem(11) rem(40) rem(11) rem(12);
    position: relative;
    border-radius: var(--so-radius-sm);
    color: var(--so-text);
    font-size: var(--so-type-body);
    line-height: 1.45;
    word-break: keep-all;
    overflow-wrap: anywhere;
    cursor: pointer;
    + .select-option {
      margin-top: rem(2);
    }
    &.active {
      background: var(--so-action-subtle);
      color: var(--so-text-title);
      box-shadow: inset 0 0 0 1px var(--so-selected-ring);
    }
    &.selected {
      color: var(--so-action-text);
      font-weight: 650;
      &::after {
        content: '';
        position: absolute;
        top: 50%;
        right: rem(14);
        width: 16px;
        height: 16px;
        transform: translateY(-50%);
        background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%233b4cc4' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12.5 10 17.5 19 7'/%3E%3C/svg%3E") no-repeat center / contain;
      }
    }
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
    .summary-riders,
    #summary-rider-list {
      display : none !important;
    }
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
    .category-filter {
      &.has-overflow .category-pills-wrap {
        padding-right: rem(58);
        scroll-padding-inline-end: 58px;
      }
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
      &.is-expanded .category-pills-wrap {
        flex-wrap: wrap;
        overflow-x: visible;
        scroll-snap-type: none;
        row-gap: var(--so-space-2);
        padding-right: rem(58);
      }
      &.is-expanded .category-pills-wrap.is-measuring,
      .category-pills-wrap.is-measuring {
        flex-wrap: nowrap;
        overflow-x: auto;
      }
    }
  }
}

@media (min-width: 760px) {
  .app-root .profile-selector__fields {
    grid-template-columns: minmax(220px, 0.8fr) minmax(320px, 1.2fr);
    align-items: start;
  }
}

@media (min-width: 851px) and (max-width: 1027px) {
  .app-root {
    .container {
      flex: 0 0 auto;
      flex-direction: column;
      min-height: calc(100dvh - 60px - 64px);
      overflow: visible;
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

@media (min-width: 1028px) {
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
      gap: var(--so-space-6);
      width: calc(100% - var(--so-edge) - var(--so-edge));
      flex: 0 0 auto;
      align-items: start;
      min-height: calc(100dvh - 60px - 64px);
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
