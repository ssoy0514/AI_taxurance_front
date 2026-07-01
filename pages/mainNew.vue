<script>
import MainCardItem from '@/components/MainCardItem.vue'
import SectionRecommendVideo from '@/components/SectionRecommendVideo.vue'
import SectionRecommendAudio from '@/components/SectionRecommendAudio.vue'
import SectionPopularTop3 from '@/components/SectionPopularTop3.vue'
import { scoreVideos, scoreAudios, rankVideos, rankAudios } from '@/utils/mockApi'

// time_type: '0'=중요(항상 노출) '1'=오전(06~09) '2'=낮(10~13) '3'=오후(14~18) '4'=밤(19~05)
const TIME_TYPE_LABEL = { 1: '오전', 2: '낮', 3: '오후', 4: '밤' }

export default {
  name: 'mainNew',
  components: {
    MainCardItem,
    SectionRecommendVideo,
    SectionRecommendAudio,
    SectionPopularTop3,
  },

  data() {
    return {
      importantCards: [],
      currentTimeCards: [],
      currentPhrase: '',
      otherTimeGroups: [],
      topmostEvents: [],
      topEvents: [],
      recommVideos: [],
      recommAudios: [],
      top3Items: [],
    }
  },

  async mounted() {
    await Promise.all([this.loadMainCards(), this.loadEvents()])
    this.recommVideos = scoreVideos()
    this.recommAudios = scoreAudios()

    const videos = rankVideos().map((v) => ({ ...v, contentType: 'videos' }))
    const audios = rankAudios().map((a) => ({ ...a, contentType: 'audios' }))
    this.top3Items = [...videos, ...audios]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 3)
  },

  methods: {
    getCurrentTimeType() {
      const hour = new Date().getHours()
      if (hour >= 6 && hour < 10) return '1'
      if (hour >= 10 && hour < 14) return '2'
      if (hour >= 14 && hour < 19) return '3'
      return '4'
    },
    pickRandomPhrase(phrases, timeType) {
      const list = phrases.filter((p) => p.time_type === timeType && p.enabled)
      if (list.length === 0) return ''
      return list[Math.floor(Math.random() * list.length)].text
    },
    normalizeCard(card) {
      return {
        ...card,
        videos: (card.videos || []).map((v) => v.content_info).filter(Boolean),
        audios: (card.audios || []).map((a) => a.content_info).filter(Boolean),
      }
    },
    async loadMainCards() {
      const [cardRes, phraseRes] = await Promise.all([
        this.$axios.get('/maincards'),
        this.$axios.get('/phrases'),
      ])
      const cards = (cardRes.items || [])
        .filter((c) => c.enabled)
        .map(this.normalizeCard)
      const phrases = phraseRes.items || []
      const timeType = this.getCurrentTimeType()

      this.importantCards = cards
        .filter((c) => c.time_type === '0')
        .sort((a, b) => a.sort_order - b.sort_order)
      this.currentTimeCards = cards
        .filter((c) => c.time_type === timeType)
        .sort((a, b) => a.sort_order - b.sort_order)
      this.currentPhrase = this.pickRandomPhrase(phrases, timeType)

      this.otherTimeGroups = ['1', '2', '3', '4']
        .filter((t) => t !== timeType)
        .map((t) => ({
          timeType: t,
          label: TIME_TYPE_LABEL[t],
          phrase: this.pickRandomPhrase(phrases, t),
          cards: cards
            .filter((c) => c.time_type === t)
            .sort((a, b) => a.sort_order - b.sort_order),
        }))
        .filter((g) => g.cards.length > 0)
    },
    isEventActive(event) {
      const now = new Date()
      if (event.start_at && new Date(event.start_at) > now) return false
      if (event.end_at && new Date(event.end_at) < now) return false
      return true
    },
    async loadEvents() {
      const res = await this.$axios.get('/events')
      const events = (res.items || [])
        .filter((e) => e.enabled && this.isEventActive(e))
        .sort((a, b) => a.sort_order - b.sort_order)

      this.topmostEvents = events.filter((e) => e.position === 'topmost')
      this.topEvents = events.filter((e) => e.position === 'top')
    },
  },
}
</script>

