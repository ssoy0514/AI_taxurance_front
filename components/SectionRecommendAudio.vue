<script>
import { formatViews } from '@/utils/common'

export default {
  name: 'SectionRecommendAudio',
  props: {
    items: {
      type: Array,
      default: () => [],
    },
  },
  methods: {
    formatViews,
    viewAudio(item) {
      this.$router.push({
        name: 'play',
        query: { type: 'audios', tab: item.tags[0], id: item.object_id },
      })
    },
  },
}
</script>

<template>
  <div class="recommend-audio-wrap">
    <div
      v-for="(item, idx) in items"
      :key="idx"
      class="ra-card"
      @click="viewAudio(item)"
    >
      <div class="ra-icon-wrap">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="36" height="36" rx="18" fill="#7c3aed" fill-opacity="0.12"/>
          <path d="M12 14v8M15 11v14M18 13v10M21 11v14M24 14v8" stroke="#7c3aed" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="ra-content">
        <div class="ra-tags">
          <span v-for="(t, ti) in item.tags" :key="ti" class="ra-tag">{{ t }}</span>
        </div>
        <p class="ra-title ellipsis-twoline">{{ item.title }}</p>
        <div class="ra-meta">
          <span class="ra-duration">
            <i class="icon-xs icon-time"></i>{{ item.duration }}
          </span>
          <span class="ra-views">
            <i class="icon-m icon-eye"></i>{{ formatViews(item.views) }}
          </span>
        </div>
      </div>
      <button class="ra-play-btn" @click.stop="viewAudio(item)">
        <i class="icon-m icon-play"></i>
        <span>듣기</span>
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.recommend-audio-wrap {
  display: flex;
  flex-direction: column;
  gap: rem(12);
}

.ra-card {
  display: flex;
  align-items: center;
  gap: rem(16);
  padding: rem(20) rem(22);
  border-radius: rem(16);
  background: linear-gradient(135deg, #f5f3ff, #ede9fe);
  border: 1px solid #ddd6fe;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(124, 58, 237, 0.15);
  }
}

.ra-icon-wrap {
  flex-shrink: 0;
}

.ra-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: rem(6);
  min-width: 0;
}

.ra-tags {
  display: flex;
  gap: rem(6);

  .ra-tag {
    padding: rem(2) rem(8);
    border-radius: rem(4);
    background: #ede9fe;
    color: #6d28d9;
    font-size: rem(18);
    font-weight: 600;
  }
}

.ra-title {
  font-size: rem(22);
  font-weight: 700;
  color: #1e1b4b;
  line-height: 1.4;
}

.ra-meta {
  display: flex;
  align-items: center;
  gap: rem(12);

  .ra-duration,
  .ra-views {
    display: flex;
    align-items: center;
    gap: rem(4);
    font-size: rem(18);
    color: #7c3aed;
    opacity: 0.7;
    i:before {
      background: #7c3aed;
    }
  }
}

.ra-play-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: rem(6);
  padding: rem(10) rem(18);
  border-radius: rem(30);
  background: #7c3aed;
  color: #fff;
  font-size: rem(18);
  font-weight: 600;
  transition: background 0.2s;

  &:hover {
    background: #6d28d9;
  }

  i:before {
    background: #fff;
  }
}
</style>
