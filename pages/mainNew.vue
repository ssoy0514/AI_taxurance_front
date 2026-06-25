<script>
import Video from '@/components/Video.vue'
import Audio from '@/components/Audio.vue'
import SectionRecommendVideo from '@/components/SectionRecommendVideo.vue'
import SectionRecommendAudio from '@/components/SectionRecommendAudio.vue'
import SectionPopularVideo from '@/components/SectionPopularVideo.vue'
import SectionPopularAudio from '@/components/SectionPopularAudio.vue'
import {
  mianCard,
  scoreVideos,
  scoreAudios,
  rankVideos,
  rankAudios,
} from '@/utils/mockApi'

export default {
  name: 'mainNew',
  components: {
    Video,
    Audio,
    SectionRecommendVideo,
    SectionRecommendAudio,
    SectionPopularVideo,
    SectionPopularAudio,
  },

  data() {
    return {
      cards: [],
      recommVideos: [],
      recommAudios: [],
      popularVideos: [],
      popularAudios: [],
    }
  },

  mounted() {
    const TAG_THEME = {
      '이번 달 신상품': 'product',
      '이번 달 핫이슈': 'product',
      '상품·보장': 'product',
      '상품 소개': 'product',
      '질병 통계 LIVE': 'live',
      서비스: 'service',
      사랑On: 'sales',
      프팡맨: 'sales',
      AI서치: 'ai',
      '오늘의 화법': 'speech',
      '동구 시리즈': 'story',
      '힐링 타임': 'story',
      안심주파수: 'story',
      '니즈 환기': 'needs',
    }
    this.cards = mianCard().map((card) => ({
      ...card,
      theme: TAG_THEME[card.top_tag] || 'default',
    }))
    this.recommVideos = scoreVideos()
    this.recommAudios = scoreAudios()
    this.popularVideos = rankVideos()
    this.popularAudios = rankAudios()
  },

  methods: {
    viewVideo(item) {
      this.$router.push({
        name: 'play',
        query: { type: 'videos', tab: item.tags[0], id: item.object_id },
      })
    },
    viewAudio(item) {
      this.$router.push({
        name: 'play',
        query: { type: 'audios', tab: item.tags[0], id: item.object_id },
      })
    },
    goToLink(linkType) {
      this.$router.push(
        linkType === 'compass' ? '/sales/product-info' : '/sales/design-bible'
      )
    },
  },
}
</script>

