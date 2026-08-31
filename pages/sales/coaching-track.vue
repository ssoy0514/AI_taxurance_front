<script lang="ts">
export default {
  name: 'CoachingTrack',
  layout: 'blank',
}
</script>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { riders as staticRiders, READY_PRODUCTS } from '~/utils/coachingTrackData'
import { useToast } from '~/composables/useToast'
import { useScriptGeneration } from '~/composables/useScriptGeneration'
import { useRiderGroups } from '~/composables/useRiderGroups'
import type { Profile, StatChartItem } from '~/utils/coachingTrackTypes'
import type { Rider } from '~/utils/coachingTrackData'

// ── Toast ─────────────────────────────────────────────────────────────────
const { toasts, error } = useToast()

// ── API 베이스 URL (클라이언트에서만 window 접근) ──────────────────────────
const apiBase = ref('')
onMounted(async () => {
  apiBase.value = window.location.hostname === 'localhost'
    ? (process.env.DEV_API_URL ?? 'http://localhost:8000')
    : (process.env.API_URL ?? '')

  try {
    const [ridersRes, productsRes] = await Promise.all([
      fetch(`${apiBase.value}/api/riders`),   // backend/src/router/router_fc_script.py
      fetch(`${apiBase.value}/api/products`),
    ])
    if (ridersRes.ok) riders.value = await ridersRes.json()
    if (productsRes.ok) apiProducts.value = await productsRes.json()
  } catch {
    // fallback: utils/coachingTrackData.ts의 staticRiders + READY_PRODUCTS 유지
  }
})

// ── 앱 상태 ───────────────────────────────────────────────────────────────
const currentStep = ref<'selection' | 'result' | 'coming-soon'>('selection') // 초기값 설정
const returningToEdit = ref(false)
const profile = ref<Profile>({ age: '30대', gender: '남성', notes: '' })
const selectedRiders = ref<string[]>([])
const riders = ref<Rider[]>(staticRiders) // 정적데이터 서빙
const selectedProduct = ref('가족대표건강보험')
const apiProducts = ref<string[]>([])

// ── 상품/라이더 computed ───────────────────────────────────────────────────
const availableProducts = computed(() => {
  const seen = new Set<string>()
  const list: string[] = []
  for (const r of riders.value) {
    const p = r.product ?? '가족대표건강보험'
    if (!seen.has(p)) { seen.add(p); list.push(p) }
  }
  return list
})

const productRiders = computed(() =>
  riders.value.filter((r) => (r.product ?? '가족대표건강보험') === selectedProduct.value)
)

const isCurrentProductReady = computed(() => {
  if (apiProducts.value.length > 0) return apiProducts.value.includes(selectedProduct.value)
  return READY_PRODUCTS.includes(selectedProduct.value)
})

const selectedDataFull = computed(() =>
  productRiders.value.filter((r) => selectedRiders.value.includes(r.id))
)

// ── ProfileForm 상태 ───────────────────────────────────────────────────────
const ageOptions = ['20대', '30대', '40대', '50대', '60대+']
const genderOptions = ['남성', '여성']
const openField = ref<'age' | 'gender' | null>(null)

function updateProfile(field: keyof Profile, value: string) {
  profile.value = { ...profile.value, [field]: value }
  openField.value = null
}

function toggleField(field: 'age' | 'gender') {
  openField.value = openField.value === field ? null : field
}

function closeAllDropdowns() {
  openField.value = null
}

// ── RiderGrid 상태 ─────────────────────────────────────────────────────────
const activeCategory = ref('전체')
const showSelectedOnly = ref(false)
const { groupedRiders } = useRiderGroups(productRiders)

watch(selectedProduct, () => {
  selectedRiders.value = []
  activeCategory.value = '전체'
  showSelectedOnly.value = false
})

watch(returningToEdit, (val) => {
  if (val && selectedRiders.value.length > 0) showSelectedOnly.value = true
  if (val) activeCategory.value = '전체'
})

watch(showSelectedOnly, (val) => {
  if (!val) activeCategory.value = '전체'
})

watch(() => selectedRiders.value.length, (len) => {
  if (len === 0) showSelectedOnly.value = false
})

const filteredRiders = computed(() => {
  let pool: Rider[] = activeCategory.value === '전체'
    ? [...productRiders.value]
    : (groupedRiders.value.find(([cat]) => cat === activeCategory.value)?.[1] ?? [])
  if (showSelectedOnly.value) {
    pool = pool.filter((r) => selectedRiders.value.includes(r.id))
  }
  return pool
})

function selectCategory(cat: string) {
  activeCategory.value = cat
  showSelectedOnly.value = false
}

function toggleSelectedOnly() {
  showSelectedOnly.value = !showSelectedOnly.value
  if (showSelectedOnly.value) activeCategory.value = '전체'
}

// ── ResultView 상태 ────────────────────────────────────────────────────────
const expandedClaimNames = ref<string[]>([])
const activeTab = ref<'script' | 'points'>('script')
const showScriptsPanel = ref(false)
const expandedDescNames = ref<string[]>([])

const qnaByRider = computed(() => {
  const groups: { rider: string; items: any[] }[] = []
  for (const item of generatedScript.value?.qna ?? []) {
    const riderName = item.rider ?? '기타'
    const existing = groups.find((g) => g.rider === riderName)
    if (existing) existing.items.push(item)
    else groups.push({ rider: riderName, items: [item] })
  }
  return groups
})

function toggleClaim(name: string) {
  if (expandedClaimNames.value.includes(name)) {
    expandedClaimNames.value = expandedClaimNames.value.filter((n) => n !== name)
  } else {
    expandedClaimNames.value.push(name)
  }
}

