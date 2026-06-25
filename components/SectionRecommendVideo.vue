<script>
import { formatViews } from '@/utils/common'

export default {
  name: 'SectionRecommendVideo',
  props: {
    items: {
      type: Array,
      default: () => [],
    },
  },
  methods: {
    formatViews,
    viewVideo(item) {
      this.$router.push({
        name: 'play',
        query: { type: 'videos', tab: item.tags[0], id: item.object_id },
      })
    },
  },
}
</script>

<template>
  <div class="recommend-video-wrap">
    <div
      v-for="(item, idx) in items"
      :key="idx"
      class="rv-card"
      @click="viewVideo(item)"
    >
      <div class="rv-thumb">
        <img :src="item.thumbnail" alt="" />
        <div class="rv-overlay">
          <div class="rv-play-btn">
            <i class="icon-m icon-play"></i>
          </div>
        </div>
        <span class="rv-badge-duration">{{ item.duration }}</span>
      </div>
      <div class="rv-body">
        <div class="rv-tags">
          <span v-for="(t, ti) in item.tags" :key="ti" class="rv-tag">{{ t }}</span>
        </div>
        <p class="rv-title ellipsis-twoline">{{ item.title }}</p>
        <div class="rv-meta">
          <span class="rv-views">
            <i class="icon-m icon-eye"></i>{{ formatViews(item.views) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.recommend-video-wrap {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: rem(16);

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
}

.rv-card {
  display: flex;
  flex-direction: column;
  border-radius: rem(20);
  overflow: hidden;
  background: #fff;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.16);
  }
}

.rv-thumb {
  position: relative;
  width: 100%;
  padding-top: 72%;
  background: #1a1a2e;
  overflow: hidden;

  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .rv-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.5), transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s;

    .rv-card:hover & {
      opacity: 1;
    }
  }

  .rv-play-btn {
    width: rem(60);
    height: rem(60);
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(4px);

    i:before {
      background: #d14a6a;
    }
  }

  .rv-badge-duration {
    position: absolute;
    bottom: rem(12);
    right: rem(12);
    padding: rem(3) rem(8);
    border-radius: rem(6);
    background: rgba(0, 0, 0, 0.65);
    color: #fff;
    font-size: rem(18);
    backdrop-filter: blur(2px);
  }
}

.rv-body {
  padding: rem(14) rem(16) rem(16);
  display: flex;
  flex-direction: column;
  gap: rem(6);
}

.rv-tags {
  display: flex;
  gap: rem(4);
  flex-wrap: wrap;

  .rv-tag {
    padding: rem(2) rem(8);
    border-radius: rem(4);
    background: #f3eeff;
    color: #8b5cf6;
    font-size: rem(17);
    font-weight: 600;
  }
}

.rv-title {
  font-size: rem(20);
  font-weight: 700;
  color: #101828;
  line-height: 1.4;
}

.rv-meta {
  display: flex;
  align-items: center;
  gap: rem(12);
  margin-top: rem(2);

  .rv-views {
    display: flex;
    align-items: center;
    gap: rem(4);
    font-size: rem(17);
    color: #667085;
    font-weight: 500;
    i:before {
      background: #667085;
    }
  }
}
</style>
