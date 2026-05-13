<script>
import RightView from '@/components/RightView.vue'
import Audio from '@/components/Audio.vue'
import Link from '@/components/Link.vue'
import RecommendSection from '@/components/RecommendSection.vue'
import HlsAudio from '@/components/HlsAudio.vue'

export default {
  name: 'podcast',
  components: { RightView, Audio, Link, RecommendSection, HlsAudio },

  data() {
    return {
      list: [],
      ranklist: [],
      selectedTab: '전체',
    }
  },
  computed: {
    tabs() {
      const allTags = this.list.flatMap((item) => item.tags)
      return ['전체', ...new Set(allTags)]
    },
    filteredList() {
      if (this.selectedTab === '전체') {
        return this.list
      }
      return this.list.filter((item) => item.tags.includes(this.selectedTab))
    },
  },
  created() {},
  mounted() {
    this.fetchList()
    this.fetchRankList()
  },

  beforeDestroy() {},

  methods: {
    // 리스트 호출
    async fetchList() {
      const { infos, succ } = await this.$axios.post('/contents/list', {
        ext_type: 'audios',
      })
      if (succ) {
        this.list = infos
      }
    },

    // 리스트 호출
    async fetchRankList() {
      const { items, succ } = await this.$axios.post('/contents/rank/score', {
        ext_type: 'audios',
        limit: 2,
      })
      if (succ) {
        this.ranklist = items
      }
    },

    setTab(tab) {
      this.selectedTab = tab
    },
  },
}
</script>
<template>
  <div class="contents">
    <div class="cont-main">
      <div class="cont-refer scroll-y">
        <RecommendSection
          v-if="ranklist.length > 0"
          type="audio"
          :items="ranklist"
        />
        <section v-if="filteredList.length > 0">
          <div class="refer-list">
            <div class="tit-group">
              <h3>상황별 골라보기</h3>
              <div class="tab-st2">
                <button
                  v-for="tab in tabs"
                  :key="tab"
                  :class="{ active: selectedTab === tab }"
                  @click="setTab(tab)"
                >
                  {{ tab }}
                </button>
              </div>
            </div>
            <ul>
              <li v-for="(item, idx) in filteredList" :key="idx">
                <Audio :audio="item" type="link"></Audio>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
    <!-- <RightView></RightView> -->
  </div>
</template>

<style lang="scss" scoped>
@media (hover: hover) {
}
</style>
