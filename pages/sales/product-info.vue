<script>
import { renderMarkdown } from '@/utils/markdown'
import RightView from '@/components/RightView.vue'
import Audio from '@/components/Audio.vue'
import Link from '@/components/Link.vue'
import Video from '@/components/Video.vue'
import Images from '@/components/Images.vue'
import CounselingComment from '@/components/CounselingComment.vue'
import { PrdList } from '~/utils/mockApi'

export default {
  name: 'ProductInfo',
  components: { RightView, Audio, Link, Video, Images, CounselingComment },
  data() {
    return {
      text: '',
      selectedProduct: null, // 선택된 상품 정보를 저장 (초기값 null)
      selectedPrdType: '전체', // 선택된 상품타입 (기본값 '전체')
      productList: [],

      relatedData: [],
      showComment: false,
      comment: [],
      selectedPrdName: '',
      messages: [], // { role: 'user' | 'assistant', content: string }
      isPrdList: false,
      width: 0,
      isListening: false,
      recognition: null,
    }
  },
  computed: {
    currentMode() {
      return this.$route.query.mode || 'list'
    },
    prdTypes() {
      const allTypes = this.productList.flatMap((item) => item.product_types)
      const allLabel = allTypes.map((type) => type.label)
      return ['전체', ...new Set(allLabel)]
    },
    filteredProducts() {
      if (this.selectedPrdType === '전체') {
        return this.productList
      }
      return this.productList.filter((product) =>
        product.product_types.some(
          (type) => type.label === this.selectedPrdType
        )
      )
    },
    msgCount() {
      return this.messages.length
    },
    maxWidth() {
      if (this.width <= 768) {
        return `${this.width}px`
      }
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
  mounted() {
    this.fetchPrdList()
    this.setWidth()
    window.addEventListener('resize', this.setWidth)
  },
  beforeDestroy() {
    this.stopStreaming()
    this.stopSpeechRecognition()
    this.toggleRelatedDataMapping(false)
    window.removeEventListener('resize', this.setWidth)
  },
  methods: {
    setWidth() {
      this.$nextTick(() => {
        this.width = window.innerWidth
      })
    },
    // 음성 인식 초기화 및 시작/중지 토글
    toggleSpeech() {
      if (this.isListening) {
        this.stopSpeechRecognition()
        return
      }
      this.startSpeechRecognition()
    },
    startSpeechRecognition() {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SpeechRecognition) {
        alert(
          '이 브라우저는 음성 인식을 지원하지 않습니다. 크롬 또는 엣지 브라우저를 사용해 주세요.'
        )
        return
      }

      if (!this.recognition) {
        this.recognition = new SpeechRecognition()
        this.recognition.lang = 'ko-KR'
        this.recognition.continuous = false
        this.recognition.interimResults = false

        this.recognition.onstart = () => {
          this.isListening = true
        }

        this.recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript
          this.text = (this.text + ' ' + transcript).trim()
          this.autoResize()
        }

        this.recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error)
          this.stopSpeechRecognition()
        }

        this.recognition.onend = () => {
          this.isListening = false
        }
      }

      this.recognition.start()
    },
    stopSpeechRecognition() {
      if (this.recognition) {
        this.recognition.stop()
      }
      this.isListening = false
    },
    renderMarkdown, // 그대로 사용

    // 상품 리스트 호출
    async fetchPrdList() {
      this.productList = PrdList()

      // const { products, succ } = await this.$axios.get(
      //   '/product/compass/data/all'
      // )
      // if (succ) {
      //   this.productList = products
      // }
    },

    // 스트리밍 시작
    async startStreaming() {
      // 빈 assistant 메시지 추가
      this.messages.push({ role: 'assistant', content: '' })

      const params = {
        msg: this.text.trim(),
        product: this.selectedProduct.name,
        year: this.selectedProduct.year,
      }

      await this.$stream.fetchStream('/product/compass/chat/stream', params, {
        onChunk: (chunk) => {
          const last = this.messages[this.messages.length - 1]
          this.$set(last, 'content', (last.content || '') + chunk)

          this.$nextTick(() => this.scrollToBottom(false))
        },
      })
    },
    newContent(content) {
      let htmlContent = renderMarkdown(content)
      htmlContent = htmlContent.replace(
        /<table/g,
        '<div class="table-scroll"><table'
      )
      htmlContent = htmlContent.replace(/<\/table>/g, '</table></div>')
      return htmlContent
    },

    // 스크리밍 중지
    stopStreaming() {
      this.$stream.stop()
    },

    // 탭 클릭 시 카테고리 변경
    setPrdType(category) {
      this.selectedPrdType = category
    },

    // 상담멘트 클릭
    showPopup(prd) {
      this.comment = prd.consulting_ments
      this.selectedPrdName = prd.name
      this.showComment = true
    },

    // 상품 클릭
    handleClickPrd(item) {
      this.selectedProduct = item
      this.handleChangeView('view')
      this.messages = []
      this.isPrdList = false

      let related = []
      related.push(...item.images)
      related.push(...item.audios)
      related.push(...item.videos)
      this.relatedData = related

      this.toggleRelatedDataMapping(true, this.relatedData)
    },

    // 관련자료 매핑
    toggleRelatedDataMapping(show, item) {
      if (show) {
        this.$store.dispatch('relatedItems/saveItems', item)
      } else {
        this.$store.dispatch('relatedItems/clear')
      }
    },

    // 가이드 문구 클릭
    handleQuestionGuideClick(q) {
      this.text = q
      this.handleClickSend()
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

    // 전송버튼 클릭
    handleClickSend() {
      if (this.text.trim()) {
        this.messages.push({
          role: 'user',
          content: this.text,
        })
      }
      this.startStreaming()
      this.text = ''
    },

    // 기존 연도 변환 함수
    formatFullYear(yearStr) {
      if (!yearStr) return ''
      const yearNum = parseInt(yearStr.replace('년', ''), 10)
      const prefix = yearNum > 50 ? '19' : '20'
      return prefix + yearStr
    },

    // textarea 자동높이
    autoResize() {
      const el = this.$refs.textareaRef
      if (el && this.text) {
        el.style.height = 'auto'
        el.style.height = el.scrollHeight + 'px'
      }
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

    // view mode 전환
    handleChangeView(view) {
      this.$router.push({
        query: { mode: view },
      })
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
            <p class="sub-title">상품의 모든 것! 상품나침반</p>
          </div>
        </section>
        <section class="filter-tab">
          <div class="tab-st1">
            <button
              v-for="tab in prdTypes"
              :key="tab"
              :class="{ active: selectedPrdType === tab }"
              @click="setPrdType(tab)"
            >
              {{ tab }}
            </button>
          </div>
        </section>
        <section class="filter-list scroll-y">
          <div class="wrap-prd-list">
            <ul class="prd-list" v-if="filteredProducts.length > 0">
              <li
                v-for="(item, index) in filteredProducts"
                :key="index"
                @click="handleClickPrd(item)"
              >
                <div class="prd-cont">
                  <div class="date">
                    <i class="icon-xs icon-time"></i>
                    <p>
                      ‘{{ item.year.replace('년', '') }}. {{ item.month }} 출시
                    </p>
                  </div>
                  <p class="txt-name">{{ item.name }}</p>
                  <p class="txt-sub">{{ item.sub_name }}</p>
                  <p class="txt-core1">핵심보장</p>
                  <p class="txt-core2">{{ item.core_coverage }}</p>
                </div>
                <div class="prd-btn">
                  <button class="btn-sub btn-m" @click.stop="showPopup(item)">
                    상담멘트
                  </button>
                  <button class="btn-main btn-m">
                    <span class="default-text">알아보기</span>
                    <span class="hover-text">질문시작</span>
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </section>
      </div>

      <div class="main-result" v-if="currentMode === 'view'">
        <div class="main-result-inner" :style="{ maxWidth: maxWidth }">
          <!-- 고정해더 -->
          <div class="filter-top">
            <button class="btn" @click="handleChangeView('list')">
              <i class="icon-mm icon-home"></i>
            </button>
            <div class="wrap-select" :class="{ on: isPrdList }">
              <div class="select-name" @click="isPrdList = !isPrdList">
                <div class="wrap-label">
                  <p>
                    {{ selectedProduct?.name }}
                  </p>
                  <i class="icon-s icon-arrow-down"></i>
                </div>
                <span class="add-text">AI 상담 중</span>
              </div>
              <ul class="select-list" v-show="isPrdList">
                <li
                  v-for="(prd, idx) in productList"
                  :key="idx"
                  @click="handleClickPrd(prd)"
                >
                  {{ prd.name }}
                </li>
              </ul>
            </div>
          </div>
          <!-- 대화 -->
          <div class="chat-log scroll-y" ref="chatLogRef">
            <ul
              class="top-info"
              v-if="selectedProduct?.recommend_questions.length > 0"
            >
              <li
                class="question"
                v-for="(q, idx) in selectedProduct.recommend_questions"
                :key="idx"
                @click="handleQuestionGuideClick(q)"
              >
                <i class="icon-s icon-question"></i>
                <span>{{ q }}</span>
              </li>
            </ul>
            <!-- <ul
              class="top-info"
              v-if="selectedProduct.audios && selectedProduct.audios.length > 0"
            >
              <li v-for="(item, idx) in selectedProduct.audios" :key="idx">
                <Audio :audio="item"></Audio>
              </li>
            </ul>
            <ul class="top-info" v-if="selectedProduct.videos.length > 0">
              <li v-for="(item, idx) in selectedProduct.videos" :key="idx">
                <Video :video="item" :type="''"></Video>
              </li>
            </ul>
            <ul
              class="top-info"
              v-if="selectedProduct.images && selectedProduct.images.length > 0"
            >
              <li>
                <Images
                  v-for="(item, idx) in selectedProduct.images"
                  :key="idx"
                  :imgName="item.name"
                ></Images>
              </li>
            </ul> -->
            <div class="chat-log-inner">
              <div
                v-for="(msg, idx) in messages"
                :key="idx"
                :class="['msg', msg.role]"
              >
                <div
                  class="typing-dots"
                  v-show="msg.role === 'assistant' && !msg.content"
                >
                  <span></span><span></span><span></span>
                  <p>생각 중...</p>
                </div>
                <div
                  class="markdown-body"
                  v-html="newContent(msg.content)"
                ></div>
              </div>
            </div>
          </div>

          <div class="recommend">
            <button
              class="btn-related"
              @click.stop="showPopup(selectedProduct)"
            >
              상담멘트
            </button>
          </div>
          <div class="wrap-search">
            <textarea
              v-model="text"
              class="form-control"
              @input="autoResize"
              @keydown="handleKeyDown"
              ref="textareaRef"
              :placeholder="
                isListening
                  ? '듣는 중...'
                  : '선택하신 상품 관련 궁금한 것을 물어보세요'
              "
            ></textarea>

            <div class="wrap-btn">
              <button
                class="btn-mic"
                :class="{ active: isListening }"
                @click="toggleSpeech"
                v-show="!text.trim()"
              >
                <i
                  :class="isListening ? 'icon-s icon-stop' : 'icon-s icon-mic'"
                ></i>
              </button>

              <button
                class="btn-send"
                :class="{ active: text.trim() }"
                @click="handleClickSend"
                :disabled="!text.trim() || isListening"
                v-show="text.trim()"
              >
                <i class="icon-s icon-arrow-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- <RightView></RightView> -->
    <CounselingComment
      v-if="showComment"
      @close-popup="showComment = false"
      :title="selectedPrdName"
      :comment="comment"
      :productList="productList"
    />
  </div>
</template>

<style lang="scss" scoped>
.wrap-prd-list {
  max-width: 900px;
  margin: 0 auto;
}
.prd-list {
  // @include flexbox(flex-start, normal);
  // flex-wrap: wrap;
  // gap: 16px;
  // max-width: 900px;
  // margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 16px;
  li {
    @include flexbox(space-between, normal);
    flex-direction: column;
    overflow: hidden;
    flex: 1;
    min-width: 210px;
    border: 0.6px solid #f1f5f9;
    border-radius: 16px;
    box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.1),
      0px 1px 2px -1px rgba(0, 0, 0, 0.1);
    background-color: #fff;
    cursor: pointer;
    &.active {
      border: 1px solid #2563eb;
      background-color: #2563eb;
      p {
        color: #fff;
      }
      .txt-label {
        background-color: #5182ef;
      }
      .date {
        i::before {
          background-color: #fff;
        }
      }
    }
    .prd-cont {
      @include flexbox(flex-start, flex-start);
      flex-direction: column;
      padding: 15px 20px;
      .date {
        @include flexbox(flex-start, center);
        gap: 6px;
        color: #94a3b8;
        font-size: 13px;
        i::before {
          background-color: #90a1b9;
        }
      }
      .txt-name {
        margin: 6px 0 0;
        color: #0f172b;
        font-size: 17px;
        font-weight: 500;
      }
      .txt-sub {
        margin: 14px 0;
        padding: 12px 15px;
        border: 1px solid #dbeafe;
        border-radius: 10px;
        background-color: #eff6ff;
        color: #4a5565;
        font-size: 14px;
      }
      .txt-core1 {
        color: #000;
        font-size: 13px;
        font-weight: 600;
      }
      .txt-core2 {
        color: #000;
        font-size: 14px;
      }
    }
    .prd-btn {
      @include flexbox(flex-start, flex-start);
      gap: 10px;
      padding: 15px 20px;
      background-color: #f9fafb;
      button {
        flex: 1;
        .hover-text {
          display: none;
        }
      }
    }
  }
}

.top-info {
  @include flexbox(flex-start, flex-start);
  flex-direction: column;
  gap: rem(10);
  li {
    &.question {
      @include flexbox(flex-start, center);
      gap: 8px;
      padding: 8px 13px;
      border: 1px solid #bedbff;
      border-radius: 14px;
      background: #fff;
      color: #45556c;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
    }
    // &:hover {
    //   border-color: #007bff;
    //   color: #007bff;
    // }
  }
  + .top-info {
    margin-top: rem(10);
  }
}

@media (hover: hover) {
  .prd-list {
    li {
      .btn-sub {
        &:hover {
          background-color: #e5e7eb;
        }
      }
      &:hover {
        border-color: #475dee;
        .prd-btn {
          .btn-main {
            background-color: #1a34df;
            .default-text {
              display: none;
            }
            .hover-text {
              display: inline;
            }
          }
        }
      }
    }
  }
}
</style>
