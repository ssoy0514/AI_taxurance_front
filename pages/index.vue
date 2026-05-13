<script>
import RecommendSection from '@/components/RecommendSection.vue'
import RightView from '@/components/RightView.vue'
import Link from '@/components/Link.vue'

export default {
  name: 'home',
  components: { RecommendSection, RightView, Link },

  data() {
    return {
      cards: [],
    }
  },
  computed: {},
  beforeRouteLeave(to, from, next) {
    const cont = document.querySelector('.cont-recommend')
    if (cont) {
      window.__MAIN_SCROLL_POS__ = cont.scrollTop
    }
    next()
  },
  mounted() {
    this.fetchCards()
  },

  methods: {
    async fetchCards() {
      const { cards, succ } = await this.$axios.get('/contents/card')
      if (succ) {
        this.cards = cards
      }
      this.restoreScroll()
    },
    restoreScroll() {
      this.$nextTick(() => {
        const cont = document.querySelector('.cont-recommend')
        const savedY = window.__MAIN_SCROLL_POS__

        if (cont && savedY) {
          cont.scrollTo(0, parseInt(savedY))
        }
      })
    },
  },
}
</script>

<template>
  <div class="contents">
    <div class="cont-main">
      <div class="cont-recommend scroll-y">
        <RecommendSection type="card" :items="cards" />
      </div>
      <div class="txt-impor">
        ※ 본 시스템에서 제공되는 콘텐츠는 AI를 기반으로 생성, 제작되었으니
        자세한 내용은 관련 지침과 자료를 확인하시기 바라며, 교육용 자료로
        고객에게 제시/교부하거나 온라인 게시·전송할 수 없습니다.
      </div>
    </div>
    <!-- <RightView></RightView> -->
  </div>
</template>

<style lang="scss" scoped>
.cont-recommend {
  padding: rem(40) 0 rem(30);
}
.txt-impor {
  padding: rem(15) rem(30);
}
</style>
