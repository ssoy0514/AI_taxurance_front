<script>
import { renderMarkdown } from '@/utils/markdown'
import RightView from '@/components/RightView.vue'
import Images from '@/components/Images.vue'
import Video from '@/components/Video.vue'
import Link from '@/components/Link.vue'
import StepDots from '@/components/StepDots.vue'

export default {
  name: 'DesignBible',
  components: { RightView, Images, Video, Link, StepDots },

  data() {
    return {
      text: this.$route.params.text || '',
      // 옵션 데이터
      genderOptions: ['여성', '남성'],
      ageOptions: ['~20대', '30대', '40대', '50대', '60대+'],
      coverageOptions: [
        { id: 1, name: '암', icon: 'icon-cancer' },
        { id: 2, name: '항암치료', icon: 'icon-capsules' },
        { id: 3, name: '뇌', icon: 'icon-brain' },
        { id: 4, name: '심장', icon: 'icon-heartbeat' },
        { id: 5, name: '수술', icon: 'icon-procedures' },
        { id: 6, name: '입원', icon: 'icon-hospital' },
        { id: 7, name: '간병', icon: 'icon-hands-helping' },
        { id: 8, name: '사망', icon: 'icon-dove' },
      ],
      considerOptions: [
        '기계약 없음',
        '가족력 있음',
        '흡연',
        '비만',
        '고혈압',
        '당뇨',
      ],
      transOptions: ['영어', '중국어', '태국어', '베트남어', '러시아어'],
      filters: {
        sex: '여성',
        age: '~20대',
        converage_keywords: [],
        considerations: [],
        requirement: '',
        prev_speech: '',
      },
      resultFilters: {},
      messages: [], // { role: 'user' | 'speech', content: string }
      salesPoint: [],
      salesImg: [],
      salesVideo: [],
      relatedData: [],
      submitType: '', // first, sec, re
      isTyping: false,
      isFilters: false,
      showRelatedData: false,
      // 페이크 스텝
      currentStep: 0,
      totalStep: 4,
      stepTexts: [
        'AI가 선택된 정보를 확인하고 있습니다.',
        'AI가 보장항목을 분석하고 있습니다.',
        'AI가 맞춤 화법을 생성하고 있습니다.',
        '완성도를 높이기 위해 최종 검토중입니다.',
      ],
      STEP_MS: 3000, // 12초 / 4 스텝
      ticker: null, // interval id
    }
  },
  computed: {
    currentMode() {
      return this.$route.query.mode || 'list'
    },
    // 배열 길이만을 감시하기 위한 헬퍼
    msgCount() {
      return this.messages.length
    },
    // 폼 유효성 검사 (성별, 연령대 선택 여부 및 보장항목 1개 이상)
    isFormValid() {
      const { sex, age, converage_keywords } = this.filters
      return (
        sex &&
        age &&
        converage_keywords.length >= 1 &&
        converage_keywords.length <= 2
      )
    },
    // 결과가 존재하는지 확인
    hasResult() {
      return Object.keys(this.resultFilters).length > 0
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
    // 새 메시지가 추가될 때 부드럽게 스크롤
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
    renderMarkdown, // 그대로 사용

    // 관련자료 호출
    async fetchContents() {
      const { items, succ } = await this.$axios.post('/coverage/contents', {
        converage_keywords: this.filters.converage_keywords,
      })
      if (succ) {
        this.toggleRelatedDataMapping(true, items)
        this.relatedData = items
      }
    },

    // 세일즈 포인트 호출
    async fetchAllPoint() {
      try {
        const [resSales, resSpeech] = await Promise.all([
          this.$axios.post('/coverage/sales/point', {
            converage_keywords: this.filters.converage_keywords,
          }),
          this.$axios.post('/coverage/speech/point', {
            converage_keywords: this.filters.converage_keywords,
          }),
        ])
        let combinedPoint = []
        if (resSales.succ) combinedPoint.push(...resSales.points)
        if (resSpeech.succ) combinedPoint.push(...resSpeech.points)

        this.salesPoint = [...resSales.points]

        this.salesImg = new Set(
          combinedPoint
            .filter((item) => item.이미지)
            .map((item) => item.이미지.toLowerCase())
        )
        this.salesVideo = new Set(
          combinedPoint.filter((item) => item.쇼츠).map((item) => item.쇼츠)
        )
      } catch (error) {
        console.error(error)
      }
    },

    // 스트리밍 시작
    async startStreaming() {
      this.isTyping = true
      this.startFake()

      // 빈 assistant 메시지 추가
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

      await this.$stream.fetchStream('/coverage/guide/make', params, {
        onChunk: (chunk) => {
          const last = this.messages[this.messages.length - 1]
          this.$set(last, 'content', (last.content || '') + chunk)

          this.$nextTick(() => this.scrollToBottom(false))
        },
        onFinished: () => {
          const last = this.messages[this.messages.length - 1]
          this.$set(last, 'readyTrans', true)

          this.$nextTick(() => this.scrollToBottom(false))

          this.isTyping = false
          // if (this.submitType === 'first') this.fetchContents()

          this.clearTicker()
        },
      })
    },

    // 번역 시작
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

    // 스크리밍 중지
    stopStreaming() {
      this.$stream.stop()
    },

    // 보장 최대 2개까지만 체크 가능하도록 제어
    isMaxSelected(value) {
      return (
        this.filters.converage_keywords.length >= 2 &&
        !this.filters.converage_keywords.includes(value)
      )
    },

    // 맞춤 화법 생성하기 버튼 클릭(최초조회)
    submitFilter() {
      if (this.isFormValid) {
        // 데이터 초기화
        this.messages = []
        this.salesPoint = []
        this.salesImg = []
        this.salesVideo = []

        this.relatedData = []
        // info 제공을 위해서 결과 필터 업데이트
        this.resultFilters = {
          ...this.filters,
          converage_keywords: [...this.filters.converage_keywords],
        }
        this.submitType = 'first'
        this.fetchContents()
        // this.fetchAllPoint()
        this.startStreaming()

        this.handleChangeView('view')
      } else {
        alert('필수 항목을 확인해주세요.')
      }
    },

    // 엔터로 전송(Shift+Enter는 줄바꿈)
    handleKeyDown(e) {
      if (this.text.trim().length < 1) return
      if (e.key === 'Enter' && e.shiftKey) return
      if (e.key === 'Enter') {
        e.preventDefault()
        this.handleClickSend()
      }
    },

    // 전송버튼 클릭(재조회)
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

    // 같은 필터로 다시 조회
    handleReFilter() {
      this.submitType = 're'
      this.startStreaming()
    },

    // 스크롤 이동 이벤트
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

    // 페이지 이동
    movePage() {
      this.$router.push({
        path: '/sales/product-info',
        query: { text: this.resultFilters.converage_keywords.join(', ') },
      })
    },

    // 관련자료 매핑
    toggleRelatedDataMapping(show, item) {
      if (show) {
        this.$store.dispatch('relatedItems/saveItems', item)
      } else {
        this.$store.dispatch('relatedItems/clear')
      }
    },

    // view mode 전환
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
              <strong>명인들의 화법</strong>을 제공해드려요!
            </p>
          </div>
        </section>
        <div class="filter-section">
          <section class="filter-list scroll-y">
            <ul class="filter-main">
              <li>
                <p class="tit">
                  고객 정보 <span class="txt-required">(필수)</span>
                </p>
                <div class="wrap-label rd-st1">
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
                <div class="wrap-label rd-st1 full">
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
              </li>
              <li class="full">
                <p class="tit">
                  관심 보장
                  <span class="txt-add">(최대 2개)</span>
                  <span class="txt-required">(필수)</span>
                </p>
                <div class="wrap-label chk-st2">
                  <label v-for="item in coverageOptions" :key="item.id">
                    <input
                      type="checkbox"
                      :value="item.name"
                      v-model="filters.converage_keywords"
                      :disabled="isMaxSelected(item.name)"
                    />
                    <p>
                      <i class="icon-m" :class="item.icon"></i>
                      {{ item.name }}
                    </p>
                  </label>
                </div>
                <!-- <p
                  v-if="filters.converage_keywords.length === 0"
                  class="txt-warning"
                >
                  최소 1개 이상 선택해주세요.
                </p> -->
              </li>
              <li class="full">
                <p class="tit">
                  고객 특이사항
                  <span class="txt-no-required">(선택)</span>
                </p>
                <div class="wrap-label chk-st3">
                  <label v-for="item in considerOptions">
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
                <input
                  type="text"
                  v-model="filters.requirement"
                  placeholder="추가 요청사항을 알려주세요 (예: 자녀 2명 있음)"
                  class="text-input"
                />
              </li>
            </ul>
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
      </div>
      <div class="main-result" v-if="currentMode === 'view'">
        <div class="main-result-inner">
          <!-- 고정해더 -->
          <div class="filter-top">
            <button class="btn" @click="handleChangeView('list')">
              <i class="icon-mm icon-home"></i>
            </button>
            <div class="wrap-select">
              <div class="select-name" @click="isFilters = !isFilters">
                <div class="wrap-label">
                  <p>{{ filters?.sex }}</p>
                  <p>{{ filters?.age }}</p>
                  <p v-if="filters?.converage_keywords.length > 0">
                    <label
                      v-for="(item, idx) in filters?.converage_keywords"
                      :key="idx"
                      >{{ item }}
                    </label>
                  </p>
                  <!-- <i class="icon-s icon-arrow-down"></i> -->
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
                    <label
                      v-for="(item, idx) in resultFilters.converage_keywords"
                      :key="idx"
                      >{{ item }},
                    </label>
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
                    <!-- <button class="btn-m btn-gray" @click="handleSaveSpeech">
                      <i class="icon-s icon-heart"></i>저장
                    </button> -->
                  </div>

                  <div class="speech-body">
                    <!-- <div class="typing-dots" v-if="!msg.content">
                      <span></span><span></span><span></span>
                      <p>생각 중...</p>
                    </div> -->

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
                          class="btn-s btn-gray"
                          @click="startTransStreaming(trans, msg)"
                        >
                          {{ trans }}
                        </button>
                      </div>
                    </div>
                    <div class="trans-body" v-if="msg.isTrans">
                      <!-- <div class="typing-dots" v-if="!msg.transText">
                        <span></span><span></span><span></span>
                        <p>번역 중...</p>
                      </div> -->
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
            <button
              class="btn-send"
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
</template>

<style lang="scss" scoped>
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
.chk-st3 {
  @include flexbox(flex-start, center);
  flex-wrap: wrap;
  gap: 4px;
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
