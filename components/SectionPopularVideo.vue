<script>
import { formatViews } from '@/utils/common'

export default {
  name: 'SectionPopularVideo',
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
  <div class="popular-video-wrap">
    <div
      v-for="(item, idx) in items"
      :key="idx"
      class="pv-card"
      @click="viewVideo(item)"
    >
      <div class="pv-rank">{{ String(idx + 1).padStart(2, '0') }}</div>
      <div class="pv-thumb">
        <img :src="item.thumbnail" alt="" />
        <i class="icon-s icon-play pv-play-icon"></i>
        <span class="pv-duration">{{ item.duration }}</span>
      </div>
      <div class="pv-info">
        <div class="pv-tags">
          <span v-for="(t, ti) in item.tags" :key="ti" class="pv-tag">{{ t }}</span>
        </div>
        <p class="pv-title ellipsis-twoline">{{ item.title }}</p>
        <div class="pv-meta">
          <span class="pv-views">
            <i class="icon-m icon-eye"></i>{{ formatViews(item.views) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.popular-video-wrap {
  display: flex;
  flex-direction: column;
  gap: rem(12);
}

.pv-card {
  display: flex;
  align-items: center;
  gap: rem(18);
  padding: rem(16) rem(20);
  border-radius: rem(16);
  background: #101828;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #1a2438;
  }
}

.pv-rank {
  flex-shrink: 0;
  font-size: rem(44);
  font-weight: 900;
  line-height: 1;
  background: linear-gradient(135deg, #ff7c7e, #ae74ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  min-width: rem(52);
}

.pv-thumb {
  flex-shrink: 0;
  position: relative;
  width: rem(100);
  height: rem(70);
  border-radius: rem(10);
  overflow: hidden;
  background: #1e293b;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .pv-play-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    &:before {
      background: #fff;
    }
  }

  .pv-duration {
    position: absolute;
    bottom: rem(4);
    right: rem(4);
    padding: rem(2) rem(6);
    border-radius: rem(4);
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
    font-size: rem(16);
  }
}

.pv-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: rem(6);
  min-width: 0;
}

.pv-tags {
  display: flex;
  gap: rem(6);
  flex-wrap: wrap;

  .pv-tag {
    padding: rem(2) rem(8);
    border-radius: rem(4);
    background: rgba(174, 116, 255, 0.15);
    color: #c27aff;
    font-size: rem(18);
  }
}

.pv-title {
  font-size: rem(22);
  font-weight: 600;
  color: #fff;
  line-height: 1.4;
}

.pv-meta {
  display: flex;
  align-items: center;

  .pv-views {
    display: flex;
    align-items: center;
    gap: rem(4);
    font-size: rem(19);
    color: #667085;
    i:before {
      background: #667085;
    }
  }
}
</style>