function toggleDesc(name: string) {
  if (expandedDescNames.value.includes(name)) {
    expandedDescNames.value = expandedDescNames.value.filter((n) => n !== name)
  } else {
    expandedDescNames.value.push(name)
  }
}

function formatDesc(text: string) {
  return text.replace(/\n(?![□※])/g, ' ')
}

const BAR_COLORS = ['#2563eb', '#0891b2', '#6366f1', '#0d9488', '#7c3aed', '#1d4ed8']
const COMPARISON_COLORS = ['#2563eb', '#8b5cf6']

function maxVal(chartData: StatChartItem[]) {
  return Math.max(...chartData.map((d) => d.value), 1)
}

function barWidth(item: StatChartItem, chartData: StatChartItem[]) {
  return ((item.value / maxVal(chartData)) * 100).toFixed(1) + '%'
}

function barColor(index: number) {
  return BAR_COLORS[index % BAR_COLORS.length]
}

function formatNumber(value: number): string {
  return value.toLocaleString('ko-KR')
}

// ── ResultSidebar 상태 ─────────────────────────────────────────────────────
const sidebarSearchTerm = ref('')

const filteredGroupedRiders = computed(() =>
  groupedRiders.value
    .map(([cat, items]) => [
      cat,
      items.filter((i) => i.name.toLowerCase().includes(sidebarSearchTerm.value.toLowerCase())),
    ] as [string, Rider[]])
    .filter(([, items]) => items.length > 0)
)

// ── 화법 생성 ──────────────────────────────────────────────────────────────
const { isGenerating, generatedScript, generate } = useScriptGeneration(apiBase, selectedDataFull, profile)

// ── 액션 ──────────────────────────────────────────────────────────────────
function toggleRider(id: string) {
  if (selectedRiders.value.includes(id)) {
    selectedRiders.value = selectedRiders.value.filter((r) => r !== id)
  } else {
    selectedRiders.value.push(id)
  }
}

function removeRider(id: string) {
  selectedRiders.value = selectedRiders.value.filter((r) => r !== id)
}

function resetAndGoBack() {
  selectedRiders.value = []
  generatedScript.value = null
  currentStep.value = 'selection'
  activeCategory.value = '전체'
  showSelectedOnly.value = false
}

async function generateSalesTalk() {
  if (selectedRiders.value.length === 0) {
    error('특약을 하나 이상 선택해 주세요.')
    return
  }
  if (!isCurrentProductReady.value) {
    currentStep.value = 'coming-soon'
    return
  }
  currentStep.value = 'result'
  returningToEdit.value = false
  // 백엔드 연결 여부와 관계없이 결과 화면(디자인 작업용)으로 진입한 뒤,
  // useScriptGeneration이 실패 시 샘플 데이터로 채워주므로 여기서 다시
  // 'selection'으로 되돌리지 않습니다.
  await generate()
}
</script>

