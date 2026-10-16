<script>
import { renderMarkdownTaxurance } from '@/utils/markdown'
import RightView from '@/components/RightView.vue'
import Images from '@/components/Images.vue'
import Video from '@/components/Video.vue'
import Link from '@/components/Link.vue'
import StepDots from '@/components/StepDots.vue'
import { TYPE_SURVEY_QUESTIONS, TYPE_SURVEY_RESULTS } from '@/utils/taxuranceTypeSurveyData'
// [0920 수정]
import { fetchLocalStream, fetchLocalStreamReplacing, stopLocalStreams } from '@/utils/localStream'

const TAXURANCE_FORCE_BREAK_MARKERS = ['<b>[핵심]</b>', '<b>[신뢰도 UP]</b>', '<b>[이것만은 꼭!]</b>']

export default {
  name: 'Taxurance',
  components: { RightView, Images, Video, Link, StepDots },

  data() {
    return {
      // (라우터로 넘어온 초기 검색어)
      text: this.$route.params.text || '',
      interestOptions : ['상속', '증여', '개인사업자', '금융소득·자산관리'],
      genderOptions: ['여성', '남성'],
      ageOptions: ['~30대','40대', '50대', '60대', '70대', '80대~'],
      optionLetters: ['A', 'B', 'C', 'D'],
      transOptions: ['영어', '중국어', '태국어', '베트남어', '러시아어', '몽골어'],

      // considerOptions, computed(visibleConsiderGroups)가 결정
      considerCategories: [
        { label: '상속', interests: ['상속'], items: ['상속', '부동산 자산', '상속분쟁', '보험활용', '해외거주'] },
        { label: '증여', interests: ['증여'], items: ['증여·자금출처', '부동산 자산', '해외거주', '보험활용'] },
        { label: '개인사업자', interests: ['개인사업자'], items: ['세무신고·조사', '개인소득세', '법인전환'] },
        { label: '금융소득·자산관리', interests: ['금융소득·자산관리'], items: ['금융소득·건보', '개인소득세', '법인전환', '보험활용'] },
      ],

      // 자산가유형 진단 팝업
      assetSurveyQuestions: TYPE_SURVEY_QUESTIONS,
      assetSurveyResults: TYPE_SURVEY_RESULTS,
      showTypeModal: false,       
      typeSurveyIndex: 0,        
      typeSurveyAnswers: {},      
      typeDiagnosis: null, 
      
      // 고객 정보 디폴트값
      filters: {
        interest : '상속',
        sex: '남성',
        age: '~30대',
        considerations: [],
        requirement: '',
        prev_speech: '',
        typecode: null,
      },


      resultFilters: {},
      messages: [],
      relatedData: [],
      submitType: '', // first, sec, re
      isTyping: false,
      currentStep: 0,
      totalStep: 4,
      stepTexts: [
        'AI가 선택된 정보를 확인하고 있습니다.',
        'AI가 고객 특이사항을 분석하고 있습니다.',
        'AI가 맞춤 화법을 생성하고 있습니다.',
        '완성도를 높이기 위해 최종 검토중입니다.',
      ],
      STEP_MS: 3000,
      ticker: null,

      openingMsg: { content: '', isTrans: false, transText: '' }, // 오프닝 멘트(llm1) 결과 + 번역 상태

      // [0920 수정]
      streamControllers: [], // 이 컴포넌트가 띄운 스트림들의 AbortController (다른 페이지의 $stream과 무관)
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
        // considerations.length >= 1 &&  // ?) 이슈사항 제한할 것인가 & 필수로 둘 것인가..
        // considerations.length <= 2
      )
    },
    hasResult() {
      return Object.keys(this.resultFilters).length > 0
    },

    isSidebarOpen() {
      return this.$store.state.isSidebarOpen
    },

    visibleConsiderGroups() {
      return this.considerCategories.filter(
        (group) => group.interests.includes(this.filters.interest)
      )
    },


    typeQuestionsData() {
      return this.assetSurveyQuestions[this.filters.age] || {}
    },
    typeQuestionOrders() {
      return Object.keys(this.typeQuestionsData).sort((a, b) => Number(a) - Number(b))
    },
    typeCurrentKey() {
      return this.typeQuestionOrders[this.typeSurveyIndex]
    },
    typeCurrentQuestion() {
      return this.typeQuestionsData[this.typeCurrentKey] || null
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

    'filters.age'() {
      this.typeSurveyIndex = 0
      this.typeSurveyAnswers = {}
      this.typeDiagnosis = null
      this.filters.typecode = null
    },

    'filters.interest'() {
      this.filters.considerations = []
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
    renderMarkdown(text, isTranslation = false) {
      return renderMarkdownTaxurance(text, TAXURANCE_FORCE_BREAK_MARKERS, isTranslation)
    },

    //  실제 백엔드 연결되어 가드(═══)/return 제거하고 실호출로 전환.
    // interest(문자열) -> interests(배열)로 파라미터 형태도 백엔드 스키마에 맞게 변경.
    async fetchContents() {
      try {
        // 화법 생성(오프닝/최종화법) 호출과 동일한 필터 기준(관심분야/연령대/특이사항)을 사용.
        // sex는 DB 필터링이 아니라 LLM 프롬프트 톤 조정용이라(filter_speechdoc_rows에 sex 파라미터
        // 자체가 없음) 관련자료 조회엔 넣지 않는다.
        const { items, succ } = await this.$axios.post('/taxurance/contents', {
          // [0923 수정] 선택한 관심분야 외에 '공통' 자료도 항상 같이 조회되도록
          interests: [this.resultFilters.interest, '공통'],
          age_tags: [this.resultFilters.age],
          // [0923 수정] 특이사항 목록 맨 뒤에 '공통'도 항상 추가
          consider_options: [...this.resultFilters.considerations, '공통'],
        })
        if (succ) {
          this.toggleRelatedDataMapping(true, items)
          this.relatedData = items
        }
      } catch (e) {
        console.warn('[fetchContents] 관련자료 조회 실패(백엔드 미연결 등):', e)
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
      const last = this.messages[this.messages.length - 1]

      // [0921 수정] design-bible.vue랑 같은 방식: 'sec'(채팅 수정)일 때만 수정된 resultFilters를
      // 쓰고, 'first'/'re'는 항상 원본 this.filters를 씀 - 그래서 "다른 화법"(재생성)은 채팅
      // 수정 이력과 무관하게 항상 맨 처음 폼 값으로 되돌아감 (initialRequirement 같은 별도
      // 필드로 따로 기억해뒀다가 복원할 필요가 없어짐)
      const baseFilters = this.submitType === 'sec' ? this.resultFilters : this.filters

      try {
        if (this.submitType === 'first') {
          try {
            const openingData = await this.$axios.post('/taxurance/opening/make', {
              sex: baseFilters.sex,
              // [0923 수정] 선택한 관심분야 외에 '공통'도 항상 같이 보냄
              interests: [baseFilters.interest, '공통'],
              age_tags: [baseFilters.age],
              // [0923 수정] 특이사항 목록 맨 뒤에 '공통'도 항상 추가
              consider_options: [...baseFilters.considerations, '공통'],
              requirement: baseFilters.requirement || '',
            })
            this.openingMsg.content = openingData.opening
          } catch (e) {
            console.error('[taxurance] 오프닝 멘트 생성 실패:', e)
            this.openingMsg.content = ''
            this.$set(last, 'content', '(오프닝 멘트 생성 실패) 백엔드 서버 연결을 확인해주세요.')
            return
          }
        }

        let hasError = false
        // [0920 수정]
        await fetchLocalStream(
          this.streamControllers,
          { channel: this.$store.state.device, nuxtError: this.$nuxt.error },
          '/taxurance/speech/make',
          {
            sex: baseFilters.sex,
            // [0923 수정] 선택한 관심분야 외에 '공통'도 항상 같이 보냄
            interests: [baseFilters.interest, '공통'],
            age_tags: [baseFilters.age],
            // [0923 수정] 특이사항 목록 맨 뒤에 '공통'도 항상 추가
            consider_options: [...baseFilters.considerations, '공통'],
            opening_result: this.openingMsg.content,
            prev_speech: baseFilters.prev_speech || '',
            requirement: baseFilters.requirement || '',
          },
          {
            onChunk: (chunk) => {
              this.$set(last, 'content', last.content + chunk)
              this.$nextTick(() => this.scrollToBottom(false))
            },
            onError: (e) => {
              hasError = true
              console.error('[taxurance] 화법 생성 실패:', e)
              if (!last.content) {
                this.$set(last, 'content', '(생성 실패) 백엔드 서버 연결을 확인해주세요.')
              }
            },
            onFinished: () => {
              if (hasError) return
              // 스트림이 에러 없이 끝났는데 청크를 하나도 못 받은 경우(빈 응답 등) -
              // content가 비어있는데 readyTrans만 true가 되면 StepDots(로딩)랑 번역하기 버튼이
              // 동시에 뜨는 어정쩡한 상태가 되므로, 이 경우엔 실패로 처리한다.
              if (last.content) {
                this.$set(last, 'readyTrans', true)
              } else {
                this.$set(last, 'content', '(생성 실패) 백엔드 서버 연결을 확인해주세요.')
              }
            },
          }
        )
      } catch (e) {
        console.error('[taxurance] 화법 생성 실패:', e)
        this.$set(last, 'content', '(생성 실패) 백엔드 서버 연결을 확인해주세요.')
      } finally {
        this.$nextTick(() => this.scrollToBottom(false))
        this.isTyping = false
        this.clearTicker()
      }
    },

    // [0920 수정] isTyping 가드 제거 - 오프닝 번역은 최종화법 스트리밍과 무관하게 동작해야 함
    // [0920 수정] 같은 메시지(msg)에 번역이 이미 진행 중이면, 새 언어를 누르는 순간 이전 요청은
    // 취소되고 새 요청으로 교체됨 (fetchLocalStreamReplacing이 msg를 key로 알아서 처리 -
    // 예전 $stream이 fetchStream() 부를 때마다 이전 스트림을 끊던 동작과 같은 "교체" 느낌이지만,
    // 이번엔 전역이 아니라 같은 메시지끼리만 영향 줌)
    async startTransStreaming(lang, msg) {
      this.$set(msg, 'isTrans', true)
      this.$set(msg, 'transText', '')
      this.startFake()

      // 맨 아래(가장 최근) 메시지를 번역할 때만 바닥으로 스크롤한다. 오프닝 멘트(openingMsg,
      // 항상 messages보다 위에 고정으로 뜸)나 messages 중 위쪽 메시지를 번역할 땐 스크롤하면
      // 안 됨 - 그러면 방금 보고 있던 카드에서 눈을 뗀 채 엉뚱하게 맨 아래로 밀려버림.
      const isLastMessage = msg === this.messages[this.messages.length - 1]
      const scrollIfLast = () => {
        if (isLastMessage) this.scrollToBottom(false)
      }

      this.$nextTick(scrollIfLast)

      const params = {
        language: lang,
        msg: msg.content,
      }

      // [0920 수정]
      await fetchLocalStreamReplacing(
        this.streamControllers,
        msg,
        { channel: this.$store.state.device, nuxtError: this.$nuxt.error },
        '/translation/chat/stream',
        params,
        {
          onChunk: (chunk) => {
            this.$set(msg, 'transText', msg.transText + chunk)

            this.$nextTick(scrollIfLast)
          },
          onFinished: () => {
            this.clearTicker()
          },
        }
      )
    },

    // [0920 수정]
    stopStreaming() {
      stopLocalStreams(this.streamControllers)
    },

    isMaxSelected(value) {
    return (
        this.filters.considerations.length >= 2 &&
        !this.filters.considerations.includes(value)
    )
    },


    openTypeModal() {
      if (!this.filters.age) {
        alert('연령대를 먼저 선택해주세요.')
        return
      }
      this.typeSurveyIndex = 0
      this.typeSurveyAnswers = {}
      this.typeDiagnosis = null
      this.showTypeModal = true
    },
    closeTypeModal() {
      this.showTypeModal = false
    },
    toggleTypeAnswer(orderKey, letter) {
      const current = this.typeSurveyAnswers[orderKey]
      this.$set(this.typeSurveyAnswers, orderKey, current === letter ? '' : letter)
    },
    goTypeNext() {
      if (this.typeSurveyIndex < this.typeQuestionOrders.length - 1) this.typeSurveyIndex += 1
    },
    goTypePrev() {
      if (this.typeSurveyIndex > 0) this.typeSurveyIndex -= 1
    },
    // 자산가 성향 진단 로직 (다수결)
    computeTypecode(answers) {
      const counts = {}
      answers.forEach((a) => {
        counts[a] = (counts[a] || 0) + 1
      })
      const maxCount = Math.max(...Object.values(counts))
      const winners = Object.keys(counts).filter((k) => counts[k] === maxCount)
      return winners.length === 1 ? winners[0] : answers[0]
    },
    viewTypeResult() {
      const answers = this.typeQuestionOrders.map((o) => this.typeSurveyAnswers[o])
      const typecode = this.computeTypecode(answers)
      const info = this.assetSurveyResults[typecode]
      this.filters.typecode = typecode
      this.typeDiagnosis = {
        badge: `Type ${typecode}`,
        typeTitle: info.title,
        typeDesc: info.descreption,
        points: info.points,
        recommended: info.recommended,
      }
    },

    submitFilter() {
      if (this.isFormValid) {
        this.messages = []
        this.relatedData = []
        this.openingMsg = { content: '', isTrans: false, transText: '' }
        this.resultFilters = {
        ...this.filters,
        considerations: [...this.filters.considerations],
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
      // 한글 등 조합형 입력 중 조합을 확정하려고 누른 Enter까지 전송으로 잡히는 걸 막는다
      // (isComposing이 false로 잡히는 구형 브라우저 대비 keyCode 229도 같이 체크)
      if (e.key === 'Enter' && (e.isComposing || e.keyCode === 229)) return
      if (e.key === 'Enter') {
        e.preventDefault()
        this.handleClickSend()
      }
    },

    handleClickSend() {
      if (this.isTyping) return
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
    // [0927 수정] 화면 표시 전용 - "·" 바로 앞에 보이지 않는 Word Joiner(U+2060)를 끼워넣어서
    // "·"이 앞 글자랑 떨어져 혼자 다음 줄로 넘어가지 않게 함. filters.interest/제출값은
    // 그대로 두고(v-model="filters.interest"는 원본 interest를 그대로 씀) 이건 오직
    // {{ }} 렌더링에만 씀 - "금융소득·자산관리" 하드코딩 분기 없이 "·"이 있는 라벨이면 전부 적용됨
    glueDot(text) {
      return text.replace('·', '⁠·')
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
                <div class="interest-header-row">
                  <!-- [0927 수정] 모바일에서 라디오 4개가 두 줄로 어색하게 깨지던 문제 -
                       move/CustomerProfileInterestSelector.vue의 아이콘 카드형 그리드 디자인으로 교체 -->
                  <fieldset class="interest-picker" aria-required="true">
                    <div class="interest-picker__grid">
                      <label
                        v-for="interest in interestOptions"
                        :key="interest"
                        class="interest-picker__option"
                      >
                        <input
                          type="radio"
                          v-model="filters.interest"
                          :value="interest"
                          required
                        />
                        <span class="interest-picker__surface">
                          <span
                            class="interest-picker__icon"
                            :class="{
                              'interest-picker__icon--inherit': interest === '상속',
                              'interest-picker__icon--gift': interest === '증여',
                              'interest-picker__icon--selfemployed': interest === '개인사업자',
                              'interest-picker__icon--finance':
                                !['상속', '증여', '개인사업자'].includes(interest),
                            }"
                            aria-hidden="true"
                          ></span>
                          <!-- [0927 수정] 강제 줄바꿈 대신 word-break: keep-all로 폭에 맞게
                               자연스럽게 줄바꿈되도록 함 (너무 좁아지면 박스 밖으로 넘치던 문제 해결).
                               glueDot()이 "·" 앞에 보이지 않는 줄바꿈 금지 문자를 넣어서, "·"이
                               앞 글자와 떨어져 혼자 다음 줄로 떨어지지 않게 함 -->
                          <span class="interest-picker__text">{{ glueDot(interest) }}</span>
                        </span>
                      </label>
                    </div>
                  </fieldset>
                  <button type="button" class="btn-type-survey" @click="openTypeModal">
                     관심분야를 추천해드릴까요?
                  </button>
                </div>
              </li>
              <li class="full">
                <p class="tit">
                  고객 특이사항
                  <span class="txt-no-required">(선택)</span>
                </p>

                <div class="wrap-label chk-st3">
                  <div v-for="(group, gi) in visibleConsiderGroups" :key="gi" class="chk-st3-row">
                    <label v-for="item in group.items" :key="item">
                      <input
                        type="checkbox"
                        :value="item"
                        v-model="filters.considerations"
                      />
                      <p>
                        {{ item }}
                      </p>
                    </label>
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
              맞춤 화법 생성
            </button>
          </section>
        </div>

        <!-- 자산가유형 진단 팝업 - "선택값을 추천해드릴까요?" 클릭 시 뜸. 닫으면 그냥 이 개인고객 설계 화면으로 복귀. -->
        <div class="type-modal-overlay" v-if="showTypeModal" @click.self="closeTypeModal">
          <div class="type-modal">
            <div class="type-modal-header">
              <p class="type-modal-title">자산가유형 진단</p>
              <button type="button" class="type-modal-close" @click="closeTypeModal">✕</button>
            </div>

            <div class="type-modal-body">
              <!-- 진단 전: 문항 스텝퍼만 -->
              <div class="asset-survey" v-if="!typeDiagnosis">
                <p class="asset-survey-desc">
                  아래 질문을 고객에게 건네고, 고객의 답변과 가장 가까운 항목을 체크하세요.
                </p>
                <template v-if="typeCurrentQuestion">
                  <p class="asset-survey-step">질문 {{ typeSurveyIndex + 1 }} / {{ typeQuestionOrders.length }}</p>
                  <div class="asset-survey-block">
                    <p class="asset-survey-block-tit" :title="typeCurrentQuestion.title">{{ typeCurrentQuestion.title }}</p>
                    <div class="asset-survey-option-list">
                      <label
                        v-for="(opt, idx) in typeCurrentQuestion.options"
                        :key="idx"
                        class="asset-survey-pill"
                        :class="{ active: typeSurveyAnswers[typeCurrentKey] === optionLetters[idx] }"
                        :title="opt"
                        @click="toggleTypeAnswer(typeCurrentKey, optionLetters[idx])"
                      >
                        <!-- [0921 수정] opt 문자열 자체가 이미 "A : ..." 형태로 알파벳을 포함하고
                             있어서, optionLetters[idx]를 앞에 또 붙이면 "A. A : ..."처럼 중복됨 -->
                        <span>{{ opt }}</span>
                      </label>
                    </div>
                    <div class="asset-survey-nav">
                      <button
                        v-if="typeSurveyIndex > 0"
                        type="button"
                        class="asset-survey-btn-prev"
                        @click="goTypePrev"
                      >
                        이전
                      </button>
                      <!-- 마지막 문항까지 답하면 "다음" 자리가 그대로 "자산가 유형 확인하기"로 바뀐다
                           (같은 다음-스텝 흐름으로 결과화면까지 자연스럽게 이어지도록) -->
                      <button
                        v-if="typeSurveyAnswers[typeCurrentKey] && typeSurveyIndex < typeQuestionOrders.length - 1"
                        type="button"
                        class="asset-survey-btn-next"
                        @click="goTypeNext"
                      >
                        다음
                      </button>
                      <button
                        v-if="typeSurveyAnswers[typeCurrentKey] && typeSurveyIndex === typeQuestionOrders.length - 1"
                        type="button"
                        class="asset-survey-btn-next"
                        @click="viewTypeResult"
                      >
                        자산가 유형 확인하기
                      </button>
                    </div>
                  </div>
                </template>
              </div>

              <!-- 진단 후: 결과화면으로 전환(질문 스텝퍼는 사라짐) -->
              <div class="asset-survey-result" v-else>
                <span class="asset-survey-badge">{{ typeDiagnosis.badge }} · {{ typeDiagnosis.typeTitle }}</span>
                <p class="asset-survey-result-desc">{{ typeDiagnosis.typeDesc }}</p>
                <ul class="asset-survey-points">
                  <li v-for="(point, idx) in typeDiagnosis.points" :key="idx">{{ point }}</li>
                </ul>

                <div class="asset-survey-recommend">
                  <p class="asset-survey-recommend-tit">추천 특이사항</p>
                  <div class="asset-survey-recommend-tags">
                    <span v-for="(tag, idx) in typeDiagnosis.recommended" :key="idx">#{{ tag }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="main-result" v-if="currentMode === 'view'">
        <div class="main-result-inner">
          <!-- 고정해더: 홈(목록으로) 버튼 + 지금 조건(성별/연령대/관심보장) 요약 표시 -->
          <div class="filter-top">
            <!-- 목록 화면으로 되돌아가는 버튼 (mode=list로 전환) -->
            <button class="btn" @click="handleChangeView('list')">
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
              <!-- "제출 확정된" 조건 요약 카드 (resultFilters 기준, hasResult가 true일 때만) -->
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

              <!-- 오프닝 멘트: 최종화법 카드(파란 헤더바)보다 단순한, 그러나 같은 카드 톤(둥근 모서리/옅은 그림자)의 작은 카드 -->
              <div class="opening-ment" v-if="hasResult && openingMsg.content">
                <div class="opening-ment-main">
                  <p class="opening-ment-tit">오프닝 멘트</p>
                  <div
                    class="markdown-body"
                    v-html="renderMarkdown(openingMsg.content)"
                  ></div>
                </div>
                <div class="opening-ment-footer">
                  <div class="trans-header">
                    <p class="tit">
                      <i class="icon-s icon-trans"></i>번역하기
                    </p>
                    <!-- [0920 수정] 최종화법 스트리밍(isTyping)과 무관하게 항상 클릭 가능.
                         이미 번역 중이면 fetchLocalStreamReplacing이 이전 요청을 취소하고 교체함 -->
                    <div>
                      <button
                        v-for="(trans, idx) in transOptions"
                        :key="idx"
                        class="btn-s btn-gray"
                        @click="startTransStreaming(trans, openingMsg)"
                      >
                        {{ trans }}
                      </button>
                    </div>
                  </div>
                  <div class="trans-body" v-if="openingMsg.isTrans">
                    <StepDots
                      v-if="!openingMsg.transText"
                      :step="currentStep"
                      :totalStep="totalStep"
                      :label="stepTexts[currentStep]"
                    />
                    <div
                      class="markdown-body"
                      v-html="renderMarkdown(openingMsg.transText, true)"
                    ></div>
                  </div>
                </div>
              </div>

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
                      <!-- [0920 수정] isTyping(다른 화법 생성 중) 가드 제거 - 번역 제한은 같은 메시지
                           단위로만 걸림(fetchLocalStreamReplacing), 다른 화법 생성 중이어도 무관하게 동작 -->
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
                        v-html="renderMarkdown(msg.transText, true)"
                      ></div>
                    </div>
                  </div>
                </template>
                <!-- role이 'speech'가 아니면(='user') 그냥 입력한 텍스트를 그대로 표시 -->
                <template v-else>{{ msg.content }}</template>
              </div>
            </div>
          </div>

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
                :disabled="!text.trim() || isTyping"
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
      padding: rem(8) rem(11);
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
  background-color: #eaf4ff; // 하늘색 느낌
  color: #1d4ed8;
  font-size: 14px;
  font-weight: 600;

  &.active {
    background-color: #dbeafe;
  }
}

/* ── 필터 입력 화면 ───────────────────────────────── */
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

/* 관심 보장 체크박스 스타일 (2열 그리드? 1열그리드?) */
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

/* 고객 특이사항 체크박스 스타일 (알약 형태로 나열) */
.chk-st3 {
  @include flexbox(flex-start, normal);
  flex-direction: column;
  gap: rem(8);
  label {
    p {
      padding: 5px 13px;
      border: 1px solid #e2e8f0;
      background-color: #fff;
      border-radius: 10px;
      color: #62748e;
      font-size: 14px;
    }
    input:checked {
      + p {
        border: 1px solid #5489ff;
        background-color: #fff;
        color: #5489ff;
        font-weight: 500;
      }
    }
    input:disabled + p {
      opacity: 0.5;
    }
  }
}
.chk-st3-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
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

/* 오프닝 멘트 - 최종화법 카드(파란 헤더바+큰 그림자)보다 단순한 작은 카드.
   본문/번역하기 영역은 선(구분선) 대신 배경색 차이로만 구분, 색은 인디고 계열로 통일 */
// AI가 리스트 항목을 <li>텍스트</li>(tight)로 만들 때도 있고 <li><p>텍스트</p></li>(loose)로
// 만들 때도 있는데, github-markdown-css가 loose 쪽 <p>에는 문단 마진(16px)을 그대로
// 적용해서 같은 리스트 안에서도 항목 간격이 들쭉날쭉해 보인다. .markdown-body는 화법
// 본문/번역 어디서든 쓰이는 공용 클래스라 여기서 한 번에 눌러준다.
.markdown-body li > p {
  margin: 0;
}
.opening-ment {
  margin: rem(12) 0;
  border: 0.6px solid #dbeafe;
  border-radius: 16px;
  background: #eef1ff;
  box-shadow: 0px 8px 13px -2px rgba(0, 0, 0, 0.06),
    0px 3px 5px -3px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  // github-markdown-css(전역)가 .markdown-body에 background-color: #fff를 강제하므로,
  // 이 박스 안에서만큼은 투명하게 덮어써서 인디고 배경이 그대로 보이게 함
  .markdown-body {
    background: transparent;
  }
}
.opening-ment-main {
  padding: rem(20) rem(24);
  background-color: #eef1ff;
}
.opening-ment-tit {
  margin-bottom: 10px;
  color: #4338ca;
  font-size: 13px;
  font-weight: 700;
}
.opening-ment-footer {
  padding: rem(16) rem(24);
  background-color: #eef1ff;
  .trans-header {
    @include flexbox(space-between, center);
    gap: rem(10);
    .tit {
      @include flexbox(flex-start, center);
      gap: rem(8);
      flex-shrink: 0;
      color: #62748e;
      font-size: 14px;
      font-weight: 600;
      i:before {
        background-color: #62748e;
      }
    }
    > div {
      @include flexbox(flex-end, center);
      flex-wrap: wrap;
      gap: 8px;
      .btn-s {
        border: none;
        background-color: #f5f7ff;
        color: #646464;
      }
    }
  }
  .trans-body {
    margin-top: rem(12);
    padding: rem(12);
    border-radius: 12px;
    background-color: #f5f7ff;
    white-space: pre-line;
    // marked가 블록 태그 사이에 넣는 개행(</p>\n<p>)이 pre-line 때문에 빈 줄로 보이던 문제 -
    // 번역 마크다운은 원문과 같이 normal로 렌더링
    .markdown-body {
      white-space: normal;
    }
  }
}

/* 관심분야 라디오 + "선택값을 추천해드릴까요?" 버튼 한 줄 배치. 폭이 좁아지면
   버튼이 관심분야 라디오 아래(왼쪽 정렬)로 자연스럽게 줄바꿈됨 */
.interest-header-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: rem(12);
  width: 100%;
  > .interest-picker {
    // [0927 수정] flex-basis: auto로 두면 grid의 auto-fit이 폭을 제대로 못 읽어서
    // 열이 1개로 무너지는 버그가 있어서, 항상 한 줄을 통째로 차지하게 고정
    // (버튼은 자연스럽게 아래 줄로 감)
    flex: 1 1 100%;
    min-width: 0;
  }
  > .btn-type-survey {
    flex-shrink: 0;
  }
}

// [0927 수정] move/CustomerProfileInterestSelector.vue의 관심분야 카드형 디자인을
// 이식 (모바일 2x2 그리드로 가로 넘침 없이 안정적으로 배치됨)
.interest-picker {
  --interest-action: #6266d9;
  --interest-action-strong: #536fc4;
  --interest-selected-surface: linear-gradient(135deg, #f7f5ff 0%, #f4f7ff 100%);
  --interest-text-secondary: #4b5563;
  --interest-border: #d9dce9;
  --interest-border-strong: #c9cddd;
  --interest-surface: #fff;
  --interest-disabled: #9ca3af;
  --interest-radius: 14px;

  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}
.interest-picker__grid {
  display: grid;
  // [0927 수정] auto-fit은 4개 항목 기준으로 "3+1"처럼 어색하게 쌓일 수 있어서,
  // 2열 → 4열로 한 번에 점프하도록 명시적 분기 (3열은 아예 거침, 아래 미디어쿼리 참고)
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  min-width: 0;
}
.interest-picker__option {
  position: relative;
  min-width: 0;
  cursor: pointer;

  input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }
}
.interest-picker__surface {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  // [0927 수정] 카드 높이 축소 (78px -> 58px)
  min-height: 58px;
  // [0927 수정] 아이콘+텍스트 가로 배치를 좁은 화면에서도 유지하려고 여백을 줄여 텍스트 공간 확보
  padding: 8px 30px 8px 12px;
  border: 1px solid var(--interest-border);
  border-radius: var(--interest-radius);
  background: var(--interest-surface);
  color: var(--interest-text-secondary);
  transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease,
    color 160ms ease, transform 160ms ease;
}
.interest-picker__icon {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  flex: 0 0 auto;
  mask-repeat: no-repeat;
  mask-position: center;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-position: center;
  -webkit-mask-size: contain;

  &--inherit {
    @include maskImages('icon-interest-inherit.svg', #9096a6);
    -webkit-mask-image: url($imgUrl + 'icon-interest-inherit.svg');
  }
  &--gift {
    @include maskImages('icon-interest-gift.svg', #9096a6);
    -webkit-mask-image: url($imgUrl + 'icon-interest-gift.svg');
  }
  &--selfemployed {
    @include maskImages('icon-interest-selfemployed.svg', #9096a6);
    -webkit-mask-image: url($imgUrl + 'icon-interest-selfemployed.svg');
  }
  &--finance {
    @include maskImages('icon-interest-finance.svg', #9096a6);
    -webkit-mask-image: url($imgUrl + 'icon-interest-finance.svg');
  }
}
.interest-picker__text {
  min-width: 0;
  color: inherit;
  font-size: 15px;
  line-height: 1.3;
  font-weight: 700;
  text-align: center;
  // [0927 수정] overflow-wrap: anywhere를 빼서 "개인사" / "업자"처럼 음절 중간이 잘리지 않게 함
  // (word-break: keep-all만으로 "금융소득·자산관리"는 · 뒤에서 자연스럽게 줄바꿈됨)
  word-break: keep-all;
}
  s
.interest-picker__option:hover .interest-picker__surface {
  border-color: #8b88e8;
  transform: translateY(-1px);
}
.interest-picker__option input:focus-visible + .interest-picker__surface {
  outline: none;
  border-color: var(--interest-action);
  box-shadow: 0 0 0 3px rgba(98, 102, 217, 0.2);
}
.interest-picker__option input:checked + .interest-picker__surface {
  border-color: #7774e5;
  background: var(--interest-selected-surface);
  color: #4f55c7;
  box-shadow: 0 7px 20px rgba(91, 106, 217, 0.12);

  .interest-picker__icon {
    background-color: var(--interest-action);
  }
  .interest-picker__check {
    border-color: transparent;
    background: linear-gradient(135deg, var(--interest-action), var(--interest-action-strong));

    &::after {
      background-color: #fff;
    }
  }
}
.interest-picker__option input:disabled + .interest-picker__surface {
  border-color: #e2e4eb;
  background: #f4f5f8;
  color: var(--interest-disabled);
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

.btn-type-survey {
  flex-shrink: 0;
  padding: 6px 14px;
  border: 1px solid #c7d2fe;
  border-radius: 999px;
  background-color: #eef1ff;
  color: #4338ca;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}

/* 자산가유형 진단 팝업 */
.type-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: rem(20);
  padding-left: calc(260px + #{rem(20)});
  background-color: rgba(15, 23, 42, 0.45);

  @media (max-width: 1280px) {
    padding-left: rem(20);
  }
}
.type-modal {
  width: 100%;
  max-width: 640px;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 16px;
  background-color: #fff;
  padding: rem(24);
}
.type-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: rem(16);
}
.type-modal-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}
.type-modal-close {
  border: none;
  background: none;
  padding: 4px;
  color: #62748e;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}

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
  white-space: normal;
  word-break: keep-all;
  line-height: 1.5;
}
.asset-survey-option-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.asset-survey-pill {
  display: flex;
  align-items: center;
  padding: 9px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background-color: #fff;
  color: #62748e;
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s, color 0.15s;

  span {
    width: 100%;
    white-space: normal;
    word-break: keep-all;
    line-height: 1.5;
  }

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
.asset-survey-recommend {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed #86efac;
}
.asset-survey-recommend-tit {
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #15803d;
}
.asset-survey-recommend-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  span {
    padding: 6px 10px;
    border-radius: 7px;
    background-color: #eef2ff;
    color: #314158;
    font-size: 13px;
  }
}
</style>
