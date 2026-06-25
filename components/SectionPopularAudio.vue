<script>
import { formatViews } from '@/utils/common'

export default {
  name: 'SectionPopularAudio',
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
  <div class="popular-audio-wrap">
    <div
      v-for="(item, idx) in items"
      :key="idx"
      class="pa-card"
      @click="viewAudio(item)"
    >
      <div class="pa-top">
        <span class="pa-rank">{{ String(idx + 1).padStart(2, '0') }}</span>
        <div class="pa-tags">
          <span v-for="(t, ti) in item.tags" :key="ti" class="pa-tag">{{ t }}</span>
        </div>
      </div>
      <p class="pa-title ellipsis-twoline">{{ item.title }}</p>
      <div class="pa-bottom">
        <div class="pa-meta">
          <span class="pa-duration">
            <i class="icon-xs icon-time"></i>{{ item.duration }}
          </span>
          <span class="pa-views">
            <i class="icon-m icon-eye"></i>{{ formatViews(item.views) }}
          </span>
        </div>
        <button class="pa-play-btn" @click.stop="viewAudio(item)">
          <i class="icon-m icon-play"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.popular-audio-wrap {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: rem(12);

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
}

.pa-card {
  display: flex;
  flex-direction: column;
  gap: rem(14);
  padding: rem(20) rem(22);
  border-radius: rem(16);
  background: #101828;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #1a2438;
  }
}

.pa-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: rem(8);
}

.pa-rank {
  font-size: rem(36);
  font-weight: 900;
  line-height: 1;
  background: linear-gradient(135deg, #ff7c7e, #ae74ff);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.pa-tags {
  display: flex;
  gap: rem(4);
  flex-wrap: wrap;
  justify-content: flex-end;

  .pa-tag {
    padding: rem(2) rem(8);
    border-radius: rem(4);
    background: rgba(174, 116, 255, 0.15);
    color: #c27aff;
    font-size: rem(17);
  }
}

.pa-title {
  font-size: rem(20);
  font-weight: 700;
  color: #fff;
  line-height: 1.45;
  flex: 1;
}

.pa-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: rem(8);
}

.pa-meta {
  display: flex;
  align-items: center;
  gap: rem(10);

  .pa-duration,
  .pa-views {
    display: flex;
    align-items: center;
    gap: rem(4);
    font-size: rem(17);
    color: #667085;
    i:before {
      background: #667085;
    }
  }
}

.pa-play-btn {
  flex-shrink: 0;
  width: rem(38);
  height: rem(38);
  border-radius: 50%;
  background: rgba(174, 116, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;

  &:hover {
    background: rgba(174, 116, 255, 0.4);
  }

  i:before {
    background: #c27aff;
  }
}
</style>
