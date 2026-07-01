<script>
import Video from '@/components/Video.vue'
import Audio from '@/components/Audio.vue'

// theme_id가 없거나 매칭되는 테마가 없을 때 사용하는 기본(보라톤) 색상
const DEFAULT_THEME = {
  bg_color_from: '#f5f3ff',
  bg_color_to: '#fdf4ff',
  title1_color_from: '#101828',
  title1_color_to: '#101828',
  title2_color_from: '#9333ea',
  title2_color_to: '#c084fc',
  desc_color: '#667085',
  tag_bg: '#e9d5ff',
  tag_text: '#7e22ce',
  bg_image_url: null,
}

export default {
  name: 'MainCardItem',
  components: { Video, Audio },
  props: {
    card: { type: Object, required: true },
  },
  data() {
    return {
      imgUrl: process.env.imgUrl,
    }
  },
  computed: {
    theme() {
      return { ...DEFAULT_THEME, ...(this.card.theme || {}) }
    },
    cardStyle() {
      return {
        background: `linear-gradient(135deg, ${this.theme.bg_color_from}, ${this.theme.bg_color_to})`,
      }
    },
    bgImageUrl() {
      return this.resolveImageUrl(this.theme.bg_image_url)
    },
    tagStyle() {
      return { background: this.theme.tag_bg, color: this.theme.tag_text }
    },
    title1Style() {
      return this.gradientTextStyle(
        this.theme.title1_color_from,
        this.theme.title1_color_to
      )
    },
    title2Style() {
      return this.gradientTextStyle(
        this.theme.title2_color_from,
        this.theme.title2_color_to
      )
    },
    descStyle() {
      return { color: this.theme.desc_color }
    },
  },
  methods: {
    resolveImageUrl(url) {
      if (!url) return ''
      return url.startsWith('http') ? url : `/api/admin/display?name=${url}`
    },
    gradientTextStyle(from, to) {
      if (!from || !to) return {}
      if (from === to) return { color: from }
      return {
        backgroundImage: `linear-gradient(90deg, ${from}, ${to})`,
        webkitBackgroundClip: 'text',
        backgroundClip: 'text',
        webkitTextFillColor: 'transparent',
      }
    },
    goToLink(link) {
      if (!link.url) return
      if (link.link_type === 'external') {
        window.open(link.url, '_blank')
      } else {
        this.$router.push(link.url)
      }
    },
  },
}
</script>

<template>
  <div class="card-item" :style="cardStyle">
    <div
      v-if="bgImageUrl"
      class="card-bg-image"
      :style="{ backgroundImage: `url(${bgImageUrl})` }"
    ></div>

    <div class="card-header">
      <span class="card-tag" :style="tagStyle">{{ card.top_tag }}</span>
      <p class="card-tit">
        <span :style="title1Style">{{ card.top_text }}</span>
        <em :style="title2Style">{{ card.bottom_text }}</em>
      </p>
      <p v-if="card.desc" class="card-desc" :style="descStyle">
        {{ card.desc }}
      </p>
    </div>

    <div v-if="card.videos && card.videos.length > 0" class="card-media-group">
      <p class="card-media-label"><i class="icon-m icon-play"></i>숏츠</p>
      <div class="card-media-list">
        <Video
          v-for="(v, vi) in card.videos"
          :key="'v' + vi"
          :video="v"
          type="link"
        />
      </div>
    </div>

    <div v-if="card.audios && card.audios.length > 0" class="card-media-group">
      <p class="card-media-label"><i class="icon-m icon-play"></i>팟캐스트</p>
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
      v-if="card.card_news && card.card_news.length > 0"
      class="card-news-group"
    >
      <div
        v-for="(news, ni) in card.card_news"
        :key="'n' + ni"
        class="news-item"
        :class="ni % 2 === 0 ? 'img-left' : 'img-right'"
      >
        <div
          v-if="resolveImageUrl(news.image_url)"
          class="news-img"
          :style="{
            backgroundImage: `url(${resolveImageUrl(news.image_url)})`,
          }"
        ></div>
        <div class="news-content">
          <p class="news-title">{{ news.title }}</p>
          <p v-if="news.body" class="news-body">{{ news.body }}</p>
        </div>
      </div>
    </div>

    <div v-if="card.links && card.links.length > 0" class="card-link-group">
      <button
        v-for="(link, li) in card.links"
        :key="'l' + li"
        class="card-link-btn"
        :style="link.btn_color ? { background: link.btn_color } : null"
        @click="goToLink(link)"
      >
        {{ link.button_text }}
        <i class="icon-m icon-arrow-link"></i>
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
// ── 카드 아이템 기본 구조 ──────────────────
// 색상은 card.theme(API)에서 동적으로 적용되므로 여기서는 구조만 정의
.card-item {
  display: flex;
  flex-direction: column;
  gap: rem(20);
  padding: rem(28) rem(30);
  border-radius: rem(20);
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04);
}

.card-bg-image {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 40%;
  background-size: cover;
  background-position: center;
  opacity: 0.4;
  z-index: 0;
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
    line-height: 1.3;

    em {
      display: block;
      font-style: normal;
    }
  }

  .card-desc {
    font-size: rem(20);
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

.card-news-group {
  display: flex;
  flex-direction: column;
  gap: rem(12);
  position: relative;
  z-index: 1;
}

.news-item {
  display: flex;
  align-items: stretch;
  gap: rem(16);
  border-radius: rem(14);
  background: rgba(255, 255, 255, 0.7);
  overflow: hidden;

  &.img-right {
    flex-direction: row-reverse;
  }
}

.news-img {
  flex: 0 0 rem(110);
  background-size: cover;
  background-position: center;
}

.news-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: rem(4);
  padding: rem(14) rem(16);
  min-width: 0;
}

.news-title {
  font-size: rem(19);
  font-weight: 700;
  color: #101828;
}

.news-body {
  font-size: rem(16);
  color: #475467;
  line-height: 1.4;
  white-space: pre-line;
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
</style>
