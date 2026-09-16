<script>
import { renderMarkdown } from '@/utils/markdown'
import RightView from '@/components/RightView.vue'
import Images from '@/components/Images.vue'
import Video from '@/components/Video.vue'
import Link from '@/components/Link.vue'
import StepDots from '@/components/StepDots.vue'
import {
  getSurveyQuestions,
  diagnoseSurvey,
  generateOpening,
  generateFinal,
} from '@/utils/taxurance3Api'

export default {
  name: 'Taxurance3',
  components: { RightView, Images, Video, Link, StepDots },

  data() {
    return {
      text: this.$route.params.text || '',
      genderOptions: ['여성', '남성'],
      ageOptions: ['~30대', '40대', '50대', '60대', '70대', '80대~'],
      interestOptions: ['상속', '증여', '개인사업자','금융소득∙자산관리'],
      transOptions: ['영어', '중국어', '태국어', '베트남어', '러시아어'],
      optionLetters: ['A', 'B', 'C', 'D'],

      openConsiderCategories: [],

      filters: this.createDefaultFilters(),

      // 백엔드 API에서 받아온 데이터 (utils/taxurance3Api.js)
      considerCategories: [],
      currentQuestionsData: {},

      // 자산가유형 설문 - 문항 이동 상태
      currentIndex: 0,

      // 결과화면 - /api/survey/diagnose, /api/opening 응답 저장
      resultMeta: null,
      openingMent: '',

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
      const { interest, sex, age } = this.filters
      return interest && sex && age
    },
    hasResult() {
      return Object.keys(this.resultFilters).length > 0
    },

    // SpeechDoc의 consider_label/consider_options에서 뽑은 이슈 카테고리 + 고정 설문 카테고리
    considerOptions() {
      return [
        ...this.considerCategories,
        { label: '자산가유형 진단', type: 'survey', items: [] },
      ]
    },

    // 자산가유형 설문 - filters.age 기준 문항 세트 (currentQuestionsData는 age 바뀔 때 API로 받아옴)
    questionOrders() {
      return Object.keys(this.currentQuestionsData).sort((a, b) => Number(a) - Number(b))
    },
    currentKey() {
      return this.questionOrders[this.currentIndex]
    },
    currentQuestion() {
      return this.currentQuestionsData[this.currentKey] || null
    },
    allAnswered() {
      return (
        this.questionOrders.length > 0 &&
        this.questionOrders.every((o) => this.filters.opening_survey[o])
      )
    },

    submitButtonLabel() {
      return this.allAnswered
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

    'filters.age': {
      immediate: true,
      handler(newAge) {
        this.currentIndex = 0
        this.filters.opening_survey = {}
        this.loadSurveyQuestions(newAge)
      },
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
        opening_survey: {},
        requirement: '',
        prev_speech: '',
      }
    },

    fetchContents() {
      // 관련자료(/coverage/contents에 해당) 기능은 아직 백엔드에 없음 - 추후 연동
    },

    async loadSurveyQuestions(age) {
      if (!age) {
        this.currentQuestionsData = {}
        return
      }
      try {
        this.currentQuestionsData = await getSurveyQuestions(age)
      } catch (e) {
        console.warn('[taxurance3] 설문 조회 실패:', e)
        this.currentQuestionsData = {}
      }
    },

    // submitType='first'일 때만 진단 + 오프닝 멘트(llm1)를 새로 받는다.
    // 'sec'(채팅 수정요청)/'re'("다른 화법도 만들어드릴까요?")는 기존 openingMent(llm1)를 그대로
    // 고정해서 재사용하고 최종화법(llm2)만 다시 생성한다 - 단, 'sec'은 prev_speech가 있어서
    // retry 템플릿("직전 화법 수정")으로 가고, 're'는 prev_speech를 비워서 final 템플릿으로
    // ("고정 오프닝 + 새 최종화법") 완전히 새로 생성한다.
    async runGeneration() {
      this.isTyping = true
      this.startFake()

      this.messages.push({
        role: 'speech',
        content: '',
        readyTrans: false,
        isTrans: false,
        transText: '',
      })
      const last = this.messages[this.messages.length - 1]

      try {
        if (this.submitType === 'first') {
          if (this.allAnswered) {
            const answers = this.questionOrders.map((o) => this.filters.opening_survey[o])
            const diag = await diagnoseSurvey(answers)
            this.resultMeta = {
              badge: diag.badge,
              typeTitle: diag.title,
              typeDesc: diag.desc,
              points: diag.point_text,
            }
          } else {
            this.resultMeta = null
          }

          try {
            const openingRes = await generateOpening({
              interest: this.resultFilters.interest,
              sex: this.resultFilters.sex,
              age_label: this.resultFilters.age,
              considerations: this.resultFilters.considerations,
              requirement: this.resultFilters.requirement || '',
            })
            this.openingMent = openingRes.opening_ment
          } catch (e) {
            console.error('[taxurance3] 오프닝 멘트 생성 실패:', e)
            this.openingMent = '(오프닝 멘트 생성 실패) 백엔드 서버 연결을 확인해주세요.'
          }
        } else if (this.submitType === 're') {
          // "다른 화법" 재생성은 오프닝(llm1)은 고정하고, 직전 화법 수정(retry)이 아니라
          // 최종화법(llm2)만 처음부터(final 템플릿으로) 새로 생성하는 것.
          this.resultFilters.prev_speech = ''
        }

        const finalRes = await generateFinal({
          interest: this.resultFilters.interest,
          sex: this.resultFilters.sex,
          age_label: this.resultFilters.age,
          considerations: this.resultFilters.considerations,
          opening_ment: this.openingMent,
          prev_speech: this.resultFilters.prev_speech || '',
          requirement: this.resultFilters.requirement || '',
        })

        this.$set(last, 'content', finalRes.speech)
        this.$set(last, 'readyTrans', true)
      } catch (e) {
        console.error('[taxurance3] 화법 생성 실패:', e)
        this.$set(last, 'content', '(생성 실패) 백엔드 서버 연결을 확인해주세요.')
      } finally {
        this.$nextTick(() => this.scrollToBottom(false))
        this.isTyping = false
        this.clearTicker()
      }
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

    isMaxSelected(value) {
      return (
        this.filters.considerations.length >= 2 &&
        !this.filters.considerations.includes(value)
      )
    },

    isConsiderOpen(label) {
      return this.openConsiderCategories.includes(label)
    },

    // 자산가유형 설문 - 이미 선택된 항목을 다시 클릭하면 선택 해제됨
    toggleAnswer(orderKey, letter) {
      const current = this.filters.opening_survey[orderKey]
      this.$set(this.filters.opening_survey, orderKey, current === letter ? '' : letter)
    },
    goNext() {
      if (this.currentIndex < this.questionOrders.length - 1) this.currentIndex += 1
    },
    goPrev() {
      if (this.currentIndex > 0) this.currentIndex -= 1
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
        }
        this.resultMeta = null
        this.openingMent = ''

        this.submitType = 'first'
        this.fetchContents()
        this.runGeneration()

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

      this.runGeneration()
      this.text = ''
    },

    handleReFilter() {
      this.submitType = 're'
      this.runGeneration()
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
      this.resultMeta = null
      this.openingMent = ''
      this.messages = []
      this.relatedData = []
      this.openConsiderCategories = []
      this.submitType = ''
      this.text = ''
      this.currentStep = 0
      this.isTyping = false
      this.currentIndex = 0

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
                <div class="wrap-label rd-st1 rd-st1--wrap">
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
                      <div v-if="category.type === 'survey'" class="asset-survey">
                        <p class="asset-survey-desc">
                          아래 질문을 고객에게 건네고, 고객의 답변과 가장 가까운 항목을 체크하세요.
                        </p>
                        <template v-if="currentQuestion">
                          <p class="asset-survey-step">질문 {{ currentIndex + 1 }} / {{ questionOrders.length }}</p>
                          <div class="asset-survey-block">
                            <p class="asset-survey-block-tit">{{ currentQuestion.title }}</p>
                            <div class="asset-survey-option-list">
                              <label
                                v-for="(opt, idx) in currentQuestion.options"
                                :key="idx"
                                class="asset-survey-pill"
                                :class="{ active: filters.opening_survey[currentKey] === optionLetters[idx] }"
                                @click="toggleAnswer(currentKey, optionLetters[idx])"
                              >
                                <span>{{ optionLetters[idx] }}. {{ opt }}</span>
                              </label>
                            </div>
                            <div class="asset-survey-nav">
                              <button
                                v-if="currentIndex > 0"
                                type="button"
                                class="asset-survey-btn-prev"
                                @click="goPrev"
                              >
                                이전
                              </button>
                              <button
                                v-if="filters.opening_survey[currentKey] && currentIndex < questionOrders.length - 1"
                                type="button"
                                class="asset-survey-btn-next"
                                @click="goNext"
                              >
                                다음
                              </button>
                            </div>
                          </div>
                        </template>
                        <p v-else class="asset-survey-desc">연령대를 먼저 선택해주세요.</p>
                      </div>
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
          <div class="filter-top">
            <button class="btn" @click="goHome">
              <i class="icon-mm icon-home"></i>
            </button>
            <div class="wrap-select">
              <div class="select-name" @click="isFilters = !isFilters">
                <div class="wrap-label">
                  <p>{{ filters?.sex }}</p>
                  <p>{{ filters?.age }}</p>
                  <p v-if="filters?.interest">{{ filters.interest }}</p>
                </div>
                <span class="add-text">AI 상담 중</span>
              </div>
            </div>
          </div>

          <div class="chat-log scroll-y" ref="chatLogRef">
            <div class="chat-log-inner">
              <div class="msg info" v-if="hasResult">
                <ul class="list-top">
                  <li>
                    <label>{{ resultFilters.sex }},</label>
                    <label>{{ resultFilters.age }},</label>
                    <label v-if="resultFilters.interest">{{ resultFilters.interest }}</label>
                  </li>
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

              <div class="asset-survey-result" v-if="hasResult && resultMeta">
                <span class="asset-survey-badge">{{ resultMeta.badge }} · {{ resultMeta.typeTitle }}</span>
                <p class="asset-survey-result-desc">{{ resultMeta.typeDesc }}</p>
                <ul class="asset-survey-points">
                  <li v-for="(point, idx) in resultMeta.points" :key="idx">{{ point }}</li>
                </ul>
              </div>

              <div class="asset-survey-result" v-if="hasResult && openingMent">
                <div class="asset-survey-script">
                  <div class="asset-survey-script-header">
                    <span class="asset-survey-script-label">💡 오프닝 멘트</span>
                  </div>
                  <p class="asset-survey-script-body">{{ openingMent }}</p>
                </div>
              </div>

              <div
                v-for="(msg, idx) in messages"
                :key="idx"
                :class="['msg', msg.role]"
              >
                <template v-if="msg.role === 'speech'">
                  <div class="speech-header">
                    <p class="tit">
                      <i class="icon-s icon-star"></i>AI 제안 화법
                    </p>
                  </div>

                  <div class="speech-body">
                    <StepDots
                      v-if="!msg.content"
                      :step="currentStep"
                      :totalStep="totalStep"
                      :label="stepTexts[currentStep]"
                    />
                    <div
                      class="markdown-body"
                      v-html="renderMarkdown(msg.content)"
                    ></div>
                  </div>
                  <div class="speech-footer" v-if="msg.readyTrans">
                    <div class="trans-header">
                      <p class="tit">
                        <i class="icon-s icon-trans"></i>번역하기
                      </p>
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
                    <div class="trans-body" v-if="msg.isTrans">
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
                <template v-else>{{ msg.content }}</template>
              </div>
            </div>
          </div>

          <div class="recommend" v-if="messages.length > 0 && !isTyping">
            <p class="txt" @click="handleReFilter">
              다른 화법도 만들어드릴까요?
            </p>
            <button
              class="btn-related"
              v-if="relatedData.length > 0"
              @click="toggleSidebar"
            >
              {{ isSidebarOpen ? '닫기' : '관련자료 보기' }}
            </button>
          </div>

          <div class="wrap-search small">
            <input
              v-model="text"
              class="form-control"
              @keydown="handleKeyDown"
              ref="textareaRef"
              placeholder="생성된 화법에서 수정 필요한게 있으신가요?"
            />
            <div class="wrap-btn">
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
      white-space: nowrap;
    }
  }
}
.rd-st1--fit-wide {
  flex-wrap: nowrap;
  label {
    p {
      min-width: 0;
      padding: rem(8) rem(28);
      font-size: 13px;
      white-space: nowrap;
    }
  }
}
.rd-st1--wrap {
  flex-wrap: wrap;
  row-gap: 4px;
  label {
    p {
      min-width: 0;
      padding: rem(8) rem(20);
      font-size: 13px;
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
  .rd-st1--fit-wide,
  .rd-st1--wrap {
    label p {
      white-space: normal;
    }
  }
}

.folder-tab-wrap {
  position: relative;
  max-width: 620px;
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
  background-color: #eaf4ff;
  color: #1d4ed8;
  font-size: 14px;
  font-weight: 600;

  &.active {
    background-color: #dbeafe;
  }
}

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
  padding: rem(10) rem(16);
  background-color: #fff;
  cursor: pointer;
  transition: background-color 0.15s;
  &.open {
    background-color: #f1f5f9;
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

/* 자산가유형 설문 */
.asset-survey {
  display: flex;
  flex-direction: column;
  gap: rem(16);
}
.asset-survey-desc {
  font-size: 12.5px;
  color: #62748e;
  line-height: 1.5;
}
.asset-survey-step {
  font-size: 12px;
  font-weight: 600;
  color: #90a1b9;
}
.asset-survey-block {
  display: flex;
  flex-direction: column;
  gap: rem(8);
}
.asset-survey-block-tit {
  font-size: 13px;
  font-weight: 600;
  color: #314158;
  line-height: 1.5;
  word-break: keep-all;
}
.asset-survey-option-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.asset-survey-pill {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background-color: #fff;
  color: #62748e;
  font-size: 13px;
  line-height: 1.45;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s, color 0.15s;

  &:hover {
    border-color: #b7ccff;
    background-color: #f5f8ff;
  }

  &.active {
    border-color: #545fdd;
    background-color: #eef1ff;
    color: #37409e;
    font-weight: 500;
  }
}
.asset-survey-nav {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}
.asset-survey-btn-prev,
.asset-survey-btn-next {
  padding: 8px 18px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.asset-survey-btn-prev {
  background-color: #f1f5f9;
  color: #62748e;
}
.asset-survey-btn-next {
  background-color: #545fdd;
  color: #fff;
}

/* 자산가유형 설문 결과 */
.asset-survey-result {
  padding: rem(16);
  border: 1px solid #bbf7d0;
  border-radius: 12px;
  background-color: #f0fdf4;
}
.asset-survey-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  background-color: #15803d;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 8px;
}
.asset-survey-result-desc {
  font-size: 13px;
  color: #166534;
  line-height: 1.6;
  margin-bottom: 12px;
}
.asset-survey-points {
  list-style: none;
  padding-top: 10px;
  border-top: 1px dashed #86efac;
  margin-bottom: 16px;

  li {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    font-size: 12.5px;
    color: #15803d;
    margin-bottom: 6px;
    line-height: 1.5;

    &::before {
      content: '✔';
      font-weight: bold;
      flex-shrink: 0;
    }
  }
}
.asset-survey-script {
  padding: rem(14);
  border: 1px solid #86efac;
  border-radius: 10px;
  background-color: #fff;
}
.asset-survey-script-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.asset-survey-script-label {
  font-size: 13px;
  font-weight: 700;
  color: #545fdd;
}
.asset-survey-script-body {
  padding: 12px 14px;
  border-left: 4px solid #2563eb;
  border-radius: 8px;
  background-color: #f8fafc;
  color: #0f172a;
  font-size: 13px;
  line-height: 1.7;
  word-break: keep-all;
  white-space: pre-wrap;
}
</style>
