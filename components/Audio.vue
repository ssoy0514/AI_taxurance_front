<script>
import moment from 'moment'
import { formatViews } from '@/utils/common'

export default {
  props: {
    audio: {},
    type: '', // link(링크이동), main(추천영상다른디자인표현), 기본(팝업노출)
  },
  data() {
    return {}
  },
  methods: {
    formatViews,
    viewAudio(item) {
      this.$router.push({
        name: 'play',
        query: {
          type: 'audios',
          tab: item.tags[0],
          id: item.object_id,
        },
      })
      this.$store.commit('SET_SIDEBAR', false)
    },
    showPopup(item) {
      this.$emit('show-popup')
    },
    checkIsNew(createdAt) {
      console.log('createdAt', createdAt)
      if (!createdAt) return false
      const diffDays = moment().diff(moment(createdAt), 'days')
      return diffDays >= 0 && diffDays <= 14
    },
  },
}
</script>

<template>
  <div
    class="info-card"
    :class="type"
    @click="type === 'link' ? viewAudio(audio) : showPopup(audio)"
  >
    <div class="thumbnail-container">
      <img v-if="audio?.thumbnail" :src="audio?.thumbnail" alt="" />
      <i class="icon-s icon-play"></i>
    </div>
    <div class="text">
      <div class="tags-new">
        <p class="tags">
          <span v-for="(t, index) in audio?.tags" :key="index" class="tag">{{
            t
          }}</span>
        </p>
        <span v-if="checkIsNew(audio?.created_at)" class="badge-new">N</span>
      </div>
      <p class="txt ellipsis-oneline">
        {{ audio?.title }}
      </p>
      <div class="btm">
        <p class="txt-time">
          <i class="icon-xs icon-time"></i>
          {{ audio?.duration }}
        </p>
        <p class="view-count">
          <i class="icon-m icon-eye"></i>{{ formatViews(audio?.views) }}
        </p>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.info-card {
  @include flexbox(flex-start, center);
  gap: 10px;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  + .info-card {
    margin-top: 10px;
  }
  .thumbnail-container {
    flex-shrink: 0;
    position: relative;
    width: 60px;
    height: 60px;
    border-radius: 8px;
    background-color: #eee;
    overflow: hidden;
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .icon-play {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 10;
      &:before {
        background: #fff;
      }
    }
  }
  .text {
    flex: 1;
    @include flexbox(flex-start, flex-start);
    flex-direction: column;
    gap: 6px;
    .tags-new {
      @include flexbox(space-between, baseline);
      width: 100%;
      .tags {
        @include flexbox(flex-start, center);
        flex-wrap: wrap;
        gap: 4px;
        .tag {
          padding: rem(2) rem(10);
          border-radius: 4px;
          background-color: #f1f1f1;
          font-size: 13px;
        }
      }
      .badge-new {
        @include flexbox(center, center);
        width: 18px;
        height: 18px;
        background-color: #eb507b;
        border-radius: 50%;
        color: #fff;
        font-size: 10px;
        line-height: 15px;
      }
    }
    .txt {
      color: #364153;
      font-size: 15px;
      font-weight: 600;
    }
    .btm {
      @include flexbox(space-between, center);
      width: 100%;
    }
    .txt-time {
      @include flexbox(flex-start, center);
      gap: 4px;
      color: #90a1b9;
      font-size: 14px;
    }
    .view-count {
      @include flexbox();
      gap: 4px;
      color: #364153;
      font-size: 14px;
      i:before {
        background-color: #364153;
      }
    }
  }
  &.main {
    background: linear-gradient(100deg, #d39ee0, #975cd3);
    .tags {
      span {
        background-color: #fff;
        color: #975cd3;
      }
    }
    .txt {
      color: #fff;
    }
    .txt-time {
      color: #fff;
      i:before {
        background-color: #fff;
      }
    }
    .view-count {
      color: #fff;
      i:before {
        background-color: #fff;
      }
    }
  }
}
</style>
