<script>
import { renderMarkdown } from '@/utils/markdown'
import RightView from '@/components/RightView.vue'
import Images from '@/components/Images.vue'
import Video from '@/components/Video.vue'
import Link from '@/components/Link.vue'
import StepDots from '@/components/StepDots.vue'
import AssetTypeSurvey from '@/components/AssetTypeSurvey.vue'
import AssetTypeSurveyResult from '@/components/AssetTypeSurveyResult.vue'
import { getSurveyType, getCoverageContents, getTaxuranceGuide } from '@/utils/mockTaxurance'


export default {
  name: 'Taxurance2',
  components: { RightView, Images, Video, Link, StepDots, AssetTypeSurvey, AssetTypeSurveyResult },

  data() {
    return {
      text: this.$route.params.text || '',
      interestOptions : ['상속', '증여', '개인사업자'],
      genderOptions: ['여성', '남성'],
      ageOptions: ['~30대','40대', '50대', '60대', '70대', '80대~'],
      transOptions: ['영어', '중국어', '태국어', '베트남어', '러시아어'],
      considerOptions: [
            { label: '이슈 카테고리1', items: ['기본', '거주자/비거주자', '보험활용', '부동산 자산', '자금출처'] },
            { label: '이슈 카테고리2', items: ['2차상속', '상속공제', '상속설계', '상속분쟁', '상속세', '상속재산종류'] },
            { label: '이슈 카테고리3', items: ['상속절차', '증여공제', '증여설계', '증여세', '세금설계'] },
            { label: '이슈 카테고리4', type: 'survey', items: [] },
          ],

      openConsiderCategories: [],

      filters: this.createDefaultFilters(),

      resultFilters: {},
      messages: [], 
      salesImg: [],
      salesVideo: [],
      relatedData: [],
      submitType: '', // first, sec, re
      isTyping: false,
      currentStep: 0,
      totalStep: 4, 
      stepTexts: [
        'AI가 선택된 정보를 확인하고 있습니다.',
        'AI가 보장항목을 분석하고 있습니다.',
        'AI가 맞춤 화법을 생성하고 있습니다.',
        '완성도를 높이기 위해 최종 검토중입니다.',
      ],
      STEP_MS: 3000, 
      ticker: null,
    }
  },
  computed: {

    currentMode() {
      return this.$route.query.mode || 'list'
    },

    msgCount() {
      return this.messages.length
    },

    isFormValid() {
      const { interest, sex, age} = this.filters
      return (
        interest && 
        sex && 
        age
        // considerations.length >= 1 &&  // 2) 이슈사항 제한할 것인가
        // considerations.length <= 2 
      )
    },
    hasResult() {
      return Object.keys(this.resultFilters).length > 0
    },

    submitButtonLabel() {
      return getSurveyType(this.filters.opening_survey)
        ? '고객 성향 진단 및 맞춤화법 생성하기'
        : '맞춤 화법 생성'
    },

    isSidebarOpen() {
      return this.$store.state.isSidebarOpen
    },
  },

  watch: {
    currentMode: {
      immediate: true, 
      handler(newVal) {
        if (newVal === 'list') {
          this.toggleRelatedDataMapping(false)
        } else {
          this.$nextTick(() => {
            this.toggleRelatedDataMapping(true, this.relatedData)
          })
        }
      },
    },

    msgCount() {
      this.$nextTick(() => this.scrollToBottom(true))
    },
  },

  created() {

    if (this.$route.query.mode === 'view') {
      this.$router.replace({
        query: { ...this.$router.query, mode: 'list' },
      })
    }
  },
  mounted() {},

  beforeDestroy() {
    this.stopStreaming() 
    this.toggleRelatedDataMapping(false) 
  },

  methods: {
    renderMarkdown,

    createDefaultFilters() {
      return {
        interest: '상속',
        sex: '남성',
        age: '~30대',
        considerations: ['기본'],
        opening_survey: { q1: '', q2: '', q3: '' },
        requirement: '',
        prev_speech: '',
      }
    },

    fetchContents() {
      const { succ, items } = getCoverageContents(this.filters.interest, this.filters.considerations)
      if (succ) {
        this.toggleRelatedDataMapping(true, items)
        this.relatedData = items
      }
    },


    async startStreaming() {
      this.isTyping = true
      this.startFake()

      this.messages.push({
        role: 'speech',
        content: '',
        readyTrans: false,
        isTrans: false,
        transText: '',
      })


      let params
      if (this.submitType === 'sec') {
        params = this.resultFilters
      } else {
        params = this.filters
      }

      await this.$nextTick()
      const last = this.messages[this.messages.length - 1]
      this.$set(last, 'content', getTaxuranceGuide(params))
      this.$set(last, 'readyTrans', true)
      this.$nextTick(() => this.scrollToBottom(false))
      this.isTyping = false
      this.clearTicker()
    },

    async startTransStreaming(lang, msg) {
      this.$set(msg, 'isTrans', true)
      this.$set(msg, 'transText', '') 
      this.startFake() 

      this.$nextTick(() => this.scrollToBottom(false))

      const params = {
        language: lang,
        msg: msg.content,
      }

      await this.$stream.fetchStream('/translation/chat/stream', params, {
        onChunk: (chunk) => {
          this.$set(msg, 'transText', msg.transText + chunk)

          this.$nextTick(() => this.scrollToBottom(false))
        },
        onFinished: () => {
          this.clearTicker()
        },
      })
    },

    stopStreaming() {
      this.$stream.stop()
    },

// 6) 이슈사항 개수 제한?
    isMaxSelected(value) {
    return (
        this.filters.considerations.length >= 2 &&
        !this.filters.considerations.includes(value)
    )
    },

    isConsiderOpen(label) {
      return this.openConsiderCategories.includes(label)
    },
    toggleConsiderOpen(category) {
      const label = category.label
      const isOpen = this.isConsiderOpen(label)

      // 설문 카테고리는 상단 "고객 정보"에서 연령대를 먼저 골라야 열 수 있음
      if (!isOpen && category.type === 'survey' && !this.filters.age) {
        alert('필수값을 입력하세요')
        return
      }

      if (isOpen) {
        this.openConsiderCategories = this.openConsiderCategories.filter((l) => l !== label)
      } else {
        this.openConsiderCategories.push(label)
      }
    },

    submitFilter() {
      if (this.isFormValid) {
        this.messages = []
        this.relatedData = []
        this.resultFilters = {
        ...this.filters,
        considerations: [...this.filters.considerations],
        // "맞춤 화법 생성" 클릭 시점에 성향 진단을 확정. 백엔드로는 답변이 아니라 유형 번호만 보내면 됨
        opening_survey: getSurveyType(this.filters.opening_survey),
        }

        this.submitType = 'first'
        this.fetchContents() 
        this.startStreaming()

        this.handleChangeView('view') 
      } else {
        alert('필수 항목을 확인해주세요.')
      }
    },


    handleKeyDown(e) {
      if (this.text.trim().length < 1) return 
      if (e.key === 'Enter' && e.shiftKey) return
      if (e.key === 'Enter') {
        e.preventDefault() 
        this.handleClickSend()
      }
    },

  
    handleClickSend() {
      if (this.text.trim()) {
        this.messages.push({
          role: 'user',
          content: this.text,
        })
      }
      this.submitType = 'sec'
      this.resultFilters.requirement = this.text 
      this.resultFilters.prev_speech =
        this.messages[this.messages.length - 2].content

      this.startStreaming() 
      this.text = ''
    },

    handleReFilter() {
      this.submitType = 're'
      this.startStreaming()
    },


    scrollToBottom(smooth = true) {
      const el = this.$refs.chatLogRef
      if (el && el.scrollTo) {
        el.scrollTo({
          top: el.scrollHeight,
          behavior: smooth ? 'smooth' : 'auto', 
        })
      } else if (this.$refs.bottomRef && this.$refs.bottomRef.scrollIntoView) {
        this.$refs.bottomRef.scrollIntoView({
          behavior: smooth ? 'smooth' : 'auto',
        })
      }
    },

    // movePage() {
    //   this.$router.push({
    //     path: '/sales/product-info',
    //     query: { text: this.resultFilters.converage_keywords.join(', ') },
    //   })
    // },

    toggleRelatedDataMapping(show, item) {
      if (show) {
        this.$store.dispatch('relatedItems/saveItems', item) 
      } else {
        this.$store.dispatch('relatedItems/clear') 
      }
    },

    handleChangeView(view) {
      this.$router.push({
        query: { mode: view },
      })
    },

    goHome() {
      this.stopStreaming()
      this.clearTicker()

      this.filters = this.createDefaultFilters()
      this.resultFilters = {}
      this.messages = []
      this.relatedData = []
      this.openConsiderCategories = []
      this.submitType = ''
      this.text = ''
      this.currentStep = 0
      this.isTyping = false

      this.handleChangeView('list')
    },

    handleSaveSpeech() {
      alert('저장되었습니다.')
    },

    toggleSidebar() {
      this.$store.commit('TOGGLE_SIDEBAR')
      this.$store.dispatch('relatedItems/setTab', 0)
    },

    clearTicker() {
      if (this.ticker) {
        clearInterval(this.ticker)
        this.ticker = null
      }
    },

    startFake() {
      this.currentStep = 0 
      this.clearTicker()
      this.ticker = window.setInterval(() => {
        if (this.currentStep < this.totalStep - 1) this.currentStep += 1 
        else this.clearTicker()
      }, this.STEP_MS)
    },
    delay(ms) {
      return new Promise((r) => setTimeout(r, ms))
    },
  },
}
</script>