<template>
  <div class="app-root">

    <!-- ── Toast ─────────────────────────────────────────────────────────── -->
    <div class="toast-container">
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
      <div class="logo" style="cursor: pointer;" @click="resetAndGoBack">
        <span class="logo-main">보험피터</span>
        <span class="logo-tagline">영업 준비를 핏(fit)하게</span>
      </div>
      <nuxt-link to="/main" class="back-btn header-back-btn">← AI서치 홈</nuxt-link>
      <button
        v-if="currentStep === 'result' || currentStep === 'coming-soon'"
        class="back-btn header-back-btn"
        @click="currentStep = 'selection'; returningToEdit = true"
      >
        ← 특약 다시 선택하기
      </button>
    </header>

    <!-- ── STEP 1: Selection View ─────────────────────────────────────────── -->
    <div v-if="currentStep === 'selection'" class="selection-view">

      <!-- 상품 선택 -->
      <div class="product-selector-bar">
        <label class="product-selector-label">상품 선택</label>
        <select class="product-selector-select" v-model="selectedProduct">
          <option v-for="p in availableProducts" :key="p" :value="p">{{ p }}</option>
        </select>
      </div>

      <!-- ProfileForm -->
      <div v-if="openField" class="profile-overlay" @click="closeAllDropdowns"></div>
      <div class="selection-header-section">
        <div class="card profile-card-step1" @click.self="closeAllDropdowns">
            <div class="card-title">고객 정보</div>

            <div class="profile-row">
              <div class="profile-field" :class="{ open: openField === 'age' }">
                <button class="profile-field-btn" @click.stop="toggleField('age')">
                  <span class="field-label">나이대</span>
                  <span class="field-value">{{ profile.age }} <span class="field-arrow">▾</span></span>
                </button>
                <div v-if="openField === 'age'" class="field-dropdown">
                  <button
                    v-for="opt in ageOptions"
                    :key="opt"
                    class="dropdown-opt"
                    :class="{ active: profile.age === opt }"
                    @click.stop="updateProfile('age', opt)"
                  >{{ opt }}</button>
                </div>
              </div>

              <div class="profile-field" :class="{ open: openField === 'gender' }">
                <button class="profile-field-btn" @click.stop="toggleField('gender')">
                  <span class="field-label">성별</span>
                  <span class="field-value">{{ profile.gender }} <span class="field-arrow">▾</span></span>
                </button>
                <div v-if="openField === 'gender'" class="field-dropdown">
                  <button
                    v-for="opt in genderOptions"
                    :key="opt"
                    class="dropdown-opt"
                    :class="{ active: profile.gender === opt }"
                    @click.stop="updateProfile('gender', opt)"
                  >{{ opt }}</button>
                </div>
              </div>
            </div>

            <div class="profile-notes-row">
              <span class="field-label">특이사항</span>
              <input
                class="notes-input"
                placeholder="예시) 사무직, 고혈압 약 복용"
                :value="profile.notes"
                @input="updateProfile('notes', $event.target.value)"
                @click.stop
              />
            </div>
        </div>
      </div>

      <!-- RiderGrid -->
      <div>
        <div v-if="selectedRiders.length > 0" class="selected-view-bar">
          <button
            class="selected-view-btn"
            :class="{ active: showSelectedOnly }"
            @click="toggleSelectedOnly"
          >
            {{ showSelectedOnly ? '✓ 선택된 특약 보기' : '선택된 특약 보기' }} ({{ selectedRiders.length }}개)
          </button>
        </div>

        <div class="category-pills-wrap">
          <button
            class="cat-pill"
            :class="{ active: activeCategory === '전체' }"
            @click="selectCategory('전체')"
          >
            전체 <span class="cat-count">{{ productRiders.length }}</span>
          </button>
          <button
            v-for="[category, items] in groupedRiders"
            :key="category"
            class="cat-pill"
            :class="{ active: activeCategory === category }"
            @click="selectCategory(category)"
          >
            {{ category }} <span class="cat-count">{{ items.length }}</span>
          </button>
        </div>

        <div class="selection-main-grid">
          <div class="rider-grid-large">
            <!-- RiderCard 인라인 -->
            <div
              v-for="rider in filteredRiders"
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
                  @click.stop="toggleRider(rider.id)"
                />
              </div>
              <div class="rider-name-large">{{ rider.name }}</div>
            </div>
            <div v-if="filteredRiders.length === 0" style="padding: 20px; color: #94a3b8; text-align: center;">
              검색 결과가 없습니다.
            </div>
          </div>
        </div>
      </div>

      <div class="selection-footer">
        <button
          class="main-generate-btn"
          @click="generateSalesTalk"
          :disabled="selectedRiders.length === 0"
        >
          맞춤 화법 생성하기
        </button>
      </div>
    </div>

    <!-- ── STEP: Coming Soon ──────────────────────────────────────────────── -->
    <div v-else-if="currentStep === 'coming-soon'" class="coming-soon-view">
      <div class="coming-soon-card">
        <div class="coming-soon-icon">🚧</div>
        <h2 class="coming-soon-title">준비 중인 상품입니다</h2>
        <p class="coming-soon-desc">
          <strong>{{ selectedProduct }}</strong> 상품의 화법 데이터를 준비하고 있습니다.<br>
          빠른 시일 내에 제공될 예정입니다.
        </p>
        <button class="coming-soon-back-btn" @click="currentStep = 'selection'; returningToEdit = true">
          ← 특약 선택으로 돌아가기
        </button>
      </div>
    </div>

    <!-- ── STEP 2: Result View ────────────────────────────────────────────── -->
    <div v-else class="container">

      <!-- 모바일 상단 요약 -->
      <div class="mobile-top-summary">
        <div class="mobile-summary-profile">
          <strong>{{ profile.age }} {{ profile.gender }}</strong>
          <span v-if="profile.notes"> | {{ profile.notes }}</span>
        </div>
        <div class="mobile-summary-chips">
          <div v-for="rider in selectedDataFull" :key="rider.id" class="chip-compact">
            {{ rider.name }}
          </div>
        </div>
      </div>

      <!-- ResultView -->
      <main class="content">
        <div class="tabs">
          <div class="tab" :class="{ active: activeTab === 'script' }" @click="activeTab = 'script'">
            특약별 화법
          </div>
          <div class="tab" :class="{ active: activeTab === 'points' }" @click="activeTab = 'points'">
            예상 Q&A
          </div>
        </div>

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
                  <div class="highlight-icon">{{ h.icon }}</div>
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
                    📊 {{ stat.title }}
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

              <div class="summary-tips-block">
                <div class="summary-block-title">💡 영업 꿀팁</div>
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
            </div>
          </template>

          <template v-if="activeTab === 'script'">
            <div v-if="isGenerating && !generatedScript.riderScripts.length" class="phase-loader">
              <div class="loader"></div>
              <span>특약별 화법을 생성 중입니다...</span>
            </div>

            <div v-if="generatedScript.riderScripts.length" class="scripts-wrap">
              <div class="scripts-panel-header" @click="showScriptsPanel = !showScriptsPanel">
                <span>특약별 화법 상세보기</span>
                <span class="toggle-arrow">{{ showScriptsPanel ? '▲' : '▼' }}</span>
              </div>

              <div v-if="showScriptsPanel">
                <div
                  v-for="(rs, index) in generatedScript.riderScripts"
                  :key="index"
                  class="qna-section scripts-section"
                >
                  <div class="qna-tag-row">
                    <span class="qna-rider-tag">{{ rs.name }}</span>
                    <button
                      class="qna-claim-btn"
                      :class="{ open: expandedDescNames.includes(rs.name) }"
                      @click="toggleDesc(rs.name)"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      {{ expandedDescNames.includes(rs.name) ? '지급사유 닫기' : '지급사유 보기' }}
                      <svg
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                        :style="{ transform: expandedDescNames.includes(rs.name) ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.2s' }"
                      ><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                  </div>

                  <div v-if="expandedDescNames.includes(rs.name)" class="qna-claim-detail">
                    {{ formatDesc(selectedDataFull.find((r) => r.name === rs.name)?.description ?? '지급사유 정보가 없습니다.') }}
                  </div>

                  <div class="script-talk-block">{{ rs.talk }}</div>

                  <hr v-if="index < generatedScript.riderScripts.length - 1" class="qna-divider" />
                </div>
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

                <div v-if="expandedClaimNames.includes(group.rider)" class="qna-claim-detail">
                  {{ formatDesc(selectedDataFull.find((r) => r.name === group.rider)?.description ?? '지급사유 정보가 없습니다.') }}
                </div>

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
      </main>

      <!-- ResultSidebar -->
      <aside class="sidebar">
        <button class="back-btn desktop-only" @click="currentStep = 'selection'">← 메인 선택화면으로</button>

        <div class="card desktop-only">
          <div class="card-title">고객 프로파일</div>
          <div class="profile-compact-grid">
            <div class="profile-compact-item">
              <div class="label-small">나이/성별</div>
              <div class="value-small">{{ profile.age }} {{ profile.gender }}</div>
            </div>
            <div class="profile-compact-item" style="grid-column: span 2">
              <div class="label-small">특이사항</div>
              <div class="value-small">{{ profile.notes || '없음' }}</div>
            </div>
          </div>
        </div>

        <div class="card" style="flex: 1; display: flex; flex-direction: column; min-height: 0; margin-bottom: 0;">
          <div class="card-title">
            특약 추가/수정 <span>{{ selectedRiders.length }}개</span>
          </div>

          <div class="chips-sidebar">
            <div v-for="rider in selectedDataFull" :key="rider.id" class="chip-sidebar">
              {{ rider.name }}
              <span class="chip-remove-sidebar" @click="removeRider(rider.id)">&times;</span>
            </div>
          </div>

          <div class="sidebar-search-container">
            <input
              class="sidebar-search-input"
              placeholder="특약 검색 및 추가..."
              v-model="sidebarSearchTerm"
            />
          </div>

          <div class="rider-list-sidebar">
            <div v-for="[category, items] in filteredGroupedRiders" :key="category">
              <div class="rider-category-header">{{ category }}</div>
              <div
                v-for="rider in items"
                :key="rider.id"
                class="rider-item-sidebar"
                :class="{ selected: selectedRiders.includes(rider.id) }"
              >
                <div class="sidebar-item-left">
                  <input
                    type="checkbox"
                    :checked="selectedRiders.includes(rider.id)"
                    @click.stop="toggleRider(rider.id)"
                  />
                  <div class="sidebar-badge-stack">
                    <span v-if="rider.badge === 'popular'" class="badge popular">인기</span>
                    <span v-if="rider.badge === 'ai'" class="badge ai">AI추천</span>
                  </div>
                </div>
                <span class="rider-name-sidebar" @click="toggleRider(rider.id)" style="flex: 1; margin-top: 2px;">
                  {{ rider.name }}
                </span>
              </div>
            </div>
          </div>

          <button
            class="sidebar-update-btn"
            @click="generateSalesTalk"
            :disabled="isGenerating || selectedRiders.length === 0"
          >
            {{ isGenerating ? '분석 중...' : '변경된 내용으로 화법 업데이트' }}
          </button>
        </div>
      </aside>
    </div>

  </div>
