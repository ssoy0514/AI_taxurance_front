<script>
import Modal from '@/components/ModalComponent.vue'

export default {
  name: 'CounselingComment',
  components: { Modal },

  props: {
    title: { type: String, default: () => '' },
    comment: { type: Array, default: () => [] },
    productList: { type: Array, default: () => [] },
  },

  data() {
    return {
      selectedTab: '',
      localItems: [],
      isPrdList: false,
    }
  },

  watch: {
    comment: {
      immediate: true,
      handler(newVal) {
        this.initData(newVal)
      },
    },
  },

  computed: {
    currentItem() {
      return this.localItems.find((item) => item.code === this.selectedTab)
    },
  },

  beforeDestroy() {
    this.stopStreaming()
  },

  methods: {
    async fetchComment() {
      const { data, success } = await this.$axios.post('/api/stream/comment', {
        type: '',
      })
      if (success) {
        const results = JSON.parse()
      }
    },
    // 탭 클릭 시
    setTab(code) {
      this.selectedTab = code
    },
    initData(data) {
      this.localItems = data.map((item) => ({
        ...item,
        streamText: '',
        isGenerating: false,
      }))
      if (this.localItems.length > 0 && !this.selectedTab) {
        this.selectedTab = this.localItems[0].code
      }
    },
    handleRegenerate() {
      const target = this.currentItem
      if (!target) return

      target.streamText = ''
      target.isGenerating = true

      this.startStreaming()
    },
    handleReset() {
      const target = this.currentItem
      if (!target) return

      target.streamText = ''
      target.isGenerating = false
    },
    handleClickPrd(item) {
      console.log(item)
      this.comment = item.consulting_ments
      this.title = item.name
      this.isPrdList = false
    },
    // 스트리밍 시작
    async startStreaming() {
      const params = {
        product_name: this.title,
        tone: this.selectedTab,
      }

      await this.$stream.fetchStream(
        '/product/compass/consulting/chat/stream',
        params,
        {
          onChunk: (chunk) => {
            const target = this.currentItem

            this.$set(target, 'streamText', target.streamText + chunk)
            this.localItems = [...this.localItems]
          },
          onFinished: () => {},
        }
      )
    },

    // 스크리밍 중지
    stopStreaming() {
      this.$stream.stop()
    },
  },

  mounted() {},
}
</script>

<template>
  <Modal @close-popup="$emit('close-popup')">
    <template #heading>
      <p class="sub-text">상담멘트</p>
      <div class="prd-select" :class="{ on: isPrdList }">
        <div class="title" @click="isPrdList = !isPrdList">
          <p>{{ title }}</p>
          <button>
            <i class="icon-m icon-arrow-down"></i>
          </button>
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
    </template>
    <template #footer>
      <button
        class="btn-gray btn-xl"
        type="button"
        @click="$emit('close-popup')"
      >
        닫기
      </button>
      <button class="btn-main btn-xl" type="button" @click="handleRegenerate">
        다시 생성
      </button>
    </template>
    <div class="wrap-comment">
      <div class="tab-st1">
        <button
          v-for="item in localItems"
          :key="item.code"
          :class="{ active: selectedTab === item.code }"
          @click="setTab(item.code)"
        >
          {{ item.label }}
        </button>
      </div>

      <div class="comment-body scroll-y" v-if="currentItem">
        <template v-if="currentItem.isGenerating" || currentItem.streamText>
          <div class="txt-comment">
            {{ currentItem.streamText || '생성 중...' }}
          </div>
          <button class="btn-reset" @click="handleReset">초기화</button>
        </template>
        <template v-else>
          <div class="txt-comment">
            {{ currentItem.text }}
          </div>
        </template>
      </div>
    </div>
  </Modal>
</template>

<style lang="scss" scoped>
.sub-text {
  color: #2563eb;
  font-weight: 700;
  @media (max-width: 512px) {
    display: none;
  }
}
.prd-select {
  position: relative;
  min-width: 200px;
  margin: 1px;
  .title {
    @include flexbox(flex-start, center);
    gap: rem(8);
    padding: rem(10) rem(15);
    color: #000;
    cursor: pointer;
    i:before {
      background: #000;
    }
  }
  .select-list {
    position: absolute;
    width: 100%;
    padding-bottom: 10px;
    border-radius: 0 0 10px 10px;
    border: 1px solid #dddddd;
    border-top: none;
    background-color: #fff;
    z-index: 1;
    li {
      padding: rem(6) rem(15);
      font-size: 14px;
      color: #444;
      cursor: pointer;
      &:hover {
        background-color: rgba(0, 0, 0, 0.05);
      }
    }
  }
  &.on {
    margin: 0;
    background-color: #fff;
    .title {
      border: 1px solid #dddddd;
      border-bottom: none;
      border-radius: 10px 10px 0 0;
      button {
        i {
          transform: rotate(180deg);
        }
      }
    }
  }
}
.wrap-comment {
  width: 100%;
}
.comment-body {
  @include flexbox(space-between, flex-start);
  flex-direction: column;
  gap: 20px;
  margin-top: 20px;
  min-height: 400px;
  padding: 13px 18px;
  border-radius: 20px;
  background-color: #eff6ff;
  .txt-comment {
    font-size: 16px;
    white-space: pre-line;
  }
  .btn-reset {
    height: 38px;
    padding: 0 16px;
    border-radius: 38px;
    border: 1px solid #e2e8f0;
    background-color: #fff;
  }
}

@media (max-width: 768px) {
}
</style>