<template>
  <div class="contents">
    <div class="cont-main">
      <div class="main-list" v-if="currentMode === 'list'">
        <section>
          <div class="wrap-sub-title">
            <p class="sub-title">
              <strong>고객 맞춤형 재무 설계</strong>
            </p>
          </div>
        </section>
        <div class="filter-section">
          <section class="filter-list scroll-y">
            <div class="folder-tab-wrap">
              <button class="folder-tab active">개인고객</button>
              <ul class="filter-main">

              <li>
                <p class="tit">
                  고객 정보 <span class="txt-required">(필수)</span>
                </p>

                <div class="wrap-label rd-st1 rd-st1--fit-wide">
                  <label v-for="interest in interestOptions" :key="interest">
                    <input
                      type="radio"
                      v-model="filters.interest"
                      :value="interest"
                      required
                    />
                    <p>{{ interest }}</p>
                  </label>
                </div>
                <div class="wrap-row-half">

                  <div class="wrap-label rd-st1 rd-st1--fit-wide">
                    <label v-for="gender in genderOptions" :key="gender">
                      <input
                        type="radio"
                        v-model="filters.sex"
                        :value="gender"
                        required
                      />
                      <p>{{ gender }}</p>
                    </label>
                  </div>
                  <div class="wrap-label rd-st1 rd-st1--fit">
                    <label v-for="age in ageOptions" :key="age">
                      <input
                        type="radio"
                        v-model="filters.age"
                        :value="age"
                        required
                      />
                      <p>{{ age }}</p>
                    </label>
                  </div>
                </div>
              </li>
              <li class="full">
                <p class="tit">
                  고객 특이사항
                  <span class="txt-no-required">(선택)</span>
                </p>

                <div class="consider-accordion">
                  <div v-for="(category, ci) in considerOptions" :key="ci" class="consider-accordion-item">
                    <div
                      class="consider-accordion-header"
                      :class="{ open: isConsiderOpen(category.label) }"
                      @click="toggleConsiderOpen(category)"
                    >
                      <span class="consider-toggle-label">{{ category.label }}</span>
                    </div>
                    <div v-show="isConsiderOpen(category.label)" class="consider-accordion-body">
                      <AssetTypeSurvey
                        v-if="category.type === 'survey'"
                        v-model="filters.opening_survey"
                        :age="filters.age"
                      />
                      <div v-else class="consider-item-row">
                        <label v-for="item in category.items" :key="item">
                          <input type="checkbox" :value="item" v-model="filters.considerations" />
                          <p>{{ item }}</p>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>


                <input
                  type="text"
                  v-model="filters.requirement"
                  placeholder="추가 요청사항을 알려주세요 (예: 자녀 2명 있음)"
                  class="text-input"
                />
              </li>
              </ul>
            </div>
          </section>

          <section class="filter-btn">
            <button
              class="btn-xl btn-main"
              type="submit"
              :disabled="!isFormValid"
              @click="submitFilter"
            >
              {{ submitButtonLabel }}
            </button>
          </section>
        </div>
      </div>

      <div class="main-result" v-if="currentMode === 'view'">
        <div class="main-result-inner">
          <!-- 고정해더: 홈(목록으로) 버튼 + 지금 조건(성별/연령대/관심보장) 요약 표시 -->
          <div class="filter-top">
            <!-- 목록 화면으로 되돌아가는 버튼 (mode=list로 전환) -->
            <button class="btn" @click="goHome">
              <i class="icon-mm icon-home"></i>
            </button>
            <div class="wrap-select">
              <!-- 클릭하면 isFilters를 토글 (현재 디자인상 별도 펼침 UI로 연결되어 있진 않음) -->
              <div class="select-name" @click="isFilters = !isFilters">
                <div class="wrap-label">
                  <p>{{ filters?.sex }}</p>
                  <p>{{ filters?.age }}</p>
                  <p v-if="filters?.interest">{{ filters.interest }}</p>
                  <!-- <i class="icon-s icon-arrow-down"></i> -->
                </div>
                <span class="add-text">AI 상담 중</span>
              </div>
            </div>
          </div>

          <!-- 채팅 로그 영역: ref="chatLogRef"를 scrollToBottom()에서 사용해 스크롤 제어 -->
          <div class="chat-log scroll-y" ref="chatLogRef">
            <div class="chat-log-inner">
              <!-- 맨 위: "제출 확정된" 조건 요약 카드 (resultFilters 기준, hasResult가 true일 때만) -->
              <div class="msg info" v-if="hasResult">
                <ul class="list-top">
                  <li>
                    <label>{{ resultFilters.sex }},</label>
                    <label>{{ resultFilters.age }},</label>
                    <label v-if="resultFilters.interest">{{ resultFilters.interest }}</label>
                  </li>
                  <!-- 특이사항이나 요청사항이 있을 때만 추가로 표시 -->
                  <li
                    v-if="
                      resultFilters.considerations.length > 0 ||
                      resultFilters.requirement
                    "
                  >
                    <div
                      class="type2"
                      v-if="resultFilters.considerations.length > 0"
                    >
                      <label
                        v-for="(item, idx) in resultFilters.considerations"
                        :key="idx"
                        >#{{ item }}
                      </label>
                    </div>
                    <div v-if="resultFilters.requirement">
                      <p class="memo">
                        {{ resultFilters.requirement }}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <AssetTypeSurveyResult
                v-if="hasResult"
                :type="resultFilters.opening_survey"
                :age="resultFilters.age"
              />

              <!-- 실제 대화 메시지 목록 (messages 배열을 순회) -->
              <div
                v-for="(msg, idx) in messages"
                :key="idx"
                :class="['msg', msg.role]"
              >
                <!-- role이 'speech'(AI 화법)인 경우 -->
                <template v-if="msg.role === 'speech'">
                  <div class="speech-header">
                    <p class="tit">
                      <i class="icon-s icon-star"></i>AI 제안 화법
                    </p>
                    <!-- <button class="btn-m btn-gray" @click="handleSaveSpeech">
                      <i class="icon-s icon-heart"></i>저장
                    </button> -->
                    <!-- ↑ (비활성화됨) 화법 저장 버튼 -->
                  </div>

                  <div class="speech-body">
                    <!-- <div class="typing-dots" v-if="!msg.content">
                      <span></span><span></span><span></span>
                      <p>생각 중...</p>
                    </div> -->
                    <!-- ↑ (비활성화됨) 예전 방식의 로딩 점 애니메이션. 지금은 아래 StepDots로 대체됨 -->

                    <!-- 아직 content가 비어있으면(=아직 첫 글자가 안 왔으면) 단계별 진행 애니메이션 표시 -->
                    <StepDots
                      v-if="!msg.content"
                      :step="currentStep"
                      :totalStep="totalStep"
                      :label="stepTexts[currentStep]"
                    />
                    <!-- 스트리밍되며 채워지는 content를 마크다운 -> HTML로 변환해서 표시 -->
                    <div
                      class="markdown-body"
                      v-html="renderMarkdown(msg.content)"
                    ></div>
                  </div>
                  <!-- 스트리밍이 끝나서(readyTrans=true) 번역 기능을 쓸 수 있을 때만 하단 영역 노출 -->
                  <div class="speech-footer" v-if="msg.readyTrans">
                    <div class="trans-header">
                      <p class="tit">
                        <i class="icon-s icon-trans"></i>번역하기
                      </p>
                      <!-- transOptions(언어 목록)만큼 번역 버튼을 렌더링, 클릭 시 startTransStreaming(언어, 메시지) 실행 -->
                      <div>
                        <button
                          v-for="(trans, idx) in transOptions"
                          :key="idx"
                          class="btn-s btn-gray"
                          @click="startTransStreaming(trans, msg)"
                        >
                          {{ trans }}
                        </button>
                      </div>
                    </div>
                    <!-- 번역이 시작된 메시지(isTrans=true)에 한해 번역 결과 영역 표시 -->
                    <div class="trans-body" v-if="msg.isTrans">
                      <!-- <div class="typing-dots" v-if="!msg.transText">
                        <span></span><span></span><span></span>
                        <p>번역 중...</p>
                      </div> -->
                      <!-- ↑ (비활성화됨) 예전 방식의 번역 로딩 애니메이션 -->
                      <StepDots
                        v-if="!msg.transText"
                        :step="currentStep"
                        :totalStep="totalStep"
                        :label="stepTexts[currentStep]"
                      />
                      <div
                        class="markdown-body"
                        v-html="renderMarkdown(msg.transText)"
                      ></div>
                    </div>
                  </div>
                </template>
                <!-- role이 'speech'가 아니면(='user') 그냥 입력한 텍스트를 그대로 표시 -->
                <template v-else>{{ msg.content }}</template>
              </div>
            </div>
          </div>

          <!-- 메시지가 하나라도 있고, 현재 스트리밍 중이 아닐 때만 노출되는 하단 추천 영역 -->
          <div class="recommend" v-if="messages.length > 0 && !isTyping">
            <!-- 클릭 시 같은 조건으로 새 화법을 다시 생성 -->
            <p class="txt" @click="handleReFilter">
              다른 화법도 만들어드릴까요?
            </p>
            <!-- 관련자료가 있을 때만 노출되는 사이드바 열기/닫기 버튼 -->
            <button
              class="btn-related"
              v-if="relatedData.length > 0"
              @click="toggleSidebar"
            >
              {{ isSidebarOpen ? '닫기' : '관련자료 보기' }}
            </button>
          </div>

          <!-- 하단 입력창: 수정 요청사항을 입력하고 엔터/전송버튼으로 재조회 요청 -->
          <div class="wrap-search small">
            <input
              v-model="text"
              class="form-control"
              @keydown="handleKeyDown"
              ref="textareaRef"
              placeholder="생성된 화법에서 수정 필요한게 있으신가요?"
            />
            <div class="wrap-btn">
              <!-- 입력값이 있을 때만 활성화되는 전송 버튼, 클릭 시 handleClickSend() 실행 -->
              <button
                class="btn-send"
                :class="{ active: text.trim() }"
                @click="handleClickSend"
                :disabled="!text.trim()"
              >
                <i class="icon-s icon-arrow-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.wrap-row-half {
  display: flex;
  align-items: flex-start;
  gap: rem(12);
  width: 100%;

  > .wrap-label {
    min-width: 0;
  }
  > .wrap-label:first-child {
    flex: 0 0 auto;
    label p {
      padding: rem(8) rem(16);
    }
  }

  > .wrap-label:last-child {
    flex: 1 1 0;
  }
}
.rd-st1--fit {
  flex-wrap: nowrap;
  label {
    flex: 1;
    min-width: 0;
    p {
      min-width: 0;
      padding: rem(8) 2px;
      font-size: 13px;
      white-space: nowrap; // 두 줄로 안 깨지게
    }
  }
}
.rd-st1--fit-wide {
  flex-wrap: nowrap;
  label {
    p {
      min-width: 0;
      padding: rem(8) rem(28);
      font-size: 13px; // rd-st1--fit(연령대)과 통일
      white-space: nowrap;
    }
  }
}