</template>

<style scoped>
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
  height: 100dvh; /* iOS Safari: 주소창 포함 계산 버그 방지 */
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
  height: 50px;
  background: white;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 12px;
  padding: 0 24px;
  font-weight: 700;
  font-size: 1rem;
  z-index: 10;
}

.logo {
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex: 1;
}
.logo-main {
  font-size: 1.1rem;
  font-weight: 900;
  color: #0f172a;
  letter-spacing: -0.03em;
}
.logo-sub {
  font-size: 0.7rem;
  font-weight: 400;
  color: #94a3b8;
  letter-spacing: 0.01em;
}

.logo-tagline {
  font-size: 0.78rem;
  font-weight: 600;
  color: #2563eb;
  margin-left: 10px;
  padding-left: 10px;
  border-left: 2px solid #bfdbfe;
  letter-spacing: -0.01em;
}

.header-test-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.header-back-btn {
  margin: 0;
  padding: 6px 14px;
  font-size: 13px;
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
  border-radius: 12px;
  border: 1px solid var(--border-color);
  margin-bottom: 12px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.card-title {
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #334155;
}

/* === Selection View (Full Screen) === */
.selection-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px 24px;
  overflow-y: auto;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.selection-header-section {
  display: flex;
  align-items: stretch;
  gap: 12px;
  margin-bottom: 16px;
}

.selection-header-section .card {
  flex: 1;
  margin-bottom: 0;
  padding: 8px 12px;
}

.profile-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.profile-field {
  flex: 1;
  position: relative;
}

.profile-field-btn {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 7px 12px;
  border-radius: 8px;
  background: #f5f8ff;
  border: 1px solid #dde5f5;
  cursor: pointer;
  transition: all 0.15s;
  gap: 2px;
}

.profile-field-btn:hover,
.profile-field.open .profile-field-btn {
  border-color: #2563eb;
  background: #eff6ff;
}

.field-label {
  font-size: 9px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.field-value {
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
}

.field-arrow {
  font-size: 10px;
  color: #94a3b8;
  margin-left: 2px;
}

.field-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #dde5f5;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.12);
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 100;
}

.dropdown-opt {
  padding: 8px 12px;
  border-radius: 7px;
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
  text-align: left;
  transition: all 0.1s;
}

.dropdown-opt:hover {
  background: #f0f4ff;
  color: #2563eb;
}

.dropdown-opt.active {
  background: #2563eb;
  color: white;
}

.profile-notes-row {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 7px 12px;
  border-radius: 8px;
  background: #f5f8ff;
  border: 1px solid #dde5f5;
}

.notes-input {
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: #1e293b;
  outline: none;
  width: 100%;
}

.notes-input::placeholder {
  color: #94a3b8;
  font-weight: 400;
}

.profile-overlay {
  position: fixed;
  inset: 0;
  z-index: 99;
}

.chip-divider {
  width: 1px;
  height: 28px;
  background: #e2e8f0;
  margin: 0 2px;
  flex-shrink: 0;
}

.label-large {
  font-size: 8px;
  color: var(--text-muted);
  margin-bottom: 0px;
}

.search-bar-large {
  flex: 1;
  background: white;
  border: 1px solid var(--border-color);
  padding: 10px 16px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.search-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.badge-filter-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.selected-only-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #2563eb;
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
}

.badge-filter-toggle {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
  padding: 3px 8px;
  border-radius: 20px;
  border: 1px solid;
}
.popular-toggle {
  color: #be185d;
  border-color: #f9a8d4;
  background: #fdf2f8;
}
.popular-toggle input:checked ~ span { color: #9d174d; }
.ai-toggle {
  color: #1d4ed8;
  border-color: #93c5fd;
  background: #eff6ff;
}
.ai-toggle input:checked ~ span { color: #1e40af; }
.badge-filter-toggle input[type='checkbox'] {
  width: 13px;
  height: 13px;
  cursor: pointer;
  flex-shrink: 0;
}
.popular-toggle input[type='checkbox'] { accent-color: #f59e0b; }
.ai-toggle    input[type='checkbox'] { accent-color: #7c3aed; }

.selected-only-toggle input[type='checkbox'] {
  width: 15px;
  height: 15px;
  accent-color: #2563eb;
  cursor: pointer;
  flex-shrink: 0;
}

.search-input-large {
  flex: 1;
  padding: 6px 0;
  border: none;
  font-size: 14px;
  outline: none;
}

/* Category Tabs (Horizontal Scroll) */
.selected-view-bar {
  padding: 6px 0 8px 0;
}

.selected-view-btn {
  padding: 5px 14px;
  border-radius: 20px;
  border: 1px solid #dde5f5;
  background: white;
  font-size: 12px;
  font-weight: 600;
  color: #2563eb;
  cursor: pointer;
  transition: all 0.15s;
}

.selected-view-btn:hover {
  background: #eff6ff;
  border-color: #2563eb;
}

.selected-view-btn.active {
  background: #2563eb;
  border-color: #2563eb;
  color: white;
}

.category-pills-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 0 14px 0;
}

.cat-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 13px;
  border-radius: 20px;
  border: 1.5px solid #dde5f5;
  background: white;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}

.cat-pill:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background: #eff6ff;
}

.cat-pill.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.cat-count {
  font-size: 11px;
  font-weight: 500;
  background: rgba(0, 0, 0, 0.07);
  padding: 1px 6px;
  border-radius: 10px;
}

.cat-pill.active .cat-count {
  background: rgba(255, 255, 255, 0.25);
  color: white;
}


.rider-grid-large {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
  padding-bottom: 80px;
}

.rider-card-large {
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 8px 10px;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: relative;
  min-height: 64px;
}

.rider-card-large:hover {
  border-color: var(--primary-color);
  background: #f8fafc;
}

.rider-card-large.selected {
  background: var(--selection-bg);
  border-color: var(--primary-color);
}

.rider-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.rider-name-large {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.4;
  color: #1e293b;
  word-break: break-all;
  overflow-wrap: break-word;
}

.badge-container {
  display: flex;
  gap: 4px;
  margin-bottom: 6px;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 12px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1;
  white-space: nowrap;
}

.badge.popular {
  background: #fff0f6;
  color: #eb2f96;
}

.badge.ai {
  background: #e6f7ff;
  color: #1890ff;
}

.rider-checkbox-large {
  width: 18px;
  height: 18px;
  margin-top: 1px;
}

.rider-list-header {
  display: flex;
  align-items: center;
  padding: 6px 0 4px 0;
}

.selected-count-badge {
  background: #2563eb;
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.selection-footer {
  position: sticky;
  bottom: 0;
  background: rgba(245, 247, 255, 0.95);
  backdrop-filter: blur(8px);
  padding: 8px 0;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 5;
}

.main-generate-btn {
  padding: 12px 50px;
  font-size: 16px;
  font-weight: 800;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 24px;
  cursor: pointer;
}

/* === Result View === */
.sidebar {
  width: 360px;
  padding: 16px;
  overflow-y: auto;
  border-right: 1px solid var(--border-color);
  background: #fcfcfc;
  display: flex;
  flex-direction: column;
}

.back-btn {
  background: white;
  border: 1px solid #ddd;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  margin-bottom: 16px;
  color: #334155;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.profile-compact-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.profile-compact-item {
  font-size: 12px;
  background: #f8fafc;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #eee;
}

.label-small { font-size: 10px; color: #94a3b8; margin-bottom: 2px; }
.value-small { font-weight: 700; font-size: 13px; color: #1e293b; line-height: 1.3; }

.content {
  flex: 1;
  padding: 20px 24px;
  overflow-y: auto;
  background: white;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  border-bottom: 1px solid #eee;
}

.tab {
  padding: 12px 20px;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  font-size: 15px;
  color: #64748b;
}

.tab.active { color: var(--primary-color); border-color: var(--primary-color); font-weight: 800; }

.script-box {
  background: white;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.section { padding: 20px 24px; border-bottom: 1px solid #f1f5f9; }
.section.blue { border-left: 6px solid var(--blue-section); }
.section.green { border-left: 6px solid var(--green-section); }
.section.orange { border-left: 6px solid var(--orange-section); }
.section.purple { border-left: 6px solid #8b5cf6; }

.section-title { font-size: 14px; font-weight: 800; color: var(--text-muted); margin-bottom: 12px; }
.section-content { line-height: 1.8; font-size: 18px; color: #0f172a; white-space: pre-wrap; font-weight: 500; }

.rider-list-sidebar {
  flex: 1;
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 8px;
  background: white;
}

.rider-item-sidebar {
  padding: 12px 14px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 14px;
  transition: background 0.15s;
}

.sidebar-item-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  width: 36px;
}

.sidebar-badge-stack {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sidebar-badge-stack .badge {
  font-size: 8.5px;
  padding: 2px 4px;
  min-width: 32px;
  justify-content: center;
  transform: scale(0.95);
}

.rider-name-sidebar {
  flex: 1;
  line-height: 1.5;
  margin-top: 1px;
  color: #334155;
  font-weight: 600;
}

.sidebar-search-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
}

.sidebar-update-btn {
  width: 100%;
  background: #334155;
  color: white;
  border: none;
  padding: 14px;
  border-radius: 8px;
  font-weight: 800;
  font-size: 15px;
  margin-top: 12px;
}

.chips-sidebar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
  max-height: 100px;
  overflow-y: auto;
}

.chip-sidebar {
  background: #e8f1ff;
  color: var(--primary-color);
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
}

.chip-remove-sidebar {
  cursor: pointer;
  font-size: 16px;
}

.scripts-wrap {
  padding: 0;
}

.scripts-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  background: #dbeafe;
  border-top: 1px solid #bfdbfe;
  border-bottom: 1px solid #bfdbfe;
  cursor: pointer;
  font-size: 13px;
  font-weight: 800;
  color: #1e40af;
  letter-spacing: 0.08em;
  user-select: none;
  text-transform: uppercase;
}

.scripts-panel-header:hover {
  background: #bfdbfe;
}

.scripts-section {
  padding-top: 14px;
  padding-bottom: 4px;
}

.toggle-arrow {
  font-size: 12px;
  color: #94a3b8;
}

.script-talk-block {
  font-size: 14px;
  color: #374151;
  line-height: 1.8;
  border-left: 3px solid #d1d5db;
  padding-left: 14px;
  margin-bottom: 10px;
  word-break: keep-all;
}

.rider-desc-toggle:hover {
  color: var(--primary-color);
  background: #e2e8f0;
}

.rider-desc-content {
  font-size: 15px;
  color: #334155;
  background: #f8fafc;
  padding: 12px;
  border-radius: 6px;
  margin-top: 8px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: keep-all;
  overflow-wrap: break-word;
  border-left: 3px solid #cbd5e1;
}

/* === Design Summary === */
.design-summary {
  border-bottom: 4px solid #f1f5f9;
  background: #f8fafc;
}

.summary-header {
  padding: 14px 20px 10px;
  font-size: 13px;
  font-weight: 800;
  color: #64748b;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border-bottom: 1px solid #e2e8f0;
}

.highlight-grid {
  display: flex;
  flex-wrap: nowrap;
  gap: 10px;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.highlight-card {
  flex: 1;
  min-width: 0;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-top: 3px solid #3b82f6;
  border-radius: 10px;
  padding: 14px 12px;
  text-align: center;
  overflow: hidden;
}
.highlight-card:nth-child(2) { border-top-color: #6366f1; }
.highlight-card:nth-child(3) { border-top-color: #0891b2; }

.highlight-icon {
  font-size: 22px;
  margin-bottom: 6px;
}

.highlight-headline {
  font-size: 16px;
  font-weight: 800;
  color: #1e293b;
  line-height: 1.25;
  margin-bottom: 6px;
  word-break: keep-all;
}

.highlight-detail {
  font-size: 11px;
  color: #475569;
  line-height: 1.5;
  margin-bottom: 6px;
  word-break: keep-all;
}

.highlight-source {
  font-size: 10px;
  color: #94a3b8;
}

.stats-row {
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
}

.stat-block {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px;
}

.stat-title {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.stat-unit-label {
  font-size: 10px;
  font-weight: 500;
  color: #64748b;
  background: #e2e8f0;
  padding: 2px 6px;
  border-radius: 4px;
}

.stat-reason {
  font-size: 12px;
  color: #1d4ed8;
  background: #eff6ff;
  border-left: 3px solid #3b82f6;
  padding: 7px 12px;
  border-radius: 0 6px 6px 0;
  margin-bottom: 14px;
  line-height: 1.55;
  word-break: keep-all;
}

.stat-chart {
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  gap: 8px;
}

.stat-bar-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.stat-bar-row:last-child {
  margin-bottom: 0;
}

.bar-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}

.bar-label {
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 70%;
}

.bar-value {
  font-size: 12px;
  color: #1e293b;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
}

.bar-track {
  height: 8px;
  background: #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  width: 100%;
}

.bar-fill {
  height: 100%;
  border-radius: 10px;
  transition: width 0.6s ease;
}

.bar-unit {
  font-size: 10px;
  font-weight: 400;
  color: #94a3b8;
}

.stat-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: stretch;
  gap: 16px;
  margin-bottom: 4px;
}

.stat-body > .stat-chart,
.stat-body > .donut-wrapper,
.stat-body > .comparison-chart {
  width: 100%;
  min-width: 0;
}

.stat-description {
  font-size: 12px;
  color: #374151;
  line-height: 1.75;
  border-left: 3px solid #d1d5db;
  padding-left: 14px;
  word-break: keep-all;
}

.stat-source {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 10px;
}

.stat-source-link {
  color: #94a3b8;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.stat-source-link:hover {
  color: #2563eb;
}

/* Donut chart */
.donut-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
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
  font-size: 17px;
  font-weight: 800;
  color: #1e293b;
  line-height: 1;
}

.donut-center-sub {
  font-size: 9px;
  color: #64748b;
  margin-top: 3px;
  white-space: pre-line;
  line-height: 1.4;
}

/* Comparison chart */
.comparison-chart {
  display: flex;
  justify-content: center;
  gap: 28px;
  padding: 8px 0 4px;
  align-items: flex-end;
  min-height: 100px;
}

.comparison-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  width: 60px;
}

.comparison-val {
  font-size: 14px;
  font-weight: 800;
  color: #1e293b;
}

.comparison-bar-outer {
  width: 36px;
  height: 90px;
  background: #e2e8f0;
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
  font-size: 12px;
  font-weight: 600;
  color: #475569;
}

.summary-intro-block {
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
  background: #f0fdf4;
}

.summary-tips-block {
  padding: 16px 20px;
  background: #faf5ff;
}

.summary-block-title {
  font-size: 13px;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 10px;
}

.summary-intro-text {
  font-size: 15px;
  line-height: 1.9;
  color: #0f172a;
  white-space: pre-wrap;
  font-weight: 500;
}

.summary-tip-item {
  font-size: 14px;
  line-height: 1.7;
  color: #374151;
  padding: 6px 0 6px 16px;
  border-left: 3px solid #a78bfa;
  margin-bottom: 8px;
}

.loader-container { padding: 60px 0; display: flex; flex-direction: column; align-items: center; gap: 16px; }
.loader { width: 28px; height: 28px; display: inline-block; border: 3px solid #e2e8f0; border-top-color: var(--primary-color); border-radius: 50%; animation: coaching-track-spin 0.8s linear infinite; }
@keyframes coaching-track-spin { to { transform: rotate(360deg); } }

.phase-loader {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 24px;
  color: #64748b;
  font-size: 14px;
  border-bottom: 1px solid #f1f5f9;
}

.elapsed-test {
  font-size: 12px;
  font-weight: 700;
  color: #1e5eff;
  padding: 4px 8px;
  background: #eff6ff;
  border-radius: 6px;
}

.llm-elapsed {
  color: #7c3aed;
  background: #f5f3ff;
}

.model-used {
  color: #0369a1;
  background: #e0f2fe;
  font-weight: 600;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-select-test {
  font-size: 12px;
  padding: 4px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #f8fafc;
  color: #475569;
  cursor: pointer;
  outline: none;
}

.mobile-top-summary { display: none; }

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

  .header {
    height: auto;
    min-height: 44px;
    padding: 8px 12px;
    flex-wrap: wrap;
    gap: 6px;
  }

  .logo-main {
    font-size: 13px;
  }

  .header-back-btn {
    font-size: 12px;
    padding: 5px 10px;
    order: 2;
  }

  .header-test-controls {
    order: 3;
    width: 100%;
    margin-left: 0;
    gap: 6px;
  }

  .model-select-test {
    font-size: 11px;
    padding: 2px 4px;
    flex: 1;
    min-width: 0;
  }

  .elapsed-test {
    font-size: 11px;
    padding: 2px 6px;
    flex-shrink: 0;
  }

  .container {
    flex-direction: column;
    height: auto;
    overflow: visible;
  }

  /* --- Step 1: Selection View --- */
  .selection-view {
    padding: 16px;
    overflow-y: visible;
  }

  .selection-header-section {
    flex-direction: column;
    gap: 12px;
  }

  .selection-header-section .card {
    width: 100%;
  }

  .profile-row {
    flex-direction: column;
  }

  .rider-grid-large {
    grid-template-columns: 1fr; /* Single column on mobile */
  }

  .selection-footer {
    flex-direction: column;
    padding: 8px 16px;
    padding-bottom: max(12px, env(safe-area-inset-bottom));
    gap: 6px;
    position: fixed;
    bottom: 0;
    width: 100%;
    left: 0;
    background: rgba(245, 247, 255, 0.97);
    backdrop-filter: blur(10px);
    box-shadow: 0 -4px 15px rgba(37,99,235,0.1);
    z-index: 100;
  }

  .main-generate-btn {
    width: 100%;
    padding: 14px;
    font-size: 16px;
    border-radius: 8px; /* Make it look more like a mobile button */
  }

  /* Provide padding at the bottom of the main content so the fixed footer doesn't hide items */
  .selection-main-grid {
    padding-bottom: 140px;
  }


  /* --- Step 2: Result View --- */

  /* Show Mobile Summary at top */
  .mobile-top-summary {
    display: block !important;
    background: white;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color);
  }

  .mobile-summary-profile {
    font-size: 13px;
    color: #334155;
    margin-bottom: 8px;
  }

  .mobile-summary-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .chip-compact {
    background: #f1f5f9;
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 4px;
    color: #475569;
  }

  /* Hide Desktop specific things */
  .desktop-only {
    display: none !important;
  }

  .mobile-only-back {
    margin-bottom: 12px;
    width: 100%;
    background: #f8fafc;
  }

  .sidebar {
    display: none !important; /* Completely hide sidebar on mobile/tablet */
  }

  .content {
    padding: 16px;
    overflow-y: visible;
    order: 1;
  }

  .rider-list-sidebar {
    max-height: 300px; /* Constrain height so it doesn't take over the whole screen */
  }

  .stats-row {
    flex-direction: column;
  }

  .stat-body {
    grid-template-columns: 1fr;
  }

  .highlight-grid {
    gap: 6px;
    padding: 12px 12px;
  }

  .highlight-card {
    padding: 10px 6px;
  }

  .highlight-headline {
    font-size: 14px;
  }

  .highlight-detail {
    font-size: 10px;
  }

  .stat-block {
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
  }

  .stat-block:last-child {
    border-bottom: none;
  }

  .stat-bar-row {
    grid-template-columns: 60px 1fr 72px;
    gap: 6px;
  }

  .bar-label { font-size: 11px; }
  .bar-value  { font-size: 11px; }

  .summary-intro-text { font-size: 14px; }
  .summary-tip-item   { font-size: 13px; }

  .tabs {
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .tabs::-webkit-scrollbar { display: none; }

  .tab {
    flex: 0 0 auto;
    text-align: center;
    padding: 10px 16px;
    font-size: 13px;
  }

  .section-content {
    font-size: 15px;
  }

  .rider-desc-content {
    font-size: 13px;
  }
}

/* ── QA 섹션 ────────────────────────────── */
.qna-wrap {
  padding: 0;
}

.qna-notice {
  margin: 16px 16px 0;
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: 8px;
  padding: 12px 14px;
  font-size: 13px;
  color: #92400e;
  line-height: 1.65;
}

.qna-section {
  padding: 20px 16px 4px;
}

.qna-tag-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.qna-rider-tag {
  background: #f5f8ff;
  border: 1px solid #dde5f5;
  border-radius: 8px;
  padding: 5px 10px;
  font-size: 12px;
  color: #1d4ed8;
  font-weight: 500;
  word-break: keep-all;
}

.qna-claim-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 5px 10px;
  font-size: 12px;
  color: #374151;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}
.qna-claim-btn svg { width: 13px; height: 13px; }
.qna-claim-btn:hover { background: #f9fafb; }
.qna-claim-btn.open {
  color: #dc2626;
  border-color: #fca5a5;
  background: #fff5f5;
}

.qna-claim-detail {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 14px;
  font-size: 13px;
  color: #4b5563;
  line-height: 1.8;
  margin-bottom: 16px;
  white-space: pre-wrap;
  word-break: keep-all;
  overflow-wrap: break-word;
}

.qna-block {
  margin-bottom: 22px;
}

.qna-question {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 10px;
  line-height: 1.6;
  word-break: keep-all;
}

.qna-answer {
  font-size: 14px;
  color: #374151;
  line-height: 1.8;
  border-left: 3px solid #d1d5db;
  padding-left: 14px;
  margin-bottom: 10px;
  word-break: keep-all;
}

.qna-answer-row {
  display: flex;
  gap: 10px;
  padding: 9px 14px;
  border-radius: 8px;
  background: #f8fafc;
  font-size: 13px;
  color: #374151;
  line-height: 1.7;
  word-break: keep-all;
  margin-bottom: 6px;
}

.qna-answer-row.highlight {
  background: #fffbeb;
  border-left: 3px solid #f59e0b;
  border-radius: 0 8px 8px 0;
  color: #92400e;
}

.qna-answer-row.caution {
  background: #fef2f2;
  border-left: 3px solid #f87171;
  border-radius: 0 8px 8px 0;
  color: #991b1b;
}

.qna-answer-label {
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
}

.qna-tip {
  background: #f0fdf4;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  color: #166534;
  line-height: 1.65;
  display: flex;
  gap: 8px;
  word-break: keep-all;
}

.qna-tip-icon {
  flex-shrink: 0;
}

.qna-divider {
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 2px 0 0;
}

/* Product selector */
.product-selector-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
}

.product-selector-label {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  white-space: nowrap;
}

.product-selector-select {
  height: 36px;
  padding: 0 32px 0 12px;
  border: 1.5px solid #cbd5e1;
  border-radius: 8px;
  background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E") no-repeat right 10px center;
  appearance: none;
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
  cursor: pointer;
  transition: border-color 0.15s;
  min-width: 200px;
}

.product-selector-select:focus {
  outline: none;
  border-color: #6366f1;
}

/* Coming soon page */
.coming-soon-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 60px);
  padding: 40px 20px;
}

.coming-soon-card {
  text-align: center;
  max-width: 420px;
  padding: 48px 40px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.08);
  border: 1px solid #e5e7eb;
}

.coming-soon-icon {
  font-size: 52px;
  margin-bottom: 20px;
}

.coming-soon-title {
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 14px;
}

.coming-soon-desc {
  font-size: 14px;
  color: #64748b;
  line-height: 1.7;
  margin: 0 0 28px;
}

.coming-soon-back-btn {
  display: inline-block;
  padding: 10px 22px;
  background: #6366f1;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.coming-soon-back-btn:hover {
  background: #4f46e5;
}

/* ── 이 페이지(coaching-track.vue) 자체 스타일 ───────────────────────── */
.toast-container {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 9999;
  pointer-events: none;
}

.toast {
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: coaching-track-slideUp 0.2s ease;
  max-width: 400px;
  text-align: center;
}

.toast.error   { background: #ef4444; }
.toast.success { background: #22c55e; }
.toast.info    { background: #334155; }

@keyframes coaching-track-slideUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.rider-category-header {
  padding: 6px 10px;
  background: #f1f5f9;
  font-size: 10px;
  font-weight: 700;
  color: #64748b;
}
</style>
