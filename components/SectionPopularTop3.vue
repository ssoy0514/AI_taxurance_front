<script>
import { formatViews } from '@/utils/common'

export default {
  name: 'SectionPopularTop3',
  props: {
    items: {
      type: Array,
      default: () => [],
    },
  },
  methods: {
    formatViews,
    navigate(item) {
      this.$router.push({
        name: 'play',
        query: { type: item.contentType, tab: item.tags?.[0], id: item.object_id },
      })
      this.$store.commit('SET_SIDEBAR', false)
    },
  },
}
</script>

<template>
  <div class="top3-list">
    <div
      v-for="(item, idx) in items"
      :key="idx"
      class="top3-card"
      @click="navigate(item)"
    >
      <!-- 순위 -->
      <div class="top3-rank">{{ String(idx + 1).padStart(2, '0') }}</div>

      <!-- 썸네일 / 오디오 아이콘 영역 -->
      <div class="top3-thumb">
        <template v-if="item.contentType === 'videos'">
          <img v-if="item.thumbnail" :src="item.thumbnail" alt="" />
          <div v-else class="top3-thumb-placeholder"></div>
          <i class="icon-s icon-play top3-play-icon"></i>
          <span v-if="item.duration" class="top3-duration">{{ item.duration }}</span>
        </template>
        <template v-else>
          <div class="top3-audio-icon">🎧</div>
          <span v-if="item.duration" class="top3-duration">{{ item.duration }}</span>
        </template>
      </div>

      <!-- 정보 -->
      <div class="top3-info">
        <div class="top3-meta-row">
          <!-- 콘텐츠 유형 레이블 -->
          <span class="top3-type-badge" :class="item.contentType === 'videos' ? 'badge-video' : 'badge-audio'">
            {{ item.contentType === 'videos' ? '숏츠' : '팟캐스트' }}
          </span>
          <!-- 태그 -->
          <span v-for="(t, ti) in item.tags" :key="ti" class="top3-tag">{{ t }}</span>
        </div>
        <p class="top3-title ellipsis-twoline">{{ item.title }}</p>
        <span class="top3-views">
          <i class="icon-m icon-eye"></i>{{ formatViews(item.views) }}
        </span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.top3-list {
  display: flex;
  flex-direction: column;
  gap: rem(12);
}

.top3-card {
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

.top3-rank {
  flex-shrink: 0;
  min-width: rem(52);
  font-size: rem(44);
  font-weight: 900;
  line-height: 1;
  background: linear-gradient(135deg, #ff7c7e, #ae74ff);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.top3-thumb {
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

  .top3-play-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    &:before {
      background: #fff;
    }
  }

  .top3-duration {
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

.top3-thumb-placeholder {
  width: 100%;
  height: 100%;
  background: #1e293b;
}

.top3-audio-icon {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: rem(28);
}

.top3-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: rem(6);
  min-width: 0;
}

.top3-meta-row {
  display: flex;
  align-items: center;
  gap: rem(6);
  flex-wrap: wrap;
}

.top3-type-badge {
  padding: rem(2) rem(10);
  border-radius: rem(4);
  font-size: rem(17);
  font-weight: 700;
  flex-shrink: 0;

  &.badge-video {
    background: linear-gradient(90deg, #ff7c7e33, #ae74ff33);
    color: #ff9eab;
  }

  &.badge-audio {
    background: rgba(174, 116, 255, 0.18);
    color: #c27aff;
  }
}

.top3-tag {
  padding: rem(2) rem(8);
  border-radius: rem(4);
  background: rgba(255, 255, 255, 0.07);
  color: #8896ab;
  font-size: rem(17);
}

.top3-title {
  font-size: rem(22);
  font-weight: 600;
  color: #fff;
  line-height: 1.4;
}

.top3-views {
  display: flex;
  align-items: center;
  gap: rem(4);
  font-size: rem(19);
  color: #667085;
  i:before {
    background: #667085;
  }
}
</style>