@media (max-width: 512px) {
  .wrap-row-half {
    flex-direction: column;
  }
  .wrap-row-half > .wrap-label:last-child {
    width: 100%;
  }
  .rd-st1--fit,
  .rd-st1--fit-wide {
    label p {
      white-space: normal;
    }
  }
}

.folder-tab-wrap {
  position: relative;
  max-width: 620px; // filter-main과 동일한 가운데정렬 기준을 맞추기 위함
  margin: 0 auto;
}
.folder-tab {
  position: relative;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  padding: 10px 28px;
  margin-left: 20px;
  border: none;
  border-radius: 14px 14px 0 0;
  background-color: #eaf4ff; // 하늘색 느낌
  color: #1d4ed8;
  font-size: 14px;
  font-weight: 600;

  &.active {
    background-color: #dbeafe;
  }
}

/* ── 목록(필터 입력) 화면 스타일 ───────────────────────────────── */
.filter-section {
  @include flexbox(flex-start, normal);
  flex-direction: column;
  width: 100%;
  overflow: hidden;
  .filter-list {
    .filter-main {
      @include flexbox(flex-start, normal);
      flex-direction: column;
      gap: rem(30);
      max-width: 620px;
      margin: 0 auto;
      padding: rem(30) rem(60);
      border: 1px solid #f1f5f9;
      border-radius: 16px;
      box-shadow: 0px 20px 25px rgba(226, 232, 240, 0.5),
        0px 8px 10px -1px rgba(226, 232, 240, 0.5);
      background: #fff;
      li {
        @include flexbox(flex-start, flex-start);
        flex-direction: column;
        gap: rem(12);
        .tit {
          color: #000;
          font-size: 14px;
          font-weight: 600;
        }
        .text-input {
          width: 100%;
          padding: 16px 24px;
          border: 1px solid #c9d5e4;
          border-radius: 16px;
          background-color: #fff;
        }
      }
      @media (max-width: 512px) {
        padding: 20px;
      }
    }
  }
  .filter-btn {
    padding-bottom: 20px;
    button {
      display: block;
      max-width: 620px;
      margin: 0 auto;
    }
  }
}