<template>
  <div class="contents">
    <div class="cont-main">
      <div class="cont-recommend scroll-y">
        <!-- 퀵메뉴 -->
        <section class="section-quickmenu">
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
        </section>

        <!-- 메인카드리스트 -->
        <section v-if="cards.length > 0" class="section-cards">
          <div class="card-list">
            <div
              v-for="(card, index) in cards"
              :key="index"
              :class="['card-item', 'theme-' + (card.theme || 'default')]"
            >
              <div class="card-header">
                <span class="card-tag">{{ card.top_tag }}</span>
                <p class="card-tit">
                  {{ card.top_text }}
                  <em>{{ card.bottom_text }}</em>
                </p>
                <p v-if="card.desc" class="card-desc">{{ card.desc }}</p>
              </div>

              <div
                v-if="card.videos && card.videos.length > 0"
                class="card-media-group"
              >
                <p class="card-media-label">
                  <i class="icon-m icon-play"></i>숏츠
                </p>
                <div class="card-media-list">
                  <Video
                    v-for="(v, vi) in card.videos"
                    :key="'v' + vi"
                    :video="v"
                    type="link"
                  />
                </div>
              </div>

              <div
                v-if="card.audios && card.audios.length > 0"
                class="card-media-group"
              >
                <p class="card-media-label">
                  <i class="icon-m icon-play"></i>팟캐스트
                </p>
                <div class="card-media-list">
                  <Audio
                    v-for="(a, ai) in card.audios"
                    :key="'a' + ai"
                    :audio="a"
                    type="link"
                  />
                </div>
              </div>

              <div
                v-if="card.links && card.links.length > 0"
                class="card-link-group"
              >
                <button
                  v-for="(link, li) in card.links"
                  :key="'l' + li"
                  class="card-link-btn"
                  @click="goToLink(link.link_type)"
                >
                  {{ link.name }}
                  <i class="icon-m icon-arrow-link"></i>
                </button>
              </div>
            </div>
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

        <!-- 인기숏츠 -->
        <section v-if="popularVideos.length > 0" class="section-block">
          <div class="section-header">
            <h3>인기숏츠</h3>
            <span class="section-badge section-badge--popular">HOT</span>
          </div>
          <SectionPopularVideo :items="popularVideos" />
        </section>

        <!-- 인기팟캐스트 -->
        <section v-if="popularAudios.length > 0" class="section-block">
          <div class="section-header">
            <h3>인기팟캐스트</h3>
            <span class="section-badge section-badge--popular">HOT</span>
          </div>
          <SectionPopularAudio :items="popularAudios" />
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
    margin-top: rem(36);
  }

  @media (max-width: 1440px) {
    max-width: 900px;
  }
  @media (max-width: 768px) {
    max-width: 100%;
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

// ── 카드 아이템 기본 구조 ──────────────────
.card-item {
  display: flex;
  flex-direction: column;
  gap: rem(20);
  padding: rem(28) rem(30);
  border-radius: rem(20);
  position: relative;
  overflow: hidden;
  background: #f9fafb;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04);
}

.card-header {
  display: flex;
  flex-direction: column;
  gap: rem(10);
  position: relative;
  z-index: 1;

  .card-tag {
    display: inline-block;
    padding: rem(5) rem(12);
    border-radius: rem(20);
    font-size: rem(20);
    font-weight: 600;
    align-self: flex-start;
  }

  .card-tit {
    font-size: rem(32);
    font-weight: 800;
    color: #101828;
    line-height: 1.3;

    em {
      display: block;
      font-style: normal;
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }
  }

  .card-desc {
    font-size: rem(20);
    color: #667085;
  }
}

.card-media-group {
  display: flex;
  flex-direction: column;
  gap: rem(8);
  position: relative;
  z-index: 1;
}

.card-media-label {
  display: flex;
  align-items: center;
  gap: rem(6);
  font-size: rem(20);
  font-weight: 600;
  color: #344054;
  i:before {
    background: #344054;
  }
}

.card-media-list {
  display: flex;
  flex-direction: column;
  gap: rem(8);
}

.card-link-group {
  display: flex;
  flex-wrap: wrap;
  gap: rem(10);
  position: relative;
  z-index: 1;
}

.card-link-btn {
  display: inline-flex;
  align-items: center;
  gap: rem(6);
  padding: rem(10) rem(20);
  border-radius: rem(12);
  font-size: rem(20);
  font-weight: 600;
  transition: opacity 0.2s;
  color: #fff;

  &:hover {
    opacity: 0.85;
  }

  i:before {
    background: #fff;
  }
}

// ── 테마별 스타일 ──────────────────────────
// background-image 사용: background 단축 속성은 background-clip을 초기화하므로
// .card-tit em의 gradient text가 깨지지 않도록 별도로 지정

// product: 상품·보장, 이번 달 신상품, 핫이슈
.card-item.theme-product {
  background: linear-gradient(135deg, #f0f7ff, #f8fbff);
  .card-tag {
    background: #dbeafe;
    color: #1d4ed8;
  }
  .card-tit em {
    background-image: linear-gradient(90deg, #1d4ed8, #60a5fa);
  }
  .card-link-btn {
    background: #2563eb;
  }
}

// live: 질병 통계 LIVE
.card-item.theme-live {
  background: linear-gradient(135deg, #fff0f0, #fff7f7);
  .card-tag {
    background: #fee2e2;
    color: #b91c1c;
  }
  .card-tit em {
    background-image: linear-gradient(90deg, #dc2626, #f87171);
  }
  .card-link-btn {
    background: #ef4444;
  }
}

// service: 서비스
.card-item.theme-service {
  background: linear-gradient(135deg, #f0fdf8, #f7fffe);
  .card-tag {
    background: #ccfbf1;
    color: #0f766e;
  }
  .card-tit em {
    background-image: linear-gradient(90deg, #0d9488, #34d399);
  }
  .card-link-btn {
    background: #0f766e;
  }
}

// sales: 사랑On, 프팡맨
.card-item.theme-sales {
  background: linear-gradient(135deg, #fff0f9, #fdf8ff);
  .card-tag {
    background: #fce7f3;
    color: #be185d;
  }
  .card-tit em {
    background-image: linear-gradient(90deg, #db2777, #f472b6);
  }
  .card-link-btn {
    background: #db2777;
  }
}

// ai: AI서치
.card-item.theme-ai {
  background: linear-gradient(135deg, #f6f3ff, #faf8ff);
  .card-tag {
    background: #ede9fe;
    color: #6d28d9;
  }
  .card-tit em {
    background-image: linear-gradient(90deg, #7c3aed, #a78bfa);
  }
  .card-link-btn {
    background: #7c3aed;
  }
}

// speech: 오늘의 화법
.card-item.theme-speech {
  background: linear-gradient(135deg, #fff7ed, #fffaf5);
  .card-tag {
    background: #ffedd5;
    color: #c2410c;
  }
  .card-tit em {
    background-image: linear-gradient(90deg, #ea580c, #fb923c);
  }
  .card-link-btn {
    background: #ea580c;
  }
}

// story: 동구 시리즈, 힐링 타임, 안심주파수
.card-item.theme-story {
  background: linear-gradient(135deg, #f0fdf4, #f7fff9);
  .card-tag {
    background: #dcfce7;
    color: #15803d;
  }
  .card-tit em {
    background-image: linear-gradient(90deg, #16a34a, #4ade80);
  }
  .card-link-btn {
    background: #16a34a;
  }
}

// needs: 니즈 환기
.card-item.theme-needs {
  background: linear-gradient(135deg, #fefce8, #fffef5);
  .card-tag {
    background: #fef9c3;
    color: #b45309;
  }
  .card-tit em {
    background-image: linear-gradient(90deg, #d97706, #fbbf24);
  }
  .card-link-btn {
    background: #d97706;
  }
}

// default: 보라톤
.card-item.theme-default {
  background: linear-gradient(135deg, #f5f3ff, #fdf4ff);
  .card-tag {
    background: #e9d5ff;
    color: #7e22ce;
  }
  .card-tit em {
    background-image: linear-gradient(90deg, #9333ea, #c084fc);
  }
  .card-link-btn {
    background: #9333ea;
  }
}
</style>