<template>
  <div class="contents">
    <div class="cont-main">
      <div class="cont-recommend scroll-y">
        <!-- 시간대별 인사 문구 -->
        <section v-if="currentPhrase" class="section-phrase">
          <h2>{{ currentPhrase }}</h2>
        </section>

        <!-- 퀵메뉴 -->
        <!-- <section class="section-quickmenu">
          <div class="quickmenu-grid">
            <nuxt-link to="/sales/product-info" class="qm-btn">
              <i class="icon-m icon-prd-info"></i>
              <span>상품나침반</span>
            </nuxt-link>
            <nuxt-link to="/sales/design-bible" class="qm-btn">
              <i class="icon-m icon-bible"></i>
              <span>보장설계 바이블</span>
            </nuxt-link>
            <nuxt-link to="/sales/under" class="qm-btn">
              <i class="icon-m icon-under"></i>
              <span>간편 언더라이팅</span>
            </nuxt-link>
            <nuxt-link to="/sales/terms" class="qm-btn">
              <i class="icon-m icon-terms"></i>
              <span>약관조회</span>
            </nuxt-link>
          </div>
        </section> -->

        <!-- 이벤트 (최상단: 메인카드 중요보다 위) -->
        <section v-if="topmostEvents.length > 0" class="section-cards">
          <div class="card-list">
            <MainCardItem
              v-for="event in topmostEvents"
              :key="'topmost-' + event.id"
              :card="event"
            />
          </div>
        </section>

        <!-- 메인카드 - 중요 -->
        <section v-if="importantCards.length > 0" class="section-cards">
          <div class="card-list">
            <MainCardItem
              v-for="card in importantCards"
              :key="card.id"
              :card="card"
            />
          </div>
        </section>

        <!-- 이벤트 (상단: 메인카드 중요보다 아래) -->
        <section v-if="topEvents.length > 0" class="section-cards">
          <div class="card-list">
            <MainCardItem
              v-for="event in topEvents"
              :key="'top-' + event.id"
              :card="event"
            />
          </div>
        </section>

        <!-- 메인카드 - 현재 시간대 -->
        <section v-if="currentTimeCards.length > 0" class="section-cards">
          <div class="card-list">
            <MainCardItem
              v-for="card in currentTimeCards"
              :key="card.id"
              :card="card"
            />
          </div>
        </section>

        <!-- 추천숏츠 -->
        <section v-if="recommVideos.length > 0" class="section-block">
          <div class="section-header">
            <h3>지금 뜨는 숏츠</h3>
          </div>
          <SectionRecommendVideo :items="recommVideos" />
        </section>

        <!-- 추천팟캐스트 -->
        <section v-if="recommAudios.length > 0" class="section-block">
          <div class="section-header">
            <h3>지금 바로 들어봐요</h3>
          </div>
          <SectionRecommendAudio :items="recommAudios" />
        </section>

        <!-- 인기 TOP3 -->
        <section v-if="top3Items.length > 0" class="section-block">
          <div class="section-header">
            <h3>인기 TOP3</h3>
            <span class="section-badge section-badge--popular">HOT</span>
          </div>
          <SectionPopularTop3 :items="top3Items" />
        </section>

        <!-- 다른 시간대 콘텐츠 -->
        <section
          v-for="group in otherTimeGroups"
          :key="group.timeType"
          class="section-cards"
        >
          <!-- <div class="section-header">
            <h3>{{ group.phrase || group.label + ' 추천 콘텐츠' }}</h3>
          </div> -->
          <div class="card-list">
            <MainCardItem
              v-for="card in group.cards"
              :key="card.id"
              :card="card"
            />
          </div>
        </section>
      </div>
      <div class="txt-impor">
        ※ 본 시스템에서 제공되는 콘텐츠는 AI를 기반으로 생성, 제작되었으니
        자세한 내용은 관련 지침과 자료를 확인하시기 바라며, 교육용 자료로
        고객에게 제시/교부하거나 온라인 게시·전송할 수 없습니다.
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.cont-recommend {
  padding: rem(32) 0 rem(40);
  section {
    max-width: 740px;
  }
}

// 공통 섹션 레이아웃
section {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 rem(30);

  &:not(:first-child) {
    margin-top: rem(30);
  }

  @media (max-width: 1440px) {
    max-width: 900px;
  }
  @media (max-width: 768px) {
    max-width: 100%;
  }
}

// 시간대별 인사 문구
.section-phrase {
  h2 {
    font-size: rem(32);
    font-weight: 800;
    color: #101828;
    line-height: 1.3;
  }
}

// 섹션 헤더
.section-header {
  display: flex;
  align-items: center;
  gap: rem(10);
  margin-bottom: rem(16);

  h3 {
    font-size: rem(28);
    font-weight: 800;
    color: #101828;
  }
}

.section-badge {
  padding: rem(4) rem(10);
  border-radius: rem(20);
  font-size: rem(18);
  font-weight: 700;

  &--video {
    background: linear-gradient(90deg, #ae74ff, #ff7c7e);
    color: #fff;
  }
  &--audio {
    background: linear-gradient(90deg, #6b21a8, #4c1d95);
    color: #fff;
  }
  &--popular {
    background: #ff4d4f;
    color: #fff;
  }
}

// ── 퀵메뉴 ────────────────────────────────
.quickmenu-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: rem(12);

  @media (max-width: 600px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.qm-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: rem(10);
  padding: rem(20) rem(12);
  border-radius: rem(16);
  background: #fff;
  border: 1px solid #e4e7ec;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.2s;
  text-decoration: none;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }

  &.nuxt-link-active {
    background: #f5f3ff;
    border-color: #ddd6fe;
    i:before {
      background: #7c3aed;
    }
    span {
      color: #7c3aed;
    }
  }

  i {
    display: flex;
    align-items: center;
    justify-content: center;
    width: rem(44);
    height: rem(44);
    border-radius: rem(12);
    background: #eaf5ff;
    &:before {
      background: #344054;
    }
  }

  span {
    font-size: rem(19);
    font-weight: 600;
    color: #344054;
    text-align: center;
    line-height: 1.3;
    word-break: keep-all;
  }
}

// ── 메인카드리스트 ──────────────────────────
.card-list {
  display: flex;
  flex-direction: column;
  gap: rem(16);
}
</style>