/* 관심 보장 체크박스 스타일 (2열 그리드) */
.chk-st2 {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(115px, 1fr));
  width: 100%;
  // @include flexbox(flex-start, center);
  // flex-wrap: wrap;
  gap: rem(12);
  label {
    // width: calc((100% - (12px * 3)) / 4);
    p {
      @include flexbox(flex-start, center);
      gap: 12px;
      height: 40px;
      padding: 0 12px;
      border: 1px solid #c9c9c9;
      background-color: #fff;
      border-radius: 12px;
      color: #555;
      font-size: 15px;
      font-weight: 600;
      i:before {
        background-color: #9ca3af;
      }
    }
    input:checked {
      + p {
        border: 1px solid #545fdd;
        background-color: #545fdd;
        color: #fff;
        i:before {
          background-color: #fff;
        }
      }
    }
    input:disabled + p {
      opacity: 0.5;
    }
  }
}

.consider-accordion {
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  background-color: #fff;
}
.consider-accordion-item {
  border-bottom: 1px solid #e2e8f0;
  &:last-child {
    border-bottom: none;
  }
}
.consider-accordion-header {
  padding: rem(10) rem(16); // 높이 축소
  background-color: #fff; // 평소엔 흰색
  cursor: pointer;
  transition: background-color 0.15s;
  &.open {
    background-color: #f1f5f9; // 펼쳐지면 회색
  }
}
.consider-accordion-body {
  padding: rem(12) rem(16) rem(14);
  background-color: #fff;
}
.consider-toggle-label {
  font-size: 14px;
  font-weight: 600;
  color: #314158;
}
.consider-item-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  label {
    // 체크박스는 기능만 남기고 화면엔 안 보이게 (알약 색 변화로만 선택 표시)
    input[type='checkbox'] {
      display: none;
    }
    p {
      padding: 5px 13px;
      border: 1px solid #e2e8f0;
      background-color: #fff;
      border-radius: 10px;
      color: #62748e;
      font-size: 14px;
      cursor: pointer;
    }
    input:checked {
      + p {
        border: 1px solid #5489ff;
        background-color: #fff;
        color: #5489ff;
        font-weight: 500;
      }
    }
  }
}

/* 결과 화면 상단 "제출 조건 요약" 카드 스타일 */
.list-top {
  li {
    &:not(:first-child) {
      margin-top: 14px;
    }
    .tit {
      color: #90a1b9;
      font-size: 11px;
    }
    .memo {
      border-radius: 7px;
      padding: 7px 10px;
      background: #eef2ff;
      color: #314158;
      font-size: 14px;
    }
    > div {
      @include flexbox(flex-start, center);
      gap: 5px;
      margin-top: 7px;
      &.type2 {
        label {
          border-radius: 7px;
          padding: 7px 10px;
          background: #eef2ff;
          color: #314158;
          font-size: 14px;
          font-weight: 400;
        }
      }
    }
    label {
      font-size: 16px;
      color: #000;
      font-weight: 700;
    }
  }
}

@media (hover: hover) {
}
</style>
